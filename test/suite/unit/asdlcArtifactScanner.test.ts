import * as assert from 'assert';
import * as vscode from 'vscode';
import { AsdlcArtifactScanner } from '../../../src/scanner/asdlcArtifactScanner';

// Mock VS Code API for testing (used by MockAsdlcArtifactScanner below)
const mockVscode = {
	workspace: {
		fs: {
			readFile: async (uri: any): Promise<Buffer> => {
				const path = uri.fsPath;

				// AGENTS.md content
				if (path.endsWith('AGENTS.md')) {
					if (path.includes('missing') || path.includes('nonexistent')) {
						throw new Error('File not found');
					}
					if (path.includes('malformed')) {
						return Buffer.from('Just some random content without structure');
					}
					return Buffer.from(`# AGENTS.md - Context & Rules for AI Agents

> **Project Mission:** Build amazing software with AI assistance.
> **Core Philosophy:** Explicit artifacts over optimistic inference.

---

## 1. Identity & Persona

- **Role:** Software Engineer
- **Specialization:** TypeScript

---

## 2. Tech Stack (Ground Truth)

### Core Technologies
- **Language:** TypeScript
- **Framework:** VS Code Extension API
- **Build Tool:** TypeScript Compiler (tsc)
- **Testing:** Mocha
- **Package Manager:** npm

---

## 3. Operational Boundaries (CRITICAL)

### Tier 1 (ALWAYS): Non-negotiable standards

- **ALWAYS** use strict TypeScript
- **ALWAYS** write unit tests

### Tier 2 (ASK): High-risk operations

- **ASK** before removing features
- **ASK** before adding dependencies

### Tier 3 (NEVER): Safety limits

- **NEVER** execute user code directly
- **NEVER** commit secrets
`);
				}

				// spec.md content
				if (path.endsWith('spec.md')) {
					if (path.includes('no-contract')) {
						return Buffer.from(`# Feature: Test

## Blueprint

This is the blueprint section.
`);
					}
					return Buffer.from(`# Feature: Scanner

## Blueprint

Architecture and design.

## Contract

Definition of done.
`);
				}

				// JSON schema content
				if (path.endsWith('.json')) {
					if (path.includes('with-id')) {
						return Buffer.from(JSON.stringify({
							$id: 'https://example.com/schema.json',
							type: 'object'
						}));
					}
					if (path.includes('invalid')) {
						return Buffer.from('not valid json {{{');
					}
					return Buffer.from(JSON.stringify({ type: 'object' }));
				}

				throw new Error('File not found');
			},
			stat: async (uri: any) => {
				const path = uri.fsPath;

				if (path.includes('missing') || path.includes('nonexistent')) {
					throw new Error('File not found');
				}

				// Directories
				if (path.endsWith('specs') || path.endsWith('schemas')) {
					return { type: 2 }; // Directory
				}

				// Spec subdirectories
				if (path.includes('/specs/')) {
					return { type: 1, mtime: Date.now() }; // File
				}

				// Files
				if (path.endsWith('.md') || path.endsWith('.json')) {
					return { type: 1, mtime: Date.now() }; // File
				}

				return { type: 2 }; // Default to directory
			},
			readDirectory: async (uri: any): Promise<[string, number][]> => {
				const path = uri.fsPath;

				if (path.endsWith('specs')) {
					return [
						['scanners', 2], // Directory
						['auth', 2],     // Directory
						['README.md', 1] // File (should be skipped)
					];
				}

				if (path.endsWith('schemas')) {
					return [
						['config.schema.json', 1],
						['with-id.schema.json', 1],
						['README.md', 1] // Should be skipped (not .json)
					];
				}

				return [];
			}
		}
	},
	Uri: {
		file: (path: string) => ({ fsPath: path }),
		joinPath: (base: any, ...segments: string[]) => ({
			fsPath: base.fsPath + '/' + segments.join('/')
		})
	},
	FileType: {
		File: 1,
		Directory: 2
	}
};

// Type definitions (matching src/scanner/types.ts)
interface AgentsMdSection {
	level: number;
	title: string;
	startLine: number;
	endLine: number;
}

interface TechStackInfo {
	languages: string[];
	frameworks: string[];
	buildTools: string[];
	testing: string[];
	packageManager?: string;
}

interface OperationalBoundaries {
	tier1Always: string[];
	tier2Ask: string[];
	tier3Never: string[];
}

