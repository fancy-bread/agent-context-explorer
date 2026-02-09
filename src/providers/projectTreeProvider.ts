// Tree Provider for Rules and State visualization
import * as vscode from 'vscode';
import { Rule } from '../scanner/rulesScanner';
import { ProjectState } from '../scanner/stateScanner';
import { Command } from '../scanner/commandsScanner';
import { Skill } from '../scanner/skillsScanner';
import { ProjectDefinition } from '../types/project';
import { AsdlcArtifacts } from '../scanner/types';

export interface ProjectTreeItem extends vscode.TreeItem {
	rule?: Rule;
	commandData?: Command; // Command data (avoiding conflict with TreeItem's command property)
	skillData?: Skill; // Skill data
	stateItem?: any;
	ruleType?: any;
	category?: 'rules' | 'state' | 'projects' | 'ruleType' | 'commands' | 'commands-workspace' | 'commands-global'
		| 'cursor' | 'agents' | 'skills' | 'skills-workspace' | 'skills-global'
		| 'agents-md' | 'specs' | 'schemas';
	commandLocation?: 'workspace' | 'global'; // For sub-section grouping
	skillLocation?: 'workspace' | 'global'; // For skills sub-section grouping
	directory?: string;
	project?: ProjectDefinition;
}

export class ProjectTreeProvider implements vscode.TreeDataProvider<ProjectTreeItem> {
	private _onDidChangeTreeData = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	constructor(
		private projectData: Map<string, {
			rules: Rule[],
			state: ProjectState,
			commands: Command[],
			globalCommands: Command[],
			skills: Skill[],
			globalSkills: Skill[],
			asdlcArtifacts: AsdlcArtifacts
		}> = new Map(),
		private projects: ProjectDefinition[] = [],
		private currentProject: ProjectDefinition | null = null
	) {}

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
			asdlcArtifacts: AsdlcArtifacts
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
			// Project level: show Cursor and Agents sections
			const project = element.project;
			const currentProjectData = this.projectData.get(project.id);

			// Count artifacts
			const rulesCount = currentProjectData?.rules.length || 0;
			const workspaceCommandsCount = currentProjectData?.commands.length || 0;
			const globalCommandsCount = currentProjectData?.globalCommands.length || 0;
			const commandsCount = workspaceCommandsCount + globalCommandsCount;
			const workspaceSkillsCount = currentProjectData?.skills.length || 0;
			const globalSkillsCount = currentProjectData?.globalSkills.length || 0;
			const skillsCount = workspaceSkillsCount + globalSkillsCount;

			const sections = [
				{ name: 'Cursor', id: 'cursor', icon: 'device-desktop', description: 'Cursor IDE artifacts' },
				{ name: 'Agents', id: 'agents', icon: 'organization', description: 'ASDLC artifacts' }
			];

			const items = sections.map((section) => {
				const item = new vscode.TreeItem(section.name, vscode.TreeItemCollapsibleState.Expanded) as ProjectTreeItem;
				item.category = section.id as 'cursor' | 'agents';
				item.project = project;
				item.description = section.description;
				item.iconPath = new vscode.ThemeIcon(section.icon);
				return item;
			});

