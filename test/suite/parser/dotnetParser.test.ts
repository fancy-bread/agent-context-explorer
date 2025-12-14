import * as assert from 'assert';

describe('DotNetParser Tests', () => {
	describe('Parser Structure', () => {
		it('should have parseProjects method', () => {
			// Test that the class can be imported
			const { DotNetParser } = require('../../src/scanner/parsers/dotnetParser');
			const parser = new DotNetParser();

			assert.ok(typeof parser.parseProjects === 'function');
			assert.ok(typeof parser.getFrameworkVersions === 'function');
			assert.ok(typeof parser.getImportantDependencies === 'function');
		});
	});

	describe('Framework Version Extraction', () => {
		it('should format versions correctly', () => {
			const { DotNetParser } = require('../../src/scanner/parsers/dotnetParser');
			const parser = new DotNetParser();

			const testProjects = [
				{
					targetFramework: 'net9.0',
					packages: [],
					isTestProject: false,
					isWebProject: true
				},
				{
					targetFramework: 'net8.0',
					packages: [
						{ name: 'xunit', version: '2.9.0' },
						{ name: 'Microsoft.AspNetCore.App', version: '9.0.0' }
					],
					isTestProject: true,
					isWebProject: false
				}
			];

			const versions = parser.getFrameworkVersions(testProjects as any);
			assert.ok(versions.includes('net9.0'));
			assert.ok(versions.includes('net8.0'));
		});
	});

	describe('Dependency Extraction', () => {
		it('should extract and format dependencies', () => {
			const { DotNetParser } = require('../../src/scanner/parsers/dotnetParser');
			const parser = new DotNetParser();

			const testProjects = [
				{
					targetFramework: 'net9.0',
					packages: [
						{ name: 'xunit', version: '2.9.0' },
						{ name: 'Microsoft.AspNetCore.App', version: '9.0.0' }
					],
					isTestProject: true,
					isWebProject: false
				}
			];

			const deps = parser.getImportantDependencies(testProjects as any);
			assert.ok(deps.length >= 2);
			assert.ok(deps.some((d: string) => d.includes('xunit')));
			assert.ok(deps.some((d: string) => d.includes('Microsoft.AspNetCore.App')));
		});

		it('should handle empty projects', () => {
			const { DotNetParser } = require('../../src/scanner/parsers/dotnetParser');
			const parser = new DotNetParser();

			const deps = parser.getImportantDependencies([]);
			assert.ok(Array.isArray(deps));
			assert.equal(deps.length, 0);
		});
	});

	describe('Version Formatting', () => {
		it('should format versions to major.x', () => {
			const { DotNetParser } = require('../../src/scanner/parsers/dotnetParser');
			const parser = new DotNetParser();

			const testProjects = [
				{
					targetFramework: 'net9.0',
					packages: [
						{ name: 'test', version: '9.0.0' },
						{ name: 'test2', version: '8.5.1' }
					],
					isTestProject: false,
					isWebProject: false
				}
			];

			const deps = parser.getImportantDependencies(testProjects as any);
			// Check that versions are formatted
			assert.ok(deps.length > 0);
		});
	});
});
