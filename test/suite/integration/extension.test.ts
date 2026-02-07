import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
	test('Extension should be present', () => {
		const extension = vscode.extensions.getExtension('fancybread-com.agent-context-explorer');
		assert.ok(extension);
	});

	test('Extension should have required commands', async () => {
		const commands = await vscode.commands.getCommands(true);
		const requiredCommands = [
			'ace.refresh',
			'ace.addProject',
			'ace.viewStateSection'
		];

		for (const command of requiredCommands) {
			assert.ok(commands.includes(command), `Command ${command} should be registered`);
		}
	});

	test('Extension should activate without errors', async () => {
		const extension = vscode.extensions.getExtension('fancybread-com.agent-context-explorer');
		if (extension) {
			await extension.activate();
			assert.ok(extension.isActive);
		}
	});

	test('Extension should have correct metadata', () => {
		const extension = vscode.extensions.getExtension('fancybread-com.agent-context-explorer');
		if (extension) {
			const packageJSON = extension.packageJSON;
			assert.equal(packageJSON.name, 'agent-context-explorer');
			assert.equal(packageJSON.publisher, 'fancybread-com');
			assert.ok(packageJSON.version);
		}
	});
});
