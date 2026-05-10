# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2026-05-10

### Added
- Release-prep automation skill for cutting releases from a branch without manual steps

### Fixed
- Single MCP server consolidation (spec 009): all MCP capabilities now served from a single unified endpoint
- `get_spec` exact-match priority — spec lookup now correctly prefers exact slug matches before falling back to partial matches

## [1.2.0] - 2026-05-05

### Added
- **Claude project agent definitions** — `.claude/agents/*.md` files are now scanned and displayed in the Workspaces tree under the Claude section as an "Agents" subsection (hubot icon, alphabetical, click-to-open). Mirrors the existing Cursor → Agents behaviour for project-level agent definitions.
- **File watcher for `.claude/agents/`** — the Workspaces tree automatically reflects additions, modifications, and deletions to project-level Claude agent files without a manual refresh.

### Changed
- **Conditional platform section display** — the Cursor section now appears in the Workspaces tree only when a `.cursor/` directory exists at the project root; the Claude section appears only when `.claude/` exists. Projects using a single agent platform no longer show an empty section for the other. The Specs node is unaffected and remains visible regardless of platform folder presence.
- Folder existence is detected via async `vscode.workspace.fs.stat()` in parallel with artifact scanning — no added latency to tree load.
- Living specs updated: `specs/providers/spec.md`, `specs/tree-view/spec.md`, `specs/scanners/spec.md` reflect the new category types and platform-gating behaviour.

## [1.1.1] - 2026-04-15

### Fixed
- Cursor artifacts (Rules, Commands, Skills, Agents) no longer fail to render in the Workspaces tree — a category id mismatch introduced in 1.1.0 caused the Cursor section to show empty
- Claude Code artifact groups (Rules, Commands, Skills) now display counts in the description column, matching Cursor's style

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

