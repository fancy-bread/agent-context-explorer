// Unit tests for AgentsTreeProvider
import * as assert from 'assert';
import * as vscode from 'vscode';
import { AgentsTreeProvider, AgentRootDefinition } from '../../../src/providers/agentsTreeProvider';
import type { ProjectTreeItem } from '../../../src/providers/projectTreeProvider';
import type { Command } from '../../../src/scanner/commandsScanner';
import type { Skill } from '../../../src/scanner/skillsScanner';
import type { AgentDefinition } from '../../../src/scanner/agentsScanner';

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
				skills: [],
				agentDefinitions: [],
				mcpServers: []
			},
			{
				id: 'global',
				label: 'Global',
				description: '/home/user/.agents',
				icon: 'globe',
				commands: [],
				skills: [],
				agentDefinitions: [],
				mcpServers: []
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
			{ id: 'cursor', label: 'C', description: '', commands: [], skills: [], agentDefinitions: [], mcpServers: [] },
			{ id: 'global', label: 'G', description: '', commands: [], skills: [], agentDefinitions: [], mcpServers: [] }
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

	it('returns Agents, Commands, MCP, and Skills nodes (alphabetical) for a populated agent root', async () => {
		const provider = new AgentsTreeProvider();
		const roots: AgentRootDefinition[] = [
			{
				id: 'cursor',
				label: 'Cursor',
				description: '/home/user/.cursor',
				icon: 'symbol-namespace',
				commands: [] as Command[],
				skills: [] as Skill[],
				agentDefinitions: [] as AgentDefinition[],
				mcpServers: []
			}
		];

		provider.setAgentRoots(roots);
		const rootItem = createRootItem('cursor');

		const children = await provider.getChildren(rootItem);

		assert.strictEqual(children.length, 4);
		const labels = children.map(c => c.label).sort();
		assert.deepStrictEqual(labels, ['Agents', 'Commands', 'MCP', 'Skills']);
		const agentsNode = children.find(c => c.label === 'Agents')!;
		const commandsNode = children.find(c => c.label === 'Commands')!;
		const skillsNode = children.find(c => c.label === 'Skills')!;
		const mcpNode = children.find(c => c.label === 'MCP')!;
		assert.strictEqual(agentsNode.contextValue, 'agent-agents');
		assert.strictEqual(commandsNode.contextValue, 'agent-commands');
		assert.strictEqual(skillsNode.contextValue, 'agent-skills');
		assert.strictEqual(mcpNode.contextValue, 'agent-mcp');
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
			skills: [{ uri: skillUri, content: '', fileName: 'sk', location: 'workspace', metadata: {} } as Skill],
			agentDefinitions: [] as AgentDefinition[],
			mcpServers: []
		}]);
		const sections = await provider.getChildren(createRootItem('cursor'));
		const commandsNode = sections.find(c => c.label === 'Commands')!;
		const skillsNode = sections.find(c => c.label === 'Skills')!;
		assert.strictEqual(commandsNode.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
		assert.strictEqual(skillsNode.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
	});

	it('returns no children when agentRootId does not match any root', async () => {
		const provider = new AgentsTreeProvider();
		provider.setAgentRoots([{ id: 'cursor', label: 'C', description: '', commands: [], skills: [], agentDefinitions: [], mcpServers: [] }]);
		const stale = createRootItem('missing-id');
		assert.deepStrictEqual(await provider.getChildren(stale), []);
	});
});

describe('AgentsTreeProvider commands section', () => {
	function createSectionItem(rootId: string, section: 'commands' | 'skills' | 'agents', label: string, contextValue: string): ProjectTreeItem {
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
				skills: [] as Skill[],
				agentDefinitions: [] as AgentDefinition[],
				mcpServers: []
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
				skills: [] as Skill[],
				agentDefinitions: [] as AgentDefinition[],
				mcpServers: []
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
				skills: [] as Skill[],
				agentDefinitions: [] as AgentDefinition[],
				mcpServers: []
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
				} as Skill],
				agentDefinitions: [] as AgentDefinition[],
				mcpServers: []
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
			} as Skill],
			agentDefinitions: [],
			mcpServers: []
		}]);
		const children = await provider.getChildren(createSkillsSection('cursor'));
		assert.strictEqual(children[0].label, 'named');
		assert.strictEqual((children[0].tooltip as string), 'O only');
	});
});

describe('AgentsTreeProvider agents section (agent root)', () => {
	function createAgentsSection(rootId: string): ProjectTreeItem {
		const item = new vscode.TreeItem('Agents', vscode.TreeItemCollapsibleState.Collapsed) as ProjectTreeItem;
		item.contextValue = 'agent-agents';
		item.agentRootId = rootId;
		item.agentSection = 'agents';
		return item;
	}

	it('shows placeholder when no agent definitions for root', async () => {
		const provider = new AgentsTreeProvider();
		const roots: AgentRootDefinition[] = [
			{
				id: 'cursor',
				label: 'Cursor',
				description: '/home/user/.cursor',
				icon: 'symbol-namespace',
				commands: [] as Command[],
				skills: [] as Skill[],
				agentDefinitions: [] as AgentDefinition[],
				mcpServers: []
			}
		];

		provider.setAgentRoots(roots);
		const agentsSection = createAgentsSection('cursor');

		const children = await provider.getChildren(agentsSection);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'No agents found');
	});

	it('returns agent definition leaves with hubot and vscode.open', async () => {
		const provider = new AgentsTreeProvider();
		const adUri = vscode.Uri.file('/home/user/.cursor/agents/home.md');
		const ad: AgentDefinition = {
			uri: adUri,
			content: '# Home\n',
			fileName: 'home',
			displayName: 'home'
		};
		const roots: AgentRootDefinition[] = [
			{
				id: 'cursor',
				label: 'Cursor',
				description: '/home/user/.cursor',
				icon: 'symbol-namespace',
				commands: [] as Command[],
				skills: [] as Skill[],
				agentDefinitions: [ad],
				mcpServers: []
			}
		];

		provider.setAgentRoots(roots);
		const children = await provider.getChildren(createAgentsSection('cursor'));

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'home');
		assert.strictEqual(children[0].contextValue, 'agent-definition');
		assert.strictEqual((children[0].iconPath as vscode.ThemeIcon).id, 'hubot');
		assert.strictEqual(children[0].command?.command, 'vscode.open');
	});
});

