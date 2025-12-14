// Tree Provider for Rules and State visualization
import * as vscode from 'vscode';
import { Rule } from '../scanner/rulesScanner';
import { ProjectState } from '../scanner/stateScanner';
import { Command } from '../scanner/commandsScanner';
import { ProjectDefinition } from '../types/project';

export interface RulesTreeItem extends vscode.TreeItem {
	rule?: Rule;
	commandData?: Command; // Command data (avoiding conflict with TreeItem's command property)
	stateItem?: any;
	ruleType?: any;
	category?: 'rules' | 'state' | 'projects' | 'ruleType' | 'commands' | 'commands-workspace' | 'commands-global';
	commandLocation?: 'workspace' | 'global'; // For sub-section grouping
	directory?: string;
	project?: ProjectDefinition;
}

export class RulesTreeProvider implements vscode.TreeDataProvider<RulesTreeItem> {
	private _onDidChangeTreeData = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	constructor(
		private projectData: Map<string, { rules: Rule[], state: ProjectState, commands: Command[], globalCommands: Command[] }> = new Map(),
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
		projectData: Map<string, { rules: Rule[], state: ProjectState, commands: Command[], globalCommands: Command[] }>,
		projects: ProjectDefinition[],
		currentProject: ProjectDefinition | null
	): void {
		this.projectData = projectData;
		this.projects = projects;
		this.currentProject = currentProject;
	}

	getTreeItem(element: RulesTreeItem): RulesTreeItem {
		return element;
	}

