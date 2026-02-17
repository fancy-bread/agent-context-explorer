// Skills Scanner - Scan for .cursor/skills/*/SKILL.md files in workspace and global
// Uses shared scanSkillsCore with VSCodeFsAdapter
import * as vscode from 'vscode';
import * as os from 'os';
import { VSCodeFsAdapter } from './adapters/vscodeFsAdapter';
import { scanSkillsCore } from './core/scanSkillsCore';
import type { SkillMetadata } from './skillParsing';

export type { SkillMetadata } from './skillParsing';

export interface Skill {
	uri: vscode.Uri;
	content: string;
	fileName: string;
	location: 'workspace' | 'global';
	metadata?: SkillMetadata;
}

export class SkillsScanner {
	constructor(private workspaceRoot: vscode.Uri) {}

	async scanWorkspaceSkills(): Promise<Skill[]> {
		try {
			const fs = new VSCodeFsAdapter();
			const coreSkills = await scanSkillsCore(fs, this.workspaceRoot.fsPath, os.homedir());
			return coreSkills
				.filter((s) => s.location === 'workspace')
				.map((s) => ({
					uri: vscode.Uri.file(s.path),
					content: s.content,
					fileName: s.fileName,
					location: s.location as 'workspace',
					metadata: s.metadata as SkillMetadata | undefined
				}));
		} catch {
			return [];
		}
	}

	async scanGlobalSkills(): Promise<Skill[]> {
		try {
			const fs = new VSCodeFsAdapter();
			const coreSkills = await scanSkillsCore(fs, this.workspaceRoot.fsPath, os.homedir());
			return coreSkills
				.filter((s) => s.location === 'global')
				.map((s) => ({
					uri: vscode.Uri.file(s.path),
					content: s.content,
					fileName: s.fileName,
					location: s.location as 'global',
					metadata: s.metadata as SkillMetadata | undefined
				}));
		} catch {
			return [];
		}
	}
}
