import * as vscode from 'vscode';
import type { ProjectTreeItem } from './projectTreeProvider';
import type { Command } from '../scanner/commandsScanner';
import type { Skill } from '../scanner/skillsScanner';
import type { AgentDefinition } from '../scanner/agentsScanner';

export interface AgentRootDefinition {
	id: string;
	label: string;
	description?: string;
	icon?: string;
	commands: Command[];
	skills: Skill[];
	/** Flat `agents/*.md` under this agent root (see `scanAgentDefinitionsForAgentRoot`). */
	agentDefinitions: AgentDefinition[];
}

export class AgentsTreeProvider implements vscode.TreeDataProvider<ProjectTreeItem> {
	private readonly _onDidChangeTreeData = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	private agentRoots: AgentRootDefinition[] = [];

	setAgentRoots(roots: AgentRootDefinition[]): void {
		this.agentRoots = roots;
		this._onDidChangeTreeData.fire();
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	dispose(): void {
		this._onDidChangeTreeData.dispose();
	}

	getTreeItem(element: ProjectTreeItem): ProjectTreeItem {
		return element;
	}

	async getChildren(element?: ProjectTreeItem): Promise<ProjectTreeItem[]> {
		// Root level: show agent roots
		if (!element) {
			if (this.agentRoots.length === 0) {
				return [
					{
						label: 'No agent roots configured',
						collapsibleState: vscode.TreeItemCollapsibleState.None,
						description: 'Agents view placeholder',
						iconPath: new vscode.ThemeIcon('info')
					} as ProjectTreeItem
				];
			}

			return [...this.agentRoots].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })).map((root) => {
				const item = new vscode.TreeItem(
					root.label,
					vscode.TreeItemCollapsibleState.Collapsed
				) as ProjectTreeItem;
				item.description = root.description;
				// Use Cursor icon for agent-specific roots, globe for Global (~/.agents)
				const iconId = root.id === 'global' ? 'globe' : 'device-desktop';
				item.iconPath = new vscode.ThemeIcon(iconId);
				item.contextValue = 'agent-root';
				item.agentRootId = root.id;
				return item;
			});
		}

		// Section level under a specific agent root — Agents, Commands, Skills (alphabetical)
		if (element.contextValue === 'agent-root' && element.agentRootId) {
			const root = this.agentRoots.find(r => r.id === element.agentRootId);
			if (!root) {
				return [];
			}

			const defs = root.agentDefinitions ?? [];
			const agentsNode = new vscode.TreeItem(
				'Agents',
				defs.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
			) as ProjectTreeItem;
			agentsNode.contextValue = 'agent-agents';
			agentsNode.agentRootId = root.id;
			agentsNode.agentSection = 'agents';
			agentsNode.iconPath = new vscode.ThemeIcon('hubot');
			agentsNode.description = `${defs.length} agents`;

			const commandsNode = new vscode.TreeItem(
				'Commands',
				root.commands.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
			) as ProjectTreeItem;
			commandsNode.contextValue = 'agent-commands';
			commandsNode.agentRootId = root.id;
			commandsNode.agentSection = 'commands';
			commandsNode.iconPath = new vscode.ThemeIcon('terminal');
			commandsNode.description = `${root.commands.length} commands`;

			const skillsNode = new vscode.TreeItem(
				'Skills',
				root.skills.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
			) as ProjectTreeItem;
			skillsNode.contextValue = 'agent-skills';
			skillsNode.agentRootId = root.id;
			skillsNode.agentSection = 'skills';
			skillsNode.iconPath = new vscode.ThemeIcon('lightbulb');
			skillsNode.description = `${root.skills.length} skills`;

			const sections = [agentsNode, commandsNode, skillsNode];
			sections.sort((a, b) =>
				String(a.label).localeCompare(String(b.label), undefined, { sensitivity: 'base' })
			);
			return sections;
		}

		// Agent definition files under an agent root (`<root>/agents/*.md`)
		if (element.contextValue === 'agent-agents' && element.agentRootId) {
			const root = this.agentRoots.find(r => r.id === element.agentRootId);
			if (!root) {
				return [];
			}

			const agentDefs = root.agentDefinitions ?? [];
			if (agentDefs.length === 0) {
				return [{
					label: 'No agents found',
					collapsibleState: vscode.TreeItemCollapsibleState.None,
					description: 'Add Markdown files to agents/ under this root'
				} as ProjectTreeItem];
			}

			return agentDefs.map((ad) => {
				const item = new vscode.TreeItem(
					ad.displayName,
					vscode.TreeItemCollapsibleState.None
				) as ProjectTreeItem;
				item.agentDefinitionData = ad;
				item.contextValue = 'agent-definition';
				item.agentRootId = root.id;
				item.iconPath = new vscode.ThemeIcon('hubot');
				item.tooltip = `${ad.uri.fsPath}\n\n${this.getContentPreview(ad.content)}`;
				item.command = {
					command: 'vscode.open',
					title: 'Open Agent Definition',
					arguments: [ad.uri]
				};
				return item;
			});
		}

		// Commands under an agent root
		if (element.contextValue === 'agent-commands' && element.agentRootId) {
			const root = this.agentRoots.find(r => r.id === element.agentRootId);
			if (!root) {
				return [];
			}

			if (root.commands.length === 0) {
				return [{
					label: 'No commands found',
					collapsibleState: vscode.TreeItemCollapsibleState.None,
					description: 'Add commands to commands/ directory for this agent root'
				} as ProjectTreeItem];
			}

			return root.commands.map(cmd => {
				const item = new vscode.TreeItem(
					cmd.fileName,
					vscode.TreeItemCollapsibleState.None
				) as ProjectTreeItem;
				item.commandData = cmd;
				item.contextValue = 'command';
				item.iconPath = new vscode.ThemeIcon('terminal');
				item.tooltip = cmd.content.substring(0, 100).trim();
				item.command = {
					command: 'vscode.open',
					title: 'Open Command',
					arguments: [cmd.uri]
				};
				return item;
			});
		}

		// Skills under an agent root
		if (element.contextValue === 'agent-skills' && element.agentRootId) {
			const root = this.agentRoots.find(r => r.id === element.agentRootId);
			if (!root) {
				return [];
			}

			if (root.skills.length === 0) {
				return [{
					label: 'No skills found',
					collapsibleState: vscode.TreeItemCollapsibleState.None,
					description: 'Add skills to skills/ directory for this agent root'
				} as ProjectTreeItem];
			}

			return root.skills.map(skill => {
				const label = skill.metadata?.title ?? skill.fileName;
				const item = new vscode.TreeItem(
					label,
					vscode.TreeItemCollapsibleState.None
				) as ProjectTreeItem;
				item.skillData = skill;
				item.contextValue = 'skill';
				// Use play icon for individual skills, consistent with Workspace view
				item.iconPath = new vscode.ThemeIcon('play-circle');
				item.tooltip = skill.metadata?.overview ?? '';
				item.command = {
					command: 'vscode.open',
					title: 'Open Skill',
					arguments: [skill.uri]
				};
				return item;
			});
		}

		return [];
	}

	/** Preview for tooltips (heading or first line), aligned with ProjectTreeProvider */
	private getContentPreview(content: string): string {
		const headingMatch = content.match(/^#+\s+(.+)$/m);
		if (headingMatch) {
			return headingMatch[1].trim();
		}
		const lines = content.split('\n').filter((line) => line.trim().length > 0);
		if (lines.length > 0) {
			return lines[0].replace(/^#+\s+/, '').replace(/\*\*/g, '').trim();
		}
		return content.substring(0, 100).trim();
	}
}

