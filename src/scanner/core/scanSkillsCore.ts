// Shared skills scanning - NO vscode dependency
import * as path from 'path';
import type { IFileSystem } from './types';
import type { CoreSkill, CorePlatform } from './types';
import { FileType } from './types';
import { parseSKILLMetadata } from '../skillParsing';
import { scanClaudeSkills } from './scanClaudeCodeCore';

/**
 * Scan for skills in project .cursor/skills/ + .claude/skills/ (workspace only).
 * No global fallback — the Agents view (scanAgentSkillsCore below) is the dedicated,
 * non-project-scoped way to browse a user's global skill roots.
 * One level: each subdir contains SKILL.md.
 */
export async function scanSkillsCore(
	fs: IFileSystem,
	projectRoot: string,
	_userRoot: string
): Promise<CoreSkill[]> {
	const skills: CoreSkill[] = [];

	// Project skills (Cursor)
	const projectSkillsDir = path.join(projectRoot, '.cursor', 'skills');
	await scanSkillsInDir(fs, projectSkillsDir, 'workspace', 'cursor', skills);

	// Project skills (Claude Code)
	skills.push(...await scanClaudeSkills(fs, projectRoot));

	return skills;
}

async function scanSkillsInDir(
	fs: IFileSystem,
	skillsDir: string,
	location: 'workspace' | 'global',
	platform: CorePlatform,
	results: CoreSkill[]
): Promise<void> {
	try {
		const entries = await fs.readDirectory(skillsDir);

		for (const [name, fileType] of entries) {
			if (fileType !== FileType.Directory) {continue;}

			const skillPath = path.join(skillsDir, name, 'SKILL.md');
			try {
				const content = await fs.readFile(skillPath);
				const text = content.toString('utf8');
				const metadata = parseSKILLMetadata(text);

				results.push({
					path: skillPath,
					content: text,
					fileName: name,
					location,
					platform,
					metadata: metadata ? {
						title: metadata.title,
						overview: metadata.overview,
						prerequisites: metadata.prerequisites,
						steps: metadata.steps,
						tools: metadata.tools,
						guidance: metadata.guidance
					} : undefined
				});
			} catch {
				results.push({
					path: skillPath,
					content: 'Error reading file content',
					fileName: name,
					location,
					platform
				});
			}
		}
	} catch {
		// Directory doesn't exist or can't be read
	}
}

/**
 * Scan skills for an agent root (e.g. ~/.cursor, ~/.claude, ~/.agents).
 * Looks for SKILL.md in immediate subdirectories of <agentRoot>/skills.
 */
export async function scanAgentSkillsCore(
	fs: IFileSystem,
	agentRoot: string
): Promise<CoreSkill[]> {
	const skills: CoreSkill[] = [];
	const skillsDir = path.join(agentRoot, 'skills');
	// Agent-root scans (Agents view: Cursor/Claude/Global roots) aren't platform-filtered by any
	// consumer — this field is only meaningful for project-level scanSkillsCore above.
	await scanSkillsInDir(fs, skillsDir, 'global', 'cursor', skills);
	return skills;
}
