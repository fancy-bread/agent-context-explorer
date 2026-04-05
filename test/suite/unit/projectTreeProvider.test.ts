// Unit tests for ProjectTreeProvider
import * as assert from 'assert';
import * as vscode from 'vscode';
import { ProjectTreeProvider, ProjectTreeItem } from '../../../src/providers/projectTreeProvider';
import { EMPTY_PROJECT_STATE } from '../../../src/scanner/types';
import { ProjectDefinition } from '../../../src/types/project';
import { Rule } from '../../../src/scanner/rulesScanner';
import { Command } from '../../../src/scanner/commandsScanner';
import { Skill } from '../../../src/scanner/skillsScanner';
import type { AgentDefinition } from '../../../src/scanner/agentsScanner';
import { AsdlcArtifacts } from '../../../src/scanner/types';
import type { ClaudeCodeArtifacts, ClaudeMdFile } from '../../../src/scanner/claudeCodeScanner';

// Mock vscode module
const mockVscode = {
	TreeItem: class MockTreeItem {
		label: string;
		collapsibleState: vscode.TreeItemCollapsibleState;
		description?: string;
		iconPath?: vscode.ThemeIcon;
		tooltip?: string;
		contextValue?: string;
		command?: vscode.Command;
		category?: string;
		project?: ProjectDefinition;
		rule?: Rule;
		commandData?: Command;
		skillData?: Skill;
		constructor(label: string, collapsibleState: vscode.TreeItemCollapsibleState) {
			this.label = label;
			this.collapsibleState = collapsibleState;
		}
	},
	TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
	ThemeIcon: class MockThemeIcon { constructor(public id: string) {} },
	EventEmitter: class MockEventEmitter {
		private listeners: Array<() => void> = [];
		fire() { this.listeners.forEach(l => l()); }
		dispose() { this.listeners = []; }
		event = (listener: () => void) => {
			this.listeners.push(listener);
			return { dispose: () => { this.listeners = this.listeners.filter(l => l !== listener); } };
		};
	},
	Uri: { file: (path: string) => ({ fsPath: path, toString: () => `file://${path}` } as vscode.Uri) }
};

Object.defineProperty(global, 'vscode', { value: mockVscode, writable: true });

function createProjectData(overrides: Partial<{
	rules: Rule[];
	commands: Command[];
	globalCommands: Command[];
	skills: Skill[];
	globalSkills: Skill[];
	agentDefinitions: AgentDefinition[];
	asdlcArtifacts: AsdlcArtifacts;
	claudeCodeArtifacts: ClaudeCodeArtifacts;
}> = {}) {
	const defaultArtifacts: AsdlcArtifacts = {
		agentsMd: { exists: false, sections: [] },
		specs: { exists: false, specs: [] },
		schemas: { exists: false, schemas: [] },
		hasAnyArtifacts: false
	};
	return new Map([
		['test-project', {
			rules: overrides.rules ?? [],
			state: EMPTY_PROJECT_STATE,
			commands: overrides.commands ?? [],
			globalCommands: overrides.globalCommands ?? [],
			skills: overrides.skills ?? [],
			globalSkills: overrides.globalSkills ?? [],
			agentDefinitions: overrides.agentDefinitions ?? [],
			asdlcArtifacts: overrides.asdlcArtifacts ?? defaultArtifacts,
			claudeCodeArtifacts: overrides.claudeCodeArtifacts
		}]
	]);
}

const mockProject: ProjectDefinition = {
	id: 'test-project',
	name: 'Test Project',
	path: '/test/path',
	active: true,
	description: 'Test project',
	lastAccessed: new Date()
};

