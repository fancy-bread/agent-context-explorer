import * as assert from 'assert';

// =============================================================================
// Type Definitions (matching src/scanner/types.ts)
// =============================================================================

type ComplianceStatus = 'pass' | 'fail' | 'warn';
type PillarName = 'factory-architecture' | 'standardized-parts' | 'quality-control';

interface PillarCheck {
	name: string;
	status: ComplianceStatus;
	message: string;
	details?: string[];
}

interface PillarResult {
	pillar: PillarName;
	status: ComplianceStatus;
	checks: PillarCheck[];
	summary: string;
}

interface ComplianceReport {
	timestamp: string;
	projectPath: string;
	overallStatus: ComplianceStatus;
	pillars: PillarResult[];
	recommendations: string[];
}

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

// =============================================================================
// Mock Artifact Factories
// =============================================================================

function createEmptyArtifacts(): AsdlcArtifacts {
	return {
		agentsMd: { exists: false, sections: [] },
		specs: { exists: false, specs: [] },
		schemas: { exists: false, schemas: [] },
		hasAnyArtifacts: false
	};
}

function createFullyCompliantArtifacts(): AsdlcArtifacts {
	return {
		agentsMd: {
			exists: true,
			path: '/test/AGENTS.md',
			mission: 'Build amazing software with AI assistance.',
			corePhilosophy: 'Explicit artifacts over optimistic inference.',
			sections: [
				{ level: 1, title: 'AGENTS.md', startLine: 0, endLine: 10 },
				{ level: 2, title: 'Tech Stack', startLine: 11, endLine: 20 },
				{ level: 2, title: 'Operational Boundaries', startLine: 21, endLine: 40 },
				{ level: 2, title: 'Development Map', startLine: 41, endLine: 50 }
			],
			techStack: {
				languages: ['TypeScript'],
				frameworks: ['VS Code Extension API'],
				buildTools: ['tsc'],
				testing: ['Mocha'],
				packageManager: 'npm'
			},
			operationalBoundaries: {
				tier1Always: ['use strict TypeScript', 'write unit tests'],
				tier2Ask: ['before removing features', 'before adding dependencies'],
				tier3Never: ['execute user code directly', 'commit secrets']
			}
		},
		specs: {
			exists: true,
			path: '/test/specs',
			specs: [
				{ domain: 'scanners', path: '/test/specs/scanners/spec.md', hasBlueprint: true, hasContract: true }
			]
		},
		schemas: {
			exists: true,
			path: '/test/schemas',
			schemas: [
				{ name: 'config.schema.json', path: '/test/schemas/config.schema.json', schemaId: 'https://example.com/config' }
			]
		},
		hasAnyArtifacts: true
	};
}

function createPartialArtifacts(): AsdlcArtifacts {
	return {
		agentsMd: {
			exists: true,
			path: '/test/AGENTS.md',
			mission: 'Build software.',
			sections: [
				{ level: 1, title: 'AGENTS.md', startLine: 0, endLine: 5 }
			]
			// No techStack, no operationalBoundaries
		},
		specs: { exists: false, specs: [] },
		schemas: { exists: false, schemas: [] },
		hasAnyArtifacts: true
	};
}

function createNoMissionArtifacts(): AsdlcArtifacts {
	return {
		agentsMd: {
			exists: true,
			path: '/test/AGENTS.md',
			sections: [
				{ level: 1, title: 'AGENTS.md', startLine: 0, endLine: 5 }
			]
			// No mission
		},
		specs: { exists: false, specs: [] },
		schemas: { exists: false, schemas: [] },
		hasAnyArtifacts: true
	};
}

function createPartialBoundariesArtifacts(): AsdlcArtifacts {
	return {
		agentsMd: {
			exists: true,
			path: '/test/AGENTS.md',
			mission: 'Build software.',
			sections: [
				{ level: 1, title: 'AGENTS.md', startLine: 0, endLine: 5 },
				{ level: 2, title: 'Operational Boundaries', startLine: 6, endLine: 20 }
			],
			operationalBoundaries: {
				tier1Always: ['use strict TypeScript'],
				tier2Ask: [], // Empty Tier 2 (warn)
				tier3Never: ['commit secrets']
			}
		},
		specs: { exists: false, specs: [] },
		schemas: { exists: false, schemas: [] },
		hasAnyArtifacts: true
	};
}

