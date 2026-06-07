// Unit tests for McpRegistrationService
import * as assert from 'assert';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { McpRegistrationService } from '../../../src/services/mcpRegistrationService';

// vscode stub is loaded via the package alias
const vscodeStub = require('vscode');

const tmpDir = os.tmpdir();

function tmpFile(suffix: string): string {
	return path.join(tmpDir, `mcp-svc-test-${suffix}-${Date.now()}.json`);
}

function cleanUp(p: string): void {
	try { fs.unlinkSync(p); } catch { /* ignore */ }
}

function makeService(claudeJsonPath: string, extPath: string): McpRegistrationService {
	// Override homeDir so the service uses our temp file by monkey-patching.
	// McpRegistrationService computes claudeJsonPath as path.join(homeDir, '.claude.json').
	// We use a fake homeDir whose joining produces our tmp path.
	// Since path.join(homeDir, '.claude.json') === homeDir + '/.claude.json' we use a custom homeDir.
	// Strategy: homeDir = path.dirname(claudeJsonPath), and rename the file to .claude.json.
	const homeDir = path.dirname(claudeJsonPath);
	// Ensure the file basename is .claude.json
	assert.strictEqual(path.basename(claudeJsonPath), '.claude.json', 'tmpFile must be named .claude.json for test isolation');
	return new McpRegistrationService(extPath, homeDir);
}

function writeTmpClaudeJson(content: Record<string, unknown>): string {
	const p = path.join(tmpDir, `.claude.json`);
	fs.writeFileSync(p, JSON.stringify(content), 'utf-8');
	return p;
}

describe('McpRegistrationService.isRegistered()', () => {
	const extPath = '/fake/extension/path';
	const expectedScriptPath = path.join(extPath, 'dist', 'mcp-server.js');

	afterEach(() => {
		// Clean up the temp ~/.claude.json after each test
		cleanUp(path.join(tmpDir, '.claude.json'));
	});

	it('returns true when ACE entry exists with matching path', async () => {
		writeTmpClaudeJson({
			mcpServers: {
				ace: { command: 'node', args: [expectedScriptPath], type: 'stdio' }
			}
		});
		const svc = new McpRegistrationService(extPath, tmpDir);
		assert.strictEqual(await svc.isRegistered(), true);
	});

	it('returns false when ACE entry is absent', async () => {
		writeTmpClaudeJson({ mcpServers: { 'other-server': {} } });
		const svc = new McpRegistrationService(extPath, tmpDir);
		assert.strictEqual(await svc.isRegistered(), false);
	});

	it('returns false when ACE path is stale (different extension version)', async () => {
		writeTmpClaudeJson({
			mcpServers: {
				ace: { command: 'node', args: ['/old/extension/path/dist/mcp-server.js'], type: 'stdio' }
			}
		});
		const svc = new McpRegistrationService(extPath, tmpDir);
		assert.strictEqual(await svc.isRegistered(), false);
	});

	it('returns false when file does not exist', async () => {
		// Ensure file does not exist
		cleanUp(path.join(tmpDir, '.claude.json'));
		const svc = new McpRegistrationService(extPath, tmpDir);
		assert.strictEqual(await svc.isRegistered(), false);
	});

	it('returns false when file contains malformed JSON', async () => {
		fs.writeFileSync(path.join(tmpDir, '.claude.json'), '{ not json }', 'utf-8');
		const svc = new McpRegistrationService(extPath, tmpDir);
		assert.strictEqual(await svc.isRegistered(), false);
	});

	it('returns false when mcpServers key is absent', async () => {
		writeTmpClaudeJson({ someOtherKey: 'value' });
		const svc = new McpRegistrationService(extPath, tmpDir);
		assert.strictEqual(await svc.isRegistered(), false);
	});
});

describe('McpRegistrationService.register()', () => {
	const extPath = '/fake/extension/path';
	const expectedScriptPath = path.join(extPath, 'dist', 'mcp-server.js');

	afterEach(() => {
		cleanUp(path.join(tmpDir, '.claude.json'));
		// Restore stub writeFile if it was overridden
		vscodeStub.workspace.fs.writeFile = async () => {};
	});

	it('creates ~/.claude.json with ACE entry when file is absent', async () => {
		cleanUp(path.join(tmpDir, '.claude.json'));
		// Use real fs write via stub (the stub default is a no-op, so we need real write)
		// Override stub to actually write the file
		const claudeJsonPath = path.join(tmpDir, '.claude.json');
		vscodeStub.workspace.fs.writeFile = async (uri: any, data: Buffer) => {
			fs.writeFileSync(uri.fsPath, data);
		};

		const svc = new McpRegistrationService(extPath, tmpDir);
		await svc.register();

		const written = JSON.parse(fs.readFileSync(claudeJsonPath, 'utf-8'));
		assert.ok(written.mcpServers);
		assert.ok(written.mcpServers.ace);
		assert.strictEqual(written.mcpServers.ace.args[0], expectedScriptPath);
	});

	it('preserves existing keys when adding ACE entry', async () => {
		const claudeJsonPath = path.join(tmpDir, '.claude.json');
		fs.writeFileSync(claudeJsonPath, JSON.stringify({
			someTopLevelKey: 'preserved',
			mcpServers: {
				'existing-server': { command: 'python', args: ['-m', 'server'] }
			}
		}), 'utf-8');

		vscodeStub.workspace.fs.writeFile = async (uri: any, data: Buffer) => {
			fs.writeFileSync(uri.fsPath, data);
		};

		const svc = new McpRegistrationService(extPath, tmpDir);
		await svc.register();

		const written = JSON.parse(fs.readFileSync(claudeJsonPath, 'utf-8'));
		assert.strictEqual(written.someTopLevelKey, 'preserved');
		assert.ok(written.mcpServers['existing-server'], 'existing server must be preserved');
		assert.ok(written.mcpServers.ace, 'ace entry must be present');
		assert.strictEqual(written.mcpServers.ace.args[0], expectedScriptPath);
	});

	it('overwrites stale ACE entry with current path', async () => {
		const claudeJsonPath = path.join(tmpDir, '.claude.json');
		fs.writeFileSync(claudeJsonPath, JSON.stringify({
			mcpServers: {
				ace: { command: 'node', args: ['/old/path/dist/mcp-server.js'], type: 'stdio' }
			}
		}), 'utf-8');

		vscodeStub.workspace.fs.writeFile = async (uri: any, data: Buffer) => {
			fs.writeFileSync(uri.fsPath, data);
		};

		const svc = new McpRegistrationService(extPath, tmpDir);
		await svc.register();

		const written = JSON.parse(fs.readFileSync(claudeJsonPath, 'utf-8'));
		assert.strictEqual(written.mcpServers.ace.args[0], expectedScriptPath);
	});

	it('surfaces error when write fails', async () => {
		cleanUp(path.join(tmpDir, '.claude.json'));
		vscodeStub.workspace.fs.writeFile = async () => {
			throw new Error('Permission denied');
		};

		const svc = new McpRegistrationService(extPath, tmpDir);
		let threw = false;
		try {
			await svc.register();
		} catch (err: any) {
			threw = true;
			assert.ok(err.message.includes('Permission denied'));
		}
		assert.ok(threw, 'register() should throw on write failure');
	});
});