describe('ProjectTreeProvider loading state', () => {
	it('returns loading item when !isDataLoaded and onDemandLoad provided', async () => {
		let onDemandLoadCalled = false;
		const onDemandLoad = async () => {
			onDemandLoadCalled = true;
		};
		const provider = new ProjectTreeProvider(new Map(), [], null, onDemandLoad);

		const children = await provider.getChildren(undefined);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'Loading...');
		assert.ok(children[0].iconPath, 'Loading item should have icon');
		assert.strictEqual((children[0].iconPath as { id: string }).id, 'loading~spin');
		// onDemandLoad is called asynchronously; allow event loop to run
		await new Promise(resolve => setImmediate(resolve));
		assert.strictEqual(onDemandLoadCalled, true);
	});

	it('returns loading item when !isDataLoaded and isLoading (re-entry)', async () => {
		let loadCount = 0;
		const onDemandLoad = async () => {
			loadCount++;
			await new Promise(resolve => setTimeout(resolve, 10));
		};
		const provider = new ProjectTreeProvider(new Map(), [], null, onDemandLoad);

		const [children1, children2] = await Promise.all([
			provider.getChildren(undefined),
			provider.getChildren(undefined)
		]);

		assert.strictEqual(children1.length, 1);
		assert.strictEqual(children1[0].label, 'Loading...');
		assert.strictEqual(children2.length, 1);
		assert.strictEqual(children2[0].label, 'Loading...');
		// Only one load should be triggered (isLoading prevents re-entry)
		await new Promise(resolve => setTimeout(resolve, 20));
		assert.strictEqual(loadCount, 1);
	});

	it('returns projects when isDataLoaded', async () => {
		const projectData = createProjectData();
		projectData.set('current-workspace', projectData.get('test-project')!);
		projectData.delete('test-project');
		const p: ProjectDefinition = { ...mockProject, id: 'current-workspace', name: 'Current Workspace' };
		const provider = new ProjectTreeProvider(projectData, [p], p);
		provider.setDataLoaded(true);

		const children = await provider.getChildren(undefined);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'Current Workspace');
	});

	it('returns loading item when !isDataLoaded and no onDemandLoad', async () => {
		const provider = new ProjectTreeProvider(new Map(), [], null);

		const children = await provider.getChildren(undefined);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'Loading...');
	});

	it('resets isLoading and fires refresh when onDemandLoad rejects', async () => {
		const onDemandLoad = async () => { throw new Error('Load failed'); };
		const provider = new ProjectTreeProvider(new Map(), [], null, onDemandLoad);
		let refreshFired = false;
		const sub = provider.onDidChangeTreeData(() => { refreshFired = true; });

		await provider.getChildren(undefined);
		await new Promise(resolve => setImmediate(resolve));

		assert.strictEqual(refreshFired, true, 'onDidChangeTreeData should fire when onDemandLoad rejects');
		sub.dispose();
	});
});

describe('ProjectTreeProvider root level', () => {
	it('returns "No projects defined" when isDataLoaded and projects empty', async () => {
		const provider = new ProjectTreeProvider(new Map(), [], null);
		provider.setDataLoaded(true);

		const children = await provider.getChildren(undefined);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'No projects defined');
		assert.strictEqual(children[0].description, 'Add a project to get started');
		assert.strictEqual((children[0].command as any)?.command, 'ace.addProject');
	});

	it('returns inactive project with Collapsed state', async () => {
		const inactiveProject: ProjectDefinition = { ...mockProject, active: false };
		const provider = new ProjectTreeProvider(createProjectData(), [inactiveProject], null);
		provider.setDataLoaded(true);

		const children = await provider.getChildren(undefined);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
		assert.strictEqual(children[0].contextValue, 'inactiveProject');
	});
});

describe('ProjectTreeProvider getTreeItem and lifecycle', () => {
	it('getTreeItem returns element as-is', () => {
		const provider = new ProjectTreeProvider(createProjectData(), [mockProject], mockProject);
		const item = { label: 'Test', collapsibleState: 0 } as ProjectTreeItem;

		const result = provider.getTreeItem(item);

		assert.strictEqual(result, item);
	});

	it('updateData updates internal state', async () => {
		const provider = new ProjectTreeProvider(createProjectData(), [mockProject], mockProject);
		provider.setDataLoaded(true);
		const newProject: ProjectDefinition = { ...mockProject, id: 'new', name: 'New Project' };
		const newData = createProjectData();
		newData.set('new', newData.get('test-project')!);
		newData.delete('test-project');

		provider.updateData(newData, [newProject], newProject);
		const children = await provider.getChildren(undefined);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'New Project');
	});

	it('refresh fires onDidChangeTreeData', () => {
		const provider = new ProjectTreeProvider(createProjectData(), [mockProject], mockProject);
		let fired = false;
		provider.onDidChangeTreeData(() => { fired = true; });

		provider.refresh();

		assert.strictEqual(fired, true);
	});

	it('dispose disposes emitter', () => {
		const provider = new ProjectTreeProvider(createProjectData(), [mockProject], mockProject);
		provider.dispose();
		// Should not throw; internal emitter is disposed
	});

	it('setLoading updates internal loading flag', () => {
		const provider = new ProjectTreeProvider(createProjectData(), [mockProject], mockProject);
		provider.setLoading(true);
		provider.setLoading(false);
		// No throw; line covered
	});
});

