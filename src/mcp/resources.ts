// MCP Resources - Resource implementations for browsable content

import * as vscode from 'vscode';
import { RulesScanner } from '../scanner/rulesScanner';
import { CommandsScanner } from '../scanner/commandsScanner';
import { AsdlcArtifactScanner } from '../scanner/asdlcArtifactScanner';
import { ResourceMetadata, ResourceContent, toRuleInfo, toCommandInfo } from './types';

/**
 * MCP Resources handler class
 * Provides resource implementations for browsable content
 */
export class McpResources {
	private workspaceUri: vscode.Uri;

	constructor(workspaceUri: vscode.Uri) {
		this.workspaceUri = workspaceUri;
	}

	// =========================================================================
	// Resource Discovery
	// =========================================================================

	/**
	 * List all available resources
	 */
	async listResources(): Promise<ResourceMetadata[]> {
		const resources: ResourceMetadata[] = [];

		// Add rules resources
		const rulesResources = await this.listRulesResources();
		resources.push(...rulesResources);

		// Add commands resources
		const commandsResources = await this.listCommandsResources();
		resources.push(...commandsResources);

		// Add ASDLC artifact resources
		const asdlcResources = await this.listAsdlcResources();
		resources.push(...asdlcResources);

		return resources;
	}

	/**
	 * List rules resources
	 */
	async listRulesResources(): Promise<ResourceMetadata[]> {
		const scanner = new RulesScanner(this.workspaceUri);
		const rules = await scanner.scanRules();

		// Add list resource
		const resources: ResourceMetadata[] = [
			{
				uri: 'ace://rules',
				name: 'All Rules',
				description: `List of all ${rules.length} Cursor rules`,
				mimeType: 'application/json'
			}
		];

		// Add individual rule resources
		for (const rule of rules) {
			const info = toRuleInfo(rule);
			resources.push({
				uri: `ace://rules/${info.name}`,
				name: info.name,
				description: info.description || `Rule: ${info.name}`,
				mimeType: 'text/markdown'
			});
		}

		return resources;
	}

	/**
	 * List commands resources
	 */
	async listCommandsResources(): Promise<ResourceMetadata[]> {
		const scanner = new CommandsScanner(this.workspaceUri);
		const [workspaceCommands, globalCommands] = await Promise.all([
			scanner.scanWorkspaceCommands(),
			scanner.scanGlobalCommands()
		]);
		const allCommands = [...workspaceCommands, ...globalCommands];

		// Add list resource
		const resources: ResourceMetadata[] = [
			{
				uri: 'ace://commands',
				name: 'All Commands',
				description: `List of all ${allCommands.length} Cursor commands`,
				mimeType: 'application/json'
			}
		];

		// Add individual command resources
		for (const command of allCommands) {
			const info = toCommandInfo(command);
			const locationSuffix = info.location === 'global' ? ' (global)' : '';
			resources.push({
				uri: `ace://commands/${info.name}`,
				name: info.name + locationSuffix,
				description: info.description || `Command: ${info.name}`,
				mimeType: 'text/markdown'
			});
		}

		return resources;
	}

	/**
	 * List ASDLC artifact resources
	 */
	async listAsdlcResources(): Promise<ResourceMetadata[]> {
		const scanner = new AsdlcArtifactScanner(this.workspaceUri);
		const artifacts = await scanner.scanAll();
		const resources: ResourceMetadata[] = [];

		// AGENTS.md resource
		if (artifacts.agentsMd.exists) {
			resources.push({
				uri: 'ace://agents-md',
				name: 'AGENTS.md',
				description: artifacts.agentsMd.mission || 'Project agent constitution',
				mimeType: 'text/markdown'
			});
		}

		// Specs list resource
		if (artifacts.specs.exists) {
			resources.push({
				uri: 'ace://specs',
				name: 'All Specs',
				description: `List of all ${artifacts.specs.specs.length} specifications`,
				mimeType: 'application/json'
			});

			// Individual spec resources
			for (const spec of artifacts.specs.specs) {
				resources.push({
					uri: `ace://specs/${spec.domain}`,
					name: spec.domain,
					description: `Specification: ${spec.domain}`,
					mimeType: 'text/markdown'
				});
			}
		}

		// Schemas list resource
		if (artifacts.schemas.exists) {
			resources.push({
				uri: 'ace://schemas',
				name: 'All Schemas',
				description: `List of all ${artifacts.schemas.schemas.length} JSON schemas`,
				mimeType: 'application/json'
			});

			// Individual schema resources
			for (const schema of artifacts.schemas.schemas) {
				resources.push({
					uri: `ace://schemas/${schema.name}`,
					name: schema.name,
					description: schema.schemaId || `Schema: ${schema.name}`,
					mimeType: 'application/json'
				});
			}
		}

		return resources;
	}

	// =========================================================================
	// Resource Content Retrieval
	// =========================================================================

