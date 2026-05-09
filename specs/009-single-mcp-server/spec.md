---
spec_version: "1.0.0"
revised_at: "2026-05-09"
---

# Feature Specification: Single MCP Server Registration

**Feature Branch**: `009-single-mcp-server`
**Created**: 2026-05-09
**Status**: Draft
**Input**: Observation: adding multiple projects to a workspace causes ACE to register one MCP server per workspace folder (`ace-agent-context-explorer`, `ace-agency`, etc.) instead of a single `ace` server. Each per-folder server only sees one project and ignores `projectKey`. Contradicts the MCP spec's design of one server + `list_projects` + `projectKey` addressing.

---

## Clarifications

### Session 2026-05-09

- Q: Should the single server name be `ace` in all cases? → A: Yes — always `ace`, regardless of folder count.
- Q: Does this change affect the VS Code `McpServerDefinitionProvider` path (`provideMcpServerDefinitions`) as well as the Cursor `cursor.mcp` path (`syncCursorRegistration`)? → A: Yes — both paths must register a single server.
- Q: Should `ACE_WORKSPACE_PATH` be removed entirely from the server env? → A: Yes — in bridge mode, the backend resolves projects via `list_projects`; passing a hardcoded workspace path is redundant and incorrect for multi-project setups.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Single MCP server regardless of workspace folder count (Priority: P1)

A developer has two workspace folders open (e.g. `agent-context-explorer` and `agency`). When they open Cursor's MCP panel or query available tools, they see one server — `ace` — not two servers `ace-agent-context-explorer` and `ace-agency`.

**Why this priority**: The current behaviour breaks the `projectKey` contract entirely. Each per-folder server only knows about one project, so `list_projects` returns a single result and cross-project addressing is impossible. The entire multi-project MCP design is non-functional until this is fixed.

**Independent Test**: Open a Cursor workspace with two folders. Verify the MCP panel shows exactly one server named `ace`. Invoke `list_projects` — verify it returns both projects. Invoke `get_rule` with `projectKey` for the non-active project — verify it returns that project's rules.

**Acceptance Scenarios**:

1. **Given** a workspace with one folder, **When** ACE activates, **Then** exactly one MCP server named `ace` is registered.
2. **Given** a workspace with multiple folders, **When** ACE activates, **Then** exactly one MCP server named `ace` is registered (not one per folder).
3. **Given** a single `ace` server, **When** an agent invokes `list_projects`, **Then** all workspace folders and all added projects are returned.
4. **Given** a single `ace` server, **When** an agent invokes any tool with a valid `projectKey`, **Then** results are scoped to the specified project.
5. **Given** a workspace with zero folders, **When** ACE activates, **Then** exactly one MCP server named `ace` is registered (unchanged from current zero-folder behaviour).

---

### User Story 2 — No ACE_WORKSPACE_PATH in server env (Priority: P2)

The per-folder servers previously received `ACE_WORKSPACE_PATH` to tell the standalone server which project to scan. With a single server and bridge mode, this env var is meaningless and should not be passed.

**Why this priority**: Passing `ACE_WORKSPACE_PATH` to a bridge-mode server is misleading — the backend ignores it but its presence could cause confusing behaviour in standalone fallback mode, where the single server would lock to one project instead of using `ACE_PROJECT_PATHS`.

**Independent Test**: In standalone fallback mode (backend fails to start), verify the single `ace` server correctly uses `ACE_PROJECT_PATHS` (or the workspace argument) rather than `ACE_WORKSPACE_PATH`.

**Acceptance Scenarios**:

1. **Given** bridge mode is active, **When** the server definition is built, **Then** `ACE_WORKSPACE_PATH` is not present in the server env.
2. **Given** standalone fallback mode, **When** the server definition is built, **Then** `ACE_PROJECT_PATHS` (if set) is present; `ACE_WORKSPACE_PATH` is not.

---

### Edge Cases

- **Single folder workspace**: Behaviour is unchanged from the user's perspective (was `ace` already in the single-folder case). Confirm the single-folder fast-path still produces `name: 'ace'`.
- **Workspace folder changes**: When folders are added or removed, `refresh()` fires — the single `ace` server is unregistered and re-registered (not accumulated). No duplicate registrations.
- **Backend starts after initial registration**: If the backend starts after the first `provideMcpServerDefinitions` call, the subsequent `ACE_EXTENSION_PORT` env will be picked up on the next refresh. Behaviour is unchanged by this fix.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: ACE MUST register exactly one MCP server named `ace` via `cursor.mcp.registerServer()` (`syncCursorRegistration`), regardless of the number of workspace folders.
- **FR-002**: ACE MUST expose exactly one `McpServerDefinition` named `'Agent Context Explorer'` (or `'ace'`) via `provideMcpServerDefinitions()`, regardless of the number of workspace folders.
- **FR-003**: The server env MUST NOT include `ACE_WORKSPACE_PATH`.
- **FR-004**: In bridge mode, the server env MUST include `ACE_EXTENSION_PORT`; all project resolution is handled by the backend.
- **FR-005**: In standalone fallback mode, the server env MUST include `ACE_PROJECT_PATHS` when projects are known; the first workspace folder path MAY be passed as a positional arg for single-folder workspaces.
- **FR-006**: When workspace folders change, `refresh()` MUST unregister the existing `ace` server and re-register a single `ace` server (no accumulation of registrations).

### Non-Functional Requirements

- **NFR-001**: The fix MUST NOT change the external tool contract — tool names, input schemas, and output types are unchanged.
- **NFR-002**: Existing unit tests for `McpServerProvider` MUST continue to pass; new tests MUST cover the single-server invariant for zero, one, and multiple workspace folders.

### Key Entities

- **`syncCursorRegistration()`**: Cursor-specific registration via `cursor.mcp.registerServer()` — currently loops over folders; must be reduced to a single registration.
- **`provideMcpServerDefinitions()`**: VS Code `McpServerDefinitionProvider` path — currently loops over folders; must return a single definition.
- **`ACE_WORKSPACE_PATH`**: Env var used by per-folder servers to scope the standalone server — must be removed.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With N workspace folders (N ≥ 1), exactly one MCP server named `ace` is visible in the Cursor MCP panel after ACE activates.
- **SC-002**: `list_projects` returns all N workspace folders plus any added projects when called against the single `ace` server.
- **SC-003**: `get_project` with a valid `projectKey` returns context for the specified project, not just the first folder.
- **SC-004**: `ACE_WORKSPACE_PATH` does not appear in the registered server's env in bridge mode.
- **SC-005**: Unit tests assert `provideMcpServerDefinitions()` returns exactly one definition for 0, 1, and 2+ workspace folders.

---

## Out of Scope

- Changes to MCP tool schemas or tool behaviour (tools already support `projectKey`).
- Changes to the extension backend or `extensionBackend.ts`.
- Renaming the server from `ace` to any other identifier.
- Adding a user-facing configuration to override server naming.

## Implementation Reference

### Files

| Component | Location | Change |
|-----------|----------|--------|
| Cursor registration | `src/mcp/mcpServerProvider.ts` `syncCursorRegistration()` | Remove per-folder loop; always register single `ace` |
| VS Code definition provider | `src/mcp/mcpServerProvider.ts` `provideMcpServerDefinitions()` | Remove per-folder loop; return single definition |
| MCP spec | `specs/mcp/spec.md` | Confirm single-server invariant is documented |
| Provider tests | `test/suite/unit/mcpServerProvider.test.ts` | Add single-server assertion for 0/1/N folders |
