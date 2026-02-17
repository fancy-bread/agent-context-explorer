// Minimal ASDLC parsing helpers - NO vscode or scanner/types dependency
// Used by scanAsdlcCore

export function hasSection(content: string, sectionName: string): boolean {
	const regex = new RegExp(`^##\\s+${sectionName}`, 'mi');
	return regex.test(content);
}

export function extractSchemaId(content: string): string | undefined {
	try {
		const json = JSON.parse(content);
		return json.$id ?? json.id;
	} catch {
		return undefined;
	}
}

export interface SimpleSection {
	level: number;
	title: string;
	startLine: number;
	endLine: number;
}

export function parseSections(lines: string[]): SimpleSection[] {
	const sections: SimpleSection[] = [];
	let currentSection: SimpleSection | null = null;

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
