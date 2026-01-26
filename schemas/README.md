# Schemas: Standardized Parts

> **ASDLC Pattern**: [Standardized Parts](https://asdlc.io/patterns/standardized-parts/)  
> **Purpose**: Schema-enforced structure and validation for VS Code extension artifacts

This directory contains JSON Schema definitions for validation when using the Standardized Parts pattern in this VS Code extension.

---

## When Schemas Are Needed

Schemas are needed when you want to:
- **Enforce structure** - Ensure artifacts (rules, specs, export data) follow a consistent format
- **Validate before commit** - Catch structural errors early
- **Standardize across teams** - Ensure everyone follows the same patterns
- **Enable tooling** - Support automated validation and generation

---

## Common Schema Types for This Extension

- **MDC Rule Schema** - Validates Cursor rule structure (frontmatter: description, globs, alwaysApply)
- **Spec Schema** - Validates living specification structure (Blueprint, Contract) for features
- **Export Data Schema** - Validates project-rules-export.json structure (if still used)
- **Project State Schema** - Validates project state data structure
- **ASDLC Artifact Schema** - Validates AGENTS.md, specs/ structure
- **Context Provider Tool Schema** - Validates Language Model Tool request/response structure (future)

---

## Current Validation

The extension currently validates:
- **MDC Rules** - Via `MDCParser.validateMDC()` (checks description, globs array, alwaysApply boolean)
- **TypeScript** - Via `tsc` compilation
- **ESLint** - Via ESLint configuration

---

## Schema Detection

The `/setup-asdlc` command automatically creates this directory if it detects schema-related keywords in `AGENTS.md`:
- "Standardized Parts"
- "schema"
- "validation"

---

## Adding Schemas

1. Create JSON Schema file (e.g., `mdc-rule.schema.json`, `export-data.schema.json`)
2. Reference in validation scripts or extension code
3. Document in this README
4. Add validation calls in appropriate scanners or commands

---

## Example Use Cases

- **Pre-commit validation** - Validate MDC rules before commit
- **Export validation** - Ensure export JSON matches expected structure (if JSON export still used)
- **Spec validation** - Validate specs/ structure when scanning
- **Type safety** - JSON Schema for runtime validation of scanned data
- **Context Provider validation** - Validate tool request/response structures (future)

---

## Related Patterns

- [Standardized Parts](https://asdlc.io/patterns/standardized-parts/) — Conceptual foundation
- [The Spec](https://asdlc.io/patterns/the-spec/) — Specs may reference schemas
- [Quality Control](https://asdlc.io/pillars/quality-control/) — Validation gates

---

**Status**: Optional  
**Last Updated**: 2026-01-26  
**Pattern**: ASDLC "Standardized Parts"  
**Project**: VS Code Extension - Project Rules Explorer
