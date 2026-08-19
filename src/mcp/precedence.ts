// Name-collision precedence for get_rule/get_command/get_skill/get_agent (spec 011 FR-008).
// When more than one artifact matches a lookup name, resolve deterministically: workspace
// before global, then cursor before claude within the same tier.

import type { CorePlatform } from '../scanner/core/types';

/** Minimal shape needed to rank a candidate. `location` is omitted for artifact types with no
 *  location tier (e.g. rules), which are treated as a single (workspace-equivalent) tier. */
export interface PrecedenceKey {
	location?: string;
	platform: CorePlatform;
}

function precedenceRank(key: PrecedenceKey): number {
	const locationRank = key.location === undefined || key.location === 'workspace' ? 0 : 1;
	const platformRank = key.platform === 'cursor' ? 0 : 1;
	return locationRank * 2 + platformRank;
}

/**
 * Given all candidates matching a lookup name, return the one that wins by precedence
 * (workspace before global, cursor before claude). Returns undefined for an empty list.
 */
export function pickByPrecedence<T>(candidates: T[], keyOf: (item: T) => PrecedenceKey): T | undefined {
	if (candidates.length === 0) {
		return undefined;
	}
	return [...candidates].sort((a, b) => precedenceRank(keyOf(a)) - precedenceRank(keyOf(b)))[0];
}
