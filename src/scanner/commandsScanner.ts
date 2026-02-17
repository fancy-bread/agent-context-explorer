// Commands Scanner - Scan for .cursor/commands/*.md files in workspace and global
// Uses shared scanCommandsCore with VSCodeFsAdapter
import * as vscode from 'vscode';
import * as os from 'os';
import { VSCodeFsAdapter } from './adapters/vscodeFsAdapter';
import { scanCommandsCore } from './core/scanCommandsCore';

export interface Command {
	uri: vscode.Uri;
	content: string;
	fileName: string;
	location: 'workspace' | 'global';
}

export class CommandsScanner {
	constructor(private workspaceRoot: vscode.Uri) {}

	async scanWorkspaceCommands(): Promise<Command[]> {
		try {
			const fs = new VSCodeFsAdapter();
			const coreCommands = await scanCommandsCore(fs, this.workspaceRoot.fsPath, os.homedir());
			return coreCommands
				.filter((c) => c.location === 'workspace')
				.map((c) => ({
					uri: vscode.Uri.file(c.path),
					content: c.content,
					fileName: c.fileName,
					location: c.location as 'workspace'
				}));
		} catch {
			return [];
		}
	}

	async watchWorkspaceCommands(): Promise<vscode.FileSystemWatcher> {
		const pattern = new vscode.RelativePattern(this.workspaceRoot, '.cursor/commands/*.md');
		return vscode.workspace.createFileSystemWatcher(pattern);
	}

	async scanGlobalCommands(): Promise<Command[]> {
		try {
			const fs = new VSCodeFsAdapter();
			const coreCommands = await scanCommandsCore(fs, this.workspaceRoot.fsPath, os.homedir());
			return coreCommands
				.filter((c) => c.location === 'global')
				.map((c) => ({
					uri: vscode.Uri.file(c.path),
					content: c.content,
					fileName: c.fileName,
					location: c.location as 'global'
				}));
		} catch {
			return [];
		}
	}
}

