// Tree Provider for Rules and State visualization
import * as vscode from 'vscode';
import { Rule } from '../scanner/rulesScanner';
import { ProjectState } from '../scanner/types';
import { Command } from '../scanner/commandsScanner';
import { Skill } from '../scanner/skillsScanner';
import type { AgentDefinition } from '../scanner/agentsScanner';
import { ProjectDefinition } from '../types/project';
import { AsdlcArtifacts } from '../scanner/types';
import type { ClaudeMdFile, ClaudeCodeArtifacts } from '../scanner/claudeCodeScanner';

export interface ProjectTreeItem extends vscode.TreeItem {
	rule?: Rule;
	commandData?: Command; // Command data (avoiding conflict with TreeItem's command property)
	skillData?: Skill; // Skill data
	agentDefinitionData?: AgentDefinition;
	claudeMdData?: ClaudeMdFile;
	claudeRuleData?: Rule;
	claudeCommandData?: Command;
	claudeSkillData?: Skill;
	stateItem?: any;
	ruleType?: any;
	category?: 'rules' | 'state' | 'projects' | 'ruleType' | 'commands'
		| 'cursor' | 'agents' | 'skills'
		| 'specs'
		| 'agent-definitions' | 'agent-definition'
		| 'claude-code' | 'claude-md' | 'claude-rule' | 'claude-command' | 'claude-skill'
		| 'claude-rules' | 'claude-commands' | 'claude-skills';
	directory?: string;
	project?: ProjectDefinition;
	agentRootId?: string;
	agentSection?: 'commands' | 'skills' | 'agents';
}

export class ProjectTreeProvider implements vscode.TreeDataProvider<ProjectTreeItem> {
	private _onDidChangeTreeData = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	private isDataLoaded = false;
	private isLoading = false;
	private onDemandLoad?: () => Promise<void>;

	constructor(
		private projectData: Map<string, {
			rules: Rule[],
			state: ProjectState,
			commands: Command[],
			globalCommands: Command[],
			skills: Skill[],
			globalSkills: Skill[],
			agentDefinitions: AgentDefinition[],
			asdlcArtifacts: AsdlcArtifacts,
			claudeCodeArtifacts?: ClaudeCodeArtifacts
		}> = new Map(),
		private projects: ProjectDefinition[] = [],
		private currentProject: ProjectDefinition | null = null,
		onDemandLoad?: () => Promise<void>
	) {
		this.onDemandLoad = onDemandLoad;
	}

	setDataLoaded(value: boolean): void {
		this.isDataLoaded = value;
	}

