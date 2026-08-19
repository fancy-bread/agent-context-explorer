import * as assert from 'assert';
import { pickByPrecedence } from '../../../src/mcp/precedence';

describe('mcp/precedence (spec 011 FR-008)', () => {
	it('returns undefined for an empty candidate list', () => {
		const result = pickByPrecedence<{ platform: 'cursor' | 'claude' }>([], (c) => c);
		assert.strictEqual(result, undefined);
	});

	it('returns the single candidate when there is no collision', () => {
		const candidates = [{ id: 'a', platform: 'claude' as const }];
		const result = pickByPrecedence(candidates, (c) => ({ platform: c.platform }));
		assert.strictEqual(result?.id, 'a');
	});

	it('prefers cursor over claude when no location tier is involved (rules)', () => {
		const candidates = [
			{ id: 'claude-one', platform: 'claude' as const },
			{ id: 'cursor-one', platform: 'cursor' as const }
		];
		const result = pickByPrecedence(candidates, (c) => ({ platform: c.platform }));
		assert.strictEqual(result?.id, 'cursor-one');
	});

	it('prefers workspace over global regardless of platform', () => {
		const candidates = [
			{ id: 'global-cursor', location: 'global' as const, platform: 'cursor' as const },
			{ id: 'workspace-claude', location: 'workspace' as const, platform: 'claude' as const }
		];
		const result = pickByPrecedence(candidates, (c) => ({ location: c.location, platform: c.platform }));
		assert.strictEqual(result?.id, 'workspace-claude');
	});

	it('within the same location tier, prefers cursor over claude', () => {
		const candidates = [
			{ id: 'workspace-claude', location: 'workspace' as const, platform: 'claude' as const },
			{ id: 'workspace-cursor', location: 'workspace' as const, platform: 'cursor' as const }
		];
		const result = pickByPrecedence(candidates, (c) => ({ location: c.location, platform: c.platform }));
		assert.strictEqual(result?.id, 'workspace-cursor');
	});

	it('treats a missing location as workspace-tier (rules-style candidates)', () => {
		const candidates = [
			{ id: 'no-location-claude', platform: 'claude' as const },
			{ id: 'global-cursor', location: 'global' as const, platform: 'cursor' as const }
		];
		const result = pickByPrecedence(candidates, (c) => ({ location: c.location, platform: c.platform }));
		assert.strictEqual(result?.id, 'no-location-claude');
	});

	it('is deterministic regardless of input order', () => {
		interface Candidate { id: string; location: 'workspace' | 'global'; platform: 'cursor' | 'claude' }
		const a: Candidate = { id: 'workspace-cursor', location: 'workspace', platform: 'cursor' };
		const b: Candidate = { id: 'workspace-claude', location: 'workspace', platform: 'claude' };
		const c: Candidate = { id: 'global-cursor', location: 'global', platform: 'cursor' };
		const keyOf = (x: Candidate) => ({ location: x.location, platform: x.platform });
		assert.strictEqual(pickByPrecedence([a, b, c], keyOf)?.id, 'workspace-cursor');
		assert.strictEqual(pickByPrecedence([c, b, a], keyOf)?.id, 'workspace-cursor');
		assert.strictEqual(pickByPrecedence([b, a, c], keyOf)?.id, 'workspace-cursor');
	});
});
