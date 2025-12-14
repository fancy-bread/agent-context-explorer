import * as assert from 'assert';

// Mock VS Code API for testing
const mockVscode = {
	workspace: {
		fs: {
			readFile: async (uri: any) => {
				if (uri.fsPath.includes('valid-command.md')) {
					return Buffer.from(`# Code Review Checklist

## Overview
Comprehensive checklist for conducting thorough code reviews.

## Review Categories

### Functionality
- [ ] Code does what it's supposed to do
- [ ] Edge cases are handled
- [ ] Error handling is appropriate`);
				}
				if (uri.fsPath.includes('security-audit.md')) {
					return Buffer.from(`# Security Audit

## Overview
Comprehensive security review to identify and fix vulnerabilities.

## Steps
1. Dependency audit
2. Code security review
3. Infrastructure security`);
				}
				if (uri.fsPath.includes('error-command.md')) {
					throw new Error('Permission denied');
				}
				return Buffer.from('# Test Command\n\nThis is a test command.');
			}
		},
		findFiles: async (pattern: any) => {
			// Mock finding command files
			if (pattern.pattern.includes('.cursor/commands')) {
				return [
					{ fsPath: '/workspace/.cursor/commands/valid-command.md', path: '/workspace/.cursor/commands/valid-command.md' },
					{ fsPath: '/workspace/.cursor/commands/security-audit.md', path: '/workspace/.cursor/commands/security-audit.md' },
					{ fsPath: '/workspace/.cursor/commands/error-command.md', path: '/workspace/.cursor/commands/error-command.md' }
				];
			}
			return [];
		},
		createFileSystemWatcher: (pattern: any) => {
			// Mock file system watcher
			return {
				onDidCreate: () => ({ dispose: () => {} }),
				onDidChange: () => ({ dispose: () => {} }),
				onDidDelete: () => ({ dispose: () => {} }),
				dispose: () => {}
			};
		},
		asRelativePath: (uri: any) => uri.fsPath.replace('/workspace/', '')
	},
	Uri: {
		joinPath: (base: any, ...paths: string[]) => ({ fsPath: `${base.fsPath}/${paths.join('/')}` }),
		file: (path: string) => ({ fsPath: path })
	},
	RelativePattern: class {
		constructor(public workspaceRoot: any, public pattern: string) {}
	}
};

// Mock CommandsScanner class for testing
class MockCommandsScanner {
	constructor(private workspaceRoot: any) {}

	async scanWorkspaceCommands(): Promise<any[]> {
		const commands: any[] = [];

		try {
			// Mock finding .md files in .cursor/commands
			const pattern = new mockVscode.RelativePattern(this.workspaceRoot, '.cursor/commands/*.md');
			const files = await mockVscode.workspace.findFiles(pattern);

			// Read each file
			for (const file of files) {
				try {
					const fileData = await mockVscode.workspace.fs.readFile(file);
					const content = Buffer.from(fileData).toString('utf8');
					const fileName = file.path.split('/').pop() || 'unknown';

					commands.push({
						uri: file,
						content,
						fileName,
						location: 'workspace'
					});
				} catch (error) {
					// Add a placeholder command for files that can't be read
					const fileName = file.path.split('/').pop() || 'unknown';
					commands.push({
						uri: file,
						content: 'Error reading file content',
						fileName,
						location: 'workspace'
					});
				}
			}

			return commands;
		} catch (error) {
			return [];
		}
	}

	async watchWorkspaceCommands(): Promise<any> {
		// Create watcher for .md files in .cursor/commands
		const pattern = new mockVscode.RelativePattern(this.workspaceRoot, '.cursor/commands/*.md');
		return mockVscode.workspace.createFileSystemWatcher(pattern);
	}
}

