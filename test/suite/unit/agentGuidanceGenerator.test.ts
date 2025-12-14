// Unit tests for AgentGuidanceGenerator
import * as assert from 'assert';
import { AgentGuidanceGenerator } from '../../../src/scanner/enhanced/agentGuidanceGenerator';

describe('AgentGuidanceGenerator', () => {
	let generator: AgentGuidanceGenerator;

	before(() => {
		generator = new AgentGuidanceGenerator();
	});

	it('should generate guidance for VS Code extension', () => {
		const state = {
			identity: {
				projectType: 'vscode-extension',
				domain: 'developer-tools',
				primaryLanguage: 'TypeScript',
				maturityLevel: 'active-development'
			},
			capabilities: {
				description: 'Test extension',
				primaryFeatures: ['Feature 1'],
				dataFormats: ['JSON']
			},
			architecture: {
				style: 'layered',
				organization: 'src-based',
				patterns: ['Provider Pattern'],
				entryPoints: ['src/extension.ts']
			},
			dependencies: {
				byPurpose: {
					parsing: [],
					testing: [],
					build: [],
					platform: [],
					'code-quality': [],
					utility: [],
					http: [],
					framework: []
				},
				criticalPath: [],
				devOnly: []
			}
		};

		const guidance = generator.generate(state);

		assert.ok(guidance, 'should generate guidance');
		assert.ok(guidance.suggestedApproach.includes('VS Code'),
			'Approach should mention VS Code');
	});

	it('should generate guidance for web app', () => {
		const state = {
			identity: {
				projectType: 'web-app',
				domain: 'frontend-applications',
				primaryLanguage: 'TypeScript',
				maturityLevel: 'production'
			}
		};

		const guidance = generator.generate(state);

		assert.ok(guidance.suggestedApproach.includes('web application'),
			'Approach should mention web application');
		assert.ok(guidance.suggestedApproach.includes('component reusability') ||
		          guidance.suggestedApproach.includes('state management'),
			'should mention web app concerns');
	});

	it('should generate guidance for library', () => {
		const state = {
			identity: {
				projectType: 'library',
				domain: 'libraries',
				primaryLanguage: 'TypeScript',
				maturityLevel: 'stable'
			}
		};

		const guidance = generator.generate(state);

		assert.ok(guidance.suggestedApproach.includes('library'),
			'Approach should mention library');
		assert.ok(guidance.suggestedApproach.includes('backwards compatibility'),
			'should mention backwards compatibility');
	});

	it('should generate guidance for CLI tool', () => {
		const state = {
			identity: {
				projectType: 'cli-tool',
				domain: 'cli-tools',
				primaryLanguage: 'JavaScript',
				maturityLevel: 'beta'
			}
		};

		const guidance = generator.generate(state);

		assert.ok(guidance.suggestedApproach.includes('CLI'),
			'Approach should mention CLI');
		assert.ok(guidance.suggestedApproach.includes('error messages') ||
		          guidance.suggestedApproach.includes('exit codes'),
			'should mention CLI concerns');
	});

	it('should identify critical files', () => {
		const state = {
			identity: {
				projectType: 'vscode-extension',
				domain: 'developer-tools',
				primaryLanguage: 'TypeScript',
				maturityLevel: 'production'
			},
			architecture: {
				style: 'layered',
				organization: 'src-based',
				patterns: [],
				entryPoints: ['src/extension.ts', 'src/index.ts']
			}
		};

		const guidance = generator.generate(state);

		assert.ok(Array.isArray(guidance.criticalFiles), 'criticalFiles should be array');
		assert.ok(guidance.criticalFiles.includes('package.json'),
			'should include package.json');
		assert.ok(guidance.criticalFiles.some(f => f.includes('src/')),
			'should include entry points');
	});

	it('should suggest common tasks', () => {
		const state = {
			identity: {
				projectType: 'vscode-extension',
				domain: 'developer-tools',
				primaryLanguage: 'TypeScript',
				maturityLevel: 'active-development'
			},
			dependencies: {
				byPurpose: {
					parsing: [],
					testing: [{ name: 'mocha', version: '10.0.0', purpose: 'Test runner', critical: false }],
					build: [],
					platform: [],
					'code-quality': [],
					utility: [],
					http: [],
					framework: []
				},
				criticalPath: [],
				devOnly: []
			}
		};

		const guidance = generator.generate(state);

		assert.ok(Array.isArray(guidance.commonTasks), 'commonTasks should be array');
		assert.ok(guidance.commonTasks.length > 0, 'should have common tasks');

		// VS Code extension should have relevant tasks
		const hasRelevantTask = guidance.commonTasks.some(task =>
			task.includes('command') || task.includes('view') || task.includes('test')
		);
		assert.ok(hasRelevantTask, 'should have relevant tasks for VS Code extension');
	});

	it('should provide watch-outs for VS Code extensions', () => {
		const state = {
			identity: {
				projectType: 'vscode-extension',
				domain: 'developer-tools',
				primaryLanguage: 'TypeScript',
				maturityLevel: 'active-development'
			}
		};

		const guidance = generator.generate(state);

		assert.ok(Array.isArray(guidance.watchOuts), 'watchOuts should be array');
		assert.ok(guidance.watchOuts.length > 0, 'should have watch-outs');

		// should include VS Code-specific warnings
		const hasVSCodeWarning = guidance.watchOuts.some(warning =>
			warning.includes('dispose') ||
			warning.includes('vscode.workspace.fs') ||
			warning.includes('workspace')
		);
		assert.ok(hasVSCodeWarning, 'should have VS Code-specific warnings');
	});

	it('should warn about production projects', () => {
		const state = {
			identity: {
				projectType: 'library',
				domain: 'libraries',
				primaryLanguage: 'TypeScript',
				maturityLevel: 'production'
			}
		};

		const guidance = generator.generate(state);

		// should warn about backwards compatibility
		const hasBackwardsCompatWarning = guidance.watchOuts.some(warning =>
			warning.includes('production') || warning.includes('backwards compatibility')
		);
		assert.ok(hasBackwardsCompatWarning,
			'should warn about backwards compatibility for production projects');
	});

	it('should include critical dependency warnings', () => {
		const state = {
			identity: {
				projectType: 'web-app',
				domain: 'frontend-applications',
				primaryLanguage: 'TypeScript',
				maturityLevel: 'active-development'
			},
			dependencies: {
				byPurpose: {
					parsing: [],
					testing: [],
					build: [],
					platform: [],
					'code-quality': [],
					utility: [],
					http: [],
					framework: []
				},
				criticalPath: ['react', 'axios', 'redux'],
				devOnly: []
			}
		};

		const guidance = generator.generate(state);

		// should mention critical dependencies
		const hasCriticalDepsWarning = guidance.watchOuts.some(warning =>
			warning.includes('Critical dependencies') || warning.includes('critical')
		);
		assert.ok(hasCriticalDepsWarning,
			'should warn about critical dependencies');
	});

	it('should generate complete guidance structure', () => {
		const state = {
			identity: {
				projectType: 'application',
				domain: 'general',
				primaryLanguage: 'JavaScript',
				maturityLevel: 'prototype'
			}
		};

		const guidance = generator.generate(state);

		// Verify complete structure
		assert.ok(typeof guidance.suggestedApproach === 'string',
			'suggestedApproach should be string');
		assert.ok(guidance.suggestedApproach.length > 0,
			'suggestedApproach should not be empty');
		assert.ok(Array.isArray(guidance.criticalFiles),
			'criticalFiles should be array');
		assert.ok(Array.isArray(guidance.commonTasks),
			'commonTasks should be array');
		assert.ok(Array.isArray(guidance.watchOuts),
			'watchOuts should be array');
	});

	it('should handle minimal state gracefully', () => {
		const state = {}; // Empty state

		const guidance = generator.generate(state);

		// should still generate valid guidance
		assert.ok(guidance, 'should generate guidance even with minimal state');
		assert.ok(guidance.suggestedApproach, 'should have suggested approach');
		assert.ok(Array.isArray(guidance.criticalFiles), 'should have criticalFiles array');
		assert.ok(Array.isArray(guidance.commonTasks), 'should have commonTasks array');
		assert.ok(Array.isArray(guidance.watchOuts), 'should have watchOuts array');
	});
});