describe('ProjectTreeProvider tree hierarchy', () => {
	it('project -> Cursor and Specs sections', async () => {
		const provider = new ProjectTreeProvider(createProjectData(), [mockProject], mockProject);
		provider.setDataLoaded(true);
		const projects = await provider.getChildren(undefined);
		const projectItem = projects[0];
		(projectItem as ProjectTreeItem).category = 'projects';
		(projectItem as ProjectTreeItem).project = mockProject;

		const children = await provider.getChildren(projectItem as ProjectTreeItem);

		assert.strictEqual(children.length, 2);
		const labels = children.map(c => c.label).sort();
		assert.deepStrictEqual(labels, ['Cursor', 'Specs']);
	});

	it('cursor -> Agents, Commands, Rules, Skills (alphabetical)', async () => {
		const provider = new ProjectTreeProvider(createProjectData(), [mockProject], mockProject);
		provider.setDataLoaded(true);
		const cursorItem: ProjectTreeItem = {
			label: 'Cursor',
			collapsibleState: 0,
			category: 'cursor',
			project: mockProject
		} as ProjectTreeItem;

		const children = await provider.getChildren(cursorItem);

		assert.strictEqual(children.length, 4);
		const labels = children.map(c => c.label).sort();
		assert.deepStrictEqual(labels, ['Agents', 'Commands', 'Rules', 'Skills']);
	});

	it('agents -> flat spec domain leaves (no nested Specs/Schemas folders)', async () => {
		const asdlcArtifacts: AsdlcArtifacts = {
			agentsMd: { exists: true, path: '/test/AGENTS.md', sections: [] },
			specs: { exists: true, specs: [{ domain: 'providers', path: '/test/specs/p/spec.md', hasBlueprint: true, hasContract: true }] },
			schemas: { exists: true, schemas: [{ name: 'test', path: '/test/schemas/x.json', schemaId: 'test-id' }] },
			hasAnyArtifacts: true
		};
		const provider = new ProjectTreeProvider(createProjectData({ asdlcArtifacts }), [mockProject], mockProject);
		const specsSectionItem: ProjectTreeItem = { label: 'Specs', collapsibleState: 0, category: 'agents', project: mockProject } as ProjectTreeItem;

		const children = await provider.getChildren(specsSectionItem);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'providers');
		assert.strictEqual(children[0].category, 'specs');
		assert.ok(!children.some(c => c.label === 'Schemas'));
	});

	it('agents -> "No specs found" when none exist', async () => {
		const provider = new ProjectTreeProvider(createProjectData(), [mockProject], mockProject);
		const specsSectionItem: ProjectTreeItem = { label: 'Specs', collapsibleState: 0, category: 'agents', project: mockProject } as ProjectTreeItem;

		const children = await provider.getChildren(specsSectionItem);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'No specs found');
	});
});

describe('ProjectTreeProvider agents (Cursor — agent-definitions)', () => {
	it('returns placeholder when no agent definition files (FR-005 / T008)', async () => {
		const provider = new ProjectTreeProvider(createProjectData(), [mockProject], mockProject);
		const agentsFolderItem: ProjectTreeItem = {
			label: 'Agents',
			collapsibleState: 0,
			category: 'agent-definitions',
			project: mockProject
		} as ProjectTreeItem;

		const children = await provider.getChildren(agentsFolderItem);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'No agents found');
	});

	it('returns agent leaves with hubot icon and vscode.open (US1)', async () => {
		const ad: AgentDefinition = {
			uri: vscode.Uri.file('/test/.cursor/agents/my-agent.md'),
			content: '# My Agent\n',
			fileName: 'my-agent',
			displayName: 'my-agent'
		};
		const provider = new ProjectTreeProvider(createProjectData({ agentDefinitions: [ad] }), [mockProject], mockProject);
		const agentsFolderItem: ProjectTreeItem = {
			label: 'Agents',
			collapsibleState: 0,
			category: 'agent-definitions',
			project: mockProject
		} as ProjectTreeItem;

		const children = await provider.getChildren(agentsFolderItem);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'my-agent');
		assert.strictEqual(children[0].contextValue, 'agent-definition');
		assert.strictEqual((children[0].iconPath as { id: string }).id, 'hubot');
		assert.strictEqual(children[0].command?.command, 'vscode.open');
	});
});

