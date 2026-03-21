// MCP Server Provider - VS Code and Cursor integration for ACE MCP Server
// Prefer extension backend (bridge mode); fall back to ACE_PROJECT_PATHS (standalone) if backend fails.

import * as vscode from 'vscode';
import * as path from 'path';
import type { ProjectDefinition } from '../types/project';
import { startExtensionBackend, buildProjectList } from './extensionBackend';

/** Cursor MCP API - registerServer wires the server into Cursor's AI tools (see cursor.com/docs/context/mcp-extension-api) */
function getCursorMcp():
	| { registerServer: (c: unknown) => void; unregisterServer: (name: string) => void }
	| undefined {
	// Use require('vscode') so tests (and Cursor) can attach `cursor.mcp` to the same module object as runtime;
	// `import * as vscode` may not be the identical object as require() in some bundlers/ts emit paths.
	const v = require('vscode') as typeof vscode & { cursor?: { mcp?: { registerServer: (c: unknown) => void; unregisterServer: (name: string) => void } } };
	return v.cursor?.mcp;
}

/**
 * MCP Server Definition Provider for Agent Context Explorer
 *
 * Tries to start the extension backend (bridge mode). If that fails, passes ACE_PROJECT_PATHS
 * so the stdio server runs in standalone mode. MCP is always exposed when the provider is registered.
 */
export class McpServerProvider implements vscode.McpServerDefinitionProvider {
	private _onDidChangeMcpServerDefinitions = new vscode.EventEmitter<void>();
	private cursorServerNames: string[] = [];
	private backendPort: number | undefined;
	private backendDispose: (() => void) | undefined;
	/** When backend is not used, we pass this to the server for standalone mode. */
	private fallbackEnv: Record<string, string> = {};

	readonly onDidChangeMcpServerDefinitions = this._onDidChangeMcpServerDefinitions.event;

	constructor(
		private context: vscode.ExtensionContext,
		private getProjects: () => Promise<ProjectDefinition[]>,
		private outputChannel?: vscode.OutputChannel
	) {}

	/**
	 * Try to start the extension backend. On success returns { port }; on failure builds fallback env (ACE_PROJECT_PATHS).
	 */
	private async ensureBackendOrFallback(): Promise<{ port?: number; env: Record<string, string> }> {
		if (this.backendPort !== undefined) {
			return { port: this.backendPort, env: { ACE_EXTENSION_PORT: String(this.backendPort) } };
		}
		try {
			const logLine = this.outputChannel ? (line: string) => { this.outputChannel!.appendLine(line); } : undefined;
			const { port, dispose } = await startExtensionBackend(this.getProjects, logLine);
			this.backendPort = port;
			this.backendDispose = dispose;
			this.context.subscriptions.push({ dispose: () => { this.backendDispose?.(); this.backendPort = undefined; } });
			this.fallbackEnv = {};
			this.outputChannel?.appendLine(`MCP: backend started (bridge mode) on port ${port}`);
			return { port, env: { ACE_EXTENSION_PORT: String(port) } };
		} catch (err) {
			// Fallback: pass project list so stdio server runs in standalone mode; MCP still exposed
			const projectList = await buildProjectList(this.getProjects, vscode.workspace.workspaceFolders);
			this.fallbackEnv = projectList.length > 0 ? { ACE_PROJECT_PATHS: JSON.stringify(projectList) } : {};
			this.outputChannel?.appendLine(`MCP: using standalone mode (backend failed: ${err instanceof Error ? err.message : String(err)})`);
			return { env: this.fallbackEnv };
		}
	}

	/**
	 * Provide MCP server definitions.
	 * Uses bridge mode when backend started; otherwise standalone with ACE_PROJECT_PATHS.
	 * On any failure, returns a minimal definition so the MCP server is still exposed.
	 */
	async provideMcpServerDefinitions(): Promise<vscode.McpServerDefinition[]> {
		const serverScript = path.join(this.context.extensionPath, 'out', 'mcp', 'server.js');
		const workspaceFolders = vscode.workspace.workspaceFolders || [];
		let envBase: Record<string, string> = {};
		try {
			const result = await this.ensureBackendOrFallback();
			envBase = result.env;
			const mode = result.port !== undefined ? 'bridge' : 'standalone';
			this.outputChannel?.appendLine(`MCP: provideMcpServerDefinitions -> ${mode} (${workspaceFolders.length} folder(s))`);
		} catch (e) {
			this.outputChannel?.appendLine(`MCP: provideMcpServerDefinitions error: ${e instanceof Error ? e.message : String(e)}`);
			envBase = {};
		}

		const definitions: vscode.McpServerDefinition[] = [];
		for (const folder of workspaceFolders) {
			const env: Record<string, string> = { ACE_WORKSPACE_PATH: folder.uri.fsPath, ...envBase };
			definitions.push(
				new vscode.McpStdioServerDefinition(
					`ACE: ${folder.name}`,
					'node',
					[serverScript, folder.uri.fsPath],
					env,
					'1.0.0'
				)
			);
		}

		if (definitions.length === 0 && vscode.workspace.workspaceFolders === undefined) {
			definitions.push(
				new vscode.McpStdioServerDefinition(
					'Agent Context Explorer',
					'node',
					[serverScript],
					envBase,
					'1.0.0'
				)
			);
		}

		return definitions;
	}

