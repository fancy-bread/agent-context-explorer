import * as assert from 'assert';
import * as path from 'path';
import * as core from '../../../src/scanner/core';
import { scanAsdlcCore } from '../../../src/scanner/core/scanAsdlcCore';
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

describe('scanner/core index', () => {
	it('re-exports scanAsdlcCore and scanSkillsCore', () => {
		assert.strictEqual(typeof core.scanAsdlcCore, 'function');
		assert.strictEqual(typeof core.scanSkillsCore, 'function');
		assert.strictEqual(typeof core.scanRulesCore, 'function');
		assert.strictEqual(typeof core.scanCommandsCore, 'function');
	});
});

describe('scanner/core/scanAsdlcCore', () => {
	const projectRoot = '/project';

	it('returns hasAnyArtifacts false when no artifacts', async () => {
		const fs = createMockFs(new Map(), new Map());
		const out = await scanAsdlcCore(fs, projectRoot);
		assert.strictEqual(out.agentsMd.exists, false);
		assert.strictEqual(out.specs.exists, false);
		assert.strictEqual(out.schemas.exists, false);
		assert.strictEqual(out.hasAnyArtifacts, false);
	});

	it('scans AGENTS.md when present', async () => {
		const agentsPath = path.join(projectRoot, 'AGENTS.md');
		const content = Buffer.from('# AGENTS.md\n\n> Mission.\n\n## Tech Stack\n\n- TypeScript');
		const fs = createMockFs(new Map([[agentsPath, content]]), new Map());
		const out = await scanAsdlcCore(fs, projectRoot);
		assert.strictEqual(out.agentsMd.exists, true);
		assert.strictEqual(out.agentsMd.path, agentsPath);
		assert.ok(out.agentsMd.content?.includes('Mission'));
		assert.strictEqual(out.hasAnyArtifacts, true);
	});

	it('returns agentsMd exists false when stat throws', async () => {
		const fs = createMockFs(new Map(), new Map());
		const out = await scanAsdlcCore(fs, projectRoot);
		assert.strictEqual(out.agentsMd.exists, false);
	});

	it('scans specs directory and spec.md files', async () => {
		const specsPath = path.join(projectRoot, 'specs');
		const specPath = path.join(specsPath, 'auth', 'spec.md');
		const specContent = Buffer.from('# Auth\n\n## Blueprint\n\nDesign.\n\n## Contract\n\nDone.');
		const fs = createMockFs(
			new Map([[specPath, specContent]]),
			new Map([[specsPath, [['auth', FileType.Directory]]]])
		);
		const out = await scanAsdlcCore(fs, projectRoot);
		assert.strictEqual(out.specs.exists, true);
		assert.strictEqual(out.specs.specs?.length, 1);
		assert.strictEqual(out.specs.specs?.[0].domain, 'auth');
		assert.strictEqual(out.specs.specs?.[0].hasBlueprint, true);
		assert.strictEqual(out.specs.specs?.[0].hasContract, true);
	});

	it('scans schemas directory and json files', async () => {
		const schemasPath = path.join(projectRoot, 'schemas');
		const schemaPath = path.join(schemasPath, 'config.json');
		const schemaContent = Buffer.from(JSON.stringify({ $id: 'https://example.com/config.json', type: 'object' }));
		const fs = createMockFs(
			new Map([[schemaPath, schemaContent]]),
			new Map([[schemasPath, [['config.json', FileType.File]]]])
		);
		const out = await scanAsdlcCore(fs, projectRoot);
		assert.strictEqual(out.schemas.exists, true);
		assert.strictEqual(out.schemas.schemas?.length, 1);
		assert.strictEqual(out.schemas.schemas?.[0].name, 'config');
		assert.strictEqual(out.schemas.schemas?.[0].schemaId, 'https://example.com/config.json');
	});

	it('returns agentsMd exists false when stat returns Directory', async () => {
		const agentsPath = path.join(projectRoot, 'AGENTS.md');
		const fs = createMockFs(new Map(), new Map([[agentsPath, []]]));
		(fs as any).stat = async (p: string) => {
			if (p === agentsPath) return { type: FileType.Directory };
			throw new Error('ENOENT');
		};
		const out = await scanAsdlcCore(fs, projectRoot);
		assert.strictEqual(out.agentsMd.exists, false);
	});
});