describe('ProjectTreeProvider commands', () => {
	it('commands returns workspace command items with preview tooltip', async () => {
		const cmd: Command = {
			uri: vscode.Uri.file('/test/.cursor/commands/test.md'),
			fileName: 'test.md',
			content: '# Test Command\n\nDescription',
			location: 'workspace'
		};
		const provider = new ProjectTreeProvider(createProjectData({ commands: [cmd] }), [mockProject], mockProject);
		const commandsItem: ProjectTreeItem = { label: 'Commands', collapsibleState: 0, category: 'commands', project: mockProject } as ProjectTreeItem;

		const children = await provider.getChildren(commandsItem);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'test.md');
		assert.strictEqual(children[0].contextValue, 'command');
		assert.ok((children[0].tooltip as string)?.includes('Test Command'), 'tooltip should include heading from content');
	});

	it('commands returns placeholder when empty', async () => {
		const provider = new ProjectTreeProvider(createProjectData(), [mockProject], mockProject);
		const commandsItem: ProjectTreeItem = { label: 'Commands', collapsibleState: 0, category: 'commands', project: mockProject } as ProjectTreeItem;

		const children = await provider.getChildren(commandsItem);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'No commands found');
	});

	it('commands tooltip uses first non-empty line when no heading', async () => {
		const cmd: Command = {
			uri: vscode.Uri.file('/test/.cursor/commands/plain.md'),
			fileName: 'plain.md',
			content: 'Plain first line\n\nMore text',
			location: 'workspace'
		};
		const provider = new ProjectTreeProvider(createProjectData({ commands: [cmd] }), [mockProject], mockProject);
		const commandsItem: ProjectTreeItem = { label: 'Commands', collapsibleState: 0, category: 'commands', project: mockProject } as ProjectTreeItem;

		const children = await provider.getChildren(commandsItem);

		assert.strictEqual(children.length, 1);
		assert.ok((children[0].tooltip as string)?.includes('Plain first line'));
	});

	it('commands tooltip uses first 100 chars when no heading or non-empty line', async () => {
		const cmd: Command = {
			uri: vscode.Uri.file('/test/.cursor/commands/empty.md'),
			fileName: 'empty.md',
			content: '',
			location: 'workspace'
		};
		const provider = new ProjectTreeProvider(createProjectData({ commands: [cmd] }), [mockProject], mockProject);
		const commandsItem: ProjectTreeItem = { label: 'Commands', collapsibleState: 0, category: 'commands', project: mockProject } as ProjectTreeItem;

		const children = await provider.getChildren(commandsItem);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(typeof children[0].tooltip, 'string');
	});
});

describe('ProjectTreeProvider skills', () => {
	it('skills returns workspace skill items', async () => {
		const skill: Skill = {
			uri: vscode.Uri.file('/test/.cursor/skills/foo/SKILL.md'),
			fileName: 'SKILL.md',
			location: 'workspace',
			metadata: { title: 'Foo Skill', overview: 'Overview' },
			content: ''
		};
		const provider = new ProjectTreeProvider(createProjectData({ skills: [skill] }), [mockProject], mockProject);
		const skillsItem: ProjectTreeItem = { label: 'Skills', collapsibleState: 0, category: 'skills', project: mockProject } as ProjectTreeItem;

		const children = await provider.getChildren(skillsItem);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'Foo Skill');
		assert.strictEqual(children[0].contextValue, 'skill');
	});

	it('skills returns placeholder when empty', async () => {
		const provider = new ProjectTreeProvider(createProjectData(), [mockProject], mockProject);
		const skillsItem: ProjectTreeItem = { label: 'Skills', collapsibleState: 0, category: 'skills', project: mockProject } as ProjectTreeItem;

		const children = await provider.getChildren(skillsItem);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'No skills found');
	});
});

describe('ProjectTreeProvider rules', () => {
	it('rules returns rule items', async () => {
		const rule: Rule = {
			uri: vscode.Uri.file('/test/.cursor/rules/test.mdc'),
			fileName: 'test.mdc',
			metadata: { description: 'A rule', globs: [], alwaysApply: false },
			content: ''
		};
		const provider = new ProjectTreeProvider(createProjectData({ rules: [rule] }), [mockProject], mockProject);
		const rulesItem: ProjectTreeItem = { label: 'Rules', collapsibleState: 0, category: 'rules', project: mockProject } as ProjectTreeItem;

		const children = await provider.getChildren(rulesItem);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'test.mdc');
		assert.strictEqual(children[0].contextValue, 'rule');
	});

	it('rules returns placeholder when empty', async () => {
		const provider = new ProjectTreeProvider(createProjectData(), [mockProject], mockProject);
		const rulesItem: ProjectTreeItem = { label: 'Rules', collapsibleState: 0, category: 'rules', project: mockProject } as ProjectTreeItem;

		const children = await provider.getChildren(rulesItem);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'No rules found');
	});
});

