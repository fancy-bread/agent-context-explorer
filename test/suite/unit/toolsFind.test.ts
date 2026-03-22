import * as assert from 'assert';
import * as vscode from 'vscode';
import { findRuleByName, findCommandByName, findSkillByName } from '../../../src/mcp/toolsFind';
import type { Rule } from '../../../src/scanner/rulesScanner';
import type { Command } from '../../../src/scanner/commandsScanner';
import type { Skill } from '../../../src/scanner/skillsScanner';

describe('mcp/toolsFind', () => {
	describe('findRuleByName', () => {
		const mk = (fileName: string, fsPath: string): Rule => ({
			uri: vscode.Uri.file(fsPath) as any,
			fileName,
			content: '',
			metadata: { description: '' }
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
	});

	describe('findCommandByName', () => {
		const mk = (fileName: string, fsPath: string): Command => ({
			uri: vscode.Uri.file(fsPath) as any,
			fileName,
			content: '',
			location: 'workspace'
		});

		it('matches by normalized file name', () => {
			const c = mk('cmd.md', '/workspace/.cursor/commands/cmd.md');
			assert.strictEqual(findCommandByName([c], 'cmd')?.fileName, 'cmd.md');
		});

		it('matches by path substring', () => {
			const c = mk('c.md', '/workspace/.cursor/commands/nested/c.md');
			assert.strictEqual(findCommandByName([c], 'nested')?.fileName, 'c.md');
		});
	});

	describe('findSkillByName', () => {
		const mk = (fileName: string, fsPath: string): Skill => ({
			uri: vscode.Uri.file(fsPath) as any,
			fileName,
			content: '',
			location: 'workspace',
			metadata: {}
		});

		it('matches by directory name', () => {
			const s = mk('sk', '/workspace/.cursor/skills/sk/SKILL.md');
			assert.strictEqual(findSkillByName([s], 'sk')?.fileName, 'sk');
		});

		it('matches by path substring', () => {
			const s = mk('bar', '/workspace/.cursor/skills/nested/bar/SKILL.md');
			assert.strictEqual(findSkillByName([s], 'nested')?.fileName, 'bar');
		});
	});
});
