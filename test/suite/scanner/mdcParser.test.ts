import * as assert from 'assert';

// Mock the MDCParser class for testing
class MockMDCParser {
	static generateMDC(metadata: any, content: string): string {
		// Create frontmatter object
		const frontmatter: any = {
			description: metadata.description
		};

		// Add optional fields if they exist
		if (metadata.globs && metadata.globs.length > 0) {
			frontmatter.globs = metadata.globs;
		}

		if (metadata.alwaysApply !== undefined) {
			frontmatter.alwaysApply = metadata.alwaysApply;
		}

		// Generate MDC format
		const frontmatterString = Object.entries(frontmatter)
			.map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
			.join('\n');

		return `---\n${frontmatterString}\n---\n\n${content}`;
	}

	static parseMDCFromString(text: string): { metadata: any; content: string } {
		const lines = text.split('\n');
		const frontmatterStart = lines.findIndex(line => line.trim() === '---');
		const frontmatterEnd = lines.findIndex((line, index) =>
			index > frontmatterStart && line.trim() === '---'
		);

		if (frontmatterStart === -1 || frontmatterEnd === -1) {
			throw new Error('Invalid MDC format: missing frontmatter delimiters');
		}

		const frontmatterLines = lines.slice(frontmatterStart + 1, frontmatterEnd);
		const contentLines = lines.slice(frontmatterEnd + 1);

		// Parse frontmatter
		const metadata: any = {};
		frontmatterLines.forEach(line => {
			const [key, ...valueParts] = line.split(':');
			if (key && valueParts.length > 0) {
				const value = valueParts.join(':').trim();
				try {
					metadata[key.trim()] = JSON.parse(value);
				} catch {
					metadata[key.trim()] = value;
				}
			}
		});

		return {
			metadata,
			content: contentLines.join('\n').trim()
		};
	}

	static validateMDC(text: string): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		try {
			const { metadata } = this.parseMDCFromString(text);

		// Check required fields
		if (!metadata.description) {
			errors.push('Missing required field: description');
		}

			// Check optional fields
			if (metadata.globs && !Array.isArray(metadata.globs)) {
				errors.push('globs must be an array');
			}

			if (metadata.alwaysApply && typeof metadata.alwaysApply !== 'boolean') {
				errors.push('alwaysApply must be a boolean');
			}

			return {
				valid: errors.length === 0,
				errors
			};
		} catch (error) {
			return {
				valid: false,
				errors: [`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`]
			};
		}
	}
}

