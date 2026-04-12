import * as assert from 'assert';
import * as path from 'path';
import { AgentsScanner, scanAgentDefinitionsForAgentRoot } from '../../../src/scanner/agentsScanner';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const vscode = require('vscode');

describe('AgentsScanner', () => {
	const agentsDir = path.join('/workspace', '.cursor', 'agents');

	it('scanWorkspaceAgentDefinitions returns mapped AgentDefinitions when agents dir has files', async () => {
		const origReadDir = vscode.__overrides.readDirectory;
		vscode.__overrides.readDirectory = async (uri: { fsPath: string }) => {
			if (uri.fsPath === agentsDir) {
				return [['critic.md', 1], ['builder.md', 1]];
			}
			return [];
		};

		try {
			const scanner = new AgentsScanner(vscode.Uri.file('/workspace'));
			const results = await scanner.scanWorkspaceAgentDefinitions();
			assert.ok(Array.isArray(results));
			assert.strictEqual(results.length, 2);
			// Sorted alphabetically
			assert.strictEqual(results[0].fileName, 'builder');
			assert.strictEqual(results[1].fileName, 'critic');
			// Each result has the required shape
			for (const r of results) {
				assert.ok(r.uri);
				assert.ok(typeof r.content === 'string');
				assert.ok(r.fileName);
				assert.ok(r.displayName);
			}
		} finally {
			vscode.__overrides.readDirectory = origReadDir;
		}
	});

	it('scanWorkspaceAgentDefinitions returns [] when agents dir is empty', async () => {
		const origReadDir = vscode.__overrides.readDirectory;
		vscode.__overrides.readDirectory = async () => [];

		try {
			const scanner = new AgentsScanner(vscode.Uri.file('/workspace'));
			const results = await scanner.scanWorkspaceAgentDefinitions();
			assert.deepStrictEqual(results, []);
		} finally {
			vscode.__overrides.readDirectory = origReadDir;
		}
	});

	it('scanWorkspaceAgentDefinitions returns [] when core throws', async () => {
		// Patch the core module export so the outer try/catch in agentsScanner is exercised
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const coreModule = require('../../../src/scanner/core/scanAgentDefinitionsCore');
		const orig = coreModule.scanWorkspaceAgentDefinitionsCore;
		coreModule.scanWorkspaceAgentDefinitionsCore = async () => {
			throw new Error('core scan failure');
		};

		try {
			const scanner = new AgentsScanner(vscode.Uri.file('/workspace'));
			const results = await scanner.scanWorkspaceAgentDefinitions();
			assert.deepStrictEqual(results, []);
		} finally {
			coreModule.scanWorkspaceAgentDefinitionsCore = orig;
		}
	});
});

describe('scanAgentDefinitionsForAgentRoot', () => {
	const agentRoot = '/home/user/.agents';
	const agentsDir = path.join(agentRoot, 'agents');

	it('returns mapped AgentDefinitions when agents dir has files', async () => {
		const origReadDir = vscode.__overrides.readDirectory;
		vscode.__overrides.readDirectory = async (uri: { fsPath: string }) => {
			if (uri.fsPath === agentsDir) {
				return [['planner.md', 1]];
			}
			return [];
		};

		try {
			const results = await scanAgentDefinitionsForAgentRoot(agentRoot);
			assert.ok(Array.isArray(results));
			assert.strictEqual(results.length, 1);
			assert.strictEqual(results[0].fileName, 'planner');
			assert.strictEqual(results[0].displayName, 'planner');
			assert.ok(results[0].uri);
			assert.ok(typeof results[0].content === 'string');
		} finally {
			vscode.__overrides.readDirectory = origReadDir;
		}
	});

	it('returns [] when agents dir is empty', async () => {
		const origReadDir = vscode.__overrides.readDirectory;
		vscode.__overrides.readDirectory = async () => [];

		try {
			const results = await scanAgentDefinitionsForAgentRoot(agentRoot);
			assert.deepStrictEqual(results, []);
		} finally {
			vscode.__overrides.readDirectory = origReadDir;
		}
	});

	it('returns [] when core throws', async () => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const coreModule = require('../../../src/scanner/core/scanAgentDefinitionsCore');
		const orig = coreModule.scanAgentDefinitionsInDirectory;
		coreModule.scanAgentDefinitionsInDirectory = async () => {
			throw new Error('dir scan failure');
		};

		try {
			const results = await scanAgentDefinitionsForAgentRoot(agentRoot);
			assert.deepStrictEqual(results, []);
		} finally {
			coreModule.scanAgentDefinitionsInDirectory = orig;
		}
	});
});
