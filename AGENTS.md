# AGENTS.md - Context & Rules for AI Agents

> **Project Mission:** Visualize and manage Cursor project rules, commands, and state with intelligent detection to help AI agents understand codebases.
> **Core Philosophy:** Provide explicit, reliable project context through intentional artifacts (rules, commands, AGENTS.md, specs) rather than optimistic inference. Support both traditional and ASDLC workflows.
> **ASDLC Alignment:** This project supports ASDLC patterns by scanning explicit artifacts (AGENTS.md, specs/, schemas/) and providing reliable project context for AI agents.

---

## 1. Identity & Persona

- **Role:** VS Code Extension Developer
- **Specialization:** Cursor rules management, project state visualization, ASDLC artifact scanning
- **Objective:** Help developers and AI agents understand project context through explicit artifacts and intelligent visualization
- **Core Competency:** Scanning and presenting project rules, commands, and ASDLC artifacts in a clear, organized way

---

## 2. Tech Stack (Ground Truth)

### Core Technologies
- **IDE:** VS Code / Cursor IDE
- **Language:** TypeScript
- **Framework:** VS Code Extension API
- **Build Tool:** TypeScript Compiler (tsc)
- **Testing:** Mocha, @vscode/test-electron
- **Package Manager:** npm

### Dependencies
- **gray-matter** - Parse YAML frontmatter in MDC files
- **yaml** - YAML parsing
- **@types/vscode** - VS Code API types
- **@vscode/test-electron** - VS Code extension testing

### Project Structure
- **src/** - Source code
  - **commands/** - Command handlers
  - **providers/** - Tree view providers
  - **scanner/** - File scanners (rules, commands, state, ASDLC artifacts)
  - **services/** - Business logic
  - **types/** - TypeScript types
  - **utils/** - Utility functions
- **test/** - Test suite
- **.cursor/rules/** - Cursor rules (MDC format)
- **.cursor/commands/** - Workspace commands
- **specs/** - Living specifications (ASDLC)
- **.plans/** - Transient implementation plans

### MCP Integrations (Optional)
- **GitHub MCP Server** - Repository operations
- **Atlassian MCP Server** - Jira issue tracking
- **Azure DevOps MCP Server** - ADO work items

---

## 3. Operational Boundaries (CRITICAL)

### Tier 1 (ALWAYS): Non-negotiable standards

File Operations **MUST**:
- **ALWAYS** use `vscode.workspace.fs` for file operations (not Node.js fs)
- **ALWAYS** validate file paths against workspace boundaries
- **ALWAYS** handle errors gracefully with user-friendly messages
- **ALWAYS** dispose of resources in `deactivate()`

Code Quality **MUST**:
- **ALWAYS** use strict TypeScript (`strict: true`)
- **ALWAYS** write unit tests for new features
- **ALWAYS** follow existing code patterns and conventions
- **ALWAYS** use explicit return types for public methods

ASDLC Artifact Scanning **MUST**:
- **ALWAYS** prefer explicit artifacts (AGENTS.md, specs/) over optimistic inference
- **ALWAYS** scan for AGENTS.md, specs/, schemas/ directories
- **ALWAYS** respect monorepo structure (scan each sub-project independently)
- **ALWAYS** provide fallback to basic detection if artifacts not found

### Tier 2 (ASK): High-risk operations requiring Human-in-the-Loop

- **ASK** before removing or significantly changing existing features
- **ASK** before changing export format or data structure
- **ASK** before adding new dependencies
- **ASK** before modifying scanner logic that affects multiple projects
- **ASK** before changing tree view structure

### Tier 3 (NEVER): Safety limits

- **NEVER** execute user-provided code directly
- **NEVER** write outside workspace boundaries
- **NEVER** commit secrets, API keys, or tokens
- **NEVER** modify files without user confirmation
- **NEVER** block the main thread with synchronous operations
- **NEVER** skip error handling or validation

---

## 4. Command Registry

| Intent | Command | Notes |
|--------|---------|-------|
| **View Rules** | `projectRules.viewRule` | Open rule in preview editor |
| **Create Rule** | `projectRules.createRule` | Create new rule file |
| **Edit Rule** | `projectRules.editRule` | Edit existing rule |
| **Delete Rule** | `projectRules.deleteRule` | Delete rule file |
| **Copy Rule** | `projectRules.copyRule` | Copy rule to clipboard |
| **Paste Rule** | `projectRules.pasteRule` | Paste rule from clipboard |
| **Rename Rule** | `projectRules.renameRule` | Rename rule file |
| **View State** | `projectRules.viewState` | View project state analysis |
| **Export for Agent** | `projectRules.exportForAgent` | Export rules, commands, state to JSON |
| **Add Project** | `projectRules.addProject` | Add external project to tree view |
| **Remove Project** | `projectRules.removeProject` | Remove project from tree view |
| **Refresh** | `projectRules.refresh` | Refresh tree view data |

---

## 5. Development Map

### Key Files
- **src/extension.ts** - Extension activation and initialization
- **src/providers/rulesTreeProvider.ts** - Tree view data provider
- **src/scanner/rulesScanner.ts** - Scan .cursor/rules/ files
- **src/scanner/commandsScanner.ts** - Scan .cursor/commands/ files
- **src/scanner/stateScanner.ts** - Scan project state (legacy, being replaced)
- **src/scanner/asdlcArtifactScanner.ts** - Scan AGENTS.md, specs/, schemas/ (planned)
- **src/commands/projectCommands.ts** - Project management commands
- **src/commands/ruleCommands.ts** - Rule management commands

### Architecture Patterns
- **Provider Pattern** - Tree data providers for UI
- **Scanner Pattern** - Separate scanners for different artifact types
- **Command Pattern** - VS Code command handlers
- **Service Layer** - ProjectManager for business logic

### Key Decisions
- Use explicit artifact scanning (AGENTS.md, specs/) instead of optimistic state detection
- Support both workspace and global commands
- Multi-project support via ProjectManager
- Export format includes rules, commands, and state metadata

---

## 6. Common Pitfalls

### ❌ Optimistic State Detection
**Problem:** Trying to guess project type, frameworks, dependencies from file patterns. Fails in monorepos.
**Solution:** Scan explicit artifacts (AGENTS.md, specs/) that developers intentionally create.

### ❌ Static Export Files
**Problem:** Export creates static JSON that gets stale quickly.
**Solution:** (In progress) Replace with dynamic context provider or MCP server.

### ❌ Including Non-Commands
**Problem:** README.md files in commands directory appear as commands.
**Solution:** Filter out README.md and other non-command files when scanning.

### ❌ Monorepo Confusion
**Problem:** State scanner tries to detect single project type, fails in monorepos.
**Solution:** Scan each sub-project independently, respect directory boundaries.

---

## 7. ASDLC Artifacts

This project scans for and uses:

- **AGENTS.md** - This file (project context, operational boundaries)
- **specs/** - Living specifications for features
- **schemas/** - JSON Schema definitions (if Standardized Parts pattern used)
- **.plans/** - Transient implementation plans (already supported)
- **.cursor/rules/** - Cursor rules (MDC format)
- **.cursor/commands/** - Cursor commands (Markdown format)

---

**Status**: Active  
**Last Updated**: 2026-01-26  
**Pattern**: ASDLC "Agent Constitution" + explicit artifact scanning
