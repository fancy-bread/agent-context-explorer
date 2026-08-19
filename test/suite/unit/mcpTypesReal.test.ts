/**
 * Tests that exercise the real src/mcp/types.ts conversion functions
 * (toRuleInfo, toRuleContent, toCommandInfo, toCommandContent, toSkillInfo, toSkillContent)
 * so that types.ts gets coverage.
 */
import * as assert from 'assert';
import {
	toRuleInfo,
	toRuleContent,
	toCommandInfo,
	toCommandContent,
	toSkillInfo,
	toSkillContent,
	toAgentDefinitionInfo,
	toAgentDefinitionContent
} from '../../../src/mcp/types';
import type { Rule } from '../../../src/scanner/rulesScanner';
import type { Command } from '../../../src/scanner/commandsScanner';
import type { Skill } from '../../../src/scanner/skillsScanner';
import type { AgentDefinition } from '../../../src/scanner/agentsScanner';

function makeUri(fsPath: string): { fsPath: string } {
	return { fsPath };
}

describe('mcp/types (real implementation) — platform propagation (spec 011)', () => {
	it('toRuleInfo/toCommandInfo/toSkillInfo/toAgentDefinitionInfo propagate platform', () => {
		const rule: Rule = { uri: makeUri('/r.mdc') as any, metadata: { description: 'd' }, content: '', fileName: 'r.mdc', platform: 'claude' };
		assert.strictEqual(toRuleInfo(rule).platform, 'claude');
		assert.strictEqual(toRuleContent(rule).platform, 'claude');

		const command: Command = { uri: makeUri('/c.md') as any, content: '', fileName: 'c.md', location: 'workspace', platform: 'claude' };
		assert.strictEqual(toCommandInfo(command).platform, 'claude');
		assert.strictEqual(toCommandContent(command).platform, 'claude');

		const skill: Skill = { uri: makeUri('/s/SKILL.md') as any, content: '', fileName: 's', location: 'workspace', platform: 'claude' };
		assert.strictEqual(toSkillInfo(skill).platform, 'claude');
		assert.strictEqual(toSkillContent(skill).platform, 'claude');

		const agent: AgentDefinition = { uri: makeUri('/a.md') as any, content: '', fileName: 'a', displayName: 'a', platform: 'claude' };
		assert.strictEqual(toAgentDefinitionInfo(agent, 'workspace').platform, 'claude');
		assert.strictEqual(toAgentDefinitionContent(agent, 'workspace').platform, 'claude');
	});
});

