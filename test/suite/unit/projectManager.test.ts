import * as assert from 'assert';
import { ProjectManager } from '../../../src/services/projectManager';
import type { ProjectDefinition } from '../../../src/types/project';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const vscodeStub = require('vscode');

function makeContext(initialRegistry?: { projects: ProjectDefinition[] }, initialCurrent?: string | null): any {
	const store = new Map<string, unknown>();
	store.set('aceExplorer.projects', initialRegistry ?? { projects: [] });
	if (initialCurrent !== undefined) {
		store.set('aceExplorer.currentProject', initialCurrent);
	}
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

describe('ProjectManager', () => {
	it('getProjects returns empty when no registry', async () => {
		const pm = new ProjectManager(makeContext());
		assert.deepStrictEqual(await pm.getProjects(), []);
	});

	it('addProject persists and returns new project with id', async () => {
		const ctx = makeContext();
		const pm = new ProjectManager(ctx);
		const p = await pm.addProject({
			name: 'A',
			path: '/tmp/a',
			description: 'd'
		});
		assert.ok(p.id.startsWith('project_'));
		assert.strictEqual(p.name, 'A');
		const list = await pm.getProjects();
		assert.strictEqual(list.length, 1);
		assert.strictEqual(list[0].path, '/tmp/a');
	});

	it('addProject throws when path already exists', async () => {
		const ctx = makeContext();
		const pm = new ProjectManager(ctx);
		await pm.addProject({ name: 'A', path: '/same' });
		await assert.rejects(() => pm.addProject({ name: 'B', path: '/same' }), /already exists/);
	});

	it('removeProject filters list and clears current when needed', async () => {
		const ctx = makeContext();
		const pm = new ProjectManager(ctx);
		const p = await pm.addProject({ name: 'A', path: '/p1' });
		await pm.setCurrentProject(p.id);
		await pm.removeProject(p.id);
		assert.deepStrictEqual(await pm.getProjects(), []);
		assert.strictEqual(await pm.getCurrentProject(), null);
	});

	it('setCurrentProject updates workspace state and lastAccessed', async () => {
		const ctx = makeContext();
		const pm = new ProjectManager(ctx);
		const a = await pm.addProject({ name: 'A', path: '/a' });
		const b = await pm.addProject({ name: 'B', path: '/b' });
		await pm.setCurrentProject(a.id);
		let projects = await pm.getProjects();
		assert.ok(projects.find((x) => x.id === a.id)?.active);
		await pm.setCurrentProject(b.id);
		projects = await pm.getProjects();
		assert.strictEqual(projects.find((x) => x.id === b.id)?.active, true);
		assert.strictEqual(projects.find((x) => x.id === a.id)?.active, false);
	});

	it('getCurrentProject returns null when not set', async () => {
		const pm = new ProjectManager(makeContext());
		assert.strictEqual(await pm.getCurrentProject(), null);
	});

	it('updateProject merges fields', async () => {
		const ctx = makeContext();
		const pm = new ProjectManager(ctx);
		const p = await pm.addProject({ name: 'A', path: '/x' });
		const updated = await pm.updateProject(p.id, { name: 'B' });
		assert.strictEqual(updated.name, 'B');
		assert.strictEqual((await pm.getProjects())[0].name, 'B');
	});

	it('updateProject throws when id missing', async () => {
		const pm = new ProjectManager(makeContext());
		await assert.rejects(() => pm.updateProject('missing', { name: 'X' }), /not found/);
	});

	it('validateProjectPath returns true for directory stat', async () => {
		const orig = vscodeStub.__overrides.stat;
		vscodeStub.__overrides.stat = async () => ({ type: 2 });
		const pm = new ProjectManager(makeContext());
		try {
			assert.strictEqual(await pm.validateProjectPath('/workspace'), true);
		} finally {
			vscodeStub.__overrides.stat = orig;
		}
	});

	it('validateProjectPath returns false when stat throws', async () => {
		const orig = vscodeStub.__overrides.stat;
		vscodeStub.__overrides.stat = async () => {
			throw new Error('ENOENT');
		};
		const pm = new ProjectManager(makeContext());
		try {
			assert.strictEqual(await pm.validateProjectPath('/nope'), false);
		} finally {
			vscodeStub.__overrides.stat = orig;
		}
	});
});
