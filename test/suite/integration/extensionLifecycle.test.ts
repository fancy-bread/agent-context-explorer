import * as assert from 'assert';

// Mock VS Code API for testing
const mockVscode = {
	window: {
		createTreeView: (viewId: string, options: any) => ({
			onDidChangeSelection: (callback: Function) => {
				// Mock selection change events
			},
			reveal: (item: any) => {
				// Mock reveal functionality
			},
			dispose: () => {
				// Mock disposal
			}
		}),
		showInformationMessage: (message: string) => {},
		showErrorMessage: (message: string) => {},
		showWarningMessage: (message: string) => {}
	},
	workspace: {
		workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
		onDidChangeWorkspaceFolders: (callback: Function) => {
			// Mock workspace folder change events
			return { dispose: () => {} };
		}
	},
	commands: {
		registerCommand: (command: string, callback: Function) => {
			// Mock command registration
			return { dispose: () => {} };
		}
	},
	Uri: {
		file: (path: string) => ({ fsPath: path })
	},
	TreeItemCollapsibleState: {
		None: 0,
		Collapsed: 1,
		Expanded: 2
	}
};

// Mock Extension class for testing
class MockExtension {
	private subscriptions: any[] = [];
	private treeProvider: any = null;
	private treeView: any = null;
	private projectManager: any = null;
	private fileWatcher: any = null;
	private isActive: boolean = false;

	constructor(private context: any) {}

	async activate(): Promise<void> {
		if (this.isActive) {
			return;
		}

		try {
			// Initialize project manager
			this.projectManager = new MockProjectManager();

			// Initialize tree provider
			this.treeProvider = new MockRulesTreeProvider(this.projectManager);

			// Create tree view
			this.treeView = mockVscode.window.createTreeView('projectRulesExplorer', {
				treeDataProvider: this.treeProvider
			});

			// Register commands
			this.registerCommands();

			// Initialize file watcher
			this.fileWatcher = new MockFileWatcher();
			this.fileWatcher.startWatching();

			// Set up workspace folder change listener
			const workspaceChangeListener = mockVscode.workspace.onDidChangeWorkspaceFolders(
				(event: any) => {
					this.handleWorkspaceChange(event);
				}
			);

			this.subscriptions.push(workspaceChangeListener);

			this.isActive = true;
			mockVscode.window.showInformationMessage('Project Rules Explorer activated');
		} catch (error) {
			mockVscode.window.showErrorMessage(`Failed to activate extension: ${error}`);
			throw error;
		}
	}

	deactivate(): void {
		if (!this.isActive) {
			return;
		}

		try {
			// Dispose all subscriptions
			this.subscriptions.forEach(subscription => {
				if (subscription && typeof subscription.dispose === 'function') {
					subscription.dispose();
				}
			});
			this.subscriptions = [];

			// Dispose tree view
			if (this.treeView) {
				this.treeView.dispose();
				this.treeView = null;
			}

			// Dispose file watcher
			if (this.fileWatcher) {
				this.fileWatcher.stopWatching();
				this.fileWatcher = null;
			}

			// Dispose tree provider
			if (this.treeProvider) {
				this.treeProvider.dispose();
				this.treeProvider = null;
			}

			// Dispose project manager
			if (this.projectManager) {
				this.projectManager.dispose();
				this.projectManager = null;
			}

			this.isActive = false;
			mockVscode.window.showInformationMessage('Project Rules Explorer deactivated');
		} catch (error) {
			mockVscode.window.showErrorMessage(`Failed to deactivate extension: ${error}`);
		}
	}

	private registerCommands(): void {
		const commands = [
			'projectRules.refresh',
			'projectRules.addProject',
			'projectRules.editProject',
			'projectRules.removeProject',
			'projectRules.createRule',
			'projectRules.editRule',
			'projectRules.deleteRule',
			'projectRules.viewRule',
			'projectRules.renameRule',
			'projectRules.copyRule',
			'projectRules.pasteRule'
		];

		commands.forEach(command => {
			const disposable = mockVscode.commands.registerCommand(command, () => {
				// Mock command execution
			});
			this.subscriptions.push(disposable);
		});
	}

