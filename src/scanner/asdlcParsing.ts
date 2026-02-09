// Pure parsing functions for AGENTS.md and related ASDLC artifacts
// Extracted for unit testing without vscode.workspace.fs
// See: specs/scanners/spec.md
import type {
	AgentsMdInfo,
	AgentsMdSection,
	TechStackInfo,
	OperationalBoundaries
} from './types';

/**
 * Parse AGENTS.md content into structured info
 */
export function parseAgentsMd(content: string, path: string): AgentsMdInfo {
	const lines = content.split('\n');
	const sections = parseSections(lines);
	const mission = extractMission(content);
	const corePhilosophy = extractCorePhilosophy(content);
	const techStack = extractTechStack(content, sections);
	const operationalBoundaries = extractOperationalBoundaries(content, sections);

	return {
		exists: true,
		path,
		mission,
		corePhilosophy,
		sections,
		techStack,
		operationalBoundaries
	};
}

/**
 * Parse markdown headings into section structure
 */
export function parseSections(lines: string[]): AgentsMdSection[] {
	const sections: AgentsMdSection[] = [];
	let currentSection: AgentsMdSection | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

		if (headingMatch) {
			if (currentSection) {
				currentSection.endLine = i - 1;
				sections.push(currentSection);
			}

			currentSection = {
				level: headingMatch[1].length,
				title: headingMatch[2].trim(),
				startLine: i,
				endLine: lines.length - 1
			};
		}
	}

	if (currentSection) {
		sections.push(currentSection);
	}

	return sections;
}

/**
 * Extract mission from blockquote: > **Project Mission:** ...
 */
export function extractMission(content: string): string | undefined {
	const missionMatch = content.match(/>\s*\*\*Project Mission:\*\*\s*(.+)/);
	return missionMatch ? missionMatch[1].trim() : undefined;
}

/**
 * Extract core philosophy from blockquote: > **Core Philosophy:** ...
 */
export function extractCorePhilosophy(content: string): string | undefined {
	const philosophyMatch = content.match(/>\s*\*\*Core Philosophy:\*\*\s*(.+)/);
	return philosophyMatch ? philosophyMatch[1].trim() : undefined;
}

/**
 * Extract tech stack from Tech Stack / Technology section
 */
export function extractTechStack(content: string, sections: AgentsMdSection[]): TechStackInfo | undefined {
	const techStackSection = sections.find(s =>
		s.title.toLowerCase().includes('tech stack') ||
		s.title.toLowerCase().includes('technology')
	);

	if (!techStackSection) {
		return undefined;
	}

	const techStackIdx = sections.indexOf(techStackSection);
	const nextH2Section = sections.slice(techStackIdx + 1).find(s => s.level === 2);

	const lines = content.split('\n');
	const endLine = nextH2Section ? nextH2Section.startLine - 1 : lines.length - 1;
	const sectionContent = lines.slice(techStackSection.startLine, endLine + 1).join('\n');

	return {
		languages: extractListItems(sectionContent, 'language'),
		frameworks: extractListItems(sectionContent, 'framework'),
		buildTools: extractListItems(sectionContent, 'build'),
		testing: extractListItems(sectionContent, 'testing'),
		packageManager: extractSingleValue(sectionContent, 'package manager')
	};
}

/**
 * Extract operational boundaries (Tier 1/2/3)
 */
export function extractOperationalBoundaries(content: string, sections: AgentsMdSection[]): OperationalBoundaries | undefined {
	const boundariesSection = sections.find(s =>
		s.title.toLowerCase().includes('operational boundaries')
	);

	if (!boundariesSection) {
		return undefined;
	}

	const boundariesIdx = sections.indexOf(boundariesSection);
	const nextH2Section = sections.slice(boundariesIdx + 1).find(s => s.level === 2);

	const lines = content.split('\n');
	const endLine = nextH2Section ? nextH2Section.startLine - 1 : lines.length - 1;
	const sectionContent = lines.slice(boundariesSection.startLine, endLine + 1).join('\n');

	return {
		tier1Always: extractTierItems(sectionContent, 'tier 1', 'always'),
		tier2Ask: extractTierItems(sectionContent, 'tier 2', 'ask'),
		tier3Never: extractTierItems(sectionContent, 'tier 3', 'never')
	};
}

/**
 * Extract list items matching **keyword**: value pattern
 */
export function extractListItems(content: string, keyword: string): string[] {
	const items: string[] = [];
	const regex = new RegExp(`^\\s*-\\s*\\*\\*${keyword}[^*]*\\*\\*[:\\s]*(.+)$`, 'gmi');
	let match;
	while ((match = regex.exec(content)) !== null) {
		items.push(match[1].trim());
	}
	return items;
}

/**
 * Extract single value matching **keyword**: value pattern
 */
export function extractSingleValue(content: string, keyword: string): string | undefined {
	const regex = new RegExp(`\\*\\*${keyword}[^*]*\\*\\*[:\\s]*([^\\n]+)`, 'i');
	const match = content.match(regex);
	return match ? match[1].trim() : undefined;
}

/**
 * Extract tier items (ALWAYS, ASK, NEVER bullets)
 */
export function extractTierItems(content: string, tierKeyword: string, tierName: string): string[] {
	const items: string[] = [];

	const tierRegex = new RegExp(`###?\\s*${tierKeyword}[^\\n]*${tierName}[^\\n]*`, 'i');
	const tierMatch = content.match(tierRegex);

	if (!tierMatch) {
		return items;
	}

	const startIndex = content.indexOf(tierMatch[0]) + tierMatch[0].length;
	const nextHeadingMatch = content.slice(startIndex).match(/^#{2,3}\s/m);
	const endIndex = nextHeadingMatch
		? startIndex + content.slice(startIndex).indexOf(nextHeadingMatch[0])
		: content.length;

	const tierContent = content.slice(startIndex, endIndex);

	const bulletRegex = /^\s*-\s*\*\*(ALWAYS|ASK|NEVER)\*\*\s*(.+)$/gm;
	let match;
	while ((match = bulletRegex.exec(tierContent)) !== null) {
		items.push(match[2].trim());
	}

	return items;
}

/**
 * Check if content has a ## SectionName heading
 */
export function hasSection(content: string, sectionName: string): boolean {
	const regex = new RegExp(`^##\\s+${sectionName}`, 'mi');
	return regex.test(content);
}

/**
 * Extract $id or id from JSON schema content. Returns undefined for invalid JSON.
 */
export function extractSchemaId(content: string): string | undefined {
	try {
		const json = JSON.parse(content);
		return json.$id ?? json.id;
	} catch {
		return undefined;
	}
}
