# Contract: View contributions (package.json)

**Branch**: `001-tree-view-refactor` | **Date**: 2026-03-12

This contract describes the VS Code contribution points for the two tree views. Implementations must keep view IDs and command visibility consistent with this contract.

---

## View container

- **Container id**: `ace`
- **Title**: "Agent Context Explorer"
- **Location**: `activitybar`

---

## Views (ordered)

| View ID       | Name            | When clause (optional) | Purpose |
|---------------|-----------------|-------------------------|---------|
| `aceExplorer` | Workspaces  | e.g. `workspaceFolderCount > 0` | Project list; per-project Cursor, Specs + ASDLC, Speckit. |
| `aceAgents`   | Agents          | —                       | Agent roots (Cursor, Claude, Global); same structure per root. |

Both views appear under the same container. Each view has its own `TreeDataProvider`; root children are determined by the provider for that view.

---

## Commands and menu visibility

| Command           | View title (toolbar)     | View item context |
|-------------------|---------------------------|-------------------|
| `ace.refresh`     | Shown when `view == aceExplorer` **or** `view == aceAgents` | — |
| `ace.addProject`  | Shown when `view == aceExplorer` only | — |
| `ace.removeProject` | —                      | When `view == aceExplorer && viewItem == activeProject` |
| `ace.editProject` | —                        | When `view == aceExplorer && viewItem == activeProject` |

**Invariant**: `ace.addProject` must NOT appear when `view == aceAgents`. Use `when: "view == aceExplorer"` for Add (and optionally for Refresh in workspace view); use `when: "view == aceAgents"` only for Refresh in Agents view.

---

## TreeDataProvider contract

- **Workspace view** (`aceExplorer`): `getChildren(undefined)` returns the list of project tree items (or “No projects” placeholder). No parent wrapper node.
- **Agents view** (`aceAgents`): `getChildren(undefined)` returns the list of agent root nodes (Cursor, Claude, Global) that exist. No parent wrapper node.

Both providers receive or resolve their data from the same scanning and project state; they do not mutate artifacts.
