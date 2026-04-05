import * as assert from 'assert';
import * as fsp from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { NodeFsAdapter } from '../../../src/scanner/adapters/nodeFsAdapter';
import { scanClaudeCodeCore } from '../../../src/scanner/core/scanClaudeCodeCore';
import type { IFileSystem, FileTypeValue } from '../../../src/scanner/core/types';
import { FileType } from '../../../src/scanner/core/types';

/** Mock fs that lists files but throws on readFile — exercises error catch paths */
class ReadFileThrowingFs implements IFileSystem {
	constructor(
		private rulesEntries: [string, FileTypeValue][] = [],
		private commandsEntries: [string, FileTypeValue][] = []
	) {}

	async readFile(_p: string): Promise<Buffer> {
		throw new Error('Permission denied');
	}

	async readDirectory(dirPath: string): Promise<[string, FileTypeValue][]> {
		if (dirPath.endsWith(path.join('.claude', 'rules'))) { return this.rulesEntries; }
		if (dirPath.endsWith(path.join('.claude', 'commands'))) { return this.commandsEntries; }
		return [];
	}

	async stat(_p: string): Promise<{ type: FileTypeValue }> {
		throw new Error('not found');
	}
}

describe('scanClaudeCodeCore', () => {
	let tmpDir: string;
	const fs = new NodeFsAdapter();

	beforeEach(async () => {
		tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'ace-claude-'));
	});

	afterEach(async () => {
		await fsp.rm(tmpDir, { recursive: true, force: true });
	});

	describe('CLAUDE.md detection', () => {
		it('detects CLAUDE.md when present', async () => {
			await fsp.writeFile(path.join(tmpDir, 'CLAUDE.md'), 'See AGENTS.md');
			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.ok(result.claudeMdPath);
			assert.equal(result.claudeMdPath, path.join(tmpDir, 'CLAUDE.md'));
			assert.equal(result.hasAnyArtifacts, true);
		});

		it('returns undefined when CLAUDE.md is absent', async () => {
			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.equal(result.claudeMdPath, undefined);
		});
	});

	describe('CLAUDE.md — directory at same path is not detected', () => {
		it('does not detect a directory named CLAUDE.md', async () => {
			await fsp.mkdir(path.join(tmpDir, 'CLAUDE.md'), { recursive: true });
			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.equal(result.claudeMdPath, undefined);
		});
	});

	describe('rules scanning', () => {
		it('scans .claude/rules/ recursively for .md and .mdc files', async () => {
			const rulesDir = path.join(tmpDir, '.claude', 'rules');
			await fsp.mkdir(rulesDir, { recursive: true });
			await fsp.writeFile(path.join(rulesDir, 'my-rule.mdc'), '---\ndescription: My rule\n---\nContent');
			await fsp.writeFile(path.join(rulesDir, 'another.md'), '---\ndescription: Another\n---\nMore');

			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.equal(result.rules.length, 2);
			assert.ok(result.rules.some(r => r.fileName === 'my-rule.mdc'));
			assert.ok(result.rules.some(r => r.fileName === 'another.md'));
		});

		it('scans rules in subdirectories (recursive)', async () => {
			const subDir = path.join(tmpDir, '.claude', 'rules', 'sub');
			await fsp.mkdir(subDir, { recursive: true });
			await fsp.writeFile(path.join(subDir, 'nested.mdc'), '---\ndescription: Nested\n---\nBody');

			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.equal(result.rules.length, 1);
			assert.equal(result.rules[0].fileName, 'nested.mdc');
			assert.equal(result.rules[0].metadata.description, 'Nested');
		});

		it('returns empty rules when .claude/rules/ is absent', async () => {
			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.deepEqual(result.rules, []);
		});

		it('returns empty rules when .claude/rules/ is empty', async () => {
			await fsp.mkdir(path.join(tmpDir, '.claude', 'rules'), { recursive: true });
			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.deepEqual(result.rules, []);
		});

		it('parses globs and alwaysApply from rule frontmatter', async () => {
			const rulesDir = path.join(tmpDir, '.claude', 'rules');
			await fsp.mkdir(rulesDir, { recursive: true });
			await fsp.writeFile(
				path.join(rulesDir, 'typed.mdc'),
				'---\ndescription: Typed rule\nglobs:\n  - "*.ts"\n  - "*.tsx"\nalwaysApply: true\n---\nBody'
			);

			const result = await scanClaudeCodeCore(fs, tmpDir);
			const rule = result.rules[0];
			assert.equal(rule.metadata.description, 'Typed rule');
			assert.deepEqual(rule.metadata.globs, ['*.ts', '*.tsx']);
			assert.equal(rule.metadata.alwaysApply, true);
		});

		it('uses fallback description for rule with no frontmatter', async () => {
			const rulesDir = path.join(tmpDir, '.claude', 'rules');
			await fsp.mkdir(rulesDir, { recursive: true });
			await fsp.writeFile(path.join(rulesDir, 'bare.md'), 'Just content, no frontmatter');

			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.equal(result.rules.length, 1);
			assert.equal(result.rules[0].metadata.description, 'No description');
		});

		it('ignores non-.md/.mdc files in rules directory', async () => {
			const rulesDir = path.join(tmpDir, '.claude', 'rules');
			await fsp.mkdir(rulesDir, { recursive: true });
			await fsp.writeFile(path.join(rulesDir, 'ignore.txt'), 'text');
			await fsp.writeFile(path.join(rulesDir, 'ignore.json'), '{}');
			await fsp.writeFile(path.join(rulesDir, 'keep.mdc'), '---\ndescription: Keep\n---\n');

			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.equal(result.rules.length, 1);
			assert.equal(result.rules[0].fileName, 'keep.mdc');
		});
	});

	describe('commands scanning', () => {
		it('scans .claude/commands/ for .md files', async () => {
			const commandsDir = path.join(tmpDir, '.claude', 'commands');
			await fsp.mkdir(commandsDir, { recursive: true });
			await fsp.writeFile(path.join(commandsDir, 'my-cmd.md'), '# My Command');
			await fsp.writeFile(path.join(commandsDir, 'other.md'), '# Other');

			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.equal(result.commands.length, 2);
			assert.ok(result.commands.some(c => c.fileName === 'my-cmd'));
			assert.ok(result.commands.some(c => c.fileName === 'other'));
		});

		it('excludes README.md from commands', async () => {
			const commandsDir = path.join(tmpDir, '.claude', 'commands');
			await fsp.mkdir(commandsDir, { recursive: true });
			await fsp.writeFile(path.join(commandsDir, 'README.md'), '# Readme');
			await fsp.writeFile(path.join(commandsDir, 'real-cmd.md'), '# Real');

			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.equal(result.commands.length, 1);
			assert.equal(result.commands[0].fileName, 'real-cmd');
		});

		it('returns empty commands when .claude/commands/ is absent', async () => {
			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.deepEqual(result.commands, []);
		});

		it('returns empty commands when directory is empty', async () => {
			await fsp.mkdir(path.join(tmpDir, '.claude', 'commands'), { recursive: true });
			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.deepEqual(result.commands, []);
		});

		it('strips .md extension from fileName', async () => {
			const commandsDir = path.join(tmpDir, '.claude', 'commands');
			await fsp.mkdir(commandsDir, { recursive: true });
			await fsp.writeFile(path.join(commandsDir, 'start-task.md'), '# Start');

			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.equal(result.commands[0].fileName, 'start-task');
		});

		it('reads command content correctly', async () => {
			const commandsDir = path.join(tmpDir, '.claude', 'commands');
			await fsp.mkdir(commandsDir, { recursive: true });
			const body = '# My Command\n\nDoes something useful.';
			await fsp.writeFile(path.join(commandsDir, 'my-cmd.md'), body);

			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.equal(result.commands[0].content, body);
		});

		it('all commands have location workspace', async () => {
			const commandsDir = path.join(tmpDir, '.claude', 'commands');
			await fsp.mkdir(commandsDir, { recursive: true });
			await fsp.writeFile(path.join(commandsDir, 'a.md'), '# A');
			await fsp.writeFile(path.join(commandsDir, 'b.md'), '# B');

			const result = await scanClaudeCodeCore(fs, tmpDir);
			result.commands.forEach(c => assert.equal(c.location, 'workspace'));
		});

		it('ignores non-.md files in commands directory', async () => {
			const commandsDir = path.join(tmpDir, '.claude', 'commands');
			await fsp.mkdir(commandsDir, { recursive: true });
			await fsp.writeFile(path.join(commandsDir, 'script.sh'), 'echo hello');
			await fsp.writeFile(path.join(commandsDir, 'data.json'), '{}');
			await fsp.writeFile(path.join(commandsDir, 'cmd.md'), '# Cmd');

			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.equal(result.commands.length, 1);
			assert.equal(result.commands[0].fileName, 'cmd');
		});
	});

	describe('skills scanning', () => {
		it('scans one-level subdirectories for SKILL.md', async () => {
			const skillDir = path.join(tmpDir, '.claude', 'skills', 'my-skill');
			await fsp.mkdir(skillDir, { recursive: true });
			await fsp.writeFile(path.join(skillDir, 'SKILL.md'), '---\ntitle: My Skill\noverview: Does things\n---\n');

			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.equal(result.skills.length, 1);
			assert.equal(result.skills[0].fileName, 'my-skill');
			assert.equal(result.skills[0].metadata?.title, 'My Skill');
			assert.equal(result.skills[0].metadata?.overview, 'Does things');
		});

		it('returns empty skills when .claude/skills/ is absent', async () => {
			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.deepEqual(result.skills, []);
		});

		it('returns empty skills when directory is empty', async () => {
			await fsp.mkdir(path.join(tmpDir, '.claude', 'skills'), { recursive: true });
			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.deepEqual(result.skills, []);
		});

		it('skips skill subdirectory without SKILL.md', async () => {
			const skillDir = path.join(tmpDir, '.claude', 'skills', 'no-skill-md');
			await fsp.mkdir(skillDir, { recursive: true });
			// No SKILL.md written

			const result = await scanClaudeCodeCore(fs, tmpDir);
			// Directory is listed but SKILL.md read fails - pushed with error content
			assert.equal(result.skills.length, 1);
			assert.equal(result.skills[0].content, 'Error reading file content');
		});

		it('scans multiple skills', async () => {
			for (const name of ['alpha', 'beta', 'gamma']) {
				const dir = path.join(tmpDir, '.claude', 'skills', name);
				await fsp.mkdir(dir, { recursive: true });
				await fsp.writeFile(path.join(dir, 'SKILL.md'), `---\ntitle: ${name}\n---\n`);
			}

			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.equal(result.skills.length, 3);
			const names = result.skills.map(s => s.fileName).sort();
			assert.deepEqual(names, ['alpha', 'beta', 'gamma']);
		});

		it('uses fileName as fallback when skill has no frontmatter title', async () => {
			const skillDir = path.join(tmpDir, '.claude', 'skills', 'plain-skill');
			await fsp.mkdir(skillDir, { recursive: true });
			await fsp.writeFile(path.join(skillDir, 'SKILL.md'), 'No frontmatter here.');

			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.equal(result.skills[0].fileName, 'plain-skill');
			assert.equal(result.skills[0].metadata, undefined);
		});

		it('extracts title from first heading when skill has no frontmatter', async () => {
			const skillDir = path.join(tmpDir, '.claude', 'skills', 'heading-skill');
			await fsp.mkdir(skillDir, { recursive: true });
			await fsp.writeFile(path.join(skillDir, 'SKILL.md'), '# Heading Title\n\nContent here.');

			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.equal(result.skills[0].metadata?.title, 'Heading Title');
		});

		it('all skills have location workspace', async () => {
			const skillDir = path.join(tmpDir, '.claude', 'skills', 'my-skill');
			await fsp.mkdir(skillDir, { recursive: true });
			await fsp.writeFile(path.join(skillDir, 'SKILL.md'), '---\ntitle: T\n---\n');

			const result = await scanClaudeCodeCore(fs, tmpDir);
			result.skills.forEach(s => assert.equal(s.location, 'workspace'));
		});

		it('ignores files at the skills root (only scans subdirectories)', async () => {
			const skillsRoot = path.join(tmpDir, '.claude', 'skills');
			await fsp.mkdir(skillsRoot, { recursive: true });
			await fsp.writeFile(path.join(skillsRoot, 'SKILL.md'), 'root level — should be ignored');

			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.deepEqual(result.skills, []);
		});
	});

	describe('hasAnyArtifacts', () => {
		it('returns false when project root has no claude artifacts', async () => {
			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.equal(result.hasAnyArtifacts, false);
		});

		it('returns true when only CLAUDE.md exists', async () => {
			await fsp.writeFile(path.join(tmpDir, 'CLAUDE.md'), 'content');
			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.equal(result.hasAnyArtifacts, true);
		});

		it('returns true when only commands exist', async () => {
			const commandsDir = path.join(tmpDir, '.claude', 'commands');
			await fsp.mkdir(commandsDir, { recursive: true });
			await fsp.writeFile(path.join(commandsDir, 'cmd.md'), '# Cmd');
			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.equal(result.hasAnyArtifacts, true);
		});

		it('returns true when only rules exist', async () => {
			const rulesDir = path.join(tmpDir, '.claude', 'rules');
			await fsp.mkdir(rulesDir, { recursive: true });
			await fsp.writeFile(path.join(rulesDir, 'r.mdc'), '---\ndescription: R\n---\n');
			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.equal(result.hasAnyArtifacts, true);
		});

		it('returns true when only skills exist', async () => {
			const skillDir = path.join(tmpDir, '.claude', 'skills', 'sk');
			await fsp.mkdir(skillDir, { recursive: true });
			await fsp.writeFile(path.join(skillDir, 'SKILL.md'), '---\ntitle: Sk\n---\n');
			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.equal(result.hasAnyArtifacts, true);
		});
	});

	describe('mixed state', () => {
		it('returns all artifact types when all are present', async () => {
			// CLAUDE.md
			await fsp.writeFile(path.join(tmpDir, 'CLAUDE.md'), 'See AGENTS.md');

			// Rule
			const rulesDir = path.join(tmpDir, '.claude', 'rules');
			await fsp.mkdir(rulesDir, { recursive: true });
			await fsp.writeFile(path.join(rulesDir, 'rule.md'), '---\ndescription: A rule\n---\nBody');

			// Command
			const commandsDir = path.join(tmpDir, '.claude', 'commands');
			await fsp.mkdir(commandsDir, { recursive: true });
			await fsp.writeFile(path.join(commandsDir, 'cmd.md'), '# Cmd');

			// Skill
			const skillDir = path.join(tmpDir, '.claude', 'skills', 'skill-one');
			await fsp.mkdir(skillDir, { recursive: true });
			await fsp.writeFile(path.join(skillDir, 'SKILL.md'), '---\ntitle: Skill One\n---\n');

			const result = await scanClaudeCodeCore(fs, tmpDir);
			assert.ok(result.claudeMdPath);
			assert.equal(result.rules.length, 1);
			assert.equal(result.commands.length, 1);
			assert.equal(result.skills.length, 1);
			assert.equal(result.hasAnyArtifacts, true);
		});
	});
});

