// Unit tests for Rule Labels Removal
import * as assert from 'assert';
import * as vscode from 'vscode';
import { ProjectTreeProvider, ProjectTreeItem } from '../../../src/providers/projectTreeProvider';
import { Rule } from '../../../src/scanner/rulesScanner';
import { ProjectState } from '../../../src/scanner/types';
import { Skill } from '../../../src/scanner/skillsScanner';
import { AsdlcArtifacts } from '../../../src/scanner/types';
import { ProjectDefinition } from '../../../src/types/project';

// Mock vscode module
const mockVscode = {
	TreeItem: class MockTreeItem {
		label: string;
		collapsibleState: vscode.TreeItemCollapsibleState;
		description?: string;
		tooltip?: string;
		iconPath?: vscode.ThemeIcon;
		contextValue?: string;
		command?: vscode.Command;
		rule?: Rule;
		project?: ProjectDefinition;
		category?: string;
		ruleType?: any;

		constructor(label: string, collapsibleState: vscode.TreeItemCollapsibleState) {
			this.label = label;
			this.collapsibleState = collapsibleState;
		}
	},
	TreeItemCollapsibleState: {
		None: 0,
		Collapsed: 1,
		Expanded: 2
	},
	ThemeIcon: class MockThemeIcon {
		constructor(public id: string) {}
	},
	EventEmitter: class MockEventEmitter {
		fire() {}
		dispose() {}
		event = { dispose: () => {} };
	},
	Uri: {
		file: (path: string) => ({ fsPath: path, toString: () => `file://${path}` } as vscode.Uri)
	}
};

// Mock the vscode module
Object.defineProperty(global, 'vscode', {
	value: mockVscode,
	writable: true
});

