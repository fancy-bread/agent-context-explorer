// Rules Scanner - Scan for .cursor/rules/*.mdc files in workspace
// Uses shared scanRulesCore with VSCodeFsAdapter (recursion limited to project .cursor/)
import * as vscode from 'vscode';
import { MDCParser } from '../utils/mdcParser';
import { VSCodeFsAdapter } from './adapters/vscodeFsAdapter';
import { scanRulesCore } from './core/scanRulesCore';
import * as os from 'os';

export interface RuleMetadata {
	description: string;
	globs?: string[];
	alwaysApply?: boolean;
}

export interface Rule {
	uri: vscode.Uri;
	metadata: RuleMetadata;
	content: string;
	fileName: string;
}

export class RulesScanner {
	constructor(private workspaceRoot: vscode.Uri) {}

	async scanRules(): Promise<Rule[]> {
		try {
			const fs = new VSCodeFsAdapter();
			const projectRoot = this.workspaceRoot.fsPath;
			const userRoot = os.homedir();
			const coreRules = await scanRulesCore(fs, projectRoot, userRoot);

			return coreRules.map((r) => ({
				uri: vscode.Uri.file(r.path),
				metadata: r.metadata,
				content: r.content,
				fileName: r.fileName
			}));
		} catch {
			return [];
		}
	}

	async watchRules(): Promise<vscode.FileSystemWatcher> {
		// Limit to project root .cursor/ only (not **/.cursor/ - excludes test/fixtures)
		const mdcPattern = new vscode.RelativePattern(this.workspaceRoot, '.cursor/rules/**/*.mdc');
		const mdcWatcher = vscode.workspace.createFileSystemWatcher(mdcPattern);

		const mdPattern = new vscode.RelativePattern(this.workspaceRoot, '.cursor/rules/**/*.md');
		const mdWatcher = vscode.workspace.createFileSystemWatcher(mdPattern);

		return {
			...mdcWatcher,
			dispose: () => {
				mdcWatcher.dispose();
				mdWatcher.dispose();
			}
		} as vscode.FileSystemWatcher;
	}

	async createRuleFile(directory: string, fileName: string, metadata: RuleMetadata, content: string): Promise<vscode.Uri> {
		try {
			// Ensure the directory exists
			// Handle empty directory string by using workspace root directly
			let rulesDir: vscode.Uri;
			if (directory === '' || directory === '.') {
				rulesDir = vscode.Uri.joinPath(this.workspaceRoot, '.cursor', 'rules');
			} else {
				rulesDir = vscode.Uri.joinPath(this.workspaceRoot, directory, '.cursor', 'rules');
			}

			await vscode.workspace.fs.createDirectory(rulesDir);

			// Create the file URI
			const fileUri = vscode.Uri.joinPath(rulesDir, fileName);

			// Generate MDC content
			const mdcContent = MDCParser.generateMDC(metadata, content);

			// Write the file
			await vscode.workspace.fs.writeFile(fileUri, Buffer.from(mdcContent, 'utf8'));

			return fileUri;
		} catch (error) {
			throw error;
		}
	}

	async deleteRuleFile(uri: vscode.Uri): Promise<void> {
		try {
			await vscode.workspace.fs.delete(uri);
		} catch (error) {
			throw error;
		}
	}
}
