# Data Model: Test Coverage (002-test-coverage)

This feature is primarily about test work and quality gating. It introduces no runtime data model. These entities exist to structure incremental PBIs and acceptance criteria.

## Entities

### Untested File List

**Represents**: The existing list of source files known to be missing tests (input to planning).  
**Identity**: File path (repo-relative).  
**Lifecycle**: Updated as tests are added or explicit exclusions are recorded.

### Coverage Work Item

**Represents**: A small, independently reviewable unit of work that adds tests for a selected set of source files.  
**Identity**: Story/PBI key + target file list.  
**Lifecycle**: Proposed → In Progress → Code Review → Done.

### Coverage Gate

**Represents**: The definition of “good enough” coverage expectations and how they are applied incrementally.  
**Identity**: Spec version + gate rules.  
**Lifecycle**: Evolving (living spec), updated when team policy changes.

## Relationships

- Untested File List → Coverage Work Item: Work items select a subset of files from the list.
- Coverage Work Item → Coverage Gate: Work items must satisfy the gate’s verification rules.