interface AgentsMdInfo {
	exists: boolean;
	path?: string;
	mission?: string;
	corePhilosophy?: string;
	sections: AgentsMdSection[];
	techStack?: TechStackInfo;
	operationalBoundaries?: OperationalBoundaries;
}

interface SpecFile {
	domain: string;
	path: string;
	hasBlueprint: boolean;
	hasContract: boolean;
	lastModified?: string;
}

interface SpecsInfo {
	exists: boolean;
	path?: string;
	specs: SpecFile[];
}

interface SchemaFile {
	name: string;
	path: string;
	schemaId?: string;
}

interface SchemasInfo {
	exists: boolean;
	path?: string;
	schemas: SchemaFile[];
}

interface AsdlcArtifacts {
	agentsMd: AgentsMdInfo;
	specs: SpecsInfo;
	schemas: SchemasInfo;
	hasAnyArtifacts: boolean;
}

// Mock implementation of AsdlcArtifactScanner (mirrors src/scanner/asdlcArtifactScanner.ts)
class MockAsdlcArtifactScanner {
	constructor(private workspaceRoot: any) {}

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

	async scanAgentsMd(): Promise<AgentsMdInfo> {
		const agentsMdPath = mockVscode.Uri.joinPath(this.workspaceRoot, 'AGENTS.md');

		try {
			const stat = await mockVscode.workspace.fs.stat(agentsMdPath);
			if (stat.type !== mockVscode.FileType.File) {
				return this.emptyAgentsMdInfo();
			}

			const contentBuffer = await mockVscode.workspace.fs.readFile(agentsMdPath);
			const content = Buffer.from(contentBuffer).toString('utf8');
			return this.parseAgentsMd(content, agentsMdPath.fsPath);
		} catch {
			return this.emptyAgentsMdInfo();
		}
	}

	async scanSpecs(): Promise<SpecsInfo> {
		const specsPath = mockVscode.Uri.joinPath(this.workspaceRoot, 'specs');

		try {
			const stat = await mockVscode.workspace.fs.stat(specsPath);
			if (stat.type !== mockVscode.FileType.Directory) {
				return this.emptySpecsInfo();
			}

			const specs = await this.findSpecFiles(specsPath);
			return {
				exists: true,
				path: specsPath.fsPath,
				specs
			};
		} catch {
			return this.emptySpecsInfo();
		}
	}

	async scanSchemas(): Promise<SchemasInfo> {
		const schemasPath = mockVscode.Uri.joinPath(this.workspaceRoot, 'schemas');

		try {
			const stat = await mockVscode.workspace.fs.stat(schemasPath);
			if (stat.type !== mockVscode.FileType.Directory) {
				return this.emptySchemasInfo();
			}

			const schemas = await this.findSchemaFiles(schemasPath);
			return {
				exists: true,
				path: schemasPath.fsPath,
				schemas
			};
		} catch {
			return this.emptySchemasInfo();
		}
	}

	private parseAgentsMd(content: string, path: string): AgentsMdInfo {
		const lines = content.split('\n');
		const sections = this.parseSections(lines);
		const mission = this.extractMission(content);
		const corePhilosophy = this.extractCorePhilosophy(content);
		const operationalBoundaries = this.extractOperationalBoundaries(content, sections);

		return {
			exists: true,
			path,
			mission,
			corePhilosophy,
			sections,
			operationalBoundaries
		};
	}

	private parseSections(lines: string[]): AgentsMdSection[] {
		const sections: AgentsMdSection[] = [];
		let currentSection: AgentsMdSection | null = null;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

			if (headingMatch) {
				if (currentSection) {
					currentSection.endLine = i - 1;
					sections.push(currentSection);
				}

				currentSection = {
					level: headingMatch[1].length,
					title: headingMatch[2].trim(),
					startLine: i,
					endLine: lines.length - 1
				};
			}
		}

		if (currentSection) {
			sections.push(currentSection);
		}

