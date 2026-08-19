# Implementation Plan: Unify Artifact Scanning Across MCP Tools and Tree View

**Branch**: `011-unify-artifact-scanning` | **Date**: 2026-08-17 | **Spec**: [spec.md](spec.md)

## Summary

MCP tools (`list_rules`, `list_commands`, `list_skills`, `list_agents`, and the `get_*`/`get_project` equivalents) currently call `.cursor`-only core scan functions, so they never see `.claude/<type>/` artifacts — confirmed by a live query returning 4 skills instead of 15 for a project using Claude Code conventions. The tree view already scans both platforms correctly, but via a second, unconnected scanner (`scanClaudeCodeCore.ts`). This plan merges `.claude/<type>/` scanning into the four `scan*Core.ts` functions (reusing `scanClaudeCodeCore.ts`'s existing per-type helpers), tags every result with a new `platform: 'cursor' | 'claude'` field, and repoints both the MCP tools and the tree view's scanner classes at this single unified scan — leaving the tree view's visible Cursor/Claude Code section split unchanged.

## Technical Context

**Language/Version**: TypeScript 5.x, strict mode
**Primary Dependencies**: VS Code Extension API, `IFileSystem` abstraction (`VSCodeFsAdapter` / `NodeFsAdapter`) — no new dependencies
**Storage**: N/A — read-only filesystem scan of `.cursor/<type>/` and `.claude/<type>/` under each project root
**Testing**: Mocha (existing unit test suite)
**Target Platform**: VS Code / Cursor extension host + standalone Node MCP server
**Project Type**: VS Code extension + bundled MCP server
**Performance Goals**: No new I/O round trips versus today — today's two independent per-project scans (Cursor path + Claude Code path) become one merged scan issuing the same underlying directory reads, run in parallel (existing `Promise.all` pattern)
**Constraints**: MCP tool names and input schemas MUST NOT change (NFR-001); tree view visible section contents MUST be unchanged (NFR-002, SC-002)

## Constitution Check

| Principle | Assessment |
|-----------|------------|
| 1. Viewer-Only | PASS: Pure read-path change. No new writes; no new mutation of artifacts. |
| 2. Safety | PASS: Reuses existing `IFileSystem` abstraction and existing `.claude/*` scan logic (already path-validated in `scanClaudeCodeCore.ts`); no new filesystem access patterns introduced. |
| 3. TypeScript strict | PASS: New `platform` field is a typed union (`'cursor' \| 'claude'`) on existing interfaces; no `any`. New/changed functions keep explicit return types. |
| 4. ASDLC-Native | PASS: Grounded in spec.md; plan and tasks kept in sync per this workflow. |
| 5. Simplicity | PASS: Net reduction in parallel implementations — two scan paths per artifact type collapse to one (SC-004), directly serving this principle's "avoid introducing parallel, redundant sources of truth" language (constitution §4) and "justified against simpler alternatives" (§5). |

*MCP Contracts constraint (Development Workflow section)*: "MCP tools MUST remain thin adapters over scanners" — satisfied; `list_*`/`get_*` tools continue to just call the (now unified) core scan functions and shape output, with no new logic embedded in `server.ts` beyond the `get_*` precedence sort (data-model.md).

No violations — Complexity Tracking table omitted.

## Project Structure

### Documentation (this feature)

```text
specs/011-unify-artifact-scanning/
├── plan.md                          ← this file
├── research.md                      ← Phase 0 output
├── data-model.md                    ← Phase 1 output
├── contracts/                       ← Phase 1 output
│   ├── mcp-list-get-tools.md
│   └── tree-view-parity.md
├── quickstart.md                    ← Phase 1 output
├── checklists/
│   └── requirements.md
└── tasks.md                         ← Phase 2 output (/speckit.tasks)
```

### Source Code

```text
src/
├── scanner/
│   ├── core/
│   │   ├── types.ts                 ← add `platform: 'cursor' | 'claude'` to CoreRule, CoreCommand, CoreSkill, CoreAgentDefinition
│   │   ├── scanRulesCore.ts         ← merge in .claude/rules workspace scan; tag platform
│   │   ├── scanCommandsCore.ts      ← merge in .claude/commands workspace scan; tag platform
│   │   ├── scanSkillsCore.ts        ← merge in .claude/skills workspace scan; tag platform
│   │   ├── scanAgentDefinitionsCore.ts ← merge in .claude/agents workspace scan; tag platform
│   │   └── scanClaudeCodeCore.ts    ← per-type helpers reused by the above; aggregate scanClaudeCodeCore() keeps only CLAUDE.md/claudeFolderExists concerns
│   ├── rulesScanner.ts              ← filter unified scan by platform === 'cursor' (Cursor section) / 'claude' (Claude Code section)
│   ├── commandsScanner.ts           ← same pattern
│   ├── skillsScanner.ts             ← same pattern
│   ├── agentsScanner.ts             ← same pattern
│   └── claudeCodeScanner.ts         ← drop artifact-scanning responsibility; keep CLAUDE.md/claudeFolderExists
├── mcp/
│   └── server.ts                    ← consume unified core scans; add platform to *Info output types; get_* precedence resolution; update tool descriptions (FR-009)

test/
└── suite/unit/
    ├── scanRulesCore.test.ts        ← add cross-platform fixtures
    ├── scanCommandsCore.test.ts     ← add cross-platform fixtures
    ├── scanSkillsCore.test.ts       ← add cross-platform fixtures
    ├── scanAgentDefinitionsCore.test.ts ← add cross-platform fixtures
    ├── mcpServer*.test.ts           ← assert platform field + get_* precedence
    └── (existing tree view scanner tests) ← assert unchanged section content (NFR-002)
```

**Structure Decision**: Single VS Code extension + bundled MCP server project (existing layout, no new top-level directories). Changes are confined to `src/scanner/core/` (shared scan logic), the four `src/scanner/*Scanner.ts` tree-view wrappers, and `src/mcp/server.ts`.

## Complexity Tracking

*No Constitution Check violations — table not applicable.*
