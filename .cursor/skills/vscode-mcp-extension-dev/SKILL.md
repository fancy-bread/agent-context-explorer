name: vscode-mcp-extension-dev
description: >-
  Best practices for VS Code extensions that use MCP (Model Context Protocol) or expose agent context. Use when implementing extension features, MCP servers, tree views, or scanners. Covers TypeScript/extension API patterns, security, performance, error handling, testing, and operational boundaries (ALWAYS/ASK/NEVER). Project rules replacement for ACE-style extensions.
---

# VS Code + MCP Extension Development

This skill provides end-to-end guidance for TypeScript VS Code extensions that integrate MCP and expose agent context. It includes generic VS Code API guidance plus MCP-specific architecture, bundling, and project standards.

## When to Use

- Implementing or changing VS Code extension code in an MCP-aware or agent-context project
- Adding MCP tools, bridge servers, or extension backends
- Working with tree views, scanners, or file-based artifact discovery
- Applying project operational boundaries (file ops, code quality, ASDLC)

## Operational Boundaries (CRITICAL)

### ALWAYS

**File operations:** Use `vscode.workspace.fs` only (not Node.js `fs`). Validate paths against workspace. Handle errors; dispose in `deactivate()`.

**Code quality:** Strict TypeScript (`strict: true`). Explicit return types on public methods. `const` over `let`; no `var`. Async/await; try/catch for async. Unit tests for new features; follow existing patterns.

**ASDLC/artifacts:** Prefer explicit artifacts (AGENTS.md, specs/, schemas/) over inference. Scan per sub-project in monorepos; fallback when artifacts missing.

### ASK

Before removing or significantly changing features, changing export format/data shape, adding dependencies, changing scanner logic across projects, or changing tree view structure.

### NEVER

Execute user-provided code; write outside workspace; commit secrets; modify files without confirmation; block main thread with sync work; skip error handling or validation.

---

## Extension + MCP Architecture

- **Entry:** `activate()` registers commands and providers; push disposables to `context.subscriptions`. `deactivate()` cleans up (watchers, servers, listeners).
- **Structure:** Separate scanners, providers, commands, services, utils. Use dependency injection where it clarifies boundaries.
- **Activation:** Prefer specific activation events (`onCommand:`, `onView:`, `workspaceContains:`, etc.); avoid `*`.
- **File ops:** Only `vscode.workspace.fs`. Validate and sanitize paths; allowlists over blocklists.

---

## Security

- **Input:** Validate and sanitize all inputs; validate JSON/YAML before parse; sanitize paths (no traversal).
- **Files:** No execution of user-provided code; paths must stay inside workspace; avoid writing to system dirs.
- **Network:** Validate URLs; HTTPS only; timeouts; don’t store secrets in plain text.
- **Manifest:** Minimal permissions in `package.json`; specific activation events; review dependencies.

---

## Performance

- **Startup:** Lazy load heavy modules; defer work until needed; no sync work during activation; use bundling (e.g. Vite) for production.
- **Runtime:** Async file ops only; efficient watchers; cache expensive work; batch when possible; stream large files.
- **Tree views:** Virtual/incremental loading; cache tree data; minimize refresh; debounce search/input.
- **UX:** Progress for long ops; cancellation where possible; immediate feedback for quick ops.

---

## Error Handling & Resources

- Wrap async in try/catch; surface user-friendly messages (`showErrorMessage`/`showWarningMessage`); log details for debugging.
- Handle missing workspace, missing files, invalid input; offer actionable messages.
- All watchers, listeners, subscriptions: dispose via `context.subscriptions` or explicit `dispose()`; avoid leaks.

---

## MCP + Bundling

- **Bridge mode:** Extension backend (e.g. TCP in extension host) + standalone MCP process that forwards to backend. Prefer bridge when extension is loaded so one source of truth for project list and scanners.
- **Standalone fallback:** When backend fails, MCP process can run with env (e.g. `ACE_PROJECT_PATHS`) and implement tools itself.
- **Bundling:** Externalize only Node built-ins (`net`, `path`, etc.); bundle extension and MCP server so runtime doesn’t rely on unbundled `node_modules`. Fix “module not found” by adjusting externals, not by shipping full deps.

---

## Tree Views & UI

- Meaningful icons (`vscode.ThemeIcon`); tooltips; logical grouping; context menus for actions.
- Progress for long ops; clear empty states; loading states.
- Prefer lazy/incremental loading and caching for large data.

---

## Testing

- Unit tests for core logic (e.g. param normalization, project key resolution, pure helpers); mock VS Code API.
- Use `@vscode/test-electron` for extension tests; test activation, commands, tree data, workspace changes.
- Fixtures and temp workspaces; clean up; aim for strong coverage on critical paths.

---

## Documentation & Publishing

- JSDoc on public APIs; keep README and changelog current; document commands, config, and activation.
- Pre-publish: validate manifest, activation events, and commands; check package size and `.vscodeignore`; use semver and tag releases.

---

## ACE-Specific (Viewer-Only / Agent Context)

- **Viewer-only:** Extension scans and displays rules, commands, specs, AGENTS.md—no CRUD for those artifacts; users edit in their own editors.
- **Artifacts:** AGENTS.md, `.cursor/rules`, `.cursor/commands`, `.cursor/skills`, `specs/`, `schemas/`, `.plans/`. Prefer scanning these over inferring project type from file patterns.
- **Pitfalls:** Avoid “optimistic” state detection from file patterns; avoid adding rules/artifact management or compliance auditing to a general viewer; avoid packaging full `node_modules` (bundle); ensure MCP server uses bundled code and correct externals.

---

## Quick Checklist

Before shipping changes:

- [ ] File ops use `vscode.workspace.fs`; paths validated; resources disposed in `deactivate()`
- [ ] Strict TS; explicit return types; tests for new behavior
- [ ] No execution of user code; no writes outside workspace; no secrets committed
- [ ] Async only on hot paths; tree/view logic efficient; progress for long ops
- [ ] ASK before big removals, format changes, new deps, or cross-project scanner/tree changes
