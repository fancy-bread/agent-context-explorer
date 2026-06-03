# Data Model: Agents View MCP Registration

## Modified: `AgentRootDefinition`

File: `src/providers/agentsTreeProvider.ts`

```typescript
export interface AgentRootDefinition {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  commands: Command[];
  skills: Skill[];
  agentDefinitions: AgentDefinition[];
  // New field:
  mcpServers: string[];   // server names from the agent's MCP config; empty if config absent/malformed
}
```

`mcpServers` is a flat list of server names (keys from `mcpServers` in the config file). The tree view is read-only — no action flags needed.

---

## New: `McpRegistrationScanner`

File: `src/scanner/mcpRegistrationScanner.ts`

Reads a JSON config file and returns the list of registered MCP server names.

```typescript
export class McpRegistrationScanner {
  constructor(private configPath: string) {}

  /**
   * Returns server names from mcpServers key.
   * Returns [] on missing file or parse error — never throws.
   */
  async scanServerNames(): Promise<string[]>;
}
```

Used for both `~/.claude.json` (top-level `mcpServers`) and `~/.cursor/mcp.json`.

---

## New: `McpRegistrationService`

File: `src/services/mcpRegistrationService.ts`

Checks ACE registration state and writes the entry when the user consents.

```typescript
export class McpRegistrationService {
  constructor(private claudeJsonPath: string, private extensionPath: string) {}

  /**
   * Returns true if ~/.claude.json contains an ACE entry with the current extensionPath.
   * Returns false if absent, malformed, or path is stale.
   */
  async isRegistered(): Promise<boolean>;

  /**
   * Adds or updates the ACE stdio entry in ~/.claude.json under mcpServers.
   * Preserves all other keys. Creates the file if absent.
   * Throws on write failure.
   */
  async register(): Promise<void>;

  /**
   * Shows the activation prompt if not registered. Call once after activation.
   * Writes on user consent; silently dismisses on "Not now".
   * Session-scoped: will not re-prompt if dismissed.
   */
  async promptIfNeeded(): Promise<void>;
}
```

The entry written:
```json
{
  "type": "stdio",
  "command": "node",
  "args": ["<extensionPath>/out/mcp/server.js"]
}
```

---

## Tree Node Shape (new nodes)

### MCP section node (`contextValue: 'agent-mcp'`)

| Property | Value |
|----------|-------|
| `label` | `'MCP'` |
| `collapsibleState` | `Collapsed` if servers > 0, else `None` |
| `iconPath` | `ThemeIcon('plug')` |
| `description` | `'{n} servers'` |
| `agentRootId` | inherited from parent |
| `agentSection` | `'mcp'` |

No inline action. No `contextValue` variant for add state.

### MCP server leaf node (`contextValue: 'mcp-server'`)

| Property | Value |
|----------|-------|
| `label` | server name (e.g. `'github'`, `'agent-context-explorer'`) |
| `collapsibleState` | `None` |
| `iconPath` | `ThemeIcon('plug')` |
| `contextValue` | `'mcp-server'` |
