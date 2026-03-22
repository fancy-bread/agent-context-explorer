// Agent definitions scanner — `.cursor/agents/*.md` (workspace) via scanAgentDefinitionsCore
import * as vscode from 'vscode';
import { VSCodeFsAdapter } from './adapters/vscodeFsAdapter';
import { scanWorkspaceAgentDefinitionsCore } from './core/scanAgentDefinitionsCore';

export interface AgentDefinition {
	uri: vscode.Uri;
	content: string;
	/** Display stem (basename without `.md`) */
	fileName: string;
	displayName: string;
}

export class AgentsScanner {
	constructor(private workspaceRoot: vscode.Uri) {}

	async scanWorkspaceAgentDefinitions(): Promise<AgentDefinition[]> {
		try {
			const fs = new VSCodeFsAdapter();
			const core = await scanWorkspaceAgentDefinitionsCore(fs, this.workspaceRoot.fsPath);
			return core.map((c) => ({
				uri: vscode.Uri.file(c.path),
				content: c.content,
				fileName: c.fileName,
				displayName: c.displayName
			}));
		} catch {
			return [];
		}
	}
}
