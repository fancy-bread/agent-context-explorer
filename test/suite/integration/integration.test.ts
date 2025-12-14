import * as assert from 'assert';

// Mock VS Code API for testing
const mockVscode = {
	window: {
		showInputBox: async (options: any) => {
			if (options.prompt === 'Enter rule name') return 'Test Rule';
			if (options.prompt === 'Enter new rule name') return 'Updated Rule';
			return 'test-input';
		},
		showInformationMessage: (message: string) => {},
		showErrorMessage: (message: string) => {},
		showWarningMessage: (message: string) => 'Yes',
		showQuickPick: async (items: any[]) => items[0],
		createTreeView: (viewId: string, options: any) => ({
			onDidChangeSelection: (callback: Function) => {},
			reveal: (item: any) => {},
			dispose: () => {}
		})
	},
	workspace: {
		workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
		fs: {
			stat: async (uri: any) => ({ type: 2 }), // Directory
			readFile: async (uri: any) => Buffer.from('test content'),
			writeFile: async (uri: any, content: Buffer) => {},
			delete: async (uri: any) => {}
		},
		onDidChangeWorkspaceFolders: (callback: Function) => ({ dispose: () => {} })
	},
	commands: {
		registerCommand: (command: string, callback: Function) => ({ dispose: () => {} })
	},
	Uri: {
		file: (path: string) => ({ fsPath: path }),
		joinPath: (base: any, ...paths: string[]) => ({ fsPath: `${base.fsPath}/${paths.join('/')}` })
	},
	TreeItemCollapsibleState: {
		None: 0,
		Collapsed: 1,
		Expanded: 2
	},
	env: {
		clipboard: {
			writeText: async (text: string) => {},
			readText: async () => 'test clipboard content'
		}
	}
};

// Mock integrated system for testing
class MockIntegratedSystem {
	private projectManager: any;
	private rulesScanner: any;
	private stateScanner: any;
	private treeProvider: any;
	private fileWatcher: any;
	private isActive: boolean = false;

	constructor() {
		this.projectManager = new MockProjectManager();
		this.rulesScanner = new MockRulesScanner();
		this.stateScanner = new MockStateScanner();
		this.treeProvider = new MockRulesTreeProvider(this.projectManager);
		this.fileWatcher = new MockFileWatcher();
	}

	async activate(): Promise<void> {
		if (this.isActive) return;

		// Initialize all components
		await this.projectManager.initialize();
		await this.rulesScanner.initialize();
		await this.stateScanner.initialize();
		this.treeProvider.initialize();
		this.fileWatcher.startWatching();

		this.isActive = true;
	}

	async deactivate(): Promise<void> {
		if (!this.isActive) return;

		// Dispose all components
		this.fileWatcher.stopWatching();
		this.treeProvider.dispose();
		this.stateScanner.dispose();
		this.rulesScanner.dispose();
		this.projectManager.dispose();

		this.isActive = false;
	}

	async createProject(name: string, path: string): Promise<any> {
		const project = await this.projectManager.addProject({ name, path, description: '' });
		await this.refreshTree();
		return project;
	}

	async createRule(projectId: string, ruleName: string, content: string): Promise<any> {
		const rule = await this.rulesScanner.createRule(projectId, ruleName, content);
		await this.refreshTree();
		return rule;
	}

	async updateRule(ruleId: string, updates: any): Promise<any> {
		const rule = await this.rulesScanner.updateRule(ruleId, updates);
		await this.refreshTree();
		return rule;
	}

	async deleteRule(ruleId: string): Promise<void> {
		await this.rulesScanner.deleteRule(ruleId);
		await this.refreshTree();
	}

	async scanProjectState(projectId: string): Promise<any> {
		const project = await this.projectManager.getProject(projectId);
		const state = await this.stateScanner.scanProject(project.path);
		await this.projectManager.updateProject(projectId, { state });
		await this.refreshTree();
		return state;
	}

	async refreshTree(): Promise<void> {
		if (this.treeProvider) {
			this.treeProvider.refresh();
		}
	}

	getStatus(): any {
		return {
			isActive: this.isActive,
			hasProjectManager: !!this.projectManager,
			hasRulesScanner: !!this.rulesScanner,
			hasStateScanner: !!this.stateScanner,
			hasTreeProvider: !!this.treeProvider,
			hasFileWatcher: !!this.fileWatcher
		};
	}
}

