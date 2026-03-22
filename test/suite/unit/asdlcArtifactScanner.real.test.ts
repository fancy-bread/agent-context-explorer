/**
 * Exercises real AsdlcArtifactScanner.scanAll() branches by mutating scanAsdlcCore export.
 */
import * as assert from 'assert';
import * as vscode from 'vscode';
import { AsdlcArtifactScanner } from '../../../src/scanner/asdlcArtifactScanner';
import * as scanAsdlcModule from '../../../src/scanner/core/scanAsdlcCore';
import type { CoreAsdlcArtifacts } from '../../../src/scanner/core/types';

describe('AsdlcArtifactScanner (real — scanAsdlcCore branches)', () => {
	const orig = scanAsdlcModule.scanAsdlcCore;
	const patch = (fn: typeof orig) => {
		(scanAsdlcModule as { scanAsdlcCore: typeof orig }).scanAsdlcCore = fn;
	};

	afterEach(() => {
		patch(orig);
	});

	it('catch path returns empty artifacts when scanAsdlcCore throws', async () => {
		patch(async () => {
			throw new Error('simulated fs failure');
		});
		const scanner = new AsdlcArtifactScanner(vscode.Uri.file('/w'));
		const r = await scanner.scanAll();
		assert.strictEqual(r.hasAnyArtifacts, false);
		assert.strictEqual(r.agentsMd.exists, false);
		assert.strictEqual(r.specs.exists, false);
		assert.strictEqual(r.schemas.exists, false);
	});

	it('agentsMd uses parse path when exists, content, and path are set', async () => {
		const core: CoreAsdlcArtifacts = {
			agentsMd: {
				exists: true,
				path: '/w/AGENTS.md',
				content: '# Title\n\n> Mission here.\n',
				sections: []
			},
			specs: { exists: false, specs: [] },
			schemas: { exists: false, schemas: [] },
			hasAnyArtifacts: true
		};
		patch(async () => core);
		const scanner = new AsdlcArtifactScanner(vscode.Uri.file('/w'));
		const r = await scanner.scanAll();
		assert.strictEqual(r.agentsMd.exists, true);
		assert.ok(r.agentsMd.sections);
		assert.strictEqual(r.hasAnyArtifacts, true);
	});

	it('agentsMd falls back when exists but content missing', async () => {
		const core: CoreAsdlcArtifacts = {
			agentsMd: {
				exists: true,
				path: '/w/AGENTS.md',
				sections: []
			},
			specs: { exists: false, specs: [] },
			schemas: { exists: false, schemas: [] },
			hasAnyArtifacts: true
		};
		patch(async () => core);
		const scanner = new AsdlcArtifactScanner(vscode.Uri.file('/w'));
		const r = await scanner.scanAll();
		assert.strictEqual(r.agentsMd.exists, false);
		assert.deepStrictEqual(r.agentsMd.sections, []);
	});
});