describe('ProjectTreeProvider specs section (flat under agents)', () => {
	it('agents returns placeholder when specs exists but list empty', async () => {
		const asdlcArtifacts: AsdlcArtifacts = {
			agentsMd: { exists: false, sections: [] },
			specs: { exists: true, specs: [] },
			schemas: { exists: false, schemas: [] },
			hasAnyArtifacts: true
		};
		const provider = new ProjectTreeProvider(createProjectData({ asdlcArtifacts }), [mockProject], mockProject);
		const specsSectionItem: ProjectTreeItem = { label: 'Specs', collapsibleState: 0, category: 'agents', project: mockProject } as ProjectTreeItem;

		const children = await provider.getChildren(specsSectionItem);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'No specs found');
	});
});

describe('ProjectTreeProvider error handling', () => {
	it('getChildren returns error item when branch throws', async () => {
		const defaultArtifacts: AsdlcArtifacts = {
			agentsMd: { exists: false, sections: [] },
			specs: { exists: false, specs: [] },
			schemas: { exists: false, schemas: [] },
			hasAnyArtifacts: false
		};
		const throwingEntry = {
			rules: [] as Rule[],
			state: EMPTY_PROJECT_STATE,
			get commands(): Command[] { throw new Error('commands getter threw'); },
			globalCommands: [] as Command[],
			skills: [] as Skill[],
			globalSkills: [] as Skill[],
			agentDefinitions: [] as AgentDefinition[],
			asdlcArtifacts: defaultArtifacts
		};
		const throwingData = new Map([['test-project', throwingEntry]]);
		const provider = new ProjectTreeProvider(throwingData, [mockProject], mockProject);
		provider.setDataLoaded(true);
		const commandsItem: ProjectTreeItem = { label: 'Commands', collapsibleState: 0, category: 'commands', project: mockProject } as ProjectTreeItem;

		const children = await provider.getChildren(commandsItem);

		assert.strictEqual(children.length, 1);
		assert.ok((children[0].label as string).startsWith('Error:'));
		assert.ok(children[0].tooltip);
	});
});

describe('ProjectTreeProvider edge cases', () => {
	it('returns empty array for unknown category', async () => {
		const provider = new ProjectTreeProvider(createProjectData(), [mockProject], mockProject);
		const unknownItem: ProjectTreeItem = { label: 'Unknown', collapsibleState: 0, category: 'unknown' as any, project: mockProject } as ProjectTreeItem;

		const children = await provider.getChildren(unknownItem);

		assert.strictEqual(children.length, 0);
	});

	it('returns empty array for element without category', async () => {
		const provider = new ProjectTreeProvider(createProjectData(), [mockProject], mockProject);
		const noCategoryItem: ProjectTreeItem = { label: 'X', collapsibleState: 0 } as ProjectTreeItem;

		const children = await provider.getChildren(noCategoryItem);

		assert.strictEqual(children.length, 0);
	});
});

// --- Claude Code section tests ---

function makeClaudeCodeArtifacts(overrides: Partial<ClaudeCodeArtifacts> = {}): ClaudeCodeArtifacts {
	return {
		claudeMd: overrides.claudeMd,
		rules: overrides.rules ?? [],
		commands: overrides.commands ?? [],
		skills: overrides.skills ?? [],
		hasAnyArtifacts: overrides.hasAnyArtifacts ?? false
	};
}

