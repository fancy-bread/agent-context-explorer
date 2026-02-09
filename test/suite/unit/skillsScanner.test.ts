import * as assert from 'assert';
import { parseSKILLMetadata } from '../../../src/scanner/skillParsing';

describe('SkillsScanner / skillParsing', () => {
	describe('parseSKILLMetadata', () => {
		it('should extract title from frontmatter', () => {
			const content = `---
name: create-plan
title: Create Plan
overview: Create a spec or plan for a feature.
---

# Create Plan

Content here.
`;
			const metadata = parseSKILLMetadata(content);
			assert.ok(metadata);
			assert.strictEqual(metadata!.title, 'Create Plan');
			assert.strictEqual(metadata!.overview, 'Create a spec or plan for a feature.');
		});

		it('should fallback to first heading when no frontmatter', () => {
			const content = `# Create Spec

## Overview
Create a living specification.
`;
			const metadata = parseSKILLMetadata(content);
			assert.ok(metadata);
			assert.strictEqual(metadata!.title, 'Create Spec');
			assert.strictEqual(metadata!.overview, undefined);
		});

		it('should return undefined for content without heading or frontmatter', () => {
			const content = 'Just plain text. No structure.';
			const metadata = parseSKILLMetadata(content);
			assert.strictEqual(metadata, undefined);
		});

		it('should parse prerequisites and steps arrays from frontmatter', () => {
			const content = `---
title: Test Skill
prerequisites:
  - MCP status
  - Story exists
steps:
  - Analyze
  - Design
---
`;
			const metadata = parseSKILLMetadata(content);
			assert.ok(metadata);
			assert.deepStrictEqual(metadata!.prerequisites, ['MCP status', 'Story exists']);
			assert.deepStrictEqual(metadata!.steps, ['Analyze', 'Design']);
		});

		it('should parse tools array from frontmatter', () => {
			const content = `---
title: Deploy
tools:
  - run_terminal_cmd
  - read_file
---
`;
			const metadata = parseSKILLMetadata(content);
			assert.ok(metadata);
			assert.deepStrictEqual(metadata!.tools, ['run_terminal_cmd', 'read_file']);
		});

		it('should handle malformed frontmatter gracefully', () => {
			const content = `---
title: Broken
invalid: [unclosed
---

# Fallback Title
`;
			const metadata = parseSKILLMetadata(content);
			// gray-matter may still parse or throw; we fallback to H1
			assert.ok(metadata === undefined || metadata!.title === 'Fallback Title');
		});

		it('should handle empty frontmatter', () => {
			const content = `---
---

# Skill Title

Body.
`;
			const metadata = parseSKILLMetadata(content);
			assert.ok(metadata);
			assert.strictEqual(metadata!.title, 'Skill Title');
		});

		it('should ignore non-array prerequisites', () => {
			const content = `---
title: Test
prerequisites: "not an array"
---
`;
			const metadata = parseSKILLMetadata(content);
			assert.ok(metadata);
			assert.strictEqual(metadata!.prerequisites, undefined);
		});

		it('should parse guidance object from frontmatter', () => {
			const content = `---
title: Test
guidance:
  role: developer
  instruction: Do the thing
---
`;
			const metadata = parseSKILLMetadata(content);
			assert.ok(metadata);
			assert.ok(metadata!.guidance);
			assert.strictEqual(metadata!.guidance!.role, 'developer');
			assert.strictEqual(metadata!.guidance!.instruction, 'Do the thing');
		});
	});
});
