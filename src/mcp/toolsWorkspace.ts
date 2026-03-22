import * as vscode from 'vscode';

/**
 * Resolve workspace folder URI for MCP tools: explicit project path wins, else first workspace folder.
 * Extracted for focused unit tests (branch coverage for optional chaining).
 */
export function resolveWorkspaceUriForMcp(projectPath?: string): vscode.Uri | undefined {
	if (projectPath) {
		return vscode.Uri.file(projectPath);
	}
	return vscode.workspace.workspaceFolders?.[0]?.uri;
}

/**
 * Resolve workspace or throw the same error as McpTools when nothing is open.
 */
export function assertWorkspaceUriForMcp(projectPath?: string): vscode.Uri {
	const workspaceUri = resolveWorkspaceUriForMcp(projectPath);
	if (!workspaceUri) {
		throw new Error('No workspace folder found. Please open a folder or provide a projectPath.');
	}
	return workspaceUri;
}
