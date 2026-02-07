import * as assert from 'assert';

// =============================================================================
// Mock Types (matching scanner types without vscode dependency)
// =============================================================================

interface MockUri {
	fsPath: string;
	path: string;
}

interface MockRuleMetadata {
	description: string;
	globs?: string[];
	alwaysApply?: boolean;
}

interface MockRule {
	uri: MockUri;
	metadata: MockRuleMetadata;
	content: string;
	fileName: string;
}

interface MockCommand {
	uri: MockUri;
	content: string;
	fileName: string;
	location: 'workspace' | 'global';
}

// =============================================================================
// Mock Implementation of MCP Types (for testing without vscode imports)
// =============================================================================

interface RuleInfo {
	name: string;
	description: string;
	type: 'always' | 'glob' | 'manual';
	path: string;
	globs?: string[];
}

interface RuleContent extends RuleInfo {
	content: string;
}

interface CommandInfo {
	name: string;
	description: string;
	path: string;
	location: 'workspace' | 'global';
}

interface CommandContent extends CommandInfo {
	content: string;
}

function toRuleInfo(rule: MockRule): RuleInfo {
	const type = rule.metadata.alwaysApply ? 'always' :
		(rule.metadata.globs && rule.metadata.globs.length > 0) ? 'glob' : 'manual';

	return {
		name: rule.fileName.replace(/\.(mdc|md)$/, ''),
		description: rule.metadata.description || '',
		type,
		path: rule.uri.fsPath,
		globs: rule.metadata.globs
	};
}

function toRuleContent(rule: MockRule): RuleContent {
	const type = rule.metadata.alwaysApply ? 'always' :
		(rule.metadata.globs && rule.metadata.globs.length > 0) ? 'glob' : 'manual';

	return {
		name: rule.fileName.replace(/\.(mdc|md)$/, ''),
		description: rule.metadata.description || '',
		type,
		path: rule.uri.fsPath,
		content: rule.content,
		globs: rule.metadata.globs
	};
}

function extractCommandDescription(content: string): string {
	// Try to find ## Overview section
	const overviewMatch = content.match(/## Overview\s*\n+([^\n#]+)/);
	if (overviewMatch) {
		return overviewMatch[1].trim();
	}

	// Try to find first non-heading paragraph
	const lines = content.split('\n');
	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-')) {
			return trimmed.substring(0, 200);
		}
	}

	return '';
}

function toCommandInfo(command: MockCommand): CommandInfo {
	return {
		name: command.fileName.replace(/\.md$/, ''),
		description: extractCommandDescription(command.content),
		path: command.uri.fsPath,
		location: command.location
	};
}

function toCommandContent(command: MockCommand): CommandContent {
	return {
		name: command.fileName.replace(/\.md$/, ''),
		description: extractCommandDescription(command.content),
		path: command.uri.fsPath,
		location: command.location,
		content: command.content
	};
}

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockRule(overrides: Partial<MockRule> = {}): MockRule {
	return {
		uri: { fsPath: '/workspace/.cursor/rules/test-rule.mdc', path: '/workspace/.cursor/rules/test-rule.mdc' },
		metadata: { description: 'Test rule description' },
		content: '# Test Rule\n\nThis is test rule content.',
		fileName: 'test-rule.mdc',
		...overrides
	};
}

function createMockCommand(overrides: Partial<MockCommand> = {}): MockCommand {
	return {
		uri: { fsPath: '/workspace/.cursor/commands/test-command.md', path: '/workspace/.cursor/commands/test-command.md' },
		content: '# Test Command\n\n## Overview\n\nThis is a test command description.\n\n## Steps\n\n1. Do something',
		fileName: 'test-command.md',
		location: 'workspace',
		...overrides
	};
}

// =============================================================================
// Tests
// =============================================================================

