// Enhanced State Detection Types

/**
 * Dependency information with purpose
 */
export interface DependencyInfo {
	name: string;
	version: string;
	purpose: string;
	critical: boolean;
}

/**
 * Dependency purpose database entry
 */
export interface DependencyPurpose {
	category: string;
	purpose: string;
	critical: boolean;
}

/**
 * Project identity information
 */
export interface ProjectIdentity {
	projectType: string;      // "vscode-extension", "web-app", "cli-tool", etc.
	domain: string;           // "developer-tools", "ui-components", etc.
	primaryLanguage: string;  // "TypeScript", "JavaScript", etc.
	maturityLevel: string;    // "prototype", "active-development", "production"
}

/**
 * Project capabilities
 */
export interface ProjectCapabilities {
	description: string;      // From README/package.json
	primaryFeatures: string[]; // Extracted from README
	dataFormats: string[];    // ["MDC", "YAML", "JSON"]
}

/**
 * Enhanced architecture information
 */
export interface EnhancedArchitecture {
	style: string;              // "layered", "modular"
	organization: string;       // "src-based", "feature-based"
	patterns: string[];         // ["Provider Pattern", "Command Pattern"]
	entryPoints: string[];      // ["src/extension.ts"]
}

/**
 * Enhanced dependencies with purpose mapping
 */
export interface EnhancedDependencies {
	byPurpose: {
		parsing: DependencyInfo[];
		testing: DependencyInfo[];
		build: DependencyInfo[];
		platform: DependencyInfo[];
		'code-quality': DependencyInfo[];
		utility: DependencyInfo[];
		http: DependencyInfo[];
		framework: DependencyInfo[];
	};
	criticalPath: string[];        // Essential dependencies
	devOnly: string[];             // Development-only
}

/**
 * VS Code extension specific context
 */
export interface VSCodeContext {
	extensionType: string;     // "productivity", "language-support", "theme"
	category: string;          // "Other", "Programming Languages", etc.
	minVersion: string;        // "^1.74.0"
	activation: string[];      // ["onView:aceProjects"]
	contributes: {
		commands: number;
		views: number;
		configuration: boolean;
		menus: boolean;
		languages: number;
		themes: number;
	};
	capabilities: string[];    // ["Provides custom commands", "Adds custom views"]
}

/**
 * Platform-specific context
 */
export interface PlatformContext {
	vscode?: VSCodeContext;
	// Future: react?, vue?, angular?
}

/**
 * AI Agent guidance
 */
export interface AgentGuidance {
	suggestedApproach: string;
	criticalFiles: string[];
	commonTasks: string[];
	watchOuts: string[];
}

/**
 * Complete enhanced project state
 */
export interface EnhancedProjectState {
	// Project Identity & Purpose
	identity: ProjectIdentity;

	// What does this project DO?
	capabilities: ProjectCapabilities;

	// HOW is it built?
	architecture: EnhancedArchitecture;

	// Dependencies with PURPOSE
	dependencies: EnhancedDependencies;

	// Platform-specific context
	platformContext?: PlatformContext;

	// AI Agent Guidance
	agentGuidance: AgentGuidance;
}

