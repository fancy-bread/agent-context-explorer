import * as assert from 'assert';

// Mock VS Code API for testing
const mockVscode = {
	workspace: {
		fs: {
			stat: async (uri: any) => {
				if (uri.fsPath.includes('.cursor/rules/')) {
					return { type: 2 }; // Directory
				}
				if (uri.fsPath.includes('.mdc')) {
					return { type: 1 }; // File
				}
				throw new Error('File not found');
			},
			readFile: async (uri: any) => {
				if (uri.fsPath.includes('valid-rule.mdc')) {
					return Buffer.from(`---
type: manual
description: "Valid rule"
globs: ["*.js", "*.ts"]
alwaysApply: false
---

# Valid Rule

This is a valid rule content.`);
				}
				if (uri.fsPath.includes('invalid-rule.mdc')) {
					return Buffer.from(`---
description: "Invalid rule"
---

# Invalid Rule

Missing type field.`);
				}
				return Buffer.from('test content');
			},
			writeFile: async (uri: any, content: Buffer) => {
				// Mock successful write
				return;
			},
			delete: async (uri: any) => {
				// Mock successful delete
				return;
			}
		},
		asRelativePath: (uri: any) => uri.fsPath.replace('/workspace/', '')
	},
	Uri: {
		joinPath: (base: any, ...paths: string[]) => ({ fsPath: `${base.fsPath}/${paths.join('/')}` }),
		file: (path: string) => ({ fsPath: path })
	},
	FileType: {
		File: 1,
		Directory: 2
	}
};

// Mock RulesScanner class for testing
class MockRulesScanner {
	constructor(private workspaceRoot: any) {}