describe('MDC Parser Tests', () => {
	describe('MDC Generation', () => {
		it('should generate valid MDC with required fields', () => {
			const metadata = {
				description: 'Test rule'
			};
			const content = 'This is test content.';

			const result = MockMDCParser.generateMDC(metadata, content);

			assert.ok(result.includes('---'));
			assert.ok(result.includes('type: "manual"'));
			assert.ok(result.includes('description: "Test rule"'));
			assert.ok(result.includes('This is test content.'));
		});

		it('should generate MDC with optional fields', () => {
			const metadata = {
				description: 'Auto rule',
				globs: ['*.js', '*.ts'],
				alwaysApply: true
			};
			const content = 'Auto rule content.';

			const result = MockMDCParser.generateMDC(metadata, content);

			assert.ok(result.includes('type: "auto"'));
			assert.ok(result.includes('description: "Auto rule"'));
			assert.ok(result.includes('globs: ["*.js","*.ts"]'));
			assert.ok(result.includes('alwaysApply: true'));
			assert.ok(result.includes('Auto rule content.'));
		});

		it('should handle empty globs array', () => {
			const metadata = {
				description: 'Test rule',
				globs: []
			};
			const content = 'Test content.';

			const result = MockMDCParser.generateMDC(metadata, content);

			assert.ok(result.includes('globs: []'));
		});

		it('should handle undefined optional fields', () => {
			const metadata = {
				description: 'Agent rule'
			};
			const content = 'Agent content.';

			const result = MockMDCParser.generateMDC(metadata, content);

			assert.ok(result.includes('type: "agent"'));
			assert.ok(result.includes('description: "Agent rule"'));
			assert.ok(!result.includes('globs:'));
			assert.ok(!result.includes('alwaysApply:'));
		});
	});

	describe('MDC Parsing', () => {
		it('should parse valid MDC content', () => {
			const mdcContent = `---
type: manual
description: "Test rule"
globs: ["*.js"]
alwaysApply: false
---

This is the content.`;

			const result = MockMDCParser.parseMDCFromString(mdcContent);

			assert.equal(result.metadata.description, 'Test rule');
			assert.deepEqual(result.metadata.globs, ['*.js']);
			assert.equal(result.metadata.alwaysApply, false);
			assert.equal(result.content, 'This is the content.');
		});

		it('should parse MDC with minimal fields', () => {
			const mdcContent = `---
type: always
description: "Always rule"
---

Minimal content.`;

			const result = MockMDCParser.parseMDCFromString(mdcContent);

			assert.equal(result.metadata.description, 'Always rule');
			assert.equal(result.content, 'Minimal content.');
		});

		it('should handle multiline content', () => {
			const mdcContent = `---
type: manual
description: "Multiline rule"
---

# Header

This is line 1.
This is line 2.

## Subheader

More content here.`;

			const result = MockMDCParser.parseMDCFromString(mdcContent);

			assert.equal(result.metadata.description, 'Multiline rule');
			assert.ok(result.content.includes('# Header'));
			assert.ok(result.content.includes('This is line 1.'));
			assert.ok(result.content.includes('This is line 2.'));
		});

		it('should throw error for invalid MDC format', () => {
			const invalidMDC = `type: manual
description: "No delimiters"
content here`;

			assert.throws(() => {
				MockMDCParser.parseMDCFromString(invalidMDC);
			}, /Invalid MDC format/);
		});
	});

	describe('MDC Validation', () => {
		it('should validate correct MDC', () => {
			const validMDC = `---
type: manual
description: "Valid rule"
globs: ["*.js"]
alwaysApply: false
---

Valid content.`;

			const result = MockMDCParser.validateMDC(validMDC);

			assert.equal(result.valid, true);
			assert.equal(result.errors.length, 0);
		});

		it('should detect missing type field', () => {
			const invalidMDC = `---
description: "Missing type"
---

Content.`;

			const result = MockMDCParser.validateMDC(invalidMDC);

			assert.equal(result.valid, false);
			assert.ok(result.errors.includes('Missing required field: type'));
		});

		it('should detect invalid type value', () => {
			const invalidMDC = `---
type: invalid
description: "Invalid type"
---

Content.`;

			const result = MockMDCParser.validateMDC(invalidMDC);

			assert.equal(result.valid, false);
			assert.ok(result.errors.includes('Invalid type. Must be one of: always, auto, agent, manual'));
		});

		it('should detect missing description', () => {
			const invalidMDC = `---
type: manual
---

Content.`;

			const result = MockMDCParser.validateMDC(invalidMDC);

			assert.equal(result.valid, false);
			assert.ok(result.errors.includes('Missing required field: description'));
		});

		it('should detect invalid globs type', () => {
			const invalidMDC = `---
type: manual
description: "Invalid globs"
globs: "not an array"
---

Content.`;

			const result = MockMDCParser.validateMDC(invalidMDC);

			assert.equal(result.valid, false);
			assert.ok(result.errors.includes('globs must be an array'));
		});

		it('should detect invalid alwaysApply type', () => {
			const invalidMDC = `---
type: manual
description: "Invalid alwaysApply"
alwaysApply: "not a boolean"
---

Content.`;

			const result = MockMDCParser.validateMDC(invalidMDC);

			assert.equal(result.valid, false);
			assert.ok(result.errors.includes('alwaysApply must be a boolean'));
		});

		it('should handle parse errors gracefully', () => {
			const invalidMDC = `---
type: manual
description: "Invalid JSON"
globs: [invalid json]
---

Content.`;

			const result = MockMDCParser.validateMDC(invalidMDC);

			assert.equal(result.valid, false);
			assert.ok(result.errors.some(error => error.includes('Parse error')));
		});
	});

	describe('Round-trip Tests', () => {
		it('should maintain data integrity through generate-parse cycle', () => {
			const originalMetadata = {
				description: 'Test rule',
				globs: ['*.js', '*.ts'],
				alwaysApply: true
			};
			const originalContent = 'This is test content with\nmultiple lines.';

			// Generate MDC
			const mdcContent = MockMDCParser.generateMDC(originalMetadata, originalContent);

			// Parse it back
			const { metadata, content } = MockMDCParser.parseMDCFromString(mdcContent);

			// Verify integrity
			assert.equal(metadata.description, originalMetadata.description);
			assert.deepEqual(metadata.globs, originalMetadata.globs);
			assert.equal(metadata.alwaysApply, originalMetadata.alwaysApply);
			assert.equal(content, originalContent);
		});

		it('should handle special characters in content', () => {
			const metadata = {
				description: 'Special chars rule'
			};
			const content = 'Content with special chars: @#$%^&*()_+-=[]{}|;:,.<>?';

			const mdcContent = MockMDCParser.generateMDC(metadata, content);
			const { metadata: parsedMetadata, content: parsedContent } = MockMDCParser.parseMDCFromString(mdcContent);

			assert.equal(parsedContent, content);
		});

		it('should handle empty content', () => {
			const metadata = {
				description: 'Empty content rule'
			};
			const content = '';

			const mdcContent = MockMDCParser.generateMDC(metadata, content);
			const { metadata: parsedMetadata, content: parsedContent } = MockMDCParser.parseMDCFromString(mdcContent);

			assert.equal(parsedContent, content);
		});
	});
});