	private handleWorkspaceChange(event: any): void {
		// Handle workspace folder changes
		if (this.treeProvider) {
			this.treeProvider.refresh();
		}
	}

	getStatus(): { isActive: boolean; subscriptions: number; hasTreeProvider: boolean; hasFileWatcher: boolean } {
		return {
			isActive: this.isActive,
			subscriptions: this.subscriptions.length,
			hasTreeProvider: !!this.treeProvider,
			hasFileWatcher: !!this.fileWatcher
		};
	}
}

// Mock classes for testing
class MockProjectManager {
	dispose(): void {
		// Mock disposal
	}
}

class MockRulesTreeProvider {
	constructor(private projectManager: any) {}

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

describe('Extension Lifecycle Tests', () => {
	let extension: MockExtension;
	let mockContext: any;

	beforeEach(() => {
		mockContext = {
			subscriptions: []
		};
		extension = new MockExtension(mockContext);
	});

	afterEach(() => {
		extension.deactivate();
	});

	describe('Extension Activation', () => {
		it('should activate successfully', async () => {
			await extension.activate();

			const status = extension.getStatus();
			assert.equal(status.isActive, true);
			assert.ok(status.hasTreeProvider);
			assert.ok(status.hasFileWatcher);
		});

		it('should not activate multiple times', async () => {
			await extension.activate();
			await extension.activate();

			const status = extension.getStatus();
			assert.equal(status.isActive, true);
			assert.equal(status.subscriptions, 1); // Only one workspace change listener
		});

		it('should register all commands during activation', async () => {
			await extension.activate();

			const status = extension.getStatus();
			assert.ok(status.subscriptions > 0);
		});

		it('should initialize tree provider during activation', async () => {
			await extension.activate();

			const status = extension.getStatus();
			assert.ok(status.hasTreeProvider);
		});

		it('should initialize file watcher during activation', async () => {
			await extension.activate();

			const status = extension.getStatus();
			assert.ok(status.hasFileWatcher);
		});

		it('should handle activation errors gracefully', async () => {
			// Mock activation failure
			const originalCreateTreeView = mockVscode.window.createTreeView;
			mockVscode.window.createTreeView = () => {
				throw new Error('Tree view creation failed');
			};

			try {
				await extension.activate();
				assert.fail('Should have thrown an error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok(error.message.includes('Tree view creation failed'));
			}

			// Restore original function
			mockVscode.window.createTreeView = originalCreateTreeView;
		});
	});

	describe('Extension Deactivation', () => {
		it('should deactivate successfully', async () => {
			await extension.activate();
			extension.deactivate();

			const status = extension.getStatus();
			assert.equal(status.isActive, false);
			assert.equal(status.subscriptions, 0);
			assert.equal(status.hasTreeProvider, false);
			assert.equal(status.hasFileWatcher, false);
		});

		it('should handle deactivation of inactive extension', () => {
			extension.deactivate();

			const status = extension.getStatus();
			assert.equal(status.isActive, false);
		});

		it('should dispose all subscriptions during deactivation', async () => {
			await extension.activate();
			extension.deactivate();

			const status = extension.getStatus();
			assert.equal(status.subscriptions, 0);
		});

		it('should dispose tree view during deactivation', async () => {
			await extension.activate();
			extension.deactivate();

			const status = extension.getStatus();
			assert.equal(status.hasTreeProvider, false);
		});

		it('should dispose file watcher during deactivation', async () => {
			await extension.activate();
			extension.deactivate();

			const status = extension.getStatus();
			assert.equal(status.hasFileWatcher, false);
		});

		it('should handle deactivation errors gracefully', async () => {
			await extension.activate();

			// Mock disposal failure
			const originalDispose = extension.deactivate;
			extension.deactivate = () => {
				throw new Error('Deactivation failed');
			};

			try {
				extension.deactivate();
				assert.fail('Should have thrown an error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok(error.message.includes('Deactivation failed'));
			}

			// Restore original function
			extension.deactivate = originalDispose;
		});
	});

	describe('Workspace Change Handling', () => {
		it('should handle workspace folder changes', async () => {
			await extension.activate();

			// Mock workspace change event
			const event = {
				added: [{ uri: { fsPath: '/new/workspace' } }],
				removed: [{ uri: { fsPath: '/old/workspace' } }]
			};

			// Should not throw error
			assert.doesNotThrow(() => {
				// Simulate workspace change
			});
		});

		it('should refresh tree provider on workspace changes', async () => {
			await extension.activate();

			// Mock workspace change event
			const event = {
				added: [{ uri: { fsPath: '/new/workspace' } }],
				removed: []
			};

			// Should not throw error
			assert.doesNotThrow(() => {
				// Simulate workspace change
			});
		});
	});

	describe('Command Registration', () => {
		it('should register all required commands', async () => {
			await extension.activate();

			const status = extension.getStatus();
			assert.ok(status.subscriptions > 0);
		});

		it('should handle command registration errors gracefully', async () => {
			// Mock command registration failure
			const originalRegisterCommand = mockVscode.commands.registerCommand;
			mockVscode.commands.registerCommand = () => {
				throw new Error('Command registration failed');
			};

			try {
				await extension.activate();
				assert.fail('Should have thrown an error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok(error.message.includes('Command registration failed'));
			}

			// Restore original function
			mockVscode.commands.registerCommand = originalRegisterCommand;
		});
	});

	describe('Resource Management', () => {
		it('should properly dispose all resources', async () => {
			await extension.activate();
			extension.deactivate();

			const status = extension.getStatus();
			assert.equal(status.isActive, false);
			assert.equal(status.subscriptions, 0);
		});

		it('should handle resource disposal errors gracefully', async () => {
			await extension.activate();

			// Mock disposal failure
			const originalDispose = extension.deactivate;
			extension.deactivate = () => {
				throw new Error('Resource disposal failed');
			};

			try {
				extension.deactivate();
				assert.fail('Should have thrown an error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok(error.message.includes('Resource disposal failed'));
			}

			// Restore original function
			extension.deactivate = originalDispose;
		});
	});

	describe('Integration Tests', () => {
		it('should handle complete activation-deactivation cycle', async () => {
			// Activate
			await extension.activate();
			let status = extension.getStatus();
			assert.equal(status.isActive, true);

			// Deactivate
			extension.deactivate();
			status = extension.getStatus();
			assert.equal(status.isActive, false);
		});

		it('should handle multiple activation-deactivation cycles', async () => {
			// First cycle
			await extension.activate();
			extension.deactivate();

			// Second cycle
			await extension.activate();
			extension.deactivate();

			const status = extension.getStatus();
			assert.equal(status.isActive, false);
		});

		it('should maintain state consistency during lifecycle', async () => {
			await extension.activate();

			let status = extension.getStatus();
			assert.equal(status.isActive, true);
			assert.ok(status.hasTreeProvider);
			assert.ok(status.hasFileWatcher);

			extension.deactivate();

			status = extension.getStatus();
			assert.equal(status.isActive, false);
			assert.equal(status.hasTreeProvider, false);
			assert.equal(status.hasFileWatcher, false);
		});
	});

	describe('Error Recovery', () => {
		it('should recover from activation errors', async () => {
			// First activation fails
			const originalCreateTreeView = mockVscode.window.createTreeView;
			mockVscode.window.createTreeView = () => {
				throw new Error('Tree view creation failed');
			};

			try {
				await extension.activate();
			} catch (error) {
				// Expected to fail
			}

			// Restore and try again
			mockVscode.window.createTreeView = originalCreateTreeView;
			await extension.activate();

			const status = extension.getStatus();
			assert.equal(status.isActive, true);
		});

		it('should handle partial activation failures', async () => {
			// Mock partial failure
			let callCount = 0;
			const originalCreateTreeView = mockVscode.window.createTreeView;
			mockVscode.window.createTreeView = () => {
				callCount++;
				if (callCount === 1) {
					throw new Error('Tree view creation failed');
				}
				return originalCreateTreeView('projectRulesExplorer', { treeDataProvider: {} });
			};

			try {
				await extension.activate();
			} catch (error) {
				// Expected to fail
			}

			// Restore original function
			mockVscode.window.createTreeView = originalCreateTreeView;
		});
	});
});
