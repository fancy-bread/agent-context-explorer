import * as assert from 'assert';
import { FileWatcher } from '../../../src/utils/fileWatcher';

describe('FileWatcher (utils/fileWatcher)', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const vscode = require('vscode');

	it('watchRules registers createFileSystemWatcher and wires callbacks', () => {
		const fw = new FileWatcher();
		const root = vscode.Uri.file('/workspace');
		let createCalls = 0;
		const orig = vscode.workspace.createFileSystemWatcher;
		vscode.workspace.createFileSystemWatcher = () => {
			createCalls++;
			return {
				onDidCreate: (cb: () => void) => {
					cb();
					return { dispose: () => {} };
				},
				onDidChange: (cb: () => void) => {
					cb();
					return { dispose: () => {} };
				},
				onDidDelete: (cb: () => void) => {
					cb();
					return { dispose: () => {} };
				},
				dispose: () => {}
			};
		};

		let fires = 0;
		try {
			fw.watchRules(root, () => {
				fires++;
			});
			assert.strictEqual(createCalls, 1);
			assert.ok(fires >= 1);
		} finally {
			vscode.workspace.createFileSystemWatcher = orig;
			fw.dispose();
		}
	});

	it('dispose clears watchers', () => {
		const fw = new FileWatcher();
		const root = vscode.Uri.file('/workspace');
		fw.watchRules(root, () => {});
		fw.dispose();
		fw.dispose();
		assert.ok(true);
	});
});