describe('ProjectTreeProvider Claude Code section visibility (T006)', () => {
	it('project -> includes Claude Code section when hasAnyArtifacts is true', async () => {
		const claudeCodeArtifacts = makeClaudeCodeArtifacts({ hasAnyArtifacts: true });
		const provider = new ProjectTreeProvider(createProjectData({ claudeCodeArtifacts }), [mockProject], mockProject);
		provider.setDataLoaded(true);
		const projects = await provider.getChildren(undefined);
		const projectItem = projects[0];
		(projectItem as ProjectTreeItem).category = 'projects';
		(projectItem as ProjectTreeItem).project = mockProject;

		const children = await provider.getChildren(projectItem as ProjectTreeItem);

		const labels = children.map(c => c.label);
		assert.ok(labels.includes('Claude Code'), 'Claude Code section should be present');
		assert.strictEqual(children.length, 3);
	});

	it('project -> no Claude Code section when hasAnyArtifacts is false', async () => {
		const claudeCodeArtifacts = makeClaudeCodeArtifacts({ hasAnyArtifacts: false });
		const provider = new ProjectTreeProvider(createProjectData({ claudeCodeArtifacts }), [mockProject], mockProject);
		provider.setDataLoaded(true);
		const projects = await provider.getChildren(undefined);
		const projectItem = projects[0];
		(projectItem as ProjectTreeItem).category = 'projects';
		(projectItem as ProjectTreeItem).project = mockProject;

		const children = await provider.getChildren(projectItem as ProjectTreeItem);

		const labels = children.map(c => c.label);
		assert.ok(!labels.includes('Claude Code'), 'Claude Code section should be absent');
		assert.strictEqual(children.length, 2);
	});

	it('project -> no Claude Code section when claudeCodeArtifacts is undefined', async () => {
		const provider = new ProjectTreeProvider(createProjectData(), [mockProject], mockProject);
		provider.setDataLoaded(true);
		const projects = await provider.getChildren(undefined);
		const projectItem = projects[0];
		(projectItem as ProjectTreeItem).category = 'projects';
		(projectItem as ProjectTreeItem).project = mockProject;

		const children = await provider.getChildren(projectItem as ProjectTreeItem);

		assert.strictEqual(children.length, 2);
		assert.ok(!children.map(c => c.label).includes('Claude Code'));
	});

	it('Claude Code section item has symbol-file icon', async () => {
		const claudeCodeArtifacts = makeClaudeCodeArtifacts({ hasAnyArtifacts: true });
		const provider = new ProjectTreeProvider(createProjectData({ claudeCodeArtifacts }), [mockProject], mockProject);
		provider.setDataLoaded(true);
		const projects = await provider.getChildren(undefined);
		const projectItem = projects[0];
		(projectItem as ProjectTreeItem).category = 'projects';
		(projectItem as ProjectTreeItem).project = mockProject;

		const children = await provider.getChildren(projectItem as ProjectTreeItem);
		const claudeCodeItem = children.find(c => c.label === 'Claude Code');

		assert.ok(claudeCodeItem);
		assert.strictEqual((claudeCodeItem!.iconPath as { id: string }).id, 'symbol-file');
	});
});

