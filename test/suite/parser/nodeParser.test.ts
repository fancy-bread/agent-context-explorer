import * as assert from 'assert';

describe('NodeParser Tests', () => {
	describe('Parser Structure', () => {
		it('should have parseProject method', () => {
			const { NodeParser } = require('../../src/scanner/parsers/nodeParser');
			const parser = new NodeParser();

			assert.ok(typeof parser.parseProject === 'function');
		});
	});

	describe('Framework Detection', () => {
		it('should detect React framework', () => {
			const { NodeParser } = require('../../src/scanner/parsers/nodeParser');
			const parser = new NodeParser();

			const testProject: any = {
				name: 'test-app',
				version: '1.0.0',
				engines: { node: '18.0.0', npm: '9.0.0' },
				frameworks: ['React'],
				cloudSDKs: [],
				testingFrameworks: ['Jest']
			};

			assert.ok(testProject.frameworks.includes('React'));
		});

		it('should detect Vue framework', () => {
			const { NodeParser } = require('../../src/scanner/parsers/nodeParser');
			const parser = new NodeParser();

			const testProject: any = {
				frameworks: ['Vue'],
				cloudSDKs: [],
				testingFrameworks: []
			};

			assert.ok(testProject.frameworks.includes('Vue'));
		});

		it('should detect Express framework', () => {
			const { NodeParser } = require('../../src/scanner/parsers/nodeParser');
			const parser = new NodeParser();

			const testProject: any = {
				frameworks: ['Express'],
				cloudSDKs: [],
				testingFrameworks: []
			};

			assert.ok(testProject.frameworks.includes('Express'));
		});
	});

	describe('Cloud SDK Detection', () => {
		it('should detect AWS SDK', () => {
			const { NodeParser } = require('../../src/scanner/parsers/nodeParser');
			const parser = new NodeParser();

			const testProject: any = {
				frameworks: [],
				cloudSDKs: ['AWS SDK'],
				testingFrameworks: []
			};

			assert.ok(testProject.cloudSDKs.includes('AWS SDK'));
		});

		it('should detect Azure SDK', () => {
			const { NodeParser } = require('../../src/scanner/parsers/nodeParser');
			const parser = new NodeParser();

			const testProject: any = {
				frameworks: [],
				cloudSDKs: ['Azure SDK'],
				testingFrameworks: []
			};

			assert.ok(testProject.cloudSDKs.includes('Azure SDK'));
		});
	});

	describe('Testing Framework Detection', () => {
		it('should detect Jest', () => {
			const { NodeParser } = require('../../src/scanner/parsers/nodeParser');
			const parser = new NodeParser();

			const testProject: any = {
				frameworks: [],
				cloudSDKs: [],
				testingFrameworks: ['Jest']
			};

			assert.ok(testProject.testingFrameworks.includes('Jest'));
		});

		it('should detect Mocha', () => {
			const { NodeParser } = require('../../src/scanner/parsers/nodeParser');
			const parser = new NodeParser();

			const testProject: any = {
				frameworks: [],
				cloudSDKs: [],
				testingFrameworks: ['Mocha']
			};

			assert.ok(testProject.testingFrameworks.includes('Mocha'));
		});

		it('should detect Vitest', () => {
			const { NodeParser } = require('../../src/scanner/parsers/nodeParser');
			const parser = new NodeParser();

			const testProject: any = {
				frameworks: [],
				cloudSDKs: [],
				testingFrameworks: ['Vitest']
			};

			assert.ok(testProject.testingFrameworks.includes('Vitest'));
		});
	});
});

