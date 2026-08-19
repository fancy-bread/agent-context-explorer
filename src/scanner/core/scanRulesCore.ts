// Shared rules scanning - NO vscode dependency
import * as path from 'path';
import type { IFileSystem } from './types';
import type { CoreRule } from './types';
import { listFilesRecursive } from './listFiles';
import { parseRuleFromString } from './ruleParsing';
import { scanClaudeRules } from './scanClaudeCodeCore';

/**
 * Scan for rules in project .cursor/rules/ and .claude/rules/ (workspace only —
 * no global scan for either platform; see spec 011 FR-007).
 */
export async function scanRulesCore(
	fs: IFileSystem,
	projectRoot: string,
	_userRoot: string
): Promise<CoreRule[]> {
	const cursorRules = await scanCursorRules(fs, projectRoot);
	const claudeRules = await scanClaudeRules(fs, projectRoot);
	return [...cursorRules, ...claudeRules];
}

async function scanCursorRules(fs: IFileSystem, projectRoot: string): Promise<CoreRule[]> {
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
				fileName,
				platform: 'cursor'
			});
		} catch {
			const fileName = path.basename(filePath);
			rules.push({
				path: filePath,
				metadata: { description: 'Error parsing file' },
				content: 'Error reading file content',
				fileName,
				platform: 'cursor'
			});
		}
	}

	return rules;
}
