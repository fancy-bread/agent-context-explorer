// Shared commands scanning - NO vscode dependency
import * as path from 'path';
import type { IFileSystem } from './types';
import type { CoreCommand } from './types';
import { listFilesFlat, directoryExists } from './listFiles';
import { scanClaudeCommands } from './scanClaudeCodeCore';

/**
 * Scan for commands in project .cursor/commands/ + .claude/commands/ (workspace),
 * and user ~/.cursor/commands/ (global — no global .claude scan; see spec 011 FR-007).
 * The global scan only runs if the project has a local .cursor/ folder — a project that
 * only uses Claude Code conventions shouldn't pull in the user's personal Cursor commands.
 */
export async function scanCommandsCore(
	fs: IFileSystem,
	projectRoot: string,
	userRoot: string
): Promise<CoreCommand[]> {
	const commands: CoreCommand[] = [];

	// Project commands (Cursor)
	const projectCommandsDir = path.join(projectRoot, '.cursor', 'commands');
	const projectFiles = await listFilesFlat(fs, projectCommandsDir, ['.md'], ['README.md']);

	for (const filePath of projectFiles) {
		try {
			const content = await fs.readFile(filePath);
			const text = content.toString('utf8');
			commands.push({
				path: filePath,
				content: text,
				fileName: path.basename(filePath, '.md'),
				location: 'workspace',
				platform: 'cursor'
			});
		} catch {
			commands.push({
				path: filePath,
				content: 'Error reading file content',
				fileName: path.basename(filePath, '.md'),
				location: 'workspace',
				platform: 'cursor'
			});
		}
	}

	// Project commands (Claude Code)
	commands.push(...await scanClaudeCommands(fs, projectRoot));

	// User/global commands (from ~/.cursor) — only for projects that have a local .cursor/ folder
	if (await directoryExists(fs, path.join(projectRoot, '.cursor'))) {
		const userCommandsDir = path.join(userRoot, '.cursor', 'commands');
		const userFiles = await listFilesFlat(fs, userCommandsDir, ['.md'], ['README.md']);

		for (const filePath of userFiles) {
			try {
				const content = await fs.readFile(filePath);
				const text = content.toString('utf8');
				commands.push({
					path: filePath,
					content: text,
					fileName: path.basename(filePath, '.md'),
					location: 'global',
					platform: 'cursor'
				});
			} catch {
				commands.push({
					path: filePath,
					content: 'Error reading file content',
					fileName: path.basename(filePath, '.md'),
					location: 'global',
					platform: 'cursor'
				});
			}
		}
	}

	return commands;
}

/**
 * Scan commands for an agent root (e.g. ~/.cursor, ~/.claude, ~/.agents).
 * Looks for flat Markdown files in <agentRoot>/commands.
 */
export async function scanAgentCommandsCore(
	fs: IFileSystem,
	agentRoot: string
): Promise<CoreCommand[]> {
	const commands: CoreCommand[] = [];
	const commandsDir = path.join(agentRoot, 'commands');
	const files = await listFilesFlat(fs, commandsDir, ['.md'], ['README.md']);

	for (const filePath of files) {
		try {
			const content = await fs.readFile(filePath);
			const text = content.toString('utf8');
			commands.push({
				path: filePath,
				content: text,
				fileName: path.basename(filePath, '.md'),
				location: 'global',
				// Agent-root scans (Agents view: Cursor/Claude/Global roots) aren't platform-filtered by
				// any consumer — this field is only meaningful for project-level scanCommandsCore above.
				platform: 'cursor'
			});
		} catch {
			commands.push({
				path: filePath,
				content: 'Error reading file content',
				fileName: path.basename(filePath, '.md'),
				location: 'global',
				platform: 'cursor'
			});
		}
	}

	return commands;
}
