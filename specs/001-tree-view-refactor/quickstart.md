# Quickstart: Tree View refactor (two views)

**Branch**: `001-tree-view-refactor` | **Date**: 2026-03-12

How to run and verify the tree view refactor during development. Use after implementation (tasks) are in place.

---

## Prerequisites

- Node.js and npm (or project-supported package manager)
- VS Code or Cursor
- Repo at branch `001-tree-view-refactor` (or feature branch derived from it)

---

## Build and run

1. **Install and compile**
   ```bash
   npm install
   npm run compile
   ```
   Or use the VS Code “Run Extension” launch config (F5) which compiles and opens a new window with the extension loaded.

2. **Open a workspace**
   Open a folder that has (or will have) at least one project added in ACE (e.g. the repo itself or a test workspace).

3. **Open the ACE sidebar**
   In the Activity Bar, open “Agent Context Explorer”. You should see two views:
   - **Workspaces**: project list at root; Add and Refresh in the toolbar.
   - **Agents**: Cursor / Claude / Global at root (when those dirs exist); Refresh only in the toolbar.

---

## Verify (acceptance)

- **Workspace view**: Root = project list (no “Workspaces” node). Expand a project → Cursor, Specs + ASDLC, Speckit. Under Cursor → single Commands and Skills lists (no workspace vs global). Add Project adds a project and list updates. Refresh refreshes workspace data.
- **Agents view**: Root = one node per existing agent root (e.g. Cursor, Global). Toolbar has Refresh only (no Add). Expanding a root shows Commands, Skills, etc. for that root only.
- **Speckit**: Under a project, Speckit shows only the constitution link when present (no “Open .specify folder”).
- **Specs + ASDLC**: Project-level section labeled “Specs + ASDLC” (replacing “Agents”) with AGENTS.md, VISION, specs, schemas, constitution.

---

## Tests

```bash
npm run compile
npm run compile:test
npm test
```

Relevant suites: `projectTreeProvider.test.ts`, `ruleLabels.test.ts`, `realRulesIntegration.test.ts`. Update expectations for two-view structure and categories before marking the refactor done.

---

## References

- Living spec: [specs/tree-view/spec.md](../../tree-view/spec.md)
- Plan: [plan.md](../plan.md)
- Data model: [data-model.md](../data-model.md)
- View contract: [contracts/view-contributions.md](../contracts/view-contributions.md)