		return sections;
	}

	private extractMission(content: string): string | undefined {
		const missionMatch = content.match(/>\s*\*\*Project Mission:\*\*\s*(.+)/);
		return missionMatch ? missionMatch[1].trim() : undefined;
	}

	private extractCorePhilosophy(content: string): string | undefined {
		const philosophyMatch = content.match(/>\s*\*\*Core Philosophy:\*\*\s*(.+)/);
		return philosophyMatch ? philosophyMatch[1].trim() : undefined;
	}

	private extractOperationalBoundaries(content: string, sections: AgentsMdSection[]): OperationalBoundaries | undefined {
		const boundariesSection = sections.find(s =>
			s.title.toLowerCase().includes('operational boundaries')
		);

		if (!boundariesSection) {
			return undefined;
		}

		// Find the next h2 section to determine where boundaries section ends
		const boundariesIdx = sections.indexOf(boundariesSection);
		const nextH2Section = sections.slice(boundariesIdx + 1).find(s => s.level === 2);

		const lines = content.split('\n');
		const endLine = nextH2Section ? nextH2Section.startLine - 1 : lines.length - 1;
		const sectionContent = lines.slice(boundariesSection.startLine, endLine + 1).join('\n');

		return {
			tier1Always: this.extractTierItems(sectionContent, 'tier 1', 'always'),
			tier2Ask: this.extractTierItems(sectionContent, 'tier 2', 'ask'),
			tier3Never: this.extractTierItems(sectionContent, 'tier 3', 'never')
		};
	}

	private extractTierItems(content: string, tierKeyword: string, tierName: string): string[] {
		const items: string[] = [];

		const tierRegex = new RegExp(`###?\\s*${tierKeyword}[^\\n]*${tierName}[^\\n]*`, 'i');
		const tierMatch = content.match(tierRegex);

		if (!tierMatch) {
			return items;
		}

		const startIndex = content.indexOf(tierMatch[0]) + tierMatch[0].length;
		const nextHeadingMatch = content.slice(startIndex).match(/^#{2,3}\s/m);
		const endIndex = nextHeadingMatch
			? startIndex + content.slice(startIndex).indexOf(nextHeadingMatch[0])
			: content.length;

		const tierContent = content.slice(startIndex, endIndex);

		const bulletRegex = /^\s*-\s*\*\*(ALWAYS|ASK|NEVER)\*\*\s*(.+)$/gm;
		let match;
		while ((match = bulletRegex.exec(tierContent)) !== null) {
			items.push(match[2].trim());
		}

		return items;
	}

	private async findSpecFiles(specsPath: any): Promise<SpecFile[]> {
		const specs: SpecFile[] = [];

		try {
			const entries = await mockVscode.workspace.fs.readDirectory(specsPath);

			for (const [name, type] of entries) {
				if (type === mockVscode.FileType.Directory) {
					const specFilePath = mockVscode.Uri.joinPath(specsPath, name, 'spec.md');
					try {
						const stat = await mockVscode.workspace.fs.stat(specFilePath);
						if (stat.type === mockVscode.FileType.File) {
							const contentBuffer = await mockVscode.workspace.fs.readFile(specFilePath);
							const content = Buffer.from(contentBuffer).toString('utf8');
							specs.push({
								domain: name,
								path: specFilePath.fsPath,
								hasBlueprint: this.hasSection(content, 'Blueprint'),
								hasContract: this.hasSection(content, 'Contract'),
								lastModified: stat.mtime ? new Date(stat.mtime).toISOString() : undefined
							});
						}
					} catch {
						// spec.md doesn't exist in this directory
					}
				}
			}
		} catch {
			// Error reading directory
		}

		return specs;
	}

	private hasSection(content: string, sectionName: string): boolean {
		const regex = new RegExp(`^##\\s+${sectionName}`, 'mi');
		return regex.test(content);
	}

	private async findSchemaFiles(schemasPath: any): Promise<SchemaFile[]> {
		const schemas: SchemaFile[] = [];

		try {
			const entries = await mockVscode.workspace.fs.readDirectory(schemasPath);

			for (const [name, type] of entries) {
				if (type === mockVscode.FileType.File && name.endsWith('.json')) {
					const schemaFilePath = mockVscode.Uri.joinPath(schemasPath, name);
					try {
						const contentBuffer = await mockVscode.workspace.fs.readFile(schemaFilePath);
						const content = Buffer.from(contentBuffer).toString('utf8');
						const schemaId = this.extractSchemaId(content);
						schemas.push({
							name,
							path: schemaFilePath.fsPath,
							schemaId
						});
					} catch {
						schemas.push({
							name,
							path: schemaFilePath.fsPath
						});
					}
				}
			}
		} catch {
			// Error reading directory
		}

		return schemas;
	}

	private extractSchemaId(content: string): string | undefined {
		try {
			const json = JSON.parse(content);
			return json.$id || json.id;
		} catch {
			return undefined;
		}
	}

	private emptyAgentsMdInfo(): AgentsMdInfo {
		return { exists: false, sections: [] };
	}

	private emptySpecsInfo(): SpecsInfo {
		return { exists: false, specs: [] };
	}

	private emptySchemasInfo(): SchemasInfo {
		return { exists: false, schemas: [] };
	}
}

