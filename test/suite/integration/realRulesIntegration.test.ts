// Integration tests using real rules from the repository
import * as assert from 'assert';
import * as vscode from 'vscode';
import { RulesTreeProvider } from '../../../src/providers/rulesTreeProvider';
import { RulesScanner } from '../../../src/scanner/rulesScanner';
import { Rule } from '../../../src/scanner/rulesScanner';
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
	},
	workspace: {
		fs: {
			readFile: async (uri: vscode.Uri) => {
				// Mock file reading for real rule files
				const fs = require('fs');
				const path = require('path');
				const realPath = path.join(__dirname, '../../.cursor/rules', path.basename(uri.fsPath));
				if (fs.existsSync(realPath)) {
					return fs.readFileSync(realPath);
				}
				throw new Error('File not found');
			},
			stat: async (uri: vscode.Uri) => {
				const fs = require('fs');
				const path = require('path');
				const realPath = path.join(__dirname, '../../.cursor/rules', path.basename(uri.fsPath));
				if (fs.existsSync(realPath)) {
					const stats = fs.statSync(realPath);
					return {
						type: stats.isDirectory() ? 2 : 1,
						ctime: stats.ctime.getTime(),
						mtime: stats.mtime.getTime(),
						size: stats.size
					};
				}
				throw new Error('File not found');
			},
			readDirectory: async (uri: vscode.Uri) => {
				const fs = require('fs');
				const path = require('path');
				const realPath = path.join(__dirname, '../../.cursor/rules');
				if (fs.existsSync(realPath)) {
					const files = fs.readdirSync(realPath);
					return files.map((file: string) => [file, 1] as [string, vscode.FileType]);
				}
				return [];
			}
		}
	}
};

// Mock the vscode module
Object.defineProperty(global, 'vscode', {
	value: mockVscode,
	writable: true
});

