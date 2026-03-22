import type { Rule } from '../scanner/rulesScanner';
import type { Command } from '../scanner/commandsScanner';
import type { Skill } from '../scanner/skillsScanner';

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
