// Skills Scanner - Scan for .cursor/skills/*/SKILL.md files in workspace and global
import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { parseSKILLMetadata, type SkillMetadata } from './skillParsing';

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
		const skills: Skill[] = [];

		try {
			// Find all SKILL.md files in .cursor/skills/*/ directories
			const pattern = new vscode.RelativePattern(this.workspaceRoot, '.cursor/skills/*/SKILL.md');
			const files = await vscode.workspace.findFiles(pattern);

			// Read each file
			for (const file of files) {
				try {
					const fileData = await vscode.workspace.fs.readFile(file);
					const content = Buffer.from(fileData).toString('utf8');
					
					// Extract skill directory name (e.g., "create-plan" from ".cursor/skills/create-plan/SKILL.md")
					const pathParts = file.path.split('/');
					const skillDirIndex = pathParts.indexOf('.cursor') + 2; // skills + 1
					const skillDirName = pathParts[skillDirIndex] || 'unknown';

					// Parse frontmatter if present
					const metadata = parseSKILLMetadata(content);

					skills.push({
						uri: file,
						content,
						fileName: skillDirName,
						location: 'workspace',
						metadata
					});
				} catch (error) {
					// Add a placeholder skill for files that can't be read
					const pathParts = file.path.split('/');
					const skillDirIndex = pathParts.indexOf('.cursor') + 2;
					const skillDirName = pathParts[skillDirIndex] || 'unknown';
					skills.push({
						uri: file,
						content: 'Error reading file content',
						fileName: skillDirName,
						location: 'workspace'
					});
				}
			}

			return skills;
		} catch (error) {
			return [];
		}
	}

	async scanGlobalSkills(): Promise<Skill[]> {
		const skills: Skill[] = [];

		try {
			// Get global skills directory: ~/.cursor/skills
			const homeDir = os.homedir();
			const globalSkillsDir = path.join(homeDir, '.cursor', 'skills');
			const globalSkillsUri = vscode.Uri.file(globalSkillsDir);

			// Check if directory exists
			try {
				await vscode.workspace.fs.stat(globalSkillsUri);
			} catch {
				// Directory doesn't exist, return empty array
				return [];
			}

			// Find all SKILL.md files in global .cursor/skills/*/ directories
			const pattern = new vscode.RelativePattern(globalSkillsDir, '*/SKILL.md');
			const files = await vscode.workspace.findFiles(pattern);

			// Read each file
			for (const file of files) {
				try {
					const fileData = await vscode.workspace.fs.readFile(file);
					const content = Buffer.from(fileData).toString('utf8');
					
					// Extract skill directory name
					const pathParts = file.path.split(path.sep);
					const skillDirName = pathParts[pathParts.length - 2] || 'unknown';

					// Parse frontmatter if present
					const metadata = parseSKILLMetadata(content);

					skills.push({
						uri: file,
						content,
						fileName: skillDirName,
						location: 'global',
						metadata
					});
				} catch (error) {
					// Add a placeholder skill for files that can't be read
					const pathParts = file.path.split(path.sep);
					const skillDirName = pathParts[pathParts.length - 2] || 'unknown';
					skills.push({
						uri: file,
						content: 'Error reading file content',
						fileName: skillDirName,
						location: 'global'
					});
				}
			}

			return skills;
		} catch (error) {
			// Handle errors gracefully - return empty array
			return [];
		}
	}
}
