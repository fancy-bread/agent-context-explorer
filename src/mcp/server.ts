#!/usr/bin/env node
// ACE MCP Server - Standalone MCP server for Agent Context Explorer
// This script runs as a subprocess started by VS Code/Cursor
// Uses shared scanner core with NodeFsAdapter (NO vscode)

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as fs from 'fs/promises';
import * as os from 'os';
import { NodeFsAdapter } from '../scanner/adapters/nodeFsAdapter';
import {
	scanRulesCore,
	scanCommandsCore,
	scanSkillsCore,
	scanAsdlcCore
} from '../scanner/core';

// =============================================================================
// Types (MCP tool output format)
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

function coreRuleToRuleInfo(r: { fileName: string; metadata: { description: string; globs?: string[]; alwaysApply?: boolean }; path: string }): RuleInfo {
	const type = r.metadata.alwaysApply ? 'always' : (r.metadata.globs && r.metadata.globs.length > 0) ? 'glob' : 'manual';
	return {
		name: r.fileName.replace(/\.(mdc|md)$/, ''),
		description: r.metadata.description || '',
		type,
		path: r.path,
		globs: r.metadata.globs
	};
}

function coreCommandToCommandInfo(c: { fileName: string; content: string; path: string; location: 'workspace' | 'global' }): CommandInfo {
	let description = '';
	const overviewMatch = c.content.match(/## Overview\s*\n+([^\n#]+)/);
	if (overviewMatch) {
		description = overviewMatch[1].trim();
	} else {
		const lines = c.content.split('\n');
		for (const line of lines) {
			const trimmed = line.trim();
			if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-')) {
				description = trimmed.substring(0, 200);
				break;
			}
		}
	}
	return {
		name: c.fileName,
		description,
		path: c.path,
		location: c.location
	};
}

function coreSkillToSkillInfo(s: { fileName: string; metadata?: { title?: string; overview?: string }; path: string; location: 'workspace' | 'global' }): SkillInfo {
	return {
		name: s.fileName,
		title: s.metadata?.title || s.fileName,
		overview: s.metadata?.overview,
		path: s.path,
		location: s.location
	};
}

// =============================================================================
// Shared scan helpers (use scanner core + NodeFsAdapter)
// =============================================================================

async function getRules(workspacePath: string) {
	const fs = new NodeFsAdapter();
	const userRoot = os.homedir();
	const coreRules = await scanRulesCore(fs, workspacePath, userRoot);
	return coreRules;
}

async function getRulesAsInfo(workspacePath: string): Promise<RuleInfo[]> {
	const rules = await getRules(workspacePath);
	return rules.map(coreRuleToRuleInfo);
}

async function getCommands(workspacePath: string) {
	const fs = new NodeFsAdapter();
	const userRoot = os.homedir();
	return scanCommandsCore(fs, workspacePath, userRoot);
}

async function getCommandsAsInfo(workspacePath: string): Promise<CommandInfo[]> {
	const commands = await getCommands(workspacePath);
	return commands.map(coreCommandToCommandInfo);
}

async function getSkills(workspacePath: string) {
	const fs = new NodeFsAdapter();
	const userRoot = os.homedir();
	return scanSkillsCore(fs, workspacePath, userRoot);
}

async function getSkillsAsInfo(workspacePath: string): Promise<SkillInfo[]> {
	const skills = await getSkills(workspacePath);
	return skills.map(coreSkillToSkillInfo);
}

