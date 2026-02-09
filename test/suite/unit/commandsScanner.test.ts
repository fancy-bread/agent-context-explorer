import * as assert from 'assert';
import { CommandsScanner } from '../../../src/scanner/commandsScanner';

// VSCode stub is loaded from test/vscode-stub (package.json devDependency)
const vscodeStub = require('vscode');

describe('Commands Scanner Tests', () => {
	const workspaceRoot = { fsPath: '/workspace', path: '/workspace' };
	let scanner: CommandsScanner;

	beforeEach(() => {
		scanner = new CommandsScanner(workspaceRoot as any);
		vscodeStub.__overrides.findFiles = null;
		vscodeStub.__overrides.stat = null;
	});

	describe('Command Scanning', () => {
		it('should scan and read workspace commands', async () => {
			const commands = await scanner.scanWorkspaceCommands();
			assert.ok(Array.isArray(commands));
			assert.ok(commands.length > 0);
		});

		it('should read commands as plain Markdown (no YAML parsing)', async () => {
			const commands = await scanner.scanWorkspaceCommands();
			const validCommand = commands.find((cmd: any) => cmd.fileName === 'valid-command.md');

			assert.ok(validCommand);
			assert.ok(validCommand.content.startsWith('# Code Review Checklist'));
			assert.ok(!validCommand.content.includes('---'));
		});

		it('should set location to workspace for workspace commands', async () => {
			const commands = await scanner.scanWorkspaceCommands();

			commands.forEach((command: any) => {
				assert.equal(command.location, 'workspace');
			});
		});

		it('should extract correct file names', async () => {
			const commands = await scanner.scanWorkspaceCommands();
			const fileNames = commands.map((cmd: any) => cmd.fileName);

			assert.ok(fileNames.includes('valid-command.md'));
			assert.ok(fileNames.includes('security-audit.md'));
		});

		it('should include URI for each command', async () => {
			const commands = await scanner.scanWorkspaceCommands();

			commands.forEach((command: any) => {
				assert.ok(command.uri);
				assert.ok(command.uri.fsPath);
			});
		});

		it('should return empty array when no commands found', async () => {
			vscodeStub.__overrides.findFiles = async () => [];
			const commands = await scanner.scanWorkspaceCommands();
			assert.equal(commands.length, 0);
		});
	});

	describe('Error Handling', () => {
		it('should handle file read errors gracefully', async () => {
			const commands = await scanner.scanWorkspaceCommands();
			const errorCommand = commands.find((cmd: any) => cmd.fileName === 'error-command.md');

			assert.ok(errorCommand);
			assert.equal(errorCommand.content, 'Error reading file content');
			assert.equal(errorCommand.location, 'workspace');
		});

		it('should handle missing .cursor/commands directory gracefully', async () => {
			vscodeStub.__overrides.findFiles = async () => {
				throw new Error('Directory not found');
			};

			const commands = await scanner.scanWorkspaceCommands();
			assert.equal(commands.length, 0);
		});

		it('should return empty array on scanning errors', async () => {
			vscodeStub.__overrides.findFiles = async () => {
				throw new Error('Scanning failed');
			};

			const commands = await scanner.scanWorkspaceCommands();
			assert.equal(commands.length, 0);
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
			assert.ok(watcher);
		});
	});

	describe('Command Content', () => {
		it('should preserve full Markdown content', async () => {
			const commands = await scanner.scanWorkspaceCommands();
			const validCommand = commands.find((cmd: any) => cmd.fileName === 'valid-command.md');

			assert.ok(validCommand);
			assert.ok(validCommand.content.length > 0);
			assert.ok(validCommand.content.includes('# Code Review Checklist'));
			assert.ok(validCommand.content.includes('## Overview'));
		});

		it('should handle commands with different content structures', async () => {
			const commands = await scanner.scanWorkspaceCommands();
			const securityCommand = commands.find((cmd: any) => cmd.fileName === 'security-audit.md');

			assert.ok(securityCommand);
			assert.ok(securityCommand.content.includes('# Security Audit'));
			assert.ok(securityCommand.content.includes('Dependency audit'));
		});

		it('should handle empty or minimal command files', async () => {
			const commands = await scanner.scanWorkspaceCommands();

			commands.forEach((command: any) => {
				assert.ok(typeof command.content === 'string');
			});
		});
	});

	describe('Integration Tests', () => {
		it('should handle multiple commands correctly', async () => {
			const commands = await scanner.scanWorkspaceCommands();

			assert.ok(commands.length >= 2);

			commands.forEach((command: any) => {
				assert.ok(command.uri);
				assert.ok(command.fileName);
				assert.ok(typeof command.content === 'string');
				assert.equal(command.location, 'workspace');
			});
		});

		it('should handle mix of valid and error commands', async () => {
			const commands = await scanner.scanWorkspaceCommands();

			const validCommands = commands.filter((cmd: any) => cmd.content !== 'Error reading file content');
			const errorCommands = commands.filter((cmd: any) => cmd.content === 'Error reading file content');

			assert.ok(validCommands.length > 0);
			assert.ok(errorCommands.length > 0);
		});
	});

	describe('Global Commands Scanning', () => {
		it('should scan and read global commands', async () => {
			const commands = await scanner.scanGlobalCommands();
			assert.ok(Array.isArray(commands));
			assert.ok(commands.length > 0);
		});

		it('should set location to global for global commands', async () => {
			const commands = await scanner.scanGlobalCommands();

			commands.forEach((command: any) => {
				assert.equal(command.location, 'global');
			});
		});

		it('should read global commands from ~/.cursor/commands directory', async () => {
			const commands = await scanner.scanGlobalCommands();
			const globalCommand = commands.find((cmd: any) => cmd.fileName === 'global-command.md');

			assert.ok(globalCommand);
			assert.ok(globalCommand.content.startsWith('# Global Command'));
			assert.equal(globalCommand.location, 'global');
		});

		it('should return empty array when global commands directory does not exist', async () => {
			vscodeStub.__overrides.stat = async () => {
				throw new Error('Directory not found');
			};

			const commands = await scanner.scanGlobalCommands();
			assert.equal(commands.length, 0);
		});

		it('should handle file read errors gracefully for global commands', async () => {
			const commands = await scanner.scanGlobalCommands();

			commands.forEach((command: any) => {
				assert.ok(typeof command.content === 'string');
				assert.equal(command.location, 'global');
			});
		});

		it('should return empty array on global scanning errors', async () => {
			vscodeStub.__overrides.findFiles = async () => {
				throw new Error('Scanning failed');
			};

			const commands = await scanner.scanGlobalCommands();
			assert.equal(commands.length, 0);
		});

		it('should include URI for each global command', async () => {
			const commands = await scanner.scanGlobalCommands();

			commands.forEach((command: any) => {
				assert.ok(command.uri);
				assert.ok(command.uri.fsPath);
			});
		});
	});
});
