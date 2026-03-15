import * as assert from 'assert';
import * as path from 'path';
import { scanSkillsCore } from '../../../src/scanner/core/scanSkillsCore';
import type { IFileSystem } from '../../../src/scanner/core/types';
import { FileType, type FileTypeValue } from '../../../src/scanner/core/types';

function createMockFs(
	files: Map<string, Buffer>,
	dirs: Map<string, [string, FileTypeValue][]>
): IFileSystem {
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

describe('scanner/core/scanSkillsCore', () => {
	const projectRoot = '/project';
	const userRoot = '/user';

	it('returns empty array when no skills dirs exist', async () => {
		const fs = createMockFs(new Map(), new Map());
		const out = await scanSkillsCore(fs, projectRoot, userRoot);
		assert.deepStrictEqual(out, []);
	});

	it('scans workspace skill from .cursor/skills/<name>/SKILL.md', async () => {
		const projectSkillsDir = path.join(projectRoot, '.cursor', 'skills');
		const skillPath = path.join(projectSkillsDir, 'create-plan', 'SKILL.md');
		const content = Buffer.from('# Create Plan\n\n## Overview\n\nCreate a plan.');
		const fs = createMockFs(
			new Map([[skillPath, content]]),
			new Map([[projectSkillsDir, [['create-plan', FileType.Directory]]]])
		);
		const out = await scanSkillsCore(fs, projectRoot, userRoot);
		assert.strictEqual(out.length, 1);
		assert.strictEqual(out[0].fileName, 'create-plan');
		assert.strictEqual(out[0].path, skillPath);
		assert.strictEqual(out[0].location, 'workspace');
		assert.ok(out[0].metadata?.title?.includes('Create Plan'));
	});

	it('scans global skill from userRoot .cursor/skills', async () => {
		const userSkillsDir = path.join(userRoot, '.cursor', 'skills');
		const skillPath = path.join(userSkillsDir, 'review-code', 'SKILL.md');
		const content = Buffer.from('# Review Code\n\n## Overview\n\nReview code.');
		const fs = createMockFs(
			new Map([[skillPath, content]]),
			new Map([[userSkillsDir, [['review-code', FileType.Directory]]]])
		);
		const out = await scanSkillsCore(fs, projectRoot, userRoot);
		assert.strictEqual(out.length, 1);
		assert.strictEqual(out[0].fileName, 'review-code');
		assert.strictEqual(out[0].location, 'global');
	});

	it('skips non-directory entries in skills dir', async () => {
		const projectSkillsDir = path.join(projectRoot, '.cursor', 'skills');
		const fs = createMockFs(
			new Map(),
			new Map([[projectSkillsDir, [['file.txt', FileType.File], ['a-skill', FileType.Directory]]]])
		);
		const skillPath = path.join(projectSkillsDir, 'a-skill', 'SKILL.md');
		(fs as any).readFile = async (p: string) => {
			if (p === skillPath) return Buffer.from('# A Skill');
			throw new Error('ENOENT');
		};
		const out = await scanSkillsCore(fs, projectRoot, userRoot);
		assert.strictEqual(out.length, 1);
		assert.strictEqual(out[0].fileName, 'a-skill');
	});

	it('adds error placeholder when SKILL.md read fails', async () => {
		const projectSkillsDir = path.join(projectRoot, '.cursor', 'skills');
		const fs = createMockFs(
			new Map(), // no SKILL.md content
			new Map([[projectSkillsDir, [['broken', FileType.Directory]]]])
		);
		const out = await scanSkillsCore(fs, projectRoot, userRoot);
		assert.strictEqual(out.length, 1);
		assert.strictEqual(out[0].fileName, 'broken');
		assert.strictEqual(out[0].content, 'Error reading file content');
	});
});
