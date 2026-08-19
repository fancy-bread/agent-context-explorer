// Claude Code project-level artifact scanner
// Scans CLAUDE.md, .claude/rules/, .claude/commands/, .claude/skills/, .claude/agents/
import * as vscode from 'vscode';
import { VSCodeFsAdapter } from './adapters/vscodeFsAdapter';
import { scanClaudeCodeCore } from './core/scanClaudeCodeCore';
import { RulesScanner, type Rule } from './rulesScanner';
import { CommandsScanner, type Command } from './commandsScanner';
import { SkillsScanner, type Skill } from './skillsScanner';
import { AgentsScanner, type AgentDefinition } from './agentsScanner';

export interface ClaudeMdFile {
	uri: vscode.Uri;
	path: string;
}

export interface ClaudeCodeArtifacts {
	claudeMd: ClaudeMdFile | undefined;
	rules: Rule[];
	commands: Command[];
	skills: Skill[];
	agentDefinitions: AgentDefinition[];
	claudeFolderExists: boolean;
	hasAnyArtifacts: boolean;
}

export class ClaudeCodeScanner {
	constructor(private workspaceRoot: vscode.Uri) {}

	async scan(): Promise<ClaudeCodeArtifacts> {
		try {
			const fs = new VSCodeFsAdapter();
			const rulesScanner = new RulesScanner(this.workspaceRoot);
			const commandsScanner = new CommandsScanner(this.workspaceRoot);
			const skillsScanner = new SkillsScanner(this.workspaceRoot);
			const agentsScanner = new AgentsScanner(this.workspaceRoot);

			// claudeMdPath/claudeFolderExists/hasAnyArtifacts are unrelated to the four artifact
			// types unified in spec 011 — sourced from scanClaudeCodeCore() unchanged.
			const [core, allRules, allCommands, allSkills, allAgentDefinitions] = await Promise.all([
				scanClaudeCodeCore(fs, this.workspaceRoot.fsPath),
				rulesScanner.scanAllRules(),
				commandsScanner.scanAllWorkspaceCommands(),
				skillsScanner.scanAllWorkspaceSkills(),
				agentsScanner.scanAllWorkspaceAgentDefinitions()
			]);

			return {
				claudeMd: core.claudeMdPath
					? { uri: vscode.Uri.file(core.claudeMdPath), path: core.claudeMdPath }
					: undefined,
				rules: allRules.filter(r => r.platform === 'claude'),
				commands: allCommands.filter(c => c.platform === 'claude'),
				skills: allSkills.filter(s => s.platform === 'claude'),
				agentDefinitions: allAgentDefinitions.filter(a => a.platform === 'claude'),
				claudeFolderExists: core.claudeFolderExists,
				hasAnyArtifacts: core.hasAnyArtifacts
			};
		} catch {
			return {
				claudeMd: undefined,
				rules: [],
				commands: [],
				skills: [],
				agentDefinitions: [],
				claudeFolderExists: false,
				hasAnyArtifacts: false
			};
		}
	}

	watchAll(callback: () => void): vscode.Disposable[] {
		const patterns = [
			'.claude/rules/**/*.{mdc,md}',
			'.claude/commands/*.md',
			// Recursive (**) so folder-deletion of a whole skill is caught — VS Code
			// collapses folder-delete events and a non-recursive `*/SKILL.md` pattern
			// won't match the deleted parent folder.
			'.claude/skills/**',
			'.claude/agents/*.md',
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
