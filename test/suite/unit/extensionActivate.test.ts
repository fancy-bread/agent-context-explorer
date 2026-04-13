import * as assert from 'assert';
import * as path from 'path';
import { AgentsTreeProvider } from '../../../src/providers/agentsTreeProvider';
import { ProjectTreeProvider } from '../../../src/providers/projectTreeProvider';
import { RulesScanner } from '../../../src/scanner/rulesScanner';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const vscode = require('vscode');

/** Captured by patched `registerCommand` (ace.refresh, ProjectCommands, etc.) */
const commandHandlers: Record<string, (...args: unknown[]) => unknown> = {};

type WatcherHookSet = { onDidCreate?: () => void; onDidChange?: () => void; onDidDelete?: () => void };

function makeContext(): any {
	return {
		subscriptions: [] as { dispose: () => void }[],
		extensionPath: path.join(process.cwd(), 'out'),
		workspaceState: {
			get: (): undefined => undefined,
			update: async (): Promise<void> => undefined
		}
	};
}

/** Context with one stored project path different from workspace (exercises refreshData multi-project loop). */
function makeContextWithExtraProject(): any {
	const store = new Map<string, unknown>();
	store.set('aceExplorer.projects', {
		projects: [
			{
				id: 'proj_extra',
				name: 'Extra',
				path: '/other/project',
				lastAccessed: new Date(),
				active: false
			}
		],
		currentProject: undefined
	});
	return {
		subscriptions: [] as { dispose: () => void }[],
		extensionPath: path.join(process.cwd(), 'out'),
		workspaceState: {
			get: <T>(key: string) => store.get(key) as T | undefined,
			update: async (key: string, value: unknown) => {
				store.set(key, value);
			}
		}
	};
}

function patchVscodeForExtension(): void {
	vscode.workspace.workspaceFolders = [{ uri: vscode.Uri.file('/workspace'), name: 'ws' }];
	vscode.lm = {
		registerMcpServerDefinitionProvider: () => ({ dispose: () => {} })
	};
	vscode.workspace.onDidChangeWorkspaceFolders = () => ({ dispose: () => {} });
	vscode.commands.registerCommand = (id: string, fn: (...args: unknown[]) => unknown) => {
		commandHandlers[id] = fn;
		return { dispose: () => {} };
	};
	/** One hook set per createFileSystemWatcher call (rules, commands, skills, agents, global×3). */
	const watcherHooksList: WatcherHookSet[] = [];
	(vscode.workspace as unknown as { __watcherHooksList: WatcherHookSet[] }).__watcherHooksList = watcherHooksList;
	vscode.workspace.createFileSystemWatcher = () => {
		const hooks: WatcherHookSet = {};
		watcherHooksList.push(hooks);
		return {
			onDidCreate: (cb: () => void) => {
				hooks.onDidCreate = cb;
				return { dispose: () => {} };
			},
			onDidChange: (cb: () => void) => {
				hooks.onDidChange = cb;
				return { dispose: () => {} };
			},
			onDidDelete: (cb: () => void) => {
				hooks.onDidDelete = cb;
				return { dispose: () => {} };
			},
			dispose: () => {}
		};
	};
}

