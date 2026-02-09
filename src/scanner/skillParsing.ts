// Pure parsing for SKILL.md frontmatter and metadata
// Extracted for unit testing without vscode
import matter from 'gray-matter';

export interface SkillMetadata {
	title?: string;
	overview?: string;
	prerequisites?: string[];
	steps?: string[];
	tools?: string[];
	guidance?: {
		role?: string;
		instruction?: string;
		context?: string;
		examples?: string[];
		constraints?: string[];
		output?: string;
	};
}

/**
 * Parse SKILL.md frontmatter using gray-matter
 * Falls back to extracting title from first heading if no frontmatter
 */
export function parseSKILLMetadata(content: string): SkillMetadata | undefined {
	try {
		const parsed = matter(content);

		if (Object.keys(parsed.data).length === 0) {
			const titleMatch = content.match(/^#\s+(.+)$/m);
			if (titleMatch) {
				return {
					title: titleMatch[1].trim()
				};
			}
			return undefined;
		}

		return {
			title: parsed.data.title,
			overview: parsed.data.overview,
			prerequisites: Array.isArray(parsed.data.prerequisites) ? parsed.data.prerequisites : undefined,
			steps: Array.isArray(parsed.data.steps) ? parsed.data.steps : undefined,
			tools: Array.isArray(parsed.data.tools) ? parsed.data.tools : undefined,
			guidance: parsed.data.guidance
		};
	} catch {
		try {
			const titleMatch = content.match(/^#\s+(.+)$/m);
			if (titleMatch) {
				return {
					title: titleMatch[1].trim()
				};
			}
		} catch {
			// Ignore
		}
		return undefined;
	}
}
