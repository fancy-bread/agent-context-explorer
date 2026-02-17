// Shared skills scanning - NO vscode dependency
import * as path from 'path';
import type { IFileSystem } from './types';
import type { CoreSkill } from './types';
import { FileType } from './types';
import { parseSKILLMetadata } from '../skillParsing';

/**
 * Scan for Cursor skills in project .cursor/skills/ and user ~/.cursor/skills/.
 * One level: each subdir contains SKILL.md.
 */
export async function scanSkillsCore(
	fs: IFileSystem,
	projectRoot: string,
	userRoot: string
): Promise<CoreSkill[]> {
	const skills: CoreSkill[] = [];

	// Project skills
	const projectSkillsDir = path.join(projectRoot, '.cursor', 'skills');
	await scanSkillsInDir(fs, projectSkillsDir, 'workspace', skills);

	// User/global skills
	const userSkillsDir = path.join(userRoot, '.cursor', 'skills');
	await scanSkillsInDir(fs, userSkillsDir, 'global', skills);

	return skills;
}

async function scanSkillsInDir(
	fs: IFileSystem,
	skillsDir: string,
	location: 'workspace' | 'global',
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
					location
				});
			}
		}
	} catch {
		// Directory doesn't exist or can't be read
	}
}
