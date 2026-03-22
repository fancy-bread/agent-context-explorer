// Shared agent definitions scanning - NO vscode dependency
import * as path from 'path';
import type { IFileSystem } from './types';
import type { CoreAgentDefinition } from './types';
import { listFilesFlat } from './listFiles';

/**
 * Absolute path to workspace-scoped agent definitions: `<projectRoot>/.cursor/agents`.
 */
export function workspaceAgentsDirectory(projectRoot: string): string {
	return path.join(projectRoot, '.cursor', 'agents');
}

/**
 * Absolute path to agent definitions under an agent root (e.g. `~/.cursor`, `~/.claude`, `~/.agents`).
 * Per contract: `<agentRoot>/agents` (Global uses `~/.agents/agents`).
 */
export function agentRootAgentsDirectory(agentRoot: string): string {
	return path.join(agentRoot, 'agents');
}

/**
 * Scan a single `agents` directory for flat `*.md` files (non-recursive).
 * Missing or unreadable directory → empty array.
 */
export async function scanAgentDefinitionsInDirectory(
	fs: IFileSystem,
	agentsDirAbsolute: string
): Promise<CoreAgentDefinition[]> {
	const files = await listFilesFlat(fs, agentsDirAbsolute, ['.md'], ['README.md']);
	const sorted = [...files].sort((a, b) => {
		const na = path.basename(a, '.md');
		const nb = path.basename(b, '.md');
		return na.localeCompare(nb, undefined, { sensitivity: 'base' });
	});

	const results: CoreAgentDefinition[] = [];
	for (const filePath of sorted) {
		const base = path.basename(filePath);
		const displayName = path.basename(base, '.md');
		try {
			const content = await fs.readFile(filePath);
			const text = content.toString('utf8');
			results.push({
				path: filePath,
				content: text,
				fileName: displayName,
				displayName
			});
		} catch {
			results.push({
				path: filePath,
				content: 'Error reading file content',
				fileName: displayName,
				displayName
			});
		}
	}

	return results;
}

/**
 * Workspace project: `.cursor/agents/*.md` only.
 */
export async function scanWorkspaceAgentDefinitionsCore(
	fs: IFileSystem,
	projectRoot: string
): Promise<CoreAgentDefinition[]> {
	const dir = workspaceAgentsDirectory(projectRoot);
	return scanAgentDefinitionsInDirectory(fs, dir);
}
