// Commands Scanner - Scan for .cursor/commands/*.md files in workspace and global
import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';

export interface Command {
	uri: vscode.Uri;
	content: string;
	fileName: string;
	location: 'workspace' | 'global';
}

export class CommandsScanner {
	constructor(private workspaceRoot: vscode.Uri) {}

	async scanWorkspaceCommands(): Promise<Command[]> {
		const commands: Command[] = [];

		try {
			// Find all .md files in .cursor/commands directory (flat structure, no subdirectories)
			const pattern = new vscode.RelativePattern(this.workspaceRoot, '.cursor/commands/*.md');
			const files = await vscode.workspace.findFiles(pattern);

			// Read each file
			for (const file of files) {
				try {
					const fileData = await vscode.workspace.fs.readFile(file);
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

	async watchWorkspaceCommands(): Promise<vscode.FileSystemWatcher> {
		// Create watcher for .md files in .cursor/commands
		const pattern = new vscode.RelativePattern(this.workspaceRoot, '.cursor/commands/*.md');
		return vscode.workspace.createFileSystemWatcher(pattern);
	}

	async scanGlobalCommands(): Promise<Command[]> {
		const commands: Command[] = [];

		try {
			// Get global commands directory: ~/.cursor/commands
			const homeDir = os.homedir();
			const globalCommandsDir = path.join(homeDir, '.cursor', 'commands');
			const globalCommandsUri = vscode.Uri.file(globalCommandsDir);

			// Check if directory exists
			try {
				await vscode.workspace.fs.stat(globalCommandsUri);
			} catch {
				// Directory doesn't exist, return empty array
				return [];
			}

			// Find all .md files in global .cursor/commands directory
			const pattern = new vscode.RelativePattern(globalCommandsDir, '*.md');
			const files = await vscode.workspace.findFiles(pattern);

			// Read each file
			for (const file of files) {
				try {
					const fileData = await vscode.workspace.fs.readFile(file);
					const content = Buffer.from(fileData).toString('utf8');
					const fileName = file.path.split('/').pop() || 'unknown';

					commands.push({
						uri: file,
						content,
						fileName,
						location: 'global'
					});
				} catch (error) {
					// Add a placeholder command for files that can't be read
					const fileName = file.path.split('/').pop() || 'unknown';
					commands.push({
						uri: file,
						content: 'Error reading file content',
						fileName,
						location: 'global'
					});
				}
			}

			return commands;
		} catch (error) {
			// Handle errors gracefully - return empty array
			return [];
		}
	}
}

