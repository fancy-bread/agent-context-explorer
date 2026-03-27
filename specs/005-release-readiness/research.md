# Research: 1.0 Release Readiness

**Feature**: `005-release-readiness` | **Date**: 2026-03-26

## 1. Root `CHANGELOG.md`

**Decision**: Add a **root** `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/) conventions (Keep a Changelog, Semantic Versioning links optional in footer).

**Rationale**: `.vscodeignore` already whitelists `CHANGELOG.md` for the VSIX; marketplace reviewers and users expect release history at repo root. A single file is enough for 1.0.0.

**Alternatives considered**:

- **CHANGELOG only in `README`**: Rejected—harder to diff per version and non-standard for extensions.
- **Auto-generated from git**: Rejected for this slice—extra tooling and scope.

## 2. `ace.viewStateSection` — remove vs implement

**Decision**: **Remove** the command from `package.json` `contributes.commands`, from **AGENTS.md** command registry, and from integration tests that require it. Do **not** add a no-op handler unless product explicitly wants a stub (violates “no dead commands” spirit).

**Rationale**: There is **no** `registerCommand('ace.viewStateSection', …)` in `src/`. The feature spec (FR-003) requires no advertised-but-unavailable commands. Implementing real “view state section” behavior would be new scope (likely tied to removed/legacy state UI).

**Alternatives considered**:

- **Implement minimal command** (e.g. information message): Rejected—adds surface area without user value for 1.0.0.
- **Register no-op**: Rejected—still misleading.

## 3. README alignment

**Decision**: Update **What You See** (or equivalent) to include:

- **Workspaces** → **Cursor** → **Agents** (agent definitions under `.cursor/agents/`)
- Separate **Agents** sidebar view (agent roots + global)
- **Specs** flat list under each project
- **MCP**: short list of tools matching current `specs/mcp/spec.md` tool registry (or a pointer to that spec)

**Rationale**: Matches shipped product and reduces first-run confusion.

**Alternatives considered**:

- **Link-only README**: Rejected—spec success criteria want README self-sufficient for 90% of orientation.

## 4. `fileWatcher.ts` TODO

**Decision**: Remove the stale `// TODO: Implement file watching logic` line; optionally replace with a one-line comment that `watchRules` wires `vscode.workspace.createFileSystemWatcher` (if needed for clarity).

**Rationale**: The method is implemented; TODO undermines trust at 1.0.0.

## 5. `engines.vscode` note in README

**Decision**: Add **one sentence** in README (Requirements or Troubleshooting): minimum VS Code version matches `package.json` `engines.vscode`.

**Rationale**: Spec edge case “older editor versions”.

## 6. Marketplace categories / keywords (nice-to-have)

**Decision**: **Out of scope** for this plan (per spec); may be a follow-up task post-1.0.0.