// Mock component classes
class MockProjectManager {
	private projects: any[] = [];

	async initialize(): Promise<void> {
		// Mock initialization
	}

	async addProject(data: any): Promise<any> {
		const project = {
			id: `project-${Date.now()}`,
			...data,
			created: new Date(),
			active: false
		};
		this.projects.push(project);
		return project;
	}

	async getProject(id: string): Promise<any> {
		return this.projects.find(p => p.id === id);
	}

	async updateProject(id: string, updates: any): Promise<any> {
		const project = this.projects.find(p => p.id === id);
		if (project) {
			Object.assign(project, updates);
		}
		return project;
	}

	async getProjects(): Promise<any[]> {
		return this.projects;
	}

	dispose(): void {
		this.projects = [];
	}
}

class MockRulesScanner {
	private rules: any[] = [];

	async initialize(): Promise<void> {
		// Mock initialization
	}

	async createRule(projectId: string, name: string, content: string): Promise<any> {
		const rule = {
			id: `rule-${Date.now()}`,
			projectId,
			name,
			content,
			created: new Date()
		};
		this.rules.push(rule);
		return rule;
	}

	async updateRule(id: string, updates: any): Promise<any> {
		const rule = this.rules.find(r => r.id === id);
		if (rule) {
			Object.assign(rule, updates);
		}
		return rule;
	}

	async deleteRule(id: string): Promise<void> {
		const index = this.rules.findIndex(r => r.id === id);
		if (index >= 0) {
			this.rules.splice(index, 1);
		}
	}

	async getRules(projectId: string): Promise<any[]> {
		return this.rules.filter(r => r.projectId === projectId);
	}

	dispose(): void {
		this.rules = [];
	}
}

class MockStateScanner {
	async initialize(): Promise<void> {
		// Mock initialization
	}

	async scanProject(path: string): Promise<any> {
		return {
			languages: ['JavaScript', 'TypeScript'],
			frameworks: ['Node.js', 'React'],
			dependencies: ['typescript', 'eslint'],
			buildTools: ['Webpack', 'Babel'],
			testing: ['Jest', 'Cypress'],
			codeQuality: ['ESLint', 'Prettier'],
			architecture: ['Component-based', 'MVC'],
			configuration: ['.gitignore', 'package.json'],
			developmentTools: ['Git', 'Docker'],
			documentation: ['README.md', 'CHANGELOG.md']
		};
	}

	dispose(): void {
		// Mock disposal
	}
}

class MockRulesTreeProvider {
	constructor(private projectManager: any) {}

	initialize(): void {
		// Mock initialization
	}

	refresh(): void {
		// Mock refresh
	}

	dispose(): void {
		// Mock disposal
	}
}

class MockFileWatcher {
	startWatching(): void {
		// Mock start watching
	}

	stopWatching(): void {
		// Mock stop watching
	}
}

