---
plan_version: "1.0.0"
revised_at: "2026-03-12"
derived_from_spec: "specs/mcp/spec.md"
---

# Implementation Plan: MCP Server Integration

**Branch**: `[mcp-mcp-server-integration]` | **Date**: 2026-03-12 | **Spec**: `specs/mcp/spec.md`  
**Input**: Feature specification from `specs/mcp/spec.md`

## Summary

The MCP server exposes Agent Context Explorer's scanners as **MCP tools only**, giving AI agents dynamic, on-demand access to project context without maintaining static export files.  
It provides a **multi-project** surface where agents discover projects via `list_projects` and then pass a short `projectKey` for all other tools.  
**When run from the extension**: project resolution and scanning live in the extension (same hierarchy as the tree view); the stdio server is a **bridge** that forwards tool calls to the extension backend. **Standalone**: the stdio server resolves projects from env and runs scanners in-process.

## Technical Context

**Language/Version**: TypeScript (strict) targeting modern Node.js and VS Code extension hosts  
**Primary Dependencies**: VS Code Extension API, MCP protocol runtime, existing ACE scanners (`RulesScanner`, `CommandsScanner`, `SkillsScanner`, `AsdlcArtifactScanner`)  
**Storage**: None (scanners read directly from workspace files; no persistent state)  
**Testing**: Mocha via `@vscode/test-electron` plus existing unit tests for MCP server and types  
**Target Platform**: Cursor / VS Code extension host and optional standalone Node.js MCP server (stdio transport)  
**Project Type**: VS Code / Cursor extension + standalone MCP server binary  
**Performance Goals**: Tools remain fast enough for interactive agent use without adding explicit caching; scanning is invoked fresh on each call  
**Constraints**: Viewer-only, read-only behavior; must respect workspace boundaries and never execute user code  
**Scale/Scope**: Multiple projects registered in ACE; tools operate over all configured projects via `projectKey`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify this plan complies with the project constitution at `.specify/memory/constitution.md`, at minimum:

- Viewer-only, explicit-artifact behavior (no hidden mutation of specs/rules/skills)
- Safety and operational boundaries (workspace-only file access, error handling)
- Strict TypeScript and quality expectations (tests, patterns, explicit types)
- ASDLC alignment (specs, plans, tasks kept in sync)
- Simplicity and performance constraints (avoid unnecessary complexity or regressions)

## Project Structure

### Documentation (this feature)

```text
specs/mcp/
├── plan.md              # This file (/agency.plan output using project plan template)
├── research.md          # Phase 0 output (problem understanding, alternatives, risks)
├── data-model.md        # Phase 1 output (MCP tool inputs/outputs, type mappings)
├── quickstart.md        # Phase 1 output (how to run and use the MCP server)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /agency.plan)
```

### Source Code (repository root)

```text
src/
├── extension.ts         # Extension activation and MCP registration
├── mcp/
│   ├── mcpServerProvider.ts  # Server definitions; starts extension backend, passes ACE_EXTENSION_PORT
│   ├── extensionBackend.ts  # Project resolution + tool handlers (McpTools); TCP listener for bridge
│   ├── server.ts        # Stdio: bridge mode (forward to backend) or standalone (in-process scanners)
│   ├── tools.ts         # McpTools — tool handlers wrapping scanners (used by backend in bridge mode)
│   └── types.ts         # MCP-facing type definitions and mappings
├── scanner/
│   ├── rulesScanner.ts
│   ├── commandsScanner.ts
│   ├── skillsScanner.ts
│   └── asdlcArtifactScanner.ts
└── providers/           # Tree view providers (not modified by this feature)

test/
└── suite/
    └── unit/
        ├── mcpServer.test.ts
        └── mcpTypes.test.ts
```

**Structure Decision**: MCP lives in `src/mcp/`. When the extension runs, the **backend** owns project resolution and scanning (same source of truth as the tree); the stdio **server** is a thin bridge. Standalone mode keeps the server self-contained with env-based project list. Scanners remain shared across tree view and MCP.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|---------------------------------------|
| _None currently identified_ | MCP layer remains a thin protocol adapter with no added business logic or caching. | Existing scanners already encapsulate complexity; MCP merely exposes them as tools. |

## Implementation Phases

### Phase 1: Tools-only surface

- Ensure the MCP server does **not** register MCP resources (no `ace://rules`, `ace://commands`, `ace://skills`, `ace://agents-md`, `ace://specs`, or `ace://schemas` resources).
- Confirm the server advertises only the tools defined in the spec: `list_projects`, `list_rules`, `get_rule`, `list_commands`, `get_command`, `list_skills`, `get_skill`, `get_asdlc_artifacts`, `list_specs`, `get_project_context`.
- Audit docs/README for any mention of `ace://` resources and update them to state that agents consume context exclusively via tools.

### Phase 2: Multi-project in all tools

- Ensure every tool handler accepts a `projectKey` (or equivalent) and resolves it to a configured project root.
- When `projectKey` is provided, run scanners against that project root; when omitted, default to the current ACE project or workspace root.
- Validate the resolved project root against allowed/configured project list and enforce workspace-boundary checks.

### Phase 3: Verification and tests

- Extend or add integration tests covering:
  - Tool-only discovery (no MCP resources registered).
  - Multi-project tool calls using `projectKey`, including error handling for unknown keys.
- Confirm existing tool behavior remains unchanged when `projectKey` is omitted (backwards compatibility for single-project usage).
- Keep MCP types (`src/mcp/types.ts`) consistent with the spec and test that tool responses match the declared shapes exactly.

