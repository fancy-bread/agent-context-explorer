// Shared commands scanning - NO vscode dependency
import * as path from 'path';
import type { IFileSystem } from './types';
import type { CoreCommand } from './types';
import { listFilesFlat } from './listFiles';

/**
 * Scan for Cursor commands in project .cursor/commands/ and user ~/.cursor/commands/.
 * Flat structure only - no recursion.
 */
export async function scanCommandsCore(
	fs: IFileSystem,
	projectRoot: string,
	userRoot: string
): Promise<CoreCommand[]> {
	const commands: CoreCommand[] = [];

	// Project commands
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

	// User/global commands
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
				location: 'global'
			});
		} catch {
			commands.push({
				path: filePath,
				content: 'Error reading file content',
				fileName: path.basename(filePath, '.md'),
				location: 'global'
			});
		}
	}

	return commands;
}
