import * as vscode from 'vscode';
import type { ProjectTreeItem } from './projectTreeProvider';
import type { Command } from '../scanner/commandsScanner';
import type { Skill } from '../scanner/skillsScanner';

export interface AgentRootDefinition {
	id: string;
	label: string;
	description?: string;
	icon?: string;
	commands: Command[];
	skills: Skill[];
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

			return this.agentRoots.map((root) => {
				const item = new vscode.TreeItem(
					root.label,
					vscode.TreeItemCollapsibleState.Collapsed
				) as ProjectTreeItem;
				item.description = root.description;
				// Match Cursor section icon from Workspace view
				item.iconPath = new vscode.ThemeIcon('device-desktop');
				item.contextValue = 'agent-root';
				item.agentRootId = root.id;
				return item;
			});
		}

		// Section level under a specific agent root
		if (element.contextValue === 'agent-root' && element.agentRootId) {
			const root = this.agentRoots.find(r => r.id === element.agentRootId);
			if (!root) {
				return [];
			}

			const commandsNode = new vscode.TreeItem(
				'Commands',
				root.commands.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
			) as ProjectTreeItem;
			commandsNode.contextValue = 'agent-commands';
			commandsNode.agentRootId = root.id;
			commandsNode.agentSection = 'commands';
			commandsNode.iconPath = new vscode.ThemeIcon('terminal');

			const skillsNode = new vscode.TreeItem(
				'Skills',
				root.skills.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
			) as ProjectTreeItem;
			skillsNode.contextValue = 'agent-skills';
			skillsNode.agentRootId = root.id;
			skillsNode.agentSection = 'skills';
			// Match Skills folder icon from Workspace view
			skillsNode.iconPath = new vscode.ThemeIcon('lightbulb');

			return [commandsNode, skillsNode];
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
}

