# Data Model: MCP Server Integration

## Overview

The MCP layer exposes ACE scanners as typed tools. This document captures the key input/output structures so tools remain stable and agent-friendly. Tool JSON schemas use optional **`projectKey`** (final path segment; use `list_projects` to discover keys). TypeScript bridge types may use `projectPath` internally; agents should pass **`projectKey`**.

## Core Types

### ProjectInfo

- `projectKey: string` — Short identifier (final directory segment of project path).
- `path: string` — Absolute project path on disk.
- `label?: string` — Human-friendly label where needed.

### Rule Types

- `RuleInfo`
  - `name: string`
  - `description?: string`
  - `type: string` (e.g., "security", "project-specific")
  - `path: string`
  - `globs?: string[]`

- `RuleContent`
  - All fields from `RuleInfo`
  - `content: string`

### Command Types

- `CommandInfo`
  - `name: string`
  - `title?: string`
  - `path: string`
  - `location: "workspace" | "global"`

- `CommandContent`
  - All fields from `CommandInfo`
  - `content: string`

### Skill Types

- `SkillInfo`
  - `name: string`
  - `title?: string`
  - `path: string`
  - `location: "workspace" | "global"`

- `SkillContent`
  - All fields from `SkillInfo`
  - `content: string`
  - `metadata?` — prerequisites, steps, tools (from SKILL.md)

### Agent definition types

- `AgentDefinitionInfo` (`list_agents`)
  - `name: string` — file stem / resolver key
  - `displayName: string`
  - `path: string`
  - `location: "workspace" | "cursor" | "claude" | "global"` — where the file was discovered

- `AgentDefinitionContent` (`get_agent`)
  - All fields from `AgentDefinitionInfo`
  - `content: string`

### Spec types

- `SpecFile` (`list_specs`) — aligns with scanner `SpecFile`
  - `domain: string` — folder under `specs/` (e.g. `mcp`, `scanners`)
  - `path: string`
  - `hasBlueprint: boolean`
  - `hasContract: boolean`
  - `lastModified?: string`

- `SpecContent` (`get_spec`)
  - `domain: string`
  - `path: string`
  - `hasBlueprint: boolean`
  - `hasContract: boolean`
  - `lastModified?: string`
  - `content: string` — full `spec.md` body

### ASDLC Artifacts

- `AsdlcArtifacts` — full scanner shape (nested `specs` / `schemas` info)
  - `agentsMd` — `AgentsMdInfo` (exists flag, path, sections, etc.)
  - `specs` — `SpecsInfo` with `specs: SpecFile[]`
  - `schemas` — `SchemasInfo`
  - `hasAnyArtifacts: boolean`

### ProjectContext

`get_project` returns a snapshot:

- `projectPath: string`
- `rules: RuleInfo[]`
- `commands: CommandInfo[]`
- `skills: SkillInfo[]`
- `agentDefinitions: AgentDefinitionInfo[]`
- `asdlcArtifacts: AsdlcArtifacts` (wire payloads may use a trimmed shape for agentsMd/specs/schemas metadata)
- `timestamp: string`
- `projectKey?: string` — present in **standalone** stdio server responses when the project was resolved from `list_projects`; extension bridge may omit it (path remains authoritative)

## Tool Inputs

- `list_projects` — Input: none. Output: `ProjectInfo[]`.

- `list_rules`, `list_commands`, `list_skills`, `list_agents`, `list_specs`, `get_project`
  - Input: `{ projectKey?: string }`

- `get_rule`, `get_command`, `get_skill`, `get_agent`, `get_spec`
  - Input: `{ name: string; projectKey?: string }`
  - `get_spec.name`: spec domain (as from `list_specs`) or path fragment for resolution

## Invariants

- All tool outputs are JSON-serializable and flatten internal VS Code / URI types.
- Errors are represented as `{ isError: true, message: string }` instead of thrown exceptions.
- Missing artifacts return empty arrays or `null` rather than errors (see spec guardrails).
