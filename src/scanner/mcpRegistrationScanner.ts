/**
 * McpRegistrationScanner
 *
 * Reads the top-level `mcpServers` key from a JSON config file and returns
 * the list of registered MCP server names.
 *
 * Used by the Agents view to display registered MCP servers under each agent
 * root (Claude Code: ~/.claude.json; Cursor: ~/.cursor/mcp.json).
 *
 * Safe contract: returns [] on missing file, parse error, or any IO failure.
 * Never throws.
 */
import * as fs from 'fs';

export class McpRegistrationScanner {
	constructor(private readonly configFilePath: string) {}

	/**
	 * Read and parse the config file, returning the names (keys) of all
	 * servers listed under the top-level `mcpServers` object.
	 *
	 * Returns an empty array if:
	 * - the file does not exist
	 * - the file cannot be read
	 * - the file contains malformed JSON
	 * - the `mcpServers` key is absent or not an object
	 */
	async scanServerNames(): Promise<string[]> {
		try {
			const raw = fs.readFileSync(this.configFilePath, 'utf-8');
			const parsed: unknown = JSON.parse(raw);
			if (
				parsed === null ||
				typeof parsed !== 'object' ||
				Array.isArray(parsed)
			) {
				return [];
			}
			const obj = parsed as Record<string, unknown>;
			const mcpServers = obj['mcpServers'];
			if (
				mcpServers === null ||
				typeof mcpServers !== 'object' ||
				Array.isArray(mcpServers)
			) {
				return [];
			}
			return Object.keys(mcpServers as Record<string, unknown>);
		} catch {
			return [];
		}
	}
}
