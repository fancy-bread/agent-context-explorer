# Research: Tree View Two-View Refactor

**Branch**: `001-tree-view-refactor` | **Date**: 2026-03-12

Resolves technical choices for implementing two sidebar views (Workspaces + Agents) and agent-root scanning.

---

## 1. Two views in the same VS Code view container

**Decision**: Add a second view entry under the existing `views.ace` array in `package.json`. Use distinct view IDs (e.g. `aceProjects` for Workspaces, `aceAgents` for Agents). Register a separate `TreeDataProvider` for the Agents view (or a single provider that branches on view ID). Use `when` clauses on commands so "Add Project" and "Refresh" show only in the Workspace view title, and "Refresh" only in the Agents view title.

**Rationale**: VS Code allows multiple views in one container; each view has its own `id` and `when`. Toolbar commands are bound with `view == <viewId>`. No new view container is required; both views live under "Agent Context Explorer" in the activity bar.

**Alternatives considered**: (a) Two view containers — rejected to keep one ACE entry in the activity bar. (b) One tree with two root nodes — rejected per spec; two roots mean two separate trees.

---

## 2. Agent roots: paths and safety

**Decision**: Agent roots are fixed, known paths under the user’s home directory: `~/.cursor`, `~/.claude`, `~/.agents`. Resolve `~` via `process.env.HOME` or `os.homedir()` only when building the list of roots to scan. Use `vscode.workspace.fs` for all reads; for paths outside the workspace, use a dedicated API or `Uri.file(homedirPath)` and restrict to these allowlisted paths. Do not scan arbitrary user directories.

**Rationale**: Constitution and AGENTS.md require workspace-bound file access and validation. Allowing only known home subdirs keeps behavior predictable and avoids directory traversal. Same folder structure (commands/, skills/, etc.) for each root simplifies UI and scanning.

**Alternatives considered**: (a) Configurable paths — rejected for v1 to avoid security and complexity. (b) Only ~/.cursor and ~/.agents — spec includes Claude (~/.claude); keep all three with same pattern so more agents can be added later.

---

## 3. Data source for Agents view

**Decision**: Reuse existing global command/skill scanning for ~/.cursor and ~/.agents (already in scanCommandsCore / scanSkillsCore with origin). Extend or add scanning for ~/.claude using the same structure. Agents view tree is built from this aggregated data, grouped by root (Cursor / Claude / Global). No duplicate scanner logic; core scanners accept root path and return typed results.

**Rationale**: Scanners already support global paths and origins. Adding ~/.claude follows the same pattern. Single source of truth for scan results; providers only shape data for the tree.

**Alternatives considered**: (a) New “AgentsScanner” — rejected; prefer extending existing core scanners with an additional root. (b) Lazy scan per root when view opens — acceptable; can be done in a follow-up if needed.

---

## 4. One provider vs two providers

**Decision**: Prefer **two providers** (e.g. `WorkspaceTreeProvider` and `AgentsTreeProvider`) so each view has a clear responsibility and `getChildren(undefined)` returns the correct root for that view. If the codebase currently has one `ProjectTreeProvider` that returns [Workspaces, Global] as roots, refactor to: (1) Workspace provider: root children = project list. (2) Agents provider: root children = Cursor / Claude / Global nodes. Shared data (project list, global commands/skills) can be passed in or accessed via a small service.

**Rationale**: Clear separation matches the spec (two roots, two views). Easier to test and to attach view-specific commands. Avoids branching on view ID inside a single provider.

**Alternatives considered**: Single provider with view ID — possible but mixes two hierarchies in one class; two providers keep the contract simple.