function createMissingTier1And3Artifacts(): AsdlcArtifacts {
	return {
		agentsMd: {
			exists: true,
			path: '/test/AGENTS.md',
			mission: 'Build software.',
			sections: [
				{ level: 1, title: 'AGENTS.md', startLine: 0, endLine: 5 },
				{ level: 2, title: 'Operational Boundaries', startLine: 6, endLine: 20 }
			],
			operationalBoundaries: {
				tier1Always: [], // Empty (fail)
				tier2Ask: ['ask before deleting'],
				tier3Never: [] // Empty (fail)
			}
		},
		specs: { exists: false, specs: [] },
		schemas: { exists: false, schemas: [] },
		hasAnyArtifacts: true
	};
}

// =============================================================================
// Mock Implementation of AsdlcComplianceScanner
// =============================================================================

class MockAsdlcComplianceScanner {
	private mockArtifacts: AsdlcArtifacts;

	constructor(private workspaceRoot: string, artifacts: AsdlcArtifacts) {
		this.mockArtifacts = artifacts;
	}

	async audit(): Promise<ComplianceReport> {
		const artifacts = this.mockArtifacts;

		const factoryArchitecture = this.validateFactoryArchitecture(artifacts);
		const standardizedParts = this.validateStandardizedParts(artifacts);
		const qualityControl = this.validateQualityControl(artifacts);

		const pillars = [factoryArchitecture, standardizedParts, qualityControl];
		const overallStatus = this.calculateOverallStatus(pillars);
		const recommendations = this.generateRecommendations(pillars);

		return {
			timestamp: new Date().toISOString(),
			projectPath: this.workspaceRoot,
			overallStatus,
			pillars,
			recommendations
		};
	}

	// =========================================================================
	// Pillar 1: Factory Architecture
	// =========================================================================

	validateFactoryArchitecture(artifacts: AsdlcArtifacts): PillarResult {
		const checks: PillarCheck[] = [];

		checks.push(this.checkProjectIdentity(artifacts));
		checks.push(this.checkTechStack(artifacts));
		checks.push(this.checkDevelopmentMap(artifacts));

		return this.createPillarResult('factory-architecture', checks);
	}

	private checkProjectIdentity(artifacts: AsdlcArtifacts): PillarCheck {
		if (!artifacts.agentsMd.exists) {
			return {
				name: 'Project Identity',
				status: 'fail',
				message: 'No AGENTS.md found - project identity not defined',
				details: ['Create AGENTS.md with Project Mission defined']
			};
		}

		if (!artifacts.agentsMd.mission) {
			return {
				name: 'Project Identity',
				status: 'fail',
				message: 'AGENTS.md exists but Project Mission not defined',
				details: ['Add "> **Project Mission:** ..." blockquote to AGENTS.md']
			};
		}

		return {
			name: 'Project Identity',
			status: 'pass',
			message: `Project mission defined: "${artifacts.agentsMd.mission.substring(0, 50)}..."`
		};
	}

	private checkTechStack(artifacts: AsdlcArtifacts): PillarCheck {
		if (!artifacts.agentsMd.exists) {
			return {
				name: 'Tech Stack',
				status: 'warn',
				message: 'No AGENTS.md found - tech stack not documented',
				details: ['Create AGENTS.md with Tech Stack section']
			};
		}

		if (!artifacts.agentsMd.techStack) {
			return {
				name: 'Tech Stack',
				status: 'warn',
				message: 'AGENTS.md exists but Tech Stack section not found',
				details: ['Add "## Tech Stack" section to AGENTS.md']
			};
		}

		const tech = artifacts.agentsMd.techStack;
		const hasContent =
			tech.languages.length > 0 ||
			tech.frameworks.length > 0 ||
			tech.buildTools.length > 0;

		if (!hasContent) {
			return {
				name: 'Tech Stack',
				status: 'warn',
				message: 'Tech Stack section exists but is empty',
				details: ['Populate Tech Stack with languages, frameworks, and build tools']
			};
		}

		return {
			name: 'Tech Stack',
			status: 'pass',
			message: 'Tech stack documented'
		};
	}

