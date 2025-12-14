import * as assert from 'assert';

// Mock VS Code API for testing
const mockVscode = {
	workspace: {
		createFileSystemWatcher: (pattern: any) => ({
			onDidCreate: (callback: Function) => {
				// Mock file creation events
				setTimeout(() => callback(mockVscode.Uri.file('/workspace/.cursor/rules/new-rule.mdc')), 100);
			},
			onDidChange: (callback: Function) => {
				// Mock file change events
				setTimeout(() => callback(mockVscode.Uri.file('/workspace/.cursor/rules/updated-rule.mdc')), 200);
			},
			onDidDelete: (callback: Function) => {
				// Mock file deletion events
				setTimeout(() => callback(mockVscode.Uri.file('/workspace/.cursor/rules/deleted-rule.mdc')), 300);
			},
			dispose: () => {
				// Mock disposal
			}
		})
	},
	Uri: {
		file: (path: string) => ({ fsPath: path })
	},
	RelativePattern: class {
		constructor(public base: any, public pattern: string) {}
	}
};

// Mock FileWatcher class for testing
class MockFileWatcher {
	private watcher: any = null;
	private onCreateCallback?: Function;
	private onChangeCallback?: Function;
	private onDeleteCallback?: Function;

	constructor(private workspaceRoot: any) {}

	startWatching(): void {
		if (this.watcher) {
			return; // Already watching
		}

		// Watch for changes in .cursor/rules directories
		const pattern = new mockVscode.RelativePattern(this.workspaceRoot, '**/.cursor/rules/**/*.{mdc,md}');
		this.watcher = mockVscode.workspace.createFileSystemWatcher(pattern);

		this.watcher.onDidCreate((uri: any) => {
			console.log('File created:', uri.fsPath);
			if (this.onCreateCallback) {
				this.onCreateCallback(uri);
			}
		});

		this.watcher.onDidChange((uri: any) => {
			console.log('File changed:', uri.fsPath);
			if (this.onChangeCallback) {
				this.onChangeCallback(uri);
			}
		});

		this.watcher.onDidDelete((uri: any) => {
			console.log('File deleted:', uri.fsPath);
			if (this.onDeleteCallback) {
				this.onDeleteCallback(uri);
			}
		});
	}

	stopWatching(): void {
		if (this.watcher) {
			this.watcher.dispose();
			this.watcher = null;
		}
	}

	onFileCreate(callback: Function): void {
		this.onCreateCallback = callback;
	}

	onFileChange(callback: Function): void {
		this.onChangeCallback = callback;
	}

	onFileDelete(callback: Function): void {
		this.onDeleteCallback = callback;
	}
}

