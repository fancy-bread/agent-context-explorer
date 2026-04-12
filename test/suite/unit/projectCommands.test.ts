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
		// Preserve vscode-stub window helpers (createOutputChannel, createTreeView) used by extension tests
		vscode.window = {
			...vscode.window,
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
		await (registered['ace.removeProject'] as (x: any) => Promise<void>)({ project: p });
		assert.strictEqual((await pm.getProjects()).length, 0);
	});

	it('ace.removeProject does nothing when user chooses No', async () => {
		patchVscodeForCommands();
		const ctx = makeContext();
		const pm = new ProjectManager(ctx);
		const p = await pm.addProject({ name: 'Keep', path: '/workspace/keep' });

		vscode.window.showWarningMessage = async () => 'No';

		ProjectCommands.registerCommands(ctx);
		await (registered['ace.removeProject'] as (x: any) => Promise<void>)({ project: p });
		assert.strictEqual((await pm.getProjects()).length, 1);
	});

	it('ace.listProjects shows message when no projects', async () => {
		patchVscodeForCommands();
		const ctx = makeContext();
		let infoMsg = '';
		vscode.window.showInformationMessage = (msg: string) => {
			infoMsg = msg;
		};

		ProjectCommands.registerCommands(ctx);
		await (registered['ace.listProjects'] as () => Promise<void>)();
		assert.strictEqual(infoMsg, 'No projects defined');
	});

	it('ace.editProject updates project when inputs valid', async () => {
		patchVscodeForCommands();
		const ctx = makeContext();
		const pm = new ProjectManager(ctx);
		const p = await pm.addProject({ name: 'Old', path: '/workspace/old', description: 'd0' });

		const inputs = ['NewName', 'new desc'];
		let step = 0;
		vscode.window.showInputBox = async (opts: { value?: string; validateInput?: (v: string) => string | null }) => {
			if (step === 0) {
				step++;
				const v = inputs[0];
				if (opts?.validateInput) {
					const err = opts.validateInput(v);
					if (err) {
						return undefined;
					}
				}
				return v;
			}
			step++;
			return inputs[1];
		};

		ProjectCommands.registerCommands(ctx);
		await (registered['ace.editProject'] as (x: any) => Promise<void>)({ project: p });

		const projects = await pm.getProjects();
		assert.strictEqual(projects[0].name, 'NewName');
		assert.strictEqual(projects[0].description, 'new desc');
	});

	it('ace.addProject validateInput rejects empty name', async () => {
		patchVscodeForCommands();
		const ctx = makeContext();
		let validationErr: string | null | undefined;
		vscode.window.showInputBox = async (opts: { validateInput?: (v: string) => string | null }) => {
			if (opts?.validateInput) {
				validationErr = opts.validateInput('');
				validationErr = opts.validateInput('  ');
			}
			return undefined;
		};
		ProjectCommands.registerCommands(ctx);
		await (registered['ace.addProject'] as () => Promise<void>)();
		assert.ok(validationErr && String(validationErr).includes('required'));
	});

	it('ace.addProject returns early when name prompt cancelled', async () => {
		patchVscodeForCommands();
		const ctx = makeContext();
		vscode.window.showInputBox = async () => undefined;
		ProjectCommands.registerCommands(ctx);
		await (registered['ace.addProject'] as () => Promise<void>)();
		const pm = new ProjectManager(ctx);
		assert.strictEqual((await pm.getProjects()).length, 0);
	});

	it('ace.addProject returns early when path prompt cancelled', async () => {
		patchVscodeForCommands();
		const ctx = makeContext();
		let step = 0;
		vscode.window.showInputBox = async (opts: { validateInput?: (v: string) => string | null }) => {
			if (step === 0) {
				step++;
				return 'MyProj';
			}
			return undefined;
		};
		ProjectCommands.registerCommands(ctx);
		await (registered['ace.addProject'] as () => Promise<void>)();
		const pm = new ProjectManager(ctx);
		assert.strictEqual((await pm.getProjects()).length, 0);
	});

	it('ace.addProject path validateInput rejects empty path string', async () => {
		patchVscodeForCommands();
		const ctx = makeContext();
		let step = 0;
		let emptyPathErr = '';
		vscode.window.showInputBox = async (opts: { validateInput?: (v: string) => string | null | Promise<string | null> }) => {
			if (step === 0) {
				step++;
				return 'NamedProj';
			}
			if (step === 1 && opts?.validateInput) {
				step++;
				emptyPathErr = (await Promise.resolve(opts.validateInput(''))) ?? '';
				await Promise.resolve(opts.validateInput('  '));
			}
			return undefined;
		};
		ProjectCommands.registerCommands(ctx);
		await (registered['ace.addProject'] as () => Promise<void>)();
		assert.ok(emptyPathErr.includes('Project path is required'));
	});

	it('ace.addProject stops when path validation fails', async () => {
		patchVscodeForCommands();
		const ctx = makeContext();
		let step = 0;
		vscode.window.showInputBox = async (opts: { validateInput?: (v: string) => string | null | Promise<string | null> }) => {
			if (step === 0) {
				step++;
				return 'P';
			}
			if (step === 1) {
				step++;
				const v = '/not/a/dir';
				if (opts?.validateInput) {
					const err = await Promise.resolve(opts.validateInput(v));
					if (err) {
						return undefined;
					}
				}
				return v;
			}
			return '';
		};
		const origStat = vscode.__overrides.stat;
		vscode.__overrides.stat = async () => {
			throw new Error('ENOENT');
		};
		try {
			ProjectCommands.registerCommands(ctx);
			await (registered['ace.addProject'] as () => Promise<void>)();
		} finally {
			vscode.__overrides.stat = origStat;
		}
		const pm = new ProjectManager(ctx);
		assert.strictEqual((await pm.getProjects()).length, 0);
	});

	it('ace.editProject shows error when updateProject throws', async () => {
		patchVscodeForCommands();
		const ctx = makeContext();
		const pm = new ProjectManager(ctx);
		const p = await pm.addProject({ name: 'U', path: '/workspace/u' });

		const origUpdate = ProjectManager.prototype.updateProject;
		ProjectManager.prototype.updateProject = async () => {
			throw new Error('update fail');
		};
		let errMsg = '';
		let step = 0;
		vscode.window.showInputBox = async (opts: { prompt?: string }) => {
			if (step === 0) {
				step++;
				return 'NewName';
			}
			return 'd';
		};
		vscode.window.showErrorMessage = (msg: string) => {
			errMsg = msg;
		};

		try {
			ProjectCommands.registerCommands(ctx);
			await (registered['ace.editProject'] as (x: any) => Promise<void>)({ project: p });
		} finally {
			ProjectManager.prototype.updateProject = origUpdate;
		}
		assert.ok(errMsg.includes('Failed to edit project'));
	});

	it('ace.editProject validateInput rejects empty or whitespace name', async () => {
		patchVscodeForCommands();
		const ctx = makeContext();
		const pm = new ProjectManager(ctx);
		const p = await pm.addProject({ name: 'V', path: '/workspace/v' });

		let emptyErr: string | null | undefined;
		let wsErr: string | null | undefined;
		vscode.window.showInputBox = async (opts: { validateInput?: (v: string) => string | null }) => {
			if (opts?.validateInput) {
				emptyErr = opts.validateInput('');
				wsErr = opts.validateInput('   ');
			}
			return undefined;
		};

		ProjectCommands.registerCommands(ctx);
		await (registered['ace.editProject'] as (x: any) => Promise<void>)({ project: p });
		assert.ok(emptyErr && String(emptyErr).includes('required'));
		assert.ok(wsErr && String(wsErr).includes('required'));
	});

	it('ace.editProject returns early when name prompt cancelled', async () => {
		patchVscodeForCommands();
		const ctx = makeContext();
		const pm = new ProjectManager(ctx);
		const p = await pm.addProject({ name: 'E', path: '/workspace/e' });

		vscode.window.showInputBox = async () => undefined;

		ProjectCommands.registerCommands(ctx);
		await (registered['ace.editProject'] as (x: any) => Promise<void>)({ project: p });
		const after = await pm.getProjects();
		assert.strictEqual(after[0].name, 'E');
	});

	it('ace.removeProject shows error when removeProject throws', async () => {
		patchVscodeForCommands();
		const ctx = makeContext();
		const pm = new ProjectManager(ctx);
		const p = await pm.addProject({ name: 'Rm', path: '/workspace/rm' });

		vscode.window.showWarningMessage = async () => 'Yes';
		const origRemove = ProjectManager.prototype.removeProject;
		ProjectManager.prototype.removeProject = async () => {
			throw new Error('rm fail');
		};

		let errMsg = '';
		vscode.window.showErrorMessage = (msg: string) => {
			errMsg = msg;
		};

		try {
			ProjectCommands.registerCommands(ctx);
			await (registered['ace.removeProject'] as (x: any) => Promise<void>)({ project: p });
		} finally {
			ProjectManager.prototype.removeProject = origRemove;
		}
		assert.ok(errMsg.includes('Failed to remove project'));
	});

	it('ace.listProjects shows error when openTextDocument throws', async () => {
		patchVscodeForCommands();
		const ctx = makeContext();
		const pm = new ProjectManager(ctx);
		await pm.addProject({ name: 'L', path: '/workspace/l' });

		vscode.workspace.openTextDocument = async () => {
			throw new Error('open fail');
		};
		let errMsg = '';
		vscode.window.showErrorMessage = (msg: string) => {
			errMsg = msg;
		};

		ProjectCommands.registerCommands(ctx);
		await (registered['ace.listProjects'] as () => Promise<void>)();
		assert.ok(errMsg.includes('Failed to list projects'));
	});

	it('ace.addProject shows error when addProject throws', async () => {
		patchVscodeForCommands();
		const ctx = makeContext();
		const pm = new ProjectManager(ctx);
		await pm.addProject({ name: 'Existing', path: '/dup/path' });

		const inputs = ['Dup', '/dup/path', ''];
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

		let errMsg = '';
		vscode.window.showErrorMessage = (msg: string) => {
			errMsg = msg;
		};

		try {
			ProjectCommands.registerCommands(ctx);
			await (registered['ace.addProject'] as () => Promise<void>)();
		} finally {
			vscode.__overrides.stat = origStat;
		}

		assert.ok(errMsg.includes('Failed to add project'));
		assert.ok(errMsg.includes('already exists'));
	});

	it('ace.removeProject shows error when called with no item', async () => {
		patchVscodeForCommands();
		const ctx = makeContext();
		let errMsg = '';
		vscode.window.showErrorMessage = (msg: string) => { errMsg = msg; };

		ProjectCommands.registerCommands(ctx);
		await (registered['ace.removeProject'] as (x: any) => Promise<void>)(undefined);
		assert.ok(errMsg.includes('Unable to identify project to remove'));
	});

	it('ace.removeProject shows error when item has no project property', async () => {
		patchVscodeForCommands();
		const ctx = makeContext();
		let errMsg = '';
		vscode.window.showErrorMessage = (msg: string) => { errMsg = msg; };

		ProjectCommands.registerCommands(ctx);
		await (registered['ace.removeProject'] as (x: any) => Promise<void>)({});
		assert.ok(errMsg.includes('Unable to identify project to remove'));
	});

	it('ace.editProject shows error when called with no item', async () => {
		patchVscodeForCommands();
		const ctx = makeContext();
		let errMsg = '';
		vscode.window.showErrorMessage = (msg: string) => { errMsg = msg; };

		ProjectCommands.registerCommands(ctx);
		await (registered['ace.editProject'] as (x: any) => Promise<void>)(undefined);
		assert.ok(errMsg.includes('Unable to identify project to edit'));
	});

	it('ace.editProject shows error when item has no project property', async () => {
		patchVscodeForCommands();
		const ctx = makeContext();
		let errMsg = '';
		vscode.window.showErrorMessage = (msg: string) => { errMsg = msg; };

		ProjectCommands.registerCommands(ctx);
		await (registered['ace.editProject'] as (x: any) => Promise<void>)({});
		assert.ok(errMsg.includes('Unable to identify project to edit'));
	});

	it('ace.listProjects marks current project in list', async () => {
		patchVscodeForCommands();
		const ctx = makeContext();
		const pm = new ProjectManager(ctx);
		const p1 = await pm.addProject({ name: 'Alpha', path: '/workspace/alpha' });
		await pm.addProject({ name: 'Beta', path: '/workspace/beta' });
		// Mark p1 as active by storing it as currentProject via state
		const store = (ctx.workspaceState as any)._store ?? new Map();
		const data = ctx.workspaceState.get('aceExplorer.projects') as any;
		data.currentProject = p1;
		await ctx.workspaceState.update('aceExplorer.projects', data);

		let openedContent = '';
		vscode.workspace.openTextDocument = async (opts: { content: string }) => {
			openedContent = opts.content;
			return {};
		};

		ProjectCommands.registerCommands(ctx);
		await (registered['ace.listProjects'] as () => Promise<void>)();
		assert.ok(openedContent.includes('Alpha'));
		assert.ok(openedContent.includes('Beta'));
	});
});