	private checkDevelopmentMap(artifacts: AsdlcArtifacts): PillarCheck {
		if (!artifacts.agentsMd.exists) {
			return {
				name: 'Development Map',
				status: 'warn',
				message: 'No AGENTS.md found - development map not documented',
				details: ['Create AGENTS.md with Development Map section']
			};
		}

		const devMapSection = artifacts.agentsMd.sections.find(s =>
			s.title.toLowerCase().includes('development map') ||
			s.title.toLowerCase().includes('key files') ||
			s.title.toLowerCase().includes('project structure') ||
			s.title.toLowerCase().includes('architecture')
		);

		if (!devMapSection) {
			return {
				name: 'Development Map',
				status: 'warn',
				message: 'AGENTS.md exists but Development Map section not found',
				details: ['Add "## Development Map" section to AGENTS.md with key files and architecture']
			};
		}

		return {
			name: 'Development Map',
			status: 'pass',
			message: `Development map found: "${devMapSection.title}"`
		};
	}

	// =========================================================================
	// Pillar 2: Standardized Parts
	// =========================================================================

	validateStandardizedParts(artifacts: AsdlcArtifacts): PillarResult {
		const checks: PillarCheck[] = [];

		checks.push(this.checkAgentsMdExists(artifacts));
		checks.push(this.checkSpecsExists(artifacts));
		checks.push(this.checkSchemasExists(artifacts));

		return this.createPillarResult('standardized-parts', checks);
	}

	private checkAgentsMdExists(artifacts: AsdlcArtifacts): PillarCheck {
		if (!artifacts.agentsMd.exists) {
			return {
				name: 'AGENTS.md',
				status: 'fail',
				message: 'AGENTS.md not found at project root',
				details: ['Create AGENTS.md to define project context for AI agents']
			};
		}

		const sectionCount = artifacts.agentsMd.sections.length;
		return {
			name: 'AGENTS.md',
			status: 'pass',
			message: `AGENTS.md exists with ${sectionCount} sections`
		};
	}

	private checkSpecsExists(artifacts: AsdlcArtifacts): PillarCheck {
		if (!artifacts.specs.exists) {
			return {
				name: 'specs/ Directory',
				status: 'warn',
				message: 'specs/ directory not found',
				details: ['Create specs/ directory for living specifications']
			};
		}

		if (artifacts.specs.specs.length === 0) {
			return {
				name: 'specs/ Directory',
				status: 'warn',
				message: 'specs/ directory exists but no spec.md files found',
				details: ['Add feature specs at specs/{feature-domain}/spec.md']
			};
		}

		const specCount = artifacts.specs.specs.length;
		return {
			name: 'specs/ Directory',
			status: 'pass',
			message: `${specCount} spec(s) found`
		};
	}

	private checkSchemasExists(artifacts: AsdlcArtifacts): PillarCheck {
		if (!artifacts.schemas.exists) {
			return {
				name: 'schemas/ Directory',
				status: 'warn',
				message: 'schemas/ directory not found (optional)',
				details: ['Consider creating schemas/ directory for JSON Schema definitions']
			};
		}

		if (artifacts.schemas.schemas.length === 0) {
			return {
				name: 'schemas/ Directory',
				status: 'warn',
				message: 'schemas/ directory exists but no JSON schema files found',
				details: ['Add JSON Schema files for data validation']
			};
		}

		const schemaCount = artifacts.schemas.schemas.length;
		return {
			name: 'schemas/ Directory',
			status: 'pass',
			message: `${schemaCount} schema(s) found`
		};
	}

	// =========================================================================
	// Pillar 3: Quality Control
	// =========================================================================

	validateQualityControl(artifacts: AsdlcArtifacts): PillarResult {
		const checks: PillarCheck[] = [];

		checks.push(this.checkOperationalBoundaries(artifacts));
		checks.push(this.checkTier1Always(artifacts));
		checks.push(this.checkTier2Ask(artifacts));
		checks.push(this.checkTier3Never(artifacts));

		return this.createPillarResult('quality-control', checks);
	}

