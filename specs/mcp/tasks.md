---
tasks_version: "1.0.0"
revised_at: "2026-03-12"
derived_from_plan: "specs/mcp/plan.md"
---

# Tasks: MCP Server Integration

## Phase 1: Tools-only surface

- [x] **T-001** Remove MCP resource registration from server (ace://*). Keep only tool registration.
- [x] **T-002** Update README/docs to state agents use tools only; remove or qualify references to ace:// resources.
- [x] **T-003** Smoke-test: confirm no resources are advertised by the server (e.g. list tools only).

## Phase 2: Multi-project in all tools

- [x] **T-004** Add optional `projectPath` (or equivalent) to MCP tool input schemas for all tools in server/tools layer.
- [x] **T-005** Implement project root resolution: when projectPath provided use it (with safety checks); when omitted use current workspace root.
- [x] **T-006** Thread resolved project root through to scanner calls in each tool handler (list_rules, get_rule, list_commands, get_command, list_skills, get_skill, list_agents, get_agent, list_specs, get_spec, get_project).
- [x] **T-007** Validate projectPath against workspace/configured projects and return clear error when invalid.

## Phase 3: Verification and tests

- [x] **T-008** Add/update test: server exposes only tools (no resources).
- [x] **T-009** Add/update test: each tool accepts projectPath and returns context for that project when provided.
- [x] **T-010** Regression: existing tests for tools without projectPath still pass (single-workspace behavior unchanged).

## Refactor: Extension-owned resolution (2026-03-12)

The same contract is now implemented with **extension-owned project resolution and scanning** when run from Cursor/VS Code: the extension backend (`extensionBackend.ts`) builds the project list (workspace + `ProjectManager.getProjects()`), resolves `projectKey`, and delegates to `McpTools`; the stdio server runs in **bridge mode** (`ACE_EXTENSION_PORT`) and forwards tool calls to the backend. No new tasks; spec and plan updated to describe bridge vs standalone modes.
