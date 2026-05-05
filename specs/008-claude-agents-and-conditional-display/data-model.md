# Data Model: Claude Project Agents + Conditional Platform Display

**Feature**: 008-claude-agents-and-conditional-display
**Date**: 2026-05-04

---

## Changed Types

### `CoreClaudeCodeArtifacts` (`src/scanner/core/scanClaudeCodeCore.ts`)

```typescript
export interface CoreClaudeCodeArtifacts {
    claudeMdPath: string | undefined;
    rules: CoreRule[];
    commands: CoreCommand[];
    skills: CoreSkill[];
    agentDefinitions: CoreAgentDefinition[];  // NEW
    claudeFolderExists: boolean;              // NEW
    hasAnyArtifacts: boolean;
}

// NEW — minimal agent definition shape (same as CoreCommand, no frontmatter)
export interface CoreAgentDefinition {
    path: string;
    fileName: string;
    content: string;
}
```

**Validation rules**: `agentDefinitions` is always an array (empty when directory absent or no `.md` files). `claudeFolderExists` is `true` iff `{projectRoot}/.claude` is a directory; false on stat error or non-directory.

### `ClaudeCodeArtifacts` (`src/scanner/claudeCodeScanner.ts`)

```typescript
export interface ClaudeCodeArtifacts {
    claudeMd: ClaudeMdFile | undefined;
    rules: Rule[];
    commands: Command[];
    skills: Skill[];
    agentDefinitions: AgentDefinition[];  // NEW
    claudeFolderExists: boolean;          // NEW
    hasAnyArtifacts: boolean;             // unchanged
}
```

### Project data map (in `extension.ts` and `projectTreeProvider.ts` constructor type)

```typescript
{
    rules: Rule[];
    state: ProjectState;
    commands: Command[];
    globalCommands: Command[];
    skills: Skill[];
    globalSkills: Skill[];
    agentDefinitions: AgentDefinition[];
    asdlcArtifacts: AsdlcArtifacts;
    claudeCodeArtifacts?: ClaudeCodeArtifacts;
    cursorFolderExists: boolean;  // NEW
}
```

### `ProjectTreeItem.category` union (`src/providers/projectTreeProvider.ts`)

```typescript
category?: 'rules' | 'state' | 'projects' | 'ruleType' | 'commands'
    | 'cursor' | 'agents' | 'skills'
    | 'specs'
    | 'agent-definitions' | 'agent-definition'
    | 'claude-code' | 'claude-md' | 'claude-rule' | 'claude-command' | 'claude-skill'
    | 'claude-rules' | 'claude-commands' | 'claude-skills'
    | 'claude-agent-definitions' | 'claude-agent-definition';  // NEW
```

Also add to `ProjectTreeItem`:
```typescript
claudeAgentDefinitionData?: AgentDefinition;  // NEW
```

---

## Section Visibility Logic (Workspaces tree)

| Platform section | Visible when | Hidden when |
|-----------------|--------------|-------------|
| Cursor | `cursorFolderExists === true` | `.cursor/` absent |
| Claude Code | `claudeFolderExists === true` | `.claude/` absent |
| Specs | `specs.length > 0` (unchanged) | no `specs/*/spec.md` |

**Key invariant**: Folder existence is the gate, not artifact presence. An empty `.cursor/` folder shows the Cursor section with empty subsections; `.cursor/` absent hides the section entirely.

---

## Tree Shape: Claude Code section (after this feature)

```text
Project
├── Claude Code                          ← shown if .claude/ exists
│   ├── CLAUDE.md                        ← if file present
│   ├── Agents (hubot icon, N agents)    ← NEW — .claude/agents/*.md
│   │   ├── my-agent.md                  ← opens file on click
│   │   └── ...
│   ├── Commands (terminal icon)
│   │   └── ...
│   ├── Rules (bookmark icon)
│   │   └── ...
│   └── Skills (play-circle icon)
│       └── ...
├── Cursor                               ← shown if .cursor/ exists
│   ├── Agents (hubot icon)
│   ├── Commands (terminal icon)
│   ├── Rules (bookmark icon)
│   └── Skills (play-circle icon)
└── Specs (library icon, if specs/ present)
    └── ...
```

Subsections within Claude Code (Rules, Commands, Skills, Agents) are sorted alphabetically by label — same as Cursor. CLAUDE.md is a direct leaf (not a group) and sorts before the group nodes because it's rendered first unconditionally when present.

---

## Watcher coverage (`.claude/agents/*.md` — project level)

Added to `ClaudeCodeScanner.watchAll()`:
```typescript
'.claude/agents/*.md'   // NEW pattern
```

This runs via `vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspaceRoot, pattern))` — same as existing Claude patterns in `watchAll()`. No new watcher registration in `extension.ts` needed; `claudeCodeScanner.watchAll()` is already called in `ensureDataLoaded()`.
