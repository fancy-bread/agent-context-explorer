// MCP Types - Type definitions for MCP tools and resources

import { Rule } from '../scanner/rulesScanner';
import { Command } from '../scanner/commandsScanner';
import { Skill } from '../scanner/skillsScanner';
import { AsdlcArtifacts, SpecFile } from '../scanner/types';

// =============================================================================
// Rule Types (for MCP tools)
// =============================================================================

/**
 * Rule information for list_rules tool
 */
export interface RuleInfo {
	name: string;
	description: string;
	type: 'always' | 'glob' | 'manual';
	path: string;
	globs?: string[];
}

/**
 * Full rule content for get_rule tool
 */
export interface RuleContent {
	name: string;
	description: string;
	type: 'always' | 'glob' | 'manual';
	path: string;
	content: string;
	globs?: string[];
}

/**
 * Convert scanner Rule to MCP RuleInfo
 */
export function toRuleInfo(rule: Rule): RuleInfo {
	const type = rule.metadata.alwaysApply ? 'always' :
		(rule.metadata.globs && rule.metadata.globs.length > 0) ? 'glob' : 'manual';

	return {
		name: rule.fileName.replace(/\.(mdc|md)$/, ''),
		description: rule.metadata.description || '',
		type,
		path: rule.uri.fsPath,
		globs: rule.metadata.globs
	};
}

/**
 * Convert scanner Rule to MCP RuleContent
 */
export function toRuleContent(rule: Rule): RuleContent {
	const type = rule.metadata.alwaysApply ? 'always' :
		(rule.metadata.globs && rule.metadata.globs.length > 0) ? 'glob' : 'manual';

	return {
		name: rule.fileName.replace(/\.(mdc|md)$/, ''),
		description: rule.metadata.description || '',
		type,
		path: rule.uri.fsPath,
		content: rule.content,
		globs: rule.metadata.globs
	};
}

// =============================================================================
// Command Types (for MCP tools)
// =============================================================================

/**
 * Command information for list_commands tool
 */
export interface CommandInfo {
	name: string;
	description: string;
	path: string;
	location: 'workspace' | 'global';
}

/**
 * Full command content for get_command tool
 */
export interface CommandContent {
	name: string;
	description: string;
	path: string;
	location: 'workspace' | 'global';
	content: string;
}

/**
 * Extract description from command markdown content
 * Looks for ## Overview section or first paragraph
 */
function extractCommandDescription(content: string): string {
	// Try to find ## Overview section
	const overviewMatch = content.match(/## Overview\s*\n+([^\n#]+)/);
	if (overviewMatch) {
		return overviewMatch[1].trim();
	}

	// Try to find first non-heading paragraph
	const lines = content.split('\n');
	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-')) {
			return trimmed.substring(0, 200);
		}
	}

	return '';
}

/**
 * Convert scanner Command to MCP CommandInfo
 */
export function toCommandInfo(command: Command): CommandInfo {
	return {
		name: command.fileName.replace(/\.md$/, ''),
		description: extractCommandDescription(command.content),
		path: command.uri.fsPath,
		location: command.location
	};
}

/**
 * Convert scanner Command to MCP CommandContent
 */
export function toCommandContent(command: Command): CommandContent {
	return {
		name: command.fileName.replace(/\.md$/, ''),
		description: extractCommandDescription(command.content),
		path: command.uri.fsPath,
		location: command.location,
		content: command.content
	};
}

// =============================================================================
// Skill Types (for MCP tools)
// =============================================================================

/**
 * Skill information for list_skills tool
 */
export interface SkillInfo {
	name: string;
	title?: string;
	overview?: string;
	path: string;
	location: 'workspace' | 'global';
}

/**
 * Full skill content for get_skill tool
 */
export interface SkillContent {
	name: string;
	title?: string;
	overview?: string;
	path: string;
	location: 'workspace' | 'global';
	content: string;
	metadata?: {
		prerequisites?: string[];
		steps?: string[];
		tools?: string[];
	};
}

/**
 * Convert scanner Skill to MCP SkillInfo
 */
export function toSkillInfo(skill: Skill): SkillInfo {
	return {
		name: skill.fileName,
		title: skill.metadata?.title,
		overview: skill.metadata?.overview,
		path: skill.uri.fsPath,
		location: skill.location
	};
}

/**
 * Convert scanner Skill to MCP SkillContent
 */
export function toSkillContent(skill: Skill): SkillContent {
	return {
		name: skill.fileName,
		title: skill.metadata?.title,
		overview: skill.metadata?.overview,
		path: skill.uri.fsPath,
		location: skill.location,
		content: skill.content,
		metadata: {
			prerequisites: skill.metadata?.prerequisites,
			steps: skill.metadata?.steps,
			tools: skill.metadata?.tools
		}
	};
}

// =============================================================================
// Project Context Types (for combined get_project_context tool)
// =============================================================================

/**
 * Complete project context - combines all available context
 */
export interface ProjectContext {
	timestamp: string;
	projectPath: string;
	rules: RuleInfo[];
	commands: CommandInfo[];
	skills: SkillInfo[];
	asdlcArtifacts: AsdlcArtifacts;
}

// =============================================================================
// MCP Tool Input/Output Types
// =============================================================================

/**
 * Common input for project-scoped tools
 */
export interface ProjectScopedInput {
	projectPath?: string;
}

/**
 * Input for get_rule tool
 */
export interface GetRuleInput extends ProjectScopedInput {
	name: string;
}

/**
 * Input for get_command tool
 */
export interface GetCommandInput extends ProjectScopedInput {
	name: string;
}

/**
 * Input for get_skill tool
 */
export interface GetSkillInput extends ProjectScopedInput {
	name: string;
}

// =============================================================================
// MCP Resource Types
// =============================================================================

/**
 * Resource metadata for listing
 */
export interface ResourceMetadata {
	uri: string;
	name: string;
	description: string;
	mimeType: string;
}

/**
 * Resource content
 */
export interface ResourceContent {
	uri: string;
	mimeType: string;
	content: string;
}

// Re-export types from scanner for convenience
export { AsdlcArtifacts, SpecFile };
