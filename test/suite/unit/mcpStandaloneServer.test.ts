import * as assert from 'assert';
import { createRequire } from 'module';

describe('mcp/server (standalone entrypoint helpers)', () => {
	const require = createRequire(import.meta.url);
	const {
		coreCommandToCommandInfo,
		coreRuleToRuleInfo,
		coreSkillToSkillInfo,
		getProjectKeyArg,
		toBackendParams
	} = require('../../../src/mcp/server.ts') as typeof import('../../../src/mcp/server');

	it('getProjectKeyArg supports flat and nested args', () => {
		assert.strictEqual(getProjectKeyArg({ projectKey: 'p1' }), 'p1');
		assert.strictEqual(getProjectKeyArg({ project_key: 'p2' }), 'p2');
		assert.strictEqual(getProjectKeyArg({ arguments: { projectKey: 'p3' } }), 'p3');
		assert.strictEqual(getProjectKeyArg({ arguments: { project_key: 'p4' } }), 'p4');
		assert.strictEqual(getProjectKeyArg({}), undefined);
		assert.strictEqual(getProjectKeyArg(undefined), undefined);
	});

	it('toBackendParams returns a flat object or empty', () => {
		assert.deepStrictEqual(toBackendParams({ a: 1 }), { a: 1 });
		assert.deepStrictEqual(toBackendParams(['x']), {});
		assert.deepStrictEqual(toBackendParams('x'), {});
		assert.deepStrictEqual(toBackendParams(null), {});
	});

	it('coreRuleToRuleInfo determines type from metadata', () => {
		const manual = coreRuleToRuleInfo({
			fileName: 'my-rule.mdc',
			metadata: { description: 'd' },
			path: '/x/my-rule.mdc'
		});
		assert.strictEqual(manual.name, 'my-rule');
		assert.strictEqual(manual.type, 'manual');

		const always = coreRuleToRuleInfo({
			fileName: 'always.mdc',
			metadata: { description: '', alwaysApply: true },
			path: '/x/always.mdc'
		});
		assert.strictEqual(always.type, 'always');

		const glob = coreRuleToRuleInfo({
			fileName: 'glob.md',
			metadata: { description: '', globs: ['*.ts'] },
			path: '/x/glob.md'
		});
		assert.strictEqual(glob.type, 'glob');
	});

	it('coreCommandToCommandInfo extracts description from Overview or first paragraph', () => {
		const fromOverview = coreCommandToCommandInfo({
			fileName: 'cmd.md',
			content: '# X\n\n## Overview\n\nHello world\n\n## More\nx',
			path: '/x/cmd.md',
			location: 'workspace'
		});
		assert.strictEqual(fromOverview.description, 'Hello world');

		const fromParagraph = coreCommandToCommandInfo({
			fileName: 'cmd.md',
			content: '# X\n\nFirst paragraph here\n\n## More\nx',
			path: '/x/cmd.md',
			location: 'global'
		});
		assert.strictEqual(fromParagraph.description, 'First paragraph here');
		assert.strictEqual(fromParagraph.location, 'global');
	});

	it('coreSkillToSkillInfo maps metadata and defaults title', () => {
		const skill = coreSkillToSkillInfo({
			fileName: 'my-skill',
			metadata: { overview: 'o' },
			path: '/x/my-skill',
			location: 'workspace'
		});
		assert.strictEqual(skill.title, 'my-skill');
		assert.strictEqual(skill.overview, 'o');
	});
});