describe('Rule Labels Removal', () => {
	let provider: ProjectTreeProvider;
	let mockProject: ProjectDefinition;
	let mockRule: Rule;
	let mockProjectData: Map<string, {
		rules: Rule[],
		state: ProjectState,
		commands: any[],
		globalCommands: any[],
		skills: Skill[],
		globalSkills: Skill[],
		asdlcArtifacts: AsdlcArtifacts
	}>;

	beforeEach(() => {
		mockProject = {
			id: 'test-project',
			name: 'Test Project',
			path: '/test/path',
			active: true,
			description: 'Test project description',
			lastAccessed: new Date()
		};

		mockRule = {
			uri: vscode.Uri.file('/test/path/.cursor/rules/test.mdc'),
			fileName: 'test.mdc',
			metadata: {
				description: 'Test rule description',
				globs: ['*.ts'],
				alwaysApply: false
			},
			content: 'Test rule content'
		};

		mockProjectData = new Map();
		mockProjectData.set('test-project', {
			rules: [mockRule],
			state: {
				languages: ['TypeScript'],
				frameworks: ['React'],
				dependencies: ['react'],
				buildTools: ['webpack'],
				testing: ['jest'],
				codeQuality: ['eslint'],
			developmentTools: ['vscode'],
			architecture: ['component-based'],
			configuration: ['tsconfig.json'],
			documentation: ['README.md']
		},
		commands: [],
		globalCommands: [],
		skills: [],
		globalSkills: [],
		asdlcArtifacts: {
			agentsMd: { exists: false, sections: [] },
			specs: { exists: false, specs: [] },
			schemas: { exists: false, schemas: [] },
			hasAnyArtifacts: false
		}
	});

		provider = new ProjectTreeProvider(mockProjectData, [mockProject], mockProject);
		provider.setDataLoaded(true);
	});

	describe('Individual Rule Display', () => {
		it('should not show rule type labels for individual rules', async () => {
			// Get the project tree item
			const projectItems = await provider.getChildren();
			assert.strictEqual(projectItems.length, 1);
			assert.strictEqual(projectItems[0].label, 'Test Project');

			// Get the rules section
			const rulesSection = await provider.getChildren(projectItems[0]);
			const rulesItem = rulesSection.find(item => item.category === 'rules');
			assert.ok(rulesItem, 'Rules section should exist');

			// Get the rule type grouping
			const ruleTypes = await provider.getChildren(rulesItem!);
			const manualRules = ruleTypes.find(item => item.ruleType?.type === 'manual');
			assert.ok(manualRules, 'Manual rules section should exist');

			// Get individual rules
			const individualRules = await provider.getChildren(manualRules!);
			assert.strictEqual(individualRules.length, 1);

			const ruleItem = individualRules[0];
			assert.strictEqual(ruleItem.label, 'test.mdc');
			assert.strictEqual(ruleItem.description, undefined, 'Rule should not have a description/label');
			assert.strictEqual(ruleItem.tooltip, 'Test rule description', 'Rule should have tooltip with description');
		});

		it('should show rule type labels for rule type groupings', async () => {
			// Get the project tree item
			const projectItems = await provider.getChildren();
			const rulesSection = await provider.getChildren(projectItems[0]);
			const rulesItem = rulesSection.find(item => item.category === 'rules');

			// Get the rule type grouping
			const ruleTypes = await provider.getChildren(rulesItem!);
			const manualRules = ruleTypes.find(item => item.ruleType?.type === 'manual');

			assert.ok(manualRules, 'Manual rules section should exist');
			assert.strictEqual(manualRules.description, '1 rules', 'Rule type grouping should show count');
		});

		it('should maintain context-aware icons for individual rules', async () => {
			// Get individual rules
			const projectItems = await provider.getChildren();
			const rulesSection = await provider.getChildren(projectItems[0]);
			const rulesItem = rulesSection.find(item => item.category === 'rules');
			const ruleTypes = await provider.getChildren(rulesItem!);
			const manualRules = ruleTypes.find(item => item.ruleType?.type === 'manual');
			const individualRules = await provider.getChildren(manualRules!);

			const ruleItem = individualRules[0];
			assert.ok(ruleItem.iconPath, 'Rule should have an icon');
			assert.strictEqual(ruleItem.contextValue, 'rule', 'Rule should have context value for menus');
		});

		it('should handle rules with different types correctly', async () => {
			// Add rules with different types
			const alwaysRule: Rule = {
				uri: vscode.Uri.file('/test/path/.cursor/rules/always.mdc'),
				fileName: 'always.mdc',
				metadata: {
					description: 'Always applied rule',
					globs: ['*.ts'],
					alwaysApply: true
				},
				content: 'Always rule content'
			};

			const autoRule: Rule = {
				uri: vscode.Uri.file('/test/path/.cursor/rules/auto.mdc'),
				fileName: 'auto.mdc',
				metadata: {
					description: 'Auto rule',
					globs: ['*.js'],
					alwaysApply: false
				},
				content: 'Auto rule content'
			};

		// Update project data with multiple rules
		mockProjectData.set('test-project', {
			rules: [mockRule, alwaysRule, autoRule],
			state: mockProjectData.get('test-project')!.state,
			commands: [],
			globalCommands: [],
			skills: [],
			globalSkills: [],
			asdlcArtifacts: {
				agentsMd: { exists: false, sections: [] },
				specs: { exists: false, specs: [] },
				schemas: { exists: false, schemas: [] },
				hasAnyArtifacts: false
			}
		});

			provider.updateData(mockProjectData, [mockProject], mockProject);

			// Get rule type groupings
			const projectItems = await provider.getChildren();
			const rulesSection = await provider.getChildren(projectItems[0]);
			const rulesItem = rulesSection.find(item => item.category === 'rules');
			const ruleTypes = await provider.getChildren(rulesItem!);

			// Check that we have the expected rule type groupings
			const alwaysRules = ruleTypes.find(item => item.ruleType?.type === 'always');
			const autoRules = ruleTypes.find(item => item.ruleType?.type === 'auto');
			const manualRules = ruleTypes.find(item => item.ruleType?.type === 'manual');

			assert.ok(alwaysRules, 'Always rules section should exist');
			assert.ok(autoRules, 'Auto rules section should exist');
			assert.ok(manualRules, 'Manual rules section should exist');

			// Check individual rules don't have labels
			const alwaysIndividualRules = await provider.getChildren(alwaysRules!);
			const autoIndividualRules = await provider.getChildren(autoRules!);
			const manualIndividualRules = await provider.getChildren(manualRules!);

			assert.strictEqual(alwaysIndividualRules.length, 1);
			assert.strictEqual(autoIndividualRules.length, 1);
			assert.strictEqual(manualIndividualRules.length, 1);

			// Verify no labels on individual rules
			assert.strictEqual(alwaysIndividualRules[0].description, undefined);
			assert.strictEqual(autoIndividualRules[0].description, undefined);
			assert.strictEqual(manualIndividualRules[0].description, undefined);
		});
	});

	describe('Context-Aware Icons', () => {
		it('should assign appropriate icons based on rule content', () => {
			const testRule: Rule = {
				uri: vscode.Uri.file('/test/path/.cursor/rules/test.mdc'),
				fileName: 'test.mdc',
				metadata: {
					description: 'Test rule for testing',
					globs: ['*.test.ts'],
					alwaysApply: false
				},
				content: 'This is a test rule for testing purposes'
			};

			// Test the getContextAwareIcon method
			const icon = (provider as any).getContextAwareIcon(testRule);
			assert.strictEqual(icon, 'beaker', 'Test rule should get beaker icon');
		});

		it('should assign security icon for security-related rules', () => {
			const securityRule: Rule = {
				uri: vscode.Uri.file('/test/path/.cursor/rules/security.mdc'),
				fileName: 'security.mdc',
				metadata: {
					description: 'Security rules for authentication',
					globs: ['*.ts'],
					alwaysApply: true
				},
				content: 'Security and authentication rules'
			};

			const icon = (provider as any).getContextAwareIcon(securityRule);
			assert.strictEqual(icon, 'shield', 'Security rule should get shield icon');
		});

		it('should assign performance icon for performance-related rules', () => {
			const performanceRule: Rule = {
				uri: vscode.Uri.file('/test/path/.cursor/rules/performance.mdc'),
				fileName: 'performance.mdc',
				metadata: {
					description: 'Performance optimization rules',
					globs: ['*.ts'],
					alwaysApply: false
				},
				content: 'Performance and optimization guidelines'
			};

			const icon = (provider as any).getContextAwareIcon(performanceRule);
			assert.strictEqual(icon, 'speedometer', 'Performance rule should get speedometer icon');
		});
	});

	describe('Commands Display', () => {
		it('should show Commands section with Workspace and Global sub-sections', async () => {
			// Setup project data with both workspace and global commands
			const workspaceCommand = {
				uri: vscode.Uri.file('/test/path/.cursor/commands/create-plan.md'),
				fileName: 'create-plan.md',
				content: '# Create Plan\n\nCreate a detailed implementation plan.',
				location: 'workspace' as const
			};
			const globalCommand = {
				uri: vscode.Uri.file('/home/user/.cursor/commands/global-command.md'),
				fileName: 'global-command.md',
				content: '# Global Command\n\nThis is a global command.',
				location: 'global' as const
			};

		mockProjectData.set('test-project', {
			rules: [mockRule],
			state: mockProjectData.get('test-project')!.state,
			commands: [workspaceCommand],
			globalCommands: [globalCommand],
			skills: [],
			globalSkills: [],
			asdlcArtifacts: {
				agentsMd: { exists: false, sections: [] },
				specs: { exists: false, specs: [] },
				schemas: { exists: false, schemas: [] },
				hasAnyArtifacts: false
			}
		});

		provider.updateData(mockProjectData, [mockProject], mockProject);

		// Get project items
		const projectItems = await provider.getChildren();
		const sections = await provider.getChildren(projectItems[0]);
		const commandsSection = sections.find(item => item.category === 'commands');

			assert.ok(commandsSection, 'Commands section should exist');

			// In the new model, Commands is a single workspace-only list
			const commandItems = await provider.getChildren(commandsSection!);
			assert.strictEqual(commandItems.length, 1, 'Should show only workspace commands in a single list');
			assert.strictEqual(commandItems[0].label, 'workspace-command.md');
		});

	it('should display workspace commands under Commands section', async () => {
		const workspaceCommand = {
			uri: vscode.Uri.file('/test/path/.cursor/commands/create-plan.md'),
			fileName: 'create-plan.md',
			content: '# Create Plan\n\nCreate a detailed implementation plan.',
			location: 'workspace' as const
		};

		mockProjectData.set('test-project', {
			rules: [mockRule],
			state: mockProjectData.get('test-project')!.state,
			commands: [workspaceCommand],
			globalCommands: [],
			skills: [],
			globalSkills: [],
			asdlcArtifacts: {
				agentsMd: { exists: false, sections: [] },
				specs: { exists: false, specs: [] },
				schemas: { exists: false, schemas: [] },
				hasAnyArtifacts: false
			}
		});

			provider.updateData(mockProjectData, [mockProject], mockProject);

			// Navigate to commands
			const projectItems = await provider.getChildren();
			const sections = await provider.getChildren(projectItems[0]);
			const commandsSection = sections.find(item => item.category === 'commands');
			const workspaceCommands = await provider.getChildren(commandsSection!);

			assert.strictEqual(workspaceCommands.length, 1);
			assert.strictEqual(workspaceCommands[0].label, 'create-plan.md');
			const workspaceTooltip = typeof workspaceCommands[0].tooltip === 'string' ? workspaceCommands[0].tooltip : workspaceCommands[0].tooltip?.value;
			assert.ok(workspaceTooltip?.includes('Create Plan'));
			const workspaceIcon = typeof workspaceCommands[0].iconPath === 'object' && workspaceCommands[0].iconPath !== null ? (workspaceCommands[0].iconPath as any).id : null;
			assert.strictEqual(workspaceIcon, 'terminal');
		});

	it('should not surface global commands under project Commands section', async () => {
		const globalCommand = {
			uri: vscode.Uri.file('/home/user/.cursor/commands/global-command.md'),
			fileName: 'global-command.md',
			content: '# Global Command\n\nThis is a global command.',
			location: 'global' as const
		};

		mockProjectData.set('test-project', {
			rules: [mockRule],
			state: mockProjectData.get('test-project')!.state,
			commands: [],
			globalCommands: [globalCommand],
			skills: [],
			globalSkills: [],
			asdlcArtifacts: {
				agentsMd: { exists: false, sections: [] },
				specs: { exists: false, specs: [] },
				schemas: { exists: false, schemas: [] },
				hasAnyArtifacts: false
			}
		});

		provider.updateData(mockProjectData, [mockProject], mockProject);

			// Navigate to commands
			const projectItems = await provider.getChildren();
			const sections = await provider.getChildren(projectItems[0]);
			const commandsSection = sections.find(item => item.category === 'commands');
			const commandItems = await provider.getChildren(commandsSection!);

			assert.strictEqual(commandItems.length, 0, 'Global-only commands should not appear under project Commands section');
		});

	it('should show empty state for commands when none exist', async () => {
		mockProjectData.set('test-project', {
			rules: [mockRule],
			state: mockProjectData.get('test-project')!.state,
			commands: [],
			globalCommands: [],
			skills: [],
			globalSkills: [],
			asdlcArtifacts: {
				agentsMd: { exists: false, sections: [] },
				specs: { exists: false, specs: [] },
				schemas: { exists: false, schemas: [] },
				hasAnyArtifacts: false
			}
		});

		provider.updateData(mockProjectData, [mockProject], mockProject);

		// Navigate to commands
		const projectItems = await provider.getChildren();
		const sections = await provider.getChildren(projectItems[0]);
		const commandsSection = sections.find(item => item.category === 'commands');
		const commandItems = await provider.getChildren(commandsSection!);

		assert.strictEqual(commandItems.length, 1);
		assert.strictEqual(commandItems[0].label, 'No commands found');
	});

	it('should show empty state for global commands when none exist', async () => {
		mockProjectData.set('test-project', {
			rules: [mockRule],
			state: mockProjectData.get('test-project')!.state,
			commands: [],
			globalCommands: [],
			skills: [],
			globalSkills: [],
			asdlcArtifacts: {
				agentsMd: { exists: false, sections: [] },
				specs: { exists: false, specs: [] },
				schemas: { exists: false, schemas: [] },
				hasAnyArtifacts: false
			}
		});

			provider.updateData(mockProjectData, [mockProject], mockProject);

			// Navigate to commands: with only global commands configured, project Commands section should be empty
			const projectItems = await provider.getChildren();
			const sections = await provider.getChildren(projectItems[0]);
			const commandsSection = sections.find(item => item.category === 'commands');
			const commandItems = await provider.getChildren(commandsSection!);

			assert.strictEqual(commandItems.length, 0);
		});

	it('should include workspace command preview in tooltip (no global location markers)', async () => {
		const workspaceCommand = {
			uri: vscode.Uri.file('/test/path/.cursor/commands/create-plan.md'),
			fileName: 'create-plan.md',
			content: '# Create Plan\n\nCreate a detailed implementation plan.',
			location: 'workspace' as const
		};

		mockProjectData.set('test-project', {
			rules: [mockRule],
			state: mockProjectData.get('test-project')!.state,
			commands: [workspaceCommand],
			globalCommands: [],
			skills: [],
			globalSkills: [],
			asdlcArtifacts: {
				agentsMd: { exists: false, sections: [] },
				specs: { exists: false, specs: [] },
				schemas: { exists: false, schemas: [] },
				hasAnyArtifacts: false
			}
		});

			provider.updateData(mockProjectData, [mockProject], mockProject);

			// Get command
			const projectItems = await provider.getChildren();
			const sections = await provider.getChildren(projectItems[0]);
			const commandsSection = sections.find(item => item.category === 'commands');
			const commandItems = await provider.getChildren(commandsSection!);

			const workspaceTooltip = typeof commandItems[0].tooltip === 'string' ? commandItems[0].tooltip : commandItems[0].tooltip?.value;
			assert.ok(workspaceTooltip?.includes('Create Plan'));
		});

		it('should show correct command counts in Commands description', async () => {
			const workspaceCommand1 = {
				uri: vscode.Uri.file('/test/path/.cursor/commands/create-plan.md'),
				fileName: 'create-plan.md',
				content: '# Create Plan',
				location: 'workspace' as const
			};
			const workspaceCommand2 = {
				uri: vscode.Uri.file('/test/path/.cursor/commands/start-task.md'),
				fileName: 'start-task.md',
				content: '# Start Task',
				location: 'workspace' as const
			};

		mockProjectData.set('test-project', {
			rules: [mockRule],
			state: mockProjectData.get('test-project')!.state,
			commands: [workspaceCommand1, workspaceCommand2],
			globalCommands: [],
			skills: [],
			globalSkills: [],
			asdlcArtifacts: {
				agentsMd: { exists: false, sections: [] },
				specs: { exists: false, specs: [] },
				schemas: { exists: false, schemas: [] },
				hasAnyArtifacts: false
			}
		});

		provider.updateData(mockProjectData, [mockProject], mockProject);

		// Get commands section
		const projectItems = await provider.getChildren();
		const sections = await provider.getChildren(projectItems[0]);
			const commandsSection = sections.find(item => item.category === 'commands');

			const commandsDesc = typeof commandsSection!.description === 'string' ? commandsSection!.description : String(commandsSection!.description);
			assert.ok(commandsDesc.includes('2 commands'));
		});
	});
});
