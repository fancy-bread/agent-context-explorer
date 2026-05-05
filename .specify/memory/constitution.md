<!--
Sync Impact Report

- Version change: N/A → 1.0.0
- Modified principles:
  - Core principles replaced with ACE-specific guidance derived from VISION.md and AGENTS.md
- Added sections:
  - Additional Constraints and Standards
  - Development Workflow and Quality Gates
- Removed sections:
  - Template examples and placeholder guidance comments
- Templates reviewed:
  - ✅ .specify/templates/plan-template.md (Constitution Check aligned with new principles)
  - ✅ .specify/templates/spec-template.md (no constitution coupling; no change required)
  - ✅ .specify/templates/tasks-template.md (no constitution coupling; no change required)
- Runtime docs reviewed:
  - ✅ VISION.md (source of product taste; now explicitly referenced)
  - ✅ AGENTS.md (remains higher-level agent guidance aligned with this constitution)
- Deferred TODOs:
  - None; all placeholders in this constitution have been resolved.
-->

# Agent Context Explorer (ACE) Constitution

## Core Principles

### 1. Viewer-Only, Explicit Artifacts First

ACE is a **read-only viewer and context provider** for intentional artifacts, not an
editor or compliance engine. It treats `AGENTS.md`, `VISION.md`, `specs/`,
`.cursor/rules/`, `.cursor/skills/`, and related files as the single source of truth.

- Features MUST prioritize **displaying and organizing** artifacts over mutating them.
- ACE MUST NOT create, edit, or delete rules, specs, skills, or other artifacts on
  behalf of the user except where explicitly and narrowly scoped (e.g., ASDLC support
  tools in `.specify/`), and even then must require clear user intent.
- ACE MUST avoid "optimistic" state detection based on heuristics alone; when in doubt,
  it defers to explicit artifacts and asks users to add or clarify them.

Rationale: Agents and humans need reliable, inspectable context. Viewer-only behavior
keeps ACE safe, predictable, and easy to trust.

### 2. Safety and Operational Boundaries

ACE MUST operate safely inside workspace and platform boundaries, honoring the
operational tiers defined in `AGENTS.md`.

- File operations MUST use `vscode.workspace.fs` and validate paths against workspace
  boundaries.
- The extension MUST handle errors gracefully with clear, user-friendly messages.
- The extension MUST dispose of resources correctly in `deactivate()`.
- High-risk operations (e.g., changing export formats, modifying scanner logic,
  altering tree view structure, or adding dependencies) REQUIRE explicit human
  confirmation and careful review.
- ACE MUST NEVER execute user-provided code, write outside the workspace, commit
  secrets, or block the main thread with synchronous operations.

Rationale: The extension runs in developer-critical environments. Safety and
predictability are non-negotiable.

### 3. Strict TypeScript and Code Quality

ACE code MUST be clear, maintainable, and type-safe.

- TypeScript **strict mode** is REQUIRED for all production code.
- Public functions and classes MUST declare explicit return types.
- New features MUST be accompanied by unit tests or integration tests appropriate to
  their scope (e.g., scanner behavior, MCP tool contracts).
- Code MUST follow existing project patterns (providers, scanners, services) rather
  than ad-hoc structures.

Rationale: A strongly-typed, well-tested extension is easier for both humans and
agents to extend without regressions.

### 4. ASDLC-Native Workflows

ACE exists to support ASDLC patterns, not to work around them.

- Changes that affect behavior SHOULD be grounded in updated specs
  (`specs/**/spec.md`), plans (`plan.md`), and tasks (`tasks.md`).
- AGENTS.md and this constitution define how agents and tools behave in this repo;
  new workflows MUST respect those boundaries.
- Features that surface or consume context (e.g., tree views, MCP tools) MUST treat
  ASDLC artifacts as first-class and avoid introducing parallel, redundant sources of
  truth.
- When behavior is unclear, contributors SHOULD update or create the relevant ASDLC
  artifact before implementing code.

Rationale: ASDLC separates vision, constitution, and specs so humans and agents can
reason about the system together.

### 5. Simplicity, Performance, and Bundling

ACE prefers simple, fast implementations that respect bundling and performance
constraints.

- The extension and MCP server MUST remain **bundled** (via Vite or equivalent) to
  avoid shipping thousands of files.
- Performance-sensitive paths (scanners, MCP tools, tree providers) MUST avoid
  unnecessary allocations, deep recursion, or synchronous blocking.
- Features that add complexity (e.g., new project types, additional views) MUST be
  justified against simpler alternatives and documented when they increase long-term
  maintenance cost.

Rationale: Developers rely on ACE in everyday workflows; it should remain fast,
lightweight, and understandable.

## Additional Constraints and Standards

This section captures cross-cutting constraints that apply to the entire project.

- **Tech Stack**: ACE is a TypeScript project targeting VS Code / Cursor. New
  functionality MUST fit this ecosystem (VS Code APIs, MCP, Node-compatible code).
- **Security**: All file and network access MUST be validated and constrained to the
  minimum necessary scope. Sensitive data MUST NOT be logged or persisted.
- **Multi-Project Support**: ACE treats multiple workspaces and external roots as
  first-class. Scanners and MCP tools MUST be able to operate per-project, and MUST
  not assume a single-root repository.
- **Observability**: Logging SHOULD be structured and minimal, aimed at diagnosing
  scanner and MCP behavior rather than general app telemetry.

## Development Workflow and Quality Gates

This section defines how work is planned, reviewed, and accepted.

- **Spec-First**: Non-trivial features SHOULD start from or update a spec in `specs/`.
  Tasks and plans (`plan.md`, `tasks.md`) MUST be kept in sync with the implemented
  behavior.
- **Context Gates**: When commands like `/speckit.plan`, `/speckit.tasks`, or
  `/agency.plan` run, they MUST enforce their documented context gates (e.g., spec
  existence, constitution presence, required templates).
- **Review Expectations**: Code review MUST check:
  - Viewer-only constraints are honored (no hidden mutation of artifacts).
  - Operational boundaries and safety rules are respected.
  - TypeScript strictness and testing expectations are met.
  - Changes are grounded in or reflected back into ASDLC artifacts.
- **MCP Contracts**: MCP tools MUST remain thin adapters over scanners. Tool schemas
  and behavior are part of the public contract and require extra scrutiny when
  changed.

## Governance

This constitution governs ACE behavior and supersedes ad-hoc practices when they
conflict. It is intentionally stable but amendable.

- **Authority**: When there is a conflict between informal habits and this document,
  the constitution wins. AGENTS.md and VISION.md remain the higher-level sources for
  identity and product taste; this constitution encodes their operational consequences.
- **Amendment Process**:
  - Substantive changes to principles or governance MUST be documented in a spec or
    ADR and reflected in this file.
  - All amendments MUST update the version and dates below and include a brief summary
    in the Sync Impact Report at the top of this file.
- **Versioning Policy**:
  - **MAJOR**: Backward-incompatible changes to principles (e.g., removing or
    reversing non-negotiable rules).
  - **MINOR**: New principles or sections, or materially expanded guidance.
  - **PATCH**: Clarifications, typo fixes, and non-semantic wording improvements.
- **Compliance in Practice**:
  - PR reviews SHOULD explicitly consider this constitution when assessing changes.
  - Automated tools and agents operating in this repo SHOULD treat this document as a
    binding constraint on their behavior.

**Version**: 1.0.0 | **Ratified**: 2026-02-07 | **Last Amended**: 2026-03-12

