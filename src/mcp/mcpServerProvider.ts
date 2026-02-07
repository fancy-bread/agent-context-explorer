// MCP Server Provider - VS Code and Cursor integration for ACE MCP Server

import * as vscode from 'vscode';
import * as path from 'path';

/** Cursor MCP API - registerServer wires the server into Cursor's AI tools (see cursor.com/docs/context/mcp-extension-api) */
const cursorMcp = (vscode as typeof vscode & { cursor?: { mcp?: { registerServer: (c: unknown) => void; unregisterServer: (name: string) => void } } }).cursor?.mcp;

/**
 * MCP Server Definition Provider for Agent Context Explorer
 *
 * - VS Code: uses vscode.lm.registerMcpServerDefinitionProvider (host discovers server).
 * - Cursor: also uses vscode.cursor.mcp.registerServer() so the AI in chat gets ACE tools
 *   without the user editing mcp.json (see https://cursor.com/docs/context/mcp).
 */
export class McpServerProvider implements vscode.McpServerDefinitionProvider {
	private _onDidChangeMcpServerDefinitions = new vscode.EventEmitter<void>();
	/** Server names registered with Cursor's API (for unregister on dispose) */
	private cursorServerNames: string[] = [];

	/**
	 * Event that fires when MCP server definitions change
	 */
	readonly onDidChangeMcpServerDefinitions = this._onDidChangeMcpServerDefinitions.event;

	constructor(private context: vscode.ExtensionContext) {}

	/**
	 * Provide MCP server definitions
	 *
	 * This is called by VS Code to get the list of MCP servers that this extension provides.
	 * Each workspace folder gets its own server instance.
	 */
	async provideMcpServerDefinitions(): Promise<vscode.McpServerDefinition[]> {
		const definitions: vscode.McpServerDefinition[] = [];

		// Get the server script path from the extension
		const serverScript = path.join(this.context.extensionPath, 'out', 'mcp', 'server.js');

		// Create a server definition for each workspace folder
		const workspaceFolders = vscode.workspace.workspaceFolders || [];

		for (const folder of workspaceFolders) {
			definitions.push(
				new vscode.McpStdioServerDefinition(
					`ACE: ${folder.name}`,  // label
					'node',                  // command
					[serverScript, folder.uri.fsPath],  // args
					{ ACE_WORKSPACE_PATH: folder.uri.fsPath },  // env
					'1.0.0'  // version
				)
			);
		}

		// If no workspace folders, provide a generic definition that uses cwd
		if (definitions.length === 0 && vscode.workspace.workspaceFolders === undefined) {
			definitions.push(
				new vscode.McpStdioServerDefinition(
					'Agent Context Explorer',  // label
					'node',                    // command
					[serverScript],            // args
					{},                        // env
					'1.0.0'                    // version
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
	syncCursorRegistration(): void {
		if (!cursorMcp?.registerServer) {
			return;
		}
		const serverScript = path.join(this.context.extensionPath, 'out', 'mcp', 'server.js');
		const folders = vscode.workspace.workspaceFolders ?? [];

		// Unregister previous Cursor registrations so we don't accumulate
		for (const name of this.cursorServerNames) {
			try {
				cursorMcp.unregisterServer(name);
			} catch {
				// ignore
			}
		}
		this.cursorServerNames = [];

		if (folders.length === 0) {
			// No workspace: register one server using cwd
			cursorMcp.registerServer({
				name: 'ace',
				server: {
					command: 'node',
					args: [serverScript],
					env: {}
				}
			});
			this.cursorServerNames.push('ace');
			return;
		}

		for (const folder of folders) {
			const name = folders.length === 1 ? 'ace' : `ace-${folder.name}`;
			cursorMcp.registerServer({
				name,
				server: {
					command: 'node',
					args: [serverScript, folder.uri.fsPath],
					env: { ACE_WORKSPACE_PATH: folder.uri.fsPath }
				}
			});
			this.cursorServerNames.push(name);
		}
	}

	/**
	 * Notify VS Code that the server definitions have changed
	 * Call this when workspaces change or server configuration updates
	 */
	refresh(): void {
		this.syncCursorRegistration();
		this._onDidChangeMcpServerDefinitions.fire();
	}

	/**
	 * Dispose of the provider
	 */
	dispose(): void {
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
 * @returns The registered provider (for potential cleanup)
 */
export function registerMcpServerProvider(
	context: vscode.ExtensionContext
): McpServerProvider {
	const provider = new McpServerProvider(context);

	// Register the provider with VS Code
	// Note: This API requires VS Code 1.105+
	if (typeof vscode.lm?.registerMcpServerDefinitionProvider === 'function') {
		context.subscriptions.push(
			vscode.lm.registerMcpServerDefinitionProvider('ace-mcp', provider)
		);

		// Cursor: register via Cursor's API so the chat AI gets ACE tools without mcp.json
		// See https://cursor.com/docs/context/mcp-extension-api
		provider.syncCursorRegistration();

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
