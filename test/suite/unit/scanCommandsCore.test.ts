import * as assert from 'assert';
import * as path from 'path';
import { scanCommandsCore, scanAgentCommandsCore } from '../../../src/scanner/core/scanCommandsCore';
import type { IFileSystem, FileTypeValue } from '../../../src/scanner/core/types';
import { FileType } from '../../../src/scanner/core/types';

function createMockFs(options: {
	projectFiles?: [string, FileTypeValue][];
	claudeProjectFiles?: [string, FileTypeValue][];
	readFileThrows?: (filePath: string) => boolean;
}): IFileSystem {
	const { projectFiles = [], claudeProjectFiles = [], readFileThrows = () => false } = options;
	const projectDir = path.join('/project', '.cursor', 'commands');
	const claudeProjectDir = path.join('/project', '.claude', 'commands');

	return {
		async readDirectory(dirPath: string): Promise<[string, FileTypeValue][]> {
			const normalized = dirPath.replace(/\\/g, '/');
			if (normalized === projectDir || normalized.endsWith('/.cursor/commands') && normalized.includes('/project')) {
				return projectFiles;
			}
			if (normalized === claudeProjectDir || normalized.endsWith('/.claude/commands')) {
				return claudeProjectFiles;
			}
			return [];
		},
		async readFile(filePath: string): Promise<Buffer> {
			if (readFileThrows(filePath)) {
				throw new Error('Permission denied');
			}
			return Buffer.from(`# Command\n\nContent of ${path.basename(filePath)}`);
		},
		async stat(): Promise<{ type: FileTypeValue; mtime?: number }> {
			return { type: FileType.File };
		}
	};
}

describe('scanCommandsCore', () => {
	const projectRoot = '/project';
	const userRoot = '/home/user';

	describe('project commands', () => {
		it('should return workspace commands from project .cursor/commands', async () => {
			const fs = createMockFs({
				projectFiles: [['valid.md', FileType.File], ['other.md', FileType.File]]
			});
			const commands = await scanCommandsCore(fs, projectRoot, userRoot);
			const workspace = commands.filter((c) => c.location === 'workspace');
			assert.strictEqual(workspace.length, 2);
			assert.strictEqual(workspace[0].fileName, 'valid');
			assert.strictEqual(workspace[1].fileName, 'other');
			assert.ok(workspace[0].content.includes('Content of valid.md'));
		});

		it('should exclude README.md from project commands', async () => {
			const fs = createMockFs({
				projectFiles: [['README.md', FileType.File], ['real-command.md', FileType.File]]
			});
			const commands = await scanCommandsCore(fs, projectRoot, userRoot);
			const workspace = commands.filter((c) => c.location === 'workspace');
			assert.strictEqual(workspace.length, 1);
			assert.strictEqual(workspace[0].fileName, 'real-command');
		});

		it('should add error placeholder when readFile throws for project command', async () => {
			const fs = createMockFs({
				projectFiles: [['failing.md', FileType.File]],
				readFileThrows: (p) => p.includes('failing.md')
			});
			const commands = await scanCommandsCore(fs, projectRoot, userRoot);
			const workspace = commands.filter((c) => c.location === 'workspace');
			assert.strictEqual(workspace.length, 1);
			assert.strictEqual(workspace[0].content, 'Error reading file content');
			assert.strictEqual(workspace[0].fileName, 'failing');
		});

		it('should return empty when project commands dir has no .md files', async () => {
			const fs = createMockFs({ projectFiles: [] });
			const commands = await scanCommandsCore(fs, projectRoot, userRoot);
			assert.strictEqual(commands.length, 0);
		});
	});

	describe('cross-platform merge (spec 011)', () => {
		it('merges .claude/commands workspace commands alongside .cursor/commands, tagged by platform', async () => {
			const fs = createMockFs({
				projectFiles: [['cursor-cmd.md', FileType.File]],
				claudeProjectFiles: [['claude-cmd.md', FileType.File]]
			});
			const commands = await scanCommandsCore(fs, projectRoot, userRoot);
			assert.strictEqual(commands.length, 2);
			const cursorCmd = commands.find((c) => c.fileName === 'cursor-cmd');
			const claudeCmd = commands.find((c) => c.fileName === 'claude-cmd');
			assert.strictEqual(cursorCmd?.platform, 'cursor');
			assert.strictEqual(cursorCmd?.location, 'workspace');
			assert.strictEqual(claudeCmd?.platform, 'claude');
			assert.strictEqual(claudeCmd?.location, 'workspace');
		});

		it('returns only claude commands when .cursor/commands is absent (FR-006)', async () => {
			const fs = createMockFs({
				projectFiles: [],
				claudeProjectFiles: [['claude-only.md', FileType.File]]
			});
			const commands = await scanCommandsCore(fs, projectRoot, userRoot);
			assert.strictEqual(commands.length, 1);
			assert.strictEqual(commands[0].platform, 'claude');
		});
	});

	describe('no global fallback', () => {
		it('never returns location: global — project-scoped scan is workspace-only', async () => {
			const fs = createMockFs({
				projectFiles: [['cursor-cmd.md', FileType.File]],
				claudeProjectFiles: [['claude-cmd.md', FileType.File]]
			});
			const commands = await scanCommandsCore(fs, projectRoot, userRoot);
			assert.ok(commands.every((c) => c.location === 'workspace'));
		});
	});

	describe('scanAgentCommandsCore', () => {
		it('returns commands from an agent root commands directory', async () => {
			const agentRoot = '/agents/root';
			const commandsDir = path.join(agentRoot, 'commands');
			const fs: IFileSystem = {
				async readDirectory(dirPath: string): Promise<[string, FileTypeValue][]> {
					const normalized = dirPath.replace(/\\/g, '/');
					if (normalized === commandsDir) {
						return [['agent-cmd.md', FileType.File]];
					}
					return [];
				},
				async readFile(filePath: string): Promise<Buffer> {
					return Buffer.from(`# Agent Command\n\n${filePath}`);
				},
				async stat(): Promise<{ type: FileTypeValue; mtime?: number }> {
					return { type: FileType.File };
				}
			};

			const commands = await scanAgentCommandsCore(fs, agentRoot);

			assert.strictEqual(commands.length, 1);
			assert.strictEqual(commands[0].fileName, 'agent-cmd');
			assert.strictEqual(commands[0].location, 'global');
		});
	});
});
