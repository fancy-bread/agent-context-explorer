import * as assert from 'assert';
import { ProjectCommands } from '../../../src/commands/projectCommands';
import { ProjectManager } from '../../../src/services/projectManager';
import type { ProjectDefinition } from '../../../src/types/project';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const vscode = require('vscode');

describe('ProjectCommands', () => {
	function makeContext(): any {
		const store = new Map<string, unknown>();
		store.set('aceExplorer.projects', { projects: [] });
		return {
			workspaceState: {
				get: <T>(key: string) => store.get(key) as T | undefined,
				update: async (key: string, value: unknown) => {
					store.set(key, value);
				}
			},
			subscriptions: [] as { dispose: () => void }[]
		};
	}

	const registered: Record<string, (...args: unknown[]) => unknown> = {};

	function patchVscodeForCommands(): void {
		vscode.commands = {
			registerCommand: (id: string, fn: (...args: unknown[]) => unknown) => {
				registered[id] = fn;
				return { dispose: () => {} };
			},
			executeCommand: async () => {}
		};
		vscode.window = {
			showInputBox: async () => '',
			showInformationMessage: () => {},
			showErrorMessage: () => {},
			showWarningMessage: async () => 'No',
			showTextDocument: async () => ({})
		};
		vscode.workspace.openTextDocument = async () => ({}) as any;
	}

	beforeEach(() => {
		Object.keys(registered).forEach((k) => delete registered[k]);
	});

	it('registerCommands registers ace.addProject, remove, edit, list', () => {
		patchVscodeForCommands();
		const ctx = makeContext();
		ProjectCommands.registerCommands(ctx);
		assert.ok(typeof registered['ace.addProject'] === 'function');
		assert.ok(typeof registered['ace.removeProject'] === 'function');
		assert.ok(typeof registered['ace.editProject'] === 'function');
		assert.ok(typeof registered['ace.listProjects'] === 'function');
	});

	it('ace.addProject flow adds project when inputs valid', async () => {
		patchVscodeForCommands();
		const ctx = makeContext();
		const inputs = ['MyProj', '/workspace', ''];
		let step = 0;
		vscode.window.showInputBox = async (opts: { validateInput?: (v: string) => string | null | Promise<string | null> }) => {
			const v = inputs[step] ?? '';
			step++;
			if (opts?.validateInput) {
				const err = await Promise.resolve(opts.validateInput(v));
				if (err) {
					return undefined;
				}
			}
			return v;
		};
		const origStat = vscode.__overrides.stat;
		vscode.__overrides.stat = async () => ({ type: 2 });

		try {
			ProjectCommands.registerCommands(ctx);
			await (registered['ace.addProject'] as () => Promise<void>)();
		} finally {
			vscode.__overrides.stat = origStat;
		}

		const pm = new ProjectManager(ctx);
		const projects = await pm.getProjects();
		assert.strictEqual(projects.length, 1);
		assert.strictEqual(projects[0].name, 'MyProj');
	});

	it('ace.listProjects opens markdown when projects exist', async () => {
		patchVscodeForCommands();
		const ctx = makeContext();
		const pm = new ProjectManager(ctx);
		await pm.addProject({ name: 'P', path: '/workspace' });

		let opened = false;
		vscode.window.showTextDocument = async () => {
			opened = true;
		};

		ProjectCommands.registerCommands(ctx);
		await (registered['ace.listProjects'] as () => Promise<void>)();
		assert.strictEqual(opened, true);
	});

	it('ace.removeProject removes when user confirms Yes', async () => {
		patchVscodeForCommands();
		const ctx = makeContext();
		const pm = new ProjectManager(ctx);
		const p = await pm.addProject({ name: 'X', path: '/workspace' });

		vscode.window.showWarningMessage = async () => 'Yes';

		ProjectCommands.registerCommands(ctx);
		await (registered['ace.removeProject'] as (x: ProjectDefinition) => Promise<void>)(p);
		assert.strictEqual((await pm.getProjects()).length, 0);
	});
});
