import * as assert from 'assert';
import * as path from 'path';
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

	it('handles list_rules and get_project_context with logLine', async () => {
		const vscode = require('vscode');
		vscode.workspace.workspaceFolders = [{ uri: { fsPath: process.cwd() }, name: 'repo' }];

		const logs: string[] = [];
		const { port, dispose } = await startExtensionBackend(async () => [], (line) => { logs.push(line); });
		try {
			const send = (payload: object) => new Promise<any>((resolve, reject) => {
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
				socket.write(JSON.stringify(payload) + '\n');
			});

			const r1 = await send({ id: 10, method: 'list_rules', params: {} });
			assert.strictEqual(r1.id, 10);
			assert.ok(Array.isArray(r1.result));
			assert.ok(logs.some(l => l.includes('list_rules')));

			const r2 = await send({ id: 11, method: 'get_project_context', params: { project_key: path.basename(process.cwd()) } });
			assert.strictEqual(r2.id, 11);
			assert.ok(r2.result && typeof (r2.result as any).projectPath === 'string');
		} finally {
			dispose();
		}
	});

	it('returns error when get_rule missing name', async () => {
		const vscode = require('vscode');
		vscode.workspace.workspaceFolders = [{ uri: { fsPath: '/ws/one' }, name: 'One' }];

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
				socket.write(JSON.stringify({ id: 20, method: 'get_rule', params: {} }) + '\n');
			});
			assert.strictEqual(res.id, 20);
			assert.ok(typeof res.error === 'string');
			assert.ok(res.error.includes('Missing name'));
		} finally {
			dispose();
		}
	});

	it('returns error with id -1 for invalid JSON line', async () => {
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
				socket.write('not-json-at-all\n');
			});
			assert.strictEqual(res.id, -1);
			assert.ok(typeof res.error === 'string');
		} finally {
			dispose();
		}
	});

	it('skips blank lines in socket buffer and handles get_command missing name', async () => {
		const vscode = require('vscode');
		vscode.workspace.workspaceFolders = [{ uri: { fsPath: '/ws/one' }, name: 'One' }];

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
				socket.write('\n\n' + JSON.stringify({ id: 30, method: 'get_command', params: {} }) + '\n');
			});
			assert.strictEqual(res.id, 30);
			assert.ok(String(res.error).includes('Missing name'));
		} finally {
			dispose();
		}
	});

	it('returns invalid request when id is not a number', async () => {
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
				socket.write(JSON.stringify({ id: 'bad', method: 'list_projects', params: {} }) + '\n');
			});
			assert.strictEqual(res.error, 'Invalid request');
			assert.ok(res.id === 'bad' || res.id === undefined);
		} finally {
			dispose();
		}
	});

	it('handles get_rule with name and get_skill missing name via socket', async () => {
		const vscode = require('vscode');
		vscode.workspace.workspaceFolders = [{ uri: { fsPath: '/ws/one' }, name: 'One' }];

		const { port, dispose } = await startExtensionBackend(async () => []);
		const send = (payload: object) => new Promise<any>((resolve, reject) => {
			const socket = net.connect(port, '127.0.0.1');
			socket.setEncoding('utf8');
			let buffer = '';
			socket.on('data', (chunk) => {
				buffer += chunk;
				const idx = buffer.indexOf('\n');
				if (idx === -1) {
					return;
				}
				socket.destroy();
				try {
					resolve(JSON.parse(buffer.slice(0, idx)));
				} catch (e) {
					reject(e);
				}
			});
			socket.on('error', reject);
			socket.write(JSON.stringify(payload) + '\n');
		});
		try {
			const ok = await send({ id: 50, method: 'get_rule', params: { name: 'any', projectKey: 'one' } });
			assert.strictEqual(ok.id, 50);
			assert.ok(ok.result === null || typeof ok.result === 'object');

			const bad = await send({ id: 51, method: 'get_skill', params: {} });
			assert.strictEqual(bad.id, 51);
			assert.ok(String(bad.error).includes('Missing name'));

			const specs = await send({ id: 52, method: 'list_specs', params: { projectKey: 'one' } });
			assert.strictEqual(specs.id, 52);
			assert.ok(Array.isArray(specs.result));

			const art = await send({ id: 53, method: 'get_asdlc_artifacts', params: { projectKey: 'one' } });
			assert.strictEqual(art.id, 53);
			assert.ok(art.result && typeof (art.result as any).hasAnyArtifacts === 'boolean');
		} finally {
			dispose();
		}
	});

	it('resolves project via project_key snake_case alias', async () => {
		const vscode = require('vscode');
		vscode.workspace.workspaceFolders = [{ uri: { fsPath: process.cwd() }, name: 'repo' }];

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
					try {
						resolve(JSON.parse(line));
					} catch (e) {
						reject(e);
					}
				});
				socket.on('error', reject);
				socket.write(JSON.stringify({
					id: 40,
					method: 'list_skills',
					params: { project_key: path.basename(process.cwd()) }
				}) + '\n');
			});
			assert.strictEqual(res.id, 40);
			assert.ok(Array.isArray(res.result));
		} finally {
			dispose();
		}
	});
});
