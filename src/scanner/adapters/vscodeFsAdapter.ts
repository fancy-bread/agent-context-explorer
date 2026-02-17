// VSCode filesystem adapter - implements IFileSystem using vscode.workspace.fs
// Used by extension scanners

import * as vscode from 'vscode';
import type { IFileSystem, FileTypeValue } from '../core/types';
import { FileType } from '../core/types';

/**
 * Adapter that implements IFileSystem using vscode.workspace.fs.
 * Used when scanners run in the extension host.
 */
export class VSCodeFsAdapter implements IFileSystem {

	async readFile(filePath: string): Promise<Buffer> {
		const uri = vscode.Uri.file(filePath);
		const content = await vscode.workspace.fs.readFile(uri);
		return Buffer.from(content);
	}

	async readDirectory(dirPath: string): Promise<[string, FileTypeValue][]> {
		const uri = vscode.Uri.file(dirPath);
		const entries = await vscode.workspace.fs.readDirectory(uri);
		return entries.map(([name, type]) => [name, type as FileTypeValue]);
	}

	async stat(filePath: string): Promise<{ type: FileTypeValue; mtime?: number }> {
		const uri = vscode.Uri.file(filePath);
		const stat = await vscode.workspace.fs.stat(uri);
		return {
			type: stat.type as FileTypeValue,
			mtime: stat.mtime
		};
	}
}
