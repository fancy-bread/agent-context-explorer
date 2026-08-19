// Commands Scanner - Scan for .cursor/commands/*.md files in workspace and global
// Uses shared scanCommandsCore with VSCodeFsAdapter
import * as vscode from 'vscode';
import * as os from 'os';
import { VSCodeFsAdapter } from './adapters/vscodeFsAdapter';
import { scanCommandsCore } from './core/scanCommandsCore';
import type { CorePlatform } from './core/types';

export interface Command {
	uri: vscode.Uri;
	content: string;
	fileName: string;
	location: 'workspace' | 'global';
	platform: CorePlatform;
}

export class CommandsScanner {
	constructor(private workspaceRoot: vscode.Uri) {}

	async scanWorkspaceCommands(): Promise<Command[]> {
		const all = await this.scanAllWorkspaceCommands();
		return all.filter((c) => c.platform === 'cursor');
	}

	/** All workspace commands from both `.cursor/commands/` and `.claude/commands/`, platform-tagged (spec 011). */
	async scanAllWorkspaceCommands(): Promise<Command[]> {
		const all = await this.scanAll();
		return all.filter((c) => c.location === 'workspace');
	}

	async watchWorkspaceCommands(): Promise<vscode.FileSystemWatcher> {
		const pattern = new vscode.RelativePattern(this.workspaceRoot, '.cursor/commands/*.md');
		return vscode.workspace.createFileSystemWatcher(pattern);
	}

	async scanGlobalCommands(): Promise<Command[]> {
		const all = await this.scanAllGlobalCommands();
		return all.filter((c) => c.platform === 'cursor');
	}

	/** All global commands (currently `.cursor` only — see FR-007), platform-tagged (spec 011). */
	async scanAllGlobalCommands(): Promise<Command[]> {
		const all = await this.scanAll();
		return all.filter((c) => c.location === 'global');
	}

	private async scanAll(): Promise<Command[]> {
		try {
			const fs = new VSCodeFsAdapter();
			const coreCommands = await scanCommandsCore(fs, this.workspaceRoot.fsPath, os.homedir());
			return coreCommands.map((c) => ({
				uri: vscode.Uri.file(c.path),
				content: c.content,
				fileName: c.fileName,
				location: c.location,
				platform: c.platform
			}));
		} catch {
			return [];
		}
	}
}

