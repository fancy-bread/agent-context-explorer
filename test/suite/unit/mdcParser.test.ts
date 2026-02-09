import * as assert from 'assert';
import { MDCParser } from '../../../src/utils/mdcParser';

describe('MDCParser (real implementation)', () => {
	describe('generateMDC', () => {
		it('should generate valid MDC with required fields', () => {
			const metadata = { description: 'Test rule' };
			const content = 'This is test content.';

			const result = MDCParser.generateMDC(metadata, content);

			assert.ok(result.includes('---'));
			assert.ok(result.includes('description'));
			assert.ok(result.includes('Test rule'));
			assert.ok(result.includes('This is test content.'));
		});

		it('should include globs when provided and non-empty', () => {
			const metadata = {
				description: 'Auto rule',
				globs: ['*.js', '*.ts'],
				alwaysApply: true
			};
			const content = 'Auto rule content.';

			const result = MDCParser.generateMDC(metadata, content);

			assert.ok(result.includes('globs'));
			assert.ok(result.includes('*.js'));
			assert.ok(result.includes('alwaysApply'));
			assert.ok(result.includes('Auto rule content.'));
		});

		it('should omit globs when empty array', () => {
			const metadata = {
				description: 'Test rule',
				globs: []
			};
			const content = 'Test content.';

			const result = MDCParser.generateMDC(metadata, content);

			assert.ok(!result.includes('globs'));
		});

		it('should include alwaysApply when explicitly false', () => {
			const metadata = {
				description: 'Test rule',
				alwaysApply: false
			};
			const content = 'Content.';

			const result = MDCParser.generateMDC(metadata, content);

			assert.ok(result.includes('alwaysApply'));
		});

		it('should omit alwaysApply when undefined', () => {
			const metadata = { description: 'Agent rule' };
			const content = 'Agent content.';

			const result = MDCParser.generateMDC(metadata, content);

			assert.ok(!result.includes('alwaysApply'));
		});
	});

	describe('parseMDCFromString', () => {
		it('should parse valid MDC content', () => {
			const mdcContent = `---
description: "Test rule"
globs: ["*.js"]
alwaysApply: false
---

This is the content.`;

			const result = MDCParser.parseMDCFromString(mdcContent);

			assert.strictEqual(result.metadata.description, 'Test rule');
			assert.deepStrictEqual(result.metadata.globs, ['*.js']);
			assert.strictEqual(result.metadata.alwaysApply, false);
			assert.strictEqual(result.content, 'This is the content.');
		});

		it('should use defaults for missing optional fields', () => {
			const mdcContent = `---
description: "Minimal rule"
---

Minimal content.`;

			const result = MDCParser.parseMDCFromString(mdcContent);

			assert.strictEqual(result.metadata.description, 'Minimal rule');
			assert.deepStrictEqual(result.metadata.globs, []);
			assert.strictEqual(result.metadata.alwaysApply, false);
			assert.strictEqual(result.content, 'Minimal content.');
		});

		it('should handle multiline content', () => {
			const mdcContent = `---
description: "Multiline rule"
---

# Header

This is line 1.
This is line 2.`;

			const result = MDCParser.parseMDCFromString(mdcContent);

			assert.strictEqual(result.metadata.description, 'Multiline rule');
			assert.ok(result.content.includes('# Header'));
			assert.ok(result.content.includes('This is line 1.'));
		});

		it('should use "No description" when description missing', () => {
			const mdcContent = `---
globs: []
---

Content.`;

			const result = MDCParser.parseMDCFromString(mdcContent);

			assert.strictEqual(result.metadata.description, 'No description');
		});

		it('should throw for invalid/malformed frontmatter', () => {
			const invalidMDC = `---
description: "Broken"
invalid: [unclosed
---

Content.`;

			assert.throws(
				() => MDCParser.parseMDCFromString(invalidMDC),
				/Failed to parse MDC content/
			);
		});
	});

	describe('validateMDC', () => {
		it('should validate correct MDC', () => {
			const validMDC = `---
description: "Valid rule"
globs: ["*.js"]
alwaysApply: false
---

Valid content.`;

			const result = MDCParser.validateMDC(validMDC);

			assert.strictEqual(result.valid, true);
			assert.strictEqual(result.errors.length, 0);
		});

		it('should detect missing description', () => {
			const invalidMDC = `---
globs: []
---

Content.`;

			const result = MDCParser.validateMDC(invalidMDC);

			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.some((e) => e.includes('Missing required field: description')));
		});

		it('should detect invalid globs type', () => {
			const invalidMDC = `---
description: "Invalid globs"
globs: "not an array"
---

Content.`;

			const result = MDCParser.validateMDC(invalidMDC);

			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.some((e) => e.includes('globs must be an array')));
		});

		it('should detect invalid alwaysApply type', () => {
			const invalidMDC = `---
description: "Invalid alwaysApply"
alwaysApply: "not a boolean"
---

Content.`;

			const result = MDCParser.validateMDC(invalidMDC);

			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.some((e) => e.includes('alwaysApply must be a boolean')));
		});

		it('should handle parse errors gracefully', () => {
			const invalidMDC = `---
description: "Broken YAML"
globs: [invalid json
---

Content.`;

			const result = MDCParser.validateMDC(invalidMDC);

			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.some((e) => e.includes('Parse error')));
		});
	});

	describe('parseMDC (async, uses vscode stub)', () => {
		it('should parse file content via vscode.workspace.fs.readFile', async () => {
			const uri = { fsPath: '/workspace/.cursor/rules/valid-rule.mdc', path: '/workspace/.cursor/rules/valid-rule.mdc' };

			const result = await MDCParser.parseMDC(uri as any);

			assert.strictEqual(result.metadata.description, 'Valid rule');
			assert.ok(result.content.includes('Valid Rule'));
		});

		it('should return error placeholder when readFile throws', async () => {
			const uri = { fsPath: '/workspace/.cursor/rules/read-error.mdc', path: '/workspace/.cursor/rules/read-error.mdc' };

			const result = await MDCParser.parseMDC(uri as any);

			assert.strictEqual(result.metadata.description, 'Error parsing file');
			assert.strictEqual(result.content, 'Error reading file content');
		});
	});

	describe('round-trip', () => {
		it('should maintain data through generate-parse cycle', () => {
			const metadata = {
				description: 'Test rule',
				globs: ['*.js', '*.ts'],
				alwaysApply: true
			};
			const content = 'This is test content with\nmultiple lines.';

			const mdcContent = MDCParser.generateMDC(metadata, content);
			const { metadata: parsed, content: parsedContent } = MDCParser.parseMDCFromString(mdcContent);

			assert.strictEqual(parsed.description, metadata.description);
			assert.deepStrictEqual(parsed.globs, metadata.globs);
			assert.strictEqual(parsed.alwaysApply, metadata.alwaysApply);
			assert.strictEqual(parsedContent, content);
		});
	});
});
