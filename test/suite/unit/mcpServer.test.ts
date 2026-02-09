import * as assert from 'assert';

// =============================================================================
// Mock Implementation of MCP Server Scanning Functions
// These are pure functions that mirror the server.ts implementation
// for unit testing without the full MCP SDK
// =============================================================================

interface RuleInfo {
	name: string;
	description: string;
	type: 'always' | 'glob' | 'manual';
	path: string;
	globs?: string[];
}

interface CommandInfo {
	name: string;
	description: string;
	path: string;
	location: 'workspace' | 'global';
}

interface SkillInfo {
	name: string;
	title?: string;
	overview?: string;
	path: string;
	location: 'workspace' | 'global';
}

interface SpecInfo {
	domain: string;
	path: string;
	hasBlueprint: boolean;
	hasContract: boolean;
}

interface SchemaInfo {
	name: string;
	path: string;
	schemaId?: string;
}

interface AgentsMdResult {
	exists: boolean;
	content?: string;
	path?: string;
}

// =============================================================================
// Mock File System
// =============================================================================

interface MockFileEntry {
	name: string;
	isFile: boolean;
	isDirectory: boolean;
	content?: string;
}

class MockFileSystem {
	private files: Map<string, string> = new Map();
	private directories: Set<string> = new Set();

	addFile(path: string, content: string): void {
		this.files.set(path, content);
		// Add parent directories
		const parts = path.split('/');
		for (let i = 1; i < parts.length; i++) {
			this.directories.add(parts.slice(0, i).join('/'));
		}
	}

	addDirectory(path: string): void {
		this.directories.add(path);
	}

	async readFile(path: string): Promise<string> {
		if (this.files.has(path)) {
			return this.files.get(path)!;
		}
		throw new Error(`ENOENT: no such file or directory, open '${path}'`);
	}

	async readdir(path: string): Promise<MockFileEntry[]> {
		if (!this.directories.has(path)) {
			throw new Error(`ENOENT: no such file or directory, scandir '${path}'`);
		}

		const entries: MockFileEntry[] = [];
		const prefix = path + '/';

		// Find immediate children
		for (const filePath of this.files.keys()) {
			if (filePath.startsWith(prefix)) {
				const remaining = filePath.substring(prefix.length);
				if (!remaining.includes('/')) {
					entries.push({
						name: remaining,
						isFile: true,
						isDirectory: false,
						content: this.files.get(filePath)
					});
				}
			}
		}

		for (const dirPath of this.directories) {
			if (dirPath.startsWith(prefix)) {
				const remaining = dirPath.substring(prefix.length);
				if (!remaining.includes('/') && remaining.length > 0) {
					if (!entries.find(e => e.name === remaining)) {
						entries.push({
							name: remaining,
							isFile: false,
							isDirectory: true
						});
					}
				}
			}
		}

		return entries;
	}

	async access(path: string): Promise<void> {
		if (!this.files.has(path) && !this.directories.has(path)) {
			throw new Error(`ENOENT: no such file or directory, access '${path}'`);
		}
	}

	clear(): void {
		this.files.clear();
		this.directories.clear();
	}
}

// =============================================================================
// Scanner Functions (mirroring server.ts logic)
// =============================================================================

const mockFs = new MockFileSystem();