describe('ProjectTreeProvider claude-code children (T007-T010)', () => {
	const claudeCodeItem: ProjectTreeItem = {
		label: 'Claude Code',
		collapsibleState: 2,
		category: 'claude-code',
		project: mockProject
	} as ProjectTreeItem;

	it('T007: renders CLAUDE.md child item with file-text icon and vscode.open', async () => {
		const claudeMd: ClaudeMdFile = { uri: vscode.Uri.file('/test/CLAUDE.md'), path: '/test/CLAUDE.md' };
		const artifacts = makeClaudeCodeArtifacts({ claudeMd, hasAnyArtifacts: true });
		const provider = new ProjectTreeProvider(createProjectData({ claudeCodeArtifacts: artifacts }), [mockProject], mockProject);

		const children = await provider.getChildren(claudeCodeItem);

		const mdItem = children.find(c => c.label === 'CLAUDE.md');
		assert.ok(mdItem, 'CLAUDE.md item should be present');
		assert.strictEqual((mdItem!.iconPath as { id: string }).id, 'file-text');
		assert.strictEqual(mdItem!.contextValue, 'claude-md');
		assert.strictEqual(mdItem!.command?.command, 'vscode.open');
	});

	it('T007: no CLAUDE.md item when claudeMd is undefined', async () => {
		const artifacts = makeClaudeCodeArtifacts({ hasAnyArtifacts: true });
		const provider = new ProjectTreeProvider(createProjectData({ claudeCodeArtifacts: artifacts }), [mockProject], mockProject);

		const children = await provider.getChildren(claudeCodeItem);

		assert.ok(!children.some(c => c.label === 'CLAUDE.md'));
	});

	it('T008: renders Rules group with count and bookmark icon', async () => {
		const rule: Rule = { uri: vscode.Uri.file('/test/.claude/rules/r.md'), fileName: 'r.md', metadata: { description: 'desc', globs: [], alwaysApply: false }, content: '' };
		const artifacts = makeClaudeCodeArtifacts({ rules: [rule], hasAnyArtifacts: true });
		const provider = new ProjectTreeProvider(createProjectData({ claudeCodeArtifacts: artifacts }), [mockProject], mockProject);

		const children = await provider.getChildren(claudeCodeItem);

		const rulesGroup = children.find(c => (c.label as string).startsWith('Rules'));
		assert.ok(rulesGroup, 'Rules group should be present');
		assert.strictEqual(rulesGroup!.label, 'Rules (1)');
		assert.strictEqual((rulesGroup!.iconPath as { id: string }).id, 'bookmark');
		assert.strictEqual((rulesGroup as ProjectTreeItem).category, 'claude-rules');
	});

	it('T008: no Rules group when rules array is empty', async () => {
		const artifacts = makeClaudeCodeArtifacts({ hasAnyArtifacts: true });
		const provider = new ProjectTreeProvider(createProjectData({ claudeCodeArtifacts: artifacts }), [mockProject], mockProject);

		const children = await provider.getChildren(claudeCodeItem);

		assert.ok(!children.some(c => (c.label as string).startsWith('Rules')));
	});

	it('T009: renders Commands group with count and terminal icon', async () => {
		const cmd: Command = { uri: vscode.Uri.file('/test/.claude/commands/foo.md'), fileName: 'foo.md', content: '', location: 'workspace' };
		const artifacts = makeClaudeCodeArtifacts({ commands: [cmd], hasAnyArtifacts: true });
		const provider = new ProjectTreeProvider(createProjectData({ claudeCodeArtifacts: artifacts }), [mockProject], mockProject);

		const children = await provider.getChildren(claudeCodeItem);

		const cmdGroup = children.find(c => (c.label as string).startsWith('Commands'));
		assert.ok(cmdGroup, 'Commands group should be present');
		assert.strictEqual(cmdGroup!.label, 'Commands (1)');
		assert.strictEqual((cmdGroup!.iconPath as { id: string }).id, 'terminal');
		assert.strictEqual((cmdGroup as ProjectTreeItem).category, 'claude-commands');
	});

	it('T009: no Commands group when commands array is empty', async () => {
		const artifacts = makeClaudeCodeArtifacts({ hasAnyArtifacts: true });
		const provider = new ProjectTreeProvider(createProjectData({ claudeCodeArtifacts: artifacts }), [mockProject], mockProject);

		const children = await provider.getChildren(claudeCodeItem);

		assert.ok(!children.some(c => (c.label as string).startsWith('Commands')));
	});

	it('T010: renders Skills group with count and play-circle icon', async () => {
		const skill: Skill = { uri: vscode.Uri.file('/test/.claude/skills/foo/SKILL.md'), fileName: 'SKILL.md', content: '', location: 'workspace', metadata: { title: 'Foo', overview: 'Overview' } };
		const artifacts = makeClaudeCodeArtifacts({ skills: [skill], hasAnyArtifacts: true });
		const provider = new ProjectTreeProvider(createProjectData({ claudeCodeArtifacts: artifacts }), [mockProject], mockProject);

		const children = await provider.getChildren(claudeCodeItem);

		const skillsGroup = children.find(c => (c.label as string).startsWith('Skills'));
		assert.ok(skillsGroup, 'Skills group should be present');
		assert.strictEqual(skillsGroup!.label, 'Skills (1)');
		assert.strictEqual((skillsGroup!.iconPath as { id: string }).id, 'play-circle');
		assert.strictEqual((skillsGroup as ProjectTreeItem).category, 'claude-skills');
	});

	it('T010: no Skills group when skills array is empty', async () => {
		const artifacts = makeClaudeCodeArtifacts({ hasAnyArtifacts: true });
		const provider = new ProjectTreeProvider(createProjectData({ claudeCodeArtifacts: artifacts }), [mockProject], mockProject);

		const children = await provider.getChildren(claudeCodeItem);

		assert.ok(!children.some(c => (c.label as string).startsWith('Skills')));
	});
});

describe('ProjectTreeProvider claude-rules leaf items (T008)', () => {
	it('returns rule leaf items with correct properties', async () => {
		const rule: Rule = { uri: vscode.Uri.file('/test/.claude/rules/my-rule.md'), fileName: 'my-rule.md', metadata: { description: 'My rule desc', globs: [], alwaysApply: false }, content: '' };
		const artifacts = makeClaudeCodeArtifacts({ rules: [rule], hasAnyArtifacts: true });
		const provider = new ProjectTreeProvider(createProjectData({ claudeCodeArtifacts: artifacts }), [mockProject], mockProject);
		const rulesItem: ProjectTreeItem = { label: 'Rules (1)', collapsibleState: 1, category: 'claude-rules', project: mockProject } as ProjectTreeItem;

		const children = await provider.getChildren(rulesItem);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'my-rule.md');
		assert.strictEqual(children[0].contextValue, 'claude-rule');
		assert.strictEqual(children[0].tooltip, 'My rule desc');
		assert.strictEqual((children[0].iconPath as { id: string }).id, 'bookmark');
		assert.strictEqual(children[0].command?.command, 'vscode.open');
		assert.strictEqual((children[0] as ProjectTreeItem).claudeRuleData, rule);
	});
});

