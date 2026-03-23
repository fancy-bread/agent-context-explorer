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
import { AgentsScanner, AgentDefinition } from '../../../src/scanner/agentsScanner';
import * as agentsScanner from '../../../src/scanner/agentsScanner';

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
	const agentsWorkspaceScan = AgentsScanner.prototype.scanWorkspaceAgentDefinitions;
	const agentsScanRoot = agentsScanner.scanAgentDefinitionsForAgentRoot;
	const agentsModuleMutable = agentsScanner as unknown as {
		scanAgentDefinitionsForAgentRoot: typeof agentsScanner.scanAgentDefinitionsForAgentRoot;
	};

	afterEach(() => {
		(vscode.workspace as any).workspaceFolders = originalWorkspaceFolders;
		RulesScanner.prototype.scanRules = rulesScan;
		CommandsScanner.prototype.scanWorkspaceCommands = commandsWorkspaceScan;
		CommandsScanner.prototype.scanGlobalCommands = commandsGlobalScan;
		SkillsScanner.prototype.scanWorkspaceSkills = skillsWorkspaceScan;
		SkillsScanner.prototype.scanGlobalSkills = skillsGlobalScan;
		AsdlcArtifactScanner.prototype.scanAll = asdlcScanAll;
		AgentsScanner.prototype.scanWorkspaceAgentDefinitions = agentsWorkspaceScan;
		agentsModuleMutable.scanAgentDefinitionsForAgentRoot = agentsScanRoot;
	});

	it('throws when no workspace and no projectPath', async () => {
		(vscode.workspace as any).workspaceFolders = undefined;
		await assert.rejects(() => McpTools.listRules({}), /No workspace folder found/i);
	});

	it('throws when workspaceFolders is empty and no projectPath', async () => {
		(vscode.workspace as any).workspaceFolders = [];
		await assert.rejects(() => McpTools.listRules({}), /No workspace folder found/i);
	});

	it('getSkill matches by path includes when fileName does not equal search name', async () => {
		setWorkspaceFolders('/workspace');
		const s: Skill = {
			uri: vscode.Uri.file('/workspace/.cursor/skills/nested-only/bar/SKILL.md') as any,
			fileName: 'bar',
			content: 'path-match',
			location: 'workspace',
			metadata: {}
		};
		SkillsScanner.prototype.scanWorkspaceSkills = async () => [s];
		SkillsScanner.prototype.scanGlobalSkills = async () => [];

		const out = await McpTools.getSkill({ name: 'nested-only', projectPath: '/workspace' });
		assert.ok(out);
		assert.strictEqual(out?.content, 'path-match');
	});

	it('getSkill matches by fileName equality only (first branch of find)', async () => {
		setWorkspaceFolders('/workspace');
		const s: Skill = {
			uri: vscode.Uri.file('/workspace/.cursor/skills/onlyname/SKILL.md') as any,
			fileName: 'onlyname',
			content: 'x',
			location: 'workspace',
			metadata: { title: 'T' }
		};
		SkillsScanner.prototype.scanWorkspaceSkills = async () => [s];
		SkillsScanner.prototype.scanGlobalSkills = async () => [];

		const out = await McpTools.getSkill({ name: 'ONLYNAME', projectPath: '/workspace' });
		assert.ok(out);
		assert.strictEqual(out?.content, 'x');
	});

	it('getCommand matches by path includes only (second find branch)', async () => {
		setWorkspaceFolders('/workspace');
		const c: Command = {
			uri: vscode.Uri.file('/workspace/.cursor/commands/deep/nested/cmd.md') as any,
			fileName: 'cmd.md',
			content: 'deep',
			location: 'workspace'
		};
		CommandsScanner.prototype.scanWorkspaceCommands = async () => [c];
		CommandsScanner.prototype.scanGlobalCommands = async () => [];

		const out = await McpTools.getCommand({ name: 'deep/nested', projectPath: '/workspace' });
		assert.ok(out);
		assert.strictEqual(out?.content, 'deep');
	});

	it('getAsdlcArtifacts and listSpecs use projectPath', async () => {
		setWorkspaceFolders('/other');
		AsdlcArtifactScanner.prototype.scanAll = async () => ({
			agentsMd: { exists: false, sections: [] },
			specs: { exists: true, specs: [{ domain: 'd', path: 'p', hasBlueprint: true, hasContract: false }] },
			schemas: { exists: false, schemas: [] },
			hasAnyArtifacts: true
		});

		const arts = await McpTools.getAsdlcArtifacts({ projectPath: process.cwd() });
		assert.strictEqual(arts.specs.specs.length, 1);

		const specs = await McpTools.listSpecs({ projectPath: process.cwd() });
		assert.strictEqual(specs[0].domain, 'd');
	});

	it('listRules, listCommands, listSkills, getProjectContext with explicit projectPath (no default workspace)', async () => {
		(vscode.workspace as any).workspaceFolders = undefined;
		RulesScanner.prototype.scanRules = async () => [];
		CommandsScanner.prototype.scanWorkspaceCommands = async () => [];
		CommandsScanner.prototype.scanGlobalCommands = async () => [];
		SkillsScanner.prototype.scanWorkspaceSkills = async () => [];
		SkillsScanner.prototype.scanGlobalSkills = async () => [];
		AgentsScanner.prototype.scanWorkspaceAgentDefinitions = async () => [];
		agentsModuleMutable.scanAgentDefinitionsForAgentRoot = async () => [];
		AsdlcArtifactScanner.prototype.scanAll = async () => ({
			agentsMd: { exists: false, sections: [] },
			specs: { exists: false, specs: [] },
			schemas: { exists: false, schemas: [] },
			hasAnyArtifacts: false
		});

		const cwd = process.cwd();
		const lr = await McpTools.listRules({ projectPath: cwd });
		const lc = await McpTools.listCommands({ projectPath: cwd });
		const ls = await McpTools.listSkills({ projectPath: cwd });
		const ctx = await McpTools.getProjectContext({ projectPath: cwd });
		assert.deepStrictEqual(lr, []);
		assert.deepStrictEqual(lc, []);
		assert.deepStrictEqual(ls, []);
		assert.deepStrictEqual(ctx.agentDefinitions, []);
		assert.strictEqual(ctx.projectPath, cwd);
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

	it('getCommand finds by path substring match', async () => {
		setWorkspaceFolders('/workspace');
		const c: Command = {
			uri: vscode.Uri.file('/workspace/.cursor/commands/foo-bar.md') as any,
			fileName: 'foo-bar.md',
			content: 'cmd',
			location: 'workspace'
		};
		CommandsScanner.prototype.scanWorkspaceCommands = async () => [c];
		CommandsScanner.prototype.scanGlobalCommands = async () => [];

		const out = await McpTools.getCommand({ name: 'foo-bar.md', projectPath: '/workspace' });
		assert.ok(out);
		assert.strictEqual(out?.content, 'cmd');
	});

	it('getRule returns null when no rule matches', async () => {
		setWorkspaceFolders('/workspace');
		RulesScanner.prototype.scanRules = async () => [];

		const out = await McpTools.getRule({ name: 'nope', projectPath: '/workspace' });
		assert.strictEqual(out, null);
	});

	it('getRule matches by uri path substring', async () => {
		setWorkspaceFolders('/workspace');
		const rule: Rule = {
			uri: vscode.Uri.file('/workspace/.cursor/rules/nested/X.mdc') as any,
			fileName: 'X.mdc',
			content: 'nested',
			metadata: { description: 'D' }
		};
		RulesScanner.prototype.scanRules = async () => [rule];

		const out = await McpTools.getRule({ name: 'nested/x', projectPath: '/workspace' });
		assert.ok(out);
		assert.strictEqual(out?.content, 'nested');
	});

	it('getRule matches by path includes when normalized file name differs', async () => {
		setWorkspaceFolders('/workspace');
		const rule: Rule = {
			uri: vscode.Uri.file('/workspace/.cursor/rules/subdir/my-rule.mdc') as any,
			fileName: 'my-rule.mdc',
			content: 'by-path',
			metadata: { description: 'D' }
		};
		RulesScanner.prototype.scanRules = async () => [rule];

		const out = await McpTools.getRule({ name: 'subdir', projectPath: '/workspace' });
		assert.ok(out);
		assert.strictEqual(out?.content, 'by-path');
	});

	it('getRule matches by normalized file name (first find branch)', async () => {
		setWorkspaceFolders('/workspace');
		const rule: Rule = {
			uri: vscode.Uri.file('/workspace/.cursor/rules/alpha.mdc') as any,
			fileName: 'alpha.mdc',
			content: 'by-name',
			metadata: { description: 'D' }
		};
		RulesScanner.prototype.scanRules = async () => [rule];

		const out = await McpTools.getRule({ name: 'ALPHA', projectPath: '/workspace' });
		assert.ok(out);
		assert.strictEqual(out?.content, 'by-name');
	});

	it('getCommand matches by normalized name without path substring', async () => {
		setWorkspaceFolders('/workspace');
		const c: Command = {
			uri: vscode.Uri.file('/workspace/.cursor/commands/plan.md') as any,
			fileName: 'plan.md',
			content: 'c',
			location: 'workspace'
		};
		CommandsScanner.prototype.scanWorkspaceCommands = async () => [c];
		CommandsScanner.prototype.scanGlobalCommands = async () => [];

		const out = await McpTools.getCommand({ name: 'plan', projectPath: '/workspace' });
		assert.ok(out);
		assert.strictEqual(out?.content, 'c');
	});

	it('getSkill returns null when no skill matches', async () => {
		setWorkspaceFolders('/workspace');
		SkillsScanner.prototype.scanWorkspaceSkills = async () => [];
		SkillsScanner.prototype.scanGlobalSkills = async () => [];

		const out = await McpTools.getSkill({ name: 'nope', projectPath: '/workspace' });
		assert.strictEqual(out, null);
	});

	it('getSkill returns skill content when found', async () => {
		setWorkspaceFolders('/workspace');
		const s: Skill = {
			uri: vscode.Uri.file('/workspace/.cursor/skills/foo/SKILL.md') as any,
			fileName: 'foo',
			content: 'skill body',
			location: 'workspace',
			metadata: { title: 'T', overview: 'o' }
		};
		SkillsScanner.prototype.scanWorkspaceSkills = async () => [s];
		SkillsScanner.prototype.scanGlobalSkills = async () => [];

		const out = await McpTools.getSkill({ name: 'foo', projectPath: '/workspace' });
		assert.ok(out);
		assert.strictEqual(out?.content, 'skill body');
	});

	it('getSkill matches by path substring', async () => {
		setWorkspaceFolders('/workspace');
		const s: Skill = {
			uri: vscode.Uri.file('/workspace/.cursor/skills/bar/SKILL.md') as any,
			fileName: 'bar',
			content: 'b',
			location: 'workspace',
			metadata: {}
		};
		SkillsScanner.prototype.scanWorkspaceSkills = async () => [s];
		SkillsScanner.prototype.scanGlobalSkills = async () => [];

		const out = await McpTools.getSkill({ name: 'skills/bar', projectPath: '/workspace' });
		assert.ok(out);
	});

	it('listSpecs returns specs from scanAll', async () => {
		setWorkspaceFolders('/workspace');
		AsdlcArtifactScanner.prototype.scanAll = async () => ({
			agentsMd: { exists: true, sections: [] },
			specs: {
				exists: true,
				specs: [{ path: 'specs/a/spec.md', domain: 'a', hasBlueprint: true, hasContract: false }]
			},
			schemas: { exists: false, schemas: [] },
			hasAnyArtifacts: true
		});

		const out = await McpTools.listSpecs({ projectPath: '/workspace' });
		assert.strictEqual(out.length, 1);
		assert.strictEqual(out[0].domain, 'a');
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
		AgentsScanner.prototype.scanWorkspaceAgentDefinitions = async () => [];
		agentsModuleMutable.scanAgentDefinitionsForAgentRoot = async () => [];
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
		assert.deepStrictEqual(out.agentDefinitions, []);
		assert.strictEqual(out.asdlcArtifacts.hasAnyArtifacts, false);
	});

	it('listAgentDefinitions merges workspace and agent-root stubs', async () => {
		setWorkspaceFolders('/workspace');
		const wsAgent: AgentDefinition = {
			uri: vscode.Uri.file('/workspace/.cursor/agents/ws.md') as any,
			fileName: 'ws',
			displayName: 'ws',
			content: '# WS'
		};
		const cursorAgent: AgentDefinition = {
			uri: vscode.Uri.file('/home/.cursor/agents/cursor.md') as any,
			fileName: 'cursor',
			displayName: 'cursor',
			content: '# C'
		};
		AgentsScanner.prototype.scanWorkspaceAgentDefinitions = async () => [wsAgent];
		agentsModuleMutable.scanAgentDefinitionsForAgentRoot = async (root: string) =>
			root.includes('.cursor') ? [cursorAgent] : [];

		const out = await McpTools.listAgentDefinitions({ projectPath: '/workspace' });
		assert.strictEqual(out.length, 2);
		assert.ok(out.some(a => a.name === 'ws' && a.location === 'workspace'));
		assert.ok(out.some(a => a.name === 'cursor' && a.location === 'cursor'));
	});

	it('getAgentDefinition returns content when found', async () => {
		setWorkspaceFolders('/workspace');
		const wsAgent: AgentDefinition = {
			uri: vscode.Uri.file('/workspace/.cursor/agents/foo.md') as any,
			fileName: 'foo',
			displayName: 'foo',
			content: '# Foo body'
		};
		AgentsScanner.prototype.scanWorkspaceAgentDefinitions = async () => [wsAgent];
		agentsModuleMutable.scanAgentDefinitionsForAgentRoot = async () => [];

		const out = await McpTools.getAgentDefinition({ name: 'foo', projectPath: '/workspace' });
		assert.ok(out);
		assert.strictEqual(out?.content, '# Foo body');
		assert.strictEqual(out?.location, 'workspace');
	});

	it('getAgentDefinition returns null when not found', async () => {
		setWorkspaceFolders('/workspace');
		AgentsScanner.prototype.scanWorkspaceAgentDefinitions = async () => [];
		agentsModuleMutable.scanAgentDefinitionsForAgentRoot = async () => [];

		const out = await McpTools.getAgentDefinition({ name: 'nope', projectPath: '/workspace' });
		assert.strictEqual(out, null);
	});
});

