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

	it('specs skips child entries that are not directories', async () => {
		const specsPath = path.join(projectRoot, 'specs');
		const fs = createMockFs(new Map(), new Map([[specsPath, [['readme', FileType.File]]]]));
		const out = await scanAsdlcCore(fs, projectRoot);
		assert.strictEqual(out.specs.exists, true);
		assert.strictEqual(out.specs.specs.length, 0);
	});

	it('specs skips domain when spec.md stat is not a file', async () => {
		const specsPath = path.join(projectRoot, 'specs');
		const specFile = path.join(specsPath, 'auth', 'spec.md');
		const fs = createMockFs(new Map(), new Map([[specsPath, [['auth', FileType.Directory]]]]));
		(fs as any).stat = async (p: string) => {
			if (p === specsPath) return { type: FileType.Directory };
			if (p === specFile) return { type: FileType.Directory };
			throw new Error('ENOENT');
		};
		const out = await scanAsdlcCore(fs, projectRoot);
		assert.strictEqual(out.specs.specs.length, 0);
	});

	it('specs skips domain when readFile throws', async () => {
		const specsPath = path.join(projectRoot, 'specs');
		const specFile = path.join(specsPath, 'auth', 'spec.md');
		const fs = createMockFs(new Map(), new Map([[specsPath, [['auth', FileType.Directory]]]]));
		(fs as any).readFile = async (p: string) => {
			if (p === specFile) throw new Error('EACCES');
			throw new Error('ENOENT');
		};
		const out = await scanAsdlcCore(fs, projectRoot);
		assert.strictEqual(out.specs.specs.length, 0);
	});

	it('specs uses undefined lastModified when stat has no mtime', async () => {
		const specsPath = path.join(projectRoot, 'specs');
		const specPath = path.join(specsPath, 'auth', 'spec.md');
		const specContent = Buffer.from('# A\n\n## Blueprint\n\nx\n\n## Contract\n\ny');
		const fs = createMockFs(
			new Map([[specPath, specContent]]),
			new Map([[specsPath, [['auth', FileType.Directory]]]])
		);
		(fs as any).stat = async (p: string) => {
			if (p === specPath) return { type: FileType.File };
			if (p === specsPath) return { type: FileType.Directory };
			throw new Error('ENOENT');
		};
		const out = await scanAsdlcCore(fs, projectRoot);
		assert.strictEqual(out.specs.specs[0].lastModified, undefined);
	});

	it('schemas skips non-json files', async () => {
		const schemasPath = path.join(projectRoot, 'schemas');
		const fs = createMockFs(new Map(), new Map([[schemasPath, [['note.txt', FileType.File]]]]));
		const out = await scanAsdlcCore(fs, projectRoot);
		assert.strictEqual(out.schemas.schemas.length, 0);
	});

	it('schemas adds entry without schemaId when readFile throws', async () => {
		const schemasPath = path.join(projectRoot, 'schemas');
		const schemaPath = path.join(schemasPath, 'bad.json');
		const fs = createMockFs(new Map(), new Map([[schemasPath, [['bad.json', FileType.File]]]]));
		(fs as any).readFile = async (p: string) => {
			if (p === schemaPath) throw new Error('read fail');
			throw new Error('ENOENT');
		};
		const out = await scanAsdlcCore(fs, projectRoot);
		assert.strictEqual(out.schemas.schemas.length, 1);
		assert.strictEqual(out.schemas.schemas[0].name, 'bad');
		assert.strictEqual(out.schemas.schemas[0].schemaId, undefined);
	});

	it('specs returns empty when specs path is not a directory', async () => {
		const specsPath = path.join(projectRoot, 'specs');
		const fs = createMockFs(new Map(), new Map());
		(fs as any).stat = async (p: string) => {
			if (p === specsPath) return { type: FileType.File };
			throw new Error('ENOENT');
		};
		const out = await scanAsdlcCore(fs, projectRoot);
		assert.strictEqual(out.specs.exists, false);
		assert.deepStrictEqual(out.specs.specs, []);
	});

	it('specs outer catch when specs directory stat throws', async () => {
		const specsPath = path.join(projectRoot, 'specs');
		const fs = createMockFs(new Map(), new Map());
		(fs as any).stat = async (p: string) => {
			if (p === specsPath) throw new Error('ENOENT');
			throw new Error('ENOENT');
		};
		const out = await scanAsdlcCore(fs, projectRoot);
		assert.strictEqual(out.specs.exists, false);
	});

	it('schemas returns empty when schemas path is not a directory', async () => {
		const schemasPath = path.join(projectRoot, 'schemas');
		const fs = createMockFs(new Map(), new Map());
		(fs as any).stat = async (p: string) => {
			if (p === schemasPath) return { type: FileType.File };
			throw new Error('ENOENT');
		};
		const out = await scanAsdlcCore(fs, projectRoot);
		assert.strictEqual(out.schemas.exists, false);
	});

	it('schemas outer catch when schemas directory stat throws', async () => {
		const schemasPath = path.join(projectRoot, 'schemas');
		const fs = createMockFs(new Map(), new Map());
		(fs as any).stat = async (p: string) => {
			if (p === schemasPath) throw new Error('ENOENT');
			throw new Error('ENOENT');
		};
		const out = await scanAsdlcCore(fs, projectRoot);
		assert.strictEqual(out.schemas.exists, false);
	});

	it('schemas includes json reached via symbolic link entry', async () => {
		const schemasPath = path.join(projectRoot, 'schemas');
		const schemaPath = path.join(schemasPath, 'via-link.json');
		const schemaContent = Buffer.from(JSON.stringify({ $id: 'urn:sym' }));
		const fs = createMockFs(
			new Map([[schemaPath, schemaContent]]),
			new Map([[schemasPath, [['via-link.json', FileType.SymbolicLink]]]])
		);
		const out = await scanAsdlcCore(fs, projectRoot);
		assert.strictEqual(out.schemas.schemas.length, 1);
		assert.strictEqual(out.schemas.schemas[0].schemaId, 'urn:sym');
	});
});