	async getChildren(element?: RulesTreeItem): Promise<RulesTreeItem[]> {
		try {
			if (!element) {
				// Root level: show all projects
				if (this.projects.length === 0) {
					return [{
						label: 'No projects defined',
						collapsibleState: vscode.TreeItemCollapsibleState.None,
						description: 'Add a project to get started',
						command: {
							command: 'projectRules.addProject',
							title: 'Add Project'
						}
					} as RulesTreeItem];
				}

				return this.projects.map((project) => {
					const item = new vscode.TreeItem(
						project.name,
						project.active ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed
					) as RulesTreeItem;
					item.project = project;
					item.category = 'projects';
					item.description = project.active ? 'Active' : project.path;
					item.tooltip = `${project.name}\n${project.path}\n${project.description || 'No description'}`;
					item.iconPath = new vscode.ThemeIcon(project.active ? 'folder-opened' : 'folder');

					// Add context menu for projects
					item.contextValue = project.active ? 'activeProject' : 'inactiveProject';

					return item;
				});
			} else if (element.category === 'projects' && element.project) {
				// Project level: show Rules and State for this specific project
				const project = element.project;

				// Show Rules, State, and Commands sections for all projects
				const currentProjectData = this.projectData.get(project.id);
				const rulesCount = currentProjectData?.rules.length || 0;
				const workspaceCommandsCount = currentProjectData?.commands.length || 0;
				const globalCommandsCount = currentProjectData?.globalCommands.length || 0;
				const commandsCount = workspaceCommandsCount + globalCommandsCount;

				// Count sections (not individual items)
				let stateCount = 0;
				if (currentProjectData?.state) {
					const state = currentProjectData.state;

					// Enhanced sections (6 sections)
					if (state.identity) { stateCount += 1; }
					if (state.capabilities) { stateCount += 1; }
					if (state.enhancedDependencies) { stateCount += 1; }
					if (state.enhancedArchitecture) { stateCount += 1; }
					if (state.platformContext) { stateCount += 1; }
					if (state.agentGuidance) { stateCount += 1; }

					// Grouped basic sections (3 sections)
					stateCount += 3; // Tech Stack, Dev Environment, Project Structure

					// Conditional sections
					if (state.infrastructure) { stateCount += 1; }
					if (state.security) { stateCount += 1; }
					if (state.api) { stateCount += 1; }
					if (state.deployment) { stateCount += 1; }
					if (state.projectMetrics) { stateCount += 1; }
				}

				const sections = [
					{ name: 'Commands', id: 'commands', icon: 'terminal', description: `${commandsCount} commands found` },
					{ name: 'Rules', id: 'rules', icon: 'book', description: `${rulesCount} rules found` },
					{ name: 'State', id: 'state', icon: 'database', description: `${stateCount} items` }
				];

				// Add a switch project option for non-active projects
				const items = sections.map((section) => {
					const item = new vscode.TreeItem(section.name, vscode.TreeItemCollapsibleState.Collapsed) as RulesTreeItem;
					item.category = section.id as 'rules' | 'state' | 'commands';
					item.project = project;
					item.description = section.description;
					item.iconPath = new vscode.ThemeIcon(section.icon);

					// Set contextValue for Rules section to enable + button
					if (section.id === 'rules') {
						item.contextValue = 'rules';
					}

					return item;
				});

				// No switch option needed - users can expand any project to see its rules, state, and commands

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
				) as RulesTreeItem;
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
				} as RulesTreeItem];
			}

			return commands.map((cmd: Command) => {
				const item = new vscode.TreeItem(
					cmd.fileName,
					vscode.TreeItemCollapsibleState.None
				) as RulesTreeItem;
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
				} as RulesTreeItem];
			}

			return commands.map((cmd: Command) => {
				const item = new vscode.TreeItem(
					cmd.fileName,
					vscode.TreeItemCollapsibleState.None
				) as RulesTreeItem;
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
		} else if (element.category === 'rules' && element.project) {
			// Rules section for specific project
			const projectData = this.projectData.get(element.project.id);
			const rules = projectData?.rules || [];

			if (rules.length === 0) {
				return [{
					label: 'No rules found',
					collapsibleState: vscode.TreeItemCollapsibleState.None,
					description: 'Add rules to .cursor/rules directory'
				} as RulesTreeItem];
			}

			// Show all rules in a flat list
			return rules.map((rule: Rule) => {
				const item = new vscode.TreeItem(
					rule.fileName,
					vscode.TreeItemCollapsibleState.None
				) as RulesTreeItem;
				item.rule = rule;
				item.category = 'rules';
				item.project = element.project;
				item.tooltip = rule.metadata.description;
				item.contextValue = 'rule'; // Enable context menu for individual rules

				// Context-aware icon based on filename, content, and project context
				item.iconPath = new vscode.ThemeIcon(this.getContextAwareIcon(rule, element.project));

				// Open in editor instead of webview
				item.command = {
					command: 'vscode.open',
					title: 'Open Rule',
					arguments: [rule.uri]
				};
				return item;
			});
		} else if (element.category === 'state' && element.project) {
			// State section for specific project - show categories (basic + enhanced)
			const projectData = this.projectData.get(element.project.id);
			const state = projectData?.state;

				if (!state) {
					return [{
						label: 'No state data available',
						collapsibleState: vscode.TreeItemCollapsibleState.None,
						description: 'State not scanned yet'
					} as RulesTreeItem];
				}

				const stateItems: Array<{name: string, items: any[], icon: string, isEnhanced?: boolean, sectionKey?: string}> = [
					// === ENHANCED STATE (High Value) ===
					// Project Identity
					...(state.identity ? [{
						name: 'Project Identity',
						items: [
							`Type: ${state.identity.projectType}`,
							`Domain: ${state.identity.domain}`,
							`Language: ${state.identity.primaryLanguage}`,
							`Maturity: ${state.identity.maturityLevel}`
						],
						icon: 'target',
						isEnhanced: true,
						sectionKey: 'identity'
					}] : []),

					// Capabilities
					...(state.capabilities ? [{
						name: 'Capabilities',
						items: [
							...(state.capabilities.description ? [`Description: ${state.capabilities.description}`] : []),
							...(state.capabilities.primaryFeatures || []),
							...(state.capabilities.dataFormats?.length ? [`Formats: ${state.capabilities.dataFormats.join(', ')}`] : [])
						],
						icon: 'rocket',
						isEnhanced: true,
						sectionKey: 'capabilities'
					}] : []),

					// Dependencies by Purpose
					...(state.enhancedDependencies ? [{
						name: 'Dependencies by Purpose',
						items: this.formatEnhancedDependencies(state.enhancedDependencies),
						icon: 'package',
						isEnhanced: true,
						sectionKey: 'dependencies'
					}] : []),

					// Architecture Patterns
					...(state.enhancedArchitecture ? [{
						name: 'Architecture',
						items: [
							`Style: ${state.enhancedArchitecture.style}`,
							`Organization: ${state.enhancedArchitecture.organization}`,
							...(state.enhancedArchitecture.patterns || []),
							...(state.enhancedArchitecture.entryPoints?.length ? [`Entry: ${state.enhancedArchitecture.entryPoints.join(', ')}`] : [])
						],
						icon: 'symbol-structure',
						isEnhanced: true,
						sectionKey: 'architecture'
					}] : []),

					// Platform Context
					...(state.platformContext?.vscode ? [{
						name: 'VS Code Platform',
						items: [
							`Type: ${state.platformContext.vscode.extensionType}`,
							`Min Version: ${state.platformContext.vscode.minVersion}`,
							`Commands: ${state.platformContext.vscode.contributes.commands}`,
							`Views: ${state.platformContext.vscode.contributes.views}`,
							...(state.platformContext.vscode.capabilities || [])
						],
						icon: 'extensions',
						isEnhanced: true,
						sectionKey: 'platform'
					}] : []),

					// Agent Guidance
					...(state.agentGuidance ? [{
						name: 'Agent Guidance',
						items: [
							`Approach: ${state.agentGuidance.suggestedApproach}`,
							'',
							'Critical Files:',
							...(state.agentGuidance.criticalFiles || []).map(f => `  • ${f}`),
							'',
							'Common Tasks:',
							...(state.agentGuidance.commonTasks || []).map(t => `  • ${t}`),
							'',
							'Watch Outs:',
							...(state.agentGuidance.watchOuts || []).map(w => `  ⚠️ ${w}`)
						],
						icon: 'robot',
						isEnhanced: true,
						sectionKey: 'guidance'
					}] : []),

					// === GROUPED BASIC STATE ===
					// Technology Stack
					{
						name: 'Technology Stack',
						items: [
							'Languages:',
							...state.languages.map(l => `  • ${l}`),
							'',
							'Frameworks:',
							...state.frameworks.map(f => `  • ${f}`)
						],
						icon: 'symbol-namespace',
						sectionKey: 'tech-stack'
					},

					// Development Environment
					{
						name: 'Development Environment',
						items: [
							'Build Tools:',
							...state.buildTools.map(b => `  • ${b}`),
							'',
							'Testing:',
							...state.testing.map(t => `  • ${t}`),
							'',
							'Code Quality:',
							...state.codeQuality.map(c => `  • ${c}`),
							'',
							'Development Tools:',
							...state.developmentTools.map(d => `  • ${d}`)
						],
						icon: 'tools',
						sectionKey: 'dev-environment'
					},

					// Project Structure
					{
						name: 'Project Structure',
						items: [
							'Architecture:',
							...state.architecture.map(a => `  • ${a}`),
							'',
							'Configuration:',
							...state.configuration.map(c => `  • ${c}`),
							'',
							'Documentation:',
							...state.documentation.map(d => `  • ${d}`)
						],
						icon: 'folder-library',
						sectionKey: 'project-structure'
					},

					// Conditional sections (only show if they have content)
					...(state.infrastructure ? [{
						name: 'Infrastructure',
						items: [
							'Databases:',
							...state.infrastructure.databases.map((d: string) => `  • ${d}`),
							'',
							'Cache:',
							...state.infrastructure.cache.map((c: string) => `  • ${c}`),
							'',
							'Queues:',
							...state.infrastructure.queues.map((q: string) => `  • ${q}`),
							'',
							'Storage:',
							...state.infrastructure.storage.map((s: string) => `  • ${s}`),
							'',
							'Messaging:',
							...state.infrastructure.messaging.map((m: string) => `  • ${m}`)
						],
						icon: 'server',
						sectionKey: 'infrastructure'
					}] : []),

					...(state.security ? [{
						name: 'Security',
						items: [
							'Authentication Frameworks:',
							...state.security.authFrameworks.map((a: string) => `  • ${a}`),
							'',
							'Encryption:',
							...state.security.encryption.map((e: string) => `  • ${e}`),
							'',
							'Vulnerability Scanning:',
							...state.security.vulnerabilityScanning.map((v: string) => `  • ${v}`),
							'',
							'Secrets Management:',
							...state.security.secretsManagement.map((s: string) => `  • ${s}`)
						],
						icon: 'shield',
						sectionKey: 'security'
					}] : []),

					...(state.api ? [{
						name: 'API',
						items: [
							'API Type:',
							...state.api.type.map((t: string) => `  • ${t}`),
							'',
							'Documentation:',
							...state.api.documentation.map((d: string) => `  • ${d}`),
							'',
							'Authentication:',
							...state.api.authentication.map((a: string) => `  • ${a}`),
							'',
							'Versioning:',
							...state.api.versioning.map((v: string) => `  • ${v}`)
						],
						icon: 'cloud',
						sectionKey: 'api'
					}] : []),

					...(state.deployment ? [{
						name: 'Deployment',
						items: [
							'Environments:',
							...state.deployment.environments.map((e: string) => `  • ${e}`),
							'',
							'Platforms:',
							...state.deployment.platforms.map((p: string) => `  • ${p}`),
							'',
							'Orchestration:',
							...state.deployment.orchestration.map((o: string) => `  • ${o}`)
						],
						icon: 'rocket',
						sectionKey: 'deployment'
					}] : []),

					...(state.projectMetrics ? [{
						name: 'Project Metrics',
						items: [
							`Size: ${state.projectMetrics.estimatedSize}`,
							`Complexity: ${state.projectMetrics.complexity}`,
							`Files Analyzed: ${state.projectMetrics.filesAnalyzed}`,
							`Last Analyzed: ${new Date(state.projectMetrics.lastAnalyzed).toLocaleString()}`
						],
						icon: 'graph',
						sectionKey: 'metrics'
					}] : [])
				].filter(section => section.items.length > 0); // Only show sections with content

				return stateItems.map((section) => {
					const item = new vscode.TreeItem(
						section.name,
						vscode.TreeItemCollapsibleState.None // Don't expand, click to open
					) as RulesTreeItem;
					item.category = 'state';
					item.project = element.project;
					item.description = `${section.items.length} items`;
					item.stateItem = section;
					item.iconPath = new vscode.ThemeIcon(section.icon);

					// Add command to open in a view instead of expanding
					item.command = {
						command: 'projectRules.viewStateSection',
						title: 'View State Section',
						arguments: [section.sectionKey || section.name.toLowerCase().replace(/\s+/g, '-'), section, element.project]
					};

					return item;
				});
			}

			return [];
		} catch (error) {
			const errorItem = new vscode.TreeItem(
				`Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
				vscode.TreeItemCollapsibleState.None
			) as RulesTreeItem;
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

	private getContextAwareIcon(rule: Rule, project?: ProjectDefinition): string {
		const description = rule.metadata.description.toLowerCase();
		const fileName = rule.fileName.toLowerCase();

		// Filename-based icon detection (higher priority)
		const filenameIconMappings: Array<[string[], string]> = [
			// Security files
			[['security', 'auth', 'authz'], 'shield'],
			// Testing files
			[['test', 'spec', 'testing'], 'beaker'],
			// Performance files
			[['performance', 'optimize', 'perf'], 'speedometer'],
			// Documentation files
			[['readme', 'docs', 'documentation'], 'book'],
			// Deployment files
			[['deploy', 'publish', 'ci-cd'], 'rocket'],
			// Database files
			[['database', 'db', 'sql'], 'database'],
			// API files
			[['api', 'endpoint', 'rest'], 'symbol-method'],
			// Component files (higher priority than UI)
			[['component'], 'symbol-component'],
			// UI/UX files
			[['ui', 'ux', 'interface'], 'symbol-interface'],
			// Error handling files
			[['error', 'exception', 'handling'], 'error'],
			// Extension files (higher priority than TypeScript)
			[['extension'], 'extensions'],
			// TypeScript files
			[['typescript', 'ts-config'], 'symbol-class'],
			// Project specific files
			[['project-specific', 'project-specific'], 'folder-library'],
			// React files
			[['react', 'component', 'jsx'], 'symbol-component'],
			// Node.js files
			[['node', 'server', 'express'], 'server'],
			// Git files
			[['git', 'version', 'vcs'], 'source-control'],
			// Configuration files
			[['config', 'settings', 'env'], 'settings-gear'],
			// VS Code Extension files
			[['vscode', 'extension'], 'extensions'],
			// Always files
			[['always'], 'star'],
			// Auto files
			[['auto'], 'wrench'],
			// Agent files
			[['agent'], 'symbol-function'],
			// Manual files
			[['manual'], 'symbol-keyword']
		];

		// Description-based icon detection (lower priority)
		const iconMappings: Array<[string[], string]> = [
			// Security
			[['security', 'auth', 'authentication', 'authorization'], 'shield'],
			// Testing
			[['test', 'testing', 'spec'], 'beaker'],
			// Performance
			[['performance', 'optimize', 'optimization'], 'speedometer'],
			// Documentation
			[['documentation', 'readme', 'changelog'], 'book'],
			// Publishing/Deployment
			[['publishing', 'deployment', 'deploy', 'ci/cd'], 'rocket'],
			// Database
			[['database', 'sql', 'db'], 'database'],
			// API
			[['api', 'endpoint', 'rest'], 'symbol-method'],
			// UI/UX
			[['ui/ux', 'user interface', 'user experience'], 'symbol-interface'],
			// Error handling
			[['error', 'exception'], 'error'],
			// TypeScript
			[['typescript', 'type safety'], 'symbol-class'],
			// Project specific
			[['specific rules', 'project specific'], 'folder-library'],
			// React
			[['react', 'component'], 'symbol-component'],
			// Node.js
			[['node.js', 'server'], 'server'],
			// Git
			[['git', 'version control'], 'source-control'],
			// Configuration
			[['configuration', 'settings', 'config'], 'settings-gear'],
			// VS Code Extension
			[['vscode', 'extension', 'vs code'], 'extensions'],
			// Always rules
			[['always'], 'star'],
			// Auto rules
			[['auto'], 'wrench'],
			// Agent rules
			[['agent'], 'symbol-function'],
			// Manual rules
			[['manual'], 'symbol-keyword']
		];

		// Check filename first for priority
		for (const [keywords, icon] of filenameIconMappings) {
			if (keywords.some(keyword => fileName.includes(keyword))) {
				return icon;
			}
		}

		// Then check description for additional matches
		for (const [keywords, icon] of iconMappings) {
			if (keywords.some(keyword => description.includes(keyword))) {
				return icon;
			}
		}

		// Project-specific icon adjustments for non-default projects
		if (project && !project.active) {
			// For inactive projects, use a slightly different icon to indicate they're not the active project
			// This helps distinguish rules from different projects
			if (fileName.includes('project-specific') || description.includes('project specific')) {
				return 'folder-library';
			}
			// Add a subtle indicator for non-active project rules
			return 'file-text';
		}

		// Default fallback icon
		return 'file-text';
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