describe('Real Rules Integration Tests', () => {
	let provider: RulesTreeProvider;
	let mockProject: ProjectDefinition;
	let realRules: Rule[] = [];

	before(async () => {
		// Create a mock project that points to the actual repository
		mockProject = {
			id: 'project-rules-explorer',
			name: 'Project Rules Explorer',
			path: __dirname + '/../..',
			active: true,
			description: 'Real project for testing',
			lastAccessed: new Date()
		};

		// Scan the actual rules from the repository
		const workspaceRoot = vscode.Uri.file(__dirname + '/../..');
		const scanner = new RulesScanner(workspaceRoot);
		realRules = await scanner.scanRules();

		// Create project data with real rules
		const projectData = new Map();
		projectData.set('project-rules-explorer', {
			rules: realRules,
			state: {
				languages: ['TypeScript'],
				frameworks: ['VS Code Extension'],
				dependencies: ['vscode'],
				buildTools: ['webpack'],
				testing: ['mocha'],
				codeQuality: ['eslint'],
				developmentTools: ['vscode'],
				architecture: ['extension-based'],
				configuration: ['package.json', 'tsconfig.json'],
				documentation: ['README.md']
			}
		});

		provider = new RulesTreeProvider(projectData, [mockProject], mockProject);
	});

	describe('Real Rule Icon Detection', () => {
		it('should assign security icon to security.mdc', () => {
			const securityRule = realRules.find(rule => rule.fileName === 'security.mdc');
			assert.ok(securityRule, 'Security rule should be found');

			const icon = (provider as any).getContextAwareIcon(securityRule);
			assert.strictEqual(icon, 'shield', 'Security rule should get shield icon');
		});

		it('should assign beaker icon to testing.mdc', () => {
			const testingRule = realRules.find(rule => rule.fileName === 'testing.mdc');
			assert.ok(testingRule, 'Testing rule should be found');

			const icon = (provider as any).getContextAwareIcon(testingRule);
			assert.strictEqual(icon, 'beaker', 'Testing rule should get beaker icon');
		});

		it('should assign speedometer icon to performance.mdc', () => {
			const performanceRule = realRules.find(rule => rule.fileName === 'performance.mdc');
			assert.ok(performanceRule, 'Performance rule should be found');

			const icon = (provider as any).getContextAwareIcon(performanceRule);
			assert.strictEqual(icon, 'speedometer', 'Performance rule should get speedometer icon');
		});

		it('should assign symbol-class icon to typescript-extension.mdc', () => {
			const typescriptRule = realRules.find(rule => rule.fileName === 'typescript-extension.mdc');
			assert.ok(typescriptRule, 'TypeScript rule should be found');

			const icon = (provider as any).getContextAwareIcon(typescriptRule);
			assert.strictEqual(icon, 'symbol-class', 'TypeScript rule should get symbol-class icon');
		});

		it('should assign symbol-interface icon to ui-ux.mdc', () => {
			const uiUxRule = realRules.find(rule => rule.fileName === 'ui-ux.mdc');
			assert.ok(uiUxRule, 'UI/UX rule should be found');

			const icon = (provider as any).getContextAwareIcon(uiUxRule);
			assert.strictEqual(icon, 'symbol-interface', 'UI/UX rule should get symbol-interface icon');
		});

		it('should assign warning icon to error-handling.mdc', () => {
			const errorRule = realRules.find(rule => rule.fileName === 'error-handling.mdc');
			assert.ok(errorRule, 'Error handling rule should be found');

			const icon = (provider as any).getContextAwareIcon(errorRule);
			assert.strictEqual(icon, 'warning', 'Error handling rule should get warning icon');
		});

		it('should assign extensions icon to project-specific.mdc', () => {
			const projectRule = realRules.find(rule => rule.fileName === 'project-specific.mdc');
			assert.ok(projectRule, 'Project-specific rule should be found');

			const icon = (provider as any).getContextAwareIcon(projectRule);
			assert.strictEqual(icon, 'extensions', 'Project-specific rule should get extensions icon');
		});
	});

	describe('Real Rule Content Analysis', () => {
		it('should detect security-related content in security.mdc', () => {
			const securityRule = realRules.find(rule => rule.fileName === 'security.mdc');
			assert.ok(securityRule, 'Security rule should be found');

			// Check that the rule contains security-related content
			assert.ok(securityRule.content.includes('Security'), 'Should contain security content');
			assert.ok(securityRule.content.includes('authentication'), 'Should contain authentication content');
			assert.ok(securityRule.metadata.description.includes('Security'), 'Description should mention security');
		});

		it('should detect testing-related content in testing.mdc', () => {
			const testingRule = realRules.find(rule => rule.fileName === 'testing.mdc');
			assert.ok(testingRule, 'Testing rule should be found');

			// Check that the rule contains testing-related content
			assert.ok(testingRule.content.includes('Testing'), 'Should contain testing content');
			assert.ok(testingRule.content.includes('test'), 'Should contain test content');
			assert.ok(testingRule.metadata.description.includes('Testing'), 'Description should mention testing');
		});

		it('should detect performance-related content in performance.mdc', () => {
			const performanceRule = realRules.find(rule => rule.fileName === 'performance.mdc');
			assert.ok(performanceRule, 'Performance rule should be found');

			// Check that the rule contains performance-related content
			assert.ok(performanceRule.content.includes('Performance'), 'Should contain performance content');
			assert.ok(performanceRule.content.includes('optimization'), 'Should contain optimization content');
			assert.ok(performanceRule.metadata.description.includes('Performance'), 'Description should mention performance');
		});

		it('should detect TypeScript-related content in typescript-extension.mdc', () => {
			const typescriptRule = realRules.find(rule => rule.fileName === 'typescript-extension.mdc');
			assert.ok(typescriptRule, 'TypeScript rule should be found');

			// Check that the rule contains TypeScript-related content
			assert.ok(typescriptRule.content.includes('TypeScript'), 'Should contain TypeScript content');
			assert.ok(typescriptRule.content.includes('typescript'), 'Should contain typescript content');
			assert.ok(typescriptRule.metadata.description.includes('TypeScript'), 'Description should mention TypeScript');
		});

		it('should detect UI/UX-related content in ui-ux.mdc', () => {
			const uiUxRule = realRules.find(rule => rule.fileName === 'ui-ux.mdc');
			assert.ok(uiUxRule, 'UI/UX rule should be found');

			// Check that the rule contains UI/UX-related content
			assert.ok(uiUxRule.content.includes('UI/UX'), 'Should contain UI/UX content');
			assert.ok(uiUxRule.content.includes('user interface'), 'Should contain user interface content');
			assert.ok(uiUxRule.metadata.description.includes('UI/UX'), 'Description should mention UI/UX');
		});
	});

	describe('Real Rule Tree Display', () => {
		it('should display real rules without labels in tree view', async () => {
			// Get the project tree item
			const projectItems = await provider.getChildren();
			assert.strictEqual(projectItems.length, 1);
			assert.strictEqual(projectItems[0].label, 'Project Rules Explorer');

			// Get the rules section
			const rulesSection = await provider.getChildren(projectItems[0]);
			const rulesItem = rulesSection.find(item => item.category === 'rules');
			assert.ok(rulesItem, 'Rules section should exist');

			// Get the rule type groupings
			const ruleTypes = await provider.getChildren(rulesItem!);

			// Check that we have the expected rule type groupings
			const alwaysRules = ruleTypes.find(item => item.ruleType?.type === 'always');
			const autoRules = ruleTypes.find(item => item.ruleType?.type === 'auto');
			const agentRules = ruleTypes.find(item => item.ruleType?.type === 'agent');
			const manualRules = ruleTypes.find(item => item.ruleType?.type === 'manual');

			assert.ok(alwaysRules, 'Always rules section should exist');
			assert.ok(autoRules, 'Auto rules section should exist');
			assert.ok(agentRules, 'Agent rules section should exist');
			assert.ok(manualRules, 'Manual rules section should exist');

			// Check individual rules don't have labels
			const alwaysIndividualRules = await provider.getChildren(alwaysRules!);
			const autoIndividualRules = await provider.getChildren(autoRules!);
			const agentIndividualRules = await provider.getChildren(agentRules!);
			const manualIndividualRules = await provider.getChildren(manualRules!);

			// Verify no labels on individual rules
			[...alwaysIndividualRules, ...autoIndividualRules, ...agentIndividualRules, ...manualIndividualRules].forEach(ruleItem => {
				assert.strictEqual(ruleItem.description, undefined, `Rule ${ruleItem.label} should not have a description/label`);
			});
		});

		it('should assign correct icons to real rules in tree view', async () => {
			// Get individual rules from tree view
			const projectItems = await provider.getChildren();
			const rulesSection = await provider.getChildren(projectItems[0]);
			const rulesItem = rulesSection.find(item => item.category === 'rules');
			const ruleTypes = await provider.getChildren(rulesItem!);

			// Check all rule types
			for (const ruleType of ruleTypes) {
				const individualRules = await provider.getChildren(ruleType);

				for (const ruleItem of individualRules) {
					assert.ok(ruleItem.iconPath, `Rule ${ruleItem.label} should have an icon`);
					assert.strictEqual(ruleItem.contextValue, 'rule', `Rule ${ruleItem.label} should have context value for menus`);

					// Verify the icon is context-aware
					const expectedIcon = (provider as any).getContextAwareIcon(ruleItem.rule);
					if (ruleItem.iconPath && typeof ruleItem.iconPath === 'object' && 'id' in ruleItem.iconPath) {
						assert.strictEqual(ruleItem.iconPath.id, expectedIcon, `Rule ${ruleItem.label} should have correct context-aware icon`);
					}
				}
			}
		});
	});

	describe('Real Rule Metadata Validation', () => {
	it('should have proper metadata for all real rules', () => {
		realRules.forEach(rule => {
			assert.ok(rule.metadata, `Rule ${rule.fileName} should have metadata`);
			assert.ok(rule.metadata.description, `Rule ${rule.fileName} should have a description`);
			assert.ok(Array.isArray(rule.metadata.globs), `Rule ${rule.fileName} should have globs array`);
			assert.ok(typeof rule.metadata.alwaysApply === 'boolean', `Rule ${rule.fileName} should have alwaysApply boolean`);
		});
	});

	it('should have valid descriptions for all real rules', () => {
		realRules.forEach(rule => {
			assert.ok(rule.metadata.description && rule.metadata.description.length > 0, `Rule ${rule.fileName} should have a valid description`);
		});
	});

		it('should have meaningful descriptions for all real rules', () => {
			realRules.forEach(rule => {
				assert.ok(rule.metadata.description.length > 10, `Rule ${rule.fileName} should have meaningful description`);
				assert.ok(!rule.metadata.description.includes('undefined'), `Rule ${rule.fileName} description should not contain undefined`);
			});
		});
	});
});
