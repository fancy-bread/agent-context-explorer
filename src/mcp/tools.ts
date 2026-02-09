// MCP Tools - Tool implementations using existing scanners

import * as vscode from 'vscode';
import { RulesScanner } from '../scanner/rulesScanner';
import { CommandsScanner } from '../scanner/commandsScanner';
import { SkillsScanner } from '../scanner/skillsScanner';
import { AsdlcArtifactScanner } from '../scanner/asdlcArtifactScanner';
import {
	RuleInfo,
	RuleContent,
	CommandInfo,
	CommandContent,
	SkillInfo,
	SkillContent,
	ProjectContext,
	ProjectScopedInput,
	GetRuleInput,
	GetCommandInput,
	GetSkillInput,
	AsdlcArtifacts,
	SpecFile,
	toRuleInfo,
	toRuleContent,
	toCommandInfo,
	toCommandContent,
	toSkillInfo,
	toSkillContent
} from './types';

/**
 * MCP Tools handler class
 * Provides tool implementations that wrap existing scanners
 */
export class McpTools {
	/**
	 * Get workspace URI from optional project path or current workspace
	 */
	private static getWorkspaceUri(projectPath?: string): vscode.Uri | undefined {
		if (projectPath) {
			return vscode.Uri.file(projectPath);
		}
		return vscode.workspace.workspaceFolders?.[0]?.uri;
	}

	/**
	 * Validate that we have a valid workspace
	 */
	private static validateWorkspace(workspaceUri: vscode.Uri | undefined): asserts workspaceUri is vscode.Uri {
		if (!workspaceUri) {
			throw new Error('No workspace folder found. Please open a folder or provide a projectPath.');
		}
	}

	// =========================================================================
	// Rules Tools
	// =========================================================================

	/**
	 * list_rules - List all Cursor rules with metadata
	 */
	static async listRules(input: ProjectScopedInput = {}): Promise<RuleInfo[]> {
		const workspaceUri = this.getWorkspaceUri(input.projectPath);
		this.validateWorkspace(workspaceUri);

		const scanner = new RulesScanner(workspaceUri);
		const rules = await scanner.scanRules();

		return rules.map(toRuleInfo);
	}

	/**
	 * get_rule - Get rule content by name or path
	 */
	static async getRule(input: GetRuleInput): Promise<RuleContent | null> {
		const workspaceUri = this.getWorkspaceUri(input.projectPath);
		this.validateWorkspace(workspaceUri);

		const scanner = new RulesScanner(workspaceUri);
		const rules = await scanner.scanRules();

		// Find rule by name (case-insensitive, with or without extension)
		const normalizedName = input.name.toLowerCase().replace(/\.(mdc|md)$/, '');
		const rule = rules.find(r => {
			const ruleName = r.fileName.toLowerCase().replace(/\.(mdc|md)$/, '');
			return ruleName === normalizedName || r.uri.fsPath.toLowerCase().includes(input.name.toLowerCase());
		});

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
	static async listCommands(input: ProjectScopedInput = {}): Promise<CommandInfo[]> {
		const workspaceUri = this.getWorkspaceUri(input.projectPath);
		this.validateWorkspace(workspaceUri);

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
		const workspaceUri = this.getWorkspaceUri(input.projectPath);
		this.validateWorkspace(workspaceUri);

		const scanner = new CommandsScanner(workspaceUri);

		// Get both workspace and global commands
		const [workspaceCommands, globalCommands] = await Promise.all([
			scanner.scanWorkspaceCommands(),
			scanner.scanGlobalCommands()
		]);

		const allCommands = [...workspaceCommands, ...globalCommands];

		// Find command by name (case-insensitive, with or without extension)
		const normalizedName = input.name.toLowerCase().replace(/\.md$/, '');
		const command = allCommands.find(c => {
			const commandName = c.fileName.toLowerCase().replace(/\.md$/, '');
			return commandName === normalizedName || c.uri.fsPath.toLowerCase().includes(input.name.toLowerCase());
		});

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
	static async listSkills(input: ProjectScopedInput = {}): Promise<SkillInfo[]> {
		const workspaceUri = this.getWorkspaceUri(input.projectPath);
		this.validateWorkspace(workspaceUri);

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
		const workspaceUri = this.getWorkspaceUri(input.projectPath);
		this.validateWorkspace(workspaceUri);

		const scanner = new SkillsScanner(workspaceUri);

		// Get both workspace and global skills
		const [workspaceSkills, globalSkills] = await Promise.all([
			scanner.scanWorkspaceSkills(),
			scanner.scanGlobalSkills()
		]);

		const allSkills = [...workspaceSkills, ...globalSkills];

		// Find skill by name (case-insensitive, matches directory name)
		const normalizedName = input.name.toLowerCase();
		const skill = allSkills.find(s => {
			const skillName = s.fileName.toLowerCase();
			return skillName === normalizedName || s.uri.fsPath.toLowerCase().includes(input.name.toLowerCase());
		});

		if (!skill) {
			return null;
		}

		return toSkillContent(skill);
	}

	// =========================================================================
	// ASDLC Tools
	// =========================================================================

	/**
	 * get_asdlc_artifacts - Get ASDLC artifacts (AGENTS.md, specs, schemas)
	 */
	static async getAsdlcArtifacts(input: ProjectScopedInput = {}): Promise<AsdlcArtifacts> {
		const workspaceUri = this.getWorkspaceUri(input.projectPath);
		this.validateWorkspace(workspaceUri);

		const scanner = new AsdlcArtifactScanner(workspaceUri);
		return await scanner.scanAll();
	}

	/**
	 * list_specs - List available specifications
	 */
	static async listSpecs(input: ProjectScopedInput = {}): Promise<SpecFile[]> {
		const workspaceUri = this.getWorkspaceUri(input.projectPath);
		this.validateWorkspace(workspaceUri);

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
	static async getProjectContext(input: ProjectScopedInput = {}): Promise<ProjectContext> {
		const workspaceUri = this.getWorkspaceUri(input.projectPath);
		this.validateWorkspace(workspaceUri);

		// Run all scans in parallel for performance
		const [rules, commands, skills, asdlcArtifacts] = await Promise.all([
			this.listRules(input),
			this.listCommands(input),
			this.listSkills(input),
			this.getAsdlcArtifacts(input)
		]);

		return {
			timestamp: new Date().toISOString(),
			projectPath: workspaceUri.fsPath,
			rules,
			commands,
			skills,
			asdlcArtifacts
		};
	}
}
