import * as assert from 'assert';
import { RulesScanner } from '../../../src/scanner/rulesScanner';

const vscodeStub = require('vscode');

describe('Rules Scanner Tests (real RulesScanner + vscode stub)', () => {
	const workspaceRoot = { fsPath: '/workspace', path: '/workspace' };
	let scanner: RulesScanner;

	beforeEach(() => {
		scanner = new RulesScanner(workspaceRoot as any);
		vscodeStub.__overrides.findFiles = null;
		vscodeStub.__overrides.stat = null;
	});

	describe('scanRules', () => {
		it('should scan and parse rules from .cursor/rules', async () => {
			const rules = await scanner.scanRules();
			assert.ok(Array.isArray(rules));
			assert.ok(rules.length >= 2);
		});

		it('should parse rule metadata via MDCParser', async () => {
			const rules = await scanner.scanRules();
			const validRule = rules.find((r: any) => r.fileName === 'valid-rule.mdc');

			assert.ok(validRule);
			assert.strictEqual(validRule.metadata.description, 'Valid rule');
			assert.deepStrictEqual(validRule.metadata.globs, ['*.js', '*.ts']);
			assert.strictEqual(validRule.metadata.alwaysApply, false);
		});

		it('should handle rules with partial metadata', async () => {
			const rules = await scanner.scanRules();
			const invalidRule = rules.find((r: any) => r.fileName === 'invalid-rule.mdc');

			assert.ok(invalidRule);
			assert.strictEqual(invalidRule.metadata.description, 'Invalid rule');
		});

		it('should include uri, fileName, metadata, content for each rule', async () => {
			const rules = await scanner.scanRules();

			rules.forEach((rule: any) => {
				assert.ok(rule.uri);
				assert.ok(rule.fileName);
				assert.ok(rule.metadata);
				assert.ok(typeof rule.content === 'string');
			});
		});

		it('should return empty array when no rules found', async () => {
			vscodeStub.__overrides.findFiles = async () => [];
			const rules = await scanner.scanRules();
			assert.strictEqual(rules.length, 0);
		});

		it('should return empty array on findFiles error', async () => {
			vscodeStub.__overrides.findFiles = async () => {
				throw new Error('Scan failed');
			};
			const rules = await scanner.scanRules();
			assert.strictEqual(rules.length, 0);
		});
	});

	describe('watchRules', () => {
		it('should create file watcher', async () => {
			const watcher = await scanner.watchRules();
			assert.ok(watcher);
			assert.ok(typeof watcher.dispose === 'function');
		});

		it('should dispose both mdc and md watchers', async () => {
			const watcher = await scanner.watchRules();
			assert.doesNotThrow(() => watcher.dispose());
		});
	});

	describe('createRuleFile', () => {
		it('should create rule file with empty directory', async () => {
			const metadata = { description: 'New rule', globs: ['*.ts'], alwaysApply: false };
			const content = '# New Rule\n\nContent.';

			const uri = await scanner.createRuleFile('', 'new-rule.mdc', metadata, content);

			assert.ok(uri);
			assert.ok(uri.fsPath);
			assert.ok(uri.fsPath.endsWith('new-rule.mdc'));
			assert.ok(uri.fsPath.includes('.cursor/rules'));
		});

		it('should create rule file with dot directory', async () => {
			const metadata = { description: 'Dot dir rule' };
			const content = 'Content.';

			const uri = await scanner.createRuleFile('.', 'dot-rule.mdc', metadata, content);

			assert.ok(uri);
			assert.ok(uri.fsPath.endsWith('dot-rule.mdc'));
		});

		it('should create rule file in subdirectory', async () => {
			const metadata = { description: 'Subdir rule' };
			const content = 'Content.';

			const uri = await scanner.createRuleFile('src', 'subdir-rule.mdc', metadata, content);

			assert.ok(uri);
			assert.ok(uri.fsPath.includes('src'));
			assert.ok(uri.fsPath.endsWith('subdir-rule.mdc'));
		});

		it('should generate valid MDC content via MDCParser.generateMDC', async () => {
			const metadata = { description: 'Generated', globs: ['*.js'], alwaysApply: true };
			const content = 'Generated content';

			const uri = await scanner.createRuleFile('', 'generated.mdc', metadata, content);

			assert.ok(uri);
		});
	});

	describe('deleteRuleFile', () => {
		it('should call vscode.workspace.fs.delete', async () => {
			const uri = { fsPath: '/workspace/.cursor/rules/to-delete.mdc', path: '/workspace/.cursor/rules/to-delete.mdc' };

			await assert.doesNotReject(() => scanner.deleteRuleFile(uri as any));
		});
	});

	describe('parse error path', () => {
		it('should add placeholder rule when parseMDC returns error', async () => {
			vscodeStub.__overrides.findFiles = async (pattern: any) => {
				if (pattern.pattern?.includes('.cursor/rules') && pattern.pattern?.endsWith('*.mdc')) {
					const base = (pattern.workspaceRoot?.fsPath || '/workspace') + '/.cursor/rules';
					return [
						{ fsPath: `${base}/read-error.mdc`, path: `${base}/read-error.mdc` }
					];
				}
				return [];
			};

			const rules = await scanner.scanRules();

			assert.strictEqual(rules.length, 1);
			assert.strictEqual(rules[0].metadata.description, 'Error parsing file');
			assert.strictEqual(rules[0].content, 'Error reading file content');
			assert.strictEqual(rules[0].fileName, 'read-error.mdc');
		});
	});
});
