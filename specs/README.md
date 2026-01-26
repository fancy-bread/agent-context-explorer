# Specs: Living Specifications

> **ASDLC Pattern**: [The Spec](https://asdlc.io/patterns/the-spec/)  
> **Practice Guide**: [Living Specs](https://asdlc.io/practices/living-specs/)

This directory contains **permanent living specifications** for features. Specs define the current state of features and evolve alongside code.

---

## Specs vs Plans

| Aspect | Specs (`specs/`) | Plans (`.plans/`) |
|--------|------------------|-------------------|
| **Purpose** | Permanent source of truth for features | Transient PBI planning documents |
| **Lifecycle** | Lives with code, evolves continuously | Created for task, discarded after merge |
| **Structure** | Blueprint + Contract | Implementation steps |
| **Scope** | Feature-level (not ticket-level) | Task-level (ticket-specific) |
| **Location** | `specs/{feature}/spec.md` | `.plans/{TASK_KEY}-*.plan.md` |

**Rule**: Specs define State (how it works). Plans define Delta (what changes).

---

## Spec Template

Copy from **`specs/TEMPLATE.md`** when creating a new spec. The template includes Blueprint (Context, Architecture, Anti-Patterns — the "why" and "how"), Contract (Definition of Done, Regression Guardrails, Scenarios — the "what" and verification), Gherkin-style scenario examples, and brief purpose lines for each section. See `specs/TEMPLATE.md` for the full template, placeholders, and section guidance.

---

## When to Create a Spec

Create a spec when starting work that involves:

✅ **Feature Domains** — New functionality that introduces architectural patterns, API contracts, or data models that other parts of the system depend on.

✅ **User-Facing Workflows** — Features with defined user journeys and acceptance criteria that need preservation for future reference.

✅ **Cross-Team Dependencies** — Any feature that other teams will integrate with, requiring clear contract definitions.

❌ **Don't create specs for**: Simple bug fixes, trivial UI changes, configuration updates, or dependency bumps.

---

## When to Update a Spec

**Golden Rule**: If code changes behavior or contracts → update Spec in the **same commit**.

Update when:
- ✅ API contracts change (new endpoints, modified payloads, deprecated routes)
- ✅ Data schemas evolve (migrations, new fields, constraint changes)
- ✅ Quality targets shift (performance, security, accessibility requirements)
- ✅ Anti-patterns are discovered (during review or post-mortems)
- ✅ Architecture decisions are made (any ADR should update relevant specs)

Don't update for:
- ❌ Bug fixes that don't change behavior
- ❌ Refactoring that preserves contracts
- ❌ Internal implementation details
- ❌ Trivial changes (formatting, comments)

---

## Same-Commit Rule

Specs are versioned with code. When you commit code that changes behavior, update the Spec in the same commit.

**Example commit:**
```bash
git commit -m "feat: add ASDLC artifact scanning

- Implements AGENTS.md and specs/ scanning
- Updates specs/asdlc-artifact-scanner/spec.md with new architecture"
```

Both `src/scanner/asdlcArtifactScanner.ts` AND `specs/asdlc-artifact-scanner/spec.md` are committed together.

---

## File Structure

Organize specs by **feature domain**, not by sprint or ticket number.

```
specs/
├── README.md                    # This file
├── asdlc-artifact-scanner/
│   └── spec.md                 # ASDLC artifact scanning feature spec
├── rules-management/
│   └── spec.md                 # Rules management feature spec
└── project-state/
    └── spec.md                 # Project state detection spec
```

**Conventions:**
- Directory name: `kebab-case`, matches the feature's conceptual name
- File name: Always `spec.md`
- Location: `specs/{feature-domain}/spec.md`
- Scope: One spec per independently evolvable feature

---

## Maintenance Protocol

### 1. Same-Commit Rule (Repeated for Emphasis)
If code changes behavior, update the spec in the same commit.

### 2. Deprecation Over Deletion
Mark outdated sections as deprecated rather than removing them. This preserves historical context.

```markdown
### Architecture

**[DEPRECATED 2024-12-01]**
~~Optimistic state detection via file pattern matching~~
Replaced by explicit artifact scanning (AGENTS.md, specs/) for reliability.

**Current:**
Scan AGENTS.md, specs/, schemas/ directories for explicit project context.
```

### 3. Bidirectional Linking
Link code to specs and specs to code:

**In code:**
```typescript
// ASDLC artifact scanning must respect monorepo structure
// See: specs/asdlc-artifact-scanner/spec.md#contract
```

**In spec:**
```markdown
### Data Model
Implemented in `src/scanner/asdlcArtifactScanner.ts` using VS Code file system API.
```

---

## Spec Granularity

A spec should be detailed enough to serve as a contract for the feature, but not so detailed that it becomes a maintenance burden.

**Balance**:
- ✅ Include: API contracts, data schemas, quality targets, anti-patterns
- ❌ Avoid: Step-by-step implementation details, code snippets, exhaustive examples

Some spec features (like Gherkin scenarios) are not always necessary if the feature is simple or well-understood.

---

## Why Specs Matter (for Agents)

**Problem**: Agents don't have long-term memory. 6 months from now, when an agent needs to modify a feature:
- The Jira ticket is closed
- The Slack discussion is lost
- The PR description is buried
- The context is gone

**Solution**: The Spec is versioned alongside code in Git. When an agent checks out the code, it also gets the current Spec that documents:
- Why this feature exists (Blueprint: Context)
- How it's architected (Blueprint: Architecture)
- What must never break (Contract: Regression Guardrails)
- How to verify it works (Contract: Scenarios)

Specs are **source code for agents** — they define the contract that code implements.

---

## Anti-Patterns

### ❌ The Stale Spec
**Problem**: Spec created during planning, never updated as the feature evolves.  
**Solution**: Make spec updates mandatory in Definition of Done. Add PR checklist item.

### ❌ The Spec in Slack
**Problem**: Design decisions discussed in chat but never committed to the repo.  
**Solution**: After consensus, immediately update `spec.md` with a commit linking to the discussion.

### ❌ The Monolithic Spec
**Problem**: A single 5000-line spec tries to document the entire application.  
**Solution**: Split into feature-domain specs. Use `ARCHITECTURE.md` only for global cross-cutting concerns.

### ❌ The Spec-as-Tutorial
**Problem**: Spec reads like a beginner's guide, full of basic programming concepts.  
**Solution**: Assume engineering competence. Document constraints and decisions, not general knowledge.

### ❌ The Copy-Paste Code
**Problem**: Spec duplicates large chunks of implementation code.  
**Solution**: Reference canonical sources with file paths. Only include minimal examples to illustrate patterns.

---

## Related Patterns

- [The Spec](https://asdlc.io/patterns/the-spec/) — Conceptual foundation
- [The PBI](https://asdlc.io/patterns/the-pbi/) — Execution units that reference specs
- [Living Specs Practice Guide](https://asdlc.io/practices/living-specs/) — Detailed implementation guidance
- [Behavior-Driven Development](https://asdlc.io/concepts/behavior-driven-development/) — Methodology for Contract scenarios
- [Gherkin](https://asdlc.io/concepts/gherkin/) — Syntax for behavioral specifications

---

## Getting Started

1. **Create a spec**: Use the template above when starting a new feature
2. **Reference in PBIs**: Link your work items (stories/tasks) to relevant specs
3. **Update with code**: Commit spec changes alongside code changes
4. **Review in PRs**: Verify specs are updated when contracts change

**Commands that use specs:**
- `/create-plan {TASK_KEY}` — Generates spec for a feature
- `/start-task {TASK_KEY}` — Reads spec's Blueprint for design constraints
- `/complete-task {TASK_KEY}` — References spec's Contract in PR description
- `/create-test {COMPONENT}` — Uses spec's Contract scenarios for test generation
- `/review-code {PR}` — Validates code against spec contracts

---

**Status**: Active  
**Last Updated**: 2026-01-26  
**Pattern**: ASDLC "The Spec" + "Living Specs"
