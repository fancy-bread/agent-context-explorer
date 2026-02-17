// Recursive file listing - NO vscode dependency
// Used by shared scan functions

import * as path from 'path';
import type { IFileSystem, FileTypeValue } from './types';
import { FileType } from './types';

/**
 * List all files recursively within rootPath that match the given extensions.
 * Only descends within rootPath - never outside it.
 * Extensions should include the dot (e.g. ['.mdc', '.md']).
 */
export async function listFilesRecursive(
	fs: IFileSystem,
	rootPath: string,
	extensions: string[]
): Promise<string[]> {
	const results: string[] = [];
	const normalizedExtensions = extensions.map((ext) =>
		ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`
	);

	async function walk(dirPath: string): Promise<void> {
		try {
			const entries = await fs.readDirectory(dirPath);

			for (const [name, fileType] of entries) {
				if (name === '.' || name === '..') {continue;}

				const fullPath = path.join(dirPath, name);

				if (fileType === FileType.Directory) {
					await walk(fullPath);
				} else if (fileType === FileType.File || fileType === FileType.SymbolicLink) {
					const ext = path.extname(name).toLowerCase();
					if (normalizedExtensions.includes(ext)) {
						results.push(fullPath);
					}
				}
			}
		} catch {
			// Directory doesn't exist or can't be read - return empty
		}
	}

	await walk(rootPath);
	return results;
}

/**
 * List files in a single directory (no recursion).
 * Returns paths to files matching the extensions.
 */
export async function listFilesFlat(
	fs: IFileSystem,
	dirPath: string,
	extensions: string[],
	excludeNames: string[] = []
): Promise<string[]> {
	const results: string[] = [];
	const normalizedExtensions = extensions.map((ext) =>
		ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`
	);

	try {
		const entries = await fs.readDirectory(dirPath);

		for (const [name, fileType] of entries) {
			if (excludeNames.includes(name)) {continue;}
			if (fileType !== FileType.File && fileType !== FileType.SymbolicLink) {continue;}

			const ext = path.extname(name).toLowerCase();
			if (normalizedExtensions.includes(ext)) {
				results.push(path.join(dirPath, name));
			}
		}
	} catch {
		// Directory doesn't exist or can't be read
	}

	return results;
}
