import type { Rule } from '../scanner/rulesScanner';
import type { Command } from '../scanner/commandsScanner';
import type { Skill } from '../scanner/skillsScanner';
import type { AgentDefinition } from '../scanner/agentsScanner';
import type { SpecFile } from '../scanner/types';
import type { AgentDefinitionLocation } from './types';

/** Find a rule by logical name or path fragment (MCP get_rule). */
export function findRuleByName(rules: Rule[], name: string): Rule | undefined {
	const normalizedName = name.toLowerCase().replace(/\.(mdc|md)$/, '');
	const needle = name.toLowerCase();
	return rules.find((r) => {
		const ruleName = r.fileName.toLowerCase().replace(/\.(mdc|md)$/, '');
		return ruleName === normalizedName || r.uri.fsPath.toLowerCase().includes(needle);
	});
}

/** Find a command by logical name or path fragment (MCP get_command). */
export function findCommandByName(commands: Command[], name: string): Command | undefined {
	const normalizedName = name.toLowerCase().replace(/\.md$/, '');
	const needle = name.toLowerCase();
	return commands.find((c) => {
		const commandName = c.fileName.toLowerCase().replace(/\.md$/, '');
		return commandName === normalizedName || c.uri.fsPath.toLowerCase().includes(needle);
	});
}

/** Find a skill by directory name or path fragment (MCP get_skill). */
export function findSkillByName(skills: Skill[], name: string): Skill | undefined {
	const normalizedName = name.toLowerCase();
	const needle = name.toLowerCase();
	return skills.find((s) => {
		const skillName = s.fileName.toLowerCase();
		return skillName === normalizedName || s.uri.fsPath.toLowerCase().includes(needle);
	});
}

/** Workspace + agent-root agent definitions with scope (MCP list_agents / get_agent). */
export interface TaggedAgentDefinition {
	def: AgentDefinition;
	location: AgentDefinitionLocation;
}

/** Find an agent definition by stem, display name, or path fragment (MCP get_agent). */
export function findAgentDefinitionByName(items: TaggedAgentDefinition[], name: string): TaggedAgentDefinition | undefined {
	const normalizedName = name.toLowerCase().replace(/\.md$/, '');
	const needle = name.toLowerCase();
	return items.find(({ def }) => {
		const stem = def.fileName.toLowerCase();
		const display = def.displayName.toLowerCase();
		return stem === normalizedName || display === normalizedName || def.uri.fsPath.toLowerCase().includes(needle);
	});
}

/** Find a spec domain folder by `list_specs` domain or path fragment (MCP get_spec). */
export function findSpecByName(specs: SpecFile[], name: string): SpecFile | undefined {
	const normalized = name.toLowerCase().replace(/\.md$/, '').replace(/\/spec\.md$/i, '');
	const needle = name.toLowerCase();
	return specs.find((s) => {
		const domain = s.domain.toLowerCase();
		return domain === normalized || domain === needle || s.path.toLowerCase().includes(needle);
	});
}
