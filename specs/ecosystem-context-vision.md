# Vision: Ecosystem Context for Cursor

> **Purpose:** Define what this project aims to be when the target is a **polyrepo ecosystem** and the consumer is **Cursor** (human + AI).  
> **Status:** Draft — product direction, not yet a feature spec.  
> **Last Updated:** 2026-02-06

---

## 1. Ecosystem shape

Imagine a **well-defined, segregated software ecosystem**: many repositories that are **related** (same product, shared domain, shared contracts, or clear dependencies) but **deliberately not a monorepo**. Repo boundaries are real—separate ownership, release cycles, or tooling—and that separation is intentional.

**Opposite of a monorepo:** not “one repo with many packages,” but “many repos that belong to one logical ecosystem.”

---

## 2. Problem

- **Cursor** (and the AI in Cursor) is usually pointed at **one workspace** = one repo (or a single multi-root workspace).
- **Context is siloed per repo.** Rules, AGENTS.md, specs, and conventions live inside each repo. The AI and the human see “this repo,” not “this repo + its siblings and how they relate.”
- There is **no single, first-class way** to expose “context across related repos” into Cursor so that both the editor and the AI can use it.

So: the ecosystem exists, but Cursor doesn’t see it as an ecosystem.

---

## 3. Goal

**A tool that exposes context across related repos to Cursor.**

- **“Exposes”:** Makes that context available in a form Cursor (and the AI in Cursor) can use. Mechanism TBD—MCP, export, extension UI, or a combination.
- **“Context”:** Whatever is needed to reason about the ecosystem: identity (what each repo is), rules/conventions, contracts/specs, relationships (who depends on whom, who consumes whom), and where to look for what.
- **“Related repos”:** The set of repos that form the ecosystem. Defined by the user or by convention (e.g. a manifest, a list, or discovery from a root repo).
- **“To Cursor”:** The primary consumer is Cursor—the human developer and the AI in the chat/composer. The tool’s job is to bridge “ecosystem context” into that environment.

---

## 4. Non-goals (for this vision)

- **Monorepo tooling:** We are not optimizing for “one repo, many packages.” The ecosystem is multi-repo by design.
- **Replacing Cursor’s multi-root workspace:** Multi-root is one way to open several repos; the tool may complement it by adding *aggregated, ecosystem-level* context, not by replacing workspace semantics.
- **Locking in a single mechanism:** How context is exposed (MCP, file export, sidebar, etc.) is a design/requirements decision to be made from this vision.

---

## 5. What “success” looks like (direction only)

- A human working in **one repo** in Cursor can still “see” and use context from **other related repos** (rules, contracts, identity) without constantly switching workspaces or copying files.
- The **AI in Cursor** can reason about the ecosystem when answering questions or making changes—e.g. “this service talks to that one,” “this repo’s API is specified here,” “that repo’s rules say we must do X.”
- The **boundaries** of the ecosystem are explicit and configurable (not inferred in a fuzzy way).

---

## 6. Relationship to current ACE

Today ACE focuses on **one workspace**: rules, commands, ASDLC artifacts, compliance, and (attempted) MCP exposure for that workspace. The MCP POC showed that in Cursor, extension-registered MCP does not currently feed the chat AI; only `mcp.json` does.

This vision **shifts the center of gravity**: the main value is **cross-repo ecosystem context** exposed to Cursor, not “per-workspace context via MCP.” Current ACE capabilities (scanners, rules, commands, AGENTS.md, specs) can become **building blocks** for that—e.g. “per-repo context” that is then aggregated and exposed at ecosystem level—or the product may be re-scoped around ecosystem-first. That’s for a later product/requirements pass.

---

## 7. Next steps (for product/requirements)

1. **Define “ecosystem” concretely:** How is the set of related repos declared or discovered? (Manifest file, config, directory layout, API?)
2. **Define “context” at ecosystem level:** What exactly do we aggregate? (List of repos + identity, shared rules, cross-repo specs/contracts, dependency/relationship graph?)
3. **Define “expose to Cursor”:** What mechanisms are in scope? (mcp.json MCP server, static export, extension UI, Cursor rules injection?) What works reliably in Cursor today?
4. **Reconcile with current ACE:** Which existing features stay, which become ecosystem-scoped, which are deprecated or split out.

---

**Status:** Draft vision. Use this to drive a focused “what should this project be?” and requirements discussion; then derive specs and plans from it.