	setLoading(value: boolean): void {
		this.isLoading = value;
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	dispose(): void {
		this._onDidChangeTreeData.dispose();
	}

	updateData(
		projectData: Map<string, {
			rules: Rule[],
			state: ProjectState,
			commands: Command[],
			globalCommands: Command[],
			skills: Skill[],
			globalSkills: Skill[],
			agentDefinitions: AgentDefinition[],
			asdlcArtifacts: AsdlcArtifacts,
			claudeCodeArtifacts?: ClaudeCodeArtifacts
		}>,
		projects: ProjectDefinition[],
		currentProject: ProjectDefinition | null
	): void {
		this.projectData = projectData;
		this.projects = projects;
		this.currentProject = currentProject;
	}

	getTreeItem(element: ProjectTreeItem): ProjectTreeItem {
		return element;
	}

	async getChildren(element?: ProjectTreeItem): Promise<ProjectTreeItem[]> {
		try {
			if (!element) {
				// Root level: lazy load on first request
				if (!this.isDataLoaded) {
					if (this.onDemandLoad && !this.isLoading) {
						this.isLoading = true;
						this.onDemandLoad().catch(() => {
							this.isLoading = false;
							this._onDidChangeTreeData.fire();
						});
					}
					return [{
						label: 'Loading...',
						collapsibleState: vscode.TreeItemCollapsibleState.None,
						iconPath: new vscode.ThemeIcon('loading~spin')
					} as ProjectTreeItem];
				}

				// Root level: show all projects
				if (this.projects.length === 0) {
					return [{
						label: 'No projects defined',
						collapsibleState: vscode.TreeItemCollapsibleState.None,
						description: 'Add a project to get started',
						command: {
							command: 'ace.addProject',
							title: 'Add Project'
						}
					} as ProjectTreeItem];
				}

				return this.projects.map((project) => {
					const item = new vscode.TreeItem(
						project.name,
						project.active ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed
					) as ProjectTreeItem;
					item.project = project;
					item.category = 'projects';
					item.description = project.path;
					item.tooltip = `${project.name}\n${project.path}\n${project.description || 'No description'}${project.active ? '\n\n(Active workspace)' : ''}`;
					item.iconPath = new vscode.ThemeIcon('root-folder');

					// Add context menu for projects
					item.contextValue = project.active ? 'activeProject' : 'inactiveProject';

					return item;
				});
		} else if (element.category === 'projects' && element.project) {
			// Project level: show Cursor and Specs (living specs under specs/ only)
			const project = element.project;
			const currentProjectData = this.projectData.get(project.id);

			const sections: { name: string; id: string; icon: string; description: string }[] = [
				{ name: 'Cursor', id: 'cursor', icon: 'device-desktop', description: 'Cursor IDE artifacts' },
				{ name: 'Specs', id: 'agents', icon: 'library', description: 'specs/' }
			];

			const claudeCodeArtifacts = currentProjectData?.claudeCodeArtifacts;
			if (claudeCodeArtifacts?.hasAnyArtifacts) {
				sections.push({ name: 'Claude', id: 'claude-code', icon: 'device-desktop', description: 'Claude Code artifacts' });
			}

			sections.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

			const items = sections.map((section) => {
				const item = new vscode.TreeItem(section.name, vscode.TreeItemCollapsibleState.Expanded) as ProjectTreeItem;
				item.category = section.id as 'cursor' | 'agents' | 'claude-code';
				item.project = project;
				item.description = section.description;
				item.iconPath = new vscode.ThemeIcon(section.icon);
				return item;
			});

			return items;
		} else if (element.category === 'cursor' && element.project) {
			// Cursor section: workspace Commands, Rules, Skills, Agents — sorted alphabetically by label
			const projectData = this.projectData.get(element.project.id);
			const rulesCount = projectData?.rules.length || 0;
			const commandsCount = projectData?.commands.length || 0;
			const skillsCount = projectData?.skills.length || 0;
			const agentCount = projectData?.agentDefinitions.length || 0;

			const sections = [
				{ name: 'Agents', id: 'agent-definitions', icon: 'hubot', description: `${agentCount} agents` },
				{ name: 'Commands', id: 'commands', icon: 'terminal', description: `${commandsCount} commands` },
				{ name: 'Rules', id: 'rules', icon: 'book', description: `${rulesCount} rules` },
				{ name: 'Skills', id: 'skills', icon: 'lightbulb', description: `${skillsCount} skills` }
			];
			sections.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

			return sections.map((section) => {
				const item = new vscode.TreeItem(section.name, vscode.TreeItemCollapsibleState.Collapsed) as ProjectTreeItem;
				item.category = section.id as 'commands' | 'rules' | 'skills' | 'agent-definitions';
				item.project = element.project;
				item.description = section.description;
				item.iconPath = new vscode.ThemeIcon(section.icon);
				return item;
			});
		} else if (element.category === 'agents' && element.project) {
			// Specs section: flat list of spec domains (specs/*/spec.md) — no nested folders, no schemas in tree
			const projectData = this.projectData.get(element.project.id);
			const asdlcArtifacts = projectData?.asdlcArtifacts;
			const specs = asdlcArtifacts?.specs.specs || [];

			if (!asdlcArtifacts?.specs.exists || specs.length === 0) {
				return [{
					label: 'No specs found',
					collapsibleState: vscode.TreeItemCollapsibleState.None,
					description: 'Add a specs/ directory with feature folders'
				} as ProjectTreeItem];
			}

			return specs.map(spec => {
				const item = new vscode.TreeItem(
					spec.domain,
					vscode.TreeItemCollapsibleState.None
				) as ProjectTreeItem;
				item.category = 'specs';
				item.project = element.project;
				item.tooltip = `${spec.domain}/spec.md`;
				item.description = spec.hasBlueprint && spec.hasContract ? 'Blueprint + Contract' :
					spec.hasBlueprint ? 'Blueprint only' :
						spec.hasContract ? 'Contract only' : '';
				item.iconPath = new vscode.ThemeIcon('file-code');
				item.command = {
					command: 'vscode.open',
					title: 'Open Spec',
					arguments: [vscode.Uri.file(spec.path)]
				};
				return item;
			});
		} else if (element.category === 'commands' && element.project) {
			// Commands section for specific project - single workspace-only list
			const projectData = this.projectData.get(element.project.id);
			const commands = projectData?.commands || [];

			if (commands.length === 0) {
				return [{
					label: 'No commands found',
					collapsibleState: vscode.TreeItemCollapsibleState.None,
					description: 'Add commands to .cursor/commands directory'
				} as ProjectTreeItem];
			}

			return commands.map((cmd: Command) => {
				const item = new vscode.TreeItem(
					cmd.fileName,
					vscode.TreeItemCollapsibleState.None
				) as ProjectTreeItem;
				item.commandData = cmd;
				item.category = 'commands';
				item.project = element.project;
				item.tooltip = this.getCommandPreview(cmd.content);
				item.contextValue = 'command';
				item.iconPath = new vscode.ThemeIcon('terminal');

				item.command = {
					command: 'vscode.open',
					title: 'Open Command',
					arguments: [cmd.uri]
				};
				return item;
			});
		} else if (element.category === 'skills' && element.project) {
			// Skills section: single workspace-only list
			const projectData = this.projectData.get(element.project.id);
			const skills = projectData?.skills || [];

			if (skills.length === 0) {
				return [{
					label: 'No skills found',
					collapsibleState: vscode.TreeItemCollapsibleState.None,
					description: 'Add skills to .cursor/skills directory'
				} as ProjectTreeItem];
			}

			return skills.map((skill: Skill) => {
				const item = new vscode.TreeItem(
					skill.metadata?.title || skill.fileName,
					vscode.TreeItemCollapsibleState.None
				) as ProjectTreeItem;
				item.skillData = skill;
				item.category = 'skills';
				item.project = element.project;
				item.tooltip = skill.metadata?.overview || skill.fileName;
				item.contextValue = 'skill';
				item.iconPath = new vscode.ThemeIcon('play-circle');

				item.command = {
					command: 'vscode.open',
					title: 'Open Skill',
					arguments: [skill.uri]
				};
				return item;
			});
		} else if (element.category === 'agent-definitions' && element.project) {
			const projectData = this.projectData.get(element.project.id);
			const defs = projectData?.agentDefinitions || [];

			if (defs.length === 0) {
				return [{
					label: 'No agents found',
					collapsibleState: vscode.TreeItemCollapsibleState.None,
					description: 'Add Markdown files to .cursor/agents/'
				} as ProjectTreeItem];
			}

			return defs.map((ad: AgentDefinition) => {
				const item = new vscode.TreeItem(
					ad.displayName,
					vscode.TreeItemCollapsibleState.None
				) as ProjectTreeItem;
				item.agentDefinitionData = ad;
				item.category = 'agent-definition';
				item.project = element.project;
				item.tooltip = `${ad.uri.fsPath}\n\n${this.getCommandPreview(ad.content)}`;
				item.contextValue = 'agent-definition';
				item.iconPath = new vscode.ThemeIcon('hubot');
				item.command = {
					command: 'vscode.open',
					title: 'Open Agent Definition',
					arguments: [ad.uri]
				};
				return item;
			});
		} else if (element.category === 'rules' && element.project) {
			// Rules section for specific project
			const projectData = this.projectData.get(element.project.id);
			const rules = projectData?.rules || [];

			if (rules.length === 0) {
				return [{
					label: 'No rules found',
					collapsibleState: vscode.TreeItemCollapsibleState.None,
					description: 'Add rules to .cursor/rules directory'
				} as ProjectTreeItem];
			}

			// Show all rules in a flat list
			return rules.map((rule: Rule) => {
				const item = new vscode.TreeItem(
					rule.fileName,
					vscode.TreeItemCollapsibleState.None
				) as ProjectTreeItem;
				item.rule = rule;
				item.category = 'rules';
				item.project = element.project;
				item.tooltip = rule.metadata.description;
				item.contextValue = 'rule'; // Enable context menu for individual rules

				// Consistent bookmark icon for all rules
				item.iconPath = new vscode.ThemeIcon('bookmark');

				// Open in editor instead of webview
				item.command = {
					command: 'vscode.open',
					title: 'Open Rule',
					arguments: [rule.uri]
				};
				return item;
			});
		} else if (element.category === 'claude-code' && element.project) {
			// Claude Code section: CLAUDE.md item + Rules/Commands/Skills group nodes
			const projectData = this.projectData.get(element.project.id);
			const artifacts = projectData?.claudeCodeArtifacts;
			const items: ProjectTreeItem[] = [];

			if (artifacts?.claudeMd) {
				const item = new vscode.TreeItem('CLAUDE.md', vscode.TreeItemCollapsibleState.None) as ProjectTreeItem;
				item.claudeMdData = artifacts.claudeMd;
				item.category = 'claude-md';
				item.project = element.project;
				item.iconPath = new vscode.ThemeIcon('file-text');
				item.contextValue = 'claude-md';
				item.command = { command: 'vscode.open', title: 'Open CLAUDE.md', arguments: [artifacts.claudeMd.uri] };
				items.push(item);
			}

			const rulesCount = artifacts?.rules.length || 0;
			if (rulesCount > 0) {
				const item = new vscode.TreeItem('Rules', vscode.TreeItemCollapsibleState.Collapsed) as ProjectTreeItem;
				item.description = `${rulesCount} ${rulesCount === 1 ? 'rule' : 'rules'}`;
				item.category = 'claude-rules';
				item.project = element.project;
				item.iconPath = new vscode.ThemeIcon('bookmark');
				items.push(item);
			}

			const commandsCount = artifacts?.commands.length || 0;
			if (commandsCount > 0) {
				const item = new vscode.TreeItem('Commands', vscode.TreeItemCollapsibleState.Collapsed) as ProjectTreeItem;
				item.description = `${commandsCount} ${commandsCount === 1 ? 'command' : 'commands'}`;
				item.category = 'claude-commands';
				item.project = element.project;
				item.iconPath = new vscode.ThemeIcon('terminal');
				items.push(item);
			}

			const skillsCount = artifacts?.skills.length || 0;
			if (skillsCount > 0) {
				const item = new vscode.TreeItem('Skills', vscode.TreeItemCollapsibleState.Collapsed) as ProjectTreeItem;
				item.description = `${skillsCount} ${skillsCount === 1 ? 'skill' : 'skills'}`;
				item.category = 'claude-skills';
				item.project = element.project;
				item.iconPath = new vscode.ThemeIcon('play-circle');
				items.push(item);
			}

			return items;
		} else if (element.category === 'claude-rules' && element.project) {
			const projectData = this.projectData.get(element.project.id);
			const rules = projectData?.claudeCodeArtifacts?.rules || [];

			return rules.map((rule: Rule) => {
				const item = new vscode.TreeItem(rule.fileName, vscode.TreeItemCollapsibleState.None) as ProjectTreeItem;
				item.claudeRuleData = rule;
				item.category = 'claude-rule';
				item.project = element.project;
				item.tooltip = rule.metadata.description;
				item.contextValue = 'claude-rule';
				item.iconPath = new vscode.ThemeIcon('bookmark');
				item.command = { command: 'vscode.open', title: 'Open Rule', arguments: [rule.uri] };
				return item;
			});
		} else if (element.category === 'claude-commands' && element.project) {
			const projectData = this.projectData.get(element.project.id);
			const commands = projectData?.claudeCodeArtifacts?.commands || [];

			return commands.map((cmd: Command) => {
				const label = cmd.fileName.endsWith('.md') ? cmd.fileName.slice(0, -3) : cmd.fileName;
				const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None) as ProjectTreeItem;
				item.claudeCommandData = cmd;
				item.category = 'claude-command';
				item.project = element.project;
				item.contextValue = 'claude-command';
				item.iconPath = new vscode.ThemeIcon('terminal');
				item.command = { command: 'vscode.open', title: 'Open Command', arguments: [cmd.uri] };
				return item;
			});
		} else if (element.category === 'claude-skills' && element.project) {
			const projectData = this.projectData.get(element.project.id);
			const skills = projectData?.claudeCodeArtifacts?.skills || [];

			return skills.map((skill: Skill) => {
				const item = new vscode.TreeItem(
					skill.metadata?.title ?? skill.fileName,
					vscode.TreeItemCollapsibleState.None
				) as ProjectTreeItem;
				item.claudeSkillData = skill;
				item.category = 'claude-skill';
				item.project = element.project;
				item.tooltip = skill.metadata?.overview;
				item.contextValue = 'claude-skill';
				item.iconPath = new vscode.ThemeIcon('play-circle');
				item.command = { command: 'vscode.open', title: 'Open Skill', arguments: [skill.uri] };
				return item;
			});
		}

		return [];
		} catch (error) {
			const errorItem = new vscode.TreeItem(
				`Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
				vscode.TreeItemCollapsibleState.None
			) as ProjectTreeItem;
			errorItem.tooltip = error instanceof Error ? error.stack : String(error);
			return [errorItem];
		}
	}

	/**
	 * Generate preview text for command tooltip
	 * Extracts first heading or first non-empty line from command content
	 */
	private getCommandPreview(content: string): string {
		// Try to find first heading
		const headingMatch = content.match(/^#+\s+(.+)$/m);
		if (headingMatch) {
			return headingMatch[1].trim();
		}

		// Get first non-empty line
		const lines = content.split('\n').filter(line => line.trim().length > 0);
		if (lines.length > 0) {
			// Remove markdown formatting
			return lines[0].replace(/^#+\s+/, '').replace(/\*\*/g, '').trim();
		}

		// Fallback to first 100 chars
		return content.substring(0, 100).trim();
	}

}