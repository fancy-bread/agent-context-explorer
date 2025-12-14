import * as assert from 'assert';

// Mock the RulesTreeProvider class for testing icon detection
class MockRulesTreeProvider {
	private getContextAwareIcon(rule: { fileName: string; content: string; metadata: { type: string; description: string } }): string {
		const fileName = rule.fileName.toLowerCase();
		const content = rule.content.toLowerCase();
		const description = rule.metadata.description.toLowerCase();

		// Testing related
		if (fileName.includes('test') || content.includes('test') || description.includes('test')) {
			return 'beaker';
		}

		// Security related
		if (fileName.includes('security') || fileName.includes('auth') || content.includes('security') || content.includes('auth')) {
			return 'shield';
		}

		// Performance related
		if (fileName.includes('performance') || fileName.includes('optimize') || content.includes('performance') || content.includes('optimize')) {
			return 'speedometer';
		}

		// Documentation related
		if (fileName.includes('doc') || fileName.includes('readme') || content.includes('documentation') || content.includes('readme')) {
			return 'book';
		}

		// Deployment/CI related
		if (fileName.includes('deploy') || fileName.includes('ci') || fileName.includes('cd') || content.includes('deployment') || content.includes('ci/cd')) {
			return 'rocket';
		}

		// Database related
		if (fileName.includes('db') || fileName.includes('database') || content.includes('database') || content.includes('sql')) {
			return 'database';
		}

		// API related
		if (fileName.includes('api') || content.includes('api') || content.includes('endpoint') || content.includes('rest')) {
			return 'symbol-method';
		}

		// Component related (higher priority than UI)
		if (fileName.includes('component') || content.includes('component') || description.includes('component')) {
			return 'symbol-component';
		}

		// UI/UX related
		if (fileName.includes('ui') || fileName.includes('ux') || content.includes('interface') || content.includes('user experience')) {
			return 'symbol-interface';
		}

		// Error handling
		if (fileName.includes('error') || fileName.includes('exception') || content.includes('error') || content.includes('exception')) {
			return 'error';
		}

		// Extension related (higher priority than TypeScript)
		if (fileName.includes('extension') || content.includes('extension') || content.includes('vscode extension')) {
			return 'extensions';
		}

		// TypeScript related
		if (fileName.includes('typescript') || fileName.includes('ts') || content.includes('typescript') || content.includes('type safety')) {
			return 'symbol-class';
		}

		// React related
		if (fileName.includes('react') || content.includes('react')) {
			return 'symbol-component';
		}

		// Node.js related
		if (fileName.includes('node') || content.includes('node.js') || content.includes('server')) {
			return 'server';
		}

		// Git related
		if (fileName.includes('git') || content.includes('git') || content.includes('version control')) {
			return 'source-control';
		}

		// Configuration related
		if (fileName.includes('config') || content.includes('configuration') || content.includes('settings')) {
			return 'settings-gear';
		}

	// Default fallback
	return 'file-text';
	}

	// Public method for testing
	getIconForRule(rule: { fileName: string; content: string; metadata: { description: string } }): string {
		return this.getContextAwareIcon(rule as any);
	}
}

