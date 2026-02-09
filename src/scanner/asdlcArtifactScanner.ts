// ASDLC Artifact Scanner - Scan for explicit ASDLC artifacts (AGENTS.md, specs/, schemas/)
// See: specs/scanners/spec.md for architecture and contracts
import * as vscode from 'vscode';
import {
	AgentsMdInfo,
	SpecsInfo,
	SpecFile,
	SchemasInfo,
	SchemaFile,
	AsdlcArtifacts
} from './types';
import {
	parseAgentsMd as parseAgentsMdContent,
	hasSection,
	extractSchemaId
} from './asdlcParsing';

/**
 * Scanner for ASDLC artifacts (AGENTS.md, specs/, schemas/)
 *
 * Replaces optimistic state detection with explicit artifact scanning.
 * Only scans artifacts that developers intentionally create and maintain.
 *
 * @see specs/scanners/spec.md for architecture and contracts
 */
export class AsdlcArtifactScanner {
	constructor(private workspaceRoot: vscode.Uri) {}

	/**
	 * Scan all ASDLC artifacts in the workspace
	 * @returns Combined results from all artifact scans
	 */
	async scanAll(): Promise<AsdlcArtifacts> {
		const [agentsMd, specs, schemas] = await Promise.all([
			this.scanAgentsMd(),
			this.scanSpecs(),
			this.scanSchemas()
		]);

		return {
			agentsMd,
			specs,
			schemas,
			hasAnyArtifacts: agentsMd.exists || specs.exists || schemas.exists
		};
	}

	/**
	 * Scan for AGENTS.md at project root
	 * @returns AGENTS.md information with parsed sections
	 */
	async scanAgentsMd(): Promise<AgentsMdInfo> {
		const agentsMdPath = vscode.Uri.joinPath(this.workspaceRoot, 'AGENTS.md');

		try {
			const stat = await vscode.workspace.fs.stat(agentsMdPath);
			if (stat.type !== vscode.FileType.File) {
				return this.emptyAgentsMdInfo();
			}

			const content = await this.readFile(agentsMdPath);
			return parseAgentsMdContent(content, agentsMdPath.fsPath);
		} catch {
			// File doesn't exist - return empty result (not error)
			return this.emptyAgentsMdInfo();
		}
	}

	/**
	 * Scan specs/ directory for spec.md files
	 * @returns Specs directory information with list of spec files
	 */
	async scanSpecs(): Promise<SpecsInfo> {
		const specsPath = vscode.Uri.joinPath(this.workspaceRoot, 'specs');

		try {
			const stat = await vscode.workspace.fs.stat(specsPath);
			if (stat.type !== vscode.FileType.Directory) {
				return this.emptySpecsInfo();
			}

			const specs = await this.findSpecFiles(specsPath);
			return {
				exists: true,
				path: specsPath.fsPath,
				specs
			};
		} catch {
			// Directory doesn't exist - return empty result (not error)
			return this.emptySpecsInfo();
		}
	}

	/**
	 * Scan schemas/ directory for JSON schema files
	 * @returns Schemas directory information with list of schema files
	 */
	async scanSchemas(): Promise<SchemasInfo> {
		const schemasPath = vscode.Uri.joinPath(this.workspaceRoot, 'schemas');

		try {
			const stat = await vscode.workspace.fs.stat(schemasPath);
			if (stat.type !== vscode.FileType.Directory) {
				return this.emptySchemasInfo();
			}

			const schemas = await this.findSchemaFiles(schemasPath);
			return {
				exists: true,
				path: schemasPath.fsPath,
				schemas
			};
		} catch {
			// Directory doesn't exist - return empty result (not error)
			return this.emptySchemasInfo();
		}
	}

	// =========================================================================
	// Specs Scanning
	// =========================================================================

	private async findSpecFiles(specsPath: vscode.Uri): Promise<SpecFile[]> {
		const specs: SpecFile[] = [];

		try {
			const entries = await vscode.workspace.fs.readDirectory(specsPath);

			for (const [name, type] of entries) {
				if (type === vscode.FileType.Directory) {
					// Look for spec.md in each subdirectory
					const specFilePath = vscode.Uri.joinPath(specsPath, name, 'spec.md');
					try {
						const stat = await vscode.workspace.fs.stat(specFilePath);
						if (stat.type === vscode.FileType.File) {
							const content = await this.readFile(specFilePath);
							specs.push({
								domain: name,
								path: specFilePath.fsPath,
								hasBlueprint: hasSection(content, 'Blueprint'),
								hasContract: hasSection(content, 'Contract'),
								lastModified: new Date(stat.mtime).toISOString()
							});
						}
					} catch {
						// spec.md doesn't exist in this directory - skip
					}
				}
			}
		} catch {
			// Error reading directory - return empty array
		}

		return specs;
	}

	// =========================================================================
	// Schemas Scanning
	// =========================================================================

	private async findSchemaFiles(schemasPath: vscode.Uri): Promise<SchemaFile[]> {
		const schemas: SchemaFile[] = [];

		try {
			const entries = await vscode.workspace.fs.readDirectory(schemasPath);

			for (const [name, type] of entries) {
				if (type === vscode.FileType.File && name.endsWith('.json')) {
					const schemaFilePath = vscode.Uri.joinPath(schemasPath, name);
					try {
						const content = await this.readFile(schemaFilePath);
						const schemaId = extractSchemaId(content);
						schemas.push({
							name,
							path: schemaFilePath.fsPath,
							schemaId
						});
					} catch {
						// Error reading schema file - add with no schemaId
						schemas.push({
							name,
							path: schemaFilePath.fsPath
						});
					}
				}
			}
		} catch {
			// Error reading directory - return empty array
		}

		return schemas;
	}

	// =========================================================================
	// Utilities
	// =========================================================================

	private async readFile(uri: vscode.Uri): Promise<string> {
		const content = await vscode.workspace.fs.readFile(uri);
		return Buffer.from(content).toString('utf8');
	}

	private emptyAgentsMdInfo(): AgentsMdInfo {
		return {
			exists: false,
			sections: []
		};
	}

	private emptySpecsInfo(): SpecsInfo {
		return {
			exists: false,
			specs: []
		};
	}

	private emptySchemasInfo(): SchemasInfo {
		return {
			exists: false,
			schemas: []
		};
	}
}
