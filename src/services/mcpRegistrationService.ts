/**
 * McpRegistrationService
 *
 * Checks whether the ACE MCP server is registered in ~/.claude.json and
 * offers a one-time startup prompt to register it when it is absent or stale.
 *
 * Constitution compliance:
 * - The tree view itself is read-only (Principle 1 — Viewer-Only).
 * - The ~/.claude.json write is triggered exclusively by explicit user
 *   confirmation via a VS Code information message prompt — never
 *   automatically or through a tree view action.
 * - On write failure the file is left unchanged and an error notification
 *   is shown (Principle 2 — Safety).
 */
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/** The key used for the ACE entry in mcpServers. */
const ACE_SERVER_KEY = 'ace';

/** Relative path to the ACE MCP server script within extensionPath. */
const ACE_MCP_SCRIPT_RELATIVE = path.join('out', 'mcp', 'server.js');

export class McpRegistrationService {
	private promptShownThisSession = false;

	constructor(
		private readonly extensionPath: string,
		private readonly homeDir: string
	) {}

	private get claudeJsonPath(): string {
		return path.join(this.homeDir, '.claude.json');
	}

	private get aceMcpScriptPath(): string {
		return path.join(this.extensionPath, ACE_MCP_SCRIPT_RELATIVE);
	}

	/**
	 * Returns true when the ACE MCP entry exists in ~/.claude.json and the
	 * registered args[0] path matches the current extension's script path.
	 * Returns false if the entry is absent or the path differs (stale).
	 * Returns false on any read / parse error (safe default → prompt shown).
	 */
	async isRegistered(): Promise<boolean> {
		try {
			const raw = fs.readFileSync(this.claudeJsonPath, 'utf-8');
			const parsed: unknown = JSON.parse(raw);
			if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
				return false;
			}
			const obj = parsed as Record<string, unknown>;
			const mcpServers = obj['mcpServers'];
			if (mcpServers === null || typeof mcpServers !== 'object' || Array.isArray(mcpServers)) {
				return false;
			}
			const servers = mcpServers as Record<string, unknown>;
			const aceEntry = servers[ACE_SERVER_KEY];
			if (aceEntry === null || typeof aceEntry !== 'object' || Array.isArray(aceEntry)) {
				return false;
			}
			const entry = aceEntry as Record<string, unknown>;
			const args = entry['args'];
			if (!Array.isArray(args) || args.length === 0) {
				return false;
			}
			// Check that the registered path matches the current extension path
			return args[0] === this.aceMcpScriptPath;
		} catch {
			return false;
		}
	}

	/**
	 * Writes the ACE stdio entry to ~/.claude.json under `mcpServers`,
	 * creating the file if it does not exist.
	 * Preserves all pre-existing entries.
	 * Throws on write failure (caller must surface the error).
	 */
	async register(): Promise<void> {
		// Read existing content (or start fresh)
		let existing: Record<string, unknown> = {};
		try {
			const raw = fs.readFileSync(this.claudeJsonPath, 'utf-8');
			const parsed: unknown = JSON.parse(raw);
			if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
				existing = parsed as Record<string, unknown>;
			}
		} catch {
			// File missing or malformed — start with empty object
		}

		// Merge the ACE entry under mcpServers, preserving other entries
		let mcpServers: Record<string, unknown> = {};
		if (
			existing['mcpServers'] !== null &&
			typeof existing['mcpServers'] === 'object' &&
			!Array.isArray(existing['mcpServers'])
		) {
			mcpServers = { ...(existing['mcpServers'] as Record<string, unknown>) };
		}

		mcpServers[ACE_SERVER_KEY] = {
			command: 'node',
			args: [this.aceMcpScriptPath],
			type: 'stdio'
		};

		const updated: Record<string, unknown> = {
			...existing,
			mcpServers
		};

		const serialized = JSON.stringify(updated, null, 2);
		// Write atomically using the VS Code FS API (Buffer-based)
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(this.claudeJsonPath),
			Buffer.from(serialized, 'utf-8')
		);
	}

	/**
	 * Shows a notification prompt if:
	 * - Claude Code is detected (~/  .claude/ directory exists — caller's responsibility)
	 * - ACE is not registered or the registration is stale
	 * - The prompt has not already been shown this session
	 *
	 * "Set up" → registers and refreshes.
	 * "Not now" → sets session flag; no further prompts this session.
	 *
	 * @param onRefresh Optional callback invoked after successful registration so callers
	 *   can refresh the Agents view.
	 */
	async promptIfNeeded(onRefresh?: () => void): Promise<void> {
		if (this.promptShownThisSession) {
			return;
		}

		const registered = await this.isRegistered();
		if (registered) {
			return;
		}

		this.promptShownThisSession = true;

		const choice = await vscode.window.showInformationMessage(
			'Set up ACE for Claude Code MCP?',
			'Set up',
			'Not now'
		);

		if (choice === 'Set up') {
			try {
				await this.register();
				if (onRefresh) {
					onRefresh();
				}
			} catch (err) {
				await vscode.window.showErrorMessage(
					`Failed to register ACE with Claude Code MCP: ${err instanceof Error ? err.message : String(err)}`
				);
			}
		}
		// "Not now" or dismissed: promptShownThisSession remains true; no further prompts
	}
}
