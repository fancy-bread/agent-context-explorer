# Project Rules Explorer

**Visualize and manage Cursor project rules with intelligent state detection**

A VS Code extension that provides a comprehensive view of your Cursor rules and automatically analyzes your project structure, dependencies, and architecture to help AI agents better understand your codebase.

## Key Features

### **Rules Management**
- Browse all `.cursor/rules` files in an organized tree view
- Create, edit, and delete rules with a visual interface
- Copy and paste rules between projects
- Auto-refresh when files change
- Markdown preview with syntax highlighting

### **Intelligent State Detection**
- Automatically analyzes your project's architecture and patterns
- Detects dependencies and explains their purpose
- Identifies frameworks, databases, and infrastructure
- Provides AI-optimized project insights
- Exports comprehensive project context for agents

### **Commands Management**
- Browse workspace and global Cursor commands in tree view
- Auto-discover commands from `.cursor/commands/` directories
- View command metadata (title, overview, location)
- Commands included in agent exports for complete context

### **Multi-Project Support**
- Manage multiple projects from a single workspace
- Reference rules across different codebases
- Export all projects, rules, and commands together
- Switch between projects easily

## Getting Started

### Installation

1. Install from the VS Code marketplace (search for "Project Rules Explorer")
2. Open a workspace containing a `.cursor/rules` directory
3. The extension will automatically activate and display in the sidebar

### Quick Start

1. **View Rules**: Click the Project Rules icon in the sidebar to see all your Cursor rules
2. **View Commands**: Expand the Commands section to see workspace and global commands
3. **Create a Rule**: Click the `+` button or right-click in the Rules section
4. **Export for Agents**: Click the Export button to generate `.cursor/project-rules-export.json`

## Usage Guide

### Managing Rules

#### **Viewing Rules**
- Click any rule to open it in a markdown preview
- Rules are organized by directory structure
- File icons indicate rule types (security, testing, performance, etc.)

#### **Creating Rules**
1. Click the `+` button in the Rules section
2. Enter a filename (e.g., `testing.mdc`)
3. The rule file is created with basic frontmatter
4. Edit the rule content and save

#### **Editing Rules**
- Click a rule to view it
- Click the edit icon to modify
- Use the context menu for more options (copy, rename, delete)

#### **Organizing Rules**
- Rules in `.cursor/rules/` are always-apply rules
- Create subdirectories for organization (e.g., `.cursor/rules/security/`)
- Use file references like `@service-template.ts` in rule content

### Commands Management

The extension automatically discovers and displays Cursor commands from:
- **Workspace commands**: `.cursor/commands/*.md` files in your workspace
- **Global commands**: `~/.cursor/commands/*.md` files (shared across all projects)

#### **Viewing Commands**
- Commands appear in the tree view under the Commands section
- Each command shows its filename, location (workspace/global), title, and overview
- Click any command to see its details

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

#### **Commands in Exports**
When exporting for AI agents, commands are included with:
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
2. File is saved to `.cursor/project-rules-export.json`
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

### Multi-Project Workflow

#### **Adding Projects**
1. Click the `+` button in the tree view header
2. Choose "Add external project" or "Add current workspace"
3. Select the project directory
4. The project appears in your tree view

#### **Managing Projects**
- Expand any project to see its rules and state
- Edit or remove projects using context menu
- Export all projects together for cross-project context

#### **Use Cases**
- Reference shared rules across microservices
- Maintain consistent standards across teams
- Compare architectures between projects
- Export multi-repo context for agents

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

- **Project Identity**: Type, domain, language, maturity
- **Capabilities**: Features and data formats
- **Dependencies by Purpose**: Categorized with explanations
- **Architecture**: Patterns, style, entry points
- **VS Code Platform**: Extension-specific details (if applicable)
- **Agent Guidance**: Best practices and warnings
- **Technology Stack**: Languages and frameworks
- **Development Environment**: Build, test, quality tools
- **Project Structure**: Architecture and configuration

### **View State Command**
Run "Project Rules: View State" from the command palette to see a comprehensive markdown report of all project analysis.

## Tips & Best practices

### **Organizing Rules**
- Keep always-apply rules in the root `.cursor/rules/` directory
- Group related rules in subdirectories (security, testing, performance)
- Use clear, descriptive filenames
- Add comprehensive descriptions in frontmatter

### **Writing Effective Rules**
- Be specific about when rules apply (use globs)
- Include examples and code references
- Explain the "why" not just the "what"
- Reference actual files in your project with @filename

### **Using State Detection**
- Export before starting major refactors
- Share exports when onboarding new team members
- Use agent guidance to understand critical paths
- Review architecture patterns for consistency

### **Multi-Project Setup**
- Add related projects for cross-repo context
- Export all projects for full system understanding
- Update projects when dependencies change
- Remove stale projects to keep exports clean

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

**State detection incomplete?**
- Run "Project Rules: Scan Project State" command
- Ensure package.json exists for dependency analysis
- Check that project structure follows conventions

**Export not working?**
- Verify workspace has write permissions
- Check `.cursor/` directory exists
- Look for errors in Output panel (View → Output → Project Rules Explorer)

## Contributing

Found a bug or have a feature request? Please open an issue on GitHub.

## License

MIT License - see LICENSE file for details.
