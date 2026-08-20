import * as assert from 'assert';
import * as path from 'path';
import { scanSkillsCore, scanAgentSkillsCore } from '../../../src/scanner/core/scanSkillsCore';
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

	it('scans global skill from userRoot .cursor/skills when the project has a local .cursor/ folder', async () => {
		const projectCursorDir = path.join(projectRoot, '.cursor');
		const userSkillsDir = path.join(userRoot, '.cursor', 'skills');
		const skillPath = path.join(userSkillsDir, 'review-code', 'SKILL.md');
		const content = Buffer.from('# Review Code\n\n## Overview\n\nReview code.');
		const fs = createMockFs(
			new Map([[skillPath, content]]),
			new Map([
				[projectCursorDir, []],
				[userSkillsDir, [['review-code', FileType.Directory]]]
			])
		);
		const out = await scanSkillsCore(fs, projectRoot, userRoot);
		assert.strictEqual(out.length, 1);
		assert.strictEqual(out[0].fileName, 'review-code');
		assert.strictEqual(out[0].location, 'global');
	});

	it('omits global .cursor/skills when the project has no local .cursor/ folder', async () => {
		const userSkillsDir = path.join(userRoot, '.cursor', 'skills');
		const skillPath = path.join(userSkillsDir, 'review-code', 'SKILL.md');
		const content = Buffer.from('# Review Code\n\n## Overview\n\nReview code.');
		const fs = createMockFs(
			new Map([[skillPath, content]]),
			new Map([[userSkillsDir, [['review-code', FileType.Directory]]]])
			// No `.cursor` entry for projectRoot — directoryExists() returns false, gate stays closed
		);
		const out = await scanSkillsCore(fs, projectRoot, userRoot);
		assert.deepStrictEqual(out, []);
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

	it('pushes skill without metadata object when parseSKILLMetadata returns undefined', async () => {
		const projectSkillsDir = path.join(projectRoot, '.cursor', 'skills');
		const skillPath = path.join(projectSkillsDir, 'plain', 'SKILL.md');
		// No YAML frontmatter, no markdown heading → undefined metadata
		const content = Buffer.from('plain body only');
		const fs = createMockFs(
			new Map([[skillPath, content]]),
			new Map([[projectSkillsDir, [['plain', FileType.Directory]]]])
		);
		const out = await scanSkillsCore(fs, projectRoot, userRoot);
		assert.strictEqual(out.length, 1);
		assert.strictEqual(out[0].fileName, 'plain');
		assert.strictEqual(out[0].metadata, undefined);
	});

	it('merges .claude/skills workspace skills alongside .cursor/skills, tagged by platform (spec 011)', async () => {
		const cursorSkillsDir = path.join(projectRoot, '.cursor', 'skills');
		const claudeSkillsDir = path.join(projectRoot, '.claude', 'skills');
		const cursorSkillPath = path.join(cursorSkillsDir, 'cursor-skill', 'SKILL.md');
		const claudeSkillPath = path.join(claudeSkillsDir, 'claude-skill', 'SKILL.md');
		const fs = createMockFs(
			new Map([
				[cursorSkillPath, Buffer.from('# Cursor Skill')],
				[claudeSkillPath, Buffer.from('# Claude Skill')]
			]),
			new Map([
				[cursorSkillsDir, [['cursor-skill', FileType.Directory]]],
				[claudeSkillsDir, [['claude-skill', FileType.Directory]]]
			])
		);
		const out = await scanSkillsCore(fs, projectRoot, userRoot);
		assert.strictEqual(out.length, 2);
		const cursorSkill = out.find(s => s.fileName === 'cursor-skill');
		const claudeSkill = out.find(s => s.fileName === 'claude-skill');
		assert.strictEqual(cursorSkill?.platform, 'cursor');
		assert.strictEqual(cursorSkill?.location, 'workspace');
		assert.strictEqual(claudeSkill?.platform, 'claude');
		assert.strictEqual(claudeSkill?.location, 'workspace');
	});

	it('returns only claude skills when .cursor/skills is absent (FR-006)', async () => {
		const claudeSkillsDir = path.join(projectRoot, '.claude', 'skills');
		const claudeSkillPath = path.join(claudeSkillsDir, 'claude-only', 'SKILL.md');
		const fs = createMockFs(
			new Map([[claudeSkillPath, Buffer.from('# Claude Only')]]),
			new Map([[claudeSkillsDir, [['claude-only', FileType.Directory]]]])
		);
		const out = await scanSkillsCore(fs, projectRoot, userRoot);
		assert.strictEqual(out.length, 1);
		assert.strictEqual(out[0].platform, 'claude');
	});

	it('global skills remain platform: cursor only — no new global .claude scanning (FR-007)', async () => {
		const projectCursorDir = path.join(projectRoot, '.cursor');
		const userSkillsDir = path.join(userRoot, '.cursor', 'skills');
		const skillPath = path.join(userSkillsDir, 'review-code', 'SKILL.md');
		const fs = createMockFs(
			new Map([[skillPath, Buffer.from('# Review Code')]]),
			new Map([
				[projectCursorDir, []],
				[userSkillsDir, [['review-code', FileType.Directory]]]
			])
		);
		const out = await scanSkillsCore(fs, projectRoot, userRoot);
		const global = out.filter(s => s.location === 'global');
		assert.strictEqual(global.length, 1);
		assert.strictEqual(global[0].platform, 'cursor');
	});

	it('scanAgentSkillsCore scans skills from an agent root', async () => {
		const agentRoot = '/agents/root';
		const skillsDir = path.join(agentRoot, 'skills');
		const skillPath = path.join(skillsDir, 'agent-skill', 'SKILL.md');
		const files = new Map<string, Buffer>([
			[skillPath, Buffer.from('# Agent Skill')]
		]);
		const dirs = new Map<string, [string, FileTypeValue][]>([
			[skillsDir, [['agent-skill', FileType.Directory]]]
		]);
		const fs = createMockFs(files, dirs);

		const out = await scanAgentSkillsCore(fs, agentRoot);

		assert.strictEqual(out.length, 1);
		assert.strictEqual(out[0].fileName, 'agent-skill');
		assert.strictEqual(out[0].location, 'global');
	});
});