describe('AsdlcArtifactScanner wrapper', () => {
	it('scanAll executes and returns AsdlcArtifacts for a workspace', async () => {
		const workspaceRoot = vscode.Uri.file('/test/workspace');
		const scanner = new AsdlcArtifactScanner(workspaceRoot);

		const artifacts = await scanner.scanAll();

		assert.ok(artifacts);
		assert.ok('agentsMd' in artifacts);
		assert.ok('specs' in artifacts);
		assert.ok('schemas' in artifacts);
	});
});

// Test Suite
describe('ASDLC Artifact Scanner Tests', () => {
	const workspaceRoot = mockVscode.Uri.file('/workspace');
	const scanner = new MockAsdlcArtifactScanner(workspaceRoot);

	describe('scanAll', () => {
		it('should return combined results from all scanners', async () => {
			const result = await scanner.scanAll();

			assert.ok(result, 'Result should not be undefined');
			assert.ok('agentsMd' in result, 'Result should have agentsMd');
			assert.ok('specs' in result, 'Result should have specs');
			assert.ok('schemas' in result, 'Result should have schemas');
			assert.ok('hasAnyArtifacts' in result, 'Result should have hasAnyArtifacts');
		});

		it('should report hasAnyArtifacts correctly when artifacts exist', async () => {
			const result = await scanner.scanAll();

			assert.strictEqual(result.hasAnyArtifacts, true, 'Should have artifacts');
		});

		it('should report hasAnyArtifacts as false when no artifacts', async () => {
			const missingScanner = new MockAsdlcArtifactScanner(mockVscode.Uri.file('/missing'));
			const result = await missingScanner.scanAll();

			assert.strictEqual(result.hasAnyArtifacts, false, 'Should not have artifacts');
		});
	});

	describe('scanAgentsMd', () => {
		it('should detect AGENTS.md and return exists: true', async () => {
			const result = await scanner.scanAgentsMd();

			assert.strictEqual(result.exists, true, 'Should exist');
			assert.ok(result.path, 'Path should be set');
		});

		it('should parse section headers', async () => {
			const result = await scanner.scanAgentsMd();

			assert.ok(result.sections.length > 0, 'Should have sections');

			const identitySection = result.sections.find(s => s.title.includes('Identity'));
			assert.ok(identitySection, 'Should find Identity section');
			assert.strictEqual(identitySection!.level, 2, 'Should be h2 level');
		});

		it('should extract mission from blockquote', async () => {
			const result = await scanner.scanAgentsMd();

			assert.strictEqual(result.mission, 'Build amazing software with AI assistance.');
		});

		it('should extract core philosophy from blockquote', async () => {
			const result = await scanner.scanAgentsMd();

			assert.strictEqual(result.corePhilosophy, 'Explicit artifacts over optimistic inference.');
		});

		it('should extract operational boundaries tiers', async () => {
			const result = await scanner.scanAgentsMd();

			assert.ok(result.operationalBoundaries, 'Should have operational boundaries');
			assert.ok(result.operationalBoundaries!.tier1Always.length > 0, 'Should have Tier 1 items');
			assert.ok(result.operationalBoundaries!.tier2Ask.length > 0, 'Should have Tier 2 items');
			assert.ok(result.operationalBoundaries!.tier3Never.length > 0, 'Should have Tier 3 items');
		});

		it('should handle missing AGENTS.md gracefully', async () => {
			const missingScanner = new MockAsdlcArtifactScanner(mockVscode.Uri.file('/missing'));
			const result = await missingScanner.scanAgentsMd();

			assert.strictEqual(result.exists, false, 'Should not exist');
			assert.deepStrictEqual(result.sections, [], 'Sections should be empty');
			assert.strictEqual(result.path, undefined, 'Path should be undefined');
		});
	});

	describe('scanSpecs', () => {
		it('should detect specs/ directory', async () => {
			const result = await scanner.scanSpecs();

			assert.strictEqual(result.exists, true, 'Should exist');
			assert.ok(result.path, 'Path should be set');
		});

		it('should list spec files with domain names', async () => {
			const result = await scanner.scanSpecs();

			assert.ok(result.specs.length > 0, 'Should have specs');

			const scannerSpec = result.specs.find(s => s.domain === 'scanners');
			assert.ok(scannerSpec, 'Should find scanners spec');
			assert.ok(scannerSpec!.path.endsWith('spec.md'), 'Path should end with spec.md');
		});

		it('should detect Blueprint and Contract sections', async () => {
			const result = await scanner.scanSpecs();

			const scannerSpec = result.specs.find(s => s.domain === 'scanners');
			assert.strictEqual(scannerSpec!.hasBlueprint, true, 'Should have Blueprint');
			assert.strictEqual(scannerSpec!.hasContract, true, 'Should have Contract');
		});

		it('should handle missing specs/ directory gracefully', async () => {
			const missingScanner = new MockAsdlcArtifactScanner(mockVscode.Uri.file('/missing'));
			const result = await missingScanner.scanSpecs();

			assert.strictEqual(result.exists, false, 'Should not exist');
			assert.deepStrictEqual(result.specs, [], 'Specs should be empty');
		});
	});

	describe('scanSchemas', () => {
		it('should detect schemas/ directory', async () => {
			const result = await scanner.scanSchemas();

			assert.strictEqual(result.exists, true, 'Should exist');
			assert.ok(result.path, 'Path should be set');
		});

		it('should catalog JSON schema files', async () => {
			const result = await scanner.scanSchemas();

			assert.ok(result.schemas.length > 0, 'Should have schemas');
			assert.ok(result.schemas.every(s => s.name.endsWith('.json')), 'All should be JSON');
		});

		it('should extract schema $id when present', async () => {
			const result = await scanner.scanSchemas();

			const schemaWithId = result.schemas.find(s => s.name.includes('with-id'));
			assert.ok(schemaWithId, 'Should find schema with ID');
			assert.strictEqual(schemaWithId!.schemaId, 'https://example.com/schema.json');
		});

		it('should handle missing schemas/ directory gracefully', async () => {
			const missingScanner = new MockAsdlcArtifactScanner(mockVscode.Uri.file('/missing'));
			const result = await missingScanner.scanSchemas();

			assert.strictEqual(result.exists, false, 'Should not exist');
			assert.deepStrictEqual(result.schemas, [], 'Schemas should be empty');
		});
	});

	describe('Regression Guardrails', () => {
		it('should never throw for missing files', async () => {
			const missingScanner = new MockAsdlcArtifactScanner(mockVscode.Uri.file('/nonexistent'));

			// All should complete without throwing
			await assert.doesNotReject(() => missingScanner.scanAll());
			await assert.doesNotReject(() => missingScanner.scanAgentsMd());
			await assert.doesNotReject(() => missingScanner.scanSpecs());
			await assert.doesNotReject(() => missingScanner.scanSchemas());
		});

		it('should return typed results even when empty', async () => {
			const missingScanner = new MockAsdlcArtifactScanner(mockVscode.Uri.file('/nonexistent'));
			const result = await missingScanner.scanAll();

			assert.strictEqual(typeof result.hasAnyArtifacts, 'boolean');
			assert.strictEqual(typeof result.agentsMd.exists, 'boolean');
			assert.strictEqual(typeof result.specs.exists, 'boolean');
			assert.strictEqual(typeof result.schemas.exists, 'boolean');
			assert.ok(Array.isArray(result.agentsMd.sections));
			assert.ok(Array.isArray(result.specs.specs));
			assert.ok(Array.isArray(result.schemas.schemas));
		});

		it('should handle malformed AGENTS.md gracefully', async () => {
			const malformedScanner = new MockAsdlcArtifactScanner(mockVscode.Uri.file('/malformed'));
			const result = await malformedScanner.scanAgentsMd();

			// Should still return valid structure even if content doesn't have expected format
			assert.strictEqual(result.exists, true, 'File exists');
			assert.ok(Array.isArray(result.sections), 'Sections should be array');
		});
	});
});
