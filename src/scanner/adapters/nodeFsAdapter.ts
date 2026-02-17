// Node.js filesystem adapter - implements IFileSystem using fs/promises
// NO vscode import - used by MCP standalone server

import * as fs from 'fs/promises';
import * as path from 'path';
import type { IFileSystem, FileTypeValue } from '../core/types';
import { FileType } from '../core/types';

/**
 * Adapter that implements IFileSystem using Node.js fs/promises.
 * Used when scanners run in MCP standalone server (no vscode).
 */
export class NodeFsAdapter implements IFileSystem {
	async readFile(filePath: string): Promise<Buffer> {
		return await fs.readFile(filePath);
	}

	async readDirectory(dirPath: string): Promise<[string, FileTypeValue][]> {
		const entries = await fs.readdir(dirPath, { withFileTypes: true });
		const result: [string, FileTypeValue][] = [];

		for (const entry of entries) {
			let type: FileTypeValue = FileType.Unknown;
			if (entry.isDirectory()) {
				type = FileType.Directory;
			} else if (entry.isFile()) {
				type = FileType.File;
			} else if (entry.isSymbolicLink()) {
				type = FileType.SymbolicLink;
			}
			result.push([entry.name, type]);
		}

		return result;
	}

	async stat(filePath: string): Promise<{ type: FileTypeValue; mtime?: number }> {
		const stat = await fs.stat(filePath);
		let type: FileTypeValue = FileType.Unknown;
		if (stat.isDirectory()) {
			type = FileType.Directory;
		} else if (stat.isFile()) {
			type = FileType.File;
		} else if (stat.isSymbolicLink()) {
			type = FileType.SymbolicLink;
		}
		return {
			type,
			mtime: stat.mtimeMs
		};
	}
}
