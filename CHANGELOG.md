# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-04-13

### Added
- Claude Code project-level file watchers — Agents view auto-refreshes when `~/.claude/commands/`, `~/.claude/skills/`, and `~/.claude/agents/` change
- Global (`.agents`) artifact file watchers — Agents view auto-refreshes for `~/.agents/commands/`, `~/.agents/skills/`, and `~/.agents/agents/`
- Husky pre-commit hooks with lint-staged — type check, unit tests, and scoped ESLint run automatically on every commit

### Fixed
- Global file watchers now use `vscode.RelativePattern(Uri.file(dir), glob)` instead of plain path strings — watchers outside the workspace were silently not firing

### Changed
- All six global watcher patterns (`.cursor`, `.claude`, `.agents`) follow a consistent symmetric implementation

## [1.0.0] - 2026-03-26

### Added
- Added top-level release notes for 1.0.0 and aligned repository metadata for reviewer expectations.
- Expanded README quick-start guidance for Workspaces, Agents view, agent definitions, Specs, and MCP tool access.
- Added explicit compatibility requirement in README matching `engines.vscode`.

### Changed
- Clarified documentation so first-time users can validate capabilities without source spelunking.
- Aligned CD workflow with the 1.0.0 release process.

