// Shared rules scanning - NO vscode dependency
import * as path from 'path';
import type { IFileSystem } from './types';
import type { CoreRule } from './types';
import { listFilesRecursive } from './listFiles';
import { parseRuleFromString } from './ruleParsing';

/**
 * Scan for Cursor rules in project .cursor/rules/ only.
 * Recursion limited to {projectRoot}/.cursor/rules/ - excludes test/fixtures etc.
 */
export async function scanRulesCore(
	fs: IFileSystem,
	projectRoot: string,
	_userRoot: string
): Promise<CoreRule[]> {
	const rulesDir = path.join(projectRoot, '.cursor', 'rules');
	const rules: CoreRule[] = [];

	const filePaths = await listFilesRecursive(fs, rulesDir, ['.mdc', '.md']);

	for (const filePath of filePaths) {
		try {
			const content = await fs.readFile(filePath);
			const text = content.toString('utf8');
			const { metadata, content: body } = parseRuleFromString(text);
			const fileName = path.basename(filePath);

			rules.push({
				path: filePath,
				metadata,
				content: body,
				fileName
			});
		} catch {
			const fileName = path.basename(filePath);
			rules.push({
				path: filePath,
				metadata: { description: 'Error parsing file' },
				content: 'Error reading file content',
				fileName
			});
		}
	}

	return rules;
}
