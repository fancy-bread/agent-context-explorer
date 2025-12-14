// Unit tests for Rule Labels Removal
import * as assert from 'assert';
import * as vscode from 'vscode';
import { RulesTreeProvider, RulesTreeItem } from '../../../src/providers/rulesTreeProvider';
import { Rule } from '../../../src/scanner/rulesScanner';
import { ProjectState } from '../../../src/scanner/stateScanner';
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
	let provider: RulesTreeProvider;
	let mockProject: ProjectDefinition;
	let mockRule: Rule;
	let mockProjectData: Map<string, { rules: Rule[], state: ProjectState }>;

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
			}
		});

		provider = new RulesTreeProvider(mockProjectData, [mockProject], mockProject);
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
				state: mockProjectData.get('test-project')!.state
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
});
