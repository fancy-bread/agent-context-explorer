import * as assert from 'assert';
import { createRequire } from 'module';
import * as path from 'path';

type ToolHandler = (args: unknown) => Promise<unknown>;

describe('mcp/server createServer (registered tools)', () => {
	const require = createRequire(__filename);
	const { createServer } = require('../../../src/mcp/server.ts') as typeof import('../../../src/mcp/server');

	function getTools(server: ReturnType<typeof createServer>): Record<string, { handler: ToolHandler }> {
		return (server as unknown as { _registeredTools: Record<string, { handler: ToolHandler }> })._registeredTools;
	}

	const workspaceRoot = process.cwd();

	it('list_projects returns JSON project list', async () => {
		const server = createServer(workspaceRoot);
		const tools = getTools(server);
		const res = (await tools.list_projects.handler({})) as { content: Array<{ text: string }> };
		const text = res.content[0].text;
		assert.ok(text.includes('"projectKey"'));
		assert.ok(text.includes(path.basename(workspaceRoot)));
	});

	it('list_rules and get_project run for default workspace', async () => {
		const server = createServer(workspaceRoot);
		const tools = getTools(server);
		const rules = (await tools.list_rules.handler({})) as { content: Array<{ text: string }>; isError?: boolean };
		assert.strictEqual(rules.isError, undefined);
		assert.ok(JSON.parse(rules.content[0].text).length >= 0);

		const ctx = (await tools.get_project.handler({})) as { content: Array<{ text: string }>; isError?: boolean };
		assert.strictEqual(ctx.isError, undefined);
		const parsed = JSON.parse(ctx.content[0].text) as { projectPath: string; rules: unknown[]; agentDefinitions: unknown[] };
		assert.strictEqual(typeof parsed.projectPath, 'string');
		assert.ok(Array.isArray(parsed.rules));
		assert.ok(Array.isArray(parsed.agentDefinitions));
	});

	it('list_commands, list_skills, list_specs, get_spec succeed', async () => {
		const server = createServer(workspaceRoot);
		const tools = getTools(server);
		for (const name of ['list_commands', 'list_skills', 'list_specs'] as const) {
			const res = (await tools[name].handler({})) as { content: Array<{ text: string }>; isError?: boolean };
			assert.strictEqual(res.isError, undefined, name);
			assert.ok(res.content[0].text.length >= 0);
		}
		const specRes = (await tools.get_spec.handler({ name: 'mcp' })) as { content: Array<{ text: string }>; isError?: boolean };
		assert.strictEqual(specRes.isError, undefined, 'get_spec');
		const parsed = JSON.parse(specRes.content[0].text) as { domain: string; content: string };
		assert.strictEqual(parsed.domain, 'mcp');
		assert.ok(parsed.content.length > 0);
	});

	it('get_rule and get_command return error when name not found', async () => {
		const server = createServer(workspaceRoot);
		const tools = getTools(server);
		const badRule = (await tools.get_rule.handler({
			name: '__nonexistent_rule_ace__'
		})) as { isError?: boolean; content: Array<{ text: string }> };
		assert.strictEqual(badRule.isError, true);

		const badCmd = (await tools.get_command.handler({
			name: '__nonexistent_cmd__'
		})) as { isError?: boolean };
		assert.strictEqual(badCmd.isError, true);
	});

	it('resolveProjectRoot errors on unknown projectKey', async () => {
		const server = createServer(workspaceRoot, [
			{ projectKey: 'only', path: workspaceRoot, label: 'only' }
		]);
		const tools = getTools(server);
		const res = (await tools.list_rules.handler({ projectKey: 'nope' })) as { isError?: boolean };
		assert.strictEqual(res.isError, true);
	});

	it('get_skill returns error when skill missing', async () => {
		const server = createServer(workspaceRoot);
		const tools = getTools(server);
		const res = (await tools.get_skill.handler({
			name: '__missing_skill__'
		})) as { isError?: boolean };
		assert.strictEqual(res.isError, true);
	});

	it('list_agents returns JSON array', async () => {
		const server = createServer(workspaceRoot);
		const tools = getTools(server);
		const res = (await tools.list_agents.handler({})) as { content: Array<{ text: string }>; isError?: boolean };
		assert.strictEqual(res.isError, undefined);
		const parsed = JSON.parse(res.content[0].text);
		assert.ok(Array.isArray(parsed));
	});

	it('get_agent returns error when missing', async () => {
		const server = createServer(workspaceRoot);
		const tools = getTools(server);
		const res = (await tools.get_agent.handler({
			name: '__missing_agent_def__'
		})) as { isError?: boolean };
		assert.strictEqual(res.isError, true);
	});
});
