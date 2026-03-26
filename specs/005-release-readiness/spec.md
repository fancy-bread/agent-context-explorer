# Feature Specification: 1.0 Release Readiness

**Feature Branch**: `005-release-readiness`  
**Created**: 2026-03-26  
**Status**: Draft  
**Input**: Prepare Agent Context Explorer (ACE) for a 1.0.0 release by closing small but important “release readiness” gaps (release notes, documentation alignment, and removal of dead UI surface) without expanding product scope.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Install-ready release (Priority: P1)

As a developer evaluating ACE for first-time use, I want the extension to present as a polished, self-explanatory 1.0.0 release (clear release notes, accurate README, and no missing expected files), so I can trust it quickly without hunting through source or issues.

**Why this priority**: First-run clarity and release hygiene are essential for 1.0.0 credibility; these items reduce confusion and support burden immediately.

**Independent Test**: A reviewer can validate “release readiness” by inspecting the published package contents and reading the top-level documentation, without running the extension.

**Acceptance Scenarios**:

1. **Given** the repository at the release tag, **When** I look for release notes and legal/license information, **Then** I can find a clear changelog and the license at top-level locations commonly expected by reviewers.
2. **Given** I read the README as a first-time user, **When** I compare it to the extension’s visible UI concepts (Workspaces, Agents, Cursor artifacts, Specs, MCP tools), **Then** the README accurately describes what the product shows and how to get started.

---

### User Story 2 - No broken or misleading UI surface (Priority: P2)

As a developer using ACE, I want all visible commands and UI entries to be valid and meaningful (no dead commands, stale docs, or “unfinished” cues), so I don’t waste time on actions that do nothing.

**Why this priority**: A 1.0.0 release should not contain “broken by design” palette entries or misleading TODO text that implies unfinished work.

**Independent Test**: List registered commands and compare them to the documented/declared surface; confirm there are no “advertised but absent” behaviors.

**Acceptance Scenarios**:

1. **Given** a clean installation, **When** I search for ACE commands, **Then** every ACE command shown is implemented and does not fail immediately due to being unregistered or missing.
2. **Given** I read project documentation and see references to commands or surfaces, **When** I try to find them in the product, **Then** they exist or the docs do not claim they exist.

---

### User Story 3 - Release gate confidence (Priority: P3)

As a maintainer, I want a repeatable “go/no-go” checklist for 1.0.0 readiness, so I can publish with confidence that the release is coherent and reviewable.

**Why this priority**: A lightweight, explicit checklist reduces last-minute regressions and provides an audit trail for the 1.0.0 milestone.

**Independent Test**: Follow the checklist end-to-end in a fresh environment; all checks can be completed without special knowledge beyond standard extension review.

**Acceptance Scenarios**:

1. **Given** the release branch, **When** I follow the readiness checklist, **Then** I can complete it without encountering ambiguous “maybe” checks or missing inputs.

---

### Edge Cases

- **Partial environments**: Users may not have any global agent roots configured; docs should avoid implying features require them to exist.
- **Different host apps**: Users may run VS Code or Cursor variants; documentation should be clear about what is “automatic” vs “fallback/manual”.
- **Older editor versions**: Users on older versions should be able to tell quickly if they are below the supported minimum without trial-and-error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST include a top-level changelog suitable for a 1.0.0 release that communicates what changed and why.
- **FR-002**: The top-level README MUST describe the current user-visible product surface (Workspaces view, Agents view, Cursor artifacts, Specs, MCP) accurately and without stale omissions.
- **FR-003**: The extension MUST NOT advertise commands or actions that are not actually available to users (e.g., in the command palette or documentation).
- **FR-004**: The repository and packaged artifact MUST include commonly expected top-level metadata files for review (license, changelog, readme).
- **FR-005**: Developer-facing cues implying unfinished implementation (e.g., placeholder TODO text in user-critical areas) SHOULD be removed or updated so they do not undermine release confidence.

### Key Entities *(include if feature involves data)*

- **Release Notes**: A human-readable summary of changes per version.
- **User-Facing Surface**: The set of visible views, commands, and documented capabilities.
- **Readiness Checklist**: A list of verifiable checks required before publishing 1.0.0.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reviewer can locate changelog, license, and README from the repository root in under 30 seconds.
- **SC-002**: Zero “advertised-but-missing” commands or UI actions are found during a standard review of the extension surface.
- **SC-003**: At least 90% of first-time users can identify (from README alone) where to find Rules, Commands, Skills, agent definitions, Specs, and the Agents view without additional guidance.
- **SC-004**: A maintainer can complete the release readiness checklist in under 10 minutes on a clean machine.

## Assumptions & Dependencies

- This feature does not add new product capabilities; it tightens release hygiene and documentation alignment only.
- The project continues to follow a “viewer-only” philosophy; no artifact creation/editing is introduced as part of readiness.
