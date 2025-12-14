// Analysis test to understand current icon assignments
import * as assert from 'assert';
import * as vscode from 'vscode';
import { RulesTreeProvider } from '../../../src/providers/rulesTreeProvider';
import { Rule } from '../../../src/scanner/rulesScanner';

// Mock vscode module
const mockVscode = {
	TreeItem: class MockTreeItem {
		label: string;
		collapsibleState: vscode.TreeItemCollapsibleState;
		constructor(label: string, collapsibleState: vscode.TreeItemCollapsibleState) {
			this.label = label;
			this.collapsibleState = collapsibleState;
		}
	},
	TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
	ThemeIcon: class MockThemeIcon { constructor(public id: string) {} },
	EventEmitter: class MockEventEmitter {
		fire() {}
		dispose() {}
		event = { dispose: () => {} };
	},
	Uri: { file: (path: string) => ({ fsPath: path, toString: () => `file://${path}` } as vscode.Uri) }
};

Object.defineProperty(global, 'vscode', { value: mockVscode, writable: true });

describe('Icon Analysis for Real Rules', () => {
	let provider: RulesTreeProvider;

	beforeEach(() => {
		provider = new RulesTreeProvider(new Map(), [], null);
	});

	it('should show what icon each rule gets', () => {
		const rules: Array<{name: string, rule: Rule, expectedIcon: string}> = [
			{
				name: 'security.mdc',
				rule: {
					uri: vscode.Uri.file('/test/security.mdc'),
					fileName: 'security.mdc',
					metadata: {
						description: 'Security best practices for VS Code extensions',
						globs: ['**/*.ts'],
						alwaysApply: true
					},
					content: 'Security best practices. Input validation. Authentication. Sanitize data.'
				},
				expectedIcon: 'shield'
			},
			{
				name: 'testing.mdc',
				rule: {
					uri: vscode.Uri.file('/test/testing.mdc'),
					fileName: 'testing.mdc',
					metadata: {
						description: 'Testing strategies for VS Code extensions',
						globs: ['**/*.test.ts'],
						alwaysApply: false
					},
					content: 'Unit testing. Integration testing. Test frameworks. Mocha and Jest.'
				},
				expectedIcon: 'beaker'
			},
			{
				name: 'performance.mdc',
				rule: {
					uri: vscode.Uri.file('/test/performance.mdc'),
					fileName: 'performance.mdc',
					metadata: {
						description: 'Performance optimization for VS Code extensions',
						globs: ['**/*.ts'],
						alwaysApply: false
					},
					content: 'Performance optimization. Memory management. Startup performance.'
				},
				expectedIcon: 'zap'
			},
			{
				name: 'typescript-extension.mdc',
				rule: {
					uri: vscode.Uri.file('/test/typescript-extension.mdc'),
					fileName: 'typescript-extension.mdc',
					metadata: {
						description: 'TypeScript VS Code extension development best practices',
						globs: ['**/*.ts'],
						alwaysApply: true
					},
					content: 'TypeScript configuration. VS Code API. Extension development.'
				},
				expectedIcon: 'file-code'
			},
			{
				name: 'ui-ux.mdc',
				rule: {
					uri: vscode.Uri.file('/test/ui-ux.mdc'),
					fileName: 'ui-ux.mdc',
					metadata: {
						description: 'UI/UX guidelines for VS Code extension development',
						globs: ['**/*.ts'],
						alwaysApply: false
					},
					content: 'User interface design. User experience. Tree view design. Command design.'
				},
				expectedIcon: 'symbol-interface'
			},
			{
				name: 'error-handling.mdc',
				rule: {
					uri: vscode.Uri.file('/test/error-handling.mdc'),
					fileName: 'error-handling.mdc',
					metadata: {
						description: 'Comprehensive error handling patterns for VS Code extensions',
						globs: ['**/*.ts'],
						alwaysApply: false
					},
					content: 'Error handling patterns. Exception handling. Try-catch blocks.'
				},
				expectedIcon: 'error'
			},
			{
				name: 'project-specific.mdc',
				rule: {
					uri: vscode.Uri.file('/test/project-specific.mdc'),
					fileName: 'project-specific.mdc',
					metadata: {
						description: 'Specific rules for the Project Rules Explorer extension',
						globs: ['**/*.ts'],
						alwaysApply: true
					},
					content: 'MDC file handling. Tree view structure. Project Rules Explorer specific rules.'
				},
				expectedIcon: 'folder-library'
			},
			{
				name: 'documentation.mdc (in subdirectory)',
				rule: {
					uri: vscode.Uri.file('/test/documentation/documentation.mdc'),
					fileName: 'documentation.mdc',
					metadata: {
						description: 'Documentation standards for VS Code extensions',
						globs: ['**/*.md'],
						alwaysApply: false
					},
					content: 'Documentation best practices. README files. API documentation.'
				},
				expectedIcon: 'book'
			},
			{
				name: 'publishing.mdc (in subdirectory)',
				rule: {
					uri: vscode.Uri.file('/test/deployment/publishing.mdc'),
					fileName: 'publishing.mdc',
					metadata: {
						description: 'VS Code extension publishing and deployment guidelines',
						globs: ['package.json'],
						alwaysApply: false
					},
					content: 'Publishing to marketplace. Deployment strategies. CI/CD pipelines.'
				},
				expectedIcon: 'package'
			}
		];

		console.log('\n=== Icon Analysis for Real Rules ===\n');

		rules.forEach(({ name, rule, expectedIcon }) => {
			const actualIcon = (provider as any).getContextAwareIcon(rule);
			const match = actualIcon === expectedIcon ? '✅' : '❌';

			console.log(`${match} ${name}`);
			console.log(`   Expected: ${expectedIcon}`);
			console.log(`   Actual:   ${actualIcon}`);
			if (actualIcon !== expectedIcon) {
				console.log(`   ** MISMATCH **`);
			}
			console.log('');

			assert.strictEqual(
				actualIcon,
				expectedIcon,
				`Rule ${name} should have icon "${expectedIcon}" but got "${actualIcon}"`
			);
		});

		console.log('=== All icons match expected values ===\n');
	});

	it('should prioritize specific keywords over generic ones', () => {
		// Test that "testing" doesn't trigger "test" false positives
		const testingRule: Rule = {
			uri: vscode.Uri.file('/test/testing.mdc'),
			fileName: 'testing.mdc',
			metadata: {
				description: 'Testing strategies',
				globs: [],
				alwaysApply: false
			},
			content: 'Testing is important'
		};

		const icon = (provider as any).getContextAwareIcon(testingRule);
		assert.strictEqual(icon, 'beaker', 'Testing rule should get beaker icon');
	});

	it('should handle subdirectory rules correctly', () => {
		const subDirRule: Rule = {
			uri: vscode.Uri.file('/test/deployment/publishing.mdc'),
			fileName: 'publishing.mdc',
			metadata: {
				description: 'Publishing guidelines',
				globs: [],
				alwaysApply: false
			},
			content: 'Publishing and deployment'
		};

		const icon = (provider as any).getContextAwareIcon(subDirRule);
		assert.strictEqual(icon, 'rocket', 'Publishing rule should get rocket icon');
	});
});
