# Agent Context Explorer (ACE)

**Provide rich project context to AI agents across multiple workspaces**

A VS Code extension that helps AI agents understand your projects by visualizing Cursor rules, commands, and ASDLC artifacts in one place. Browse context across multiple codebases and provide comprehensive project intelligence for better AI-assisted development.

*Viewer-only approach: ACE scans and displays intentional artifacts (rules, commands, AGENTS.md, specs) without managing them.*

*Supports ASDLC (Agentic Software Development Life Cycle) workflows for teams adopting structured AI-assisted development practices.*

## Key Features

### **Multi-Project Context Viewing**
- Browse context across multiple projects from a single workspace
- View all `.cursor/rules` files in an organized tree view (read-only)
- View workspace and global Cursor commands
- Browse ASDLC artifacts (AGENTS.md, specs/, schemas/)
- MCP server provides dynamic context to AI agents

### **Viewer-Only Approach**
- ACE **displays** intentional artifacts without creating, editing, or deleting them
- Click rules to open them read-only in your editor
- Use your preferred editor (VS Code, Cursor) to manage rules and commands
- Focus on providing context to AI agents, not file management

### **ASDLC Artifact Browsing**
- Scan and display AGENTS.md (project identity and operational boundaries)
- Browse specs/ directory (living specifications)
- Browse schemas/ directory (JSON schema definitions)
- MCP tools provide artifact access to AI agents

### **Commands Viewing**
- Browse workspace and global Cursor commands in tree view
- Auto-discover commands from `.cursor/commands/` directories
- View command metadata (title, overview, location)
- Commands included in MCP context for AI agents

### **Multi-Project Support**
- Browse multiple projects from a single workspace
- Reference context across different codebases
- MCP server provides context for all configured projects
- Switch between projects easily

## Getting Started

### Installation

1. Install from the VS Code marketplace (search for "Agent Context Explorer")
2. Open a workspace containing a `.cursor/rules` directory
3. The extension will automatically activate and display in the sidebar

### Quick Start

1. **View Rules**: Click the Agent Context Explorer icon in the sidebar to see all your Cursor rules
2. **View Commands**: Expand the Commands section to see workspace and global commands
3. **View ASDLC Artifacts**: Expand the ASDLC section to see AGENTS.md, specs/, schemas/
4. **Click to Open**: Click any rule, command, or artifact to open it read-only in your editor

## Usage Guide

### Viewing Rules

#### **Browsing Rules**
- Click any rule to open it read-only in your editor
- Rules are organized by directory structure
- File icons indicate rule types (security, testing, performance, etc.)
- Rules auto-refresh when files change

#### **Managing Rules**
- Use your preferred editor (VS Code, Cursor) to create, edit, or delete rules
- ACE automatically detects changes and refreshes the tree view
- Rules in `.cursor/rules/` are always-apply rules
- Create subdirectories for organization (e.g., `.cursor/rules/security/`)

### Viewing Commands

The extension automatically discovers and displays Cursor commands from:
- **Workspace commands**: `.cursor/commands/*.md` files in your workspace
- **Global commands**: `~/.cursor/commands/*.md` files (shared across all projects)

#### **Browsing Commands**
- Commands appear in the tree view under the Commands section
- Each command shows its filename, location (workspace/global), title, and overview
- Click any command to open it read-only in your editor

### Viewing ASDLC Artifacts

ACE scans for and displays ASDLC artifacts:

#### **AGENTS.md**
- Project identity, operational boundaries, and command registry
- Provides explicit context to AI agents about the project
- Click to open read-only

#### **Specs (specs/)**
- Living specifications (Blueprint + Contract pattern)
- Each spec defines the "state" of a feature
- Organized by feature domain (e.g., `specs/scanners/spec.md`)

#### **Schemas (schemas/)**
- JSON schema definitions for data models
- Used in Standardized Parts pattern
- Click any schema to view JSON definition

#### **Command Format**
Commands are Markdown files with a title and Overview section:
```markdown
# Command Title

## Overview
Brief description of what this command does.

## Steps
1. Step one
2. Step two
...
```

#### **MCP Context**
When using the MCP server, commands are included with:
- `fileName`: Command filename
- `location`: `"workspace"` or `"global"`
- `title`: Extracted from the first heading
- `overview`: Content from the Overview section

This provides agents with context about available commands and how to use them.

### Project State Detection

The extension automatically analyzes your project to help AI agents understand:

#### **Project Identity**
- **Type**: VS Code extension, web app, CLI tool, library, API server, etc.
- **Language**: Primary programming language and frameworks
- **Purpose**: Extracted from README and package.json
- **Maturity**: Development stage and stability

#### **Dependencies**
Instead of just listing dependencies, the extension explains **why** each one exists:

- **Parsing**: `gray-matter` - Parse YAML frontmatter
- **Testing**: `mocha` - Test runner
- **Build**: `typescript` - Type checking and compilation
- **Critical Path**: Dependencies essential to core functionality

#### **Architecture**
Automatically detects design patterns and structure:

- **Patterns**: Provider Pattern, Command Pattern, Factory Pattern, etc.
- **Style**: Layered, modular, component-oriented, MVC
- **Organization**: Service-oriented, feature-based, src-based
- **Entry Points**: Main application files

#### **Infrastructure**
Identifies your technology stack:

- **Databases**: PostgreSQL, MySQL, MongoDB, Redis, SQLite
- **Message Queues**: RabbitMQ, Kafka, SQS
- **APIs**: REST, GraphQL, gRPC, WebSocket
- **Deployment**: Docker, Kubernetes, cloud platforms

#### **Security**
Analyzes security implementations:

- **Authentication**: JWT, OAuth, Passport, Auth0, Firebase
- **Encryption**: Libraries and patterns used
- **Vulnerability Scanning**: Snyk, Dependabot
- **Secrets Management**: Vault, environment variables

#### **AI Agent Guidance**
Provides context-aware suggestions:

- **Approach**: Best practices for this project type
- **Critical Files**: Files agents should understand first
- **Common Tasks**: Typical development operations
- **Watch-Outs**: Project-specific warnings and gotchas

### Exporting for AI Agents

The Export feature creates a comprehensive JSON file that AI agents can read:

1. Click the **Export** button in the tree view
2. File is saved to `.cursor/ace-export.json`
3. AI agents automatically have access to:
   - All project rules (always-apply and conditional)
   - Workspace and global commands (title and overview)
   - Project identity and capabilities
   - Dependency purposes and critical paths
   - Architecture patterns and design decisions
   - Security configurations
   - Agent guidance and best practices

**What agents learn:**
- What your project is and what it does
- What commands are available and how to use them
- Why dependencies exist (not just that they exist)
- What architecture patterns you're using
- What files are critical to understand
- What to watch out for when making changes

### MCP: Letting Cursor’s AI use ACE tools

ACE includes an MCP server that exposes **tools** (e.g. `list_rules`, `get_rule`, `get_project_context`, `get_asdlc_artifacts`) and **resources** (e.g. `ace://rules`, `ace://agents-md`, `ace://specs`) so an AI can read project context on demand.

To give the AI access to ACE tools (if not using Cursor's Extension API):

1. Create or edit **`.cursor/mcp.json`** in your project (or use **`~/.cursor/mcp.json`** for all workspaces).
2. Add the ACE server (replace `<extension-dir>` with your ACE extension path, e.g. from the Extensions view, and `<workspace-root>` with your project path):
   ```json
   {
     "mcpServers": {
       "ace": {
         "command": "node",
         "args": ["<extension-dir>/out/mcp/server.js", "<workspace-root>"]
       }
     }
   }
   ```
3. Restart Cursor. In chat you can then ask the AI to use ACE (e.g. “What rules does this project have?” or “Use the get_project_context tool”).

**In Cursor:** The extension now also registers via [Cursor's MCP Extension API](https://cursor.com/docs/context/mcp-extension-api) so the chat AI gets ACE tools without editing `mcp.json`. If that API isn't available, use the **Fallback** below.

**Fallback (or non-Cursor):** Add ACE to **`.cursor/mcp.json`** (or **`~/.cursor/mcp.json`**) as in the snippet above. Replace `<extension-dir>` and `<workspace-root>`, then restart Cursor.

### Multi-Project Workflow

#### **Adding Projects**
1. Click the `+` button in the tree view header
2. Choose "Add external project"
3. Select the project directory
4. The project appears in your tree view

#### **Browsing Projects**
- Expand any project to see its rules, commands, and ASDLC artifacts
- Click any artifact to open it read-only
- MCP server provides context for all configured projects

#### **Use Cases**
- Reference shared rules across microservices
- Browse ASDLC artifacts across multiple projects
- Compare specifications between projects
- Provide multi-repo context to AI agents via MCP

## MDC Format

Rules use Cursor's MDC (Markdown with Cursor) format:

```markdown
---
description: Security best practices
globs:
  - "**/*.ts"
  - "**/*.js"
alwaysApply: true
---

# Security Guidelines

Always validate user input before processing...

## File References

You can reference code files:
- Use @service-template.ts for service examples
- Follow patterns in @auth-middleware.ts
```

**Frontmatter fields:**
- `description`: Brief explanation of the rule
- `globs`: File patterns this rule applies to
- `alwaysApply`: Whether rule is always active

## Viewing Project State

### **State Tree View**
Click any state section to see detailed information:

- **Technology Stack**: Languages, frameworks, dependencies
- **Development Environment**: Build tools, testing frameworks, code quality tools
- **Project Structure**: Architecture patterns and configuration files

State detection provides basic project information to help AI agents understand the codebase.

## Tips & Best Practices

### **Organizing Rules**
- Keep always-apply rules in the root `.cursor/rules/` directory
- Group related rules in subdirectories (security, testing, performance)
- Use clear, descriptive filenames
- Add comprehensive descriptions in frontmatter
- Manage rules with your preferred editor (VS Code, Cursor)

### **Writing Effective Rules**
- Be specific about when rules apply (use globs)
- Include examples and code references
- Explain the "why" not just the "what"
- Reference actual files in your project with @filename

### **Using ASDLC Artifacts**
- Create AGENTS.md to provide explicit context to AI agents
- Use specs/ for living specifications (Blueprint + Contract pattern)
- Use schemas/ for JSON schema definitions (Standardized Parts pattern)
- ACE displays these artifacts for easy reference

### **Multi-Project Setup**
- Add related projects for cross-repo context
- MCP server provides context for all configured projects
- Click refresh to update when artifacts change
- Remove stale projects to keep tree view clean

## Troubleshooting

**Rules not appearing?**
- Ensure `.cursor/rules/` directory exists
- Check that files have `.mdc` or `.md` extension
- Click refresh button to force update

**Commands not appearing?**
- Check that `.cursor/commands/` directory exists for workspace commands
- Verify global commands are in `~/.cursor/commands/`
- Ensure command files have `.md` extension
- Click refresh button to force update

**ASDLC artifacts not appearing?**
- Ensure AGENTS.md exists in workspace root
- Check that specs/ directory exists with `spec.md` files
- Check that schemas/ directory exists with `.json` files
- Click refresh button to force update

## Contributing

Found a bug or have a feature request? Please open an issue on GitHub.

## License

MIT License - see LICENSE file for details.