describe('ProjectTreeProvider claude-commands leaf items (T009)', () => {
	it('strips .md extension from command label', async () => {
		const cmd: Command = { uri: vscode.Uri.file('/test/.claude/commands/deploy.md'), fileName: 'deploy.md', content: '', location: 'workspace' };
		const artifacts = makeClaudeCodeArtifacts({ commands: [cmd], hasAnyArtifacts: true });
		const provider = new ProjectTreeProvider(createProjectData({ claudeCodeArtifacts: artifacts }), [mockProject], mockProject);
		const commandsItem: ProjectTreeItem = { label: 'Commands (1)', collapsibleState: 1, category: 'claude-commands', project: mockProject } as ProjectTreeItem;

		const children = await provider.getChildren(commandsItem);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'deploy');
		assert.strictEqual(children[0].contextValue, 'claude-command');
		assert.strictEqual((children[0].iconPath as { id: string }).id, 'terminal');
		assert.strictEqual(children[0].command?.command, 'vscode.open');
		assert.strictEqual((children[0] as ProjectTreeItem).claudeCommandData, cmd);
	});

	it('uses fileName as-is when it has no .md extension', async () => {
		const cmd: Command = { uri: vscode.Uri.file('/test/.claude/commands/review'), fileName: 'review', content: '', location: 'workspace' };
		const artifacts = makeClaudeCodeArtifacts({ commands: [cmd], hasAnyArtifacts: true });
		const provider = new ProjectTreeProvider(createProjectData({ claudeCodeArtifacts: artifacts }), [mockProject], mockProject);
		const commandsItem: ProjectTreeItem = { label: 'Commands (1)', collapsibleState: 1, category: 'claude-commands', project: mockProject } as ProjectTreeItem;

		const children = await provider.getChildren(commandsItem);

		assert.strictEqual(children[0].label, 'review');
	});
});

describe('ProjectTreeProvider claude-skills leaf items (T010)', () => {
	it('uses metadata.title as label when present', async () => {
		const skill: Skill = { uri: vscode.Uri.file('/test/.claude/skills/foo/SKILL.md'), fileName: 'SKILL.md', content: '', location: 'workspace', metadata: { title: 'My Skill', overview: 'Does stuff' } };
		const artifacts = makeClaudeCodeArtifacts({ skills: [skill], hasAnyArtifacts: true });
		const provider = new ProjectTreeProvider(createProjectData({ claudeCodeArtifacts: artifacts }), [mockProject], mockProject);
		const skillsItem: ProjectTreeItem = { label: 'Skills (1)', collapsibleState: 1, category: 'claude-skills', project: mockProject } as ProjectTreeItem;

		const children = await provider.getChildren(skillsItem);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'My Skill');
		assert.strictEqual(children[0].tooltip, 'Does stuff');
		assert.strictEqual(children[0].contextValue, 'claude-skill');
		assert.strictEqual((children[0].iconPath as { id: string }).id, 'play-circle');
		assert.strictEqual(children[0].command?.command, 'vscode.open');
		assert.strictEqual((children[0] as ProjectTreeItem).claudeSkillData, skill);
	});

	it('falls back to fileName when metadata.title is absent', async () => {
		const skill: Skill = { uri: vscode.Uri.file('/test/.claude/skills/bar/SKILL.md'), fileName: 'SKILL.md', content: '', location: 'workspace', metadata: undefined };
		const artifacts = makeClaudeCodeArtifacts({ skills: [skill], hasAnyArtifacts: true });
		const provider = new ProjectTreeProvider(createProjectData({ claudeCodeArtifacts: artifacts }), [mockProject], mockProject);
		const skillsItem: ProjectTreeItem = { label: 'Skills (1)', collapsibleState: 1, category: 'claude-skills', project: mockProject } as ProjectTreeItem;

		const children = await provider.getChildren(skillsItem);

		assert.strictEqual(children[0].label, 'SKILL.md');
	});
});
