#!/usr/bin/env node
// ACE MCP Server - Standalone or bridge to extension
// When ACE_EXTENSION_PORT is set: thin bridge; extension owns project resolution and scanning.
// Otherwise: standalone with NodeFsAdapter (no vscode).

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as fs from 'fs/promises';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
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

/** Project entry for list_projects and resolution */
interface ProjectEntry {
	projectKey: string;
	path: string;
	label: string;
}

/** Extract projectKey from tool args; clients may send flat (projectKey) or nested (arguments.projectKey) or snake_case (project_key). */
function getProjectKeyArg(args: unknown): string | undefined {
	if (!args || typeof args !== 'object') {return undefined;}
	const o = args as Record<string, unknown>;
	const v = o.projectKey ?? o.project_key ?? (o.arguments && typeof o.arguments === 'object' && (o.arguments as Record<string, unknown>).projectKey) ?? (o.arguments && typeof o.arguments === 'object' && (o.arguments as Record<string, unknown>).project_key);
	return typeof v === 'string' ? v : undefined;
}

/**
 * Create and configure the MCP server
 * @param workspacePath - Primary workspace (used when ACE_PROJECT_PATHS not set)
 * @param projects - When set (from ACE_PROJECT_PATHS), list_projects and resolve use this list
 */
function createServer(workspacePath: string, projects?: ProjectEntry[]): McpServer {
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

	// Multi-project: use provided list (from extension) or single workspace (standalone).
	const projectList: ProjectEntry[] = projects && projects.length > 0
		? projects
		: [{ projectKey: path.basename(workspacePath), path: workspacePath, label: path.basename(workspacePath) }];
	const defaultPath = projectList[0].path;

	function resolveProjectRoot(projectKeyArg?: string): { path: string } | { error: string } {
		if (!projectKeyArg) {
			return { path: defaultPath };
		}
		const entry = projectList.find(p => p.projectKey === projectKeyArg);
		if (!entry) {
			const keys = projectList.map(p => p.projectKey).join(', ');
			return { error: `Unknown projectKey: ${projectKeyArg}. Known: ${keys}.` };
		}
		return { path: entry.path };
	}

	// list_projects - List registered ACE projects (workspace + added projects when run from extension)
	server.tool('list_projects', 'List registered ACE projects', async () => {
		return {
			content: [{ type: 'text' as const, text: JSON.stringify(projectList, null, 2) }]
		};
	});

	// list_rules - List all Cursor rules with metadata
	server.tool('list_rules', 'List all Cursor rules with metadata', { projectKey: { type: 'string', description: 'Optional project key (omit for current workspace)' } } as any, async (args: any) => {
		const resolved = resolveProjectRoot(getProjectKeyArg(args));
		if ('error' in resolved) {
			return { content: [{ type: 'text' as const, text: JSON.stringify({ isError: true, message: resolved.error }) }], isError: true };
		}
		const rules = await getRulesAsInfo(resolved.path);
		return {
			content: [{ type: 'text' as const, text: JSON.stringify(rules, null, 2) }]
		};
	});

	// get_rule - Get rule content by name
	server.tool('get_rule', 'Get rule content by name', { name: { type: 'string', description: 'Rule name (without extension)' }, projectKey: { type: 'string', description: 'Optional project key' } } as any, async (args: any) => {
		const resolved = resolveProjectRoot(getProjectKeyArg(args));
		if ('error' in resolved) {
			return { content: [{ type: 'text' as const, text: JSON.stringify({ isError: true, message: resolved.error }) }], isError: true };
		}
		const rules = await getRules(resolved.path);
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
	server.tool('list_commands', 'List all Cursor commands with metadata', { projectKey: { type: 'string', description: 'Optional project key (use list_projects to get keys)' } } as any, async (args: any) => {
		const resolved = resolveProjectRoot(getProjectKeyArg(args));
		if ('error' in resolved) {
			return { content: [{ type: 'text' as const, text: JSON.stringify({ isError: true, message: resolved.error }) }], isError: true };
		}
		const commands = await getCommandsAsInfo(resolved.path);
		return {
			content: [{ type: 'text' as const, text: JSON.stringify(commands, null, 2) }]
		};
	});

	// get_command - Get command content by name
	server.tool('get_command', 'Get command content by name', { name: { type: 'string', description: 'Command name (without extension)' }, projectKey: { type: 'string', description: 'Optional project key' } } as any, async (args: any) => {
		const resolved = resolveProjectRoot(getProjectKeyArg(args));
		if ('error' in resolved) {
			return { content: [{ type: 'text' as const, text: JSON.stringify({ isError: true, message: resolved.error }) }], isError: true };
		}
		const commands = await getCommands(resolved.path);
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
	server.tool('list_skills', 'List all Cursor skills with metadata', { projectKey: { type: 'string', description: 'Optional project key' } } as any, async (args: any) => {
		const resolved = resolveProjectRoot(getProjectKeyArg(args));
		if ('error' in resolved) {
			return { content: [{ type: 'text' as const, text: JSON.stringify({ isError: true, message: resolved.error }) }], isError: true };
		}
		const skills = await getSkillsAsInfo(resolved.path);
		return {
			content: [{ type: 'text' as const, text: JSON.stringify(skills, null, 2) }]
		};
	});

	// get_skill - Get skill content by name
	server.tool('get_skill', 'Get skill content by name', { name: { type: 'string', description: 'Skill directory name' }, projectKey: { type: 'string', description: 'Optional project key' } } as any, async (args: any) => {
		const resolved = resolveProjectRoot(getProjectKeyArg(args));
		if ('error' in resolved) {
			return { content: [{ type: 'text' as const, text: JSON.stringify({ isError: true, message: resolved.error }) }], isError: true };
		}
		const skills = await getSkills(resolved.path);
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
	server.tool('get_asdlc_artifacts', 'Get ASDLC artifacts (AGENTS.md, specs, schemas)', { projectKey: { type: 'string', description: 'Optional project key' } } as any, async (args: any) => {
		const resolved = resolveProjectRoot(getProjectKeyArg(args));
		if ('error' in resolved) {
			return { content: [{ type: 'text' as const, text: JSON.stringify({ isError: true, message: resolved.error }) }], isError: true };
		}
		const asdlc = await getAsdlcArtifacts(resolved.path);

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
	server.tool('list_specs', 'List available specifications', { projectKey: { type: 'string', description: 'Optional project key' } } as any, async (args: any) => {
		const resolved = resolveProjectRoot(getProjectKeyArg(args));
		if ('error' in resolved) {
			return { content: [{ type: 'text' as const, text: JSON.stringify({ isError: true, message: resolved.error }) }], isError: true };
		}
		const asdlc = await getAsdlcArtifacts(resolved.path);
		return {
			content: [{ type: 'text' as const, text: JSON.stringify(asdlc.specs.specs, null, 2) }]
		};
	});

	// get_project_context - Complete project context
	server.tool('get_project_context', 'Get complete project context (rules, commands, skills, artifacts)', { projectKey: { type: 'string', description: 'Optional project key' } } as any, async (args: any) => {
		const resolved = resolveProjectRoot(getProjectKeyArg(args));
		if ('error' in resolved) {
			return { content: [{ type: 'text' as const, text: JSON.stringify({ isError: true, message: resolved.error }) }], isError: true };
		}
		const [rules, commands, skills, asdlc] = await Promise.all([
			getRulesAsInfo(resolved.path),
			getCommandsAsInfo(resolved.path),
			getSkillsAsInfo(resolved.path),
			getAsdlcArtifacts(resolved.path)
		]);
		const entry = projectList.find(p => p.path === resolved.path);
		const projectKeyOut = entry?.projectKey ?? path.basename(resolved.path);

		const context = {
			timestamp: new Date().toISOString(),
			projectKey: projectKeyOut,
			projectPath: resolved.path,
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

	return server;
}

// =============================================================================
// Bridge mode: forward tool calls to extension (extension owns project resolution)
// =============================================================================

function bridgeCall(port: number, method: string, params: Record<string, unknown>): Promise<unknown> {
	return new Promise((resolve, reject) => {
		const id = Math.floor(Math.random() * 1e9);
		const socket = net.connect(port, '127.0.0.1', () => {
			socket.write(JSON.stringify({ id, method, params }) + '\n');
		});
		let buffer = '';
		socket.setEncoding('utf8');
		socket.on('data', (chunk) => {
			buffer += chunk;
			const idx = buffer.indexOf('\n');
			if (idx === -1) {return;}
			const line = buffer.slice(0, idx);
			buffer = buffer.slice(idx + 1);
			socket.destroy();
			try {
				const res = JSON.parse(line) as { id: number; result?: unknown; error?: string };
				if (res.error) {reject(new Error(res.error));}
				else {resolve(res.result);}
			} catch (e) {
				reject(e);
			}
		});
		socket.on('error', reject);
		socket.setTimeout(30000, () => { socket.destroy(); reject(new Error('Bridge timeout')); });
	});
}

const projectKeyShape = { projectKey: z.string().optional() };
const nameAndProjectKeyShape = { name: z.string(), projectKey: z.string().optional() };

const BRIDGE_TOOLS: { name: string; description: string; inputSchema: Record<string, z.ZodTypeAny> }[] = [
	{ name: 'list_projects', description: 'List registered ACE projects', inputSchema: {} },
	{ name: 'list_rules', description: 'List all Cursor rules with metadata', inputSchema: projectKeyShape },
	{ name: 'get_rule', description: 'Get rule content by name', inputSchema: nameAndProjectKeyShape },
	{ name: 'list_commands', description: 'List all Cursor commands with metadata', inputSchema: projectKeyShape },
	{ name: 'get_command', description: 'Get command content by name', inputSchema: nameAndProjectKeyShape },
	{ name: 'list_skills', description: 'List all Cursor skills with metadata', inputSchema: projectKeyShape },
	{ name: 'get_skill', description: 'Get skill content by name', inputSchema: nameAndProjectKeyShape },
	{ name: 'get_asdlc_artifacts', description: 'Get ASDLC artifacts', inputSchema: projectKeyShape },
	{ name: 'list_specs', description: 'List available specifications', inputSchema: projectKeyShape },
	{ name: 'get_project_context', description: 'Get complete project context', inputSchema: projectKeyShape }
];

/** Ensure params for backend: SDK passes validated args; coerce to flat object. */
function toBackendParams(args: unknown): Record<string, unknown> {
	if (args && typeof args === 'object' && !Array.isArray(args)) {
		return args as Record<string, unknown>;
	}
	return {};
}

function createBridgeServer(port: number): McpServer {
	const server = new McpServer(
		{ name: 'ace-mcp', version: '1.0.0' },
		{ capabilities: { tools: {}, resources: {} } }
	);
	for (const t of BRIDGE_TOOLS) {
		server.tool(t.name, t.description, t.inputSchema as any, async (args: any) => {
			const params = toBackendParams(args);
			const result = await bridgeCall(port, t.name, params);
			return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
		});
	}
	return server;
}

// =============================================================================
// Main Entry Point
// =============================================================================

async function main(): Promise<void> {
	const extensionPort = process.env.ACE_EXTENSION_PORT;
	if (extensionPort) {
		const port = parseInt(extensionPort, 10);
		if (port > 0) {
			const server = createBridgeServer(port);
			const transport = new StdioServerTransport(process.stdin!, process.stdout!);
			await server.connect(transport);
			console.error(`ACE MCP Server (bridge mode) → extension port ${port}`);
			return;
		}
	}

	// Standalone mode
	const workspacePath = process.env.ACE_WORKSPACE_PATH || process.argv[2] || process.cwd();
	let projects: ProjectEntry[] | undefined;
	const projectsJson = process.env.ACE_PROJECT_PATHS;
	if (projectsJson) {
		try {
			projects = JSON.parse(projectsJson) as ProjectEntry[];
			if (!Array.isArray(projects) || projects.length === 0) {projects = undefined;}
		} catch {
			// ignore
		}
	}
	const primaryPath = projects?.[0]?.path ?? workspacePath;
	try {
		await fs.access(primaryPath);
	} catch {
		console.error(`Workspace path does not exist: ${primaryPath}`);
		process.exit(1);
	}
	const server = createServer(workspacePath, projects);
	const transport = new StdioServerTransport(process.stdin!, process.stdout!);
	await server.connect(transport);
	const projectCount = projects?.length ?? 1;
	console.error(`ACE MCP Server started (${projectCount} project(s)): ${primaryPath}`);
}

// Run the server
main().catch((error) => {
	console.error('Failed to start ACE MCP Server:', error);
	process.exit(1);
});