			return items;
		} else if (element.category === 'cursor' && element.project) {
			// Cursor section: show Commands, Rules, Skills, Subagents
			const projectData = this.projectData.get(element.project.id);
			const rulesCount = projectData?.rules.length || 0;
			const workspaceCommandsCount = projectData?.commands.length || 0;
			const globalCommandsCount = projectData?.globalCommands.length || 0;
			const commandsCount = workspaceCommandsCount + globalCommandsCount;
			const workspaceSkillsCount = projectData?.skills.length || 0;
			const globalSkillsCount = projectData?.globalSkills.length || 0;
			const skillsCount = workspaceSkillsCount + globalSkillsCount;

			const sections = [
				{ name: 'Commands', id: 'commands', icon: 'terminal', description: `${commandsCount} commands` },
				{ name: 'Rules', id: 'rules', icon: 'book', description: `${rulesCount} rules` },
				{ name: 'Skills', id: 'skills', icon: 'lightbulb', description: `${skillsCount} skills` }
			];

			return sections.map((section) => {
				const item = new vscode.TreeItem(section.name, vscode.TreeItemCollapsibleState.Collapsed) as ProjectTreeItem;
				item.category = section.id as 'commands' | 'rules' | 'skills';
				item.project = element.project;
				item.description = section.description;
				item.iconPath = new vscode.ThemeIcon(section.icon);
				return item;
			});
		} else if (element.category === 'agents' && element.project) {
			// Agents section: show AGENTS.md, Specs, Schemas
			const projectData = this.projectData.get(element.project.id);
			const asdlcArtifacts = projectData?.asdlcArtifacts;

			const items: ProjectTreeItem[] = [];

			// AGENTS.md (if exists)
			if (asdlcArtifacts?.agentsMd.exists && asdlcArtifacts.agentsMd.path) {
				const item = new vscode.TreeItem('AGENTS.md', vscode.TreeItemCollapsibleState.None) as ProjectTreeItem;
				item.category = 'agents-md';
				item.project = element.project;
				item.description = 'Agent constitution';
				item.iconPath = new vscode.ThemeIcon('hubot');
				item.command = {
					command: 'vscode.open',
					title: 'Open AGENTS.md',
					arguments: [vscode.Uri.file(asdlcArtifacts.agentsMd.path)]
				};
				items.push(item);
			}

			// Specs (if exists)
			if (asdlcArtifacts?.specs.exists) {
				const specsItem = new vscode.TreeItem('Specs', vscode.TreeItemCollapsibleState.Collapsed) as ProjectTreeItem;
				specsItem.category = 'specs';
				specsItem.project = element.project;
				specsItem.description = `${asdlcArtifacts.specs.specs.length} specs`;
				specsItem.iconPath = new vscode.ThemeIcon('library');
				items.push(specsItem);
			}

			// Schemas (if exists)
			if (asdlcArtifacts?.schemas.exists) {
				const schemasItem = new vscode.TreeItem('Schemas', vscode.TreeItemCollapsibleState.Collapsed) as ProjectTreeItem;
				schemasItem.category = 'schemas';
				schemasItem.project = element.project;
				schemasItem.description = `${asdlcArtifacts.schemas.schemas.length} schemas`;
				schemasItem.iconPath = new vscode.ThemeIcon('list-tree');
				items.push(schemasItem);
			}

			// If no artifacts, show placeholder
			if (items.length === 0) {
				return [{
					label: 'No ASDLC artifacts found',
					collapsibleState: vscode.TreeItemCollapsibleState.None,
					description: 'Add AGENTS.md, specs/, or schemas/'
				} as ProjectTreeItem];
			}

			return items;
		} else if (element.category === 'commands' && element.project) {
			// Commands section for specific project - show Workspace Commands and Global Commands sub-sections
			const projectData = this.projectData.get(element.project.id);
			const workspaceCommands = projectData?.commands || [];
			const globalCommands = projectData?.globalCommands || [];

			const subSections = [
				{
					name: 'Workspace Commands',
					id: 'commands-workspace',
					icon: 'folder',
					commands: workspaceCommands,
					location: 'workspace' as const
				},
				{
					name: 'Global Commands',
					id: 'commands-global',
					icon: 'globe',
					commands: globalCommands,
					location: 'global' as const
				}
			];

			return subSections.map((section) => {
				const item = new vscode.TreeItem(
					section.name,
					vscode.TreeItemCollapsibleState.Collapsed
				) as ProjectTreeItem;
				item.category = section.id as 'commands-workspace' | 'commands-global';
				item.project = element.project;
				item.commandLocation = section.location;
				item.description = `${section.commands.length} ${section.location} command${section.commands.length !== 1 ? 's' : ''}`;
				item.iconPath = new vscode.ThemeIcon(section.icon);
				return item;
			});
		} else if (element.category === 'commands-workspace' && element.project) {
			// Workspace Commands sub-section
			const projectData = this.projectData.get(element.project.id);
			const commands = projectData?.commands || [];

			if (commands.length === 0) {
				return [{
					label: 'No workspace commands found',
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
				item.category = 'commands-workspace';
				item.project = element.project;
				item.tooltip = `${this.getCommandPreview(cmd.content)} (Workspace)`;
				item.contextValue = 'command';
				item.iconPath = new vscode.ThemeIcon('terminal');

				item.command = {
					command: 'vscode.open',
					title: 'Open Command',
					arguments: [cmd.uri]
				};
				return item;
			});
		} else if (element.category === 'commands-global' && element.project) {
			// Global Commands sub-section
			const projectData = this.projectData.get(element.project.id);
			const commands = projectData?.globalCommands || [];

			if (commands.length === 0) {
				return [{
					label: 'No global commands found',
					collapsibleState: vscode.TreeItemCollapsibleState.None,
					description: 'Add commands to ~/.cursor/commands directory'
				} as ProjectTreeItem];
			}

			return commands.map((cmd: Command) => {
				const item = new vscode.TreeItem(
					cmd.fileName,
					vscode.TreeItemCollapsibleState.None
				) as ProjectTreeItem;
				item.commandData = cmd;
				item.category = 'commands-global';
				item.project = element.project;
				item.tooltip = `${this.getCommandPreview(cmd.content)} (Global)`;
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
			// Skills section: show Workspace Skills and Global Skills sub-sections
			const projectData = this.projectData.get(element.project.id);
			const workspaceSkills = projectData?.skills || [];
			const globalSkills = projectData?.globalSkills || [];

			const subSections = [
				{
					name: 'Workspace Skills',
					id: 'skills-workspace',
					icon: 'target',
					skills: workspaceSkills,
					location: 'workspace' as const
				},
				{
					name: 'Global Skills',
					id: 'skills-global',
					icon: 'globe',
					skills: globalSkills,
					location: 'global' as const
				}
			];

			return subSections.map((section) => {
				const item = new vscode.TreeItem(
					section.name,
					vscode.TreeItemCollapsibleState.Collapsed
				) as ProjectTreeItem;
				item.category = section.id as 'skills-workspace' | 'skills-global';
				item.project = element.project;
				item.skillLocation = section.location;
				item.description = `${section.skills.length} ${section.location} skill${section.skills.length !== 1 ? 's' : ''}`;
				item.iconPath = new vscode.ThemeIcon(section.icon);
				return item;
			});
		} else if (element.category === 'skills-workspace' && element.project) {
			// Workspace Skills sub-section
			const projectData = this.projectData.get(element.project.id);
			const skills = projectData?.skills || [];

			if (skills.length === 0) {
				return [{
					label: 'No workspace skills found',
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
				item.category = 'skills-workspace';
				item.project = element.project;
				item.tooltip = skill.metadata?.overview || `${skill.fileName} (Workspace)`;
				item.contextValue = 'skill';
				item.iconPath = new vscode.ThemeIcon('play-circle');

				item.command = {
					command: 'vscode.open',
					title: 'Open Skill',
					arguments: [skill.uri]
				};
				return item;
			});
		} else if (element.category === 'skills-global' && element.project) {
			// Global Skills sub-section
			const projectData = this.projectData.get(element.project.id);
			const skills = projectData?.globalSkills || [];

			if (skills.length === 0) {
				return [{
					label: 'No global skills found',
					collapsibleState: vscode.TreeItemCollapsibleState.None,
					description: 'Add skills to ~/.cursor/skills directory'
				} as ProjectTreeItem];
			}

			return skills.map((skill: Skill) => {
				const item = new vscode.TreeItem(
					skill.metadata?.title || skill.fileName,
					vscode.TreeItemCollapsibleState.None
				) as ProjectTreeItem;
				item.skillData = skill;
				item.category = 'skills-global';
				item.project = element.project;
				item.tooltip = skill.metadata?.overview || `${skill.fileName} (Global)`;
				item.contextValue = 'skill';
				item.iconPath = new vscode.ThemeIcon('play-circle');

				item.command = {
					command: 'vscode.open',
					title: 'Open Skill',
					arguments: [skill.uri]
				};
				return item;
			});
		} else if (element.category === 'specs' && element.project) {
			// Specs section: show individual spec files
			const projectData = this.projectData.get(element.project.id);
			const asdlcArtifacts = projectData?.asdlcArtifacts;
			const specs = asdlcArtifacts?.specs.specs || [];

			if (specs.length === 0) {
				return [{
					label: 'No specs found',
					collapsibleState: vscode.TreeItemCollapsibleState.None,
					description: 'Add specs to specs/ directory'
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
		} else if (element.category === 'schemas' && element.project) {
			// Schemas section: show individual schema files
			const projectData = this.projectData.get(element.project.id);
			const asdlcArtifacts = projectData?.asdlcArtifacts;
			const schemas = asdlcArtifacts?.schemas.schemas || [];

			if (schemas.length === 0) {
				return [{
					label: 'No schemas found',
					collapsibleState: vscode.TreeItemCollapsibleState.None,
					description: 'Add schemas to schemas/ directory'
				} as ProjectTreeItem];
			}

			return schemas.map(schema => {
				const item = new vscode.TreeItem(
					schema.name,
					vscode.TreeItemCollapsibleState.None
				) as ProjectTreeItem;
				item.category = 'schemas';
				item.project = element.project;
				item.tooltip = schema.schemaId || schema.name;
				item.description = schema.schemaId ? `ID: ${schema.schemaId}` : '';
				item.iconPath = new vscode.ThemeIcon('json');
				item.command = {
					command: 'vscode.open',
					title: 'Open Schema',
					arguments: [vscode.Uri.file(schema.path)]
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
	 * Format enhanced dependencies for display
	 */
	private formatEnhancedDependencies(deps: any): string[] {
		const items: string[] = [];

		// Show critical path
		if (deps.criticalPath?.length > 0) {
			items.push(`🔴 Critical Path: ${deps.criticalPath.join(', ')}`);
			items.push('');
		}

		// Show by purpose
		if (deps.byPurpose) {
			const categories = [
				{ key: 'parsing', label: 'Parsing' },
				{ key: 'testing', label: 'Testing' },
				{ key: 'build', label: 'Build' },
				{ key: 'platform', label: 'Platform' },
				{ key: 'code-quality', label: 'Code Quality' },
				{ key: 'utility', label: 'Utility' },
				{ key: 'http', label: 'HTTP' },
				{ key: 'framework', label: 'Framework' }
			];

			for (const cat of categories) {
				const categoryDeps = deps.byPurpose[cat.key];
				if (categoryDeps && categoryDeps.length > 0) {
					items.push(`${cat.label}:`);
					for (const dep of categoryDeps) {
						const critical = dep.critical ? ' 🔴' : '';
						items.push(`  • ${dep.name} (${dep.version})${critical} - ${dep.purpose}`);
					}
					items.push('');
				}
			}
		}

		return items;
	}

	private groupRulesByDirectory(rules: Rule[]): Record<string, Rule[]> {
		const groups: Record<string, Rule[]> = {};

		for (const rule of rules) {
			// Extract directory from URI path relative to workspace
			const relativePath = vscode.workspace.asRelativePath(rule.uri);
			const directory = relativePath.includes('/')
				? relativePath.substring(0, relativePath.lastIndexOf('/'))
				: '';

			if (!groups[directory]) {
				groups[directory] = [];
			}
			groups[directory].push(rule);
		}

		return groups;
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