	/**
	 * Resolve MCP server definition before starting
	 *
	 * This is called just before VS Code starts the server.
	 * Use this to perform any last-minute setup or validation.
	 */
	async resolveMcpServerDefinition(
		server: vscode.McpServerDefinition
	): Promise<vscode.McpServerDefinition | undefined> {
		// Verify the server script exists
		if (server instanceof vscode.McpStdioServerDefinition) {
			const args = server.args || [];
			const scriptPath = args[0];

			if (scriptPath) {
				try {
					await vscode.workspace.fs.stat(vscode.Uri.file(scriptPath));
				} catch {
					vscode.window.showErrorMessage(
						`ACE MCP Server script not found: ${scriptPath}. Try reloading the extension.`
					);
					return undefined;
				}
			}
		}

		return server;
	}

	/**
	 * Register ACE MCP server with Cursor's API so the chat AI gets our tools
	 * without the user editing mcp.json. No-op if not in Cursor or API unavailable.
	 * Call once at activation and on workspace folder changes (refresh).
	 */
	async syncCursorRegistration(): Promise<void> {
		const cursorMcp = getCursorMcp();
		if (!cursorMcp?.registerServer) {
			return;
		}
		try {
			const serverScript = path.join(this.context.extensionPath, 'out', 'mcp', 'server.js');
			const folders = vscode.workspace.workspaceFolders ?? [];
			const { env: envBase } = await this.ensureBackendOrFallback();

			for (const name of this.cursorServerNames) {
				try {
					cursorMcp.unregisterServer(name);
				} catch {
					// ignore
				}
			}
			this.cursorServerNames = [];

			if (folders.length === 0) {
				cursorMcp.registerServer({
					name: 'ace',
					server: {
						command: 'node',
						args: [serverScript],
						env: envBase
					}
				});
				this.cursorServerNames.push('ace');
				return;
			}

			for (const folder of folders) {
				const name = folders.length === 1 ? 'ace' : `ace-${folder.name}`;
				const env: Record<string, string> = { ACE_WORKSPACE_PATH: folder.uri.fsPath, ...envBase };
				cursorMcp.registerServer({
					name,
					server: {
						command: 'node',
						args: [serverScript, folder.uri.fsPath],
						env
					}
				});
				this.cursorServerNames.push(name);
			}
		} catch (err) {
			console.warn('ACE MCP: syncCursorRegistration failed', err);
		}
	}

	/**
	 * Notify VS Code that the server definitions have changed
	 * Call this when workspaces change or server configuration updates
	 */
	refresh(): void {
		void this.syncCursorRegistration();
		this._onDidChangeMcpServerDefinitions.fire();
	}

	/**
	 * Dispose of the provider
	 */
	dispose(): void {
		const cursorMcp = getCursorMcp();
		if (cursorMcp?.unregisterServer) {
			for (const name of this.cursorServerNames) {
				try {
					cursorMcp.unregisterServer(name);
				} catch {
					// ignore
				}
			}
			this.cursorServerNames = [];
		}
		this._onDidChangeMcpServerDefinitions.dispose();
	}
}

/**
 * Register the MCP server provider with VS Code
 *
 * @param context Extension context
 * @param getProjects Callback that returns current workspace + added projects (for list_projects)
 * @param outputChannel Optional output channel for MCP tool call logging (one line per call)
 * @returns The registered provider (for potential cleanup)
 */
export function registerMcpServerProvider(
	context: vscode.ExtensionContext,
	getProjects: () => Promise<ProjectDefinition[]>,
	outputChannel?: vscode.OutputChannel
): McpServerProvider {
	const provider = new McpServerProvider(context, getProjects, outputChannel);

	if (typeof vscode.lm?.registerMcpServerDefinitionProvider === 'function') {
		context.subscriptions.push(
			vscode.lm.registerMcpServerDefinitionProvider('ace-mcp', provider)
		);

		// Cursor: register so the chat AI gets ACE tools; pass full project list
		void provider.syncCursorRegistration();

		// Listen for workspace folder changes and refresh
		context.subscriptions.push(
			vscode.workspace.onDidChangeWorkspaceFolders(() => {
				provider.refresh();
			})
		);
	} else {
		// API not available - log warning
		console.warn(
			'ACE MCP Server: vscode.lm.registerMcpServerDefinitionProvider not available. ' +
			'Requires VS Code 1.105+ or Cursor with MCP support.'
		);
	}

	return provider;
}
