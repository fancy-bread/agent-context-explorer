import * as assert from 'assert';
import * as path from 'path';
import { NodeFsAdapter } from '../../../src/scanner/adapters/nodeFsAdapter';
import {
	FileType,
	listFilesFlat,
	listFilesRecursive,
	scanRulesCore
} from '../../../src/scanner/core/index';
import { parseRuleFromString } from '../../../src/scanner/core/ruleParsing';
import type { FileTypeValue, IFileSystem } from '../../../src/scanner/core/types';

/**
 * `test/fixtures` — works for both:
 * - `npm run test:unit` (ts-node, __dirname = `test/suite/unit`)
 * - `npm run test` (compiled `out/test/suite/unit`, cwd still repo root)
 */
function fixturesRoot(): string {
	return path.resolve(process.cwd(), 'test/fixtures');
}

function createRulesTreeMock(options: {
	rulesFiles: Map<string, Buffer>;
}): IFileSystem {
	const { rulesFiles } = options;

	function dirEntries(dirPath: string): [string, FileTypeValue][] {
		const normalized = dirPath.replace(/\\/g, '/');
		const children: string[] = [];
		for (const filePath of rulesFiles.keys()) {
			const n = filePath.replace(/\\/g, '/');
			const parent = path.posix.dirname(n);
			if (parent === normalized || parent === dirPath) {
				const base = path.basename(filePath);
				children.push(base);
			}
		}
		return children.map((name) => {
			const full = path.join(dirPath, name).replace(/\\/g, '/');
			const match = [...rulesFiles.keys()].find((k) => k.replace(/\\/g, '/') === full);
			if (match && rulesFiles.has(match)) {
				return [name, FileType.File] as [string, FileTypeValue];
			}
			return [name, FileType.Directory] as [string, FileTypeValue];
		});
	}

	return {
		async readDirectory(dirPath: string): Promise<[string, FileTypeValue][]> {
			return dirEntries(dirPath);
		},
		async readFile(filePath: string): Promise<Buffer> {
			const b = rulesFiles.get(filePath) ?? rulesFiles.get(filePath.replace(/\//g, path.sep));
			if (b) {
				return b;
			}
			throw new Error(`ENOENT: ${filePath}`);
		},
		async stat(filePath: string): Promise<{ type: FileTypeValue; mtime?: number }> {
			if (rulesFiles.has(filePath) || rulesFiles.has(filePath.replace(/\//g, path.sep))) {
				return { type: FileType.File, mtime: 1 };
			}
			return { type: FileType.Directory };
		}
	};
}

describe('scanner shared core (NodeFsAdapter, listFiles, ruleParsing, scanRulesCore)', () => {
	describe('NodeFsAdapter (fixtures only)', () => {
		let adapter: NodeFsAdapter;
		let rulesDir: string;

		before(() => {
			adapter = new NodeFsAdapter();
			rulesDir = path.join(fixturesRoot(), '.cursor', 'rules');
		});

		it('readFile reads a fixture rule file', async () => {
			const buf = await adapter.readFile(path.join(rulesDir, 'valid-rule.mdc'));
			assert.ok(Buffer.isBuffer(buf));
			const text = buf.toString('utf8');
			assert.ok(text.includes('description:'));
		});

		it('readDirectory returns typed entries for fixture rules dir', async () => {
			const entries = await adapter.readDirectory(rulesDir);
			assert.ok(entries.length >= 1);
			const names = entries.map((e) => e[0]);
			assert.ok(names.includes('valid-rule.mdc'));
			for (const [, t] of entries) {
				assert.ok([FileType.File, FileType.Directory, FileType.SymbolicLink, FileType.Unknown].includes(t));
			}
		});

		it('stat returns file type and mtime for a fixture file', async () => {
			const s = await adapter.stat(path.join(rulesDir, 'valid-rule.mdc'));
			assert.strictEqual(s.type, FileType.File);
			assert.ok(typeof s.mtime === 'number');
		});
	});

	describe('listFilesRecursive / listFilesFlat (in-memory IFileSystem)', () => {
		it('listFilesRecursive collects nested files by extension', async () => {
			const root = '/proj/.cursor/rules';
			const deep = '/proj/.cursor/rules/nested';
			const fs: IFileSystem = {
				async readDirectory(dir: string): Promise<[string, FileTypeValue][]> {
					if (dir === root) {
						return [
							['nested', FileType.Directory],
							['a.mdc', FileType.File],
							['skip.txt', FileType.File]
						];
					}
					if (dir === deep) {
						return [['b.md', FileType.File]];
					}
					return [];
				},
				async readFile(): Promise<Buffer> {
					return Buffer.from('');
				},
				async stat(): Promise<{ type: FileTypeValue; mtime?: number }> {
					return { type: FileType.File };
				}
			};
			const out = await listFilesRecursive(fs, root, ['.mdc', '.md']);
			assert.ok(out.includes(path.join(root, 'a.mdc')));
			assert.ok(out.includes(path.join(deep, 'b.md')));
			assert.strictEqual(out.includes(path.join(root, 'skip.txt')), false);
		});

		it('listFilesRecursive swallows unreadable directories', async () => {
			const fs: IFileSystem = {
				async readDirectory(): Promise<[string, FileTypeValue][]> {
					throw new Error('EACCES');
				},
				async readFile(): Promise<Buffer> {
					return Buffer.from('');
				},
				async stat(): Promise<{ type: FileTypeValue; mtime?: number }> {
					return { type: FileType.Directory };
				}
			};
			const out = await listFilesRecursive(fs, '/nope', ['.mdc']);
			assert.deepStrictEqual(out, []);
		});

		it('listFilesFlat honors excludeNames and extensions', async () => {
			const dir = '/x';
			const fs: IFileSystem = {
				async readDirectory(): Promise<[string, FileTypeValue][]> {
					return [
						['a.mdc', FileType.File],
						['readme.md', FileType.File],
						['sub', FileType.Directory]
					];
				},
				async readFile(): Promise<Buffer> {
					return Buffer.from('');
				},
				async stat(): Promise<{ type: FileTypeValue; mtime?: number }> {
					return { type: FileType.File };
				}
			};
			const out = await listFilesFlat(fs, dir, ['.mdc'], ['readme.md']);
			assert.strictEqual(out.length, 1);
			assert.strictEqual(out[0], path.join(dir, 'a.mdc'));
		});
	});

	describe('parseRuleFromString', () => {
		it('parses frontmatter and body', () => {
			const src = `---
description: Hello
globs: ["*.ts"]
alwaysApply: false
---
Body line`;
			const { metadata, content } = parseRuleFromString(src);
			assert.strictEqual(metadata.description, 'Hello');
			assert.deepStrictEqual(metadata.globs, ['*.ts']);
			assert.strictEqual(metadata.alwaysApply, false);
			assert.strictEqual(content, 'Body line');
		});

		it('returns safe defaults when gray-matter throws (invalid frontmatter)', () => {
			// js-yaml throws on this body, so matter() rejects and catch runs
			const bad = '---\nnot: [unclosed\n---\nbody';
			const { metadata, content } = parseRuleFromString(bad);
			assert.strictEqual(metadata.description, 'Error parsing file');
			assert.strictEqual(content, 'Error reading file content');
		});
	});

	describe('scanRulesCore', () => {
		const projectRoot = '/project';

		it('returns rules from mock .cursor/rules tree', async () => {
			const rulesDir = path.join(projectRoot, '.cursor', 'rules');
			const filePath = path.join(rulesDir, 'r.mdc');
			const body = `---
description: X
---
Rule body`;
			const fs = createRulesTreeMock({
				rulesFiles: new Map([[filePath, Buffer.from(body)]])
			});
			const rules = await scanRulesCore(fs, projectRoot, '/user');
			assert.strictEqual(rules.length, 1);
			assert.strictEqual(rules[0].fileName, 'r.mdc');
			assert.strictEqual(rules[0].metadata.description, 'X');
			assert.strictEqual(rules[0].content, 'Rule body');
		});

		it('adds error placeholder when readFile fails', async () => {
			const rulesDir = path.join(projectRoot, '.cursor', 'rules');
			const filePath = path.join(rulesDir, 'bad.mdc');
			const fs: IFileSystem = {
				async readDirectory(): Promise<[string, FileTypeValue][]> {
					return [['bad.mdc', FileType.File]];
				},
				async readFile(): Promise<Buffer> {
					throw new Error('boom');
				},
				async stat(): Promise<{ type: FileTypeValue; mtime?: number }> {
					return { type: FileType.File };
				}
			};
			const rules = await scanRulesCore(fs, projectRoot, '/user');
			assert.strictEqual(rules.length, 1);
			assert.strictEqual(rules[0].path, filePath);
			assert.strictEqual(rules[0].content, 'Error reading file content');
		});
	});
});
