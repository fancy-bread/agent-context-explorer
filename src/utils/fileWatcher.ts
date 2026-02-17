// File Watcher - Watch for rule file changes
import * as vscode from 'vscode';

export class FileWatcher {
	private watchers: vscode.FileSystemWatcher[] = [];

	watchRules(workspaceRoot: vscode.Uri, callback: () => void): void {
		// TODO: Implement file watching logic
		const pattern = new vscode.RelativePattern(workspaceRoot, '.cursor/rules/**/*.mdc');
		const watcher = vscode.workspace.createFileSystemWatcher(pattern);

		watcher.onDidCreate(() => callback());
		watcher.onDidChange(() => callback());
		watcher.onDidDelete(() => callback());

		this.watchers.push(watcher);
	}

	dispose(): void {
		this.watchers.forEach(watcher => watcher.dispose());
		this.watchers = [];
	}
}
