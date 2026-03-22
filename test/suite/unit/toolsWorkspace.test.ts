import * as assert from 'assert';
import * as vscode from 'vscode';
import { assertWorkspaceUriForMcp, resolveWorkspaceUriForMcp } from '../../../src/mcp/toolsWorkspace';

describe('mcp/toolsWorkspace', () => {
	const origFolders = vscode.workspace.workspaceFolders;

	afterEach(() => {
		(vscode.workspace as any).workspaceFolders = origFolders;
	});

	it('returns file URI when projectPath is set', () => {
		(vscode.workspace as any).workspaceFolders = undefined;
		const u = resolveWorkspaceUriForMcp('/tmp/proj');
		assert.strictEqual(u?.fsPath, '/tmp/proj');
	});

	it('returns first workspace folder when projectPath is undefined', () => {
		(vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.file('/ws/a'), name: 'a' }];
		const u = resolveWorkspaceUriForMcp();
		assert.strictEqual(u?.fsPath, '/ws/a');
	});

	it('returns undefined when no projectPath and no workspace folders', () => {
		(vscode.workspace as any).workspaceFolders = undefined;
		assert.strictEqual(resolveWorkspaceUriForMcp(), undefined);
	});

	it('returns undefined when workspaceFolders is empty array', () => {
		(vscode.workspace as any).workspaceFolders = [];
		assert.strictEqual(resolveWorkspaceUriForMcp(), undefined);
	});

	it('assertWorkspaceUriForMcp throws when no workspace', () => {
		(vscode.workspace as any).workspaceFolders = undefined;
		assert.throws(() => assertWorkspaceUriForMcp(), /No workspace folder found/);
	});

	it('assertWorkspaceUriForMcp returns uri when projectPath or workspace set', () => {
		(vscode.workspace as any).workspaceFolders = undefined;
		assert.strictEqual(assertWorkspaceUriForMcp('/p').fsPath, '/p');
		(vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.file('/ws'), name: 'w' }];
		assert.strictEqual(assertWorkspaceUriForMcp().fsPath, '/ws');
	});
});
