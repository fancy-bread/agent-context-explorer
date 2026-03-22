// Unit tests for AgentsTreeProvider
import * as assert from 'assert';
import * as vscode from 'vscode';
import { AgentsTreeProvider, AgentRootDefinition } from '../../../src/providers/agentsTreeProvider';
import type { ProjectTreeItem } from '../../../src/providers/projectTreeProvider';
import type { Command } from '../../../src/scanner/commandsScanner';
import type { Skill } from '../../../src/scanner/skillsScanner';

// Reuse minimal vscode-like types if needed (in this repo, tests already run with a vscode stub)

describe('AgentsTreeProvider root level', () => {
	it('returns placeholder when no agent roots configured', async () => {
		const provider = new AgentsTreeProvider();

		const children = await provider.getChildren(undefined);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'No agent roots configured');
		assert.strictEqual(children[0].description, 'Agents view placeholder');
	});

	it('returns one item per configured agent root', async () => {
		const provider = new AgentsTreeProvider();
		const roots: AgentRootDefinition[] = [
			{
				id: 'cursor',
				label: 'Cursor',
				description: '/home/user/.cursor',
				icon: 'symbol-namespace',
				commands: [],
				skills: []
			},
			{
				id: 'global',
				label: 'Global',
				description: '/home/user/.agents',
				icon: 'globe',
				commands: [],
				skills: []
			}
		];

		provider.setAgentRoots(roots);
		const children = await provider.getChildren(undefined);

		assert.strictEqual(children.length, 2);
		const labels = children.map(c => c.label).sort();
		assert.deepStrictEqual(labels, ['Cursor', 'Global']);
		assert.ok(children.every(c => c.contextValue === 'agent-root'));
	});

	it('uses globe icon for global root id and desktop icon for others', async () => {
		const provider = new AgentsTreeProvider();
		provider.setAgentRoots([
			{ id: 'cursor', label: 'C', description: '', commands: [], skills: [] },
			{ id: 'global', label: 'G', description: '', commands: [], skills: [] }
		]);
		const roots = await provider.getChildren(undefined);
		const cursorIcon = (roots[0].iconPath as vscode.ThemeIcon).id;
		const globalIcon = (roots[1].iconPath as vscode.ThemeIcon).id;
		assert.strictEqual(cursorIcon, 'device-desktop');
		assert.strictEqual(globalIcon, 'globe');
	});
});

describe('AgentsTreeProvider sections under agent root', () => {
	function createRootItem(id: string, label = 'Cursor'): ProjectTreeItem {
		const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed) as ProjectTreeItem;
		item.contextValue = 'agent-root';
		item.agentRootId = id;
		return item;
	}

	it('returns Commands and Skills nodes for a populated agent root', async () => {
		const provider = new AgentsTreeProvider();
		const roots: AgentRootDefinition[] = [
			{
				id: 'cursor',
				label: 'Cursor',
				description: '/home/user/.cursor',
				icon: 'symbol-namespace',
				commands: [] as Command[],
				skills: [] as Skill[]
			}
		];

		provider.setAgentRoots(roots);
		const rootItem = createRootItem('cursor');

		const children = await provider.getChildren(rootItem);

		assert.strictEqual(children.length, 2);
		const labels = children.map(c => c.label).sort();
		assert.deepStrictEqual(labels, ['Commands', 'Skills']);
		const commandsNode = children.find(c => c.label === 'Commands')!;
		const skillsNode = children.find(c => c.label === 'Skills')!;
		assert.strictEqual(commandsNode.contextValue, 'agent-commands');
		assert.strictEqual(skillsNode.contextValue, 'agent-skills');
	});

	it('uses Collapsed state when commands or skills arrays are non-empty', async () => {
		const cmdUri = vscode.Uri.file('/c.md');
		const skillUri = vscode.Uri.file('/s/SKILL.md');
		const provider = new AgentsTreeProvider();
		provider.setAgentRoots([{
			id: 'cursor',
			label: 'Cursor',
			description: '',
			commands: [{ uri: cmdUri, content: 'x', fileName: 'a.md', location: 'workspace' } as Command],
			skills: [{ uri: skillUri, content: '', fileName: 'sk', location: 'workspace', metadata: {} } as Skill]
		}]);
		const sections = await provider.getChildren(createRootItem('cursor'));
		const commandsNode = sections.find(c => c.label === 'Commands')!;
		const skillsNode = sections.find(c => c.label === 'Skills')!;
		assert.strictEqual(commandsNode.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
		assert.strictEqual(skillsNode.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
	});

	it('returns no children when agentRootId does not match any root', async () => {
		const provider = new AgentsTreeProvider();
		provider.setAgentRoots([{ id: 'cursor', label: 'C', description: '', commands: [], skills: [] }]);
		const stale = createRootItem('missing-id');
		assert.deepStrictEqual(await provider.getChildren(stale), []);
	});
});

describe('AgentsTreeProvider commands section', () => {
	function createSectionItem(rootId: string, section: 'commands' | 'skills', label: string, contextValue: string): ProjectTreeItem {
		const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed) as ProjectTreeItem;
		item.contextValue = contextValue;
		item.agentRootId = rootId;
		item.agentSection = section;
		return item;
	}

	it('shows placeholder when no commands for root', async () => {
		const provider = new AgentsTreeProvider();
		const roots: AgentRootDefinition[] = [
			{
				id: 'cursor',
				label: 'Cursor',
				description: '/home/user/.cursor',
				icon: 'symbol-namespace',
				commands: [] as Command[],
				skills: [] as Skill[]
			}
		];

		provider.setAgentRoots(roots);
		const commandsSection = createSectionItem('cursor', 'commands', 'Commands', 'agent-commands');

		const children = await provider.getChildren(commandsSection);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'No commands found');
	});

	it('returns command items for agent root commands', async () => {
		const provider = new AgentsTreeProvider();
		const cmdUri = vscode.Uri.file('/home/user/.cursor/commands/test.md');
		const roots: AgentRootDefinition[] = [
			{
				id: 'cursor',
				label: 'Cursor',
				description: '/home/user/.cursor',
				icon: 'symbol-namespace',
				commands: [{
					uri: cmdUri,
					content: '# Test\n\nBody',
					fileName: 'test.md',
					location: 'global'
				} as Command],
				skills: [] as Skill[]
			}
		];

		provider.setAgentRoots(roots);
		const commandsSection = createSectionItem('cursor', 'commands', 'Commands', 'agent-commands');

		const children = await provider.getChildren(commandsSection);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'test.md');
		assert.strictEqual(children[0].contextValue, 'command');
		assert.ok(children[0].command);
	});
});

