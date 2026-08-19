// Skills Scanner - Scan for .cursor/skills/*/SKILL.md files in workspace and global
// Uses shared scanSkillsCore with VSCodeFsAdapter
import * as vscode from 'vscode';
import * as os from 'os';
import { VSCodeFsAdapter } from './adapters/vscodeFsAdapter';
import { scanSkillsCore } from './core/scanSkillsCore';
import type { SkillMetadata } from './skillParsing';
import type { CorePlatform } from './core/types';

export type { SkillMetadata } from './skillParsing';

export interface Skill {
	uri: vscode.Uri;
	content: string;
	fileName: string;
	location: 'workspace' | 'global';
	metadata?: SkillMetadata;
	platform: CorePlatform;
}

export class SkillsScanner {
	constructor(private workspaceRoot: vscode.Uri) {}

	async scanWorkspaceSkills(): Promise<Skill[]> {
		const all = await this.scanAllWorkspaceSkills();
		return all.filter((s) => s.platform === 'cursor');
	}

	/** All workspace skills from both `.cursor/skills/` and `.claude/skills/`, platform-tagged (spec 011). */
	async scanAllWorkspaceSkills(): Promise<Skill[]> {
		const all = await this.scanAll();
		return all.filter((s) => s.location === 'workspace');
	}

	async scanGlobalSkills(): Promise<Skill[]> {
		const all = await this.scanAllGlobalSkills();
		return all.filter((s) => s.platform === 'cursor');
	}

	/** All global skills (currently `.cursor` only — see FR-007), platform-tagged (spec 011). */
	async scanAllGlobalSkills(): Promise<Skill[]> {
		const all = await this.scanAll();
		return all.filter((s) => s.location === 'global');
	}

	private async scanAll(): Promise<Skill[]> {
		try {
			const fs = new VSCodeFsAdapter();
			const coreSkills = await scanSkillsCore(fs, this.workspaceRoot.fsPath, os.homedir());
			return coreSkills.map((s) => ({
				uri: vscode.Uri.file(s.path),
				content: s.content,
				fileName: s.fileName,
				location: s.location,
				metadata: s.metadata as SkillMetadata | undefined,
				platform: s.platform
			}));
		} catch {
			return [];
		}
	}
}