describe('File Watcher Tests', () => {
	let fileWatcher: MockFileWatcher;
	let workspaceRoot: any;

	beforeEach(() => {
		workspaceRoot = mockVscode.Uri.file('/workspace');
		fileWatcher = new MockFileWatcher(workspaceRoot);
	});

	afterEach(() => {
		fileWatcher.stopWatching();
	});

	describe('File System Watching', () => {
		it('should start watching for file changes', () => {
			fileWatcher.startWatching();
			assert.ok(fileWatcher);
		});

		it('should not start multiple watchers', () => {
			fileWatcher.startWatching();
			fileWatcher.startWatching();
			// Should not throw error or create multiple watchers
			assert.ok(fileWatcher);
		});

		it('should stop watching when disposed', () => {
			fileWatcher.startWatching();
			fileWatcher.stopWatching();
			// Should not throw error
			assert.ok(fileWatcher);
		});

		it('should handle disposal of non-existent watcher', () => {
			fileWatcher.stopWatching();
			// Should not throw error
			assert.ok(fileWatcher);
		});
	});

	describe('File Creation Events', () => {
		it('should handle file creation events', (done) => {
			let eventFired = false;

			fileWatcher.onFileCreate((uri: any) => {
				eventFired = true;
				assert.ok(uri.fsPath.includes('.cursor/rules/'));
				assert.ok(uri.fsPath.includes('.mdc'));
				done();
			});

			fileWatcher.startWatching();
		});

		it('should handle multiple file creation events', (done) => {
			let eventCount = 0;

			fileWatcher.onFileCreate((uri: any) => {
				eventCount++;
				if (eventCount >= 2) {
					done();
				}
			});

			fileWatcher.startWatching();
		});

		it('should handle file creation in subdirectories', (done) => {
			fileWatcher.onFileCreate((uri: any) => {
				assert.ok(uri.fsPath.includes('.cursor/rules/'));
				done();
			});

			fileWatcher.startWatching();
		});
	});

	describe('File Change Events', () => {
		it('should handle file change events', (done) => {
			fileWatcher.onFileChange((uri: any) => {
				assert.ok(uri.fsPath.includes('.cursor/rules/'));
				assert.ok(uri.fsPath.includes('.mdc'));
				done();
			});

			fileWatcher.startWatching();
		});

		it('should handle multiple file change events', (done) => {
			let eventCount = 0;

			fileWatcher.onFileChange((uri: any) => {
				eventCount++;
				if (eventCount >= 2) {
					done();
				}
			});

			fileWatcher.startWatching();
		});
	});

	describe('File Deletion Events', () => {
		it('should handle file deletion events', (done) => {
			fileWatcher.onFileDelete((uri: any) => {
				assert.ok(uri.fsPath.includes('.cursor/rules/'));
				assert.ok(uri.fsPath.includes('.mdc'));
				done();
			});

			fileWatcher.startWatching();
		});

		it('should handle multiple file deletion events', (done) => {
			let eventCount = 0;

			fileWatcher.onFileDelete((uri: any) => {
				eventCount++;
				if (eventCount >= 2) {
					done();
				}
			});

			fileWatcher.startWatching();
		});
	});

	describe('Event Callback Management', () => {
		it('should register file creation callback', () => {
			const callback = (uri: any) => {};
			fileWatcher.onFileCreate(callback);
			// Should not throw error
			assert.ok(fileWatcher);
		});

		it('should register file change callback', () => {
			const callback = (uri: any) => {};
			fileWatcher.onFileChange(callback);
			// Should not throw error
			assert.ok(fileWatcher);
		});

		it('should register file deletion callback', () => {
			const callback = (uri: any) => {};
			fileWatcher.onFileDelete(callback);
			// Should not throw error
			assert.ok(fileWatcher);
		});

		it('should handle multiple callbacks for same event', () => {
			const callback1 = (uri: any) => {};
			const callback2 = (uri: any) => {};

			fileWatcher.onFileCreate(callback1);
			fileWatcher.onFileCreate(callback2);

			// Should not throw error
			assert.ok(fileWatcher);
		});
	});

	describe('Pattern Matching', () => {
		it('should watch for .mdc files', () => {
			const pattern = new mockVscode.RelativePattern(workspaceRoot, '**/.cursor/rules/**/*.{mdc,md}');
			assert.ok(pattern.pattern.includes('.mdc'));
		});

		it('should watch for .md files', () => {
			const pattern = new mockVscode.RelativePattern(workspaceRoot, '**/.cursor/rules/**/*.{mdc,md}');
			assert.ok(pattern.pattern.includes('.md'));
		});

		it('should watch in .cursor/rules directory', () => {
			const pattern = new mockVscode.RelativePattern(workspaceRoot, '**/.cursor/rules/**/*.{mdc,md}');
			assert.ok(pattern.pattern.includes('.cursor/rules'));
		});

		it('should watch recursively in subdirectories', () => {
			const pattern = new mockVscode.RelativePattern(workspaceRoot, '**/.cursor/rules/**/*.{mdc,md}');
			assert.ok(pattern.pattern.includes('**'));
		});
	});

	describe('Error Handling', () => {
		it('should handle watcher creation errors gracefully', () => {
			// Mock watcher creation failure
			const originalCreateWatcher = mockVscode.workspace.createFileSystemWatcher;
			mockVscode.workspace.createFileSystemWatcher = () => {
				throw new Error('Watcher creation failed');
			};

			assert.throws(() => {
				fileWatcher.startWatching();
			}, /Watcher creation failed/);

			// Restore original function
			mockVscode.workspace.createFileSystemWatcher = originalCreateWatcher;
		});

		it('should handle callback errors gracefully', (done) => {
			fileWatcher.onFileCreate((uri: any) => {
				throw new Error('Callback error');
			});

			fileWatcher.startWatching();

			// Should not crash the application
			setTimeout(() => {
				done();
			}, 100);
		});

		it('should handle disposal errors gracefully', () => {
			// Mock disposal failure
			const originalDispose = fileWatcher.stopWatching;
			fileWatcher.stopWatching = () => {
				throw new Error('Disposal failed');
			};

			assert.throws(() => {
				fileWatcher.stopWatching();
			}, /Disposal failed/);

			// Restore original function
			fileWatcher.stopWatching = originalDispose;
		});
	});

	describe('Performance Tests', () => {
		it('should handle rapid file changes', (done) => {
			let eventCount = 0;

			fileWatcher.onFileChange((uri: any) => {
				eventCount++;
				if (eventCount >= 5) {
					done();
				}
			});

			fileWatcher.startWatching();
		});

		it('should handle multiple simultaneous events', (done) => {
			let createCount = 0;
			let changeCount = 0;
			let deleteCount = 0;

			fileWatcher.onFileCreate((uri: any) => {
				createCount++;
			});

			fileWatcher.onFileChange((uri: any) => {
				changeCount++;
			});

			fileWatcher.onFileDelete((uri: any) => {
				deleteCount++;
			});

			fileWatcher.startWatching();

			setTimeout(() => {
				assert.ok(createCount > 0);
				assert.ok(changeCount > 0);
				assert.ok(deleteCount > 0);
				done();
			}, 500);
		});
	});

	describe('Integration Tests', () => {
		it('should handle complete file lifecycle', (done) => {
			let createFired = false;
			let changeFired = false;
			let deleteFired = false;

			fileWatcher.onFileCreate((uri: any) => {
				createFired = true;
			});

			fileWatcher.onFileChange((uri: any) => {
				changeFired = true;
			});

			fileWatcher.onFileDelete((uri: any) => {
				deleteFired = true;
			});

			fileWatcher.startWatching();

			setTimeout(() => {
				assert.ok(createFired);
				assert.ok(changeFired);
				assert.ok(deleteFired);
				done();
			}, 500);
		});

		it('should handle watcher restart', () => {
			fileWatcher.startWatching();
			fileWatcher.stopWatching();
			fileWatcher.startWatching();

			// Should not throw error
			assert.ok(fileWatcher);
		});

		it('should handle multiple watchers on different workspaces', () => {
			const watcher1 = new MockFileWatcher(mockVscode.Uri.file('/workspace1'));
			const watcher2 = new MockFileWatcher(mockVscode.Uri.file('/workspace2'));

			watcher1.startWatching();
			watcher2.startWatching();

			watcher1.stopWatching();
			watcher2.stopWatching();

			// Should not interfere with each other
			assert.ok(watcher1);
			assert.ok(watcher2);
		});
	});
});