describe('AgentsTreeProvider skills section', () => {
	function createSkillsSection(rootId: string): ProjectTreeItem {
		const item = new vscode.TreeItem('Skills', vscode.TreeItemCollapsibleState.Collapsed) as ProjectTreeItem;
		item.contextValue = 'agent-skills';
		item.agentRootId = rootId;
		item.agentSection = 'skills';
		return item;
	}

	it('shows placeholder when no skills for root', async () => {
		const provider = new AgentsTreeProvider();
		const roots: AgentRootDefinition[] = [
			{
				id: 'cursor',
				label: 'Cursor',
				description: '/home/user/.cursor',
				icon: 'symbol-namespace',
				commands: [] as Command[],
				skills: [] as Skill[]
			}
		];

		provider.setAgentRoots(roots);
		const skillsSection = createSkillsSection('cursor');

		const children = await provider.getChildren(skillsSection);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'No skills found');
	});

	it('returns skill items for agent root skills', async () => {
		const provider = new AgentsTreeProvider();
		const skillUri = vscode.Uri.file('/home/user/.cursor/skills/foo/SKILL.md');
		const roots: AgentRootDefinition[] = [
			{
				id: 'cursor',
				label: 'Cursor',
				description: '/home/user/.cursor',
				icon: 'symbol-namespace',
				commands: [] as Command[],
				skills: [{
					uri: skillUri,
					content: '',
					fileName: 'SKILL.md',
					location: 'global',
					metadata: { title: 'Foo Skill', overview: 'Overview' }
				} as Skill]
			}
		];

		provider.setAgentRoots(roots);
		const skillsSection = createSkillsSection('cursor');

		const children = await provider.getChildren(skillsSection);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'Foo Skill');
		assert.strictEqual(children[0].contextValue, 'skill');
	});

	it('uses fileName as label when skill has no metadata title', async () => {
		const provider = new AgentsTreeProvider();
		const skillUri = vscode.Uri.file('/skills/named/SKILL.md');
		provider.setAgentRoots([{
			id: 'cursor',
			label: 'Cursor',
			description: '',
			commands: [],
			skills: [{
				uri: skillUri,
				content: 'body',
				fileName: 'named',
				location: 'workspace',
				metadata: { overview: 'O only' }
			} as Skill]
		}]);
		const children = await provider.getChildren(createSkillsSection('cursor'));
		assert.strictEqual(children[0].label, 'named');
		assert.strictEqual((children[0].tooltip as string), 'O only');
	});
});

