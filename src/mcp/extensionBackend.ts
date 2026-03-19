// MCP Extension Backend - Single source of truth for project resolution and scanning
// Runs in the extension host; stdio server connects here when ACE_EXTENSION_PORT is set.

import * as vscode from 'vscode';
import * as path from 'path';
import type { ProjectDefinition } from '../types/project';
import { McpTools } from './tools';

export interface ProjectEntry {
	projectKey: string;
	path: string;
	label: string;
}

/** Build project list: workspace folders + added projects (same hierarchy as tree view). */
export function buildProjectList(
	getProjects: () => Promise<ProjectDefinition[]>,
	workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined
): Promise<ProjectEntry[]> {
	const byPath = new Map<string, ProjectEntry>();

	async function addAll(): Promise<void> {
		if (workspaceFolders?.length) {
			for (const folder of workspaceFolders) {
				const p = folder.uri.fsPath;
				if (!byPath.has(p)) {
					byPath.set(p, { projectKey: path.basename(p), path: p, label: folder.name });
				}
			}
		}
		const added = await getProjects();
		for (const proj of added) {
			if (!byPath.has(proj.path)) {
				byPath.set(proj.path, { projectKey: path.basename(proj.path), path: proj.path, label: proj.name });
			}
		}
	}

	return addAll().then(() => Array.from(byPath.values()));
}

/** Resolve projectKey to path using the same project list as the tree. Case-insensitive match after exact match. */
export function resolveProjectKey(projectList: ProjectEntry[], projectKey?: string): { path: string } | { error: string } {
	if (!projectKey) {
		return projectList.length > 0 ? { path: projectList[0].path } : { error: 'No projects available.' };
	}
	const exact = projectList.find(p => p.projectKey === projectKey);
	if (exact) {return { path: exact.path };}
	const lower = projectKey.toLowerCase();
	const ci = projectList.find(p => p.projectKey.toLowerCase() === lower);
	if (ci) {return { path: ci.path };}
	const keys = projectList.map(p => p.projectKey).join(', ');
	return { error: `Unknown projectKey: ${projectKey}. Known: ${keys}.` };
}

/** Normalize tool params: MCP clients may send flat (projectKey) or nested (arguments: { projectKey, name, ... }). Exported for tests. */
export function normalizeParams(params: Record<string, unknown>): Record<string, unknown> {
	if (!params || typeof params !== 'object') {return {};}
	const o = params as Record<string, unknown>;
	const nested = o.arguments && typeof o.arguments === 'object' ? (o.arguments as Record<string, unknown>) : {};
	return { ...nested, ...o };
}

const TOOL_METHODS = [
	'list_projects', 'list_rules', 'get_rule', 'list_commands', 'get_command',
	'list_skills', 'get_skill', 'get_asdlc_artifacts', 'list_specs', 'get_project_context'
] as const;

type ToolMethod = typeof TOOL_METHODS[number];

function isToolMethod(m: string): m is ToolMethod {
	return (TOOL_METHODS as readonly string[]).includes(m);
}

/** Handle one tool call: resolve projectKey then delegate to McpTools. */
async function handleToolCall(
	projectList: ProjectEntry[],
	method: ToolMethod,
	params: Record<string, unknown>,
	logLine?: (line: string) => void
): Promise<unknown> {
	const p = normalizeParams(params);
	const rawKey = (typeof p.projectKey === 'string' ? p.projectKey : undefined) ?? (typeof (p as Record<string, unknown>).project_key === 'string' ? (p as Record<string, unknown>).project_key : undefined);
	const projectKey = typeof rawKey === 'string' ? rawKey : undefined;
	const resolved = resolveProjectKey(projectList, projectKey);
	if ('error' in resolved) {
		throw new Error(resolved.error);
	}
	const projectPath = resolved.path;
	if (logLine) {
		logLine(`MCP: ${method} projectKey=${projectKey ?? '(default)'} -> ${projectPath}`);
	}

	switch (method) {
		case 'list_projects':
			return projectList;
		case 'list_rules':
			return McpTools.listRules({ projectPath });
		case 'get_rule': {
			const name = p?.name;
			if (typeof name !== 'string') {throw new Error('Missing name');}
			const out = await McpTools.getRule({ name, projectPath });
			return out;
		}
		case 'list_commands':
			return McpTools.listCommands({ projectPath });
		case 'get_command': {
			const name = p?.name;
			if (typeof name !== 'string') {throw new Error('Missing name');}
			const out = await McpTools.getCommand({ name, projectPath });
			return out;
		}
		case 'list_skills':
			return McpTools.listSkills({ projectPath });
		case 'get_skill': {
			const name = p?.name;
			if (typeof name !== 'string') {throw new Error('Missing name');}
			const out = await McpTools.getSkill({ name, projectPath });
			return out;
		}
		case 'get_asdlc_artifacts':
			return McpTools.getAsdlcArtifacts({ projectPath });
		case 'list_specs':
			return McpTools.listSpecs({ projectPath });
		case 'get_project_context':
			return McpTools.getProjectContext({ projectPath });
		default:
			throw new Error(`Unknown method: ${method}`);
	}
}