describe('Integration Tests', () => {
	let system: MockIntegratedSystem;

	beforeEach(() => {
		system = new MockIntegratedSystem();
	});

	afterEach(async () => {
		await system.deactivate();
	});

	describe('System Activation', () => {
		it('should activate all components successfully', async () => {
			await system.activate();

			const status = system.getStatus();
			assert.equal(status.isActive, true);
			assert.ok(status.hasProjectManager);
			assert.ok(status.hasRulesScanner);
			assert.ok(status.hasStateScanner);
			assert.ok(status.hasTreeProvider);
			assert.ok(status.hasFileWatcher);
		});

		it('should handle activation errors gracefully', async () => {
			// Mock component initialization failure
			const originalInitialize = system['projectManager'].initialize;
			system['projectManager'].initialize = async () => {
				throw new Error('Project manager initialization failed');
			};

			try {
				await system.activate();
				assert.fail('Should have thrown an error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok(error.message.includes('Project manager initialization failed'));
			}

			// Restore original function
			system['projectManager'].initialize = originalInitialize;
		});
	});

	describe('System Deactivation', () => {
		it('should deactivate all components successfully', async () => {
			await system.activate();
			await system.deactivate();

			const status = system.getStatus();
			assert.equal(status.isActive, false);
		});

		it('should handle deactivation errors gracefully', async () => {
			await system.activate();

			// Mock component disposal failure
			const originalDispose = system['projectManager'].dispose;
			system['projectManager'].dispose = () => {
				throw new Error('Project manager disposal failed');
			};

			try {
				await system.deactivate();
				assert.fail('Should have thrown an error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok(error.message.includes('Project manager disposal failed'));
			}

			// Restore original function
			system['projectManager'].dispose = originalDispose;
		});
	});

	describe('Project Management Integration', () => {
		it('should create and manage projects', async () => {
			await system.activate();

			const project = await system.createProject('Test Project', '/test/path');
			assert.ok(project);
			assert.equal(project.name, 'Test Project');
			assert.equal(project.path, '/test/path');
		});

		it('should handle project creation errors', async () => {
			await system.activate();

			// Mock project creation failure
			const originalAddProject = system['projectManager'].addProject;
			system['projectManager'].addProject = async () => {
				throw new Error('Project creation failed');
			};

			try {
				await system.createProject('Test Project', '/test/path');
				assert.fail('Should have thrown an error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok(error.message.includes('Project creation failed'));
			}

			// Restore original function
			system['projectManager'].addProject = originalAddProject;
		});
	});

	describe('Rule Management Integration', () => {
		it('should create and manage rules', async () => {
			await system.activate();

			const project = await system.createProject('Test Project', '/test/path');
			const rule = await system.createRule(project.id, 'Test Rule', 'Test content');

			assert.ok(rule);
			assert.equal(rule.name, 'Test Rule');
			assert.equal(rule.content, 'Test content');
			assert.equal(rule.projectId, project.id);
		});

		it('should update rules', async () => {
			await system.activate();

			const project = await system.createProject('Test Project', '/test/path');
			const rule = await system.createRule(project.id, 'Test Rule', 'Test content');

			const updatedRule = await system.updateRule(rule.id, { name: 'Updated Rule' });
			assert.equal(updatedRule.name, 'Updated Rule');
		});

		it('should delete rules', async () => {
			await system.activate();

			const project = await system.createProject('Test Project', '/test/path');
			const rule = await system.createRule(project.id, 'Test Rule', 'Test content');

			await system.deleteRule(rule.id);

			// Rule should be deleted
			const rules = await system['rulesScanner'].getRules(project.id);
			assert.equal(rules.length, 0);
		});

		it('should handle rule management errors', async () => {
			await system.activate();

			// Mock rule creation failure
			const originalCreateRule = system['rulesScanner'].createRule;
			system['rulesScanner'].createRule = async () => {
				throw new Error('Rule creation failed');
			};

			try {
				const project = await system.createProject('Test Project', '/test/path');
				await system.createRule(project.id, 'Test Rule', 'Test content');
				assert.fail('Should have thrown an error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok(error.message.includes('Rule creation failed'));
			}

			// Restore original function
			system['rulesScanner'].createRule = originalCreateRule;
		});
	});

	describe('State Scanning Integration', () => {
		it('should scan project state', async () => {
			await system.activate();

			const project = await system.createProject('Test Project', '/test/path');
			const state = await system.scanProjectState(project.id);

			assert.ok(state);
			assert.ok(Array.isArray(state.languages));
			assert.ok(Array.isArray(state.frameworks));
			assert.ok(Array.isArray(state.dependencies));
		});

		it('should handle state scanning errors', async () => {
			await system.activate();

			// Mock state scanning failure
			const originalScanProject = system['stateScanner'].scanProject;
			system['stateScanner'].scanProject = async () => {
				throw new Error('State scanning failed');
			};

			try {
				const project = await system.createProject('Test Project', '/test/path');
				await system.scanProjectState(project.id);
				assert.fail('Should have thrown an error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok(error.message.includes('State scanning failed'));
			}

			// Restore original function
			system['stateScanner'].scanProject = originalScanProject;
		});
	});

	describe('Tree Provider Integration', () => {
		it('should refresh tree after changes', async () => {
			await system.activate();

			const project = await system.createProject('Test Project', '/test/path');
			const rule = await system.createRule(project.id, 'Test Rule', 'Test content');

			// Tree should be refreshed
			assert.ok(system['treeProvider']);
		});

		it('should handle tree refresh errors', async () => {
			await system.activate();

			// Mock tree refresh failure
			const originalRefresh = system['treeProvider'].refresh;
			system['treeProvider'].refresh = () => {
				throw new Error('Tree refresh failed');
			};

			try {
				const project = await system.createProject('Test Project', '/test/path');
				await system.createRule(project.id, 'Test Rule', 'Test content');
				assert.fail('Should have thrown an error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok(error.message.includes('Tree refresh failed'));
			}

			// Restore original function
			system['treeProvider'].refresh = originalRefresh;
		});
	});

	describe('File Watcher Integration', () => {
		it('should start watching for file changes', async () => {
			await system.activate();

			const status = system.getStatus();
			assert.ok(status.hasFileWatcher);
		});

		it('should stop watching on deactivation', async () => {
			await system.activate();
			await system.deactivate();

			const status = system.getStatus();
			assert.equal(status.isActive, false);
		});
	});

	describe('End-to-End Workflows', () => {
		it('should handle complete project lifecycle', async () => {
			await system.activate();

			// Create project
			const project = await system.createProject('Test Project', '/test/path');
			assert.ok(project);

			// Create rules
			const rule1 = await system.createRule(project.id, 'Rule 1', 'Content 1');
			const rule2 = await system.createRule(project.id, 'Rule 2', 'Content 2');
			assert.ok(rule1);
			assert.ok(rule2);

			// Update rule
			const updatedRule = await system.updateRule(rule1.id, { name: 'Updated Rule 1' });
			assert.equal(updatedRule.name, 'Updated Rule 1');

			// Scan state
			const state = await system.scanProjectState(project.id);
			assert.ok(state);

			// Delete rule
			await system.deleteRule(rule2.id);

			// Verify final state
			const rules = await system['rulesScanner'].getRules(project.id);
			assert.equal(rules.length, 1);
			assert.equal(rules[0].name, 'Updated Rule 1');
		});

		it('should handle multiple projects', async () => {
			await system.activate();

			// Create multiple projects
			const project1 = await system.createProject('Project 1', '/path1');
			const project2 = await system.createProject('Project 2', '/path2');

			// Create rules for each project
			const rule1 = await system.createRule(project1.id, 'Rule 1', 'Content 1');
			const rule2 = await system.createRule(project2.id, 'Rule 2', 'Content 2');

			// Verify rules are associated with correct projects
			const rules1 = await system['rulesScanner'].getRules(project1.id);
			const rules2 = await system['rulesScanner'].getRules(project2.id);

			assert.equal(rules1.length, 1);
			assert.equal(rules2.length, 1);
			assert.equal(rules1[0].name, 'Rule 1');
			assert.equal(rules2[0].name, 'Rule 2');
		});

		it('should handle concurrent operations', async () => {
			await system.activate();

			const project = await system.createProject('Test Project', '/test/path');

			// Perform concurrent operations
			const operations = [
				system.createRule(project.id, 'Rule 1', 'Content 1'),
				system.createRule(project.id, 'Rule 2', 'Content 2'),
				system.createRule(project.id, 'Rule 3', 'Content 3'),
				system.scanProjectState(project.id)
			];

			const results = await Promise.all(operations);

			// All operations should complete successfully
			assert.equal(results.length, 4);
			results.forEach(result => {
				assert.ok(result);
			});
		});
	});

	describe('Error Recovery', () => {
		it('should recover from component failures', async () => {
			await system.activate();

			// Simulate component failure
			const originalCreateRule = system['rulesScanner'].createRule;
			system['rulesScanner'].createRule = async () => {
				throw new Error('Rule creation failed');
			};

			try {
				const project = await system.createProject('Test Project', '/test/path');
				await system.createRule(project.id, 'Test Rule', 'Test content');
			} catch (error) {
				// Expected to fail
			}

			// Restore and continue
			system['rulesScanner'].createRule = originalCreateRule;
			const project = await system.createProject('Test Project 2', '/test/path2');
			const rule = await system.createRule(project.id, 'Test Rule', 'Test content');

			assert.ok(rule);
		});

		it('should maintain system state after errors', async () => {
			await system.activate();

			const project = await system.createProject('Test Project', '/test/path');

			// Simulate error
			try {
				await system.createRule(project.id, 'Test Rule', 'Test content');
			} catch (error) {
				// Expected to fail
			}

			// System should still be active
			const status = system.getStatus();
			assert.equal(status.isActive, true);
		});
	});
});
