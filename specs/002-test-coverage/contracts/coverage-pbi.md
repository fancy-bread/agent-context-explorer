# Contract: Coverage PBI

This contract defines what a coverage-focused PBI/PR must demonstrate to be considered complete.

## Scope Declaration

- The PBI MUST list the target source files (repo-relative paths).
- The PR MUST not expand scope beyond the declared list unless explicitly stated.

## Verification

- Tests MUST pass for the relevant suite(s) (unit vs integration depending on what the targets require).
- The test run MUST complete without hanging (no orphaned servers, sockets, watchers).
- The PR MUST include evidence that each target file is exercised by at least one test.

## Exclusions

- If a target file is excluded as “intentionally untestable,” the PR MUST include a rationale and replacement coverage strategy (e.g., test at a higher-level seam).

