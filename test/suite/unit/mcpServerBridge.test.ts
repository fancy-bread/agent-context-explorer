import * as assert from 'assert';
import * as net from 'node:net';
import { createRequire } from 'module';

describe('mcp/server bridge (TCP client + bridge server)', () => {
	const require = createRequire(__filename);
	const { bridgeCall, createBridgeServer } = require('../../../src/mcp/server.ts') as typeof import('../../../src/mcp/server');

	it('bridgeCall receives JSON result from mock extension port', async () => {
		const srv = net.createServer((socket) => {
			socket.setEncoding('utf8');
			socket.on('data', (chunk: string) => {
				const line = chunk.split('\n')[0];
				const req = JSON.parse(line) as { id: number; method: string };
				socket.write(JSON.stringify({ id: req.id, result: { projects: [] } }) + '\n');
				socket.end();
			});
		});
		await new Promise<void>((resolve, reject) => {
			srv.listen(0, '127.0.0.1', () => resolve());
			srv.on('error', reject);
		});
		const addr = srv.address();
		const port = typeof addr === 'object' && addr && 'port' in addr ? (addr as { port: number }).port : 0;
		try {
			const result = await bridgeCall(port, 'list_projects', {});
			assert.deepStrictEqual(result as { projects: unknown[] }, { projects: [] });
		} finally {
			srv.close();
		}
	});

	it('bridgeCall rejects on socket error', async () => {
		await assert.rejects(
			bridgeCall(1, 'list_projects', {}),
			/OSError|ECONNREFUSED/i
		);
	});

	it('createBridgeServer registers tools and forwards to bridgeCall', async () => {
		const srv = net.createServer((socket) => {
			socket.setEncoding('utf8');
			socket.on('data', (chunk: string) => {
				const line = chunk.split('\n')[0];
				const req = JSON.parse(line) as { id: number; method: string };
				socket.write(JSON.stringify({ id: req.id, result: { ok: true } }) + '\n');
				socket.end();
			});
		});
		await new Promise<void>((resolve, reject) => {
			srv.listen(0, '127.0.0.1', () => resolve());
			srv.on('error', reject);
		});
		const addr = srv.address();
		const port = typeof addr === 'object' && addr && 'port' in addr ? (addr as { port: number }).port : 0;
		try {
			const mcp = createBridgeServer(port);
			const tools = (mcp as unknown as { _registeredTools: Record<string, { handler: (a: unknown) => Promise<unknown> }> })
				._registeredTools;
			const res = (await tools.list_projects.handler({})) as { content: Array<{ text: string }> };
			const parsed = JSON.parse(res.content[0].text);
			assert.deepStrictEqual(parsed, { ok: true });
		} finally {
			srv.close();
		}
	});
});
