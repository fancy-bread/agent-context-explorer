import * as assert from 'assert';
import {
	resolveProjectKey,
	normalizeParams,
	buildProjectList,
	startExtensionBackend,
	type ProjectEntry
} from '../../../src/mcp/extensionBackend';
import type { ProjectDefinition } from '../../../src/types/project';
import * as net from 'node:net';

// =============================================================================
// resolveProjectKey
// =============================================================================

describe('MCP extension backend: resolveProjectKey', () => {
	const projectList: ProjectEntry[] = [
		{ projectKey: 'agent-context-explorer', path: '/Users/paul/projects/software/agent-context-explorer', label: 'agent-context-explorer' },
		{ projectKey: 'agency', path: '/Users/paul/projects/software/agency', label: 'Agency' }
	];

	it('no projectKey returns first project (default)', () => {
		const out = resolveProjectKey(projectList, undefined);
		assert.ok('path' in out);
		assert.strictEqual((out as { path: string }).path, projectList[0].path);
	});

	it('exact projectKey returns matching project path', () => {
		const out = resolveProjectKey(projectList, 'agency');
		assert.ok('path' in out);
		assert.strictEqual((out as { path: string }).path, '/Users/paul/projects/software/agency');
	});

	it('case-insensitive projectKey matches (Agency -> agency)', () => {
		const out = resolveProjectKey(projectList, 'Agency');
		assert.ok('path' in out);
		assert.strictEqual((out as { path: string }).path, '/Users/paul/projects/software/agency');
	});

	it('unknown projectKey returns error with known keys', () => {
		const out = resolveProjectKey(projectList, 'unknown-repo');
		assert.ok('error' in out);
		const err = (out as { error: string }).error;
		assert.ok(err.includes('Unknown projectKey'));
		assert.ok(err.includes('unknown-repo'));
		assert.ok(err.includes('agent-context-explorer'));
		assert.ok(err.includes('agency'));
	});

	it('empty projectList and no projectKey returns error', () => {
		const out = resolveProjectKey([], undefined);
		assert.ok('error' in out);
		assert.strictEqual((out as { error: string }).error, 'No projects available.');
	});

	it('empty projectList with projectKey returns error', () => {
		const out = resolveProjectKey([], 'agency');
		assert.ok('error' in out);
	});
});

// =============================================================================
// normalizeParams (param shapes from MCP clients)
// =============================================================================

describe('MCP extension backend: normalizeParams', () => {
	it('flat projectKey is preserved', () => {
		const out = normalizeParams({ projectKey: 'agency' });
		assert.strictEqual(out.projectKey, 'agency');
	});

	it('nested arguments.projectKey is merged to top level', () => {
		const out = normalizeParams({ arguments: { projectKey: 'agency' } });
		assert.strictEqual(out.projectKey, 'agency');
	});

	it('nested arguments with name and projectKey', () => {
		const out = normalizeParams({ arguments: { name: 'foo', projectKey: 'agency' } });
		assert.strictEqual(out.name, 'foo');
		assert.strictEqual(out.projectKey, 'agency');
	});

	it('top-level overrides nested (spread order)', () => {
		const out = normalizeParams({ arguments: { projectKey: 'agency' }, projectKey: 'other' });
		assert.strictEqual(out.projectKey, 'other');
	});

	it('invalid input returns empty object', () => {
		assert.deepStrictEqual(normalizeParams(null as any), {});
		assert.deepStrictEqual(normalizeParams(undefined as any), {});
		assert.deepStrictEqual(normalizeParams({}), {});
	});
});

// =============================================================================
// buildProjectList (with mocked getProjects; workspaceFolders from vscode stub)
// =============================================================================

