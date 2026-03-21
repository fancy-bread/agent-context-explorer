import * as assert from 'assert';

import * as vscode from 'vscode';

import { McpResources } from '../../../src/mcp/resources';
import { RulesScanner } from '../../../src/scanner/rulesScanner';
import { CommandsScanner } from '../../../src/scanner/commandsScanner';
import { AsdlcArtifactScanner } from '../../../src/scanner/asdlcArtifactScanner';

describe('mcp/resources (McpResources)', () => {
	const originalRulesScan = RulesScanner.prototype.scanRules;
	const originalWorkspaceCommandsScan = CommandsScanner.prototype.scanWorkspaceCommands;
	const originalGlobalCommandsScan = CommandsScanner.prototype.scanGlobalCommands;
	const originalAsdlcScanAll = AsdlcArtifactScanner.prototype.scanAll;
	const originalWorkspaceFsReadFile = vscode.workspace.fs.readFile;

	beforeEach(() => {
		(RulesScanner.prototype.scanRules as any) = async () => ([
			{
				fileName: 'My-Rule.mdc',
				path: '/tmp/My-Rule.mdc',
				uri: vscode.Uri.file('/tmp/My-Rule.mdc'),
				content: '# My rule',
				metadata: { description: 'D', alwaysApply: true }
			}
		]);

		(CommandsScanner.prototype.scanWorkspaceCommands as any) = async () => ([
			{
				fileName: 'hello.md',
				path: '/tmp/hello.md',
				uri: vscode.Uri.file('/tmp/hello.md'),
				content: '# Hello\n\nHi'
			}
		]);

		(CommandsScanner.prototype.scanGlobalCommands as any) = async () => ([
			{
				fileName: 'global.md',
				path: '/tmp/global.md',
				uri: vscode.Uri.file('/tmp/global.md'),
				content: '# Global\n\nHi'
			}
		]);

		(AsdlcArtifactScanner.prototype.scanAll as any) = async () => ({
			agentsMd: { exists: false },
			specs: { exists: true, specs: [{ domain: 'demo', path: '/tmp/spec.md', hasBlueprint: false, hasContract: false }] },
			schemas: { exists: true, schemas: [{ name: 'schema', path: '/tmp/schema.json', schemaId: 'id' }] },
			hasAnyArtifacts: true
		});

		// Minimal workspace.fs override for resource content reads (spec/schema); return Buffer content.
		(vscode.workspace.fs.readFile as any) = async () => Buffer.from('content', 'utf8');
	});

	afterEach(() => {
		(RulesScanner.prototype.scanRules as any) = originalRulesScan;
		(CommandsScanner.prototype.scanWorkspaceCommands as any) = originalWorkspaceCommandsScan;
		(CommandsScanner.prototype.scanGlobalCommands as any) = originalGlobalCommandsScan;
		(AsdlcArtifactScanner.prototype.scanAll as any) = originalAsdlcScanAll;
		(vscode.workspace.fs.readFile as any) = originalWorkspaceFsReadFile;
	});

	it('listResources returns combined rules/commands/asdlc resources', async () => {
		const r = new McpResources(vscode.Uri.file('/workspace'));
		const resources = await r.listResources();

		assert.ok(resources.find(x => x.uri === 'ace://rules'));
		assert.ok(resources.find(x => x.uri === 'ace://rules/My-Rule'));
		assert.ok(resources.find(x => x.uri === 'ace://commands'));
		assert.ok(resources.find(x => x.uri === 'ace://commands/hello'));
		assert.ok(resources.find(x => x.uri === 'ace://specs'));
		assert.ok(resources.find(x => x.uri === 'ace://specs/demo'));
		assert.ok(resources.find(x => x.uri === 'ace://schemas'));
		assert.ok(resources.find(x => x.uri === 'ace://schemas/schema'));
	});

	it('getResource returns null for non-ace scheme and unknown resource types', async () => {
		const r = new McpResources(vscode.Uri.file('/workspace'));
		assert.strictEqual(await r.getResource('file:///x'), null);
		assert.strictEqual(await r.getResource('ace://nope/thing'), null);
	});

	it('getResource returns list content for ace://rules and ace://commands', async () => {
		const r = new McpResources(vscode.Uri.file('/workspace'));

		const rules = await r.getResource('ace://rules');
		assert.ok(rules);
		assert.strictEqual(rules!.mimeType, 'application/json');
		assert.ok(rules!.content.includes('My-Rule'));

		const commands = await r.getResource('ace://commands');
		assert.ok(commands);
		assert.strictEqual(commands!.mimeType, 'application/json');
		assert.ok(commands!.content.includes('hello'));
		assert.ok(commands!.content.includes('global'));
	});

	it('getResource returns null for missing rule/command and returns markdown for existing', async () => {
		const r = new McpResources(vscode.Uri.file('/workspace'));

		assert.strictEqual(await r.getResource('ace://rules/unknown'), null);
		const rule = await r.getResource('ace://rules/My-Rule');
		assert.ok(rule);
		assert.strictEqual(rule!.mimeType, 'text/markdown');

		assert.strictEqual(await r.getResource('ace://commands/missing'), null);
		const cmd = await r.getResource('ace://commands/hello');
		assert.ok(cmd);
		assert.strictEqual(cmd!.mimeType, 'text/markdown');
	});

	it('getResource returns spec/schema content via workspace.fs', async () => {
		const r = new McpResources(vscode.Uri.file('/workspace'));

		const spec = await r.getResource('ace://specs/demo');
		assert.ok(spec);
		assert.strictEqual(spec!.mimeType, 'text/markdown');
		assert.strictEqual(spec!.content, 'content');

		const schema = await r.getResource('ace://schemas/schema');
		assert.ok(schema);
		assert.strictEqual(schema!.mimeType, 'application/json');
		assert.strictEqual(schema!.content, 'content');
	});
});

