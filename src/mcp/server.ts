#!/usr/bin/env node
// ACE MCP Server - Standalone MCP server for Agent Context Explorer
// This script runs as a subprocess started by VS Code/Cursor

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// =============================================================================
// Types (simplified versions that work without vscode)
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

// =============================================================================
// File System Scanners (Node.js based, not vscode)
// =============================================================================

/**
 * Scan for Cursor rules in the workspace
 */
async function scanRules(workspacePath: string): Promise<RuleInfo[]> {
	const rulesDir = path.join(workspacePath, '.cursor', 'rules');
	const rules: RuleInfo[] = [];

	try {
		const files = await fs.readdir(rulesDir, { withFileTypes: true });

		for (const file of files) {
			if (file.isFile() && (file.name.endsWith('.mdc') || file.name.endsWith('.md'))) {
				const filePath = path.join(rulesDir, file.name);
				const content = await fs.readFile(filePath, 'utf-8');

				// Parse YAML frontmatter
				const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
				let description = '';
				let alwaysApply = false;
				let globs: string[] | undefined;

				if (frontmatterMatch) {
					const frontmatter = frontmatterMatch[1];
					const descMatch = frontmatter.match(/description:\s*(.+)/);
					if (descMatch) {description = descMatch[1].trim();}

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

/**
 * Scan for Cursor commands in the workspace
 */
async function scanCommands(workspacePath: string): Promise<CommandInfo[]> {
	const commandsDir = path.join(workspacePath, '.cursor', 'commands');
	const commands: CommandInfo[] = [];

	try {
		const files = await fs.readdir(commandsDir, { withFileTypes: true });

		for (const file of files) {
			if (file.isFile() && file.name.endsWith('.md') && file.name !== 'README.md') {
				const filePath = path.join(commandsDir, file.name);
				const content = await fs.readFile(filePath, 'utf-8');

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

	// Also scan global commands
	const homeDir = process.env.HOME || process.env.USERPROFILE || '';
	const globalCommandsDir = path.join(homeDir, '.cursor', 'commands');

	try {
		const files = await fs.readdir(globalCommandsDir, { withFileTypes: true });

		for (const file of files) {
			if (file.isFile() && file.name.endsWith('.md') && file.name !== 'README.md') {
				const filePath = path.join(globalCommandsDir, file.name);
				const content = await fs.readFile(filePath, 'utf-8');

				let description = '';
				const overviewMatch = content.match(/## Overview\s*\n+([^\n#]+)/);
				if (overviewMatch) {
					description = overviewMatch[1].trim();
				}

				commands.push({
					name: file.name.replace(/\.md$/, ''),
					description,
					path: filePath,
					location: 'global'
				});
			}
		}
	} catch {
		// Global commands directory doesn't exist
	}

	return commands;
}

/**
 * Scan for Cursor skills in the workspace and global
 */
async function scanSkills(workspacePath: string): Promise<SkillInfo[]> {
	const skillsDir = path.join(workspacePath, '.cursor', 'skills');
	const skills: SkillInfo[] = [];

	// Scan workspace skills
	try {
		const entries = await fs.readdir(skillsDir, { withFileTypes: true });

		for (const entry of entries) {
			if (entry.isDirectory()) {
				const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
				try {
					const content = await fs.readFile(skillPath, 'utf-8');

					// Extract title and overview from first heading or frontmatter
					let title: string | undefined;
					let overview: string | undefined;

					// Try to extract title from first # heading
					const titleMatch = content.match(/^#\s+(.+)$/m);
					if (titleMatch) {
						title = titleMatch[1].trim();
					}

					// Try to extract overview from ## Overview section
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
					// SKILL.md doesn't exist in this directory
				}
			}
		}
	} catch {
		// Directory doesn't exist or can't be read
	}

	// Also scan global skills
	const homeDir = process.env.HOME || process.env.USERPROFILE || '';
	const globalSkillsDir = path.join(homeDir, '.cursor', 'skills');

	try {
		const entries = await fs.readdir(globalSkillsDir, { withFileTypes: true });

		for (const entry of entries) {
			if (entry.isDirectory()) {
				const skillPath = path.join(globalSkillsDir, entry.name, 'SKILL.md');
				try {
					const content = await fs.readFile(skillPath, 'utf-8');

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
						location: 'global'
					});
				} catch {
					// SKILL.md doesn't exist
				}
			}
		}
	} catch {
		// Global skills directory doesn't exist
	}

	return skills;
}

/**
 * Scan for AGENTS.md
 */
async function scanAgentsMd(workspacePath: string): Promise<{ exists: boolean; content?: string; path?: string }> {
	const agentsMdPath = path.join(workspacePath, 'AGENTS.md');

	try {
		const content = await fs.readFile(agentsMdPath, 'utf-8');
		return { exists: true, content, path: agentsMdPath };
	} catch {
		return { exists: false };
	}
}

/**
 * Scan for specs directory
 */
async function scanSpecs(workspacePath: string): Promise<SpecInfo[]> {
	const specsDir = path.join(workspacePath, 'specs');
	const specs: SpecInfo[] = [];

	try {
		const entries = await fs.readdir(specsDir, { withFileTypes: true });

		for (const entry of entries) {
			if (entry.isDirectory()) {
				const specPath = path.join(specsDir, entry.name, 'spec.md');
				try {
					const content = await fs.readFile(specPath, 'utf-8');
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

/**
 * Scan for schemas directory
 */
async function scanSchemas(workspacePath: string): Promise<SchemaInfo[]> {
	const schemasDir = path.join(workspacePath, 'schemas');
	const schemas: SchemaInfo[] = [];

	try {
		const files = await fs.readdir(schemasDir, { withFileTypes: true });

		for (const file of files) {
			if (file.isFile() && file.name.endsWith('.json')) {
				const filePath = path.join(schemasDir, file.name);
				try {
					const content = await fs.readFile(filePath, 'utf-8');
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
// Server Setup
// =============================================================================

/**
 * Create and configure the MCP server
 */
function createServer(workspacePath: string): McpServer {
	const server = new McpServer(
		{
			name: 'ace-mcp',
			version: '1.0.0'
		},
		{
			capabilities: {
				tools: {},
				resources: {}
			}
		}
	);

	// =========================================================================
	// Register Tools (using simple object schemas without Zod for type perf)
	// =========================================================================

	// list_rules - List all Cursor rules with metadata
	server.tool('list_rules', 'List all Cursor rules with metadata', async () => {
		const rules = await scanRules(workspacePath);
		return {
			content: [{ type: 'text' as const, text: JSON.stringify(rules, null, 2) }]
		};
	});

	// get_rule - Get rule content by name
	server.tool('get_rule', 'Get rule content by name', { name: { type: 'string', description: 'Rule name (without extension)' } } as any, async (args: any) => {
		const rules = await scanRules(workspacePath);
		const normalizedName = args.name.toLowerCase().replace(/\.(mdc|md)$/, '');
		const rule = rules.find(r => r.name.toLowerCase() === normalizedName);

		if (!rule) {
			return { content: [{ type: 'text' as const, text: `Rule "${args.name}" not found` }], isError: true };
		}

		const content = await fs.readFile(rule.path, 'utf-8');
		return {
			content: [{ type: 'text' as const, text: content }]
		};
	});

	// list_commands - List all Cursor commands with metadata
	server.tool('list_commands', 'List all Cursor commands with metadata', async () => {
		const commands = await scanCommands(workspacePath);
		return {
			content: [{ type: 'text' as const, text: JSON.stringify(commands, null, 2) }]
		};
	});

	// get_command - Get command content by name
	server.tool('get_command', 'Get command content by name', { name: { type: 'string', description: 'Command name (without extension)' } } as any, async (args: any) => {
		const commands = await scanCommands(workspacePath);
		const normalizedName = args.name.toLowerCase().replace(/\.md$/, '');
		const command = commands.find(c => c.name.toLowerCase() === normalizedName);

		if (!command) {
			return { content: [{ type: 'text' as const, text: `Command "${args.name}" not found` }], isError: true };
		}

		const content = await fs.readFile(command.path, 'utf-8');
		return {
			content: [{ type: 'text' as const, text: content }]
		};
	});

	// list_skills - List all Cursor skills with metadata
	server.tool('list_skills', 'List all Cursor skills with metadata', async () => {
		const skills = await scanSkills(workspacePath);
		return {
			content: [{ type: 'text' as const, text: JSON.stringify(skills, null, 2) }]
		};
	});

	// get_skill - Get skill content by name
	server.tool('get_skill', 'Get skill content by name', { name: { type: 'string', description: 'Skill directory name' } } as any, async (args: any) => {
		const skills = await scanSkills(workspacePath);
		const normalizedName = args.name.toLowerCase();
		const skill = skills.find(s => s.name.toLowerCase() === normalizedName);

		if (!skill) {
			return { content: [{ type: 'text' as const, text: `Skill "${args.name}" not found` }], isError: true };
		}

		const content = await fs.readFile(skill.path, 'utf-8');
		return {
			content: [{ type: 'text' as const, text: content }]
		};
	});

	// get_asdlc_artifacts - Get ASDLC artifacts (AGENTS.md, specs, schemas)
	server.tool('get_asdlc_artifacts', 'Get ASDLC artifacts (AGENTS.md, specs, schemas)', async () => {
		const [agentsMd, specs, schemas] = await Promise.all([
			scanAgentsMd(workspacePath),
			scanSpecs(workspacePath),
			scanSchemas(workspacePath)
		]);

		const result = {
			agentsMd: {
				exists: agentsMd.exists,
				path: agentsMd.path
			},
			specs: {
				exists: specs.length > 0,
				count: specs.length,
				specs
			},
			schemas: {
				exists: schemas.length > 0,
				count: schemas.length,
				schemas
			},
			hasAnyArtifacts: agentsMd.exists || specs.length > 0 || schemas.length > 0
		};

		return {
			content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
		};
	});

	// list_specs - List available specifications
	server.tool('list_specs', 'List available specifications', async () => {
		const specs = await scanSpecs(workspacePath);
		return {
			content: [{ type: 'text' as const, text: JSON.stringify(specs, null, 2) }]
		};
	});

	// get_project_context - Complete project context
	server.tool('get_project_context', 'Get complete project context (rules, commands, skills, artifacts)', async () => {
		const [rules, commands, skills, agentsMd, specs, schemas] = await Promise.all([
			scanRules(workspacePath),
			scanCommands(workspacePath),
			scanSkills(workspacePath),
			scanAgentsMd(workspacePath),
			scanSpecs(workspacePath),
			scanSchemas(workspacePath)
		]);

		const context = {
			timestamp: new Date().toISOString(),
			projectPath: workspacePath,
			rules,
			commands,
			skills,
			asdlcArtifacts: {
				agentsMd: { exists: agentsMd.exists, path: agentsMd.path },
				specs: { exists: specs.length > 0, specs },
				schemas: { exists: schemas.length > 0, schemas },
				hasAnyArtifacts: agentsMd.exists || specs.length > 0 || schemas.length > 0
			}
		};

		return {
			content: [{ type: 'text' as const, text: JSON.stringify(context, null, 2) }]
		};
	});

	// =========================================================================
	// Register Resources
	// =========================================================================

	// ace://rules - List of all rules
	server.resource('rules', 'ace://rules', { description: 'List of all Cursor rules', mimeType: 'application/json' }, async () => {
		const rules = await scanRules(workspacePath);
		return {
			contents: [{ uri: 'ace://rules', mimeType: 'application/json', text: JSON.stringify(rules, null, 2) }]
		};
	});

	// ace://rules/{name} - Individual rule content
	server.resource(
		'rule',
		new ResourceTemplate('ace://rules/{name}', {
			list: async () => {
				const rules = await scanRules(workspacePath);
				return {
					resources: rules.map(r => ({
						uri: `ace://rules/${r.name}`,
						name: r.name,
						description: r.description,
						mimeType: 'text/markdown'
					}))
				};
			}
		}),
		{ description: 'Individual Cursor rule content', mimeType: 'text/markdown' },
		async (uri, variables) => {
			const ruleName = variables.name as string;
			const rules = await scanRules(workspacePath);
			const rule = rules.find(r => r.name === ruleName);

			if (!rule) {
				return { contents: [] };
			}

			const content = await fs.readFile(rule.path, 'utf-8');
			return {
				contents: [{ uri: uri.toString(), mimeType: 'text/markdown', text: content }]
			};
		}
	);

	// ace://commands - List of all commands
	server.resource('commands', 'ace://commands', { description: 'List of all Cursor commands', mimeType: 'application/json' }, async () => {
		const commands = await scanCommands(workspacePath);
		return {
			contents: [{ uri: 'ace://commands', mimeType: 'application/json', text: JSON.stringify(commands, null, 2) }]
		};
	});

	// ace://commands/{name} - Individual command content
	server.resource(
		'command',
		new ResourceTemplate('ace://commands/{name}', {
			list: async () => {
				const commands = await scanCommands(workspacePath);
				return {
					resources: commands.map(c => ({
						uri: `ace://commands/${c.name}`,
						name: c.name,
						description: c.description,
						mimeType: 'text/markdown'
					}))
				};
			}
		}),
		{ description: 'Individual Cursor command content', mimeType: 'text/markdown' },
		async (uri, variables) => {
			const commandName = variables.name as string;
			const commands = await scanCommands(workspacePath);
			const command = commands.find(c => c.name === commandName);

			if (!command) {
				return { contents: [] };
			}

			const content = await fs.readFile(command.path, 'utf-8');
			return {
				contents: [{ uri: uri.toString(), mimeType: 'text/markdown', text: content }]
			};
		}
	);

	// ace://skills - List of all skills
	server.resource('skills', 'ace://skills', { description: 'List of all Cursor skills', mimeType: 'application/json' }, async () => {
		const skills = await scanSkills(workspacePath);
		return {
			contents: [{ uri: 'ace://skills', mimeType: 'application/json', text: JSON.stringify(skills, null, 2) }]
		};
	});

	// ace://skills/{name} - Individual skill content
	server.resource(
		'skill',
		new ResourceTemplate('ace://skills/{name}', {
			list: async () => {
				const skills = await scanSkills(workspacePath);
				return {
					resources: skills.map(s => ({
						uri: `ace://skills/${s.name}`,
						name: s.name,
						description: s.title || s.name,
						mimeType: 'text/markdown'
					}))
				};
			}
		}),
		{ description: 'Individual skill content', mimeType: 'text/markdown' },
		async (uri, variables) => {
			const name = variables.name as string;
			const skills = await scanSkills(workspacePath);
			const skill = skills.find(s => s.name.toLowerCase() === name.toLowerCase());

			if (!skill) {
				return { contents: [] };
			}

			const content = await fs.readFile(skill.path, 'utf-8');
			return {
				contents: [{ uri: uri.toString(), mimeType: 'text/markdown', text: content }]
			};
		}
	);

	// ace://agents-md - AGENTS.md content
	server.resource('agents-md', 'ace://agents-md', { description: 'Project AGENTS.md content', mimeType: 'text/markdown' }, async () => {
		const agentsMd = await scanAgentsMd(workspacePath);
		if (!agentsMd.exists || !agentsMd.content) {
			return { contents: [] };
		}
		return {
			contents: [{ uri: 'ace://agents-md', mimeType: 'text/markdown', text: agentsMd.content }]
		};
	});

	// ace://specs - List of all specs
	server.resource('specs', 'ace://specs', { description: 'List of all specifications', mimeType: 'application/json' }, async () => {
		const specs = await scanSpecs(workspacePath);
		return {
			contents: [{ uri: 'ace://specs', mimeType: 'application/json', text: JSON.stringify(specs, null, 2) }]
		};
	});

	// ace://specs/{domain} - Individual spec content
	server.resource(
		'spec',
		new ResourceTemplate('ace://specs/{domain}', {
			list: async () => {
				const specs = await scanSpecs(workspacePath);
				return {
					resources: specs.map(s => ({
						uri: `ace://specs/${s.domain}`,
						name: s.domain,
						description: `Specification: ${s.domain}`,
						mimeType: 'text/markdown'
					}))
				};
			}
		}),
		{ description: 'Individual specification content', mimeType: 'text/markdown' },
		async (uri, variables) => {
			const domain = variables.domain as string;
			const specs = await scanSpecs(workspacePath);
			const spec = specs.find(s => s.domain === domain);

			if (!spec) {
				return { contents: [] };
			}

			const content = await fs.readFile(spec.path, 'utf-8');
			return {
				contents: [{ uri: uri.toString(), mimeType: 'text/markdown', text: content }]
			};
		}
	);

	// ace://schemas - List of all schemas
	server.resource('schemas', 'ace://schemas', { description: 'List of all JSON schemas', mimeType: 'application/json' }, async () => {
		const schemas = await scanSchemas(workspacePath);
		return {
			contents: [{ uri: 'ace://schemas', mimeType: 'application/json', text: JSON.stringify(schemas, null, 2) }]
		};
	});

	// ace://schemas/{name} - Individual schema content
	server.resource(
		'schema',
		new ResourceTemplate('ace://schemas/{name}', {
			list: async () => {
				const schemas = await scanSchemas(workspacePath);
				return {
					resources: schemas.map(s => ({
						uri: `ace://schemas/${s.name}`,
						name: s.name,
						description: s.schemaId || `Schema: ${s.name}`,
						mimeType: 'application/json'
					}))
				};
			}
		}),
		{ description: 'Individual JSON schema content', mimeType: 'application/json' },
		async (uri, variables) => {
			const schemaName = variables.name as string;
			const schemas = await scanSchemas(workspacePath);
			const schema = schemas.find(s => s.name === schemaName);

			if (!schema) {
				return { contents: [] };
			}

			const content = await fs.readFile(schema.path, 'utf-8');
			return {
				contents: [{ uri: uri.toString(), mimeType: 'application/json', text: content }]
			};
		}
	);

	return server;
}

// =============================================================================
// Main Entry Point
// =============================================================================

async function main(): Promise<void> {
	// Get workspace path from environment variable or command line arg
	const workspacePath = process.env.ACE_WORKSPACE_PATH || process.argv[2] || process.cwd();

	// Verify path exists
	try {
		await fs.access(workspacePath);
	} catch {
		console.error(`Workspace path does not exist: ${workspacePath}`);
		process.exit(1);
	}

	// Create and start server
	// Pass stdin/stdout explicitly - ensures we use Node's process streams
	// (avoids bundler issues with node:process in StdioServerTransport)
	const server = createServer(workspacePath);
	const transport = new StdioServerTransport(process.stdin!, process.stdout!);

	await server.connect(transport);

	// Log to stderr (stdout is for MCP messages)
	console.error(`ACE MCP Server started for workspace: ${workspacePath}`);
}

// Run the server
main().catch((error) => {
	console.error('Failed to start ACE MCP Server:', error);
	process.exit(1);
});
