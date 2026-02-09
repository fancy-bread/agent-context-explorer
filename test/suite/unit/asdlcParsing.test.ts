import * as assert from 'assert';
import {
	parseAgentsMd,
	parseSections,
	extractMission,
	extractCorePhilosophy,
	extractTechStack,
	extractOperationalBoundaries,
	extractListItems,
	extractSingleValue,
	extractTierItems,
	hasSection,
	extractSchemaId
} from '../../../src/scanner/asdlcParsing';

const AGENTS_MD_WITH_TECH_STACK = `# AGENTS.md - Context & Rules for AI Agents

> **Project Mission:** Build amazing software with AI assistance.
> **Core Philosophy:** Explicit artifacts over optimistic inference.

---

## 1. Identity & Persona

- **Role:** Software Engineer
- **Specialization:** TypeScript

---

## 2. Tech Stack (Ground Truth)

### Core Technologies
- **Language:** TypeScript
- **Framework:** VS Code Extension API
- **Build Tool:** TypeScript Compiler (tsc)
- **Testing:** Mocha
- **Package Manager:** npm

---

## 3. Operational Boundaries (CRITICAL)

### Tier 1 (ALWAYS): Non-negotiable standards

- **ALWAYS** use strict TypeScript
- **ALWAYS** write unit tests

### Tier 2 (ASK): High-risk operations

- **ASK** before removing features
- **ASK** before adding dependencies

### Tier 3 (NEVER): Safety limits

- **NEVER** execute user code directly
- **NEVER** commit secrets
`;