describe('MCP extension backend: buildProjectList', () => {
	function makeProject(path: string, name: string): ProjectDefinition {
		return { id: path, name, path, lastAccessed: new Date(), active: true };
	}

	it('builds list from getProjects when no workspace folders', async () => {
		const added: ProjectDefinition[] = [
			makeProject('/path/to/agency', 'Agency')
		];
		const getProjects = async () => added;
		const list = await buildProjectList(getProjects, undefined);
		assert.strictEqual(list.length, 1);
		assert.strictEqual(list[0].projectKey, 'agency');
		assert.strictEqual(list[0].path, '/path/to/agency');
		assert.strictEqual(list[0].label, 'Agency');
	});

	it('builds list from workspace folders when provided', async () => {
		const folders = [
			{ uri: { fsPath: '/ws/ace' }, name: 'ACE' },
			{ uri: { fsPath: '/ws/other' }, name: 'Other' }
		] as any;
		const getProjects = async () => [];
		const list = await buildProjectList(getProjects, folders);
		assert.strictEqual(list.length, 2);
		assert.strictEqual(list[0].projectKey, 'ace');
		assert.strictEqual(list[0].path, '/ws/ace');
		assert.strictEqual(list[1].projectKey, 'other');
	});

	it('deduplicates by path (workspace + added same path not duplicated)', async () => {
		const folders = [{ uri: { fsPath: '/ws/ace' }, name: 'ACE' }] as any;
		const added: ProjectDefinition[] = [makeProject('/ws/ace', 'ACE')];
		const getProjects = async () => added;
		const list = await buildProjectList(getProjects, folders);
		assert.strictEqual(list.length, 1);
	});

	it('added project with different path appears in list', async () => {
		const folders = [{ uri: { fsPath: '/ws/ace' }, name: 'ACE' }] as any;
		const added: ProjectDefinition[] = [makeProject('/path/agency', 'Agency')];
		const getProjects = async () => added;
		const list = await buildProjectList(getProjects, folders);
		assert.strictEqual(list.length, 2);
		const keys = list.map(p => p.projectKey);
		assert.ok(keys.includes('ace'));
		assert.ok(keys.includes('agency'));
	});
});

describe('MCP extension backend: startExtensionBackend', () => {
	it('starts server and handles list_projects requests', async () => {
		// Ensure workspace folders exist in vscode stub
		const vscode = require('vscode');
		vscode.workspace.workspaceFolders = [{ uri: { fsPath: '/ws/one' }, name: 'One' }];

		const getProjects = async (): Promise<ProjectDefinition[]> => [
			{ id: 'p1', name: 'Proj1', path: '/ws/proj1', lastAccessed: new Date(), active: true }
		];

		const { port, dispose } = await startExtensionBackend(getProjects);
		try {
			const result = await new Promise<any>((resolve, reject) => {
				const socket = net.connect(port, '127.0.0.1');
				socket.setEncoding('utf8');
				let buffer = '';
				socket.on('data', (chunk) => {
					buffer += chunk;
					const idx = buffer.indexOf('\n');
					if (idx === -1) {
						return;
					}
					const line = buffer.slice(0, idx);
					socket.destroy();
					try {
						resolve(JSON.parse(line));
					} catch (e) {
						reject(e);
					}
				});
				socket.on('error', reject);
				socket.write(JSON.stringify({ id: 1, method: 'list_projects', params: {} }) + '\n');
			});

			assert.strictEqual(result.id, 1);
			assert.ok(Array.isArray(result.result));
			const keys = result.result.map((p: any) => p.projectKey);
			assert.ok(keys.includes('one'));
			assert.ok(keys.includes('proj1'));
		} finally {
			dispose();
		}
	});

	it('returns error for invalid request shape', async () => {
		const { port, dispose } = await startExtensionBackend(async () => []);
		try {
			const res = await new Promise<any>((resolve, reject) => {
				const socket = net.connect(port, '127.0.0.1');
				socket.setEncoding('utf8');
				let buffer = '';
				socket.on('data', (chunk) => {
					buffer += chunk;
					const idx = buffer.indexOf('\n');
					if (idx === -1) {
						return;
					}
					const line = buffer.slice(0, idx);
					socket.destroy();
					resolve(JSON.parse(line));
				});
				socket.on('error', reject);
				socket.write(JSON.stringify({ id: 2, method: 'not_a_tool', params: {} }) + '\n');
			});

			assert.strictEqual(res.id, 2);
			assert.ok(typeof res.error === 'string');
		} finally {
			dispose();
		}
	});
});
