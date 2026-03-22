import * as assert from 'assert';
import * as path from 'path';
import { listFilesRecursive, listFilesFlat } from '../../../src/scanner/core/listFiles';
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

describe('scanner/core/listFiles', () => {
	const root = '/proj';

	it('listFilesRecursive normalizes extension without leading dot', async () => {
		const fs = createMockFs(
			new Map([[path.join(root, 'a.mdc'), Buffer.from('x')]]),
			new Map([[root, [['a.mdc', FileType.File]]]])
		);
		const out = await listFilesRecursive(fs, root, ['mdc']);
		assert.ok(out.some((p) => p.endsWith('a.mdc')));
	});

	it('listFilesRecursive swallows errors from unreadable subdirectory', async () => {
		const fs = createMockFs(new Map(), new Map([[root, [['bad', FileType.Directory]]]]));
		(fs as any).readDirectory = async (p: string) => {
			if (p === path.join(root, 'bad')) throw new Error('EACCES');
			return [];
		};
		const out = await listFilesRecursive(fs, root, ['.mdc']);
		assert.deepStrictEqual(out, []);
	});

	it('listFilesFlat skips entries in excludeNames', async () => {
		const dir = path.join(root, 'cmd');
		const fs = createMockFs(
			new Map([
				[path.join(dir, 'a.md'), Buffer.from('1')],
				[path.join(dir, 'README.md'), Buffer.from('2')]
			]),
			new Map([[dir, [
				['a.md', FileType.File],
				['README.md', FileType.File]
			]]])
		);
		const out = await listFilesFlat(fs, dir, ['.md'], ['README.md']);
		assert.strictEqual(out.length, 1);
		assert.ok(out[0].endsWith('a.md'));
	});

	it('listFilesFlat includes symbolic links as files', async () => {
		const dir = path.join(root, 'c');
		const fs = createMockFs(
			new Map([[path.join(dir, 'x.md'), Buffer.from('1')]]),
			new Map([[dir, [['x.md', FileType.SymbolicLink]]]])
		);
		const out = await listFilesFlat(fs, dir, ['.md']);
		assert.strictEqual(out.length, 1);
	});

	it('listFilesFlat returns empty when directory read throws', async () => {
		const fs = createMockFs(new Map(), new Map());
		(fs as any).readDirectory = async () => {
			throw new Error('ENOENT');
		};
		const out = await listFilesFlat(fs, '/nope', ['.md']);
		assert.deepStrictEqual(out, []);
	});
});
