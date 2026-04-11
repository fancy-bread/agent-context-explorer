# Quickstart: Agents View File Watchers

**Date**: 2026-04-11
**Feature**: 007-agents-view-watchers

## Verifying the Feature

### Prerequisites

- Extension built and loaded in VS Code/Cursor development host
- At least one of `~/.claude/` or `~/.agents/` present (or create them)

### Test: Claude Commands Watcher

```bash
# 1. Open the Agents view in the extension
# 2. Expand the Claude root — note current command count

# 3. Add a new command file
echo "# My New Command" > ~/.claude/commands/my-new-command.md

# 4. Within 3 seconds, verify the new command appears in the Claude root
# 5. Delete the file
rm ~/.claude/commands/my-new-command.md

# 6. Within 3 seconds, verify it disappears from the Claude root
```

### Test: Claude Skills Watcher

```bash
mkdir -p ~/.claude/skills/my-test-skill
echo "# My Test Skill" > ~/.claude/skills/my-test-skill/SKILL.md
# Verify the skill appears in Claude root within 3 seconds

rm -rf ~/.claude/skills/my-test-skill
# Verify it disappears
```

### Test: Global (`.agents`) Commands Watcher

```bash
mkdir -p ~/.agents/commands
echo "# Global Command" > ~/.agents/commands/global-cmd.md
# Verify it appears under the Global root within 3 seconds

rm ~/.agents/commands/global-cmd.md
# Verify it disappears
```

### Test: No Regression (Cursor)

```bash
echo "# Cursor Command" > ~/.cursor/commands/test-cmd.md
# Verify it appears under the Cursor root within 3 seconds

rm ~/.cursor/commands/test-cmd.md
```

### Test: Missing Directory Graceful Handling

```bash
# Temporarily rename ~/.claude to test graceful skip
mv ~/.claude ~/.claude_backup
# Reload extension — should activate without errors
# Restore
mv ~/.claude_backup ~/.claude
```

## Running Automated Tests

```bash
# Unit tests (fast)
npm run test:unit

# Full integration suite (requires VS Code)
npm test
```

## Key Files

- `src/extension.ts` — `setupGlobalClaude*Watcher()` and `setupGlobalDotAgents*Watcher()` functions
- `test/suite/integration/fileWatcherSetup.test.ts` — integration tests for watcher patterns
