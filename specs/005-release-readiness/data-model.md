# Data Model: 1.0 Release Readiness

**Feature**: `005-release-readiness` | **Date**: 2026-03-26

This feature is **documentation and manifest hygiene**; “entities” are **release artifacts** and **declared surface**, not runtime domain objects.

## Entities

### ReleaseNotes (CHANGELOG)

| Field | Description |
|-------|-------------|
| `versions` | Ordered list of version sections (e.g. `[Unreleased]`, `1.0.0`) |
| `sections` | Per version: Added / Changed / Fixed / Removed (per Keep a Changelog style) |
| `location` | Repository root: `CHANGELOG.md` |

**Validation rules**:

- `CHANGELOG.md` exists at repo root before tagging 1.0.0.
- `1.0.0` section describes user-visible highlights (docs, dead command removal, README), not internal refactors only.

### UserFacingSurface

| Field | Description |
|-------|-------------|
| `views` | Activity bar container `ace`; views `aceProjects` (Workspaces), `aceAgents` (Agents) |
| `commands` | Set of `ace.*` commands **contributed** in `package.json` |
| `registeredCommands` | Subset actually registered in `activate()` / command modules |
| `documentation` | `README.md`, `AGENTS.md` command table |

**Invariant (FR-003)**:

```text
contributedCommands ⊆ registeredCommands ∪ explicitlyDeprecatedAndDocumented
```

For 1.0.0: **no** contributed command without registration (unless documented deprecation path—not used here).

### ReadinessChecklist

Checklist items are **procedural** (see [quickstart.md](./quickstart.md)); no persistent storage.

## Relationships

- **ReleaseNotes** ↔ **UserFacingSurface**: Changelog entries should mention doc/surface changes that affect users.
- **UserFacingSurface** ↔ **tests**: Integration tests that assert “required commands” must match the contributed set after cleanup.

## State transitions

N/A.
