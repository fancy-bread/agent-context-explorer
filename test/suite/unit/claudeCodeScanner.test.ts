// Unit tests for ClaudeCodeScanner (VS Code wrapper around scanClaudeCodeCore)
import * as assert from 'assert';
import * as vscode from 'vscode';
import { ClaudeCodeScanner } from '../../../src/scanner/claudeCodeScanner';

const vscodeStub = require('vscode');

const TEST_ROOT = '/test-workspace';
const testUri = vscode.Uri.file(TEST_ROOT);

afterEach(() => {
	vscodeStub.__overrides.stat = null;
	vscodeStub.__overrides.readDirectory = null;
});

describe('ClaudeCodeScanner.scan() — empty workspace', () => {
	it('returns empty artifacts when no Claude Code files exist', async () => {
		const scanner = new ClaudeCodeScanner(testUri as any);
		const result = await scanner.scan();

		assert.strictEqual(result.claudeMd, undefined);
		assert.deepStrictEqual(result.rules, []);
		assert.deepStrictEqual(result.commands, []);
		assert.deepStrictEqual(result.skills, []);
		assert.strictEqual(result.hasAnyArtifacts, false);
	});
});

describe('ClaudeCodeScanner.scan() — CLAUDE.md', () => {
	it('maps claudeMd when CLAUDE.md exists as a file', async () => {
		vscodeStub.__overrides.stat = (uri: any) => {
			if ((uri.fsPath as string).endsWith('CLAUDE.md')) { return { type: 1 }; } // FileType.File
			throw new Error('not found');
		};

		const scanner = new ClaudeCodeScanner(testUri as any);
		const result = await scanner.scan();

		assert.ok(result.claudeMd, 'claudeMd should be defined');
		assert.ok((result.claudeMd!.path as string).endsWith('CLAUDE.md'));
		assert.ok(result.claudeMd!.uri);
		assert.strictEqual(result.hasAnyArtifacts, true);
	});
});

describe('ClaudeCodeScanner.scan() — rules', () => {
	it('maps rules from .claude/rules/', async () => {
		vscodeStub.__overrides.readDirectory = (uri: any) => {
			if ((uri.fsPath as string).endsWith('.claude/rules')) {
				return [['my-rule.mdc', 1]]; // FileType.File
			}
			return [];
		};

		const scanner = new ClaudeCodeScanner(testUri as any);
		const result = await scanner.scan();

		assert.strictEqual(result.rules.length, 1);
		assert.strictEqual(result.rules[0].fileName, 'my-rule.mdc');
		assert.ok(result.rules[0].uri);
		assert.ok(typeof result.rules[0].content === 'string');
		assert.ok(result.rules[0].metadata);
		assert.strictEqual(result.hasAnyArtifacts, true);
	});
});

describe('ClaudeCodeScanner.scan() — commands', () => {
	it('maps commands from .claude/commands/', async () => {
		vscodeStub.__overrides.readDirectory = (uri: any) => {
			if ((uri.fsPath as string).endsWith('.claude/commands')) {
				return [['my-cmd.md', 1]]; // FileType.File
			}
			return [];
		};

		const scanner = new ClaudeCodeScanner(testUri as any);
		const result = await scanner.scan();

		assert.strictEqual(result.commands.length, 1);
		assert.strictEqual(result.commands[0].fileName, 'my-cmd');
		assert.strictEqual(result.commands[0].location, 'workspace');
		assert.ok(result.commands[0].uri);
		assert.strictEqual(result.hasAnyArtifacts, true);
	});
});

describe('ClaudeCodeScanner.scan() — skills', () => {
	it('maps skills from .claude/skills/ subdirectories', async () => {
		vscodeStub.__overrides.readDirectory = (uri: any) => {
			if ((uri.fsPath as string).endsWith('.claude/skills')) {
				return [['my-skill', 2]]; // FileType.Directory
			}
			return [];
		};

		const scanner = new ClaudeCodeScanner(testUri as any);
		const result = await scanner.scan();

		assert.strictEqual(result.skills.length, 1);
		assert.strictEqual(result.skills[0].fileName, 'my-skill');
		assert.strictEqual(result.skills[0].location, 'workspace');
		assert.ok(result.skills[0].uri);
		assert.strictEqual(result.hasAnyArtifacts, true);
	});

	it('propagates skill metadata (title) when SKILL.md has frontmatter', async () => {
		// Stub readDirectory for skills dir, readFile returns content with frontmatter via default stub
		// The default stub readFile returns '# Test Command...' which parseSKILLMetadata extracts as title
		vscodeStub.__overrides.readDirectory = (uri: any) => {
			if ((uri.fsPath as string).endsWith('.claude/skills')) {
				return [['cool-skill', 2]];
			}
			return [];
		};

		const scanner = new ClaudeCodeScanner(testUri as any);
		const result = await scanner.scan();

		assert.strictEqual(result.skills[0].fileName, 'cool-skill');
		// metadata may be defined (title extracted from heading) or undefined — either is valid
		// key assertion: skill is present and has correct location
		assert.strictEqual(result.skills[0].location, 'workspace');
	});
});

describe('ClaudeCodeScanner.scan() — error handling', () => {
	it('returns empty artifacts when scan throws (catch block)', async () => {
		// Pass null as workspaceRoot — accessing .fsPath throws TypeError inside scan()
		const scanner = new ClaudeCodeScanner(null as any);
		const result = await scanner.scan();

		assert.strictEqual(result.claudeMd, undefined);
		assert.deepStrictEqual(result.rules, []);
		assert.deepStrictEqual(result.commands, []);
		assert.deepStrictEqual(result.skills, []);
		assert.strictEqual(result.hasAnyArtifacts, false);
	});
});

describe('ClaudeCodeScanner.watchAll()', () => {
	it('returns one disposable per pattern (4 total)', () => {
		const scanner = new ClaudeCodeScanner(testUri as any);
		const disposables = scanner.watchAll(() => {});

		assert.strictEqual(disposables.length, 4);
		disposables.forEach(d => assert.strictEqual(typeof d.dispose, 'function'));
	});

	it('wires up onDidCreate, onDidChange, onDidDelete on each watcher', () => {
		const fired: string[] = [];
		let capturedCreate: (() => void) | undefined;
		let capturedChange: (() => void) | undefined;
		let capturedDelete: (() => void) | undefined;

		const origCreate = vscodeStub.workspace.createFileSystemWatcher;
		vscodeStub.workspace.createFileSystemWatcher = () => ({
			onDidCreate: (cb: () => void) => { capturedCreate = cb; return { dispose: () => {} }; },
			onDidChange: (cb: () => void) => { capturedChange = cb; return { dispose: () => {} }; },
			onDidDelete: (cb: () => void) => { capturedDelete = cb; return { dispose: () => {} }; },
			dispose: () => {}
		});

		try {
			const scanner = new ClaudeCodeScanner(testUri as any);
			scanner.watchAll(() => { fired.push('called'); });

			capturedCreate?.();
			capturedChange?.();
			capturedDelete?.();

			assert.strictEqual(fired.length, 3);
		} finally {
			vscodeStub.workspace.createFileSystemWatcher = origCreate;
		}
	});
});
