# Feature Specification: Agent definitions in Workspaces and Agents views

**Feature Branch**: `004-agents-view-scan`  
**Created**: 2026-03-12  
**Status**: Draft  
**Input**: User description: "agents-view add agents scan and display in workspaces and agents views, use agent icon for individual agent files."

## Clarifications

### Session 2026-03-12

- **Terminology & living specs (proactive)**: Canonical terms and cross-spec alignment requirements were added under **Terminology** and **FR-007–FR-008** to resolve ambiguity between **Agents view**, **`AGENTS.md`**, and **agent definition files**, and to require coordinated updates to **tree-view**, **scanners**, **providers**, and **MCP** living specifications in the same delivery.
- **MCP scope (disjunctive requirement)**: Rather than leaving MCP indeterminate, **FR-008** requires either new MCP tool surface for agent definitions **or** an explicit documented deferral in the MCP living spec—both satisfy the vertical slice alignment goal.

### Session 2026-03-12 (UI polish)

- **Workspaces → Cursor** subsection label: **Agents** (folder listing agent definition files). Sibling nodes under **Cursor** are ordered **alphabetically** by label (**Agents**, **Commands**, **Rules**, **Skills**).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See agent definitions per project (Priority: P1)

As a developer using ACE, I want **agent definition files** for each workspace project to appear under the **Workspaces** sidebar in a predictable place, so I can find and open them alongside rules, commands, and skills without hunting the filesystem.

**Why this priority**: Workspaces view is the primary map of “what applies to this repo”; agent definitions are first-class Cursor/agent artifacts and belong there.

**Independent Test**: With a project that contains at least one supported agent definition file, expand the project’s Cursor-related section; the file(s) appear as leaves with the agreed visual treatment, and opening one launches the editor on that file.

**Acceptance Scenarios**:

1. **Given** a project whose workspace contains at least one agent definition file in a **supported location**, **When** I expand that project’s **Workspaces** tree to the section that holds Cursor artifacts, **Then** I see a dedicated grouping labeled **Agents** (see Terminology) listing each file.
2. **Given** a listed agent definition file, **When** I activate it (e.g. click), **Then** the file opens in the editor the same way other ACE tree leaves open files (ACE does not mutate artifacts from the tree).
3. **Given** a project with **no** agent definition files in supported locations, **When** I view the Cursor section, **Then** the **Agents** subsection is absent **or** shows an explicit empty state—never misleading counts or errors.

---

### User Story 2 - See agent definitions in the Agents view (Priority: P2)

As a developer, I want **the same class of agent definition files** to appear under each **agent root** (e.g. Cursor, Claude, Global) in the **Agents view** sidebar, so user-level and global layouts match what I see for a project.

**Why this priority**: The **Agents view** is where cross-workspace and global context lives; parity with Workspaces avoids two mental models.

**Independent Test**: Configure at least one agent root that contains agent definition files; expand that root; an **Agents** subsection lists files with the same icon treatment as in the Workspaces view; empty roots behave clearly.

**Acceptance Scenarios**:

1. **Given** an agent root directory that contains agent definition files in **supported locations**, **When** I expand that root in the **Agents view** (sidebar), **Then** I see **Commands**, **Skills**, and **Agents** as siblings at the same structural level (alphabetically ordered with **Commands** and **Skills**), with **Agents** listing each file.
2. **Given** an agent root with **no** agent definition files, **When** I expand **Agents**, **Then** I see a clear empty state (consistent with Commands/Skills empty messaging style).

---

### User Story 3 - Refresh reflects disk changes (Priority: P3)

As a developer, I want adding, renaming, or removing agent definition files to be reflected after **refresh** (or the product’s existing refresh behavior), so the tree stays trustworthy.

**Why this priority**: Stale trees erode trust; parity with rules/commands/skills expectations.

**Independent Test**: Add a new `.md` agent file in a supported folder; trigger refresh; the new leaf appears without restarting the IDE.

**Acceptance Scenarios**:

1. **Given** a visible **Agents** list, **When** I add a new supported file on disk and **refresh** the tree, **Then** the new file appears.
2. **Given** a listed file, **When** I remove it on disk and **refresh**, **Then** it no longer appears.

---

### Edge Cases

- **Unsupported or partial layouts**: Only **documented, supported** paths are scanned; unknown layouts do not crash the extension and do not show partial garbage.
- **Large numbers of files**: Lists remain usable (ordering is stable, e.g. alphabetical by display name); performance matches other tree sections for similar counts.
- **Duplicates / naming**: If two files resolve to the same display name, the user can still distinguish them (e.g. path in tooltip or description)—no silent merge.
- **Non-markdown or wrong extension**: Only files that match the agreed **agent definition** pattern for this feature are shown (see assumptions); others are ignored.

## Requirements *(mandatory)*

### Terminology *(canonical)*

