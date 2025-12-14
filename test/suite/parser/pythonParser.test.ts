import * as assert from 'assert';

describe('PythonParser Tests', () => {
	describe('Parser Structure', () => {
		it('should have parseProjects and getImportantDependencies methods', () => {
			const { PythonParser } = require('../../src/scanner/parsers/pythonParser');
			const parser = new PythonParser();

			assert.ok(typeof parser.parseProjects === 'function');
			assert.ok(typeof parser.getImportantDependencies === 'function');
		});
	});

	describe('Dependency Extraction', () => {
		it('should extract and format Python dependencies', () => {
			const { PythonParser } = require('../../src/scanner/parsers/pythonParser');
			const parser = new PythonParser();

			const testProject: any = {
				name: 'test-package',
				version: '1.0.0',
				requiresPython: '>=3.12',
				dependencies: [
					{ name: 'django', version: '4.0.0' },
					{ name: 'flask', version: '2.0.0' },
					{ name: 'requests' }
				],
				devDependencies: [
					{ name: 'pytest', version: '7.0.0' }
				]
			};

			const deps = parser.getImportantDependencies(testProject);
			assert.ok(deps.length >= 3);
			assert.ok(deps.some((d: string) => d.includes('django')));
			assert.ok(deps.some((d: string) => d.includes('flask')));
			assert.ok(deps.some((d: string) => d.includes('pytest')));
		});

		it('should handle empty dependencies', () => {
			const { PythonParser } = require('../../src/scanner/parsers/pythonParser');
			const parser = new PythonParser();

			const testProject: any = {
				dependencies: [],
				devDependencies: []
			};

			const deps = parser.getImportantDependencies(testProject);
			assert.ok(Array.isArray(deps));
			assert.equal(deps.length, 0);
		});
	});

	describe('Requirement Line Parsing', () => {
		it('should parse requirement lines with versions', () => {
			const { PythonParser } = require('../../src/scanner/parsers/pythonParser');
			const parser = new PythonParser();

			const testProject: any = {
				dependencies: [
					{ name: 'test==1.0.0', version: '1.0.0' },
					{ name: 'test2>=2.0.0', version: '2.0.0' }
				],
				devDependencies: []
			};

			const deps = parser.getImportantDependencies(testProject);
			assert.ok(deps.length > 0);
		});
	});
});