describe('mcp/types (real implementation)', () => {
	describe('toRuleInfo / toRuleContent', () => {
		it('toRuleInfo returns manual type when no alwaysApply and no globs', () => {
			const rule: Rule = {
			platform: 'cursor',
				uri: makeUri('/rules/a.mdc') as any,
				metadata: { description: 'Desc' },
				content: '# Content',
				fileName: 'a.mdc'
			};
			const info = toRuleInfo(rule);
			assert.strictEqual(info.name, 'a');
			assert.strictEqual(info.description, 'Desc');
			assert.strictEqual(info.type, 'manual');
			assert.strictEqual(info.path, '/rules/a.mdc');
		});

		it('toRuleInfo returns always when alwaysApply true', () => {
			const rule: Rule = {
			platform: 'cursor',
				uri: makeUri('/p.mdc') as any,
				metadata: { description: 'D', alwaysApply: true },
				content: '',
				fileName: 'p.mdc'
			};
			const info = toRuleInfo(rule);
			assert.strictEqual(info.type, 'always');
		});

		it('toRuleInfo returns glob when globs present', () => {
			const rule: Rule = {
			platform: 'cursor',
				uri: makeUri('/x.mdc') as any,
				metadata: { description: 'D', globs: ['*.ts'] },
				content: '',
				fileName: 'x.mdc'
			};
			const info = toRuleInfo(rule);
			assert.strictEqual(info.type, 'glob');
			assert.deepStrictEqual(info.globs, ['*.ts']);
		});

		it('toRuleInfo treats empty globs array as manual', () => {
			const rule: Rule = {
			platform: 'cursor',
				uri: makeUri('/y.mdc') as any,
				metadata: { description: 'D', globs: [] },
				content: '',
				fileName: 'y.mdc'
			};
			const info = toRuleInfo(rule);
			assert.strictEqual(info.type, 'manual');
		});

		it('toRuleContent includes content', () => {
			const rule: Rule = {
			platform: 'cursor',
				uri: makeUri('/r.mdc') as any,
				metadata: { description: 'D' },
				content: 'full **markdown**',
				fileName: 'r.mdc'
			};
			const content = toRuleContent(rule);
			assert.strictEqual(content.content, 'full **markdown**');
			assert.strictEqual(content.name, 'r');
		});

		it('toRuleContent uses always and glob types like toRuleInfo', () => {
			const always: Rule = {
			platform: 'cursor',
				uri: makeUri('/a.mdc') as any,
				metadata: { description: 'A', alwaysApply: true },
				content: 'x',
				fileName: 'a.mdc'
			};
			assert.strictEqual(toRuleContent(always).type, 'always');

			const glob: Rule = {
			platform: 'cursor',
				uri: makeUri('/g.mdc') as any,
				metadata: { description: 'G', globs: ['*.md'] },
				content: 'y',
				fileName: 'g.mdc'
			};
			assert.strictEqual(toRuleContent(glob).type, 'glob');
		});
	});

	describe('toCommandInfo / toCommandContent', () => {
		it('toCommandInfo extracts description from Overview', () => {
			const cmd: Command = {
			platform: 'cursor',
				uri: makeUri('/cmd.md') as any,
				content: '# Cmd\n\n## Overview\n\nDo something useful.\n\n## Steps',
				fileName: 'cmd.md',
				location: 'workspace'
			};
			const info = toCommandInfo(cmd);
			assert.strictEqual(info.name, 'cmd');
			assert.strictEqual(info.description, 'Do something useful.');
			assert.strictEqual(info.location, 'workspace');
		});

		it('toCommandInfo falls back to first non-heading paragraph when no Overview', () => {
			const cmd: Command = {
			platform: 'cursor',
				uri: makeUri('/n.md') as any,
				content: '# Title\n\nFirst paragraph line.\n\n## Other',
				fileName: 'n.md',
				location: 'global'
			};
			const info = toCommandInfo(cmd);
			assert.ok(info.description.includes('First paragraph'));
		});

		it('toCommandInfo returns empty description when no usable paragraph', () => {
			const cmd: Command = {
			platform: 'cursor',
				uri: makeUri('/empty.md') as any,
				content: '# Only\n\n- list item',
				fileName: 'empty.md',
				location: 'workspace'
			};
			const info = toCommandInfo(cmd);
			assert.strictEqual(info.description, '');
		});

		it('toCommandContent includes full content', () => {
			const cmd: Command = {
			platform: 'cursor',
				uri: makeUri('/c.md') as any,
				content: 'Full body',
				fileName: 'c.md',
				location: 'global'
			};
			const out = toCommandContent(cmd);
			assert.strictEqual(out.content, 'Full body');
			assert.strictEqual(out.location, 'global');
		});
	});

	describe('toSkillInfo / toSkillContent', () => {
		it('toSkillInfo maps metadata title and overview', () => {
			const skill: Skill = {
			platform: 'cursor',
				uri: makeUri('/skill/SKILL.md') as any,
				content: '# Skill',
				fileName: 'skill-name',
				location: 'workspace',
				metadata: { title: 'My Skill', overview: 'Overview text' }
			};
			const info = toSkillInfo(skill);
			assert.strictEqual(info.name, 'skill-name');
			assert.strictEqual(info.title, 'My Skill');
			assert.strictEqual(info.overview, 'Overview text');
		});

		it('toSkillContent includes metadata prerequisites, steps, tools', () => {
			const skill: Skill = {
			platform: 'cursor',
				uri: makeUri('/s/SKILL.md') as any,
				content: 'Body',
				fileName: 's',
				location: 'global',
				metadata: { prerequisites: ['a'], steps: ['b'], tools: ['c'] }
			};
			const out = toSkillContent(skill);
			assert.strictEqual(out.content, 'Body');
			assert.deepStrictEqual(out.metadata?.prerequisites, ['a']);
			assert.deepStrictEqual(out.metadata?.steps, ['b']);
			assert.deepStrictEqual(out.metadata?.tools, ['c']);
		});
	});
});
