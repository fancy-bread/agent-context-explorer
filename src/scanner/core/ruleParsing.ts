// Rule/MDC parsing - NO vscode dependency
// Pure string parsing for use in shared scan core
import matter from 'gray-matter';
import type { CoreRuleMetadata } from './types';

export function parseRuleFromString(text: string): { metadata: CoreRuleMetadata; content: string } {
	try {
		const parsed = matter(text);
		const metadata: CoreRuleMetadata = {
			description: parsed.data.description || 'No description',
			globs: parsed.data.globs || [],
			alwaysApply: parsed.data.alwaysApply || false
		};
		return {
			metadata,
			content: parsed.content.trim()
		};
	} catch {
		return {
			metadata: { description: 'Error parsing file' },
			content: 'Error reading file content'
		};
	}
}