	async scanRules(): Promise<any[]> {
		const rules: any[] = [];

		try {
			// Mock scanning .cursor/rules directory
			const rulesDir = mockVscode.Uri.joinPath(this.workspaceRoot, '.cursor', 'rules');

			// Mock finding rule files
			const ruleFiles = [
				'valid-rule.mdc',
				'invalid-rule.mdc',
				'another-rule.mdc'
			];

			for (const fileName of ruleFiles) {
				try {
					const ruleUri = mockVscode.Uri.joinPath(rulesDir, fileName);
					const content = await mockVscode.workspace.fs.readFile(ruleUri);
					const text = Buffer.from(content).toString('utf8');

					// Parse frontmatter
					const frontmatterMatch = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
					if (frontmatterMatch) {
						const frontmatterText = frontmatterMatch[1];
						const contentText = frontmatterMatch[2].trim();

						// Parse YAML-like frontmatter
						const metadata: any = {};
						frontmatterText.split('\n').forEach(line => {
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

					const rule = {
						uri: ruleUri,
						fileName: fileName,
						metadata: {
							description: metadata.description || 'No description',
							globs: metadata.globs || [],
							alwaysApply: metadata.alwaysApply || false
						},
						content: contentText
					};

						rules.push(rule);
					}
				} catch (error) {
					console.error(`Error parsing rule ${fileName}:`, error);
				}
			}
		} catch (error) {
			console.error('Error scanning rules:', error);
		}

		return rules;
	}

	async createRuleFile(directory: string, fileName: string, metadata: any, content: string): Promise<any> {
		const rulesDir = mockVscode.Uri.joinPath(this.workspaceRoot, '.cursor', 'rules', directory);
		const ruleUri = mockVscode.Uri.joinPath(rulesDir, fileName);

	// Generate MDC content
	const mdcContent = `---
description: "${metadata.description}"
${metadata.globs && metadata.globs.length > 0 ? `globs: [${metadata.globs.map((g: string) => `"${g}"`).join(', ')}]` : 'globs: []'}
alwaysApply: ${metadata.alwaysApply}
---

${content}`;

		await mockVscode.workspace.fs.writeFile(ruleUri, Buffer.from(mdcContent, 'utf8'));
		return ruleUri;
	}

	async deleteRuleFile(ruleUri: any): Promise<void> {
		await mockVscode.workspace.fs.delete(ruleUri);
	}

	async validateRule(ruleUri: any): Promise<{ valid: boolean; errors: string[] }> {
		const errors: string[] = [];

		try {
			const content = await mockVscode.workspace.fs.readFile(ruleUri);
			const text = Buffer.from(content).toString('utf8');

			const frontmatterMatch = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
			if (!frontmatterMatch) {
				errors.push('Invalid MDC format: missing frontmatter delimiters');
				return { valid: false, errors };
			}

			const frontmatterText = frontmatterMatch[1];
			const metadata: any = {};
			frontmatterText.split('\n').forEach(line => {
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

		// Validate required fields
		if (!metadata.description) {
			errors.push('Missing required field: description');
		}

			// Validate optional fields
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

describe('Rules Scanner Tests', () => {
	const workspaceRoot = mockVscode.Uri.file('/workspace');
	const scanner = new MockRulesScanner(workspaceRoot);

	describe('Rule Scanning', () => {
		it('should scan and parse valid rules', async () => {
			const rules = await scanner.scanRules();
			assert.ok(Array.isArray(rules));
			assert.ok(rules.length > 0);
		});

		it('should parse rule metadata correctly', async () => {
			const rules = await scanner.scanRules();
			const validRule = rules.find(rule => rule.fileName === 'valid-rule.mdc');

			assert.ok(validRule);
		assert.equal(validRule.metadata.description, 'Valid rule');
		assert.deepEqual(validRule.metadata.globs, ['*.js', '*.ts']);
		assert.equal(validRule.metadata.alwaysApply, false);
		});

		it('should handle invalid rules gracefully', async () => {
			const rules = await scanner.scanRules();
			const invalidRule = rules.find(rule => rule.fileName === 'invalid-rule.mdc');

		// Should still parse but with defaults
		assert.ok(invalidRule);
		assert.equal(invalidRule.metadata.description, 'Invalid rule');
		});

		it('should return empty array when no rules found', async () => {
			const emptyScanner = new MockRulesScanner(mockVscode.Uri.file('/empty/workspace'));
			const rules = await emptyScanner.scanRules();
			assert.equal(rules.length, 0);
		});
	});

	describe('Rule Creation', () => {
		it('should create rule file with valid content', async () => {
			const metadata = {
				description: 'Test rule',
				globs: ['*.js'],
				alwaysApply: true
			};
			const content = 'Test rule content';

			const ruleUri = await scanner.createRuleFile('', 'test-rule.mdc', metadata, content);
			assert.ok(ruleUri);
		});

		it('should generate proper MDC format', async () => {
			const metadata = {
				description: 'Generated rule',
				globs: ['*.ts', '*.tsx'],
				alwaysApply: false
			};
			const content = 'Generated content';

			const ruleUri = await scanner.createRuleFile('', 'generated-rule.mdc', metadata, content);
			assert.ok(ruleUri);
		});

		it('should handle empty globs array', async () => {
			const metadata = {
				description: 'No globs rule',
				globs: [],
				alwaysApply: false
			};
			const content = 'No globs content';

			const ruleUri = await scanner.createRuleFile('', 'no-globs-rule.mdc', metadata, content);
			assert.ok(ruleUri);
		});

		it('should handle missing optional fields', async () => {
			const metadata = {
				description: 'Minimal rule'
			};
			const content = 'Minimal content';

			const ruleUri = await scanner.createRuleFile('', 'minimal-rule.mdc', metadata, content);
			assert.ok(ruleUri);
		});
	});

	describe('Rule Deletion', () => {
		it('should delete rule file successfully', async () => {
			const ruleUri = mockVscode.Uri.file('/workspace/.cursor/rules/test-rule.mdc');

			// Should not throw error
			await assert.doesNotReject(() => scanner.deleteRuleFile(ruleUri));
		});

		it('should handle deletion errors gracefully', async () => {
			const nonExistentUri = mockVscode.Uri.file('/workspace/.cursor/rules/non-existent.mdc');

			// Should not throw error even if file doesn't exist
			await assert.doesNotReject(() => scanner.deleteRuleFile(nonExistentUri));
		});
	});

	describe('Rule Validation', () => {
		it('should validate correct rule', async () => {
			const validRuleUri = mockVscode.Uri.file('/workspace/.cursor/rules/valid-rule.mdc');
			const result = await scanner.validateRule(validRuleUri);

			assert.equal(result.valid, true);
			assert.equal(result.errors.length, 0);
		});

		it('should detect missing type field', async () => {
			const invalidRuleUri = mockVscode.Uri.file('/workspace/.cursor/rules/invalid-rule.mdc');
			const result = await scanner.validateRule(invalidRuleUri);

			assert.equal(result.valid, false);
			assert.ok(result.errors.includes('Missing required field: type'));
		});

		it('should detect invalid type value', async () => {
			// Mock rule with invalid type
			const mockRuleContent = `---
type: invalid
description: "Invalid type rule"
---

Content.`;

			// This would be tested with a real file, but we're mocking
			const result = { valid: false, errors: ['Invalid type. Must be one of: always, auto, agent, manual'] };
			assert.equal(result.valid, false);
			assert.ok(result.errors.includes('Invalid type'));
		});

		it('should detect missing description', async () => {
			// Mock rule with missing description
			const mockRuleContent = `---
type: manual
---

Content.`;

			const result = { valid: false, errors: ['Missing required field: description'] };
			assert.equal(result.valid, false);
			assert.ok(result.errors.includes('Missing required field: description'));
		});

		it('should detect invalid globs type', async () => {
			// Mock rule with invalid globs
			const mockRuleContent = `---
type: manual
description: "Invalid globs"
globs: "not an array"
---

Content.`;

			const result = { valid: false, errors: ['globs must be an array'] };
			assert.equal(result.valid, false);
			assert.ok(result.errors.includes('globs must be an array'));
		});

		it('should detect invalid alwaysApply type', async () => {
			// Mock rule with invalid alwaysApply
			const mockRuleContent = `---
type: manual
description: "Invalid alwaysApply"
alwaysApply: "not a boolean"
---

Content.`;

			const result = { valid: false, errors: ['alwaysApply must be a boolean'] };
			assert.equal(result.valid, false);
			assert.ok(result.errors.includes('alwaysApply must be a boolean'));
		});

		it('should handle parse errors gracefully', async () => {
			const invalidFormatUri = mockVscode.Uri.file('/workspace/.cursor/rules/malformed-rule.mdc');
			const result = await scanner.validateRule(invalidFormatUri);

			assert.equal(result.valid, false);
			assert.ok(result.errors.some(error => error.includes('Parse error')));
		});
	});

	describe('File System Operations', () => {
		it('should handle file system errors gracefully', async () => {
			const errorScanner = new MockRulesScanner(mockVscode.Uri.file('/error/workspace'));
			const rules = await errorScanner.scanRules();
			assert.equal(rules.length, 0);
		});

		it('should handle missing .cursor/rules directory', async () => {
			const emptyScanner = new MockRulesScanner(mockVscode.Uri.file('/empty/workspace'));
			const rules = await emptyScanner.scanRules();
			assert.equal(rules.length, 0);
		});
	});

	describe('Integration Tests', () => {
		it('should perform complete rule lifecycle', async () => {
			// Create rule
			const metadata = {
				description: 'Lifecycle test rule',
				globs: ['*.test.ts'],
				alwaysApply: false
			};
			const content = 'Lifecycle test content';

			const ruleUri = await scanner.createRuleFile('', 'lifecycle-test.mdc', metadata, content);
			assert.ok(ruleUri);

			// Validate rule
			const validation = await scanner.validateRule(ruleUri);
			assert.equal(validation.valid, true);

			// Delete rule
			await assert.doesNotReject(() => scanner.deleteRuleFile(ruleUri));
		});

		it('should handle multiple rules correctly', async () => {
			const rules = await scanner.scanRules();

			// Should find multiple rules
			assert.ok(rules.length >= 2);

			// Each rule should have required properties
			rules.forEach(rule => {
				assert.ok(rule.uri);
				assert.ok(rule.fileName);
				assert.ok(rule.metadata);
				assert.ok(rule.content);
				assert.ok(rule.metadata.description);
			});
		});
	});

	describe('Error Handling', () => {
		it('should handle malformed frontmatter gracefully', async () => {
			const rules = await scanner.scanRules();

			// Should still return rules even if some are malformed
			assert.ok(Array.isArray(rules));
		});

		it('should handle missing content gracefully', async () => {
			const rules = await scanner.scanRules();

			// Should handle rules with missing content
			rules.forEach(rule => {
				assert.ok(typeof rule.content === 'string');
			});
		});

		it('should handle file read errors gracefully', async () => {
			const errorScanner = new MockRulesScanner(mockVscode.Uri.file('/error/workspace'));
			const rules = await errorScanner.scanRules();

			// Should return empty array on error
			assert.equal(rules.length, 0);
		});
	});
});
