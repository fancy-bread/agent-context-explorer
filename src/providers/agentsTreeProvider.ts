import * as vscode from 'vscode';
import type { ProjectTreeItem } from './projectTreeProvider';

export interface AgentRootDefinition {
	id: string;
	label: string;
	description?: string;
	icon?: string;
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
				item.iconPath = new vscode.ThemeIcon(root.icon ?? 'organization');
				return item;
			});
		}

		// Children per root will be implemented in the Agents view content PBI
		return [];
	}
}

