import * as assert from 'assert';
import * as path from 'path';
import {
	scanAgentDefinitionsInDirectory,
	scanWorkspaceAgentDefinitionsCore,
	workspaceAgentsDirectory
} from '../../../src/scanner/core/scanAgentDefinitionsCore';
import type { IFileSystem } from '../../../src/scanner/core/types';
import { FileType, type FileTypeValue } from '../../../src/scanner/core/types';

function createMockFs(files: Map<string, Buffer>, dirs: Map<string, [string, FileTypeValue][]>): IFileSystem {
	return {
		async stat(p: string): Promise<{ type: FileTypeValue; mtime?: number }> {
			if (files.has(p)) return { type: FileType.File, mtime: Date.now() };
			if (dirs.has(p)) return { type: FileType.Directory };
			throw new Error(`ENOENT: ${p}`);
		},
		async readFile(p: string): Promise<Buffer> {
			const b = files.get(p);
			if (b) return b;
			throw new Error(`ENOENT: ${p}`);
		},
		async readDirectory(p: string): Promise<[string, FileTypeValue][]> {
			const entries = dirs.get(p);
			if (entries) return entries;
			throw new Error(`ENOENT: ${p}`);
		}
	};
}

describe('scanner/core/scanAgentDefinitionsCore', () => {
	const proj = '/project';

	it('workspaceAgentsDirectory points to .cursor/agents', () => {
		assert.strictEqual(workspaceAgentsDirectory(proj), path.join(proj, '.cursor', 'agents'));
	});

	it('scanWorkspaceAgentDefinitionsCore reads flat .md and sorts by basename', async () => {
		const agentsDir = workspaceAgentsDirectory(proj);
		const aAgentPath = path.join(agentsDir, 'a-agent.md');
		const bAgentPath = path.join(agentsDir, 'b-agent.md');
		const fs = createMockFs(
			new Map([
				[aAgentPath, Buffer.from('# Alpha')],
				[bAgentPath, Buffer.from('# Beta')]
			]),
			new Map([[agentsDir, [
				['b-agent.md', FileType.File],
				['a-agent.md', FileType.File]
			]]])
		);
		const out = await scanWorkspaceAgentDefinitionsCore(fs, proj);
		assert.strictEqual(out.length, 2);
		assert.strictEqual(out[0].displayName, 'a-agent');
		assert.strictEqual(out[1].displayName, 'b-agent');
		assert.strictEqual(out[0].content, '# Alpha');
	});

	it('scanAgentDefinitionsInDirectory returns empty when directory missing', async () => {
		const fs = createMockFs(new Map(), new Map());
		const out = await scanAgentDefinitionsInDirectory(fs, path.join(proj, '.cursor', 'agents'));
		assert.deepStrictEqual(out, []);
	});

	it('scanAgentDefinitionsInDirectory skips non-.md files', async () => {
		const dir = path.join(proj, '.cursor', 'agents');
		const mdPath = path.join(dir, 'x.md');
		const fs = createMockFs(
			new Map([[mdPath, Buffer.from('x')]]),
			new Map([[dir, [['x.md', FileType.File], ['notes.txt', FileType.File]]]])
		);
		const out = await scanAgentDefinitionsInDirectory(fs, dir);
		assert.strictEqual(out.length, 1);
		assert.strictEqual(out[0].fileName, 'x');
	});
});