describe('McpRegistrationService.promptIfNeeded()', () => {
	const extPath = '/fake/extension/path';
	const expectedScriptPath = path.join(extPath, 'dist', 'mcp-server.js');

	afterEach(() => {
		cleanUp(path.join(tmpDir, '.claude.json'));
		vscodeStub.workspace.fs.writeFile = async () => {};
		vscodeStub.window.showInformationMessage = () => undefined;
		vscodeStub.window.showErrorMessage = () => {};
	});

	it('shows prompt when ACE is not registered', async () => {
		cleanUp(path.join(tmpDir, '.claude.json'));
		let promptShown = false;
		vscodeStub.window.showInformationMessage = async () => {
			promptShown = true;
			return 'Not now';
		};
		const svc = new McpRegistrationService(extPath, tmpDir);
		await svc.promptIfNeeded();
		assert.ok(promptShown, 'prompt should be shown when not registered');
	});

	it('does not show prompt when ACE is already registered', async () => {
		const claudeJsonPath = path.join(tmpDir, '.claude.json');
		fs.writeFileSync(claudeJsonPath, JSON.stringify({
			mcpServers: { ace: { command: 'node', args: [expectedScriptPath], type: 'stdio' } }
		}), 'utf-8');
		let promptShown = false;
		vscodeStub.window.showInformationMessage = async () => {
			promptShown = true;
			return 'Not now';
		};
		const svc = new McpRegistrationService(extPath, tmpDir);
		await svc.promptIfNeeded();
		assert.strictEqual(promptShown, false, 'no prompt when already registered');
	});

	it('does not show prompt a second time within the same session', async () => {
		cleanUp(path.join(tmpDir, '.claude.json'));
		let callCount = 0;
		vscodeStub.window.showInformationMessage = async () => {
			callCount++;
			return 'Not now';
		};
		const svc = new McpRegistrationService(extPath, tmpDir);
		await svc.promptIfNeeded();
		await svc.promptIfNeeded();
		assert.strictEqual(callCount, 1, 'prompt shown at most once per session');
	});

	it('calls register and onRefresh when user selects Set up', async () => {
		cleanUp(path.join(tmpDir, '.claude.json'));
		vscodeStub.window.showInformationMessage = async () => 'Set up';
		let refreshCalled = false;
		vscodeStub.workspace.fs.writeFile = async (uri: any, data: Buffer) => {
			fs.writeFileSync(uri.fsPath, data);
		};
		const svc = new McpRegistrationService(extPath, tmpDir);
		await svc.promptIfNeeded(() => { refreshCalled = true; });
		assert.ok(refreshCalled, 'onRefresh callback should be invoked after registration');
		const written = JSON.parse(fs.readFileSync(path.join(tmpDir, '.claude.json'), 'utf-8'));
		assert.ok(written.mcpServers.ace, 'ACE entry must be written');
	});

	it('shows error notification when Set up write fails', async () => {
		cleanUp(path.join(tmpDir, '.claude.json'));
		vscodeStub.window.showInformationMessage = async () => 'Set up';
		vscodeStub.workspace.fs.writeFile = async () => {
			throw new Error('Disk full');
		};
		let errorShown = false;
		vscodeStub.window.showErrorMessage = async () => { errorShown = true; };
		const svc = new McpRegistrationService(extPath, tmpDir);
		await svc.promptIfNeeded();
		assert.ok(errorShown, 'error notification must be shown on write failure');
	});

	it('does not write file when user selects Not now', async () => {
		cleanUp(path.join(tmpDir, '.claude.json'));
		vscodeStub.window.showInformationMessage = async () => 'Not now';
		let writeAttempted = false;
		vscodeStub.workspace.fs.writeFile = async () => { writeAttempted = true; };
		const svc = new McpRegistrationService(extPath, tmpDir);
		await svc.promptIfNeeded();
		assert.strictEqual(writeAttempted, false, 'no write when user declines');
	});
});