- **Agent definition file**: A Markdown file in a **supported agents folder** (per planning) representing a reusable **agent profile** for the IDE. *Not* the same as **`AGENTS.md`** (project constitution at repo root).
- **`AGENTS.md`**: Optional project constitution / operational boundaries file; **not** listed in the Workspaces **Specs** section (that section is only `specs/` and `schemas/`). Scanners may still read it for MCP and other tools.
- **Agents view**: The **sidebar** that lists **agent roots** (Cursor, Claude, Global) and their children. *Capital “Agents” refers only to this view*, not to individual files.
- **Agents** (tree subsection — Workspaces): The **folder node** under **Cursor** (Workspaces) that lists **agent definition files**. MUST be labeled **Agents**. It is distinct from the **Agents view** activity-bar sidebar and from **`AGENTS.md`** at the project root.
- **Agents** (tree subsection — Agents view): When implemented under an **agent root** in the **Agents view**, the folder that lists agent definition files SHOULD use the same labeling and ordering conventions as the Workspaces tree unless UX research dictates otherwise.

### Functional Requirements

- **FR-001**: The product MUST **scan** for **agent definition files** in each **workspace project root** according to **supported location rules** (see Assumptions) and expose them in the **Workspaces** tree under the same **Cursor** branch that already groups commands, rules, and skills, as a subsection labeled **Agents** (see Terminology). Sibling folder nodes under **Cursor** MUST appear in **alphabetical order** by label.
- **FR-002**: The product MUST **scan** for **agent definition files** under each **agent root** used by the **Agents view** (same roots as for commands and skills) and expose them in a subsection labeled **Agents** parallel to **Commands** and **Skills**, with siblings ordered **alphabetically** by label.
- **FR-003**: Each **leaf** representing an agent definition file MUST use a **distinct visual treatment** from commands, skills, and rules—specifically the **agent** icon (or product-standard equivalent) for individual agent files, so users can scan the tree without reading every label.
- **FR-004**: Activating a leaf MUST **open** the underlying file in the editor; the product MUST NOT create, edit, or delete agent files from the tree (**viewer-only**), consistent with ACE’s constitution.
- **FR-005**: When no agent definition files exist for a scope, the UI MUST **not** imply files exist (empty state or hidden section per FR-001/FR-002).
- **FR-006**: **Refresh** (existing command or automatic refresh, if any) MUST re-run discovery so lists match disk after changes.
- **FR-007 (Living specs — tree, scanners, providers)**: The delivery MUST update the living specifications **tree-view**, **scanners**, and **providers** so they describe **agent definition file** discovery, **Agents** subsection placement in both sidebars, icons, refresh behavior, and viewer-only rules—matching shipped behavior.
- **FR-008 (Living specs — MCP)**: The delivery MUST update the **MCP** living specification and related contract/data-model artifacts to reflect **one** of: **(1)** new or extended MCP tool(s) that expose **agent definition files** consistently with this feature, **or** **(2)** an explicit statement that MCP does **not** yet expose agent definitions, with a short rationale and pointer to where humans and agents can find them (sidebar / on-disk layout) until a future release.

### Non-Functional Requirements

- **NFR-001 (Consistency)**: Labels, ordering, and empty-state tone SHOULD align with **Commands** and **Skills** sections in the same tree.

### Assumptions

- **A-001**: **Agent definition files** are **Markdown** files stored in platform-conventional **agents** folders (e.g. under each relevant `.cursor` / agent root), following the same broad conventions Cursor uses for reusable agent definitions—not **`AGENTS.md`** at repo root (constitution file; separate from **Specs** / **Schemas** in the Workspaces tree). Exact glob patterns and depth are **planning** details.
- **A-002**: **MCP tool surface** for agent definitions is **not** assumed either way: **FR-008** requires the **MCP** living spec to document either **new tools** or **explicit deferral** in the same delivery as sidebar support.
- **A-003**: **Claude** and **Global** roots follow the **same** relative folder convention where applicable; if a root has no agents folder, the section is empty or omitted per FR-005.

### Key Entities

- **Agent definition file**: A discoverable Markdown document representing a **named agent profile** (title may come from frontmatter or filename); has a **path**, **display name**, and **scope** (workspace project vs agent root id).
- **Agent root** (existing concept): A user-level or global directory (e.g. Cursor, Claude, Global) that already supplies commands and skills; this feature **adds** agent files under the same roots.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the **Workspaces** view, a user can **open** any discovered agent definition file for the active project in **one** activation action from the tree (no intermediate search dialog).
- **SC-002**: In a usability check, users can **correctly identify** agent definition entries vs command and skill entries **without** reading body text—by visual treatment alone—in a mixed list of at least five items.
- **SC-003**: After creating a new agent definition file in a supported folder, the file appears in the tree within **one refresh cycle** without restarting the application.
- **SC-004**: With **zero** agent definition files present, users see **no false positives** (no leaves that are not agent definitions) and **no** error banners solely due to an empty agents folder.