/** Request from stdio server. */
interface BackendRequest {
	id: number;
	method: ToolMethod;
	params?: Record<string, unknown>;
}

/** Response to stdio server. */
interface BackendResponse {
	id: number;
	result?: unknown;
	error?: string;
}

/**
 * Start the MCP extension backend. Listens on a random port; returns the port and a dispose function.
 * The stdio server (when ACE_EXTENSION_PORT is set) connects here for all tool calls.
 * @param getProjects - Callback to get workspace + added projects.
 * @param logLine - Optional callback to log one line per tool call (e.g. to extension output channel).
 */
/** Load Node net module (extension host is Node; use require so bundler keeps it external). */
function loadNet(): typeof import('node:net') {
	 
	const mod = typeof require !== 'undefined' ? require('net') : undefined;
	if (mod?.createServer) {return mod as typeof import('node:net');}
	// Fallback for ESM-only contexts
	throw new Error('net module not available (require("net") failed). Extension backend needs Node runtime.');
}

export function startExtensionBackend(
	getProjects: () => Promise<ProjectDefinition[]>,
	logLine?: (line: string) => void
): Promise<{ port: number; dispose: () => void }> {
	return (async () => {
		const net = loadNet();
		return new Promise<{ port: number; dispose: () => void }>((resolve, reject) => {
			const server = net.createServer(async (socket) => {
			// Prevent idle sockets from keeping the Node event loop alive (important for unit tests).
			socket.unref?.();
			let buffer = '';
			socket.setEncoding('utf8');
			socket.on('data', async (chunk) => {
				buffer += chunk;
				const lines = buffer.split('\n');
				buffer = lines.pop() ?? '';
				for (const line of lines) {
					if (!line.trim()) {continue;}
					try {
						const req = JSON.parse(line) as BackendRequest;
						if (typeof req.id !== 'number' || !req.method || !isToolMethod(req.method)) {
							socket.write(JSON.stringify({ id: req.id, error: 'Invalid request' }) + '\n');
							continue;
						}
						const projectList = await buildProjectList(getProjects, vscode.workspace.workspaceFolders);
						const result = await handleToolCall(projectList, req.method, req.params ?? {}, logLine);
						const res: BackendResponse = { id: req.id, result };
						socket.write(JSON.stringify(res) + '\n');
					} catch (err) {
						const req = (() => {
							try {
								return JSON.parse(line) as BackendRequest;
							} catch {
								return { id: -1 };
							}
						})();
						const res: BackendResponse = { id: req.id, error: err instanceof Error ? err.message : String(err) };
						socket.write(JSON.stringify(res) + '\n');
					}
				}
			});
		});

		server.listen(0, '127.0.0.1', () => {
			// Prevent the server itself from keeping the Node event loop alive (important for unit tests).
			server.unref?.();
			const addr = server.address();
			const port = typeof addr === 'object' && addr !== null && 'port' in addr ? (addr as { port: number }).port : 0;
			if (port <= 0) {
				server.close();
				reject(new Error('Could not bind to a port'));
				return;
			}
			resolve({
				port,
				dispose: () => { server.close(); }
			});
		});
		server.on('error', reject);
		});
	})();
}