	private checkOperationalBoundaries(artifacts: AsdlcArtifacts): PillarCheck {
		if (!artifacts.agentsMd.exists) {
			return {
				name: 'Operational Boundaries',
				status: 'fail',
				message: 'No AGENTS.md found - operational boundaries not defined',
				details: ['Create AGENTS.md with Operational Boundaries section']
			};
		}

		const boundariesSection = artifacts.agentsMd.sections.find(s =>
			s.title.toLowerCase().includes('operational boundaries')
		);

		if (!boundariesSection) {
			return {
				name: 'Operational Boundaries',
				status: 'fail',
				message: 'AGENTS.md exists but Operational Boundaries section not found',
				details: ['Add "## Operational Boundaries" section to AGENTS.md']
			};
		}

		if (!artifacts.agentsMd.operationalBoundaries) {
			return {
				name: 'Operational Boundaries',
				status: 'warn',
				message: 'Operational Boundaries section found but could not parse tier content',
				details: ['Ensure tier sections follow expected format (Tier 1/2/3 with ALWAYS/ASK/NEVER items)']
			};
		}

		return {
			name: 'Operational Boundaries',
			status: 'pass',
			message: 'Operational Boundaries section found and parsed'
		};
	}

	private checkTier1Always(artifacts: AsdlcArtifacts): PillarCheck {
		const boundaries = artifacts.agentsMd.operationalBoundaries;

		if (!boundaries) {
			return {
				name: 'Tier 1 (ALWAYS)',
				status: 'fail',
				message: 'No operational boundaries found',
				details: ['Define Tier 1 (ALWAYS) rules for non-negotiable standards']
			};
		}

		if (boundaries.tier1Always.length === 0) {
			return {
				name: 'Tier 1 (ALWAYS)',
				status: 'fail',
				message: 'Tier 1 (ALWAYS) section is empty',
				details: ['Add non-negotiable standards that agents must ALWAYS follow']
			};
		}

		return {
			name: 'Tier 1 (ALWAYS)',
			status: 'pass',
			message: `${boundaries.tier1Always.length} non-negotiable standard(s) defined`
		};
	}

	private checkTier2Ask(artifacts: AsdlcArtifacts): PillarCheck {
		const boundaries = artifacts.agentsMd.operationalBoundaries;

		if (!boundaries) {
			return {
				name: 'Tier 2 (ASK)',
				status: 'warn',
				message: 'No operational boundaries found',
				details: ['Define Tier 2 (ASK) rules for high-risk operations']
			};
		}

		if (boundaries.tier2Ask.length === 0) {
			return {
				name: 'Tier 2 (ASK)',
				status: 'warn',
				message: 'Tier 2 (ASK) section is empty (optional)',
				details: ['Consider adding operations that require human-in-the-loop approval']
			};
		}

		return {
			name: 'Tier 2 (ASK)',
			status: 'pass',
			message: `${boundaries.tier2Ask.length} high-risk operation(s) defined`
		};
	}

	private checkTier3Never(artifacts: AsdlcArtifacts): PillarCheck {
		const boundaries = artifacts.agentsMd.operationalBoundaries;

		if (!boundaries) {
			return {
				name: 'Tier 3 (NEVER)',
				status: 'fail',
				message: 'No operational boundaries found',
				details: ['Define Tier 3 (NEVER) rules for forbidden actions']
			};
		}

		if (boundaries.tier3Never.length === 0) {
			return {
				name: 'Tier 3 (NEVER)',
				status: 'fail',
				message: 'Tier 3 (NEVER) section is empty',
				details: ['Add safety limits - actions that agents must NEVER perform']
			};
		}

		return {
			name: 'Tier 3 (NEVER)',
			status: 'pass',
			message: `${boundaries.tier3Never.length} safety limit(s) defined`
		};
	}

	// =========================================================================
	// Report Generation
	// =========================================================================

	private createPillarResult(pillar: PillarName, checks: PillarCheck[]): PillarResult {
		const status = this.calculatePillarStatus(checks);
		const summary = this.generatePillarSummary(pillar, checks, status);

		return {
			pillar,
			status,
			checks,
			summary
		};
	}

	private calculatePillarStatus(checks: PillarCheck[]): ComplianceStatus {
		if (checks.some(c => c.status === 'fail')) {
			return 'fail';
		}
		if (checks.some(c => c.status === 'warn')) {
			return 'warn';
		}
		return 'pass';
	}

