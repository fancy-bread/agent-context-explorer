// Regression test for the standalone MCP server's projectKey routing.
//
// mcpServerTools.test.ts calls `tools[name].handler(args)` directly, which bypasses the SDK's
// CallToolRequestSchema handler entirely — the exact layer that silently dropped `args` to
// `undefined` when a tool's inputSchema wasn't a real Zod raw shape (createServer() used to pass
// plain `{ type: 'string', description: '...' }` objects cast `as any`, which the SDK's
// isZodRawShapeCompat() check misclassifies as `annotations` instead of `inputSchema`, leaving the
// tool registered with no input schema — so every call silently defaulted to the first project,
// ignoring any projectKey the caller sent). This test connects a real MCP Client over
// InMemoryTransport so it exercises the actual request-validation path and would fail again if the
// same class of bug were reintroduced.
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createRequire } from 'module';

describe('mcp/server createServer (real SDK request path — projectKey routing)', () => {
	// CommonJS emit (test/tsconfig.json): use __filename, not import.meta.url
	const requireFn = createRequire(__filename);
	const { createServer } = requireFn('../../../src/mcp/server.ts') as typeof import('../../../src/mcp/server');
	const { Client } = requireFn('@modelcontextprotocol/sdk/client/index.js');
	const { InMemoryTransport } = requireFn('@modelcontextprotocol/sdk/inMemory.js');

	let projA: string;
	let projB: string;

	before(() => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ace-mcp-projectkey-'));
		projA = path.join(root, 'projA');
		projB = path.join(root, 'projB');
		fs.mkdirSync(path.join(projA, '.cursor', 'rules'), { recursive: true });
		fs.mkdirSync(path.join(projB, '.cursor', 'rules'), { recursive: true });
		fs.writeFileSync(
			path.join(projA, '.cursor', 'rules', 'only-in-a.mdc'),
			'---\ndescription: only in A\nalwaysApply: true\n---\nA content.\n'
		);
		fs.writeFileSync(
			path.join(projB, '.cursor', 'rules', 'only-in-b.mdc'),
			'---\ndescription: only in B\nalwaysApply: true\n---\nB content.\n'
		);
	});

	after(() => {
		fs.rmSync(path.dirname(projA), { recursive: true, force: true });
	});

	async function connectedClient() {
		const server = createServer(projA, [
			{ projectKey: 'projA', path: projA, label: 'Project A' },
			{ projectKey: 'projB', path: projB, label: 'Project B' }
		]);
		const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
		const client = new Client({ name: 'test-client', version: '1.0.0' });
		await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
		return client;
	}

	it('advertises projectKey in the tool input schema (not an empty schema)', async () => {
		const client = await connectedClient();
		const { tools } = await client.listTools();
		const listRules = tools.find((t: { name: string }) => t.name === 'list_rules');
		assert.ok(listRules.inputSchema.properties?.projectKey, 'list_rules must advertise a projectKey parameter');
	});

	it('routes to the requested project, not the default one', async () => {
		const client = await connectedClient();

		const defaultRes = await client.callTool({ name: 'list_rules', arguments: {} });
		const defaultNames = (JSON.parse(defaultRes.content[0].text) as Array<{ name: string }>).map(r => r.name);
		assert.ok(defaultNames.includes('only-in-a'), 'no projectKey should default to the first project (A)');

		const bRes = await client.callTool({ name: 'list_rules', arguments: { projectKey: 'projB' } });
		const bNames = (JSON.parse(bRes.content[0].text) as Array<{ name: string }>).map(r => r.name);
		assert.ok(bNames.includes('only-in-b'), 'projectKey=projB must return project B data');
		assert.ok(!bNames.includes('only-in-a'), 'projectKey=projB must NOT silently return project A data');
	});

	it('still returns a clear error for an unknown projectKey', async () => {
		const client = await connectedClient();
		const res = await client.callTool({ name: 'list_rules', arguments: { projectKey: 'nope' } });
		assert.strictEqual(res.isError, true);
	});
});