describe('scanClaudeCodeCore — readFile error paths (mock fs)', () => {
	it('rule readFile error: pushes fallback entry with "Error parsing file" description', async () => {
		const mockFs = new ReadFileThrowingFs(
			[['fail.mdc', FileType.File]],
			[]
		);
		const result = await scanClaudeCodeCore(mockFs, '/root');
		assert.equal(result.rules.length, 1);
		assert.equal(result.rules[0].metadata.description, 'Error parsing file');
		assert.equal(result.rules[0].content, 'Error reading file content');
		assert.equal(result.rules[0].fileName, 'fail.mdc');
	});

	it('command readFile error: pushes fallback entry with error content', async () => {
		const mockFs = new ReadFileThrowingFs(
			[],
			[['fail.md', FileType.File]]
		);
		const result = await scanClaudeCodeCore(mockFs, '/root');
		assert.equal(result.commands.length, 1);
		assert.equal(result.commands[0].content, 'Error reading file content');
		assert.equal(result.commands[0].fileName, 'fail');
		assert.equal(result.commands[0].location, 'workspace');
	});

	it('both rule and command readFile errors in one scan', async () => {
		const mockFs = new ReadFileThrowingFs(
			[['r.mdc', FileType.File]],
			[['c.md', FileType.File]]
		);
		const result = await scanClaudeCodeCore(mockFs, '/root');
		assert.equal(result.rules.length, 1);
		assert.equal(result.commands.length, 1);
		assert.equal(result.rules[0].metadata.description, 'Error parsing file');
		assert.equal(result.commands[0].content, 'Error reading file content');
	});
});
