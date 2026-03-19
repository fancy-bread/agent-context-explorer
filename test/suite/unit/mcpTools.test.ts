import * as assert from 'assert';
import * as vscode from 'vscode';
import { McpTools } from '../../../src/mcp/tools';

import type { Rule } from '../../../src/scanner/rulesScanner';
import type { Command } from '../../../src/scanner/commandsScanner';
import type { Skill } from '../../../src/scanner/skillsScanner';

import { RulesScanner } from '../../../src/scanner/rulesScanner';
import { CommandsScanner } from '../../../src/scanner/commandsScanner';
import { SkillsScanner } from '../../../src/scanner/skillsScanner';
import { AsdlcArtifactScanner } from '../../../src/scanner/asdlcArtifactScanner';

function setWorkspaceFolders(fsPath: string): void {
	(vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.file(fsPath), name: 'WS' }];
}

describe('mcp/tools (McpTools)', () => {
	const originalWorkspaceFolders = (vscode.workspace as any).workspaceFolders;

	const rulesScan = RulesScanner.prototype.scanRules;
	const commandsWorkspaceScan = CommandsScanner.prototype.scanWorkspaceCommands;
	const commandsGlobalScan = CommandsScanner.prototype.scanGlobalCommands;
	const skillsWorkspaceScan = SkillsScanner.prototype.scanWorkspaceSkills;
	const skillsGlobalScan = SkillsScanner.prototype.scanGlobalSkills;
	const asdlcScanAll = AsdlcArtifactScanner.prototype.scanAll;

	afterEach(() => {
		(vscode.workspace as any).workspaceFolders = originalWorkspaceFolders;
		RulesScanner.prototype.scanRules = rulesScan;
		CommandsScanner.prototype.scanWorkspaceCommands = commandsWorkspaceScan;
		CommandsScanner.prototype.scanGlobalCommands = commandsGlobalScan;
		SkillsScanner.prototype.scanWorkspaceSkills = skillsWorkspaceScan;
		SkillsScanner.prototype.scanGlobalSkills = skillsGlobalScan;
		AsdlcArtifactScanner.prototype.scanAll = asdlcScanAll;
	});

	it('throws when no workspace and no projectPath', async () => {
		(vscode.workspace as any).workspaceFolders = undefined;
		await assert.rejects(() => McpTools.listRules({}), /No workspace folder found/i);
	});

	it('listRules uses RulesScanner and returns RuleInfo', async () => {
		setWorkspaceFolders('/workspace');
		const rule: Rule = {
			uri: vscode.Uri.file('/workspace/.cursor/rules/a.mdc') as any,
			fileName: 'a.mdc',
			content: 'body',
			metadata: { description: 'Desc', globs: ['*.ts'], alwaysApply: false }
		};
		RulesScanner.prototype.scanRules = async () => [rule];

		const out = await McpTools.listRules({});
		assert.strictEqual(out.length, 1);
		assert.strictEqual(out[0].name, 'a');
		assert.strictEqual(out[0].path, '/workspace/.cursor/rules/a.mdc');
	});

	it('getRule finds by normalized name and returns content', async () => {
		setWorkspaceFolders('/workspace');
		const rule: Rule = {
			uri: vscode.Uri.file('/workspace/.cursor/rules/My-Rule.mdc') as any,
			fileName: 'My-Rule.mdc',
			content: 'hello',
			metadata: { description: 'D' }
		};
		RulesScanner.prototype.scanRules = async () => [rule];

		const out = await McpTools.getRule({ name: 'my-rule', projectPath: '/workspace' });
		assert.ok(out);
		// get_rule returns name derived from fileName (extension stripped), not lowercased
		assert.strictEqual(out?.name, 'My-Rule');
		assert.strictEqual(out?.content, 'hello');
	});

	it('listCommands returns combined workspace + global', async () => {
		setWorkspaceFolders('/workspace');
		const w: Command = { uri: vscode.Uri.file('/w.md') as any, fileName: 'w.md', content: '# W', location: 'workspace' };
		const g: Command = { uri: vscode.Uri.file('/g.md') as any, fileName: 'g.md', content: '# G', location: 'global' };
		CommandsScanner.prototype.scanWorkspaceCommands = async () => [w];
		CommandsScanner.prototype.scanGlobalCommands = async () => [g];

		const out = await McpTools.listCommands({ projectPath: '/workspace' });
		assert.strictEqual(out.length, 2);
		assert.ok(out.some(c => c.name === 'w'));
		assert.ok(out.some(c => c.name === 'g'));
	});

	it('getCommand returns null when not found', async () => {
		setWorkspaceFolders('/workspace');
		CommandsScanner.prototype.scanWorkspaceCommands = async () => [];
		CommandsScanner.prototype.scanGlobalCommands = async () => [];

		const out = await McpTools.getCommand({ name: 'missing', projectPath: '/workspace' });
		assert.strictEqual(out, null);
	});

	it('listSkills returns combined workspace + global', async () => {
		setWorkspaceFolders('/workspace');
		const w: Skill = {
			uri: vscode.Uri.file('/w/SKILL.md') as any,
			fileName: 'w-skill',
			content: '',
			location: 'workspace',
			metadata: { title: 'W', overview: 'o' }
		};
		const g: Skill = {
			uri: vscode.Uri.file('/g/SKILL.md') as any,
			fileName: 'g-skill',
			content: '',
			location: 'global',
			metadata: { title: 'G', overview: 'o' }
		};
		SkillsScanner.prototype.scanWorkspaceSkills = async () => [w];
		SkillsScanner.prototype.scanGlobalSkills = async () => [g];

		const out = await McpTools.listSkills({ projectPath: '/workspace' });
		assert.strictEqual(out.length, 2);
		assert.ok(out.some(s => s.name === 'w-skill' && s.title === 'W'));
		assert.ok(out.some(s => s.name === 'g-skill' && s.title === 'G'));
	});

	it('getAsdlcArtifacts delegates to AsdlcArtifactScanner.scanAll', async () => {
		setWorkspaceFolders('/workspace');
		AsdlcArtifactScanner.prototype.scanAll = async () => ({
			agentsMd: { exists: false, sections: [] },
			specs: { exists: false, specs: [] },
			schemas: { exists: false, schemas: [] },
			hasAnyArtifacts: false
		});

		const out = await McpTools.getAsdlcArtifacts({ projectPath: '/workspace' });
		assert.strictEqual(out.hasAnyArtifacts, false);
	});

	it('getProjectContext composes results', async () => {
		setWorkspaceFolders('/workspace');
		RulesScanner.prototype.scanRules = async () => [];
		CommandsScanner.prototype.scanWorkspaceCommands = async () => [];
		CommandsScanner.prototype.scanGlobalCommands = async () => [];
		SkillsScanner.prototype.scanWorkspaceSkills = async () => [];
		SkillsScanner.prototype.scanGlobalSkills = async () => [];
		AsdlcArtifactScanner.prototype.scanAll = async () => ({
			agentsMd: { exists: false, sections: [] },
			specs: { exists: false, specs: [] },
			schemas: { exists: false, schemas: [] },
			hasAnyArtifacts: false
		});

		const out = await McpTools.getProjectContext({ projectPath: '/workspace' });
		assert.strictEqual(out.projectPath, '/workspace');
		assert.ok(typeof out.timestamp === 'string');
		assert.deepStrictEqual(out.rules, []);
		assert.deepStrictEqual(out.commands, []);
		assert.deepStrictEqual(out.skills, []);
		assert.strictEqual(out.asdlcArtifacts.hasAnyArtifacts, false);
	});
});

