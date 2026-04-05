// Shared Claude Code project-level scanning - NO vscode dependency
import * as path from 'path';
import type { IFileSystem, CoreRule, CoreCommand, CoreSkill } from './types';
import { FileType } from './types';
import { listFilesRecursive, listFilesFlat } from './listFiles';
import { parseRuleFromString } from './ruleParsing';
import { parseSKILLMetadata } from '../skillParsing';

export interface CoreClaudeCodeArtifacts {
	claudeMdPath: string | undefined;
	rules: CoreRule[];
	commands: CoreCommand[];
	skills: CoreSkill[];
	hasAnyArtifacts: boolean;
}

/**
 * Scan for Claude Code project-level artifacts in {projectRoot}/.claude/ and CLAUDE.md.
 * All four scans run in parallel. Missing directories are silently skipped.
 */
export async function scanClaudeCodeCore(
	fs: IFileSystem,
	projectRoot: string
): Promise<CoreClaudeCodeArtifacts> {
	const [claudeMdPath, rules, commands, skills] = await Promise.all([
		statClaudeMd(fs, projectRoot),
		scanClaudeRules(fs, projectRoot),
		scanClaudeCommands(fs, projectRoot),
		scanClaudeSkills(fs, projectRoot)
	]);

	const hasAnyArtifacts =
		claudeMdPath !== undefined ||
		rules.length > 0 ||
		commands.length > 0 ||
		skills.length > 0;

	return { claudeMdPath, rules, commands, skills, hasAnyArtifacts };
}

async function statClaudeMd(fs: IFileSystem, projectRoot: string): Promise<string | undefined> {
	const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');
	try {
		const stat = await fs.stat(claudeMdPath);
		return stat.type === FileType.File ? claudeMdPath : undefined;
	} catch {
		return undefined;
	}
}

async function scanClaudeRules(fs: IFileSystem, projectRoot: string): Promise<CoreRule[]> {
	const rulesDir = path.join(projectRoot, '.claude', 'rules');
	const rules: CoreRule[] = [];
	const filePaths = await listFilesRecursive(fs, rulesDir, ['.mdc', '.md']);

	for (const filePath of filePaths) {
		try {
			const content = await fs.readFile(filePath);
			const text = content.toString('utf8');
			const { metadata, content: body } = parseRuleFromString(text);
			rules.push({ path: filePath, metadata, content: body, fileName: path.basename(filePath) });
		} catch {
			rules.push({
				path: filePath,
				metadata: { description: 'Error parsing file' },
				content: 'Error reading file content',
				fileName: path.basename(filePath)
			});
		}
	}
	return rules;
}

async function scanClaudeCommands(fs: IFileSystem, projectRoot: string): Promise<CoreCommand[]> {
	const commandsDir = path.join(projectRoot, '.claude', 'commands');
	const commands: CoreCommand[] = [];
	const filePaths = await listFilesFlat(fs, commandsDir, ['.md'], ['README.md']);

	for (const filePath of filePaths) {
		try {
			const content = await fs.readFile(filePath);
			const text = content.toString('utf8');
			commands.push({
				path: filePath,
				content: text,
				fileName: path.basename(filePath, '.md'),
				location: 'workspace'
			});
		} catch {
			commands.push({
				path: filePath,
				content: 'Error reading file content',
				fileName: path.basename(filePath, '.md'),
				location: 'workspace'
			});
		}
	}
	return commands;
}

async function scanClaudeSkills(fs: IFileSystem, projectRoot: string): Promise<CoreSkill[]> {
	const skillsDir = path.join(projectRoot, '.claude', 'skills');
	const skills: CoreSkill[] = [];

	try {
		const entries = await fs.readDirectory(skillsDir);
		for (const [name, fileType] of entries) {
			if (fileType !== FileType.Directory) { continue; }
			const skillPath = path.join(skillsDir, name, 'SKILL.md');
			try {
				const content = await fs.readFile(skillPath);
				const text = content.toString('utf8');
				const metadata = parseSKILLMetadata(text);
				skills.push({
					path: skillPath,
					content: text,
					fileName: name,
					location: 'workspace',
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
				skills.push({
					path: skillPath,
					content: 'Error reading file content',
					fileName: name,
					location: 'workspace'
				});
			}
		}
	} catch {
		// Directory doesn't exist or can't be read
	}
	return skills;
}
