# Data Model: Agents View File Watchers

**Date**: 2026-04-11
**Feature**: 007-agents-view-watchers

## Overview

This feature adds no new data entities. It extends the existing watcher infrastructure with six new `vscode.FileSystemWatcher` instances, one per artifact type per new root.

## Watcher Configuration

| Root | Artifact Type | Glob Pattern | Existing? |
|------|--------------|--------------|-----------|
| `~/.cursor` | Commands | `commands/*.md` | ✅ Yes (`setupGlobalCommandsWatcher`) |
| `~/.cursor` | Skills | `skills/*/SKILL.md` | ✅ Yes (`setupGlobalSkillsWatcher`) |
| `~/.cursor` | Agent Defs | `agents/*.md` | ✅ Yes (`setupGlobalAgentsWatcher`) |
| `~/.claude` | Commands | `commands/*.md` | ❌ New |
| `~/.claude` | Skills | `skills/*/SKILL.md` | ❌ New |
| `~/.claude` | Agent Defs | `agents/*.md` | ❌ New |
| `~/.agents` | Commands | `commands/*.md` | ❌ New |
| `~/.agents` | Skills | `skills/*/SKILL.md` | ❌ New |
| `~/.agents` | Agent Defs | `agents/*.md` | ❌ New |

## Watcher Lifecycle

```
activate()
  └── extensionContext stored

ensureDataLoaded() [lazy, on first tree access]
  ├── watchersInitialized guard (runs once)
  ├── setupGlobalCommandsWatcher()       → push to context.subscriptions
  ├── setupGlobalSkillsWatcher()         → push to context.subscriptions
  ├── setupGlobalAgentsWatcher()         → push to context.subscriptions
  ├── setupGlobalClaudeCommandsWatcher()          → push to context.subscriptions [NEW]
  ├── setupGlobalClaudeSkillsWatcher()            → push to context.subscriptions [NEW]
  ├── setupGlobalClaudeAgentDefinitionsWatcher()  → push to context.subscriptions [NEW]
  ├── setupGlobalDotAgentsCommandsWatcher()          → push to context.subscriptions [NEW]
  ├── setupGlobalDotAgentsSkillsWatcher()            → push to context.subscriptions [NEW]
  └── setupGlobalDotAgentsAgentDefinitionsWatcher()  → push to context.subscriptions [NEW]

deactivate()
  └── context.subscriptions disposed automatically (all watchers cleaned up)
```

## Error Handling

Each watcher function returns `vscode.FileSystemWatcher | undefined`. On any error during creation, the function logs and returns `undefined`. The caller in `ensureDataLoaded()` skips `subscriptions.push` for undefined watchers. The extension continues normally without that watcher.
