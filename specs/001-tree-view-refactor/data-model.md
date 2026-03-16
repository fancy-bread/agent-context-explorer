# Data Model: Tree View (Two Views)

**Branch**: `001-tree-view-refactor` | **Date**: 2026-03-12

Entities and relationships used by the workspace and agents tree views. No new persistence; all data is derived from scanners and in-memory project list.

---

## Views (contribution layer)

| Entity       | Purpose |
|-------------|---------|
| **Workspaces view** | View id: `aceProjects`. Root = project list. Toolbar: Add, Refresh. |
| **Agents view**         | View id: `aceAgents`. Root = agent roots (Cursor, Claude, Global). Toolbar: Refresh only. |

Not persisted; defined in `package.json` and registered in `extension.ts`.

---

## Workspace view hierarchy

| Entity        | Parent    | Children / content |
|---------------|-----------|----------------------|
| **Root**      | —         | List of `ProjectDefinition` (no wrapper node). |
| **Project**   | Root      | Cursor, Specs + ASDLC, Speckit (sections). |
| **Cursor**    | Project   | Commands (single list), Rules, Skills (single list). No workspace vs global subsections. |
| **Specs + ASDLC** | Project | AGENTS.md, VISION, specs, schemas, Speckit constitution (links only). |
| **Speckit**   | Project   | Constitution (single link when `.specify/memory/constitution.md` exists). No “Open folder”. |
| **Commands**  | Cursor   | Items from `projectData.commands` (workspace only). |
| **Skills**    | Cursor   | Items from `projectData.skills` (workspace only). |
| **Rules**     | Cursor   | Items from `projectData.rules` (unchanged). |

**Data source**: Existing `ProjectData` per project (rules, commands, skills, asdlcArtifacts). For Cursor section, use only workspace commands/skills; do not merge or display global lists under the project.

---

## Agents view hierarchy

| Entity       | Parent | Children / content |
|--------------|--------|---------------------|
| **Root**     | —      | One node per **existing** agent root: Cursor (~/.cursor), Claude (~/.claude), Global (~/.agents). |
| **Agent root** (e.g. Cursor) | Root | Same structural categories: Commands, Skills, (Rules if present). Content from that root only. |
| **Global**   | Root   | Same as agent root; label “Global”; path ~/.agents. |
| **Commands** | Agent root / Global | Items from scan of that root’s commands directory. |
| **Skills**   | Agent root / Global | Items from scan of that root’s skills directory. |

**Data source**: Scan results per root (e.g. ~/.cursor/commands, ~/.cursor/skills; ~/.claude/…; ~/.agents/…). Reuse core scanners with root path; aggregate by origin for display. Show a root node only if that directory exists.

---

## Existing types (unchanged)

- **ProjectDefinition**: id, path, name, lastAccessed, active (from `src/types/project.ts`).
- **ProjectData**: rules, commands, skills, asdlcArtifacts (from scanners).
- **AsdlcArtifacts**: agentsMd, specs, schemas, vision, speckit, hasAnyArtifacts (from AsdlcArtifactScanner).

---

## Category / tree item tags

For **workspace** tree items, categories include (as today, adjusted for spec):

- `projects`, `cursor`, `agents` → **Spec rename**: use `specs-asdlc` (or keep internal name `agents` and label “Specs + ASDLC”).
- `commands`, `skills`, `rules` (single lists under Cursor, no `commands-workspace` / `commands-global`).
- `speckit`, `speckit-constitution` (no `speckit-folder`).
- `agents-md`, `vision`, `specs`, `schemas` under Specs + ASDLC.

For **agents** tree items, categories include:

- `global-pane` (or equivalent) for the Agents view root.
- Per-root: e.g. `agent-root-cursor`, `agent-root-claude`, `agent-root-global`.
- Under each: `global-commands`, `global-skills` (or same category names as workspace, with data from that root).

State transitions: none. Data is read-only and refreshed on demand or via file watchers.
