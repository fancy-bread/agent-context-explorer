import type { Rule } from '../scanner/rulesScanner';
import type { Command } from '../scanner/commandsScanner';
import type { Skill } from '../scanner/skillsScanner';
import type { AgentDefinition } from '../scanner/agentsScanner';
import type { SpecFile } from '../scanner/types';
import type { AgentDefinitionLocation } from './types';
import { pickByPrecedence } from './precedence';

/** Find a rule by logical name or path fragment (MCP get_rule). Resolves multiple
 * matches by fixed precedence (spec 011 FR-008): cursor before claude. */
export function findRuleByName(rules: Rule[], name: string): Rule | undefined {
	const normalizedName = name.toLowerCase().replace(/\.(mdc|md)$/, '');
	const needle = name.toLowerCase();
	const matches = rules.filter((r) => {
		const ruleName = r.fileName.toLowerCase().replace(/\.(mdc|md)$/, '');
		return ruleName === normalizedName || r.uri.fsPath.toLowerCase().includes(needle);
	});
	return pickByPrecedence(matches, (r) => ({ platform: r.platform }));
}

/** Find a command by logical name or path fragment (MCP get_command). Resolves multiple
 * matches by fixed precedence (spec 011 FR-008): workspace before global, cursor before claude. */
export function findCommandByName(commands: Command[], name: string): Command | undefined {
	const normalizedName = name.toLowerCase().replace(/\.md$/, '');
	const needle = name.toLowerCase();
	const matches = commands.filter((c) => {
		const commandName = c.fileName.toLowerCase().replace(/\.md$/, '');
		return commandName === normalizedName || c.uri.fsPath.toLowerCase().includes(needle);
	});
	return pickByPrecedence(matches, (c) => ({ location: c.location, platform: c.platform }));
}

/** Find a skill by directory name or path fragment (MCP get_skill). Resolves multiple
 * matches by fixed precedence (spec 011 FR-008): workspace before global, cursor before claude. */
export function findSkillByName(skills: Skill[], name: string): Skill | undefined {
	const normalizedName = name.toLowerCase();
	const needle = name.toLowerCase();
	const matches = skills.filter((s) => {
		const skillName = s.fileName.toLowerCase();
		return skillName === normalizedName || s.uri.fsPath.toLowerCase().includes(needle);
	});
	return pickByPrecedence(matches, (s) => ({ location: s.location, platform: s.platform }));
}

/** Workspace + agent-root agent definitions with scope (MCP list_agents / get_agent). */
export interface TaggedAgentDefinition {
	def: AgentDefinition;
	location: AgentDefinitionLocation;
}

/** Find an agent definition by stem, display name, or path fragment (MCP get_agent). Resolves
 * multiple matches by fixed precedence (spec 011 FR-008): workspace before global, cursor before claude. */
export function findAgentDefinitionByName(items: TaggedAgentDefinition[], name: string): TaggedAgentDefinition | undefined {
	const normalizedName = name.toLowerCase().replace(/\.md$/, '');
	const needle = name.toLowerCase();
	const matches = items.filter(({ def }) => {
		const stem = def.fileName.toLowerCase();
		const display = def.displayName.toLowerCase();
		return stem === normalizedName || display === normalizedName || def.uri.fsPath.toLowerCase().includes(needle);
	});
	return pickByPrecedence(matches, ({ def, location }) => ({ location, platform: def.platform }));
}

/** Find a spec domain folder by `list_specs` domain or path fragment (MCP get_spec).
 * Exact domain match is always preferred over path-fragment fallback to avoid
 * ambiguous substring matches (e.g. domain "mcp" matching path "009-single-mcp-server"). */
export function findSpecByName(specs: SpecFile[], name: string): SpecFile | undefined {
	const normalized = name.toLowerCase().replace(/\.md$/, '').replace(/\/spec\.md$/i, '');
	const needle = name.toLowerCase();
	const exact = specs.find((s) => {
		const domain = s.domain.toLowerCase();
		return domain === normalized || domain === needle;
	});
	return exact ?? specs.find((s) => s.path.toLowerCase().includes(needle));
}