	private calculateOverallStatus(pillars: PillarResult[]): ComplianceStatus {
		if (pillars.some(p => p.status === 'fail')) {
			return 'fail';
		}
		if (pillars.some(p => p.status === 'warn')) {
			return 'warn';
		}
		return 'pass';
	}

	private generatePillarSummary(pillar: PillarName, checks: PillarCheck[], status: ComplianceStatus): string {
		const passed = checks.filter(c => c.status === 'pass').length;
		const total = checks.length;

		const pillarNames: Record<PillarName, string> = {
			'factory-architecture': 'Factory Architecture',
			'standardized-parts': 'Standardized Parts',
			'quality-control': 'Quality Control'
		};

		const statusEmoji = status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : '❌';
		return `${statusEmoji} ${pillarNames[pillar]}: ${passed}/${total} checks passed`;
	}

	private generateRecommendations(pillars: PillarResult[]): string[] {
		const recommendations: string[] = [];

		for (const pillar of pillars) {
			for (const check of pillar.checks) {
				if (check.status === 'fail' && check.details) {
					recommendations.push(...check.details);
				}
			}
		}

		for (const pillar of pillars) {
			for (const check of pillar.checks) {
				if (check.status === 'warn' && check.details) {
					recommendations.push(...check.details.map(d => `[Optional] ${d}`));
				}
			}
		}

		return recommendations;
	}
}

// =============================================================================
// Test Suite
// =============================================================================

