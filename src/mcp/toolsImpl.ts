// MCP Tools - Tool implementations using existing scanners

import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { assertWorkspaceUriForMcp } from './toolsWorkspace';
import { findRuleByName, findCommandByName, findSkillByName, findAgentDefinitionByName } from './toolsFind';
import { RulesScanner } from '../scanner/rulesScanner';
import { CommandsScanner } from '../scanner/commandsScanner';
import { SkillsScanner } from '../scanner/skillsScanner';
import { AsdlcArtifactScanner } from '../scanner/asdlcArtifactScanner';
import { AgentsScanner, scanAgentDefinitionsForAgentRoot, type AgentDefinition } from '../scanner/agentsScanner';
import {
	RuleInfo,
	RuleContent,
	CommandInfo,
	CommandContent,
	SkillInfo,
	SkillContent,
	AgentDefinitionInfo,
	AgentDefinitionContent,
	AgentDefinitionLocation,
	ProjectContext,
	ProjectScopedInput,
	GetRuleInput,
	GetCommandInput,
	GetSkillInput,
	GetAgentDefinitionInput,
	AsdlcArtifacts,
	SpecFile,
	toRuleInfo,
	toRuleContent,
	toCommandInfo,
	toCommandContent,
	toSkillInfo,
	toSkillContent,
	toAgentDefinitionInfo,
	toAgentDefinitionContent
} from './types';

/**
 * MCP Tools handler class
 * Provides tool implementations that wrap existing scanners
 */
export class McpTools {
	// =========================================================================
	// Rules Tools
	// =========================================================================

	/**
	 * list_rules - List all Cursor rules with metadata
	 */
	static async listRules(input?: ProjectScopedInput): Promise<RuleInfo[]> {
		const workspaceUri = assertWorkspaceUriForMcp(input?.projectPath);

		const scanner = new RulesScanner(workspaceUri);
		const rules = await scanner.scanRules();

		return rules.map(toRuleInfo);
	}

	/**
	 * get_rule - Get rule content by name or path
	 */
	static async getRule(input: GetRuleInput): Promise<RuleContent | null> {
		const workspaceUri = assertWorkspaceUriForMcp(input?.projectPath);

		const scanner = new RulesScanner(workspaceUri);
		const rules = await scanner.scanRules();

		const rule = findRuleByName(rules, input.name);

		if (!rule) {
			return null;
		}

		return toRuleContent(rule);
	}

	// =========================================================================
	// Commands Tools
	// =========================================================================

	/**
	 * list_commands - List all Cursor commands with metadata
	 */
	static async listCommands(input?: ProjectScopedInput): Promise<CommandInfo[]> {
		const workspaceUri = assertWorkspaceUriForMcp(input?.projectPath);

		const scanner = new CommandsScanner(workspaceUri);

		// Get both workspace and global commands
		const [workspaceCommands, globalCommands] = await Promise.all([
			scanner.scanWorkspaceCommands(),
			scanner.scanGlobalCommands()
		]);

		const allCommands = [...workspaceCommands, ...globalCommands];
		return allCommands.map(toCommandInfo);
	}

	/**
	 * get_command - Get command content by name or path
	 */
	static async getCommand(input: GetCommandInput): Promise<CommandContent | null> {
		const workspaceUri = assertWorkspaceUriForMcp(input?.projectPath);

		const scanner = new CommandsScanner(workspaceUri);

		// Get both workspace and global commands
		const [workspaceCommands, globalCommands] = await Promise.all([
			scanner.scanWorkspaceCommands(),
			scanner.scanGlobalCommands()
		]);

		const allCommands = [...workspaceCommands, ...globalCommands];

		const command = findCommandByName(allCommands, input.name);

		if (!command) {
			return null;
		}

		return toCommandContent(command);
	}

	// =========================================================================
	// Skills Tools
	// =========================================================================

	/**
	 * list_skills - List all Cursor skills with metadata
	 */
	static async listSkills(input?: ProjectScopedInput): Promise<SkillInfo[]> {
		const workspaceUri = assertWorkspaceUriForMcp(input?.projectPath);

		const scanner = new SkillsScanner(workspaceUri);

		// Get both workspace and global skills
		const [workspaceSkills, globalSkills] = await Promise.all([
			scanner.scanWorkspaceSkills(),
			scanner.scanGlobalSkills()
		]);

		const allSkills = [...workspaceSkills, ...globalSkills];
		return allSkills.map(toSkillInfo);
	}

