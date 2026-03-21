import * as assert from 'assert';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const vscode = require('vscode');

function makeContext(): any {
	return {
		subscriptions: [] as { dispose: () => void }[],
		extensionPath: path.join(process.cwd(), 'out')
	};
}

function patchVscodeForExtension(): void {
	vscode.workspace.workspaceFolders = [{ uri: vscode.Uri.file('/workspace'), name: 'ws' }];
	vscode.lm = {
		registerMcpServerDefinitionProvider: () => ({ dispose: () => {} })
	};
	vscode.workspace.onDidChangeWorkspaceFolders = () => ({ dispose: () => {} });
}

describe('extension activate / deactivate', () => {
	let extension: typeof import('../../../src/extension');

	before(function () {
		patchVscodeForExtension();
		// Use cwd (repo root): works for ts-node and compiled `out/test/**/*.test.js`
		const extPath = path.join(process.cwd(), 'src', 'extension.ts');
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		extension = require(extPath);
	});

	afterEach(() => {
		try {
			extension.deactivate();
		} catch {
			// ignore
		}
	});

	it('activate completes and deactivate runs without throw', function () {
		if (!extension) {
			this.skip();
		}
		const ctx = makeContext();
		assert.doesNotThrow(() => {
			extension.activate(ctx as any);
			extension.deactivate();
		});
	});

	it('second activate in same session is a no-op', function () {
		if (!extension) {
			this.skip();
		}
		const ctx = makeContext();
		extension.activate(ctx as any);
		assert.doesNotThrow(() => extension.activate(ctx as any));
		extension.deactivate();
	});
});
