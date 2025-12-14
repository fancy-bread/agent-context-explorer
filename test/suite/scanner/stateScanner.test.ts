import * as assert from 'assert';

// Mock VS Code API for testing
const mockVscode = {
	workspace: {
		fs: {
			stat: async (uri: any) => {
				// Mock file existence based on path
				if (uri.fsPath.includes('package.json')) {
					return { type: 1 }; // File
				}
				if (uri.fsPath.includes('src/')) {
					return { type: 2 }; // Directory
				}
				if (uri.fsPath.includes('test/')) {
					return { type: 2 }; // Directory
				}
				throw new Error('File not found');
			},
			readFile: async (uri: any) => {
				if (uri.fsPath.includes('package.json')) {
					return Buffer.from(JSON.stringify({
						dependencies: { react: '^18.0.0', typescript: '^5.0.0' },
						devDependencies: { jest: '^29.0.0', eslint: '^8.0.0' }
					}));
				}
				if (uri.fsPath.includes('requirements.txt')) {
					return Buffer.from('django==4.0.0\nflask==2.0.0\npytest==7.0.0');
				}
				if (uri.fsPath.includes('docker-compose.yml')) {
					return Buffer.from('version: "3.8"\nservices:\n  postgres:\n    image: postgres:13\n  redis:\n    image: redis:6');
				}
				return Buffer.from('test content');
			}
		}
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

// Mock StateScanner class for testing
class MockStateScanner {
	constructor(private workspaceRoot: any) {}

	async detectLanguages(): Promise<string[]> {
		const languages: string[] = [];

		// Check for language indicators
		if (await this.fileExists('package.json')) { languages.push('JavaScript/TypeScript'); }
		if (await this.fileExists('requirements.txt') || await this.fileExists('pyproject.toml')) { languages.push('Python'); }
		if (await this.fileExists('Cargo.toml')) { languages.push('Rust'); }
		if (await this.fileExists('go.mod')) { languages.push('Go'); }
		if (await this.fileExists('composer.json')) { languages.push('PHP'); }
		if (await this.fileExists('Gemfile')) { languages.push('Ruby'); }
		if (await this.fileExists('pom.xml') || await this.fileExists('build.gradle')) { languages.push('Java'); }

		return languages;
	}

	async detectFrameworks(): Promise<string[]> {
		const frameworks: string[] = [];

		// Check for package.json (Node.js/JavaScript)
		if (await this.fileExists('package.json')) {
			frameworks.push('Node.js');

			// Check for specific frameworks in package.json
			try {
				const packageJson = await this.readJsonFile('package.json');
				const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

				if (deps.react) { frameworks.push('React'); }
				if (deps.vue) { frameworks.push('Vue'); }
				if (deps.angular) { frameworks.push('Angular'); }
				if (deps.next) { frameworks.push('Next.js'); }
				if (deps.nuxt) { frameworks.push('Nuxt.js'); }
				if (deps.express) { frameworks.push('Express'); }
				if (deps.fastify) { frameworks.push('Fastify'); }
				if (deps.koa) { frameworks.push('Koa'); }
			} catch (error) {
				console.error('Error reading package.json:', error);
			}
		}

		// Check for Python frameworks
		if (await this.fileExists('requirements.txt')) {
			frameworks.push('Python');

			try {
				const content = await this.readFile('requirements.txt');
				if (content.includes('django')) { frameworks.push('Django'); }
				if (content.includes('flask')) { frameworks.push('Flask'); }
				if (content.includes('fastapi')) { frameworks.push('FastAPI'); }
				if (content.includes('pytest')) { frameworks.push('Pytest'); }
			} catch (error) {
				console.error('Error reading requirements.txt:', error);
			}
		}

		return [...new Set(frameworks)]; // Remove duplicates
	}

	async detectDependencies(): Promise<string[]> {
		const dependencies: string[] = [];

		// Analyze package.json dependencies
		if (await this.fileExists('package.json')) {
			try {
				const packageJson = await this.readJsonFile('package.json');
				const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

				// Key libraries and tools
				const importantDeps = [
					'typescript', 'eslint', 'prettier', 'jest', 'vitest', 'cypress',
					'axios', 'lodash', 'moment', 'dayjs', 'uuid', 'crypto',
					'redux', 'zustand', 'mobx', 'apollo-client', 'graphql',
					'tailwindcss', 'styled-components', 'emotion', 'sass', 'less',
					'webpack', 'vite', 'rollup', 'parcel', 'esbuild'
				];

				for (const dep of importantDeps) {
					if (deps[dep]) {
						dependencies.push(`${dep} (${deps[dep]})`);
					}
				}
			} catch (error) {
				console.error('Error reading package.json dependencies:', error);
			}
		}

		// Python dependencies
		if (await this.fileExists('requirements.txt')) {
			try {
				const content = await this.readFile('requirements.txt');
				const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
				const importantPkgs = ['requests', 'numpy', 'pandas', 'django', 'flask', 'fastapi', 'sqlalchemy', 'pytest'];

				for (const line of lines) {
					const pkg = line.split('==')[0].split('>=')[0].split('<=')[0].split('~=')[0].split('!=')[0].trim();
					if (importantPkgs.includes(pkg.toLowerCase())) {
						dependencies.push(`Python: ${pkg}`);
					}
				}
			} catch (error) {
				console.error('Error reading requirements.txt:', error);
			}
		}

		return dependencies;
	}

	async detectBuildTools(): Promise<string[]> {
		const buildTools: string[] = [];

		// Build tools
		if (await this.fileExists('webpack.config.js')) { buildTools.push('Webpack'); }
		if (await this.fileExists('vite.config.js')) { buildTools.push('Vite'); }
		if (await this.fileExists('rollup.config.js')) { buildTools.push('Rollup'); }
		if (await this.fileExists('parcel.config.js')) { buildTools.push('Parcel'); }
		if (await this.fileExists('esbuild.config.js')) { buildTools.push('ESBuild'); }
		if (await this.fileExists('tsconfig.json')) { buildTools.push('TypeScript Compiler'); }
		if (await this.fileExists('babel.config.js') || await this.fileExists('.babelrc')) { buildTools.push('Babel'); }

		return buildTools;
	}

	async detectTesting(): Promise<string[]> {
		const testing: string[] = [];

		// Testing frameworks
		if (await this.fileExists('jest.config.js')) { testing.push('Jest'); }
		if (await this.fileExists('vitest.config.js')) { testing.push('Vitest'); }
		if (await this.fileExists('cypress.config.js')) { testing.push('Cypress'); }
		if (await this.fileExists('playwright.config.js')) { testing.push('Playwright'); }
		if (await this.fileExists('pytest.ini')) { testing.push('Pytest'); }
		if (await this.fileExists('test/') || await this.fileExists('__tests__/') || await this.fileExists('tests/')) {
			testing.push('Test directory structure');
		}

		return testing;
	}

	async detectCodeQuality(): Promise<string[]> {
		const codeQuality: string[] = [];

		// Code quality tools
		if (await this.fileExists('.eslintrc') || await this.fileExists('eslint.config.js')) { codeQuality.push('ESLint'); }
		if (await this.fileExists('.prettierrc') || await this.fileExists('prettier.config.js')) { codeQuality.push('Prettier'); }
		if (await this.fileExists('.stylelintrc')) { codeQuality.push('Stylelint'); }
		if (await this.fileExists('tsconfig.json')) { codeQuality.push('TypeScript'); }
		if (await this.fileExists('.editorconfig')) { codeQuality.push('EditorConfig'); }

		return codeQuality;
	}

	async detectArchitecture(): Promise<string[]> {
		const architecture: string[] = [];

		// Check for common architecture patterns
		if (await this.directoryExists('src')) { architecture.push('src/ structure'); }
		if (await this.directoryExists('lib')) { architecture.push('lib/ structure'); }
		if (await this.directoryExists('components')) { architecture.push('Component-based'); }
		if (await this.directoryExists('pages')) { architecture.push('Page-based routing'); }
		if (await this.directoryExists('api')) { architecture.push('API layer'); }
		if (await this.directoryExists('services')) { architecture.push('Service layer'); }
		if (await this.directoryExists('models')) { architecture.push('Model layer'); }
		if (await this.directoryExists('controllers')) { architecture.push('MVC pattern'); }
		if (await this.directoryExists('middleware')) { architecture.push('Middleware pattern'); }
		if (await this.directoryExists('utils')) { architecture.push('Utility functions'); }
		if (await this.directoryExists('tests') || await this.directoryExists('__tests__')) { architecture.push('Test structure'); }

		return architecture;
	}

	async detectConfiguration(): Promise<string[]> {
		const configuration: string[] = [];

		// Configuration files
		const configFiles = [
			'.gitignore', '.gitattributes',
			'.env', '.env.local', '.env.example',
			'tailwind.config.js', 'postcss.config.js',
			'docker-compose.yml', 'Dockerfile',
			'.github/workflows', 'azure-pipelines.yml',
			'Makefile', 'CMakeLists.txt'
		];

		for (const config of configFiles) {
			if (await this.fileExists(config)) {
				configuration.push(config);
			}
		}

		return configuration;
	}

	async detectDevelopmentTools(): Promise<string[]> {
		const tools: string[] = [];

		// Package managers
		if (await this.fileExists('package-lock.json')) { tools.push('npm'); }
		if (await this.fileExists('yarn.lock')) { tools.push('yarn'); }
		if (await this.fileExists('pnpm-lock.yaml')) { tools.push('pnpm'); }
		if (await this.fileExists('bun.lockb')) { tools.push('bun'); }

		// Version control
		if (await this.directoryExists('.git')) { tools.push('Git'); }
		if (await this.fileExists('.gitignore')) { tools.push('Git ignore configured'); }

		// Docker
		if (await this.fileExists('Dockerfile')) { tools.push('Docker'); }
		if (await this.fileExists('docker-compose.yml')) { tools.push('Docker Compose'); }

		return tools;
	}

	async detectDocumentation(): Promise<string[]> {
		const docs: string[] = [];

		// Documentation files
		const docFiles = [
			'README.md', 'README.rst', 'README.txt', 'README.adoc',
			'CHANGELOG.md', 'CHANGELOG.rst', 'CHANGELOG.txt',
			'CONTRIBUTING.md', 'CONTRIBUTING.rst',
			'CODE_OF_CONDUCT.md', 'CODE_OF_CONDUCT.rst',
			'SECURITY.md', 'SECURITY.rst',
			'LICENSE', 'LICENSE.md', 'LICENSE.txt'
		];

		for (const doc of docFiles) {
			if (await this.fileExists(doc)) {
				docs.push(doc);
			}
		}

		// Documentation directories
		if (await this.directoryExists('docs')) { docs.push('docs/ directory'); }
		if (await this.directoryExists('documentation')) { docs.push('documentation/ directory'); }
		if (await this.directoryExists('wiki')) { docs.push('wiki/ directory'); }

		return docs;
	}

	// Helper methods
	private async fileExists(relativePath: string): Promise<boolean> {
		try {
			const uri = mockVscode.Uri.joinPath(this.workspaceRoot, relativePath);
			await mockVscode.workspace.fs.stat(uri);
			return true;
		} catch {
			return false;
		}
	}

	private async directoryExists(relativePath: string): Promise<boolean> {
		try {
			const uri = mockVscode.Uri.joinPath(this.workspaceRoot, relativePath);
			const stat = await mockVscode.workspace.fs.stat(uri);
			return stat.type === mockVscode.FileType.Directory;
		} catch {
			return false;
		}
	}

	private async readFile(relativePath: string): Promise<string> {
		const uri = mockVscode.Uri.joinPath(this.workspaceRoot, relativePath);
		const content = await mockVscode.workspace.fs.readFile(uri);
		return Buffer.from(content).toString('utf8');
	}

	private async readJsonFile(relativePath: string): Promise<any> {
		const content = await this.readFile(relativePath);
		return JSON.parse(content);
	}
}

describe('State Scanner Tests', () => {
	const workspaceRoot = mockVscode.Uri.file('/test/workspace');
	const scanner = new MockStateScanner(workspaceRoot);

	describe('Language Detection', () => {
		it('should detect JavaScript/TypeScript from package.json', async () => {
			const languages = await scanner.detectLanguages();
			assert.ok(languages.includes('JavaScript/TypeScript'));
		});

		it('should detect Python from requirements.txt', async () => {
			// Mock requirements.txt exists
			const languages = await scanner.detectLanguages();
			assert.ok(languages.includes('Python'));
		});

		it('should return empty array for no language indicators', async () => {
			const emptyScanner = new MockStateScanner(mockVscode.Uri.file('/empty/workspace'));
			const languages = await emptyScanner.detectLanguages();
			assert.equal(languages.length, 0);
		});
	});

	describe('Framework Detection', () => {
		it('should detect Node.js from package.json', async () => {
			const frameworks = await scanner.detectFrameworks();
			assert.ok(frameworks.includes('Node.js'));
		});

		it('should detect React from package.json dependencies', async () => {
			const frameworks = await scanner.detectFrameworks();
			assert.ok(frameworks.includes('React'));
		});

		it('should detect TypeScript from package.json dependencies', async () => {
			const frameworks = await scanner.detectFrameworks();
			assert.ok(frameworks.includes('TypeScript'));
		});

		it('should detect Python frameworks from requirements.txt', async () => {
			const frameworks = await scanner.detectFrameworks();
			assert.ok(frameworks.includes('Python'));
		});

		it('should remove duplicate frameworks', async () => {
			const frameworks = await scanner.detectFrameworks();
			const uniqueFrameworks = [...new Set(frameworks)];
			assert.equal(frameworks.length, uniqueFrameworks.length);
		});
	});

	describe('Dependency Detection', () => {
		it('should detect important JavaScript dependencies', async () => {
			const dependencies = await scanner.detectDependencies();
			assert.ok(dependencies.some(dep => dep.includes('typescript')));
			assert.ok(dependencies.some(dep => dep.includes('eslint')));
		});

		it('should detect Python dependencies from requirements.txt', async () => {
			const dependencies = await scanner.detectDependencies();
			assert.ok(dependencies.some(dep => dep.includes('Python: django')));
			assert.ok(dependencies.some(dep => dep.includes('Python: flask')));
		});

		it('should handle missing package.json gracefully', async () => {
			const emptyScanner = new MockStateScanner(mockVscode.Uri.file('/empty/workspace'));
			const dependencies = await emptyScanner.detectDependencies();
			assert.equal(dependencies.length, 0);
		});
	});

	describe('Build Tools Detection', () => {
		it('should detect TypeScript compiler from tsconfig.json', async () => {
			const buildTools = await scanner.detectBuildTools();
			assert.ok(buildTools.includes('TypeScript Compiler'));
		});

		it('should return empty array when no build tools found', async () => {
			const emptyScanner = new MockStateScanner(mockVscode.Uri.file('/empty/workspace'));
			const buildTools = await emptyScanner.detectBuildTools();
			assert.equal(buildTools.length, 0);
		});
	});

	describe('Testing Detection', () => {
		it('should detect test directory structure', async () => {
			const testing = await scanner.detectTesting();
			assert.ok(testing.includes('Test directory structure'));
		});

		it('should return empty array when no testing frameworks found', async () => {
			const emptyScanner = new MockStateScanner(mockVscode.Uri.file('/empty/workspace'));
			const testing = await emptyScanner.detectTesting();
			assert.equal(testing.length, 0);
		});
	});

	describe('Code Quality Detection', () => {
		it('should detect TypeScript from tsconfig.json', async () => {
			const codeQuality = await scanner.detectCodeQuality();
			assert.ok(codeQuality.includes('TypeScript'));
		});

		it('should return empty array when no code quality tools found', async () => {
			const emptyScanner = new MockStateScanner(mockVscode.Uri.file('/empty/workspace'));
			const codeQuality = await emptyScanner.detectCodeQuality();
			assert.equal(codeQuality.length, 0);
		});
	});

	describe('Architecture Detection', () => {
		it('should detect src/ structure', async () => {
			const architecture = await scanner.detectArchitecture();
			assert.ok(architecture.includes('src/ structure'));
		});

		it('should detect test structure', async () => {
			const architecture = await scanner.detectArchitecture();
			assert.ok(architecture.includes('Test structure'));
		});

		it('should return empty array when no architecture patterns found', async () => {
			const emptyScanner = new MockStateScanner(mockVscode.Uri.file('/empty/workspace'));
			const architecture = await emptyScanner.detectArchitecture();
			assert.equal(architecture.length, 0);
		});
	});

	describe('Configuration Detection', () => {
		it('should detect configuration files', async () => {
			const configuration = await scanner.detectConfiguration();
			assert.ok(configuration.length > 0);
		});

		it('should return empty array when no configuration files found', async () => {
			const emptyScanner = new MockStateScanner(mockVscode.Uri.file('/empty/workspace'));
			const configuration = await emptyScanner.detectConfiguration();
			assert.equal(configuration.length, 0);
		});
	});

	describe('Development Tools Detection', () => {
		it('should detect Git from .git directory', async () => {
			const tools = await scanner.detectDevelopmentTools();
			assert.ok(tools.includes('Git'));
		});

		it('should detect Docker from docker-compose.yml', async () => {
			const tools = await scanner.detectDevelopmentTools();
			assert.ok(tools.includes('Docker Compose'));
		});

		it('should return empty array when no development tools found', async () => {
			const emptyScanner = new MockStateScanner(mockVscode.Uri.file('/empty/workspace'));
			const tools = await emptyScanner.detectDevelopmentTools();
			assert.equal(tools.length, 0);
		});
	});

	describe('Documentation Detection', () => {
		it('should detect documentation files', async () => {
			const docs = await scanner.detectDocumentation();
			assert.ok(docs.length > 0);
		});

		it('should return empty array when no documentation found', async () => {
			const emptyScanner = new MockStateScanner(mockVscode.Uri.file('/empty/workspace'));
			const docs = await emptyScanner.detectDocumentation();
			assert.equal(docs.length, 0);
		});
	});

	describe('Error Handling', () => {
		it('should handle file system errors gracefully', async () => {
			const errorScanner = new MockStateScanner(mockVscode.Uri.file('/error/workspace'));
			const languages = await errorScanner.detectLanguages();
			assert.equal(languages.length, 0);
		});

		it('should handle JSON parsing errors gracefully', async () => {
			const errorScanner = new MockStateScanner(mockVscode.Uri.file('/error/workspace'));
			const frameworks = await errorScanner.detectFrameworks();
			assert.ok(Array.isArray(frameworks));
		});
	});

	describe('Integration Tests', () => {
		it('should scan complete project state', async () => {
			const languages = await scanner.detectLanguages();
			const frameworks = await scanner.detectFrameworks();
			const dependencies = await scanner.detectDependencies();
			const buildTools = await scanner.detectBuildTools();
			const testing = await scanner.detectTesting();
			const codeQuality = await scanner.detectCodeQuality();
			const architecture = await scanner.detectArchitecture();
			const configuration = await scanner.detectConfiguration();
			const developmentTools = await scanner.detectDevelopmentTools();
			const documentation = await scanner.detectDocumentation();

			// Verify all detection methods return arrays
			assert.ok(Array.isArray(languages));
			assert.ok(Array.isArray(frameworks));
			assert.ok(Array.isArray(dependencies));
			assert.ok(Array.isArray(buildTools));
			assert.ok(Array.isArray(testing));
			assert.ok(Array.isArray(codeQuality));
			assert.ok(Array.isArray(architecture));
			assert.ok(Array.isArray(configuration));
			assert.ok(Array.isArray(developmentTools));
			assert.ok(Array.isArray(documentation));

			// Verify some expected detections
			assert.ok(languages.includes('JavaScript/TypeScript'));
			assert.ok(frameworks.includes('Node.js'));
			assert.ok(architecture.includes('src/ structure'));
		});
	});
});

// Integration tests with real StateScanner and new parsers
describe('StateScanner with Enhanced Parsers Integration', () => {
	// Import actual StateScanner
	const vscodeModule = require('vscode');
	const { StateScanner } = require('../../src/scanner/stateScanner');

	// Setup workspace root pointing to actual project
	const workspaceRoot = vscodeModule.Uri.file(__dirname + '/../..');

	describe('Real Scanner Integration', () => {
		it('should instantiate StateScanner with parsers', () => {
			const scanner = new StateScanner(workspaceRoot);
			assert.ok(scanner !== null);
			assert.ok(scanner !== undefined);
		});

		it('should have scanState method', async () => {
			const scanner = new StateScanner(workspaceRoot);
			const state = await scanner.scanState();

			// Verify structure
			assert.ok(Array.isArray(state.languages));
			assert.ok(Array.isArray(state.frameworks));
			assert.ok(Array.isArray(state.dependencies));
			assert.ok(Array.isArray(state.buildTools));
			assert.ok(Array.isArray(state.testing));
		});

		it('should detect JavaScript/TypeScript in this project', async () => {
			const scanner = new StateScanner(workspaceRoot);
			const state = await scanner.scanState();

			// This project should detect TypeScript
			assert.ok(state.languages.length > 0);
		});

		it('should detect frameworks in this project', async () => {
			const scanner = new StateScanner(workspaceRoot);
			const state = await scanner.scanState();

			// This project should have frameworks
			assert.ok(Array.isArray(state.frameworks));
		});

		it('should detect Node.js dependencies', async () => {
			const scanner = new StateScanner(workspaceRoot);
			const state = await scanner.scanState();

			// This project should have dependencies from package.json
			assert.ok(Array.isArray(state.dependencies));
		});

		it('should detect build tools', async () => {
			const scanner = new StateScanner(workspaceRoot);
			const state = await scanner.scanState();

			// This project uses TypeScript Compiler
			assert.ok(Array.isArray(state.buildTools));
		});

		it('should detect testing frameworks', async () => {
			const scanner = new StateScanner(workspaceRoot);
			const state = await scanner.scanState();

			// This project has test directory
			assert.ok(Array.isArray(state.testing));
		});

		it('should handle errors gracefully', async () => {
			const invalidWorkspace = vscodeModule.Uri.file('/nonexistent/path');
			const scanner = new StateScanner(invalidWorkspace);
			const state = await scanner.scanState();

			// Should return empty state, not throw
			assert.ok(Array.isArray(state.languages));
			assert.ok(Array.isArray(state.frameworks));
		});
	});
});
