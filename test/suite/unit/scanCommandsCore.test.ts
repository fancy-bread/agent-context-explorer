import * as assert from 'assert';
import * as path from 'path';
import { scanCommandsCore } from '../../../src/scanner/core/scanCommandsCore';
import type { IFileSystem, FileTypeValue } from '../../../src/scanner/core/types';
import { FileType } from '../../../src/scanner/core/types';

function createMockFs(options: {
	projectFiles?: [string, FileTypeValue][];
	globalFiles?: [string, FileTypeValue][];
	readFileThrows?: (filePath: string) => boolean;
}): IFileSystem {
	const { projectFiles = [], globalFiles = [], readFileThrows = () => false } = options;
	const projectDir = path.join('/project', '.cursor', 'commands');
	const globalDir = path.join('/home/user', '.cursor', 'commands');

	return {
		async readDirectory(dirPath: string): Promise<[string, FileTypeValue][]> {
			const normalized = dirPath.replace(/\\/g, '/');
			if (normalized === projectDir || normalized.endsWith('/.cursor/commands') && normalized.includes('/project')) {
				return projectFiles;
			}
			if (normalized === globalDir || normalized.endsWith('/.cursor/commands') && normalized.includes('/home/user')) {
				return globalFiles;
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
				projectFiles: [['valid.md', FileType.File], ['other.md', FileType.File]],
				globalFiles: []
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
				projectFiles: [['README.md', FileType.File], ['real-command.md', FileType.File]],
				globalFiles: []
			});
			const commands = await scanCommandsCore(fs, projectRoot, userRoot);
			const workspace = commands.filter((c) => c.location === 'workspace');
			assert.strictEqual(workspace.length, 1);
			assert.strictEqual(workspace[0].fileName, 'real-command');
		});

		it('should add error placeholder when readFile throws for project command', async () => {
			const fs = createMockFs({
				projectFiles: [['failing.md', FileType.File]],
				globalFiles: [],
				readFileThrows: (p) => p.includes('failing.md')
			});
			const commands = await scanCommandsCore(fs, projectRoot, userRoot);
			const workspace = commands.filter((c) => c.location === 'workspace');
			assert.strictEqual(workspace.length, 1);
			assert.strictEqual(workspace[0].content, 'Error reading file content');
			assert.strictEqual(workspace[0].fileName, 'failing');
		});

		it('should return empty when project commands dir has no .md files', async () => {
			const fs = createMockFs({
				projectFiles: [],
				globalFiles: []
			});
			const commands = await scanCommandsCore(fs, projectRoot, userRoot);
			assert.strictEqual(commands.length, 0);
		});
	});

	describe('global commands', () => {
		it('should return global commands from user .cursor/commands', async () => {
			const fs = createMockFs({
				projectFiles: [],
				globalFiles: [['global-cmd.md', FileType.File]]
			});
			const commands = await scanCommandsCore(fs, projectRoot, userRoot);
			const global = commands.filter((c) => c.location === 'global');
			assert.strictEqual(global.length, 1);
			assert.strictEqual(global[0].fileName, 'global-cmd');
		});

		it('should add error placeholder when readFile throws for global command', async () => {
			const fs = createMockFs({
				projectFiles: [],
				globalFiles: [['broken.md', FileType.File]],
				readFileThrows: (p) => p.includes('broken.md')
			});
			const commands = await scanCommandsCore(fs, projectRoot, userRoot);
			const global = commands.filter((c) => c.location === 'global');
			assert.strictEqual(global.length, 1);
			assert.strictEqual(global[0].content, 'Error reading file content');
			assert.strictEqual(global[0].location, 'global');
		});

		it('should exclude README.md from global commands', async () => {
			const fs = createMockFs({
				projectFiles: [],
				globalFiles: [['README.md', FileType.File], ['my-cmd.md', FileType.File]]
			});
			const commands = await scanCommandsCore(fs, projectRoot, userRoot);
			const global = commands.filter((c) => c.location === 'global');
			assert.strictEqual(global.length, 1);
			assert.strictEqual(global[0].fileName, 'my-cmd');
		});
	});

	describe('combined', () => {
		it('should return both workspace and global commands', async () => {
			const fs = createMockFs({
				projectFiles: [['ws-cmd.md', FileType.File]],
				globalFiles: [['gl-cmd.md', FileType.File]]
			});
			const commands = await scanCommandsCore(fs, projectRoot, userRoot);
			assert.strictEqual(commands.length, 2);
			const ws = commands.find((c) => c.location === 'workspace');
			const gl = commands.find((c) => c.location === 'global');
			assert.ok(ws);
			assert.ok(gl);
			assert.strictEqual(ws!.fileName, 'ws-cmd');
			assert.strictEqual(gl!.fileName, 'gl-cmd');
		});
	});
});
