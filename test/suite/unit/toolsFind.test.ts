import * as assert from 'assert';
import * as vscode from 'vscode';
import { findRuleByName, findCommandByName, findSkillByName, findAgentDefinitionByName, type TaggedAgentDefinition } from '../../../src/mcp/toolsFind';
import type { Rule } from '../../../src/scanner/rulesScanner';
import type { Command } from '../../../src/scanner/commandsScanner';
import type { Skill } from '../../../src/scanner/skillsScanner';
import type { AgentDefinition } from '../../../src/scanner/agentsScanner';
import type { AgentDefinitionLocation } from '../../../src/mcp/types';

describe('mcp/toolsFind', () => {
	describe('findRuleByName', () => {
		const mk = (fileName: string, fsPath: string, platform: 'cursor' | 'claude' = 'cursor'): Rule => ({
			uri: vscode.Uri.file(fsPath) as any,
			fileName,
			content: '',
			metadata: { description: '' },
			platform
		});

		it('matches by normalized file name', () => {
			const r = mk('Foo.mdc', '/workspace/.cursor/rules/Foo.mdc');
			assert.strictEqual(findRuleByName([r], 'foo')?.fileName, 'Foo.mdc');
			assert.strictEqual(findRuleByName([r], 'foo.mdc')?.fileName, 'Foo.mdc');
		});

		it('matches by path substring when name differs from file', () => {
			const r = mk('X.mdc', '/workspace/.cursor/rules/subdir/X.mdc');
			assert.strictEqual(findRuleByName([r], 'subdir')?.fileName, 'X.mdc');
		});

		it('returns undefined when no match', () => {
			assert.strictEqual(findRuleByName([mk('a.mdc', '/a.mdc')], 'zzz'), undefined);
		});

		it('prefers cursor over claude on name collision (spec 011 FR-008)', () => {
			const claude = mk('same.mdc', '/workspace/.claude/rules/same.mdc', 'claude');
			const cursor = mk('same.mdc', '/workspace/.cursor/rules/same.mdc', 'cursor');
			const found = findRuleByName([claude, cursor], 'same');
			assert.strictEqual(found?.platform, 'cursor');
		});
	});

	describe('findCommandByName', () => {
		const mk = (fileName: string, fsPath: string, location: 'workspace' | 'global' = 'workspace', platform: 'cursor' | 'claude' = 'cursor'): Command => ({
			uri: vscode.Uri.file(fsPath) as any,
			fileName,
			content: '',
			location,
			platform
		});

		it('matches by normalized file name', () => {
			const c = mk('cmd.md', '/workspace/.cursor/commands/cmd.md');
			assert.strictEqual(findCommandByName([c], 'cmd')?.fileName, 'cmd.md');
		});

		it('matches by path substring', () => {
			const c = mk('c.md', '/workspace/.cursor/commands/nested/c.md');
			assert.strictEqual(findCommandByName([c], 'nested')?.fileName, 'c.md');
		});

		it('prefers workspace over global on name collision (spec 011 FR-008)', () => {
			const global = mk('same.md', '/home/.cursor/commands/same.md', 'global');
			const workspace = mk('same.md', '/workspace/.claude/commands/same.md', 'workspace', 'claude');
			const found = findCommandByName([global, workspace], 'same');
			assert.strictEqual(found?.location, 'workspace');
		});

		it('prefers cursor over claude within the same location tier (spec 011 FR-008)', () => {
			const claude = mk('same.md', '/workspace/.claude/commands/same.md', 'workspace', 'claude');
			const cursor = mk('same.md', '/workspace/.cursor/commands/same.md', 'workspace', 'cursor');
			const found = findCommandByName([claude, cursor], 'same');
			assert.strictEqual(found?.platform, 'cursor');
		});
	});

	describe('findSkillByName', () => {
		const mk = (fileName: string, fsPath: string, location: 'workspace' | 'global' = 'workspace', platform: 'cursor' | 'claude' = 'cursor'): Skill => ({
			uri: vscode.Uri.file(fsPath) as any,
			fileName,
			content: '',
			location,
			metadata: {},
			platform
		});

		it('matches by directory name', () => {
			const s = mk('sk', '/workspace/.cursor/skills/sk/SKILL.md');
			assert.strictEqual(findSkillByName([s], 'sk')?.fileName, 'sk');
		});

		it('matches by path substring', () => {
			const s = mk('bar', '/workspace/.cursor/skills/nested/bar/SKILL.md');
			assert.strictEqual(findSkillByName([s], 'nested')?.fileName, 'bar');
		});

		it('prefers cursor over claude on name collision (spec 011 FR-008)', () => {
			const claude = mk('same', '/workspace/.claude/skills/same/SKILL.md', 'workspace', 'claude');
			const cursor = mk('same', '/workspace/.cursor/skills/same/SKILL.md', 'workspace', 'cursor');
			const found = findSkillByName([claude, cursor], 'same');
			assert.strictEqual(found?.platform, 'cursor');
		});
	});

	describe('findAgentDefinitionByName', () => {
		const mk = (
			fileName: string,
			displayName: string,
			fsPath: string,
			location: AgentDefinitionLocation = 'workspace',
			platform: 'cursor' | 'claude' = 'cursor'
		): TaggedAgentDefinition => ({
			def: {
				uri: vscode.Uri.file(fsPath) as any,
				content: '',
				fileName,
				displayName,
				platform
			} as AgentDefinition,
			location
		});

		it('matches by fileName stem', () => {
			const a = mk('builder', 'Builder', '/workspace/.cursor/agents/builder.md');
			assert.strictEqual(findAgentDefinitionByName([a], 'builder')?.def.fileName, 'builder');
		});

		it('matches by display name', () => {
			const a = mk('builder', 'Build Agent', '/workspace/.cursor/agents/builder.md');
			assert.strictEqual(findAgentDefinitionByName([a], 'build agent')?.def.fileName, 'builder');
		});

		it('matches by path substring', () => {
			const a = mk('x', 'X', '/workspace/.cursor/agents/nested/x.md');
			assert.strictEqual(findAgentDefinitionByName([a], 'nested')?.def.fileName, 'x');
		});

		it('returns undefined when no match', () => {
			const a = mk('x', 'X', '/workspace/.cursor/agents/x.md');
			assert.strictEqual(findAgentDefinitionByName([a], 'zzz'), undefined);
		});

		it('prefers workspace over a global agent root on name collision (spec 011 FR-008)', () => {
			const global = mk('same', 'Same', '/home/.cursor/agents/same.md', 'cursor');
			const workspace = mk('same', 'Same', '/workspace/.claude/agents/same.md', 'workspace', 'claude');
			const found = findAgentDefinitionByName([global, workspace], 'same');
			assert.strictEqual(found?.location, 'workspace');
		});

		it('prefers cursor over claude within the workspace tier on name collision (spec 011 FR-008)', () => {
			const claude = mk('same', 'Same', '/workspace/.claude/agents/same.md', 'workspace', 'claude');
			const cursor = mk('same', 'Same', '/workspace/.cursor/agents/same.md', 'workspace', 'cursor');
			const found = findAgentDefinitionByName([claude, cursor], 'same');
			assert.strictEqual(found?.def.platform, 'cursor');
		});
	});
});
