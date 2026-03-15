import * as assert from 'assert';
import {
	hasSection,
	extractSchemaId,
	parseSections,
	type SimpleSection
} from '../../../src/scanner/core/asdlcHelpers';

describe('scanner/core/asdlcHelpers', () => {
	describe('hasSection', () => {
		it('returns true when content has ## sectionName', () => {
			assert.strictEqual(hasSection('## Blueprint\ncontent', 'Blueprint'), true);
			assert.strictEqual(hasSection('text\n## Contract\nmore', 'Contract'), true);
		});

		it('is case-insensitive (mi flag)', () => {
			assert.strictEqual(hasSection('## blueprint\n', 'Blueprint'), true);
			assert.strictEqual(hasSection('## CONTRACT\n', 'Contract'), true);
		});

		it('returns false when section missing', () => {
			assert.strictEqual(hasSection('## Other\n', 'Blueprint'), false);
			assert.strictEqual(hasSection('no headings', 'Blueprint'), false);
		});

		it('matches only ## (h2) not # or ###', () => {
			assert.strictEqual(hasSection('## Blueprint\n', 'Blueprint'), true);
			assert.strictEqual(hasSection('# Blueprint\n', 'Blueprint'), false);
			assert.strictEqual(hasSection('### Blueprint\n', 'Blueprint'), false);
		});
	});

	describe('extractSchemaId', () => {
		it('returns $id when present', () => {
			const json = JSON.stringify({ $id: 'https://example.com/schema.json', type: 'object' });
			assert.strictEqual(extractSchemaId(json), 'https://example.com/schema.json');
		});

		it('returns id when $id absent', () => {
			const json = JSON.stringify({ id: 'my-schema', type: 'object' });
			assert.strictEqual(extractSchemaId(json), 'my-schema');
		});

		it('returns undefined for invalid JSON', () => {
			assert.strictEqual(extractSchemaId('not json'), undefined);
			assert.strictEqual(extractSchemaId('{'), undefined);
		});

		it('returns undefined when neither $id nor id present', () => {
			const json = JSON.stringify({ type: 'object' });
			assert.strictEqual(extractSchemaId(json), undefined);
		});
	});

	describe('parseSections', () => {
		it('returns sections from markdown headings', () => {
			const lines = ['# Title', 'content', '## Section A', 'a body', '## Section B'];
			const sections = parseSections(lines);
			assert.strictEqual(sections.length, 3);
			assert.strictEqual(sections[0].level, 1);
			assert.strictEqual(sections[0].title, 'Title');
			assert.strictEqual(sections[0].startLine, 0);
			assert.strictEqual(sections[1].level, 2);
			assert.strictEqual(sections[1].title, 'Section A');
			assert.strictEqual(sections[2].title, 'Section B');
		});

		it('sets endLine of previous section before next heading', () => {
			const lines = ['## A', 'line1', '## B'];
			const sections = parseSections(lines);
			assert.strictEqual(sections[0].endLine, 1);
			assert.strictEqual(sections[1].startLine, 2);
		});

		it('returns empty array when no headings', () => {
			assert.deepStrictEqual(parseSections([]), []);
			assert.deepStrictEqual(parseSections(['plain text', 'more']), []);
		});

		it('handles single heading', () => {
			const sections = parseSections(['## Only']);
			assert.strictEqual(sections.length, 1);
			assert.strictEqual(sections[0].title, 'Only');
			assert.strictEqual(sections[0].endLine, 0);
		});
	});
});
