import * as assert from 'assert';
import {
	deduplicateArray,
	deduplicateDependencies,
	mergeAndDeduplicate,
	deduplicateBy
} from '../../../src/utils/deduplicator';

describe('Deduplicator Utilities', () => {
	describe('deduplicateArray', () => {
		it('should remove duplicate strings', () => {
			const input = ['typescript', 'react', 'typescript', 'node'];
			const result = deduplicateArray(input);

			assert.deepStrictEqual(result, ['node', 'react', 'typescript']);
		});

		it('should sort results alphabetically', () => {
			const input = ['zebra', 'apple', 'banana'];
			const result = deduplicateArray(input);

			assert.deepStrictEqual(result, ['apple', 'banana', 'zebra']);
		});

		it('should handle empty array', () => {
			const result = deduplicateArray([]);
			assert.deepStrictEqual(result, []);
		});

		it('should handle array with no duplicates', () => {
			const input = ['one', 'two', 'three'];
			const result = deduplicateArray(input);

			assert.deepStrictEqual(result, ['one', 'three', 'two']);
		});
	});

	describe('deduplicateDependencies', () => {
		it('should remove duplicates with version format', () => {
			const input = [
				'typescript (5.0.0)',
				'react (18.0.0)',
				'typescript (5.1.0)',
				'react (18.2.0)'
			];
			const result = deduplicateDependencies(input);

			// Should keep first occurrence
			assert.equal(result.length, 2);
			assert.ok(result.some(d => d.includes('typescript')));
			assert.ok(result.some(d => d.includes('react')));
		});

		it('should handle npm-style version format', () => {
			const input = [
				'typescript@5.0.0',
				'react@18.0.0',
				'typescript@5.1.0'
			];
			const result = deduplicateDependencies(input);

			assert.equal(result.length, 2);
		});

		it('should be case-insensitive', () => {
			const input = [
				'TypeScript (5.0.0)',
				'typescript (5.1.0)',
				'TYPESCRIPT (5.2.0)'
			];
			const result = deduplicateDependencies(input);

			assert.equal(result.length, 1);
		});

		it('should handle mixed formats', () => {
			const input = [
				'react (18.0.0)',
				'React@18.1.0',
				'react',
				'REACT (18.2.0)'
			];
			const result = deduplicateDependencies(input);

			assert.equal(result.length, 1);
		});

		it('should sort results', () => {
			const input = [
				'zod (3.0.0)',
				'axios (1.0.0)',
				'lodash (4.17.21)'
			];
			const result = deduplicateDependencies(input);

			assert.ok(result[0].includes('axios'));
			assert.ok(result[1].includes('lodash'));
			assert.ok(result[2].includes('zod'));
		});

		it('should handle empty array', () => {
			const result = deduplicateDependencies([]);
			assert.deepStrictEqual(result, []);
		});
	});

	describe('mergeAndDeduplicate', () => {
		it('should merge multiple arrays and remove duplicates', () => {
			const arr1 = ['react', 'vue'];
			const arr2 = ['angular', 'react'];
			const arr3 = ['vue', 'svelte'];

			const result = mergeAndDeduplicate(arr1, arr2, arr3);

			assert.deepStrictEqual(result, ['angular', 'react', 'svelte', 'vue']);
		});

		it('should handle empty arrays', () => {
			const result = mergeAndDeduplicate([], [], []);
			assert.deepStrictEqual(result, []);
		});

		it('should handle single array', () => {
			const result = mergeAndDeduplicate(['one', 'two', 'one']);
			assert.deepStrictEqual(result, ['one', 'two']);
		});

		it('should handle mixed array sizes', () => {
			const arr1 = ['a', 'b', 'c'];
			const arr2 = ['d'];
			const arr3: string[] = [];

			const result = mergeAndDeduplicate(arr1, arr2, arr3);

			assert.deepStrictEqual(result, ['a', 'b', 'c', 'd']);
		});
	});

	describe('deduplicateBy', () => {
		it('should deduplicate objects by custom key', () => {
			const input = [
				{ name: 'TypeScript', version: '5.0.0' },
				{ name: 'React', version: '18.0.0' },
				{ name: 'typescript', version: '5.1.0' }
			];

			const result = deduplicateBy(input, item => item.name);

			assert.equal(result.length, 2);
			assert.equal(result[0].name, 'TypeScript');
			assert.equal(result[1].name, 'React');
		});

		it('should be case-insensitive', () => {
			const input = [
				{ id: 'REACT' },
				{ id: 'react' },
				{ id: 'React' }
			];

			const result = deduplicateBy(input, item => item.id);

			assert.equal(result.length, 1);
		});

		it('should preserve first occurrence', () => {
			const input = [
				{ name: 'first', value: 1 },
				{ name: 'second', value: 2 },
				{ name: 'first', value: 3 }
			];

			const result = deduplicateBy(input, item => item.name);

			assert.equal(result.length, 2);
			assert.equal(result[0].value, 1); // First occurrence preserved
		});

		it('should handle empty array', () => {
			const result = deduplicateBy<{ id: string }>([], item => item.id);
			assert.deepStrictEqual(result, []);
		});
	});

	describe('Integration Tests', () => {
		it('should handle real-world dependency scenario', () => {
			const npmDeps = [
				'typescript (5.0.0)',
				'@types/node (18.0.0)',
				'react (18.2.0)'
			];
			const yarnDeps = [
				'typescript (5.1.0)',
				'react (18.2.0)',
				'vue (3.0.0)'
			];

			const merged = mergeAndDeduplicate(npmDeps, yarnDeps);
			const deduplicated = deduplicateDependencies(merged);

			assert.ok(deduplicated.length <= 4);
			assert.ok(deduplicated.some(d => d.includes('typescript')));
			assert.ok(deduplicated.some(d => d.includes('react')));
			assert.ok(deduplicated.some(d => d.includes('vue')));
		});

		it('should handle complex nested deduplication', () => {
			const frameworks = ['React', 'react', 'REACT', 'Vue', 'vue'];
			const languages = ['TypeScript', 'typescript', 'JavaScript'];

			const allTech = mergeAndDeduplicate(frameworks, languages);

			// Should merge and deduplicate exact matches (case-sensitive)
			assert.ok(allTech.length === 8); // All unique case-sensitive entries
			assert.ok(allTech.includes('React'));
			assert.ok(allTech.includes('Vue'));
			assert.ok(allTech.includes('TypeScript'));
		});
	});
});

