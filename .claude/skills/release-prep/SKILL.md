---
name: release-prep
description: >-
  Prepare a release: update CHANGELOG.md from git history, verify package.json
  and package-lock.json are at the target version, commit to a release branch,
  and create a local tag. Does NOT push or create a GitHub release — those are
  explicit user actions after PR review.
user-invocable: true
argument-hint: "[version] e.g. 1.3.0 — omit to read version from package.json"
---

# Release Prep

Automates the mechanical steps of cutting a release so nothing is forgotten and nothing lands directly on main.

## Steps

### 1. Determine target version

- If `$ARGUMENTS` is provided, use it as the target version (strip leading `v` if present).
- Otherwise read `version` from `package.json`.
- Confirm the version is a valid semver string. If not, stop with an error.

### 2. Check current branch

- Run `git branch --show-current`.
- If already on a branch named `chore/release-{version}`, continue.
- If on `main` or any other branch, create and switch to `chore/release-{version}`:
  ```bash
  git checkout -b chore/release-{version}
  ```

### 3. Verify package.json and package-lock.json

- Read `version` from `package.json`. If it does not match the target version, stop and tell the user to bump the version first (`npm version {version} --no-git-tag-version`).
- Confirm `package-lock.json` `version` field also matches. If it doesn't, run `npm install --package-lock-only` to sync it.
- Stage both files: `git add package.json package-lock.json`

### 4. Build CHANGELOG entry

- Find the most recent git tag: `git tag --sort=-version:refname | head -1`
- Get all commits between that tag and HEAD:
  ```bash
  git log {last_tag}..HEAD --pretty=format:"%s" --no-merges
  ```
- Group commits by conventional prefix (feat, fix, chore, perf, refactor, docs):
  - `feat:` → **Added**
  - `fix:` → **Fixed**
  - `perf:`, `refactor:` → **Changed**
  - `docs:`, `chore:` → omit unless meaningful (use judgment)
- Strip the prefix and capitalise each line.
- If no commits are found (e.g. first release), note that and write a minimal entry.

### 5. Update CHANGELOG.md

- Read the current `CHANGELOG.md`.
- Insert a new `## [{version}] - {today's date}` section immediately after the `## [Unreleased]` line (if present) or after the file header (before the first existing `## [` section).
- Populate with the **Added**, **Fixed**, **Changed** groups from step 4. Omit empty groups.
- Do NOT modify any existing section.
- Stage: `git add CHANGELOG.md`

### 6. Commit

- Run `git status` — confirm only `CHANGELOG.md`, `package.json`, and `package-lock.json` are staged. If other files are staged, list them and ask the user whether to include them.
- Commit:
  ```bash
  git commit -m "chore: prepare {version} release"
  ```

### 7. Report

Print a summary:
```
Release v{version} prepared on branch chore/release-{version}

Files committed:
  CHANGELOG.md
  package.json
  package-lock.json

Next steps:
  1. Push branch and open a PR:   git push -u origin chore/release-{version}
  2. After PR merges, pull main:  git checkout main && git pull
  3. Tag on main HEAD:            git tag v{version} && git push origin v{version}
  4. Create GitHub release:       gh release create v{version} --title "v{version}" --notes "$(awk '/^## \[{version}\]/{found=1; next} found && /^## \[/{exit} found{print}' CHANGELOG.md)" --latest
  5. CD pipeline fires on release publish and publishes to VS Code Marketplace.
```

## Rules

- **NEVER commit directly to main.** Always use `chore/release-{version}` branch.
- **NEVER push the tag before the PR merges.** The tag must point to the merge commit on main.
- **NEVER modify existing CHANGELOG sections** — only prepend the new one.
- If `package.json` version does not match the target, stop immediately and tell the user. Do not bump the version automatically.
- If there are unstaged changes unrelated to the release files, warn the user but do not stage them.