	/**
	 * Get resource content by URI
	 */
	async getResource(uri: string): Promise<ResourceContent | null> {
		// Parse the URI
		if (!uri.startsWith('ace://')) {
			return null;
		}

		const path = uri.substring('ace://'.length);
		const parts = path.split('/');
		const resourceType = parts[0];
		const resourceName = parts.slice(1).join('/');

		switch (resourceType) {
			case 'rules':
				return this.getRulesResource(resourceName);
			case 'commands':
				return this.getCommandsResource(resourceName);
			case 'agents-md':
				return this.getAgentsMdResource();
			case 'specs':
				return this.getSpecsResource(resourceName);
			case 'schemas':
				return this.getSchemasResource(resourceName);
			default:
				return null;
		}
	}

	/**
	 * Get rules resource content
	 */
	private async getRulesResource(name: string): Promise<ResourceContent | null> {
		const scanner = new RulesScanner(this.workspaceUri);
		const rules = await scanner.scanRules();

		// If no name, return list
		if (!name) {
			const ruleInfos = rules.map(toRuleInfo);
			return {
				uri: 'ace://rules',
				mimeType: 'application/json',
				content: JSON.stringify(ruleInfos, null, 2)
			};
		}

		// Find specific rule
		const normalizedName = name.toLowerCase().replace(/\.(mdc|md)$/, '');
		const rule = rules.find(r => {
			const ruleName = r.fileName.toLowerCase().replace(/\.(mdc|md)$/, '');
			return ruleName === normalizedName;
		});

		if (!rule) {
			return null;
		}

		return {
			uri: `ace://rules/${name}`,
			mimeType: 'text/markdown',
			content: rule.content
		};
	}

	/**
	 * Get commands resource content
	 */
	private async getCommandsResource(name: string): Promise<ResourceContent | null> {
		const scanner = new CommandsScanner(this.workspaceUri);
		const [workspaceCommands, globalCommands] = await Promise.all([
			scanner.scanWorkspaceCommands(),
			scanner.scanGlobalCommands()
		]);
		const allCommands = [...workspaceCommands, ...globalCommands];

		// If no name, return list
		if (!name) {
			const commandInfos = allCommands.map(toCommandInfo);
			return {
				uri: 'ace://commands',
				mimeType: 'application/json',
				content: JSON.stringify(commandInfos, null, 2)
			};
		}

		// Find specific command
		const normalizedName = name.toLowerCase().replace(/\.md$/, '');
		const command = allCommands.find(c => {
			const commandName = c.fileName.toLowerCase().replace(/\.md$/, '');
			return commandName === normalizedName;
		});

		if (!command) {
			return null;
		}

		return {
			uri: `ace://commands/${name}`,
			mimeType: 'text/markdown',
			content: command.content
		};
	}

	/**
	 * Get AGENTS.md resource content
	 */
	private async getAgentsMdResource(): Promise<ResourceContent | null> {
		const scanner = new AsdlcArtifactScanner(this.workspaceUri);
		const artifacts = await scanner.scanAll();

		if (!artifacts.agentsMd.exists || !artifacts.agentsMd.path) {
			return null;
		}

		try {
			const fileUri = vscode.Uri.file(artifacts.agentsMd.path);
			const fileData = await vscode.workspace.fs.readFile(fileUri);
			const content = Buffer.from(fileData).toString('utf8');

			return {
				uri: 'ace://agents-md',
				mimeType: 'text/markdown',
				content
			};
		} catch {
			return null;
		}
	}

	/**
	 * Get specs resource content
	 */
	private async getSpecsResource(name: string): Promise<ResourceContent | null> {
		const scanner = new AsdlcArtifactScanner(this.workspaceUri);
		const artifacts = await scanner.scanAll();

		if (!artifacts.specs.exists) {
			return null;
		}

		// If no name, return list
		if (!name) {
			return {
				uri: 'ace://specs',
				mimeType: 'application/json',
				content: JSON.stringify(artifacts.specs.specs, null, 2)
			};
		}

		// Find specific spec
		const spec = artifacts.specs.specs.find(s => s.domain === name);
		if (!spec) {
			return null;
		}

		try {
			const fileUri = vscode.Uri.file(spec.path);
			const fileData = await vscode.workspace.fs.readFile(fileUri);
			const content = Buffer.from(fileData).toString('utf8');

			return {
				uri: `ace://specs/${name}`,
				mimeType: 'text/markdown',
				content
			};
		} catch {
			return null;
		}
	}

	/**
	 * Get schemas resource content
	 */
	private async getSchemasResource(name: string): Promise<ResourceContent | null> {
		const scanner = new AsdlcArtifactScanner(this.workspaceUri);
		const artifacts = await scanner.scanAll();

		if (!artifacts.schemas.exists) {
			return null;
		}

		// If no name, return list
		if (!name) {
			return {
				uri: 'ace://schemas',
				mimeType: 'application/json',
				content: JSON.stringify(artifacts.schemas.schemas, null, 2)
			};
		}

		// Find specific schema
		const schema = artifacts.schemas.schemas.find(s => s.name === name);
		if (!schema) {
			return null;
		}

		try {
			const fileUri = vscode.Uri.file(schema.path);
			const fileData = await vscode.workspace.fs.readFile(fileUri);
			const content = Buffer.from(fileData).toString('utf8');

			return {
				uri: `ace://schemas/${name}`,
				mimeType: 'application/json',
				content
			};
		} catch {
			return null;
		}
	}
}