describe('ASDLC Compliance Scanner Tests', () => {
	describe('Full Audit', () => {
		it('should pass all pillars for fully compliant project', async () => {
			const artifacts = createFullyCompliantArtifacts();
			const scanner = new MockAsdlcComplianceScanner('/test/project', artifacts);
			const report = await scanner.audit();

			assert.strictEqual(report.overallStatus, 'pass');
			assert.strictEqual(report.pillars.length, 3);
			assert.strictEqual(report.pillars[0].status, 'pass');
			assert.strictEqual(report.pillars[1].status, 'pass');
			assert.strictEqual(report.pillars[2].status, 'pass');
			assert.strictEqual(report.recommendations.length, 0);
		});

		it('should fail for project with no artifacts', async () => {
			const artifacts = createEmptyArtifacts();
			const scanner = new MockAsdlcComplianceScanner('/test/project', artifacts);
			const report = await scanner.audit();

			assert.strictEqual(report.overallStatus, 'fail');
			assert.ok(report.recommendations.length > 0);
		});

		it('should include project path and timestamp', async () => {
			const artifacts = createFullyCompliantArtifacts();
			const scanner = new MockAsdlcComplianceScanner('/test/project', artifacts);
			const report = await scanner.audit();

			assert.strictEqual(report.projectPath, '/test/project');
			assert.ok(report.timestamp);
			assert.ok(new Date(report.timestamp).getTime() > 0);
		});
	});

	describe('Pillar 1: Factory Architecture', () => {
		it('should pass when AGENTS.md has mission, tech stack, and dev map', async () => {
			const artifacts = createFullyCompliantArtifacts();
			const scanner = new MockAsdlcComplianceScanner('/test/project', artifacts);
			const pillar = scanner.validateFactoryArchitecture(artifacts);

			assert.strictEqual(pillar.status, 'pass');
			assert.strictEqual(pillar.pillar, 'factory-architecture');
			assert.strictEqual(pillar.checks.length, 3);
			assert.ok(pillar.checks.every(c => c.status === 'pass'));
		});

		it('should fail when mission is missing', async () => {
			const artifacts = createNoMissionArtifacts();
			const scanner = new MockAsdlcComplianceScanner('/test/project', artifacts);
			const pillar = scanner.validateFactoryArchitecture(artifacts);

			assert.strictEqual(pillar.status, 'fail');
			const identityCheck = pillar.checks.find(c => c.name === 'Project Identity');
			assert.ok(identityCheck);
			assert.strictEqual(identityCheck.status, 'fail');
		});

		it('should warn when tech stack is missing', async () => {
			const artifacts = createPartialArtifacts();
			const scanner = new MockAsdlcComplianceScanner('/test/project', artifacts);
			const pillar = scanner.validateFactoryArchitecture(artifacts);

			const techStackCheck = pillar.checks.find(c => c.name === 'Tech Stack');
			assert.ok(techStackCheck);
			assert.strictEqual(techStackCheck.status, 'warn');
		});

		it('should warn when development map is missing', async () => {
			const artifacts = createPartialArtifacts();
			const scanner = new MockAsdlcComplianceScanner('/test/project', artifacts);
			const pillar = scanner.validateFactoryArchitecture(artifacts);

			const devMapCheck = pillar.checks.find(c => c.name === 'Development Map');
			assert.ok(devMapCheck);
			assert.strictEqual(devMapCheck.status, 'warn');
		});
	});

	describe('Pillar 2: Standardized Parts', () => {
		it('should pass when AGENTS.md and specs/ exist', async () => {
			const artifacts = createFullyCompliantArtifacts();
			const scanner = new MockAsdlcComplianceScanner('/test/project', artifacts);
			const pillar = scanner.validateStandardizedParts(artifacts);

			assert.strictEqual(pillar.status, 'pass');
			assert.strictEqual(pillar.pillar, 'standardized-parts');
		});

		it('should fail when AGENTS.md is missing', async () => {
			const artifacts = createEmptyArtifacts();
			const scanner = new MockAsdlcComplianceScanner('/test/project', artifacts);
			const pillar = scanner.validateStandardizedParts(artifacts);

			assert.strictEqual(pillar.status, 'fail');
			const agentsMdCheck = pillar.checks.find(c => c.name === 'AGENTS.md');
			assert.ok(agentsMdCheck);
			assert.strictEqual(agentsMdCheck.status, 'fail');
		});

		it('should warn when specs/ is missing', async () => {
			const artifacts = createPartialArtifacts();
			const scanner = new MockAsdlcComplianceScanner('/test/project', artifacts);
			const pillar = scanner.validateStandardizedParts(artifacts);

			const specsCheck = pillar.checks.find(c => c.name === 'specs/ Directory');
			assert.ok(specsCheck);
			assert.strictEqual(specsCheck.status, 'warn');
		});

		it('should warn when schemas/ is missing (optional)', async () => {
			const artifacts = createPartialArtifacts();
			const scanner = new MockAsdlcComplianceScanner('/test/project', artifacts);
			const pillar = scanner.validateStandardizedParts(artifacts);

			const schemasCheck = pillar.checks.find(c => c.name === 'schemas/ Directory');
			assert.ok(schemasCheck);
			assert.strictEqual(schemasCheck.status, 'warn');
		});
	});

	describe('Pillar 3: Quality Control', () => {
		it('should pass when all three tiers are defined', async () => {
			const artifacts = createFullyCompliantArtifacts();
			const scanner = new MockAsdlcComplianceScanner('/test/project', artifacts);
			const pillar = scanner.validateQualityControl(artifacts);

			assert.strictEqual(pillar.status, 'pass');
			assert.strictEqual(pillar.pillar, 'quality-control');
		});

		it('should warn when Tier 2 is empty', async () => {
			const artifacts = createPartialBoundariesArtifacts();
			const scanner = new MockAsdlcComplianceScanner('/test/project', artifacts);
			const pillar = scanner.validateQualityControl(artifacts);

			assert.strictEqual(pillar.status, 'warn');
			const tier2Check = pillar.checks.find(c => c.name === 'Tier 2 (ASK)');
			assert.ok(tier2Check);
			assert.strictEqual(tier2Check.status, 'warn');
		});

		it('should fail when Tier 1 is empty', async () => {
			const artifacts = createMissingTier1And3Artifacts();
			const scanner = new MockAsdlcComplianceScanner('/test/project', artifacts);
			const pillar = scanner.validateQualityControl(artifacts);

			assert.strictEqual(pillar.status, 'fail');
			const tier1Check = pillar.checks.find(c => c.name === 'Tier 1 (ALWAYS)');
			assert.ok(tier1Check);
			assert.strictEqual(tier1Check.status, 'fail');
		});

		it('should fail when Tier 3 is empty', async () => {
			const artifacts = createMissingTier1And3Artifacts();
			const scanner = new MockAsdlcComplianceScanner('/test/project', artifacts);
			const pillar = scanner.validateQualityControl(artifacts);

			assert.strictEqual(pillar.status, 'fail');
			const tier3Check = pillar.checks.find(c => c.name === 'Tier 3 (NEVER)');
			assert.ok(tier3Check);
			assert.strictEqual(tier3Check.status, 'fail');
		});

		it('should fail when operational boundaries section is missing', async () => {
			const artifacts = createPartialArtifacts();
			const scanner = new MockAsdlcComplianceScanner('/test/project', artifacts);
			const pillar = scanner.validateQualityControl(artifacts);

			assert.strictEqual(pillar.status, 'fail');
			const boundariesCheck = pillar.checks.find(c => c.name === 'Operational Boundaries');
			assert.ok(boundariesCheck);
			assert.strictEqual(boundariesCheck.status, 'fail');
		});
	});

	describe('Report Generation', () => {
		it('should calculate overall status as fail if any pillar fails', async () => {
			const artifacts = createNoMissionArtifacts();
			const scanner = new MockAsdlcComplianceScanner('/test/project', artifacts);
			const report = await scanner.audit();

			assert.strictEqual(report.overallStatus, 'fail');
		});

		it('should calculate overall status as warn if no fails but has warns', async () => {
			// Create artifacts that will only produce warnings
			const artifacts: AsdlcArtifacts = {
				agentsMd: {
					exists: true,
					path: '/test/AGENTS.md',
					mission: 'Build software.',
					sections: [
						{ level: 1, title: 'AGENTS.md', startLine: 0, endLine: 5 },
						{ level: 2, title: 'Development Map', startLine: 6, endLine: 10 },
						{ level: 2, title: 'Operational Boundaries', startLine: 11, endLine: 30 }
					],
					techStack: {
						languages: ['TypeScript'],
						frameworks: [],
						buildTools: [],
						testing: []
					},
					operationalBoundaries: {
						tier1Always: ['use TypeScript'],
						tier2Ask: [], // Empty - will warn
						tier3Never: ['commit secrets']
					}
				},
				specs: { exists: false, specs: [] }, // Missing - will warn
				schemas: { exists: false, schemas: [] }, // Missing - will warn
				hasAnyArtifacts: true
			};

			const scanner = new MockAsdlcComplianceScanner('/test/project', artifacts);
			const report = await scanner.audit();

			assert.strictEqual(report.overallStatus, 'warn');
		});

		it('should generate recommendations for failures', async () => {
			const artifacts = createEmptyArtifacts();
			const scanner = new MockAsdlcComplianceScanner('/test/project', artifacts);
			const report = await scanner.audit();

			assert.ok(report.recommendations.length > 0);
			// Should include recommendation to create AGENTS.md
			assert.ok(report.recommendations.some(r =>
				r.toLowerCase().includes('agents.md') || r.toLowerCase().includes('create')
			));
		});

		it('should include pillar summaries with emoji', async () => {
			const artifacts = createFullyCompliantArtifacts();
			const scanner = new MockAsdlcComplianceScanner('/test/project', artifacts);
			const report = await scanner.audit();

			for (const pillar of report.pillars) {
				assert.ok(pillar.summary.includes('✅'));
				assert.ok(pillar.summary.includes('passed'));
			}
		});
	});

	describe('Graceful Handling', () => {
		it('should return valid report even with no artifacts', async () => {
			const artifacts = createEmptyArtifacts();
			const scanner = new MockAsdlcComplianceScanner('/test/project', artifacts);
			const report = await scanner.audit();

			assert.ok(report);
			assert.ok(report.timestamp);
			assert.ok(report.projectPath);
			assert.ok(report.pillars);
			assert.strictEqual(report.pillars.length, 3);

			// Each pillar should have checks
			for (const pillar of report.pillars) {
				assert.ok(pillar.checks.length > 0);
				assert.ok(pillar.summary);
			}
		});

		it('should handle partial artifacts gracefully', async () => {
			const artifacts = createPartialArtifacts();
			const scanner = new MockAsdlcComplianceScanner('/test/project', artifacts);
			const report = await scanner.audit();

			assert.ok(report);
			// Should still produce valid report structure
			assert.strictEqual(report.pillars.length, 3);
		});
	});
});
