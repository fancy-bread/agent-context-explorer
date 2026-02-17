// ASDLC Artifact Scanner - Scan for explicit ASDLC artifacts (AGENTS.md, specs/, schemas/)
// Uses shared scanAsdlcCore with VSCodeFsAdapter
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
import { parseAgentsMd as parseAgentsMdContent } from './asdlcParsing';
import { VSCodeFsAdapter } from './adapters/vscodeFsAdapter';
import { scanAsdlcCore } from './core/scanAsdlcCore';

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
		try {
			const fs = new VSCodeFsAdapter();
			const core = await scanAsdlcCore(fs, this.workspaceRoot.fsPath);

			const agentsMd: AgentsMdInfo = core.agentsMd.exists && core.agentsMd.content && core.agentsMd.path
				? parseAgentsMdContent(core.agentsMd.content, core.agentsMd.path)
				: { exists: false, sections: [] };

			const specs: SpecsInfo = {
				exists: core.specs.exists,
				path: core.specs.path,
				specs: core.specs.specs.map((s) => ({
					domain: s.domain,
					path: s.path,
					hasBlueprint: s.hasBlueprint,
					hasContract: s.hasContract,
					lastModified: s.lastModified
				}))
			};

			const schemas: SchemasInfo = {
				exists: core.schemas.exists,
				path: core.schemas.path,
				schemas: core.schemas.schemas.map((s) => ({
					name: s.name,
					path: s.path,
					schemaId: s.schemaId
				}))
			};

			return {
				agentsMd,
				specs,
				schemas,
				hasAnyArtifacts: core.hasAnyArtifacts
			};
		} catch {
			return {
				agentsMd: { exists: false, sections: [] },
				specs: { exists: false, specs: [] },
				schemas: { exists: false, schemas: [] },
				hasAnyArtifacts: false
			};
		}
	}
}
