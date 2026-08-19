# Research: Unify Artifact Scanning Across MCP Tools and Tree View

## Decision 1: Merge `.claude/*` scanning into the `.cursor`-only core scanners by reusing `scanClaudeCodeCore.ts`'s existing per-type helpers

**Decision**: Each `scan<Type>Core` function (`scanRulesCore`, `scanCommandsCore`, `scanSkillsCore`, `scanAgentDefinitionsCore`) is extended to also read `.claude/<type>/`, by extracting and calling the already-correct per-type scan logic currently private to `scanClaudeCodeCore.ts` (`scanClaudeRules`, `scanClaudeCommands`, `scanClaudeSkills`, `scanClaudeAgentDefs`). Results from both platforms are concatenated into one array, each item tagged `platform: 'cursor' | 'claude'`.

**Rationale**: `scanClaudeCodeCore.ts`'s per-type helpers are already correct and exercised by tests (the tree view's Claude Code section has worked correctly all along). Reusing them avoids re-implementing `.claude/*` directory walking a third time, satisfying constitution principle 5 (Simplicity) and NFR-003. It also directly closes the confirmed defect: `list_skills` et al. currently never call any `.claude/*`-aware code at all.

**Alternatives considered**:
- Re-implement `.claude/*` walking inline inside each `scan*Core.ts` — rejected, duplicates logic that already exists and is tested.
- Keep `scan*Core.ts` Cursor-only and merge `.claude` results at each call site (MCP server, tree view scanners) — rejected, violates FR-001 ("one core scan operation"); pushes merge responsibility onto every consumer instead of centralizing it, reintroducing the drift risk this feature exists to close.

## Decision 2: Add a `platform: 'cursor' | 'claude'` tag to `CoreRule`, `CoreCommand`, `CoreSkill`, `CoreAgentDefinition`

**Decision**: Extend the four core types in `src/scanner/core/types.ts` with a `platform` field, populated by the unified scan functions.

**Rationale**: Both consumers need to distinguish platform post-merge. The tree view uses it to partition results into its existing Cursor / Claude Code sections (FR-005). A flat array with a tag is simpler for MCP callers that just want everything (FR-003) than a `{ cursor: T[], claude: T[] }` split, and mirrors the existing `location: 'workspace' | 'global'` field's shape and usage.