describe('AgentsTreeProvider MCP section', () => {
	function createMcpSection(rootId: string): ProjectTreeItem {
		const item = new vscode.TreeItem('MCP', vscode.TreeItemCollapsibleState.Collapsed) as ProjectTreeItem;
		item.contextValue = 'agent-mcp';
		item.agentRootId = rootId;
		item.agentSection = 'mcp';
		return item;
	}

	function makeRoot(id: string, mcpServers: string[]): AgentRootDefinition {
		return {
			id,
			label: id === 'claude' ? 'Claude' : 'Cursor',
			description: '',
			commands: [],
			skills: [],
			agentDefinitions: [],
			mcpServers
		};
	}

	it('sections list includes MCP node alongside Agents, Commands, Skills in alphabetical order', async () => {
		const provider = new AgentsTreeProvider();
		provider.setAgentRoots([makeRoot('claude', [])]);

		const rootItem = new vscode.TreeItem('Claude', vscode.TreeItemCollapsibleState.Collapsed) as ProjectTreeItem;
		rootItem.contextValue = 'agent-root';
		rootItem.agentRootId = 'claude';

		const sections = await provider.getChildren(rootItem);
		assert.strictEqual(sections.length, 4);
		const labels = sections.map(s => s.label as string);
		assert.deepStrictEqual(labels, ['Agents', 'Commands', 'MCP', 'Skills']);
	});

	it('MCP section node has contextValue agent-mcp and plug icon', async () => {
		const provider = new AgentsTreeProvider();
		provider.setAgentRoots([makeRoot('claude', ['ace'])]);

		const rootItem = new vscode.TreeItem('Claude', vscode.TreeItemCollapsibleState.Collapsed) as ProjectTreeItem;
		rootItem.contextValue = 'agent-root';
		rootItem.agentRootId = 'claude';

		const sections = await provider.getChildren(rootItem);
		const mcpSection = sections.find(s => s.label === 'MCP')!;
		assert.strictEqual(mcpSection.contextValue, 'agent-mcp');
		assert.strictEqual((mcpSection.iconPath as vscode.ThemeIcon).id, 'plug');
	});

	it('MCP section is Collapsed when servers are present, None when empty', async () => {
		const provider = new AgentsTreeProvider();
		provider.setAgentRoots([makeRoot('claude', ['ace', 'other'])]);

		const rootItem = new vscode.TreeItem('Claude', vscode.TreeItemCollapsibleState.Collapsed) as ProjectTreeItem;
		rootItem.contextValue = 'agent-root';
		rootItem.agentRootId = 'claude';

		const sections = await provider.getChildren(rootItem);
		const mcpSection = sections.find(s => s.label === 'MCP')!;
		assert.strictEqual(mcpSection.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);

		// Empty case
		provider.setAgentRoots([makeRoot('claude', [])]);
		const sections2 = await provider.getChildren(rootItem);
		const mcpSection2 = sections2.find(s => s.label === 'MCP')!;
		assert.strictEqual(mcpSection2.collapsibleState, vscode.TreeItemCollapsibleState.None);
	});

	it('MCP section children list server names as mcp-server nodes', async () => {
		const provider = new AgentsTreeProvider();
		provider.setAgentRoots([makeRoot('claude', ['ace', 'my-other-server'])]);

		const mcpSection = createMcpSection('claude');
		const children = await provider.getChildren(mcpSection);

		assert.strictEqual(children.length, 2);
		const names = children.map(c => c.label as string).sort();
		assert.deepStrictEqual(names, ['ace', 'my-other-server']);
		assert.ok(children.every(c => c.contextValue === 'mcp-server'));
	});

	it('MCP section children show placeholder when empty', async () => {
		const provider = new AgentsTreeProvider();
		provider.setAgentRoots([makeRoot('claude', [])]);

		const mcpSection = createMcpSection('claude');
		const children = await provider.getChildren(mcpSection);

		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].label, 'No MCP servers registered');
	});

	it('MCP section returns empty array when agentRootId does not match', async () => {
		const provider = new AgentsTreeProvider();
		provider.setAgentRoots([makeRoot('claude', ['ace'])]);

		const mcpSection = createMcpSection('nonexistent');
		const children = await provider.getChildren(mcpSection);
		assert.deepStrictEqual(children, []);
	});

	it('MCP section description shows server count', async () => {
		const provider = new AgentsTreeProvider();
		provider.setAgentRoots([makeRoot('cursor', ['server-a', 'server-b'])]);

		const rootItem = new vscode.TreeItem('Cursor', vscode.TreeItemCollapsibleState.Collapsed) as ProjectTreeItem;
		rootItem.contextValue = 'agent-root';
		rootItem.agentRootId = 'cursor';

		const sections = await provider.getChildren(rootItem);
		const mcpSection = sections.find(s => s.label === 'MCP')!;
		assert.strictEqual(mcpSection.description, '2 servers');
	});
});

