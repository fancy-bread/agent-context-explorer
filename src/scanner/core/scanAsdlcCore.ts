// Shared ASDLC artifact scanning - NO vscode dependency
import * as path from 'path';
import type { IFileSystem } from './types';
import type {
	CoreAsdlcArtifacts,
	CoreAgentsMdInfo,
	CoreSpecFile,
	CoreSchemaFile
} from './types';
import { FileType } from './types';
import { hasSection, extractSchemaId, parseSections } from './asdlcHelpers';

export async function scanAsdlcCore(
	fs: IFileSystem,
	projectRoot: string
): Promise<CoreAsdlcArtifacts> {
	const [agentsMd, specs, schemas] = await Promise.all([
		scanAgentsMdCore(fs, projectRoot),
		scanSpecsCore(fs, projectRoot),
		scanSchemasCore(fs, projectRoot)
	]);

	return {
		agentsMd,
		specs,
		schemas,
		hasAnyArtifacts: agentsMd.exists || specs.exists || schemas.exists
	};
}

async function scanAgentsMdCore(
	fs: IFileSystem,
	projectRoot: string
): Promise<CoreAgentsMdInfo> {
	const agentsMdPath = path.join(projectRoot, 'AGENTS.md');

	try {
		const stat = await fs.stat(agentsMdPath);
		if (stat.type !== FileType.File) {
			return { exists: false, sections: [] };
		}

		const content = await fs.readFile(agentsMdPath);
		const text = content.toString('utf8');
		const lines = text.split('\n');
		const sections = parseSections(lines);

		return {
			exists: true,
			path: agentsMdPath,
			content: text,
			sections: sections.map((s) => ({
				level: s.level,
				title: s.title,
				startLine: s.startLine,
				endLine: s.endLine
			}))
		};
	} catch {
		return { exists: false, sections: [] };
	}
}

async function scanSpecsCore(
	fs: IFileSystem,
	projectRoot: string
): Promise<{ exists: boolean; path?: string; specs: CoreSpecFile[] }> {
	const specsPath = path.join(projectRoot, 'specs');

	try {
		const stat = await fs.stat(specsPath);
		if (stat.type !== FileType.Directory) {
			return { exists: false, specs: [] };
		}

		const entries = await fs.readDirectory(specsPath);
		const specs: CoreSpecFile[] = [];

		for (const [name, fileType] of entries) {
			if (fileType !== FileType.Directory) {continue;}

			const specFilePath = path.join(specsPath, name, 'spec.md');
			try {
				const stat = await fs.stat(specFilePath);
				if (stat.type !== FileType.File) {continue;}

				const content = await fs.readFile(specFilePath);
				const text = content.toString('utf8');

				specs.push({
					domain: name,
					path: specFilePath,
					hasBlueprint: hasSection(text, 'Blueprint'),
					hasContract: hasSection(text, 'Contract'),
					lastModified: stat.mtime ? new Date(stat.mtime).toISOString() : undefined
				});
			} catch {
				// spec.md doesn't exist or can't be read
			}
		}

		return {
			exists: true,
			path: specsPath,
			specs
		};
	} catch {
		return { exists: false, specs: [] };
	}
}

async function scanSchemasCore(
	fs: IFileSystem,
	projectRoot: string
): Promise<{ exists: boolean; path?: string; schemas: CoreSchemaFile[] }> {
	const schemasPath = path.join(projectRoot, 'schemas');

	try {
		const stat = await fs.stat(schemasPath);
		if (stat.type !== FileType.Directory) {
			return { exists: false, schemas: [] };
		}

		const entries = await fs.readDirectory(schemasPath);
		const schemas: CoreSchemaFile[] = [];

		for (const [name, fileType] of entries) {
			if (fileType !== FileType.File && fileType !== FileType.SymbolicLink) {continue;}
			if (!name.endsWith('.json')) {continue;}

			const schemaFilePath = path.join(schemasPath, name);
			try {
				const content = await fs.readFile(schemaFilePath);
				const text = content.toString('utf8');
				const schemaId = extractSchemaId(text);
				schemas.push({
					name: name.replace(/\.json$/, ''),
					path: schemaFilePath,
					schemaId
				});
			} catch {
				schemas.push({
					name: name.replace(/\.json$/, ''),
					path: schemaFilePath
				});
			}
		}

		return {
			exists: true,
			path: schemasPath,
			schemas
		};
	} catch {
		return { exists: false, schemas: [] };
	}
}
