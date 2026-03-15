# Research: MCP Server Integration

## Problem Understanding

- AI agents need dynamic, on-demand access to project context (rules, commands, skills, ASDLC artifacts) across multiple projects.
- Static JSON exports become stale quickly and are awkward to manage in multi-project environments.
- MCP provides a standardized protocol for exposing context as tools without expanding ACE’s responsibilities beyond viewing and scanning.

## Existing Context

- ACE already has robust scanners for rules, commands, skills, and ASDLC artifacts.
- MCP is already partially integrated into the extension, but this feature formalizes the tools-only contract and multi-project behavior.
- AGENTS.md and the MCP spec (`specs/mcp/spec.md`) define the desired surface area and invariants.

## Alternatives Considered

1. **Static export files (JSON)**
   - Pros: Simple to reason about; easy to inspect.
   - Cons: Stale data, manual regeneration, poor fit for multi-project setups.

2. **MCP resources (`ace://` URIs) plus tools**
   - Pros: Familiar URI model for agents.
   - Cons: Duplicates the tools surface; increases complexity; easier to drift from one true contract.

3. **Tools-only MCP surface (chosen)**
   - Pros: Single, clear contract for agents; avoids duplication; aligns with thin-adapter principle.
   - Cons: Requires well-designed tool schemas and types.

## Risks and Open Questions

- Ensuring multi-project behavior is intuitive and well-documented for agents using `projectKey`.
- Maintaining strict separation between scanners (business logic) and MCP layer (protocol adapter).
- Keeping type definitions in sync between scanners, MCP, and tests as the project evolves.

