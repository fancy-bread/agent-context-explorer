# Feature Specification: Agents View MCP Registration

**Feature Branch**: `010-agents-view-mcp`
**Created**: 2026-05-29
**Status**: Draft
**Input**: User description: "Extend the Agents view to surface MCP registration status per agent and provide a startup prompt to register ACE with Claude Code MCP."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View MCP Section in Agents View (Priority: P1)

A developer opens the Agents view and sees an "MCP" section under each agent root, alongside Agents, Commands, and Skills — all four sections in alphabetical order. The MCP section lists all currently registered MCP servers by name as child nodes. Both Claude Code and Cursor sections are read-only.

**Why this priority**: Visibility is the core value — knowing what's registered for each agent without opening config files.

**Independent Test**: Can be fully tested by opening the Agents view and observing the MCP section and its child list under each agent root.

**Acceptance Scenarios**:

1. **Given** Claude Code and Cursor agent roots are both present, **When** the Agents view loads, **Then** both roots display sections in alphabetical order: Agents, Commands, MCP, Skills.
2. **Given** ACE is listed in `~/.claude.json`, **When** the Agents view loads or refreshes, **Then** the Claude Code MCP section lists ACE by name alongside any other registered servers.
3. **Given** no MCP servers are registered for Claude Code, **When** the Agents view loads, **Then** the Claude Code MCP section is empty.
4. **Given** Cursor has servers registered in `~/.cursor/mcp.json`, **When** the Agents view loads, **Then** the Cursor MCP section lists those servers by name.

---

### User Story 2 - Startup Prompt to Register ACE with Claude Code (Priority: P2)

On extension activation, if Claude Code is detected and ACE is not registered in `~/.claude.json` (or the registered path is stale), the extension shows a notification prompt: "Set up ACE for Claude Code MCP?" with "Set up" and "Not now" actions. Clicking "Set up" writes the stdio entry to `~/.claude.json` and the Agents view refreshes to reflect the change.

**Why this priority**: One-time setup via explicit user consent — no permanent UI clutter, no constitution conflict, handles version drift automatically.

**Independent Test**: Can be fully tested by removing the ACE entry from `~/.claude.json`, reloading the extension, and observing the prompt and subsequent registration.

**Acceptance Scenarios**:

1. **Given** ACE is not in `~/.claude.json`, **When** the extension activates and Claude Code is detected, **Then** a notification prompt appears offering "Set up" and "Not now".
2. **Given** the prompt appears and the user clicks "Set up", **When** the write completes, **Then** `~/.claude.json` contains the ACE stdio entry and the Claude Code MCP section reflects the new registration.
3. **Given** the prompt appears and the user clicks "Not now", **Then** no file is written and no further prompt appears for the current session.
4. **Given** ACE is already registered in `~/.claude.json` with the current extension path, **When** the extension activates, **Then** no prompt is shown.
5. **Given** ACE is registered but the path in `~/.claude.json` points to a different (stale) extension version, **When** the extension activates, **Then** the prompt appears offering to update the registration.
6. **Given** the user clicks "Set up" but the file cannot be written, **When** the write fails, **Then** an error notification is shown and `~/.claude.json` is left unchanged.

---

### User Story 3 - Live Refresh After External Config Change (Priority: P3)

A developer manually edits `~/.claude.json` or `~/.cursor/mcp.json` outside of ACE. The Agents view automatically reflects the updated MCP server list without requiring a manual refresh.

**Why this priority**: Consistency with the existing watcher pattern used throughout the Agents view. Prevents stale state confusing the user.

**Independent Test**: Can be fully tested by editing either config file directly and observing the Agents view update.

**Acceptance Scenarios**:

1. **Given** ACE is registered, **When** the ACE entry is removed from `~/.claude.json` externally, **Then** the Claude Code MCP section removes ACE from the list.
2. **Given** ACE is not registered, **When** the ACE entry is added to `~/.claude.json` externally, **Then** the Claude Code MCP section adds ACE to the list.
3. **Given** Cursor has registered servers, **When** `~/.cursor/mcp.json` is modified externally, **Then** the Cursor MCP section reflects the updated list.