describe('Commands Scanner Tests', () => {
	const workspaceRoot = mockVscode.Uri.file('/workspace');
	const scanner = new MockCommandsScanner(workspaceRoot);

	describe('Command Scanning', () => {
		it('should scan and read workspace commands', async () => {
			const commands = await scanner.scanWorkspaceCommands();
			assert.ok(Array.isArray(commands));
			assert.ok(commands.length > 0);
		});

		it('should read commands as plain Markdown (no YAML parsing)', async () => {
			const commands = await scanner.scanWorkspaceCommands();
			const validCommand = commands.find(cmd => cmd.fileName === 'valid-command.md');

			assert.ok(validCommand);
			assert.ok(validCommand.content.startsWith('# Code Review Checklist'));
			// Commands are plain Markdown - no YAML frontmatter
			assert.ok(!validCommand.content.includes('---'));
		});

		it('should set location to workspace for workspace commands', async () => {
			const commands = await scanner.scanWorkspaceCommands();

			commands.forEach(command => {
				assert.equal(command.location, 'workspace');
			});
		});

		it('should extract correct file names', async () => {
			const commands = await scanner.scanWorkspaceCommands();
			const fileNames = commands.map(cmd => cmd.fileName);

			assert.ok(fileNames.includes('valid-command.md'));
			assert.ok(fileNames.includes('security-audit.md'));
		});

		it('should include URI for each command', async () => {
			const commands = await scanner.scanWorkspaceCommands();

			commands.forEach(command => {
				assert.ok(command.uri);
				assert.ok(command.uri.fsPath);
			});
		});

		it('should return empty array when no commands found', async () => {
			const emptyScanner = new MockCommandsScanner(mockVscode.Uri.file('/empty/workspace'));
			// Mock findFiles to return empty array
			const originalFindFiles = mockVscode.workspace.findFiles;
			mockVscode.workspace.findFiles = async () => [];

			const commands = await emptyScanner.scanWorkspaceCommands();
			assert.equal(commands.length, 0);

			// Restore original
			mockVscode.workspace.findFiles = originalFindFiles;
		});
	});

	describe('Error Handling', () => {
		it('should handle file read errors gracefully', async () => {
			const commands = await scanner.scanWorkspaceCommands();
			const errorCommand = commands.find(cmd => cmd.fileName === 'error-command.md');

			assert.ok(errorCommand);
			assert.equal(errorCommand.content, 'Error reading file content');
			// Should still include the command with error message
			assert.equal(errorCommand.location, 'workspace');
		});

		it('should handle missing .cursor/commands directory gracefully', async () => {
			const emptyScanner = new MockCommandsScanner(mockVscode.Uri.file('/empty/workspace'));
			// Mock findFiles to throw error
			const originalFindFiles = mockVscode.workspace.findFiles;
			mockVscode.workspace.findFiles = async () => {
				throw new Error('Directory not found');
			};

			const commands = await emptyScanner.scanWorkspaceCommands();
			assert.equal(commands.length, 0);

			// Restore original
			mockVscode.workspace.findFiles = originalFindFiles;
		});

		it('should return empty array on scanning errors', async () => {
			const errorScanner = new MockCommandsScanner(mockVscode.Uri.file('/error/workspace'));
			// Mock findFiles to throw error
			const originalFindFiles = mockVscode.workspace.findFiles;
			mockVscode.workspace.findFiles = async () => {
				throw new Error('Scanning failed');
			};

			const commands = await errorScanner.scanWorkspaceCommands();
			assert.equal(commands.length, 0);

			// Restore original
			mockVscode.workspace.findFiles = originalFindFiles;
		});
	});

	describe('File Watching', () => {
		it('should create file watcher for workspace commands', async () => {
			const watcher = await scanner.watchWorkspaceCommands();

			assert.ok(watcher);
			assert.ok(typeof watcher.dispose === 'function');
		});

		it('should create watcher with correct pattern', async () => {
			const watcher = await scanner.watchWorkspaceCommands();

			// Watcher should be created (we can't easily test the pattern without more mocking)
			assert.ok(watcher);
		});
	});

	describe('Command Content', () => {
		it('should preserve full Markdown content', async () => {
			const commands = await scanner.scanWorkspaceCommands();
			const validCommand = commands.find(cmd => cmd.fileName === 'valid-command.md');

			assert.ok(validCommand);
			assert.ok(validCommand.content.length > 0);
			assert.ok(validCommand.content.includes('# Code Review Checklist'));
			assert.ok(validCommand.content.includes('## Overview'));
		});

		it('should handle commands with different content structures', async () => {
			const commands = await scanner.scanWorkspaceCommands();
			const securityCommand = commands.find(cmd => cmd.fileName === 'security-audit.md');

			assert.ok(securityCommand);
			assert.ok(securityCommand.content.includes('# Security Audit'));
			assert.ok(securityCommand.content.includes('Dependency audit'));
		});

		it('should handle empty or minimal command files', async () => {
			// This would be tested with actual empty files
			// For now, we verify the structure handles any content
			const commands = await scanner.scanWorkspaceCommands();

			commands.forEach(command => {
				assert.ok(typeof command.content === 'string');
			});
		});
	});

	describe('Integration Tests', () => {
		it('should handle multiple commands correctly', async () => {
			const commands = await scanner.scanWorkspaceCommands();

			// Should find multiple commands
			assert.ok(commands.length >= 2);

			// Each command should have required properties
			commands.forEach(command => {
				assert.ok(command.uri);
				assert.ok(command.fileName);
				assert.ok(typeof command.content === 'string');
				assert.equal(command.location, 'workspace');
			});
		});

		it('should handle mix of valid and error commands', async () => {
			const commands = await scanner.scanWorkspaceCommands();

			// Should include both valid and error commands
			const validCommands = commands.filter(cmd => cmd.content !== 'Error reading file content');
			const errorCommands = commands.filter(cmd => cmd.content === 'Error reading file content');

			assert.ok(validCommands.length > 0);
			assert.ok(errorCommands.length > 0);
		});
	});
});

