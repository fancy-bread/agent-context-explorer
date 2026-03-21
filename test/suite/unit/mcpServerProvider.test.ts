import * as assert from 'assert';
import type { ProjectDefinition } from '../../../src/types/project';

function makeContext(): any {
	return {
		subscriptions: [],
		extensionPath: '/ext'
	} as any;
}

function setWorkspaceFolders(folders: Array<{ name: string; fsPath: string }>): void {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const vscodeMod = require('vscode');
	vscodeMod.workspace.workspaceFolders = folders.map((f: any) => ({ name: f.name, uri: vscodeMod.Uri.file(f.fsPath) }));
}

describe('mcp/mcpServerProvider', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const vscodeMod = require('vscode');
	const originalWorkspaceFolders = vscodeMod.workspace.workspaceFolders;
	const originalWorkspaceFs = vscodeMod.workspace.fs;
	const originalWindow = vscodeMod.window;
	const originalLm = vscodeMod.lm;
	const originalMcpStdio = vscodeMod.McpStdioServerDefinition;
	const originalOnDidChangeWorkspaceFolders = vscodeMod.workspace.onDidChangeWorkspaceFolders;

	function requireProviderModule(): typeof import('../../../src/mcp/mcpServerProvider') {
		// Ensure we load the module AFTER patching vscode stub for this test.
		// Also force a fresh require so the module picks up the patched vscode namespace.
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const resolved = require.resolve('../../../src/mcp/mcpServerProvider');
		// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
		delete require.cache[resolved];
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		return require(resolved);
	}

	beforeEach(() => {
		// Provide missing pieces on vscode stub
		vscodeMod.McpStdioServerDefinition = class McpStdioServerDefinition {
			name: string;
			command: string;
			args: string[];
			env: Record<string, string>;
			version: string;
			constructor(name: string, command: string, args: string[], env: Record<string, string>, version: string) {
				this.name = name;
				this.command = command;
				this.args = args;
				this.env = env;
				this.version = version;
			}
		};

		vscodeMod.window = {
			showErrorMessage: (_msg: string) => {}
		};

		vscodeMod.workspace.onDidChangeWorkspaceFolders = (cb: () => void) => {
			return { dispose: () => { void cb; } };
		};
	});

	afterEach(() => {
		vscodeMod.workspace.workspaceFolders = originalWorkspaceFolders;
		vscodeMod.workspace.fs = originalWorkspaceFs;
		vscodeMod.workspace.onDidChangeWorkspaceFolders = originalOnDidChangeWorkspaceFolders;
		vscodeMod.window = originalWindow;
		vscodeMod.lm = originalLm;
		vscodeMod.McpStdioServerDefinition = originalMcpStdio;
	});

	it('provideMcpServerDefinitions returns one definition per workspace folder', async () => {
		const { McpServerProvider } = requireProviderModule();
		const ctx = makeContext();
		const getProjects = async (): Promise<ProjectDefinition[]> => [];
		const provider = new McpServerProvider(ctx as any, getProjects);

		setWorkspaceFolders([
			{ name: 'A', fsPath: '/ws/a' },
			{ name: 'B', fsPath: '/ws/b' }
		]);

		const defs = await provider.provideMcpServerDefinitions();
		assert.strictEqual(defs.length, 2);
		const d0: any = defs[0];
		assert.ok(d0.args[0].endsWith('/out/mcp/server.js'));
		assert.ok(d0.env.ACE_WORKSPACE_PATH);
	});

	it('provideMcpServerDefinitions returns minimal definition when no workspaceFolders (undefined)', async () => {
		const { McpServerProvider } = requireProviderModule();
		const ctx = makeContext();
		const getProjects = async (): Promise<ProjectDefinition[]> => [];
		const provider = new McpServerProvider(ctx as any, getProjects);

		vscodeMod.workspace.workspaceFolders = undefined;

		const defs = await provider.provideMcpServerDefinitions();
		assert.strictEqual(defs.length, 1);
		assert.strictEqual((defs[0] as any).name, 'Agent Context Explorer');
	});

	it('resolveMcpServerDefinition returns undefined when script missing', async () => {
		const { McpServerProvider } = requireProviderModule();
		const ctx = makeContext();
		const getProjects = async (): Promise<ProjectDefinition[]> => [];
		const provider = new McpServerProvider(ctx as any, getProjects);

		let errorShown = false;
		vscodeMod.window = {
			showErrorMessage: (_msg: string) => {
				errorShown = true;
			}
		};
		vscodeMod.workspace.fs = {
			...vscodeMod.workspace.fs,
			stat: async () => {
				throw new Error('missing');
			}
		};

		const server = new vscodeMod.McpStdioServerDefinition(
			'ACE: A',
			'node',
			['/ext/out/mcp/server.js', '/ws/a'],
			{},
			'1.0.0'
		);

		const out = await provider.resolveMcpServerDefinition(server as any);
		assert.strictEqual(out, undefined);
		assert.strictEqual(errorShown, true);
	});

	it('registerMcpServerProvider warns when vscode.lm API missing', async () => {
		const { registerMcpServerProvider } = requireProviderModule();
		const ctx = makeContext();
		vscodeMod.lm = undefined;

		let warned = false;
		const originalWarn = console.warn;
		console.warn = () => { warned = true; };
		try {
			const provider = registerMcpServerProvider(ctx as any, async () => []);
			assert.ok(provider);
			assert.strictEqual(warned, true);
		} finally {
			console.warn = originalWarn;
		}
	});

	it('syncCursorRegistration registers ace when one workspace folder', async () => {
		const { McpServerProvider } = requireProviderModule();
		const registered: string[] = [];
		vscodeMod.cursor = {
			mcp: {
				registerServer: (c: { name: string }) => {
					registered.push(c.name);
				},
				unregisterServer: () => {}
			}
		};
		setWorkspaceFolders([{ name: 'Repo', fsPath: '/ws/repo' }]);

		const provider = new McpServerProvider(makeContext() as any, async () => []);
		await provider.syncCursorRegistration();
		assert.deepStrictEqual(registered, ['ace']);
	});

	it('syncCursorRegistration uses ace-<folder> when multiple roots', async () => {
		const { McpServerProvider } = requireProviderModule();
		const registered: string[] = [];
		vscodeMod.cursor = {
			mcp: {
				registerServer: (c: { name: string }) => {
					registered.push(c.name);
				},
				unregisterServer: () => {}
			}
		};
		setWorkspaceFolders([
			{ name: 'A', fsPath: '/ws/a' },
			{ name: 'B', fsPath: '/ws/b' }
		]);

		const provider = new McpServerProvider(makeContext() as any, async () => []);
		await provider.syncCursorRegistration();
		assert.deepStrictEqual(registered.sort(), ['ace-A', 'ace-B'].sort());
	});

	it('dispose unregisters cursor servers when API present', async () => {
		const { McpServerProvider } = requireProviderModule();
		const unregistered: string[] = [];
		vscodeMod.cursor = {
			mcp: {
				registerServer: (c: { name: string }) => {
					void c;
				},
				unregisterServer: (name: string) => {
					unregistered.push(name);
				}
			}
		};
		setWorkspaceFolders([{ name: 'R', fsPath: '/ws/r' }]);

		const provider = new McpServerProvider(makeContext() as any, async () => []);
		await provider.syncCursorRegistration();
		provider.dispose();
		assert.deepStrictEqual(unregistered, ['ace']);
	});

	it('refresh triggers sync and onDidChange', async () => {
		const { McpServerProvider } = requireProviderModule();
		let fires = 0;
		vscodeMod.cursor = {
			mcp: {
				registerServer: () => {},
				unregisterServer: () => {}
			}
		};
		setWorkspaceFolders([{ name: 'R', fsPath: '/ws/r' }]);

		const provider = new McpServerProvider(makeContext() as any, async () => []);
		provider.onDidChangeMcpServerDefinitions(() => {
			fires++;
		});
		provider.refresh();
		assert.strictEqual(fires, 1);
	});

	it('ensureBackendOrFallback uses ACE_PROJECT_PATHS when backend start fails', async () => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const ebPath = require.resolve('../../../src/mcp/extensionBackend');
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const eb = require(ebPath) as { startExtensionBackend: typeof import('../../../src/mcp/extensionBackend').startExtensionBackend };
		const orig = eb.startExtensionBackend;
		eb.startExtensionBackend = async () => {
			throw new Error('bind failed');
		};
		// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
		delete require.cache[require.resolve('../../../src/mcp/mcpServerProvider')];
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { McpServerProvider } = require('../../../src/mcp/mcpServerProvider') as typeof import('../../../src/mcp/mcpServerProvider');

		try {
			setWorkspaceFolders([{ name: 'W', fsPath: '/ws/w' }]);
			const lines: string[] = [];
			const provider = new McpServerProvider(
				makeContext() as any,
				async () => [],
				{ appendLine: (s: string) => { lines.push(s); } } as any
			);
			const defs = await provider.provideMcpServerDefinitions();
			assert.strictEqual(defs.length, 1);
			assert.ok((defs[0] as any).env.ACE_PROJECT_PATHS);
			assert.ok(lines.some(l => l.includes('standalone')));
		} finally {
			eb.startExtensionBackend = orig;
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
			delete require.cache[require.resolve('../../../src/mcp/mcpServerProvider')];
		}
	});
});

