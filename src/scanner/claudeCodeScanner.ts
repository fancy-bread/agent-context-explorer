// Claude Code project-level artifact scanner
// Scans CLAUDE.md, .claude/rules/, .claude/commands/, .claude/skills/
import * as vscode from 'vscode';
import { VSCodeFsAdapter } from './adapters/vscodeFsAdapter';
import { scanClaudeCodeCore } from './core/scanClaudeCodeCore';
import type { Rule } from './rulesScanner';
import type { Command } from './commandsScanner';
import type { Skill } from './skillsScanner';

export interface ClaudeMdFile {
	uri: vscode.Uri;
	path: string;
}

export interface ClaudeCodeArtifacts {
	claudeMd: ClaudeMdFile | undefined;
	rules: Rule[];
	commands: Command[];
	skills: Skill[];
	hasAnyArtifacts: boolean;
}

export class ClaudeCodeScanner {
	constructor(private workspaceRoot: vscode.Uri) {}

	async scan(): Promise<ClaudeCodeArtifacts> {
		try {
			const fs = new VSCodeFsAdapter();
			const core = await scanClaudeCodeCore(fs, this.workspaceRoot.fsPath);

			return {
				claudeMd: core.claudeMdPath
					? { uri: vscode.Uri.file(core.claudeMdPath), path: core.claudeMdPath }
					: undefined,
				rules: core.rules.map(r => ({
					uri: vscode.Uri.file(r.path),
					metadata: r.metadata,
					content: r.content,
					fileName: r.fileName
				})),
				commands: core.commands.map(c => ({
					uri: vscode.Uri.file(c.path),
					content: c.content,
					fileName: c.fileName,
					location: 'workspace' as const
				})),
				skills: core.skills.map(s => ({
					uri: vscode.Uri.file(s.path),
					content: s.content,
					fileName: s.fileName,
					location: 'workspace' as const,
					metadata: s.metadata
				})),
				hasAnyArtifacts: core.hasAnyArtifacts
			};
		} catch {
			return { claudeMd: undefined, rules: [], commands: [], skills: [], hasAnyArtifacts: false };
		}
	}

	watchAll(callback: () => void): vscode.Disposable[] {
		const patterns = [
			'.claude/rules/**/*.{mdc,md}',
			'.claude/commands/*.md',
			'.claude/skills/*/SKILL.md',
			'CLAUDE.md'
		];

		return patterns.map(pattern => {
			const watcher = vscode.workspace.createFileSystemWatcher(
				new vscode.RelativePattern(this.workspaceRoot, pattern)
			);
			watcher.onDidCreate(callback);
			watcher.onDidChange(callback);
			watcher.onDidDelete(callback);
			return watcher;
		});
	}
}