async function getAsdlcArtifacts(workspacePath: string) {
	const fs = new NodeFsAdapter();
	return scanAsdlcCore(fs, workspacePath);
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
		const rules = await getRulesAsInfo(workspacePath);
		return {
			content: [{ type: 'text' as const, text: JSON.stringify(rules, null, 2) }]
		};
	});

	// get_rule - Get rule content by name
	server.tool('get_rule', 'Get rule content by name', { name: { type: 'string', description: 'Rule name (without extension)' } } as any, async (args: any) => {
		const rules = await getRules(workspacePath);
		const normalizedName = args.name.toLowerCase().replace(/\.(mdc|md)$/, '');
		const rule = rules.find(r => r.fileName.toLowerCase().replace(/\.(mdc|md)$/, '') === normalizedName);

		if (!rule) {
			return { content: [{ type: 'text' as const, text: `Rule "${args.name}" not found` }], isError: true };
		}

		return {
			content: [{ type: 'text' as const, text: rule.content }]
		};
	});

	// list_commands - List all Cursor commands with metadata
	server.tool('list_commands', 'List all Cursor commands with metadata', async () => {
		const commands = await getCommandsAsInfo(workspacePath);
		return {
			content: [{ type: 'text' as const, text: JSON.stringify(commands, null, 2) }]
		};
	});

	// get_command - Get command content by name
	server.tool('get_command', 'Get command content by name', { name: { type: 'string', description: 'Command name (without extension)' } } as any, async (args: any) => {
		const commands = await getCommands(workspacePath);
		const normalizedName = args.name.toLowerCase().replace(/\.md$/, '');
		const command = commands.find(c => c.fileName.toLowerCase() === normalizedName);

		if (!command) {
			return { content: [{ type: 'text' as const, text: `Command "${args.name}" not found` }], isError: true };
		}

		return {
			content: [{ type: 'text' as const, text: command.content }]
		};
	});

	// list_skills - List all Cursor skills with metadata
	server.tool('list_skills', 'List all Cursor skills with metadata', async () => {
		const skills = await getSkillsAsInfo(workspacePath);
		return {
			content: [{ type: 'text' as const, text: JSON.stringify(skills, null, 2) }]
		};
	});

	// get_skill - Get skill content by name
	server.tool('get_skill', 'Get skill content by name', { name: { type: 'string', description: 'Skill directory name' } } as any, async (args: any) => {
		const skills = await getSkills(workspacePath);
		const normalizedName = args.name.toLowerCase();
		const skill = skills.find(s => s.fileName.toLowerCase() === normalizedName);

		if (!skill) {
			return { content: [{ type: 'text' as const, text: `Skill "${args.name}" not found` }], isError: true };
		}

		return {
			content: [{ type: 'text' as const, text: skill.content }]
		};
	});

	// get_asdlc_artifacts - Get ASDLC artifacts (AGENTS.md, specs, schemas)
	server.tool('get_asdlc_artifacts', 'Get ASDLC artifacts (AGENTS.md, specs, schemas)', async () => {
		const asdlc = await getAsdlcArtifacts(workspacePath);

		const result = {
			agentsMd: {
				exists: asdlc.agentsMd.exists,
				path: asdlc.agentsMd.path
			},
			specs: {
				exists: asdlc.specs.exists,
				count: asdlc.specs.specs.length,
				specs: asdlc.specs.specs
			},
			schemas: {
				exists: asdlc.schemas.exists,
				count: asdlc.schemas.schemas.length,
				schemas: asdlc.schemas.schemas
			},
			hasAnyArtifacts: asdlc.hasAnyArtifacts
		};

		return {
			content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
		};
	});

	// list_specs - List available specifications
	server.tool('list_specs', 'List available specifications', async () => {
		const asdlc = await getAsdlcArtifacts(workspacePath);
		return {
			content: [{ type: 'text' as const, text: JSON.stringify(asdlc.specs.specs, null, 2) }]
		};
	});

	// get_project_context - Complete project context
	server.tool('get_project_context', 'Get complete project context (rules, commands, skills, artifacts)', async () => {
		const [rules, commands, skills, asdlc] = await Promise.all([
			getRulesAsInfo(workspacePath),
			getCommandsAsInfo(workspacePath),
			getSkillsAsInfo(workspacePath),
			getAsdlcArtifacts(workspacePath)
		]);

		const context = {
			timestamp: new Date().toISOString(),
			projectPath: workspacePath,
			rules,
			commands,
			skills,
			asdlcArtifacts: {
				agentsMd: { exists: asdlc.agentsMd.exists, path: asdlc.agentsMd.path },
				specs: { exists: asdlc.specs.exists, specs: asdlc.specs.specs },
				schemas: { exists: asdlc.schemas.exists, schemas: asdlc.schemas.schemas },
				hasAnyArtifacts: asdlc.hasAnyArtifacts
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
		const rules = await getRulesAsInfo(workspacePath);
		return {
			contents: [{ uri: 'ace://rules', mimeType: 'application/json', text: JSON.stringify(rules, null, 2) }]
		};
	});

	// ace://rules/{name} - Individual rule content
	server.resource(
		'rule',
		new ResourceTemplate('ace://rules/{name}', {
			list: async () => {
				const rules = await getRulesAsInfo(workspacePath);
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
			const rules = await getRules(workspacePath);
			const rule = rules.find(r => r.fileName.replace(/\.(mdc|md)$/, '') === ruleName);

			if (!rule) {
				return { contents: [] };
			}

			return {
				contents: [{ uri: uri.toString(), mimeType: 'text/markdown', text: rule.content }]
			};
		}
	);

	// ace://commands - List of all commands
	server.resource('commands', 'ace://commands', { description: 'List of all Cursor commands', mimeType: 'application/json' }, async () => {
		const commands = await getCommandsAsInfo(workspacePath);
		return {
			contents: [{ uri: 'ace://commands', mimeType: 'application/json', text: JSON.stringify(commands, null, 2) }]
		};
	});

	// ace://commands/{name} - Individual command content
	server.resource(
		'command',
		new ResourceTemplate('ace://commands/{name}', {
			list: async () => {
				const commands = await getCommandsAsInfo(workspacePath);
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
			const commands = await getCommands(workspacePath);
			const command = commands.find(c => c.fileName === commandName);

			if (!command) {
				return { contents: [] };
			}

			return {
				contents: [{ uri: uri.toString(), mimeType: 'text/markdown', text: command.content }]
			};
		}
	);

	// ace://skills - List of all skills
	server.resource('skills', 'ace://skills', { description: 'List of all Cursor skills', mimeType: 'application/json' }, async () => {
		const skills = await getSkillsAsInfo(workspacePath);
		return {
			contents: [{ uri: 'ace://skills', mimeType: 'application/json', text: JSON.stringify(skills, null, 2) }]
		};
	});

	// ace://skills/{name} - Individual skill content
	server.resource(
		'skill',
		new ResourceTemplate('ace://skills/{name}', {
			list: async () => {
				const skills = await getSkillsAsInfo(workspacePath);
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
			const skills = await getSkills(workspacePath);
			const skill = skills.find(s => s.fileName.toLowerCase() === name.toLowerCase());

			if (!skill) {
				return { contents: [] };
			}

			return {
				contents: [{ uri: uri.toString(), mimeType: 'text/markdown', text: skill.content }]
			};
		}
	);

	// ace://agents-md - AGENTS.md content
	server.resource('agents-md', 'ace://agents-md', { description: 'Project AGENTS.md content', mimeType: 'text/markdown' }, async () => {
		const asdlc = await getAsdlcArtifacts(workspacePath);
		if (!asdlc.agentsMd.exists || !asdlc.agentsMd.content) {
			return { contents: [] };
		}
		return {
			contents: [{ uri: 'ace://agents-md', mimeType: 'text/markdown', text: asdlc.agentsMd.content }]
		};
	});

	// ace://specs - List of all specs
	server.resource('specs', 'ace://specs', { description: 'List of all specifications', mimeType: 'application/json' }, async () => {
		const asdlc = await getAsdlcArtifacts(workspacePath);
		return {
			contents: [{ uri: 'ace://specs', mimeType: 'application/json', text: JSON.stringify(asdlc.specs.specs, null, 2) }]
		};
	});

	// ace://specs/{domain} - Individual spec content
	server.resource(
		'spec',
		new ResourceTemplate('ace://specs/{domain}', {
			list: async () => {
				const asdlc = await getAsdlcArtifacts(workspacePath);
				return {
					resources: asdlc.specs.specs.map((s: { domain: string }) => ({
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
			const asdlc = await getAsdlcArtifacts(workspacePath);
			const spec = asdlc.specs.specs.find((s: { domain: string }) => s.domain === domain);

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
		const asdlc = await getAsdlcArtifacts(workspacePath);
		return {
			contents: [{ uri: 'ace://schemas', mimeType: 'application/json', text: JSON.stringify(asdlc.schemas.schemas, null, 2) }]
		};
	});

	// ace://schemas/{name} - Individual schema content
	server.resource(
		'schema',
		new ResourceTemplate('ace://schemas/{name}', {
			list: async () => {
				const asdlc = await getAsdlcArtifacts(workspacePath);
				return {
					resources: asdlc.schemas.schemas.map(s => ({
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
			const asdlc = await getAsdlcArtifacts(workspacePath);
			const schema = asdlc.schemas.schemas.find(s => s.name === schemaName);

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
