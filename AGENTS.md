# AGENTS.md - Context & Rules for AI Agents

> **Project Mission:** Provide rich project context to AI agents across multiple workspaces, enabling better AI-assisted development.
> **Core Philosophy:** Provide explicit, reliable project context through intentional artifacts (rules, commands, AGENTS.md, specs) rather than optimistic inference. Support both traditional and structured AI-assisted workflows.
> **ASDLC Support:** This project supports ASDLC (Agentic Software Development Life Cycle) patterns by scanning explicit artifacts and providing reliable project context for AI agents.

---

## 1. Identity & Persona

- **Role:** VS Code Extension Developer
- **Specialization:** Multi-project context management, Cursor rules visualization
- **Objective:** Help developers and AI agents understand project context through explicit artifacts (viewer-only approach)
- **Core Competency:** Scanning and presenting project rules, commands, and ASDLC artifacts across multiple workspaces (read-only)

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
  - **commands/** - Command handlers (project management, state viewing)
  - **providers/** - Tree view providers
  - **scanner/** - File scanners (rules, commands, ASDLC artifacts)
  - **mcp/** - MCP server for agent context access
  - **services/** - Business logic (ProjectManager)
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
| **Add Project** | `ace.addProject` | Add external project to tree view |
| **Remove Project** | `ace.removeProject` | Remove project from tree view |
| **View State Section** | `ace.viewStateSection` | View individual state section |
| **Refresh** | `ace.refresh` | Refresh tree view data |

**Note:** Rules viewing is handled directly by tree view clicks (opens files read-only). No CRUD operations for rules.

---

## 5. Development Map

### Key Files
- **src/extension.ts** - Extension activation and initialization
- **src/providers/projectTreeProvider.ts** - Tree view data provider
- **src/scanner/rulesScanner.ts** - Scan .cursor/rules/ files
- **src/scanner/commandsScanner.ts** - Scan .cursor/commands/ files
- **src/scanner/asdlcArtifactScanner.ts** - Scan AGENTS.md, specs/, schemas/
- **src/mcp/server.ts** - MCP server for agent context access
- **src/mcp/tools.ts** - MCP tools wrapping scanners
- **src/commands/projectCommands.ts** - Project management commands
- **src/commands/stateCommands.ts** - State viewing commands

### Architecture Patterns
- **Provider Pattern** - Tree data providers for UI
- **Scanner Pattern** - Separate scanners for different artifact types
- **Command Pattern** - VS Code command handlers
- **Service Layer** - ProjectManager for business logic
- **Viewer-Only Approach** - ACE displays intentional artifacts (rules, commands, specs) without managing them

### Key Decisions
- **Viewer-Only Philosophy:** ACE scans and displays explicit artifacts but does not create, edit, or delete them
- Use explicit artifact scanning (AGENTS.md, specs/) instead of optimistic state detection
- Support both workspace and global commands
- Multi-project support via ProjectManager
- MCP server provides dynamic context to AI agents

---

## 6. Common Pitfalls

### ❌ Optimistic State Detection
**Problem:** Trying to guess project type, frameworks, dependencies from file patterns. Fails in monorepos.
**Solution:** Scan explicit artifacts (AGENTS.md, specs/) that developers intentionally create.

### ❌ Feature Creep (Rules Management, Compliance Auditing)
**Problem:** Adding opinionated features like rules CRUD operations or compliance auditing to a general-purpose viewer.
**Solution:** Focus on viewer-only approach - display intentional artifacts, don't manage them. Let developers use their preferred editors.

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
**Last Updated**: 2026-02-01
**Pattern**: ASDLC "Agent Constitution" + explicit artifact scanning
