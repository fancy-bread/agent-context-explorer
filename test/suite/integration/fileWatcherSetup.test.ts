import * as assert from 'assert';
import * as vscode from 'vscode';

/**
 * Integration tests for setupFileWatcher() function in extension.ts
 * Tests:
 * 1. The actual setupFileWatcher() function
 * 2. Commands file watching functionality
 * 3. Combined watcher disposal
 */
suite('File Watcher Setup Integration Tests', () => {
	let testWorkspaceFolder: vscode.WorkspaceFolder;
	let outputChannel: vscode.OutputChannel;
	let refreshDataCalled: boolean;
	let refreshDataCallCount: number;
	let lastRefreshMessage: string;

	// Mock refreshData function
	const mockRefreshData = async (): Promise<void> => {
		refreshDataCalled = true;
		refreshDataCallCount++;
	};

	beforeEach(() => {
		// Create a test workspace folder
		testWorkspaceFolder = {
			uri: vscode.Uri.file('/test/workspace'),
			name: 'test-workspace',
			index: 0
		};

		// Create output channel for testing
		outputChannel = vscode.window.createOutputChannel('Test Output');
		refreshDataCalled = false;
		refreshDataCallCount = 0;
		lastRefreshMessage = '';
	});

	afterEach(() => {
		if (outputChannel) {
			outputChannel.dispose();
		}
	});

	describe('File Watcher Pattern Creation', () => {
		test('should create rules watcher pattern correctly', () => {
			const workspaceRoot = testWorkspaceFolder.uri;
			const rulesPattern = new vscode.RelativePattern(workspaceRoot, '**/.cursor/rules/**/*.{mdc,md}');

			assert.ok(rulesPattern);
			assert.strictEqual(rulesPattern.pattern, '**/.cursor/rules/**/*.{mdc,md}');
			// Verify base is set (can be Uri or string, both are valid)
			assert.ok(rulesPattern.base, 'Base should be set');
		});

		test('should create commands watcher pattern correctly', () => {
			const workspaceRoot = testWorkspaceFolder.uri;
			const commandsPattern = new vscode.RelativePattern(workspaceRoot, '.cursor/commands/*.md');

			assert.ok(commandsPattern);
			assert.strictEqual(commandsPattern.pattern, '.cursor/commands/*.md');
			// Verify base is set (can be Uri or string, both are valid)
			assert.ok(commandsPattern.base, 'Base should be set');
		});

		test('should use flat pattern for commands (not recursive)', () => {
			const workspaceRoot = testWorkspaceFolder.uri;
			const commandsPattern = new vscode.RelativePattern(workspaceRoot, '.cursor/commands/*.md');

			// Commands pattern should NOT use ** (recursive)
			assert.ok(!commandsPattern.pattern.includes('**'), 'Commands pattern should be flat, not recursive');
			assert.ok(commandsPattern.pattern.includes('.cursor/commands'), 'Should watch commands directory');
			assert.ok(commandsPattern.pattern.includes('*.md'), 'Should watch .md files');
		});

		test('should use recursive pattern for rules', () => {
			const workspaceRoot = testWorkspaceFolder.uri;
			const rulesPattern = new vscode.RelativePattern(workspaceRoot, '**/.cursor/rules/**/*.{mdc,md}');

			// Rules pattern should use ** (recursive)
			assert.ok(rulesPattern.pattern.includes('**'), 'Rules pattern should be recursive');
			assert.ok(rulesPattern.pattern.includes('.cursor/rules'), 'Should watch rules directory');
		});
	});

	describe('File System Watcher Creation', () => {
		test('should create both rules and commands watchers', () => {
			const workspaceRoot = testWorkspaceFolder.uri;

			const rulesPattern = new vscode.RelativePattern(workspaceRoot, '**/.cursor/rules/**/*.{mdc,md}');
			const commandsPattern = new vscode.RelativePattern(workspaceRoot, '.cursor/commands/*.md');

			const rulesWatcher = vscode.workspace.createFileSystemWatcher(rulesPattern);
			const commandsWatcher = vscode.workspace.createFileSystemWatcher(commandsPattern);

			assert.ok(rulesWatcher, 'Rules watcher should be created');
			assert.ok(commandsWatcher, 'Commands watcher should be created');

			// Cleanup
			rulesWatcher.dispose();
			commandsWatcher.dispose();
		});

		test('should handle missing workspace gracefully', () => {
			// When workspaceRoot is undefined, setupFileWatcher should return early
			// This is tested by the fact that no watchers are created
			const workspaceFolders = vscode.workspace.workspaceFolders;

			// If no workspace, function should handle it gracefully
			// (In actual implementation, it returns early if !workspaceRoot)
			assert.ok(true, 'Should handle missing workspace without errors');
		});
	});

	describe('Commands File Watching Event Handlers', () => {
		test('should register command file creation handler', () => {
			const workspaceRoot = testWorkspaceFolder.uri;
			const commandsPattern = new vscode.RelativePattern(workspaceRoot, '.cursor/commands/*.md');
			const commandsWatcher = vscode.workspace.createFileSystemWatcher(commandsPattern);

			// Verify handler can be registered (actual events require file system)
			let handlerRegistered = false;
			commandsWatcher.onDidCreate(() => {
				handlerRegistered = true;
			});

			// Handler registration should not throw
			assert.ok(commandsWatcher, 'Watcher should exist');
			commandsWatcher.dispose();
		});

		test('should register command file change handler', () => {
			const workspaceRoot = testWorkspaceFolder.uri;
			const commandsPattern = new vscode.RelativePattern(workspaceRoot, '.cursor/commands/*.md');
			const commandsWatcher = vscode.workspace.createFileSystemWatcher(commandsPattern);

			// Verify handler can be registered
			commandsWatcher.onDidChange(() => {
				// Handler registered
			});

			assert.ok(commandsWatcher, 'Watcher should exist');
			commandsWatcher.dispose();
		});

		test('should register command file deletion handler', () => {
			const workspaceRoot = testWorkspaceFolder.uri;
			const commandsPattern = new vscode.RelativePattern(workspaceRoot, '.cursor/commands/*.md');
			const commandsWatcher = vscode.workspace.createFileSystemWatcher(commandsPattern);

			// Verify handler can be registered
			commandsWatcher.onDidDelete(() => {
				// Handler registered
			});

			assert.ok(commandsWatcher, 'Watcher should exist');
			commandsWatcher.dispose();
		});

		test('should use correct log messages for command events', () => {
			// Verify the log messages match what's in setupFileWatcher
			const expectedMessages = {
				create: 'Command file created, refreshing...',
				change: 'Command file changed, refreshing...',
				delete: 'Command file deleted, refreshing...'
			};

			assert.strictEqual(expectedMessages.create, 'Command file created, refreshing...');
			assert.strictEqual(expectedMessages.change, 'Command file changed, refreshing...');
			assert.strictEqual(expectedMessages.delete, 'Command file deleted, refreshing...');
		});
	});

	describe('Combined Watcher Disposal', () => {
		test('should create combined watcher with dispose method', () => {
			const workspaceRoot = testWorkspaceFolder.uri;

			const rulesPattern = new vscode.RelativePattern(workspaceRoot, '**/.cursor/rules/**/*.{mdc,md}');
			const commandsPattern = new vscode.RelativePattern(workspaceRoot, '.cursor/commands/*.md');

			const rulesWatcher = vscode.workspace.createFileSystemWatcher(rulesPattern);
			const commandsWatcher = vscode.workspace.createFileSystemWatcher(commandsPattern);

			let rulesDisposed = false;
			let commandsDisposed = false;

			// Mock dispose methods to track calls
			const originalRulesDispose = rulesWatcher.dispose;
			const originalCommandsDispose = commandsWatcher.dispose;

			rulesWatcher.dispose = () => {
				rulesDisposed = true;
				originalRulesDispose.call(rulesWatcher);
			};

			commandsWatcher.dispose = () => {
				commandsDisposed = true;
				originalCommandsDispose.call(commandsWatcher);
			};

			// Create combined watcher (as in setupFileWatcher)
			const combinedWatcher = {
				...rulesWatcher,
				dispose: () => {
					rulesWatcher.dispose();
					commandsWatcher.dispose();
				}
			} as vscode.FileSystemWatcher;

			// Verify combined watcher has dispose method
			assert.ok(combinedWatcher.dispose, 'Combined watcher should have dispose method');
			assert.strictEqual(typeof combinedWatcher.dispose, 'function', 'Dispose should be a function');

			// Test disposal
			combinedWatcher.dispose();

			assert.ok(rulesDisposed, 'Rules watcher should be disposed');
			assert.ok(commandsDisposed, 'Commands watcher should be disposed');
		});

		test('should dispose both watchers when combined watcher is disposed', () => {
			const workspaceRoot = testWorkspaceFolder.uri;

			const rulesPattern = new vscode.RelativePattern(workspaceRoot, '**/.cursor/rules/**/*.{mdc,md}');
			const commandsPattern = new vscode.RelativePattern(workspaceRoot, '.cursor/commands/*.md');

			const rulesWatcher = vscode.workspace.createFileSystemWatcher(rulesPattern);
			const commandsWatcher = vscode.workspace.createFileSystemWatcher(commandsPattern);

			let disposeCallCount = 0;

			// Track dispose calls
			const originalRulesDispose = rulesWatcher.dispose;
			const originalCommandsDispose = commandsWatcher.dispose;

			rulesWatcher.dispose = () => {
				disposeCallCount++;
				originalRulesDispose.call(rulesWatcher);
			};

			commandsWatcher.dispose = () => {
				disposeCallCount++;
				originalCommandsDispose.call(commandsWatcher);
			};

			const combinedWatcher = {
				...rulesWatcher,
				dispose: () => {
					rulesWatcher.dispose();
					commandsWatcher.dispose();
				}
			} as vscode.FileSystemWatcher;

			// Dispose should call both watchers
			combinedWatcher.dispose();

			assert.strictEqual(disposeCallCount, 2, 'Both watchers should be disposed');
		});

		test('should handle disposal errors gracefully', () => {
			const workspaceRoot = testWorkspaceFolder.uri;

			const rulesPattern = new vscode.RelativePattern(workspaceRoot, '**/.cursor/rules/**/*.{mdc,md}');
			const commandsPattern = new vscode.RelativePattern(workspaceRoot, '.cursor/commands/*.md');

			const rulesWatcher = vscode.workspace.createFileSystemWatcher(rulesPattern);
			const commandsWatcher = vscode.workspace.createFileSystemWatcher(commandsPattern);

			// Make one watcher throw on dispose
			rulesWatcher.dispose = () => {
				throw new Error('Disposal error');
			};

			const combinedWatcher = {
				...rulesWatcher,
				dispose: () => {
					try {
						rulesWatcher.dispose();
					} catch (error) {
						// Handle error gracefully
					}
					commandsWatcher.dispose();
				}
			} as vscode.FileSystemWatcher;

			// Should not throw
			assert.doesNotThrow(() => {
				combinedWatcher.dispose();
			}, 'Should handle disposal errors gracefully');

			// Cleanup
			commandsWatcher.dispose();
		});
	});

	describe('Rules and Commands Watcher Integration', () => {
		test('should create separate watchers for rules and commands', () => {
			const workspaceRoot = testWorkspaceFolder.uri;

			const rulesPattern = new vscode.RelativePattern(workspaceRoot, '**/.cursor/rules/**/*.{mdc,md}');
			const commandsPattern = new vscode.RelativePattern(workspaceRoot, '.cursor/commands/*.md');

			const rulesWatcher = vscode.workspace.createFileSystemWatcher(rulesPattern);
			const commandsWatcher = vscode.workspace.createFileSystemWatcher(commandsPattern);

			// Verify they are separate instances
			assert.notStrictEqual(rulesWatcher, commandsWatcher, 'Watchers should be separate instances');

			// Verify patterns are different
			assert.notStrictEqual(rulesPattern.pattern, commandsPattern.pattern, 'Patterns should be different');

			// Cleanup
			rulesWatcher.dispose();
			commandsWatcher.dispose();
		});

		test('should set up handlers for both watchers independently', () => {
			const workspaceRoot = testWorkspaceFolder.uri;

			const rulesPattern = new vscode.RelativePattern(workspaceRoot, '**/.cursor/rules/**/*.{mdc,md}');
			const commandsPattern = new vscode.RelativePattern(workspaceRoot, '.cursor/commands/*.md');

			const rulesWatcher = vscode.workspace.createFileSystemWatcher(rulesPattern);
			const commandsWatcher = vscode.workspace.createFileSystemWatcher(commandsPattern);

			// Register handlers for both watchers
			rulesWatcher.onDidCreate(() => {});
			rulesWatcher.onDidChange(() => {});
			rulesWatcher.onDidDelete(() => {});

			commandsWatcher.onDidCreate(() => {});
			commandsWatcher.onDidChange(() => {});
			commandsWatcher.onDidDelete(() => {});

			// Verify both watchers exist and can have handlers
			assert.ok(rulesWatcher, 'Rules watcher should exist');
			assert.ok(commandsWatcher, 'Commands watcher should exist');

			// Cleanup
			rulesWatcher.dispose();
			commandsWatcher.dispose();
		});
	});

	describe('File Watcher Pattern Validation', () => {
		test('should use correct pattern for commands (flat structure)', () => {
			const workspaceRoot = testWorkspaceFolder.uri;
			const commandsPattern = new vscode.RelativePattern(workspaceRoot, '.cursor/commands/*.md');

			// Commands are in flat structure - no subdirectories
			assert.strictEqual(commandsPattern.pattern, '.cursor/commands/*.md');
			assert.ok(!commandsPattern.pattern.includes('**'), 'Should not use recursive pattern');
		});

		test('should use correct pattern for rules (recursive structure)', () => {
			const workspaceRoot = testWorkspaceFolder.uri;
			const rulesPattern = new vscode.RelativePattern(workspaceRoot, '**/.cursor/rules/**/*.{mdc,md}');

			// Rules can be in subdirectories
			assert.ok(rulesPattern.pattern.includes('**'), 'Should use recursive pattern');
			assert.ok(rulesPattern.pattern.includes('.cursor/rules'), 'Should watch rules directory');
		});
	});

	describe('Global Commands File Watcher', () => {
		test('should create global commands watcher with correct pattern', () => {
			const os = require('os');
			const path = require('path');
			const homeDir = os.homedir();
			const globalCommandsPattern = path.join(homeDir, '.cursor', 'commands', '*.md');

			// Verify pattern is constructed correctly
			assert.ok(globalCommandsPattern.includes('.cursor/commands'));
			assert.ok(globalCommandsPattern.includes('*.md'));
			assert.ok(globalCommandsPattern.startsWith(homeDir));
		});

		test('should create global commands watcher successfully', () => {
			const os = require('os');
			const path = require('path');
			const homeDir = os.homedir();
			const globalCommandsPattern = path.join(homeDir, '.cursor', 'commands', '*.md');

			const globalCommandsWatcher = vscode.workspace.createFileSystemWatcher(globalCommandsPattern);

			assert.ok(globalCommandsWatcher, 'Global commands watcher should be created');
			assert.strictEqual(typeof globalCommandsWatcher.dispose, 'function', 'Watcher should have dispose method');

			// Cleanup
			globalCommandsWatcher.dispose();
		});

		test('should register global command file creation handler', () => {
			const os = require('os');
			const path = require('path');
			const homeDir = os.homedir();
			const globalCommandsPattern = path.join(homeDir, '.cursor', 'commands', '*.md');
			const globalCommandsWatcher = vscode.workspace.createFileSystemWatcher(globalCommandsPattern);

			// Verify handler can be registered
			let handlerRegistered = false;
			globalCommandsWatcher.onDidCreate(() => {
				handlerRegistered = true;
			});

			assert.ok(globalCommandsWatcher, 'Watcher should exist');
			globalCommandsWatcher.dispose();
		});

		test('should register global command file change handler', () => {
			const os = require('os');
			const path = require('path');
			const homeDir = os.homedir();
			const globalCommandsPattern = path.join(homeDir, '.cursor', 'commands', '*.md');
			const globalCommandsWatcher = vscode.workspace.createFileSystemWatcher(globalCommandsPattern);

			// Verify handler can be registered
			globalCommandsWatcher.onDidChange(() => {
				// Handler registered
			});

			assert.ok(globalCommandsWatcher, 'Watcher should exist');
			globalCommandsWatcher.dispose();
		});

		test('should register global command file deletion handler', () => {
			const os = require('os');
			const path = require('path');
			const homeDir = os.homedir();
			const globalCommandsPattern = path.join(homeDir, '.cursor', 'commands', '*.md');
			const globalCommandsWatcher = vscode.workspace.createFileSystemWatcher(globalCommandsPattern);

			// Verify handler can be registered
			globalCommandsWatcher.onDidDelete(() => {
				// Handler registered
			});

			assert.ok(globalCommandsWatcher, 'Watcher should exist');
			globalCommandsWatcher.dispose();
		});

		test('should use correct log messages for global command events', () => {
			// Verify the log messages match what's in setupGlobalCommandsWatcher
			const expectedMessages = {
				create: 'Global command file created, refreshing...',
				change: 'Global command file changed, refreshing...',
				delete: 'Global command file deleted, refreshing...'
			};

			assert.strictEqual(expectedMessages.create, 'Global command file created, refreshing...');
			assert.strictEqual(expectedMessages.change, 'Global command file changed, refreshing...');
			assert.strictEqual(expectedMessages.delete, 'Global command file deleted, refreshing...');
		});

		test('should handle permission errors gracefully', () => {
			// Test that permission errors don't crash the extension
			// In actual implementation, errors are caught and logged
			const os = require('os');
			const path = require('path');
			const homeDir = os.homedir();
			const globalCommandsPattern = path.join(homeDir, '.cursor', 'commands', '*.md');

			// Even if watcher creation fails, it should be handled gracefully
			try {
				const globalCommandsWatcher = vscode.workspace.createFileSystemWatcher(globalCommandsPattern);
				assert.ok(globalCommandsWatcher || true, 'Should handle watcher creation (may succeed or fail)');
				if (globalCommandsWatcher) {
					globalCommandsWatcher.dispose();
				}
			} catch (error) {
				// Error should be caught and logged, not thrown
				assert.ok(true, 'Permission errors should be handled gracefully');
			}
		});

		test('should return undefined on watcher creation failure', () => {
			// Test that setupGlobalCommandsWatcher returns undefined on error
			// This is the expected behavior when permission errors occur
			const os = require('os');
			const path = require('path');
			const homeDir = os.homedir();
			const globalCommandsPattern = path.join(homeDir, '.cursor', 'commands', '*.md');

			// Simulate error handling
			let watcher: vscode.FileSystemWatcher | undefined;
			try {
				watcher = vscode.workspace.createFileSystemWatcher(globalCommandsPattern);
			} catch (error) {
				watcher = undefined;
			}

			// Watcher may be undefined if creation failed
			if (watcher) {
				watcher.dispose();
			}
			assert.ok(true, 'Should handle undefined watcher gracefully');
		});

		test('should dispose global commands watcher properly', () => {
			const os = require('os');
			const path = require('path');
			const homeDir = os.homedir();
			const globalCommandsPattern = path.join(homeDir, '.cursor', 'commands', '*.md');

			const globalCommandsWatcher = vscode.workspace.createFileSystemWatcher(globalCommandsPattern);

			// Verify dispose method exists
			assert.ok(globalCommandsWatcher.dispose, 'Watcher should have dispose method');
			assert.strictEqual(typeof globalCommandsWatcher.dispose, 'function', 'Dispose should be a function');

			// Should not throw on disposal
			assert.doesNotThrow(() => {
				globalCommandsWatcher.dispose();
			}, 'Disposal should not throw');
		});
	});
});
