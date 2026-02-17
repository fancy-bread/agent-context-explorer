// Core scanner types - NO vscode dependency
// Used by shared scan functions in both extension and MCP standalone

/** File type constants (compatible with vscode.FileType) */
export const FileType = {
	Unknown: 0,
	File: 1,
	Directory: 2,
	SymbolicLink: 64
} as const;

export type FileTypeValue = (typeof FileType)[keyof typeof FileType];

/**
 * Filesystem abstraction - allows scanners to work in both
 * VS Code extension (vscode.workspace.fs) and Node (fs/promises) runtimes
 */
export interface IFileSystem {
	readFile(path: string): Promise<Buffer>;
	readDirectory(path: string): Promise<[string, FileTypeValue][]>;
	stat(path: string): Promise<{ type: FileTypeValue; mtime?: number }>;
}

/** Rule metadata (path-based, no vscode.Uri) */
export interface CoreRuleMetadata {
	description: string;
	globs?: string[];
	alwaysApply?: boolean;
}

export interface CoreRule {
	path: string;
	metadata: CoreRuleMetadata;
	content: string;
	fileName: string;
}

export interface CoreCommand {
	path: string;
	content: string;
	fileName: string;
	location: 'workspace' | 'global';
}

export interface CoreSkillMetadata {
	title?: string;
	overview?: string;
	prerequisites?: string[];
	steps?: string[];
	tools?: string[];
	guidance?: Record<string, unknown>;
}

export interface CoreSkill {
	path: string;
	content: string;
	fileName: string;
	location: 'workspace' | 'global';
	metadata?: CoreSkillMetadata;
}

/** Core ASDLC artifacts - reuses structure from scanner/types with path strings */
export interface CoreSpecFile {
	domain: string;
	path: string;
	hasBlueprint: boolean;
	hasContract: boolean;
	lastModified?: string;
}

export interface CoreSchemaFile {
	name: string;
	path: string;
	schemaId?: string;
}

export interface CoreAgentsMdInfo {
	exists: boolean;
	path?: string;
	content?: string;
	sections: Array<{ level: number; title: string; startLine: number; endLine: number }>;
}

export interface CoreAsdlcArtifacts {
	agentsMd: CoreAgentsMdInfo;
	specs: {
		exists: boolean;
		path?: string;
		specs: CoreSpecFile[];
	};
	schemas: {
		exists: boolean;
		path?: string;
		schemas: CoreSchemaFile[];
	};
	hasAnyArtifacts: boolean;
}