describe('MCP Types Tests', () => {
	describe('toRuleInfo', () => {
		it('should convert rule with alwaysApply to always type', () => {
			const rule = createMockRule({
				metadata: { description: 'Always apply rule', alwaysApply: true }
			});
			const result = toRuleInfo(rule);

			assert.strictEqual(result.type, 'always');
			assert.strictEqual(result.description, 'Always apply rule');
		});

		it('should convert rule with globs to glob type', () => {
			const rule = createMockRule({
				metadata: { description: 'Glob rule', globs: ['*.ts', '*.tsx'] }
			});
			const result = toRuleInfo(rule);

			assert.strictEqual(result.type, 'glob');
			assert.deepStrictEqual(result.globs, ['*.ts', '*.tsx']);
		});

		it('should convert rule without alwaysApply or globs to manual type', () => {
			const rule = createMockRule({
				metadata: { description: 'Manual rule' }
			});
			const result = toRuleInfo(rule);

			assert.strictEqual(result.type, 'manual');
		});

		it('should strip .mdc extension from name', () => {
			const rule = createMockRule({ fileName: 'my-rule.mdc' });
			const result = toRuleInfo(rule);

			assert.strictEqual(result.name, 'my-rule');
		});

		it('should strip .md extension from name', () => {
			const rule = createMockRule({ fileName: 'my-rule.md' });
			const result = toRuleInfo(rule);

			assert.strictEqual(result.name, 'my-rule');
		});

		it('should use fsPath for path', () => {
			const rule = createMockRule({
				uri: { fsPath: '/custom/path/rule.mdc', path: '/custom/path/rule.mdc' }
			});
			const result = toRuleInfo(rule);

			assert.strictEqual(result.path, '/custom/path/rule.mdc');
		});

		it('should handle empty description', () => {
			const rule = createMockRule({
				metadata: { description: '' }
			});
			const result = toRuleInfo(rule);

			assert.strictEqual(result.description, '');
		});

		it('should prefer alwaysApply over globs', () => {
			const rule = createMockRule({
				metadata: { description: 'Both set', alwaysApply: true, globs: ['*.ts'] }
			});
			const result = toRuleInfo(rule);

			assert.strictEqual(result.type, 'always');
		});

		it('should treat empty globs array as manual', () => {
			const rule = createMockRule({
				metadata: { description: 'Empty globs', globs: [] }
			});
			const result = toRuleInfo(rule);

			assert.strictEqual(result.type, 'manual');
		});
	});

	describe('toRuleContent', () => {
		it('should include all RuleInfo properties plus content', () => {
			const rule = createMockRule({
				content: '# Rule Content\n\nDetailed instructions.'
			});
			const result = toRuleContent(rule);

			assert.strictEqual(result.name, 'test-rule');
			assert.strictEqual(result.description, 'Test rule description');
			assert.strictEqual(result.type, 'manual');
			assert.strictEqual(result.content, '# Rule Content\n\nDetailed instructions.');
		});

		it('should preserve full content with markdown formatting', () => {
			const rule = createMockRule({
				content: `# Complex Rule

## Section 1

- Item 1
- Item 2

\`\`\`typescript
const code = true;
\`\`\`
`
			});
			const result = toRuleContent(rule);

			assert.ok(result.content.includes('## Section 1'));
			assert.ok(result.content.includes('```typescript'));
		});
	});

	describe('extractCommandDescription', () => {
		it('should extract description from ## Overview section', () => {
			const content = `# Command

## Overview

This is the overview description.

## Steps

1. Do something`;
			const result = extractCommandDescription(content);

			assert.strictEqual(result, 'This is the overview description.');
		});

		it('should handle Overview with multiple blank lines', () => {
			const content = `# Command

## Overview


First paragraph after blank lines.

## Next Section`;
			const result = extractCommandDescription(content);

			assert.strictEqual(result, 'First paragraph after blank lines.');
		});

		it('should fallback to first non-heading paragraph if no Overview', () => {
			const content = `# Command

First paragraph without Overview section.

## Details`;
			const result = extractCommandDescription(content);

			assert.strictEqual(result, 'First paragraph without Overview section.');
		});

		it('should skip lines starting with # or -', () => {
			const content = `# Heading
- List item
Actual description here.`;
			const result = extractCommandDescription(content);

			assert.strictEqual(result, 'Actual description here.');
		});

		it('should truncate long descriptions to 200 chars', () => {
			const longText = 'A'.repeat(300);
			const content = `# Command\n\n${longText}`;
			const result = extractCommandDescription(content);

			assert.strictEqual(result.length, 200);
		});

		it('should return empty string for empty content', () => {
			const result = extractCommandDescription('');
			assert.strictEqual(result, '');
		});

		it('should return empty string for only headings', () => {
			const content = `# Heading 1
## Heading 2
### Heading 3`;
			const result = extractCommandDescription(content);

			assert.strictEqual(result, '');
		});
	});

	describe('toCommandInfo', () => {
		it('should convert command to CommandInfo', () => {
			const command = createMockCommand();
			const result = toCommandInfo(command);

			assert.strictEqual(result.name, 'test-command');
			assert.strictEqual(result.description, 'This is a test command description.');
			assert.strictEqual(result.location, 'workspace');
		});

		it('should strip .md extension from name', () => {
			const command = createMockCommand({ fileName: 'my-command.md' });
			const result = toCommandInfo(command);

			assert.strictEqual(result.name, 'my-command');
		});

		it('should preserve global location', () => {
			const command = createMockCommand({ location: 'global' });
			const result = toCommandInfo(command);

			assert.strictEqual(result.location, 'global');
		});

		it('should use fsPath for path', () => {
			const command = createMockCommand({
				uri: { fsPath: '/home/user/.cursor/commands/global-cmd.md', path: '/home/user/.cursor/commands/global-cmd.md' }
			});
			const result = toCommandInfo(command);

			assert.strictEqual(result.path, '/home/user/.cursor/commands/global-cmd.md');
		});
	});

	describe('toCommandContent', () => {
		it('should include all CommandInfo properties plus content', () => {
			const command = createMockCommand();
			const result = toCommandContent(command);

			assert.strictEqual(result.name, 'test-command');
			assert.strictEqual(result.description, 'This is a test command description.');
			assert.strictEqual(result.location, 'workspace');
			assert.ok(result.content.includes('# Test Command'));
			assert.ok(result.content.includes('## Overview'));
		});

		it('should preserve full content with all sections', () => {
			const command = createMockCommand({
				content: `# Start Task

## Overview

Begin development on a task.

## Prerequisites

1. Plan exists
2. MCP status valid

## Steps

1. Check plan
2. Create branch
3. Implement

## Constraints

- Must follow standards
- Must write tests`
			});
			const result = toCommandContent(command);

			assert.ok(result.content.includes('## Prerequisites'));
			assert.ok(result.content.includes('## Steps'));
			assert.ok(result.content.includes('## Constraints'));
		});
	});

	describe('Type Consistency', () => {
		it('should produce consistent types between Info and Content', () => {
			const rule = createMockRule({
				metadata: { description: 'Test', alwaysApply: true, globs: ['*.ts'] }
			});

			const info = toRuleInfo(rule);
			const content = toRuleContent(rule);

			assert.strictEqual(info.name, content.name);
			assert.strictEqual(info.description, content.description);
			assert.strictEqual(info.type, content.type);
			assert.strictEqual(info.path, content.path);
			assert.deepStrictEqual(info.globs, content.globs);
		});

		it('should produce consistent types for commands', () => {
			const command = createMockCommand();

			const info = toCommandInfo(command);
			const content = toCommandContent(command);

			assert.strictEqual(info.name, content.name);
			assert.strictEqual(info.description, content.description);
			assert.strictEqual(info.path, content.path);
			assert.strictEqual(info.location, content.location);
		});
	});

	describe('Edge Cases', () => {
		it('should handle rule with undefined metadata properties', () => {
			const rule: MockRule = {
				uri: { fsPath: '/path/rule.mdc', path: '/path/rule.mdc' },
				metadata: { description: '' },
				content: '',
				fileName: 'rule.mdc'
			};

			const result = toRuleInfo(rule);
			assert.strictEqual(result.type, 'manual');
			assert.strictEqual(result.description, '');
			assert.strictEqual(result.globs, undefined);
		});

		it('should handle command with minimal content', () => {
			const command = createMockCommand({
				content: ''
			});

			const result = toCommandInfo(command);
			assert.strictEqual(result.description, '');
		});

		it('should handle special characters in file names', () => {
			const rule = createMockRule({
				fileName: 'rule-with-dashes_and_underscores.mdc'
			});

			const result = toRuleInfo(rule);
			assert.strictEqual(result.name, 'rule-with-dashes_and_underscores');
		});

		it('should handle paths with spaces', () => {
			const command = createMockCommand({
				uri: {
					fsPath: '/path/with spaces/commands/my command.md',
					path: '/path/with spaces/commands/my command.md'
				},
				fileName: 'my command.md'
			});

			const result = toCommandInfo(command);
			assert.strictEqual(result.name, 'my command');
			assert.ok(result.path.includes('with spaces'));
		});
	});
});
