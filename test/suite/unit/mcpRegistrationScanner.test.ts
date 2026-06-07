// Unit tests for McpRegistrationScanner
import * as assert from 'assert';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { McpRegistrationScanner } from '../../../src/scanner/mcpRegistrationScanner';

describe('McpRegistrationScanner', () => {
	const tmpDir = os.tmpdir();

	function writeTmp(name: string, content: string): string {
		const p = path.join(tmpDir, `mcp-scanner-test-${name}-${Date.now()}.json`);
		fs.writeFileSync(p, content, 'utf-8');
		return p;
	}

	function cleanUp(p: string): void {
		try { fs.unlinkSync(p); } catch { /* ignore */ }
	}

	it('returns server names from a valid config with mcpServers', async () => {
		const content = JSON.stringify({
			mcpServers: {
				ace: { command: 'node', args: ['/some/path/mcp.js'] },
				'another-server': { command: 'python', args: ['-m', 'server'] }
			}
		});
		const p = writeTmp('valid', content);
		try {
			const scanner = new McpRegistrationScanner(p);
			const names = await scanner.scanServerNames();
			assert.deepStrictEqual(names.sort(), ['ace', 'another-server']);
		} finally {
			cleanUp(p);
		}
	});

	it('returns empty array when file does not exist', async () => {
		const scanner = new McpRegistrationScanner('/nonexistent/path/to/.claude.json');
		const names = await scanner.scanServerNames();
		assert.deepStrictEqual(names, []);
	});

	it('returns empty array when file contains malformed JSON', async () => {
		const p = writeTmp('malformed', '{ this is not valid json }');
		try {
			const scanner = new McpRegistrationScanner(p);
			const names = await scanner.scanServerNames();
			assert.deepStrictEqual(names, []);
		} finally {
			cleanUp(p);
		}
	});

	it('returns empty array when mcpServers key is absent', async () => {
		const p = writeTmp('no-mcp-key', JSON.stringify({ someOtherKey: 'value' }));
		try {
			const scanner = new McpRegistrationScanner(p);
			const names = await scanner.scanServerNames();
			assert.deepStrictEqual(names, []);
		} finally {
			cleanUp(p);
		}
	});

	it('returns empty array when mcpServers is an empty object', async () => {
		const p = writeTmp('empty-mcp', JSON.stringify({ mcpServers: {} }));
		try {
			const scanner = new McpRegistrationScanner(p);
			const names = await scanner.scanServerNames();
			assert.deepStrictEqual(names, []);
		} finally {
			cleanUp(p);
		}
	});

	it('returns empty array when mcpServers is not an object (e.g. array)', async () => {
		const p = writeTmp('array-mcp', JSON.stringify({ mcpServers: ['server1', 'server2'] }));
		try {
			const scanner = new McpRegistrationScanner(p);
			const names = await scanner.scanServerNames();
			assert.deepStrictEqual(names, []);
		} finally {
			cleanUp(p);
		}
	});

	it('returns empty array when file root is not an object', async () => {
		const p = writeTmp('array-root', JSON.stringify(['not', 'an', 'object']));
		try {
			const scanner = new McpRegistrationScanner(p);
			const names = await scanner.scanServerNames();
			assert.deepStrictEqual(names, []);
		} finally {
			cleanUp(p);
		}
	});

	it('returns only one server name when a single server is registered', async () => {
		const p = writeTmp('single', JSON.stringify({ mcpServers: { ace: {} } }));
		try {
			const scanner = new McpRegistrationScanner(p);
			const names = await scanner.scanServerNames();
			assert.deepStrictEqual(names, ['ace']);
		} finally {
			cleanUp(p);
		}
	});
});