---

### Edge Cases

- What happens when `~/.claude.json` or `~/.cursor/mcp.json` contains malformed JSON? The MCP section renders as empty. The tree view must not crash.
- What happens when the startup prompt write fails? Surface an error notification; leave `~/.claude.json` unchanged.
- What happens when multiple workspaces are open? Both config files are global (user-level), so MCP section content is the same regardless of which workspace root is active.
- What happens if Claude Code is not detected on activation (no `~/.claude/` directory)? No prompt is shown.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Agents view MUST display an MCP section under each agent root (Claude Code and Cursor), alongside Agents, Commands, and Skills.
- **FR-002**: All four sections under an agent root MUST appear in alphabetical order: Agents, Commands, MCP, Skills.
- **FR-003**: The Claude Code MCP section MUST list all servers by name as child nodes, read from the top-level `mcpServers` key in `~/.claude.json`. The section is read-only.
- **FR-004**: The Cursor MCP section MUST list all servers by name as child nodes, read from `~/.cursor/mcp.json`. The section is read-only.
- **FR-005**: On extension activation, if the Claude Code agent root is present AND the ACE entry is absent or stale in `~/.claude.json`, the extension MUST show a notification prompt offering "Set up" and "Not now".
- **FR-006**: If the user selects "Set up", the extension MUST write the ACE stdio entry to `~/.claude.json` under `mcpServers`, creating the file if it does not exist, without modifying any other entries.
- **FR-007**: If the user selects "Not now", no file is written and the prompt MUST NOT appear again in the current session.
- **FR-008**: If ACE is already registered with the current extension path, no prompt MUST be shown on activation.
- **FR-009**: The Agents view MUST automatically refresh the Claude Code MCP section when `~/.claude.json` changes (create, modify, or delete).
- **FR-010**: The Agents view MUST automatically refresh the Cursor MCP section when `~/.cursor/mcp.json` changes (create, modify, or delete).
- **FR-011**: If either config file cannot be read or contains malformed JSON, the corresponding MCP section MUST render as empty rather than crashing or hiding the section.
- **FR-012**: If the "Set up" write operation fails, the extension MUST surface an error notification and leave `~/.claude.json` unchanged.

### Key Entities

- **MCP Section**: A read-only collapsible section displayed under each agent root alongside Agents, Commands, and Skills, listing registered MCP servers as named child nodes.
- **MCP Registration**: The presence of an MCP server entry under `mcpServers` in the agent's config file. Claude Code: top-level `mcpServers` in `~/.claude.json`. Cursor: `mcpServers` in `~/.cursor/mcp.json`.
- **Stale Registration**: An ACE entry in `~/.claude.json` whose `args` path does not match the current `context.extensionPath`.
- **Agent Root**: An agent platform instance (Claude Code, Cursor, etc.) displayed as a top-level node in the Agents view.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can see the full MCP server list for both Claude Code and Cursor in under 3 seconds by opening the Agents view — no file inspection required.
- **SC-002**: A developer can register ACE with Claude Code in a single prompt interaction on first activation, with the Agents view confirming the change automatically.
- **SC-003**: External changes to either MCP config file are reflected in the Agents view within 2 seconds.
- **SC-004**: The "Set up" action correctly preserves all pre-existing entries in `~/.claude.json` in 100% of cases.

## Assumptions

- The ACE MCP server command and script path are determinable at activation time from `context.extensionPath`.
- Registration is strictly scoped to adding the ACE server entry. General MCP management is out of scope.
- Only Claude Code and Cursor are in scope for this feature; additional agent platforms will be addressed in future specs.
- The top-level `mcpServers` key in `~/.claude.json` is the authoritative target for Claude Code user-scoped MCP registration; project-scoped and local-scoped entries are out of scope.
- `~/.cursor/mcp.json` is the authoritative source for Cursor's global MCP server list.
- The existing file watcher infrastructure can be extended to watch both `~/.claude.json` and `~/.cursor/mcp.json` without architectural changes.