describe('extension activate / deactivate', () => {
	let extension: typeof import('../../../src/extension');

	before(function () {
		patchVscodeForExtension();
		// Use cwd (repo root): works for ts-node and compiled `out/test/**/*.test.js`
		const extPath = path.join(process.cwd(), 'src', 'extension.ts');
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		extension = require(extPath);
	});

	beforeEach(() => {
		for (const k of Object.keys(commandHandlers)) {
			delete commandHandlers[k];
		}
	});

	afterEach(() => {
		try {
			extension.deactivate();
		} catch {
			// ignore
		}
	});

	it('activate completes and deactivate runs without throw', function () {
		if (!extension) {
			this.skip();
		}
		const ctx = makeContext();
		assert.doesNotThrow(() => {
			extension.activate(ctx as any);
			extension.deactivate();
		});
	});

	it('second activate in same session is a no-op', function () {
		if (!extension) {
			this.skip();
		}
		const ctx = makeContext();
		extension.activate(ctx as any);
		assert.doesNotThrow(() => extension.activate(ctx as any));
		extension.deactivate();
	});

	it('ace.refresh runs data load and lazy watchers (idempotent)', async function () {
		if (!extension) {
			this.skip();
		}
		const ctx = makeContext();
		extension.activate(ctx as any);
		const refresh = commandHandlers['ace.refresh'];
		assert.ok(refresh, 'ace.refresh should be registered');
		await refresh();
		// Second refresh: watchers already initialized; still exercises refreshData
		await refresh();
		extension.deactivate();
	});

	it('ace.refresh invokes workspace agent definition scan (T013)', async function () {
		if (!extension) {
			this.skip();
		}
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { AgentsScanner } = require('../../../src/scanner/agentsScanner');
		let scanCalls = 0;
		const origScan = AgentsScanner.prototype.scanWorkspaceAgentDefinitions;
		AgentsScanner.prototype.scanWorkspaceAgentDefinitions = async function (this: unknown) {
			scanCalls++;
			return origScan.call(this);
		};
		try {
			const ctx = makeContext();
			extension.activate(ctx as any);
			const refresh = commandHandlers['ace.refresh'];
			assert.ok(refresh);
			await refresh();
			assert.ok(scanCalls >= 1, 'scanWorkspaceAgentDefinitions should run on refresh');
		} finally {
			AgentsScanner.prototype.scanWorkspaceAgentDefinitions = origScan;
			extension.deactivate();
		}
	});

	it('file watcher callbacks trigger refresh (rules/commands/skills/agents + global)', async function () {
		if (!extension) {
			this.skip();
		}
		const ctx = makeContext();
		extension.activate(ctx as any);
		const refresh = commandHandlers['ace.refresh'];
		assert.ok(refresh);
		await refresh();
		const list = (vscode.workspace as unknown as { __watcherHooksList?: WatcherHookSet[] }).__watcherHooksList;
		assert.ok(list && list.length >= 7, 'workspace×4 + global×9 (cursor×3 + claude×3 + dotAgents×3) watchers');
		// All watchers: exercise create/change/delete on each
		for (let i = 0; i < list!.length; i++) {
			const h = list![i];
			assert.ok(h.onDidCreate && h.onDidChange && h.onDidDelete);
			await h.onDidCreate!();
			await h.onDidChange!();
			await h.onDidDelete!();
			await new Promise((r) => setImmediate(r));
		}
		extension.deactivate();
	});

	it('refreshData continues when extra project scan throws', async function () {
		if (!extension) {
			this.skip();
		}
		const origScan = RulesScanner.prototype.scanRules;
		RulesScanner.prototype.scanRules = async function (this: RulesScanner) {
			const root = (this as unknown as { workspaceRoot: { fsPath: string } }).workspaceRoot;
			if (root?.fsPath === '/other/project') {
				throw new Error('scan boom');
			}
			return [];
		} as typeof RulesScanner.prototype.scanRules;
		try {
			const ctx = makeContextWithExtraProject();
			extension.activate(ctx as any);
			const refresh = commandHandlers['ace.refresh'];
			assert.ok(refresh);
			await refresh();
		} finally {
			RulesScanner.prototype.scanRules = origScan;
			extension.deactivate();
		}
	});

	it('refreshData scans stored projects when project path differs from workspace', async function () {
		if (!extension) {
			this.skip();
		}
		const ctx = makeContextWithExtraProject();
		extension.activate(ctx as any);
		const refresh = commandHandlers['ace.refresh'];
		assert.ok(refresh);
		await refresh();
		extension.deactivate();
	});

	it('refreshData logs when Agents view setAgentRoots throws', async function () {
		if (!extension) {
			this.skip();
		}
		const origSet = AgentsTreeProvider.prototype.setAgentRoots;
		AgentsTreeProvider.prototype.setAgentRoots = function () {
			throw new Error('agents fail');
		} as typeof AgentsTreeProvider.prototype.setAgentRoots;
		try {
			const ctx = makeContext();
			extension.activate(ctx as any);
			const refresh = commandHandlers['ace.refresh'];
			assert.ok(refresh);
			await refresh();
		} finally {
			AgentsTreeProvider.prototype.setAgentRoots = origSet;
			extension.deactivate();
		}
	});

	it('refreshData outer catch shows error when updateData throws', async function () {
		if (!extension) {
			this.skip();
		}
		const ctx = makeContext();
		let shown = '';
		const origShow = vscode.window.showErrorMessage;
		vscode.window.showErrorMessage = (msg: string) => {
			shown = msg;
		};
		const origUpdate = ProjectTreeProvider.prototype.updateData;
		ProjectTreeProvider.prototype.updateData = function () {
			throw new Error('update fail');
		} as typeof ProjectTreeProvider.prototype.updateData;
		try {
			extension.activate(ctx as any);
			const refresh = commandHandlers['ace.refresh'];
			assert.ok(refresh);
			await refresh();
			assert.ok(shown.includes('Failed to refresh'));
		} finally {
			ProjectTreeProvider.prototype.updateData = origUpdate;
			vscode.window.showErrorMessage = origShow;
			extension.deactivate();
		}
	});

	it('activate logs when ProjectCommands registration throws', function () {
		if (!extension) {
			this.skip();
		}
		const orig = vscode.commands.registerCommand;
		vscode.commands.registerCommand = (id: string, fn: (...args: unknown[]) => unknown) => {
			if (id === 'ace.addProject') {
				throw new Error('register fail');
			}
			commandHandlers[id] = fn;
			return { dispose: () => {} };
		};
		try {
			const ctx = makeContext();
			assert.doesNotThrow(() => {
				extension.activate(ctx as any);
				extension.deactivate();
			});
		} finally {
			vscode.commands.registerCommand = orig;
		}
	});

	it('activate continues when MCP provider registration throws', function () {
		if (!extension) {
			this.skip();
		}
		const origLm = vscode.lm;
		vscode.lm = {
			registerMcpServerDefinitionProvider: () => {
				throw new Error('lm fail');
			}
		};
		try {
			const ctx = makeContext();
			assert.doesNotThrow(() => {
				extension.activate(ctx as any);
				extension.deactivate();
			});
		} finally {
			vscode.lm = origLm;
		}
	});

	it('activate with no workspace folder still completes', function () {
		if (!extension) {
			this.skip();
		}
		const prev = vscode.workspace.workspaceFolders;
		vscode.workspace.workspaceFolders = undefined;
		try {
			const ctx = makeContext();
			assert.doesNotThrow(() => {
				extension.activate(ctx as any);
				extension.deactivate();
			});
		} finally {
			vscode.workspace.workspaceFolders = prev;
		}
	});

	it('global commands watcher setup failure is logged and extension continues', async function () {
		if (!extension) {
			this.skip();
		}
		const origCreate = vscode.workspace.createFileSystemWatcher;
		let callCount = 0;
		vscode.workspace.createFileSystemWatcher = ((pattern: unknown) => {
			callCount++;
			// setupFileWatcher: 3 watchers; 4th is global commands — force catch path in setupGlobalCommandsWatcher
			if (callCount === 4) {
				throw new Error('global commands watcher unavailable');
			}
			return origCreate.call(vscode.workspace, pattern as any);
		}) as typeof vscode.workspace.createFileSystemWatcher;

		try {
			const ctx = makeContext();
			extension.activate(ctx as any);
			const refresh = commandHandlers['ace.refresh'];
			assert.ok(refresh);
			await refresh();
		} finally {
			vscode.workspace.createFileSystemWatcher = origCreate;
			extension.deactivate();
		}
	});

	it('global skills watcher setup failure is logged and extension continues', async function () {
		if (!extension) {
			this.skip();
		}
		const origCreate = vscode.workspace.createFileSystemWatcher;
		let callCount = 0;
		vscode.workspace.createFileSystemWatcher = ((pattern: unknown) => {
			callCount++;
			if (callCount === 5) {
				throw new Error('global skills watcher unavailable');
			}
			return origCreate.call(vscode.workspace, pattern as any);
		}) as typeof vscode.workspace.createFileSystemWatcher;

		try {
			const ctx = makeContext();
			extension.activate(ctx as any);
			const refresh = commandHandlers['ace.refresh'];
			assert.ok(refresh);
			await refresh();
		} finally {
			vscode.workspace.createFileSystemWatcher = origCreate;
			extension.deactivate();
		}
	});

	it('DotAgents commands watcher failure is logged and extension continues', async function () {
		if (!extension) { this.skip(); }
		const origCreate = vscode.workspace.createFileSystemWatcher;
		vscode.workspace.createFileSystemWatcher = ((pattern: unknown) => {
			const base = (pattern as any)?.workspaceRoot?.fsPath ?? (typeof pattern === 'string' ? pattern : '');
			if (base.includes('.agents') && base.includes('commands')) {
				throw new Error('.agents commands watcher unavailable');
			}
			return origCreate.call(vscode.workspace, pattern as any);
		}) as typeof vscode.workspace.createFileSystemWatcher;

		try {
			const ctx = makeContext();
			extension.activate(ctx as any);
			const refresh = commandHandlers['ace.refresh'];
			assert.ok(refresh);
			await refresh();
		} finally {
			vscode.workspace.createFileSystemWatcher = origCreate;
			extension.deactivate();
		}
	});

	it('DotAgents skills watcher failure is logged and extension continues', async function () {
		if (!extension) { this.skip(); }
		const origCreate = vscode.workspace.createFileSystemWatcher;
		vscode.workspace.createFileSystemWatcher = ((pattern: unknown) => {
			const base = (pattern as any)?.workspaceRoot?.fsPath ?? (typeof pattern === 'string' ? pattern : '');
			if (base.includes('.agents') && base.includes('skills')) {
				throw new Error('.agents skills watcher unavailable');
			}
			return origCreate.call(vscode.workspace, pattern as any);
		}) as typeof vscode.workspace.createFileSystemWatcher;

		try {
			const ctx = makeContext();
			extension.activate(ctx as any);
			const refresh = commandHandlers['ace.refresh'];
			assert.ok(refresh);
			await refresh();
		} finally {
			vscode.workspace.createFileSystemWatcher = origCreate;
			extension.deactivate();
		}
	});

	it('DotAgents agent definitions watcher failure is logged and extension continues', async function () {
		if (!extension) { this.skip(); }
		const origCreate = vscode.workspace.createFileSystemWatcher;
		vscode.workspace.createFileSystemWatcher = ((pattern: unknown) => {
			const base = (pattern as any)?.workspaceRoot?.fsPath ?? (typeof pattern === 'string' ? pattern : '');
			if (base.includes('.agents') && base.includes('agents') && !base.includes('skills')) {
				throw new Error('.agents agent definitions watcher unavailable');
			}
			return origCreate.call(vscode.workspace, pattern as any);
		}) as typeof vscode.workspace.createFileSystemWatcher;

		try {
			const ctx = makeContext();
			extension.activate(ctx as any);
			const refresh = commandHandlers['ace.refresh'];
			assert.ok(refresh);
			await refresh();
		} finally {
			vscode.workspace.createFileSystemWatcher = origCreate;
			extension.deactivate();
		}
	});

	it('resolveAgentRootsWithData skips non-directory stat results', async function () {
		if (!extension) { this.skip(); }
		// stat returns FileType.File (1) instead of Directory (2) — should skip the root
		const origStat = vscode.__overrides.stat;
		vscode.__overrides.stat = async () => ({ type: 1 }); // FileType.File

		try {
			const ctx = makeContext();
			extension.activate(ctx as any);
			const refresh = commandHandlers['ace.refresh'];
			assert.ok(refresh);
			await refresh();
			// Extension should continue normally with zero agent roots resolved
		} finally {
			vscode.__overrides.stat = origStat;
			extension.deactivate();
		}
	});

	it('ensureDataLoaded with no workspace skips file watchers but registers global watchers', async function () {
		if (!extension) { this.skip(); }
		const prev = vscode.workspace.workspaceFolders;
		vscode.workspace.workspaceFolders = undefined;

		try {
			const ctx = makeContext();
			extension.activate(ctx as any);
			const refresh = commandHandlers['ace.refresh'];
			assert.ok(refresh);
			// Should complete without error; no workspace means no setupFileWatcher/claudeCodeScanner branches
			await refresh();
		} finally {
			vscode.workspace.workspaceFolders = prev;
			extension.deactivate();
		}
	});
});