async function scanRules(workspacePath: string): Promise<RuleInfo[]> {
	const rulesDir = workspacePath + '/.cursor/rules';
	const rules: RuleInfo[] = [];

	try {
		const files = await mockFs.readdir(rulesDir);

		for (const file of files) {
			if (file.isFile && (file.name.endsWith('.mdc') || file.name.endsWith('.md'))) {
				const filePath = rulesDir + '/' + file.name;
				const content = await mockFs.readFile(filePath);

				// Parse YAML frontmatter
				const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
				let description = '';
				let alwaysApply = false;
				let globs: string[] | undefined;

				if (frontmatterMatch) {
					const frontmatter = frontmatterMatch[1];
					const descMatch = frontmatter.match(/description:\s*(.+)/);
					if (descMatch) {
						description = descMatch[1].trim();
					}

					alwaysApply = /alwaysApply:\s*true/i.test(frontmatter);

					const globsMatch = frontmatter.match(/globs:\s*\[(.*?)\]/);
					if (globsMatch) {
						globs = globsMatch[1].split(',').map(g => g.trim().replace(/['"]/g, ''));
					}
				}

				const type = alwaysApply ? 'always' : (globs && globs.length > 0) ? 'glob' : 'manual';

				rules.push({
					name: file.name.replace(/\.(mdc|md)$/, ''),
					description,
					type,
					path: filePath,
					globs
				});
			}
		}
	} catch {
		// Directory doesn't exist or can't be read
	}

	return rules;
}

async function scanCommands(workspacePath: string): Promise<CommandInfo[]> {
	const commandsDir = workspacePath + '/.cursor/commands';
	const commands: CommandInfo[] = [];

	try {
		const files = await mockFs.readdir(commandsDir);

		for (const file of files) {
			if (file.isFile && file.name.endsWith('.md') && file.name !== 'README.md') {
				const filePath = commandsDir + '/' + file.name;
				const content = await mockFs.readFile(filePath);

				// Extract description from ## Overview section or first paragraph
				let description = '';
				const overviewMatch = content.match(/## Overview\s*\n+([^\n#]+)/);
				if (overviewMatch) {
					description = overviewMatch[1].trim();
				} else {
					const lines = content.split('\n');
					for (const line of lines) {
						const trimmed = line.trim();
						if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-')) {
							description = trimmed.substring(0, 200);
							break;
						}
					}
				}

				commands.push({
					name: file.name.replace(/\.md$/, ''),
					description,
					path: filePath,
					location: 'workspace'
				});
			}
		}
	} catch {
		// Directory doesn't exist or can't be read
	}

	return commands;
}

async function scanSkills(workspacePath: string): Promise<SkillInfo[]> {
	const skillsDir = workspacePath + '/.cursor/skills';
	const skills: SkillInfo[] = [];

	try {
		const entries = await mockFs.readdir(skillsDir);

		for (const entry of entries) {
			if (entry.isDirectory) {
				const skillPath = skillsDir + '/' + entry.name + '/SKILL.md';
				try {
					const content = await mockFs.readFile(skillPath);

					// Extract title and overview
					let title: string | undefined;
					let overview: string | undefined;

					const titleMatch = content.match(/^#\s+(.+)$/m);
					if (titleMatch) {
						title = titleMatch[1].trim();
					}

					const overviewMatch = content.match(/## Overview\s*\n+([^\n#]+)/);
					if (overviewMatch) {
						overview = overviewMatch[1].trim();
					}

					skills.push({
						name: entry.name,
						title: title || entry.name,
						overview,
						path: skillPath,
						location: 'workspace'
					});
				} catch {
					// SKILL.md doesn't exist
				}
			}
		}
	} catch {
		// Directory doesn't exist
	}

	return skills;
}

async function scanAgentsMd(workspacePath: string): Promise<AgentsMdResult> {
	const agentsMdPath = workspacePath + '/AGENTS.md';

	try {
		const content = await mockFs.readFile(agentsMdPath);
		return { exists: true, content, path: agentsMdPath };
	} catch {
		return { exists: false };
	}
}

async function scanSpecs(workspacePath: string): Promise<SpecInfo[]> {
	const specsDir = workspacePath + '/specs';
	const specs: SpecInfo[] = [];

	try {
		const entries = await mockFs.readdir(specsDir);

		for (const entry of entries) {
			if (entry.isDirectory) {
				const specPath = specsDir + '/' + entry.name + '/spec.md';
				try {
					const content = await mockFs.readFile(specPath);
					specs.push({
						domain: entry.name,
						path: specPath,
						hasBlueprint: content.includes('## Blueprint'),
						hasContract: content.includes('## Contract')
					});
				} catch {
					// spec.md doesn't exist in this directory
				}
			}
		}
	} catch {
		// specs directory doesn't exist
	}

	return specs;
}

async function scanSchemas(workspacePath: string): Promise<SchemaInfo[]> {
	const schemasDir = workspacePath + '/schemas';
	const schemas: SchemaInfo[] = [];

	try {
		const files = await mockFs.readdir(schemasDir);

		for (const file of files) {
			if (file.isFile && file.name.endsWith('.json')) {
				const filePath = schemasDir + '/' + file.name;
				try {
					const content = await mockFs.readFile(filePath);
					const parsed = JSON.parse(content);
					schemas.push({
						name: file.name.replace(/\.json$/, ''),
						path: filePath,
						schemaId: parsed.$id
					});
				} catch {
					schemas.push({
						name: file.name.replace(/\.json$/, ''),
						path: filePath
					});
				}
			}
		}
	} catch {
		// schemas directory doesn't exist
	}

	return schemas;
}

// =============================================================================
// Tests
// =============================================================================

describe('MCP Server Scanner Tests', () => {
	const workspacePath = '/workspace';

	beforeEach(() => {
		mockFs.clear();
	});

	describe('scanRules', () => {
		it('should scan rules from .cursor/rules directory', async () => {
			mockFs.addDirectory(workspacePath);
			mockFs.addDirectory(workspacePath + '/.cursor');
			mockFs.addDirectory(workspacePath + '/.cursor/rules');
			mockFs.addFile(workspacePath + '/.cursor/rules/test-rule.mdc', `---
description: Test rule for testing
---

# Test Rule

This is test content.`);

			const rules = await scanRules(workspacePath);

			assert.strictEqual(rules.length, 1);
			assert.strictEqual(rules[0].name, 'test-rule');
			assert.strictEqual(rules[0].description, 'Test rule for testing');
			assert.strictEqual(rules[0].type, 'manual');
		});

		it('should detect alwaysApply rules', async () => {
			mockFs.addDirectory(workspacePath);
			mockFs.addDirectory(workspacePath + '/.cursor');
			mockFs.addDirectory(workspacePath + '/.cursor/rules');
			mockFs.addFile(workspacePath + '/.cursor/rules/always-rule.mdc', `---
description: Always apply this
alwaysApply: true
---

Content here.`);

			const rules = await scanRules(workspacePath);

			assert.strictEqual(rules[0].type, 'always');
		});

		it('should detect glob rules', async () => {
			mockFs.addDirectory(workspacePath);
			mockFs.addDirectory(workspacePath + '/.cursor');
			mockFs.addDirectory(workspacePath + '/.cursor/rules');
			mockFs.addFile(workspacePath + '/.cursor/rules/glob-rule.mdc', `---
description: TypeScript files only
globs: ["*.ts", "*.tsx"]
---

Content.`);

			const rules = await scanRules(workspacePath);

			assert.strictEqual(rules[0].type, 'glob');
			assert.deepStrictEqual(rules[0].globs, ['*.ts', '*.tsx']);
		});

		it('should handle .md files as well as .mdc', async () => {
			mockFs.addDirectory(workspacePath);
			mockFs.addDirectory(workspacePath + '/.cursor');
			mockFs.addDirectory(workspacePath + '/.cursor/rules');
			mockFs.addFile(workspacePath + '/.cursor/rules/md-rule.md', `---
description: Markdown rule
---

Content.`);

			const rules = await scanRules(workspacePath);

			assert.strictEqual(rules.length, 1);
			assert.strictEqual(rules[0].name, 'md-rule');
		});

		it('should return empty array when rules directory does not exist', async () => {
			mockFs.addDirectory(workspacePath);

			const rules = await scanRules(workspacePath);

			assert.deepStrictEqual(rules, []);
		});

		it('should handle rules without frontmatter', async () => {
			mockFs.addDirectory(workspacePath);
			mockFs.addDirectory(workspacePath + '/.cursor');
			mockFs.addDirectory(workspacePath + '/.cursor/rules');
			mockFs.addFile(workspacePath + '/.cursor/rules/no-frontmatter.mdc', `# Rule without frontmatter

Just content.`);

			const rules = await scanRules(workspacePath);

			assert.strictEqual(rules.length, 1);
			assert.strictEqual(rules[0].description, '');
			assert.strictEqual(rules[0].type, 'manual');
		});
	});

	describe('scanCommands', () => {
		it('should scan commands from .cursor/commands directory', async () => {
			mockFs.addDirectory(workspacePath);
			mockFs.addDirectory(workspacePath + '/.cursor');
			mockFs.addDirectory(workspacePath + '/.cursor/commands');
			mockFs.addFile(workspacePath + '/.cursor/commands/start-task.md', `# Start Task

## Overview

Begin development on a task with proper setup.

## Steps

1. Create branch
2. Implement`);

			const commands = await scanCommands(workspacePath);

			assert.strictEqual(commands.length, 1);
			assert.strictEqual(commands[0].name, 'start-task');
			assert.strictEqual(commands[0].description, 'Begin development on a task with proper setup.');
			assert.strictEqual(commands[0].location, 'workspace');
		});

		it('should skip README.md files', async () => {
			mockFs.addDirectory(workspacePath);
			mockFs.addDirectory(workspacePath + '/.cursor');
			mockFs.addDirectory(workspacePath + '/.cursor/commands');
			mockFs.addFile(workspacePath + '/.cursor/commands/README.md', '# Commands README');
			mockFs.addFile(workspacePath + '/.cursor/commands/real-command.md', '# Real Command\n\nDescription.');

			const commands = await scanCommands(workspacePath);

			assert.strictEqual(commands.length, 1);
			assert.strictEqual(commands[0].name, 'real-command');
		});

		it('should return empty array when commands directory does not exist', async () => {
			mockFs.addDirectory(workspacePath);

			const commands = await scanCommands(workspacePath);

			assert.deepStrictEqual(commands, []);
		});

		it('should extract description from first paragraph if no Overview', async () => {
			mockFs.addDirectory(workspacePath);
			mockFs.addDirectory(workspacePath + '/.cursor');
			mockFs.addDirectory(workspacePath + '/.cursor/commands');
			mockFs.addFile(workspacePath + '/.cursor/commands/simple-cmd.md', `# Simple Command

This is the description without Overview section.

## Details`);

			const commands = await scanCommands(workspacePath);

			assert.strictEqual(commands[0].description, 'This is the description without Overview section.');
		});
	});

	describe('scanSkills', () => {
		it('should scan skills from .cursor/skills/*/SKILL.md directories', async () => {
			mockFs.addDirectory(workspacePath);
			mockFs.addDirectory(workspacePath + '/.cursor');
			mockFs.addDirectory(workspacePath + '/.cursor/skills');
			mockFs.addDirectory(workspacePath + '/.cursor/skills/create-plan');
			mockFs.addFile(workspacePath + '/.cursor/skills/create-plan/SKILL.md', `# Create Plan

## Overview

Create a living specification or implementation plan for a feature.

## Steps

1. Analyze story
2. Review codebase`);

			const skills = await scanSkills(workspacePath);

			assert.strictEqual(skills.length, 1);
			assert.strictEqual(skills[0].name, 'create-plan');
			assert.strictEqual(skills[0].title, 'Create Plan');
			assert.strictEqual(skills[0].overview, 'Create a living specification or implementation plan for a feature.');
			assert.strictEqual(skills[0].location, 'workspace');
		});

		it('should extract title from first heading', async () => {
			mockFs.addDirectory(workspacePath);
			mockFs.addDirectory(workspacePath + '/.cursor');
			mockFs.addDirectory(workspacePath + '/.cursor/skills');
			mockFs.addDirectory(workspacePath + '/.cursor/skills/test-skill');
			mockFs.addFile(workspacePath + '/.cursor/skills/test-skill/SKILL.md', `# Test Skill Title

Content without overview.`);

			const skills = await scanSkills(workspacePath);

			assert.strictEqual(skills[0].title, 'Test Skill Title');
			assert.strictEqual(skills[0].overview, undefined);
		});

		it('should handle skills without title or overview', async () => {
			mockFs.addDirectory(workspacePath);
			mockFs.addDirectory(workspacePath + '/.cursor');
			mockFs.addDirectory(workspacePath + '/.cursor/skills');
			mockFs.addDirectory(workspacePath + '/.cursor/skills/minimal-skill');
			mockFs.addFile(workspacePath + '/.cursor/skills/minimal-skill/SKILL.md', `Just content.`);

			const skills = await scanSkills(workspacePath);

			assert.strictEqual(skills[0].name, 'minimal-skill');
			assert.strictEqual(skills[0].title, 'minimal-skill'); // Fallback to directory name
		});

		it('should return empty array when skills directory does not exist', async () => {
			mockFs.addDirectory(workspacePath);

			const skills = await scanSkills(workspacePath);

			assert.deepStrictEqual(skills, []);
		});

		it('should skip directories without SKILL.md', async () => {
			mockFs.addDirectory(workspacePath);
			mockFs.addDirectory(workspacePath + '/.cursor');
			mockFs.addDirectory(workspacePath + '/.cursor/skills');
			mockFs.addDirectory(workspacePath + '/.cursor/skills/empty-skill');
			// No SKILL.md file added

			const skills = await scanSkills(workspacePath);

			assert.deepStrictEqual(skills, []);
		});
	});

	describe('scanAgentsMd', () => {
		it('should detect AGENTS.md when present', async () => {
			mockFs.addDirectory(workspacePath);
			mockFs.addFile(workspacePath + '/AGENTS.md', `# AGENTS.md

> **Project Mission:** Build awesome software.

## 1. Identity

- Role: Developer`);

			const result = await scanAgentsMd(workspacePath);

			assert.strictEqual(result.exists, true);
			assert.strictEqual(result.path, workspacePath + '/AGENTS.md');
			assert.ok(result.content?.includes('Project Mission'));
		});

		it('should return exists: false when AGENTS.md is missing', async () => {
			mockFs.addDirectory(workspacePath);

			const result = await scanAgentsMd(workspacePath);

			assert.strictEqual(result.exists, false);
			assert.strictEqual(result.content, undefined);
			assert.strictEqual(result.path, undefined);
		});
	});

	describe('scanSpecs', () => {
		it('should scan specs from specs/ directory', async () => {
			mockFs.addDirectory(workspacePath);
			mockFs.addDirectory(workspacePath + '/specs');
			mockFs.addDirectory(workspacePath + '/specs/scanners');
			mockFs.addFile(workspacePath + '/specs/scanners/spec.md', `# Scanners Spec

## Blueprint

Architecture details.

## Contract

Quality requirements.`);

			const specs = await scanSpecs(workspacePath);

			assert.strictEqual(specs.length, 1);
			assert.strictEqual(specs[0].domain, 'scanners');
			assert.strictEqual(specs[0].hasBlueprint, true);
			assert.strictEqual(specs[0].hasContract, true);
		});

		it('should detect specs without Contract section', async () => {
			mockFs.addDirectory(workspacePath);
			mockFs.addDirectory(workspacePath + '/specs');
			mockFs.addDirectory(workspacePath + '/specs/feature');
			mockFs.addFile(workspacePath + '/specs/feature/spec.md', `# Feature Spec

## Blueprint

Architecture only.`);

			const specs = await scanSpecs(workspacePath);

			assert.strictEqual(specs[0].hasBlueprint, true);
			assert.strictEqual(specs[0].hasContract, false);
		});

		it('should return empty array when specs directory does not exist', async () => {
			mockFs.addDirectory(workspacePath);

			const specs = await scanSpecs(workspacePath);

			assert.deepStrictEqual(specs, []);
		});

		it('should skip directories without spec.md', async () => {
			mockFs.addDirectory(workspacePath);
			mockFs.addDirectory(workspacePath + '/specs');
			mockFs.addDirectory(workspacePath + '/specs/empty-domain');
			// No spec.md file added

			const specs = await scanSpecs(workspacePath);

			assert.deepStrictEqual(specs, []);
		});
	});

	describe('scanSchemas', () => {
		it('should scan JSON schemas from schemas/ directory', async () => {
			mockFs.addDirectory(workspacePath);
			mockFs.addDirectory(workspacePath + '/schemas');
			mockFs.addFile(workspacePath + '/schemas/config.json', JSON.stringify({
				$id: 'https://example.com/config.json',
				type: 'object',
				properties: { name: { type: 'string' } }
			}));

			const schemas = await scanSchemas(workspacePath);

			assert.strictEqual(schemas.length, 1);
			assert.strictEqual(schemas[0].name, 'config');
			assert.strictEqual(schemas[0].schemaId, 'https://example.com/config.json');
		});

		it('should handle schemas without $id', async () => {
			mockFs.addDirectory(workspacePath);
			mockFs.addDirectory(workspacePath + '/schemas');
			mockFs.addFile(workspacePath + '/schemas/simple.json', JSON.stringify({
				type: 'object'
			}));

			const schemas = await scanSchemas(workspacePath);

			assert.strictEqual(schemas[0].schemaId, undefined);
		});

		it('should handle invalid JSON gracefully', async () => {
			mockFs.addDirectory(workspacePath);
			mockFs.addDirectory(workspacePath + '/schemas');
			mockFs.addFile(workspacePath + '/schemas/invalid.json', 'not valid json {{{');

			const schemas = await scanSchemas(workspacePath);

			assert.strictEqual(schemas.length, 1);
			assert.strictEqual(schemas[0].name, 'invalid');
			assert.strictEqual(schemas[0].schemaId, undefined);
		});

		it('should return empty array when schemas directory does not exist', async () => {
			mockFs.addDirectory(workspacePath);

			const schemas = await scanSchemas(workspacePath);

			assert.deepStrictEqual(schemas, []);
		});
	});

	describe('Integration Scenarios', () => {
		it('should scan complete project with all artifacts', async () => {
			// Set up complete project structure
			mockFs.addDirectory(workspacePath);
			mockFs.addDirectory(workspacePath + '/.cursor');
			mockFs.addDirectory(workspacePath + '/.cursor/rules');
			mockFs.addDirectory(workspacePath + '/.cursor/commands');
			mockFs.addDirectory(workspacePath + '/.cursor/skills');
			mockFs.addDirectory(workspacePath + '/.cursor/skills/start-task');
			mockFs.addDirectory(workspacePath + '/specs');
			mockFs.addDirectory(workspacePath + '/specs/auth');
			mockFs.addDirectory(workspacePath + '/schemas');

			// Add files
			mockFs.addFile(workspacePath + '/AGENTS.md', '# AGENTS.md\n\nProject constitution.');
			mockFs.addFile(workspacePath + '/.cursor/rules/security.mdc', '---\ndescription: Security rules\nalwaysApply: true\n---\n\nContent');
			mockFs.addFile(workspacePath + '/.cursor/commands/deploy.md', '# Deploy\n\n## Overview\n\nDeploy the app.');
			mockFs.addFile(workspacePath + '/.cursor/skills/start-task/SKILL.md', '# Start Task\n\n## Overview\n\nBegin development.');
			mockFs.addFile(workspacePath + '/specs/auth/spec.md', '# Auth\n\n## Blueprint\n\nDesign.\n\n## Contract\n\nTests.');
			mockFs.addFile(workspacePath + '/schemas/user.json', '{"$id": "user", "type": "object"}');

			// Scan all
			const [rules, commands, skills, agentsMd, specs, schemas] = await Promise.all([
				scanRules(workspacePath),
				scanCommands(workspacePath),
				scanSkills(workspacePath),
				scanAgentsMd(workspacePath),
				scanSpecs(workspacePath),
				scanSchemas(workspacePath)
			]);

			assert.strictEqual(rules.length, 1);
			assert.strictEqual(commands.length, 1);
			assert.strictEqual(skills.length, 1);
			assert.strictEqual(agentsMd.exists, true);
			assert.strictEqual(specs.length, 1);
			assert.strictEqual(schemas.length, 1);

			assert.strictEqual(rules[0].type, 'always');
			assert.strictEqual(skills[0].name, 'start-task');
			assert.strictEqual(specs[0].hasBlueprint, true);
			assert.strictEqual(specs[0].hasContract, true);
		});

		it('should handle empty project gracefully', async () => {
			mockFs.addDirectory(workspacePath);

			const [rules, commands, skills, agentsMd, specs, schemas] = await Promise.all([
				scanRules(workspacePath),
				scanCommands(workspacePath),
				scanSkills(workspacePath),
				scanAgentsMd(workspacePath),
				scanSpecs(workspacePath),
				scanSchemas(workspacePath)
			]);

			assert.deepStrictEqual(rules, []);
			assert.deepStrictEqual(commands, []);
			assert.deepStrictEqual(skills, []);
			assert.strictEqual(agentsMd.exists, false);
			assert.deepStrictEqual(specs, []);
			assert.deepStrictEqual(schemas, []);
		});
	});
});