	/**
	 * get_skill - Get skill content by name or path
	 */
	static async getSkill(input: GetSkillInput): Promise<SkillContent | null> {
		const workspaceUri = assertWorkspaceUriForMcp(input?.projectPath);

		const scanner = new SkillsScanner(workspaceUri);

		// Get both workspace and global skills
		const [workspaceSkills, globalSkills] = await Promise.all([
			scanner.scanWorkspaceSkills(),
			scanner.scanGlobalSkills()
		]);

		const allSkills = [...workspaceSkills, ...globalSkills];

		const skill = findSkillByName(allSkills, input.name);

		if (!skill) {
			return null;
		}

		return toSkillContent(skill);
	}

	// =========================================================================
	// Agent definition tools
	// =========================================================================

	/**
	 * Workspace `.cursor/agents` plus Cursor / Claude / Global agent roots (same layout as extension).
	 */
	private static async collectTaggedAgentDefinitions(workspaceUri: vscode.Uri): Promise<Array<{ def: AgentDefinition; location: AgentDefinitionLocation }>> {
		const out: Array<{ def: AgentDefinition; location: AgentDefinitionLocation }> = [];
		const scanner = new AgentsScanner(workspaceUri);
		const workspaceAgents = await scanner.scanWorkspaceAgentDefinitions();
		for (const def of workspaceAgents) {
			out.push({ def, location: 'workspace' });
		}
		const home = os.homedir();
		const roots: Array<[AgentDefinitionLocation, string]> = [
			['cursor', path.join(home, '.cursor')],
			['claude', path.join(home, '.claude')],
			['global', path.join(home, '.agents')]
		];
		for (const [loc, root] of roots) {
			const defs = await scanAgentDefinitionsForAgentRoot(root);
			for (const def of defs) {
				out.push({ def, location: loc });
			}
		}
		return out;
	}

	/**
	 * list_agents — workspace and user-level agent roots
	 */
	static async listAgentDefinitions(input?: ProjectScopedInput): Promise<AgentDefinitionInfo[]> {
		const workspaceUri = assertWorkspaceUriForMcp(input?.projectPath);
		const tagged = await McpTools.collectTaggedAgentDefinitions(workspaceUri);
		return tagged.map(({ def, location }) => toAgentDefinitionInfo(def, location));
	}

	/**
	 * get_agent — resolve by name or path fragment
	 */
	static async getAgentDefinition(input: GetAgentDefinitionInput): Promise<AgentDefinitionContent | null> {
		const workspaceUri = assertWorkspaceUriForMcp(input?.projectPath);
		const tagged = await McpTools.collectTaggedAgentDefinitions(workspaceUri);
		const found = findAgentDefinitionByName(tagged, input.name);
		if (!found) {
			return null;
		}
		return toAgentDefinitionContent(found.def, found.location);
	}

	// =========================================================================
	// ASDLC Tools
	// =========================================================================

	/**
	 * get_asdlc_artifacts - Get ASDLC artifacts (AGENTS.md, specs, schemas)
	 */
	static async getAsdlcArtifacts(input?: ProjectScopedInput): Promise<AsdlcArtifacts> {
		const workspaceUri = assertWorkspaceUriForMcp(input?.projectPath);

		const scanner = new AsdlcArtifactScanner(workspaceUri);
		return await scanner.scanAll();
	}

	/**
	 * list_specs - List available specifications
	 */
	static async listSpecs(input?: ProjectScopedInput): Promise<SpecFile[]> {
		const workspaceUri = assertWorkspaceUriForMcp(input?.projectPath);

		const scanner = new AsdlcArtifactScanner(workspaceUri);
		const artifacts = await scanner.scanAll();

		return artifacts.specs.specs;
	}

	// =========================================================================
	// Combined Tools
	// =========================================================================

	/**
	 * get_project_context - Complete project context (rules, commands, skills, artifacts)
	 */
	static async getProjectContext(input?: ProjectScopedInput): Promise<ProjectContext> {
		const workspaceUri = assertWorkspaceUriForMcp(input?.projectPath);

		// Run all scans in parallel for performance
		const [rules, commands, skills, agentDefinitions, asdlcArtifacts] = await Promise.all([
			this.listRules(input),
			this.listCommands(input),
			this.listSkills(input),
			this.listAgentDefinitions(input),
			this.getAsdlcArtifacts(input)
		]);

		return {
			timestamp: new Date().toISOString(),
			projectPath: workspaceUri.fsPath,
			rules,
			commands,
			skills,
			agentDefinitions,
			asdlcArtifacts
		};
	}
}