describe('asdlcParsing', () => {
	describe('parseAgentsMd', () => {
		it('should parse full AGENTS.md and return techStack', () => {
			const result = parseAgentsMd(AGENTS_MD_WITH_TECH_STACK, '/test/AGENTS.md');
			assert.strictEqual(result.exists, true);
			assert.strictEqual(result.path, '/test/AGENTS.md');
			assert.strictEqual(result.mission, 'Build amazing software with AI assistance.');
			assert.strictEqual(result.corePhilosophy, 'Explicit artifacts over optimistic inference.');
			assert.ok(result.techStack, 'techStack should be defined');
			assert.deepStrictEqual(result.techStack!.languages, ['TypeScript']);
			assert.deepStrictEqual(result.techStack!.frameworks, ['VS Code Extension API']);
			assert.deepStrictEqual(result.techStack!.testing, ['Mocha']);
			assert.strictEqual(result.techStack!.packageManager, 'npm');
		});

		it('should handle malformed content without structure', () => {
			const content = 'Just some random content without structure';
			const result = parseAgentsMd(content, '/test/AGENTS.md');
			assert.strictEqual(result.exists, true);
			assert.strictEqual(result.mission, undefined);
			assert.strictEqual(result.corePhilosophy, undefined);
			assert.strictEqual(result.techStack, undefined);
			assert.strictEqual(result.operationalBoundaries, undefined);
			assert.strictEqual(result.sections.length, 0);
		});

		it('should handle content with mission but no tech stack', () => {
			const content = `# Project

> **Project Mission:** Do something great.

## Other Section
Content here.
`;
			const result = parseAgentsMd(content, '/x/AGENTS.md');
			assert.strictEqual(result.mission, 'Do something great.');
			assert.strictEqual(result.techStack, undefined);
		});
	});

	describe('extractTechStack', () => {
		it('should extract tech stack from Tech Stack section', () => {
			const sections = parseSections(AGENTS_MD_WITH_TECH_STACK.split('\n'));
			const techStack = extractTechStack(AGENTS_MD_WITH_TECH_STACK, sections);
			assert.ok(techStack);
			assert.deepStrictEqual(techStack!.languages, ['TypeScript']);
			assert.deepStrictEqual(techStack!.frameworks, ['VS Code Extension API']);
			assert.deepStrictEqual(techStack!.buildTools, ['TypeScript Compiler (tsc)']);
			assert.deepStrictEqual(techStack!.testing, ['Mocha']);
			assert.strictEqual(techStack!.packageManager, 'npm');
		});

		it('should return undefined when no Tech Stack section', () => {
			const content = `# Project

## Other Section
Content.
`;
			const sections = parseSections(content.split('\n'));
			const techStack = extractTechStack(content, sections);
			assert.strictEqual(techStack, undefined);
		});

		it('should match "Technology" section title variant', () => {
			const content = `# Project

## Technology Stack

### Core
- **Language:** Python
- **Framework:** Django
`;
			const sections = parseSections(content.split('\n'));
			const techStack = extractTechStack(content, sections);
			assert.ok(techStack);
			assert.deepStrictEqual(techStack!.languages, ['Python']);
			assert.deepStrictEqual(techStack!.frameworks, ['Django']);
		});
	});

	describe('extractMission', () => {
		it('should extract mission from blockquote', () => {
			const mission = extractMission(AGENTS_MD_WITH_TECH_STACK);
			assert.strictEqual(mission, 'Build amazing software with AI assistance.');
		});

		it('should return undefined when no mission', () => {
			const mission = extractMission('# Title\n\nNo mission here.');
			assert.strictEqual(mission, undefined);
		});
	});

	describe('extractCorePhilosophy', () => {
		it('should extract core philosophy from blockquote', () => {
			const philosophy = extractCorePhilosophy(AGENTS_MD_WITH_TECH_STACK);
			assert.strictEqual(philosophy, 'Explicit artifacts over optimistic inference.');
		});
	});

	describe('extractOperationalBoundaries', () => {
		it('should extract tier items from Operational Boundaries section', () => {
			const sections = parseSections(AGENTS_MD_WITH_TECH_STACK.split('\n'));
			const boundaries = extractOperationalBoundaries(AGENTS_MD_WITH_TECH_STACK, sections);
			assert.ok(boundaries);
			assert.ok(boundaries!.tier1Always.includes('use strict TypeScript'));
			assert.ok(boundaries!.tier1Always.includes('write unit tests'));
			assert.ok(boundaries!.tier2Ask.includes('before removing features'));
			assert.ok(boundaries!.tier3Never.includes('execute user code directly'));
			assert.ok(boundaries!.tier3Never.includes('commit secrets'));
		});

		it('should return undefined when no Operational Boundaries section', () => {
			const content = '# Project\n\n## Other\nContent.';
			const sections = parseSections(content.split('\n'));
			const boundaries = extractOperationalBoundaries(content, sections);
			assert.strictEqual(boundaries, undefined);
		});
	});

	describe('parseSections', () => {
		it('should parse markdown headings into sections', () => {
			const content = `# H1

## H2 One

### H3

## H2 Two
`;
			const sections = parseSections(content.split('\n'));
			assert.strictEqual(sections.length, 4);
			assert.strictEqual(sections[0].level, 1);
			assert.strictEqual(sections[0].title, 'H1');
			assert.strictEqual(sections[1].level, 2);
			assert.strictEqual(sections[1].title, 'H2 One');
		});
	});

	describe('extractListItems', () => {
		it('should extract items matching keyword pattern', () => {
			const content = `
- **Language:** TypeScript
- **Language:** JavaScript
- **Other:** Ignored
`;
			const items = extractListItems(content, 'language');
			assert.deepStrictEqual(items, ['TypeScript', 'JavaScript']);
		});

		it('should return empty array when no matches', () => {
			const items = extractListItems('No matching content', 'framework');
			assert.deepStrictEqual(items, []);
		});
	});

	describe('extractSingleValue', () => {
		it('should extract single value for keyword', () => {
			const content = '- **Package Manager:** npm';
			const value = extractSingleValue(content, 'package manager');
			assert.strictEqual(value, 'npm');
		});

		it('should return undefined when not found', () => {
			const value = extractSingleValue('No match', 'package manager');
			assert.strictEqual(value, undefined);
		});
	});

	describe('extractTierItems', () => {
		it('should extract ALWAYS/ASK/NEVER bullet items', () => {
			const content = `
### Tier 1 (ALWAYS): Standards

- **ALWAYS** do this
- **ALWAYS** do that

### Next section
`;
			const items = extractTierItems(content, 'tier 1', 'always');
			assert.ok(items.includes('do this'));
			assert.ok(items.includes('do that'));
		});
	});

	describe('hasSection', () => {
		it('should return true when section exists', () => {
			const content = `# Feature

## Blueprint

Design content.

## Contract

Done.`;
			assert.strictEqual(hasSection(content, 'Blueprint'), true);
			assert.strictEqual(hasSection(content, 'Contract'), true);
		});

		it('should return false when section missing', () => {
			assert.strictEqual(hasSection('# Title\n\nContent', 'Blueprint'), false);
		});

		it('should be case-insensitive', () => {
			assert.strictEqual(hasSection('## blueprint\n\nContent', 'Blueprint'), true);
		});
	});

	describe('extractSchemaId', () => {
		it('should extract $id from valid JSON schema', () => {
			const content = JSON.stringify({
				$id: 'https://example.com/schema.json',
				type: 'object'
			});
			const id = extractSchemaId(content);
			assert.strictEqual(id, 'https://example.com/schema.json');
		});

		it('should extract id when $id not present', () => {
			const content = JSON.stringify({ id: 'my-schema', type: 'object' });
			const id = extractSchemaId(content);
			assert.strictEqual(id, 'my-schema');
		});

		it('should return undefined for invalid JSON', () => {
			const id = extractSchemaId('not valid json {{{');
			assert.strictEqual(id, undefined);
		});

		it('should return undefined for malformed JSON', () => {
			const id = extractSchemaId('{"incomplete": ');
			assert.strictEqual(id, undefined);
		});
	});
});