**Alternatives considered**:
- Return `{ cursor: T[], claude: T[] }` from each core scan instead of a flat tagged array — rejected, MCP `list_*` tools want one flat list (matches today's output shape per NFR-001); the tree view can `.filter()` a flat array by tag exactly as easily as indexing a split object.

## Decision 3: `get_*` name-collision precedence — sort by (location: workspace before global), then (platform: cursor before claude), take first match

**Decision**: When a `get_rule`/`get_command`/`get_skill`/`get_agent` name lookup matches more than one artifact, resolve deterministically: workspace-location matches win over global-location matches; within the same location tier, cursor-platform matches win over claude-platform matches.

**Rationale**: Directly implements the FR-008 clarification answer. A `.sort()` comparator plus `.find()` is simple, testable, and requires no new data structure. It also preserves today's de facto behavior for the common case (Cursor-only projects, where this precedence never changes anything).

**Alternatives considered**:
- Error on ambiguous match — rejected during clarification (breaking change from today's implicit first-match behavior; not requested).
- Last-write-wins via a `Map` keyed by name — rejected, insertion order would implicitly encode precedence rather than making it explicit and reviewable.

## Decision 4: Retire `scanClaudeCodeCore()`'s per-project aggregate wrapper and `ClaudeCodeScanner` from the artifact-scanning data path; keep CLAUDE.md / `claudeFolderExists` handling as-is

**Decision**: `scanClaudeCodeCore.ts`'s four per-type helpers move to being called from within the unified `scan*Core.ts` functions rather than from `scanClaudeCodeCore()`/`ClaudeCodeScanner`. The tree view's existing per-section scanner classes (`SkillsScanner`, `RulesScanner`, `CommandsScanner`, `AgentsScanner`) call the unified `scan*Core` and filter by the `platform` tag matching the section being rendered (Cursor section filters `platform === 'cursor'`, Claude Code section filters `platform === 'claude'`). `scanClaudeCodeCore()`'s CLAUDE.md detection and `claudeFolderExists`/`hasAnyArtifacts` aggregate fields are unrelated to the four artifact types in scope and are left as-is (out of scope per spec.md).

**Rationale**: Leaves exactly one live implementation per artifact type (SC-004), satisfying the feature's core goal, without touching CLAUDE.md handling which this spec explicitly does not cover.

**Alternatives considered**:
- Keep `scanClaudeCodeCore()`'s aggregate wrapper alongside the newly-unified `scan*Core` functions, both still calling the same four helpers — rejected, leaves two live call paths for the same four artifact types, reintroducing the exact drift risk being fixed.

## Decision 5: ACE has two live MCP tool implementations — both need the fix, via a shared unified/filtered split on the scanner classes

**Decision**: Investigation during task breakdown found `src/mcp/server.ts` is only the **standalone**-mode implementation (used when the extension isn't running, e.g. `ACE_PROJECT_PATHS` env). When the extension is running, MCP calls are served in **bridge mode** by `src/mcp/toolsImpl.ts`'s `McpTools` class (via `extensionBackend.ts`), which independently calls `RulesScanner`/`CommandsScanner`/`SkillsScanner`/`AgentsScanner` directly — with no Claude Code merge at all. This is a second, separate instance of the same bug, and it's the one actually exercised by a running extension (confirmed: the original `list_skills` defect report was observed against a live extension, i.e. bridge mode). `src/mcp/types.ts` additionally defines its own `RuleInfo`/`CommandInfo`/`SkillInfo`/`AgentDefinitionInfo` interfaces and `to*Info` mapper functions, parallel to (but separate from) the same-named interfaces local to `server.ts` — both need the `platform` field and both mapper paths need updating.

Resolution: `RulesScanner`/`CommandsScanner`/`SkillsScanner`/`AgentsScanner` (`src/scanner/*.ts`) keep their existing methods (`scanRules()`, `scanWorkspaceSkills()`, etc.) filtered to `platform === 'cursor'` only — zero behavior change for their only current caller, the tree view's Cursor section. Each class gains one new method returning the **unfiltered, platform-tagged, both-platform** result from the unified core scan. `ClaudeCodeScanner` is repointed to source its per-type fields from the same new unfiltered method, filtered to `platform === 'claude'`, replacing its old call into `scanClaudeCodeCore()`'s per-type helpers. Both `toolsImpl.ts`'s `McpTools` and `server.ts`'s standalone functions call the new unfiltered method directly, so a single fix flows through both live MCP implementations without duplicating merge logic a third time.

**Rationale**: Preserves the tree view's exact current behavior (existing methods, existing callers, unchanged) while giving both MCP implementations — and any future consumer — one shared source of complete, tagged results. Matches FR-001's "one core scan operation" while acknowledging there remains, by necessity, one filtered read path (tree view, per-platform) and one unfiltered read path (MCP tools, cross-platform) over that single scan.

**Alternatives considered**:
- Fix only `server.ts` — rejected once discovered that bridge mode (the actually-active path for a running extension) has its own independent, unfixed copy of the bug.
- Have `toolsImpl.ts` instantiate `ClaudeCodeScanner` directly and merge its results at the call site (mirroring what `extension.ts`'s tree view population does for its two *sections*) — rejected; would require flattening two separately-shaped result sets into one tagged list at every MCP call site (both `server.ts` and `toolsImpl.ts`), reintroducing per-consumer merge logic that FR-001 exists to eliminate.

## No remaining NEEDS CLARIFICATION

Both open questions (global-scope boundary, `get_*` collision handling) were resolved during `/speckit.specify` clarification (see spec.md "Clarifications" section) and carried forward as Decisions 2–3 above.
