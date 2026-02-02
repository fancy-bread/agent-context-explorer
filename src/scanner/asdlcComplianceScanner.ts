// ASDLC Compliance Scanner - Validate projects against ASDLC pillars
// See: specs/scanners/spec.md for architecture and contracts
import * as vscode from 'vscode';
import { AsdlcArtifactScanner } from './asdlcArtifactScanner';
import {
	AsdlcArtifacts,
	ComplianceReport,
	ComplianceStatus,
	PillarCheck,
	PillarResult
} from './types';

/**
 * Scanner for ASDLC compliance validation
 *
 * Validates projects against the three ASDLC pillars:
 * 1. Factory Architecture - Project identity, tech stack, development map
 * 2. Standardized Parts - AGENTS.md, specs/, schemas/
 * 3. Quality Control - Three-tier operational boundaries
 *
 * Uses AsdlcArtifactScanner (from FB-54) to scan explicit artifacts.
 *
 * @see specs/scanners/spec.md for architecture and contracts
 */
export class AsdlcComplianceScanner {
	private artifactScanner: AsdlcArtifactScanner;

	constructor(private workspaceRoot: vscode.Uri) {
		this.artifactScanner = new AsdlcArtifactScanner(workspaceRoot);
	}

	/**
	 * Run full ASDLC compliance audit
	 * @returns Compliance report with pass/fail/warn for each pillar
	 */
	async audit(): Promise<ComplianceReport> {
		// Scan all ASDLC artifacts
		const artifacts = await this.artifactScanner.scanAll();

		// Validate each pillar
		const factoryArchitecture = this.validateFactoryArchitecture(artifacts);
		const standardizedParts = this.validateStandardizedParts(artifacts);
		const qualityControl = this.validateQualityControl(artifacts);

		const pillars = [factoryArchitecture, standardizedParts, qualityControl];

		// Calculate overall status
		const overallStatus = this.calculateOverallStatus(pillars);

		// Generate recommendations
		const recommendations = this.generateRecommendations(pillars);

		return {
			timestamp: new Date().toISOString(),
			projectPath: this.workspaceRoot.fsPath,
			overallStatus,
			pillars,
			recommendations
		};
	}

	// =========================================================================
	// Pillar 1: Factory Architecture
	// =========================================================================

	/**
	 * Validate Factory Architecture pillar
	 * Checks: Project identity, tech stack, development map
	 */
	validateFactoryArchitecture(artifacts: AsdlcArtifacts): PillarResult {
		const checks: PillarCheck[] = [];

		// Check 1: Project identity (mission defined in AGENTS.md)
		checks.push(this.checkProjectIdentity(artifacts));

		// Check 2: Tech stack documented
		checks.push(this.checkTechStack(artifacts));

		// Check 3: Development map exists
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

		const details: string[] = [];
		if (tech.languages.length > 0) {
			details.push(`Languages: ${tech.languages.join(', ')}`);
		}
		if (tech.frameworks.length > 0) {
			details.push(`Frameworks: ${tech.frameworks.join(', ')}`);
		}

		return {
			name: 'Tech Stack',
			status: 'pass',
			message: 'Tech stack documented',
			details
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

		// Look for development map section (various names)
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

	/**
	 * Validate Standardized Parts pillar
	 * Checks: AGENTS.md exists, specs/ exists, schemas/ exists (optional)
	 */
	validateStandardizedParts(artifacts: AsdlcArtifacts): PillarResult {
		const checks: PillarCheck[] = [];

		// Check 1: AGENTS.md exists
		checks.push(this.checkAgentsMdExists(artifacts));

		// Check 2: specs/ directory exists
		checks.push(this.checkSpecsExists(artifacts));

		// Check 3: schemas/ directory exists (optional, warn if missing)
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
			message: `AGENTS.md exists with ${sectionCount} sections`,
			details: artifacts.agentsMd.sections.slice(0, 5).map(s => s.title)
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
		const withBlueprint = artifacts.specs.specs.filter(s => s.hasBlueprint).length;
		const withContract = artifacts.specs.specs.filter(s => s.hasContract).length;

		return {
			name: 'specs/ Directory',
			status: 'pass',
			message: `${specCount} spec(s) found`,
			details: [
				`With Blueprint: ${withBlueprint}`,
				`With Contract: ${withContract}`,
				...artifacts.specs.specs.map(s => s.domain)
			]
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
			message: `${schemaCount} schema(s) found`,
			details: artifacts.schemas.schemas.map(s => s.name)
		};
	}

	// =========================================================================
	// Pillar 3: Quality Control
	// =========================================================================

	/**
	 * Validate Quality Control pillar
	 * Checks: Three-tier operational boundaries defined
	 */
	validateQualityControl(artifacts: AsdlcArtifacts): PillarResult {
		const checks: PillarCheck[] = [];

		// Check for operational boundaries section
		checks.push(this.checkOperationalBoundaries(artifacts));

		// Check Tier 1 (ALWAYS)
		checks.push(this.checkTier1Always(artifacts));

		// Check Tier 2 (ASK) - optional, warn if missing
		checks.push(this.checkTier2Ask(artifacts));

		// Check Tier 3 (NEVER)
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
			message: `${boundaries.tier1Always.length} non-negotiable standard(s) defined`,
			details: boundaries.tier1Always.slice(0, 3)
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
			message: `${boundaries.tier2Ask.length} high-risk operation(s) defined`,
			details: boundaries.tier2Ask.slice(0, 3)
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
			message: `${boundaries.tier3Never.length} safety limit(s) defined`,
			details: boundaries.tier3Never.slice(0, 3)
		};
	}

	// =========================================================================
	// Report Generation
	// =========================================================================

	private createPillarResult(pillar: PillarResult['pillar'], checks: PillarCheck[]): PillarResult {
		// Calculate pillar status based on checks
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
		// If any check fails, pillar fails
		if (checks.some(c => c.status === 'fail')) {
			return 'fail';
		}
		// If any check warns, pillar warns
		if (checks.some(c => c.status === 'warn')) {
			return 'warn';
		}
		// All checks pass
		return 'pass';
	}

	private calculateOverallStatus(pillars: PillarResult[]): ComplianceStatus {
		// If any pillar fails, overall fails
		if (pillars.some(p => p.status === 'fail')) {
			return 'fail';
		}
		// If any pillar warns, overall warns
		if (pillars.some(p => p.status === 'warn')) {
			return 'warn';
		}
		// All pillars pass
		return 'pass';
	}

	private generatePillarSummary(pillar: PillarResult['pillar'], checks: PillarCheck[], status: ComplianceStatus): string {
		const passed = checks.filter(c => c.status === 'pass').length;
		const total = checks.length;

		const pillarNames: Record<PillarResult['pillar'], string> = {
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

		// Add warnings as lower priority recommendations
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
