import * as assert from 'assert';
import { VSCodeFsAdapter } from '../../../src/scanner/adapters/vscodeFsAdapter';
import { FileType } from '../../../src/scanner/core/types';

// VSCode stub is loaded from test/vscode-stub (package.json devDependency)
const vscodeStub = require('vscode');

describe('VSCodeFsAdapter', () => {
	let adapter: VSCodeFsAdapter;

	beforeEach(() => {
		adapter = new VSCodeFsAdapter();
		vscodeStub.__overrides.readDirectory = null;
		vscodeStub.__overrides.stat = null;
	});

	describe('readFile', () => {
		it('should read file content and return Buffer', async () => {
			const content = await adapter.readFile('/workspace/.cursor/commands/valid-command.md');
			assert.ok(Buffer.isBuffer(content));
			const text = content.toString('utf8');
			assert.ok(text.includes('# Code Review Checklist'));
		});

		it('should throw when file read fails', async () => {
			await assert.rejects(
				() => adapter.readFile('/workspace/.cursor/rules/read-error.mdc'),
				/.*/
			);
		});
	});

	describe('readDirectory', () => {
		it('should return directory entries as [name, type] tuples', async () => {
			const entries = await adapter.readDirectory('/workspace/.cursor/commands');
			assert.ok(Array.isArray(entries));
			assert.ok(entries.length > 0);
			for (const [name, type] of entries) {
				assert.strictEqual(typeof name, 'string');
				assert.ok([FileType.File, FileType.Directory, FileType.SymbolicLink, FileType.Unknown].includes(type));
			}
		});

		it('should return empty array when override returns empty', async () => {
			vscodeStub.__overrides.readDirectory = async () => [];
			const entries = await adapter.readDirectory('/any/path');
			assert.deepStrictEqual(entries, []);
		});

		it('should map entry types correctly', async () => {
			vscodeStub.__overrides.readDirectory = async () => [
				['file.md', 1],
				['subdir', 2],
				['link', 64]
			];
			const entries = await adapter.readDirectory('/workspace/.cursor/commands');
			assert.strictEqual(entries.length, 3);
			assert.deepStrictEqual(entries[0], ['file.md', 1]);
			assert.deepStrictEqual(entries[1], ['subdir', 2]);
			assert.deepStrictEqual(entries[2], ['link', 64]);
		});
	});

	describe('stat', () => {
		it('should return type and mtime for file', async () => {
			vscodeStub.__overrides.stat = async () => ({ type: 1, mtime: 1234567890 });
			const stat = await adapter.stat('/workspace/AGENTS.md');
			assert.strictEqual(stat.type, 1);
			assert.strictEqual(stat.mtime, 1234567890);
		});

		it('should return type for directory', async () => {
			const stat = await adapter.stat('/workspace/.cursor/commands');
			assert.ok(stat);
			assert.strictEqual(stat.type, 2);
		});

		it('should handle missing mtime', async () => {
			vscodeStub.__overrides.stat = async () => ({ type: 1 });
			const stat = await adapter.stat('/some/file');
			assert.strictEqual(stat.type, 1);
			assert.strictEqual(stat.mtime, undefined);
		});

		it('should throw when path does not exist', async () => {
			vscodeStub.__overrides.stat = async () => {
				throw new Error('ENOENT');
			};
			await assert.rejects(() => adapter.stat('/nonexistent'), /ENOENT/);
		});
	});
});
