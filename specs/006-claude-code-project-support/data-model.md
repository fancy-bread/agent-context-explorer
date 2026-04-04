# Data Model: Claude Code Project-Level Artifact Support

**Feature**: 006-claude-code-project-support
**Date**: 2026-04-04 (updated after clarification)

## Entities

### ClaudeMdFile

Represents the `CLAUDE.md` instruction file at the project root.

| Field | Type        | Description              |
|-------|-------------|--------------------------|
| uri   | vscode.Uri  | Absolute file URI        |
| path  | string      | Absolute filesystem path |

**Validation**: File must exist at `{projectRoot}/CLAUDE.md`. No content parsing.

### ClaudeRule

Represents a rule file in `{projectRoot}/.claude/rules/`. Same structure as the existing `Rule` type.

| Field    | Type             | Description                                          |
|----------|------------------|------------------------------------------------------|
| uri      | vscode.Uri       | Absolute file URI                                    |
| metadata | RuleMetadata     | Parsed YAML frontmatter (`description`, `globs`, `alwaysApply`) |
| content  | string           | Raw file content                                     |
| fileName | string           | Basename of the file                                 |

**Validation**: File must be `.md` or `.mdc` in a recursive scan of `{projectRoot}/.claude/rules/`. Same parsing as Cursor rules via `parseRuleFromString`.

### ClaudeCommand

Represents a `.md` file in `{projectRoot}/.claude/commands/`.

| Field    | Type        | Description                      |
|----------|-------------|----------------------------------|
| uri      | vscode.Uri  | Absolute file URI                |
| content  | string      | Raw file content                 |
| fileName | string      | Basename without `.md` extension |

**Validation**: File must be a `.md` file in a flat scan of `{projectRoot}/.claude/commands/`. `README.md` excluded.

### ClaudeSkill

Represents a skill in `{projectRoot}/.claude/skills/`. Same structure as the existing `Skill` type.

| Field    | Type          | Description                                     |
|----------|---------------|-------------------------------------------------|
| uri      | vscode.Uri    | Absolute URI of the `SKILL.md` file             |
| content  | string        | Raw file content                                |
| fileName | string        | Directory name (skill name)                     |
| metadata | SkillMetadata? | Parsed YAML frontmatter (`title`, `overview`, etc.) |

**Validation**: Must be a `SKILL.md` in a direct subdirectory of `{projectRoot}/.claude/skills/`. Same parsing as Cursor skills via `parseSKILLMetadata`.

### ClaudeCodeArtifacts

Aggregates all project-level Claude Code artifacts for a single workspace.

| Field           | Type             | Description                                     |
|-----------------|------------------|-------------------------------------------------|
| claudeMd        | ClaudeMdFile?    | Project-level CLAUDE.md, or undefined if absent |
| rules           | ClaudeRule[]     | Rules from `.claude/rules/`                     |
| commands        | ClaudeCommand[]  | Commands from `.claude/commands/`               |
| skills          | ClaudeSkill[]    | Skills from `.claude/skills/`                   |
| hasAnyArtifacts | boolean          | True if any of the above are present            |

## Scanner Contract

```
ClaudeCodeScanner(workspaceRoot: vscode.Uri)
  scan(): Promise<ClaudeCodeArtifacts>
  watchAll(callback: () => void): vscode.Disposable[]
```

**scan()** performs (all in parallel):
1. Stat check for `{projectRoot}/CLAUDE.md`
2. Recursive scan of `{projectRoot}/.claude/rules/` for `.md` and `.mdc` files — reuses `scanRulesCore(fs, projectRoot, userRoot)` with `.claude/` base
3. Flat scan of `{projectRoot}/.claude/commands/*.md` (excluding README.md)
4. One-level scan of `{projectRoot}/.claude/skills/*/SKILL.md` — reuses `scanSkillsCore(fs, projectRoot, userRoot)` with `.claude/` base

**watchAll()** registers file watchers for:
- `{workspaceRoot}/.claude/rules/**/*.{mdc,md}`
- `{workspaceRoot}/.claude/commands/*.md`
- `{workspaceRoot}/.claude/skills/*/SKILL.md`
- `{workspaceRoot}/CLAUDE.md`

Global `~/.claude/` artifacts are surfaced in the existing Agents view — out of scope for this feature.

## Tree View Extensions

### New tree item category

`'claude-code'` added to `TreeItemCategory` union.

### New tree item context values

| Context value        | Usage                                          |
|----------------------|------------------------------------------------|
| `'claude-md'`        | CLAUDE.md file item (opens file on click)      |
| `'claude-rule'`      | Rule item (opens file on click)                |
| `'claude-command'`   | Command item (opens file on click)             |
| `'claude-skill'`     | Skill item (opens file on click)               |

### Display mapping

| Artifact             | Icon            | Label                    | Description (tooltip)          |
|----------------------|-----------------|--------------------------|-------------------------------|
| Claude Code group    | `symbol-file`   | "Claude Code" + count    | —                             |
| CLAUDE.md            | `file-text`     | "CLAUDE.md"              | —                             |
| Rules group          | `bookmark`      | "Rules" + count          | —                             |
| Rule                 | `bookmark`      | fileName                 | rule.metadata.description      |
| Commands group       | `terminal`      | "Commands" + count       | —                             |
| Command              | `terminal`      | fileName (no .md)        | —                             |
| Skills group         | `play-circle`   | "Skills" + count         | —                             |
| Skill                | `play-circle`   | skill.metadata?.title or fileName | skill.metadata?.overview |
