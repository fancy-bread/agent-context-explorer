# Data Model: MCP Server Integration

## Overview

The MCP layer exposes ACE scanners as typed tools. This document captures the key input/output structures so tools remain stable and agent-friendly.

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

### ASDLC Artifacts

- `AsdlcArtifacts`
  - `agentsMd?: { path: string; content: string }`
  - `specs: SpecFile[]`
  - `schemas?: { path: string; content: string }[]`

- `SpecFile`
  - `name: string`
  - `path: string`
  - `summary?: string`

### ProjectContext

- `ProjectContext`
  - `projectKey: string`
  - `projectPath: string`
  - `rules: RuleInfo[]`
  - `commands: CommandInfo[]`
  - `skills: SkillInfo[]`
  - `asdlc: AsdlcArtifacts`
  - `timestamp: string`

## Tool Inputs

- `list_projects`
  - Input: none
  - Output: `ProjectInfo[]`

- `list_rules`, `list_commands`, `list_skills`, `list_agents`, `get_agent`, `list_specs`, `get_spec`, `get_project`
  - Input: `{ projectKey?: string }`

- `get_rule`, `get_command`, `get_skill`
  - Input: `{ name: string; projectKey?: string }`

## Invariants

- All tool outputs are JSON-serializable and flatten internal VS Code / URI types.
- Errors are represented as `{ isError: true, message: string }` instead of thrown exceptions.
- Missing artifacts return empty arrays or `null` rather than errors (see spec guardrails).