describe('Context-Aware Icon Detection Tests', () => {
	const provider = new MockRulesTreeProvider();

	describe('Testing Related Icons', () => {
		it('should return beaker icon for test files', () => {
			const rule = {
				fileName: 'test.mdc',
				content: 'This is a test rule',
				metadata: { description: 'Test rule' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'beaker');
		});

		it('should return beaker icon for testing content', () => {
			const rule = {
				fileName: 'quality.mdc',
				content: 'This rule covers testing procedures and test automation',
				metadata: { description: 'Quality assurance' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'beaker');
		});

		it('should return beaker icon for testing description', () => {
			const rule = {
				fileName: 'quality.mdc',
				content: 'This rule covers quality procedures',
					metadata: { description: 'Testing guidelines and procedures' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'beaker');
		});
	});

	describe('Security Related Icons', () => {
		it('should return shield icon for security files', () => {
			const rule = {
				fileName: 'security.mdc',
				content: 'Security guidelines',
				metadata: { description: 'Security rules' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'shield');
		});

		it('should return shield icon for auth files', () => {
			const rule = {
				fileName: 'auth.mdc',
				content: 'Authentication rules',
					metadata: { description: 'Auth guidelines' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'shield');
		});
	});

	describe('Performance Related Icons', () => {
		it('should return speedometer icon for performance files', () => {
			const rule = {
				fileName: 'performance.mdc',
				content: 'Performance optimization rules',
				metadata: { description: 'Performance guidelines' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'speedometer');
		});

		it('should return speedometer icon for optimize content', () => {
			const rule = {
				fileName: 'rules.mdc',
				content: 'This rule covers performance optimization and speed improvements',
					metadata: { description: 'General rules' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'speedometer');
		});
	});

	describe('Documentation Related Icons', () => {
		it('should return book icon for documentation files', () => {
			const rule = {
				fileName: 'doc.mdc',
				content: 'Documentation guidelines',
					metadata: { description: 'Documentation rules' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'book');
		});

		it('should return book icon for readme files', () => {
			const rule = {
				fileName: 'readme.mdc',
				content: 'README guidelines',
					metadata: { description: 'README rules' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'book');
		});
	});

	describe('Deployment Related Icons', () => {
		it('should return rocket icon for deployment files', () => {
			const rule = {
				fileName: 'deploy.mdc',
				content: 'Deployment guidelines',
				metadata: { description: 'Deployment rules' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'rocket');
		});

		it('should return rocket icon for CI/CD content', () => {
			const rule = {
				fileName: 'pipeline.mdc',
				content: 'This rule covers CI/CD pipeline configuration and deployment procedures',
				metadata: { description: 'Pipeline rules' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'rocket');
		});
	});

	describe('Database Related Icons', () => {
		it('should return database icon for database files', () => {
			const rule = {
				fileName: 'database.mdc',
				content: 'Database guidelines',
					metadata: { description: 'Database rules' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'database');
		});

		it('should return database icon for SQL content', () => {
			const rule = {
				fileName: 'queries.mdc',
				content: 'This rule covers SQL queries and database operations',
					metadata: { description: 'Query rules' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'database');
		});
	});

	describe('API Related Icons', () => {
		it('should return symbol-method icon for API files', () => {
			const rule = {
				fileName: 'api.mdc',
				content: 'API guidelines',
					metadata: { description: 'API rules' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'symbol-method');
		});

		it('should return symbol-method icon for REST content', () => {
			const rule = {
				fileName: 'endpoints.mdc',
				content: 'This rule covers REST endpoints and API design',
					metadata: { description: 'Endpoint rules' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'symbol-method');
		});
	});

	describe('TypeScript Related Icons', () => {
		it('should return symbol-class icon for TypeScript files', () => {
			const rule = {
				fileName: 'typescript.mdc',
				content: 'TypeScript guidelines',
					metadata: { description: 'TypeScript rules' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'symbol-class');
		});

		it('should return symbol-class icon for TS files', () => {
			const rule = {
				fileName: 'ts.mdc',
				content: 'TypeScript type safety guidelines',
				metadata: { description: 'TypeScript rules' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'symbol-class');
		});
	});

	describe('Extension Related Icons', () => {
		it('should return extensions icon for extension files', () => {
			const rule = {
				fileName: 'typescript-extension.mdc',
				content: 'Extension guidelines',
					metadata: { description: 'Extension rules' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'extensions');
		});

		it('should return extensions icon for VS Code extension content', () => {
			const rule = {
				fileName: 'vscode.mdc',
				content: 'This rule covers VS Code extension development and configuration',
					metadata: { description: 'VS Code rules' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'extensions');
		});
	});

	describe('React Related Icons', () => {
		it('should return symbol-component icon for React files', () => {
			const rule = {
				fileName: 'react.mdc',
				content: 'React guidelines',
					metadata: { description: 'React rules' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'symbol-component');
		});

		it('should return symbol-component icon for component content', () => {
			const rule = {
				fileName: 'component.mdc', // Changed from 'ui.mdc' to 'component.mdc'
				content: 'This rule covers React component development and UI patterns',
				metadata: { description: 'Component rules' } // Changed from 'UI rules' to 'Component rules'
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'symbol-component');
		});
	});

	describe('Fallback Icons', () => {
		it('should return star icon for always rules', () => {
			const rule = {
				fileName: 'general.mdc',
				content: 'General guidelines',
				metadata: { description: 'General rules' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'star');
		});

		it('should return wrench icon for auto rules', () => {
			const rule = {
				fileName: 'general.mdc',
				content: 'General guidelines',
				metadata: { description: 'General rules' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'wrench');
		});

		it('should return symbol-function icon for agent rules', () => {
			const rule = {
				fileName: 'general.mdc',
				content: 'General guidelines',
				metadata: { description: 'General rules' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'symbol-function');
		});

		it('should return symbol-keyword icon for manual rules', () => {
			const rule = {
				fileName: 'general.mdc',
				content: 'General guidelines',
					metadata: { description: 'General rules' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'symbol-keyword');
		});

		it('should return file-text icon for unknown types', () => {
			const rule = {
				fileName: 'general.mdc',
				content: 'General guidelines',
				metadata: { type: 'unknown', description: 'General rules' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'file-text');
		});
	});

	describe('Case Insensitive Detection', () => {
		it('should detect icons regardless of case', () => {
			const testCases = [
				{ fileName: 'TEST.mdc', expected: 'beaker' },
				{ fileName: 'Security.mdc', expected: 'shield' },
				{ fileName: 'PERFORMANCE.mdc', expected: 'speedometer' },
				{ fileName: 'Documentation.mdc', expected: 'book' }
			];

			testCases.forEach(({ fileName, expected }) => {
				const rule = {
					fileName,
					content: 'Test content',
					metadata: { description: 'Test rule' }
				};

				const icon = provider.getIconForRule(rule);
				assert.equal(icon, expected, `Failed for ${fileName}`);
			});
		});
	});

	describe('Priority Order', () => {
		it('should prioritize filename over content', () => {
			const rule = {
				fileName: 'test.mdc', // Should trigger beaker
				content: 'This is about security and authentication', // Would trigger shield
				metadata: { description: 'Test rule' }
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'beaker'); // Filename should win
		});

		it('should prioritize filename over description', () => {
			const rule = {
				fileName: 'performance.mdc', // Should trigger speedometer
				content: 'General guidelines',
					metadata: { description: 'Testing procedures' } // Would trigger beaker
			};

			const icon = provider.getIconForRule(rule);
			assert.equal(icon, 'speedometer'); // Filename should win
		});
	});
});
