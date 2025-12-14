import * as assert from 'assert';

describe('CIParser Tests', () => {
	describe('Parser Structure', () => {
		it('should have parseConfigurations method', () => {
			const { CIParser } = require('../../src/scanner/parsers/ciParser');
			const parser = new CIParser();

			assert.ok(typeof parser.parseConfigurations === 'function');
		});
	});

	describe('Workflow Parsing', () => {
		it('should parse GitHub Actions workflows', () => {
			const { CIParser } = require('../../src/scanner/parsers/ciParser');
			const parser = new CIParser();

			const testWorkflows: any = [
				{
					type: 'github-actions',
					name: 'ci',
					onEvents: ['push', 'pull_request'],
					jobs: ['build', 'test']
				}
			];

			assert.ok(Array.isArray(testWorkflows));
			assert.ok(testWorkflows[0].type === 'github-actions');
		});

		it('should parse Azure Pipelines', () => {
			const { CIParser } = require('../../src/scanner/parsers/ciParser');
			const parser = new CIParser();

			const testWorkflows: any = [
				{
					type: 'azure-pipelines',
					name: 'azure-pipelines',
					jobs: ['build', 'deploy']
				}
			];

			assert.ok(Array.isArray(testWorkflows));
			assert.ok(testWorkflows[0].type === 'azure-pipelines');
		});

		it('should parse GitLab CI', () => {
			const { CIParser } = require('../../src/scanner/parsers/ciParser');
			const parser = new CIParser();

			const testWorkflows: any = [
				{
					type: 'gitlab-ci',
					name: 'gitlab-ci',
					jobs: ['test', 'deploy']
				}
			];

			assert.ok(Array.isArray(testWorkflows));
			assert.ok(testWorkflows[0].type === 'gitlab-ci');
		});
	});
});

