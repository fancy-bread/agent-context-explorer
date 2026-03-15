# Product Vision – Agent Context Explorer (ACE)

**Purpose:** This document transmits product taste and point of view to agents and humans so this project behaves as _Agent Context Explorer (ACE)_ rather than generic software. It sits **above** the Constitution (how agents behave) and Specs (what to build). See [ASDLC Product Vision](https://asdlc.io/fieldmanual/#product-vision).

---

## 1. The Actual Humans

Describe the real people this product is for, not abstract “users”.

- **Primary human – extension/IDE power user** — VS Code / Cursor developers who already use Git, CLIs, and AI assistants. They are under pressure to ship features quickly without losing architectural integrity. They want AI help that understands their _actual_ project context (rules, specs, AGENTS.md) instead of hallucinating from file heuristics. They are comfortable installing extensions, configuring MCP, and curating their own workflow.
- **Primary human – AI‑assisted engineer / tech lead** — Engineers and leads who are actively trying to adopt ASDLC patterns (Specs, AGENTS.md, skills) and need a reliable viewer for those artifacts plus a clean way to expose them to agents. They care about compliance with agreed‑upon standards and want to prevent agents from “going rogue” outside the project’s constitution.
- **Secondary human – AI / tools engineer** — People building or wiring up agents, MCP servers, and skills that must consume project context programmatically. They use ACE as a stable, cross‑workspace context provider and as a guinea pig implementation for patterns they will later apply in other products like `agency`.

We are **not** optimizing for:

- Completely non‑technical end users who do not know Git, CLIs, or how to configure extensions.
- Teams who want a monolithic “do everything” super‑agent that auto‑discovers project state without explicit artifacts.
- Heavy‑weight governance or GRC teams who need formal compliance tooling beyond ASDLC’s three pillars (ACE is viewer‑only and read‑only).

---

## 2. Point of View

Opinionated stances and tradeoffs for Agent Context Explorer (ACE). These should be things reasonable teams could disagree on.

- **Explicit artifacts over inference** — ACE chooses AGENTS.md, specs/, schemas/, `.cursor/rules/`, and skills as the single source of truth. It intentionally avoids optimistic state detection (e.g., guessing frameworks from folders) because monorepos and unconventional layouts make heuristics brittle and dangerous for agents.
- **Viewer‑only over mutating tools** — ACE is a read‑only inspector and context provider, not a rules or specs editor. Authoring happens in the user’s normal tools; ACE focuses on scanning, organizing, and exposing those artifacts safely via UI and MCP.
- **ASDLC‑native over generic AI helper** — ACE bakes in ASDLC concepts (Product Vision, AGENTS.md, Specs, three pillars) instead of pretending they don’t exist. When in doubt, it reinforces ASDLC patterns rather than inventing ad‑hoc workflows.
- **Cross‑workspace, multi‑project over single‑repo** — ACE treats “project” as a first‑class concept and is comfortable scanning multiple workspaces and external folders. It optimizes for people who jump across many codebases and want consistent agent context everywhere.
- **Pragmatic guinea pig for `agency`** — This extension is an early proving ground for the `agency` project. ACE accepts a bit more experimentation as long as it remains stable and useful; successful patterns here can be extracted or generalized into `agency` and other tools.

Clarify **what we are building** and **what we are deliberately not building**:

- We are building: a cross‑workspace, ASDLC‑aligned viewer and MCP context provider that scans explicit artifacts (rules, specs, AGENTS.md, schemas, skills) and presents them clearly to both humans and agents.
- We are not building: a full compliance engine, a code generator, a spec authoring environment, or a monolithic project management tool. Those belong in adjacent products (e.g., `agency`) or other extensions.

---

## 3. Taste References

Concrete examples of products and systems that feel “right” for Agent Context Explorer (ACE), and ones that don’t.

**Closer to our taste:**

- **GitLens‑style explorers** — Rich but focused tree views that surface history and metadata without taking over the editing experience. We like: clear icons, contextual tooltips, and tight integration with existing files.
- **MCP‑native tools in Cursor / VS Code** — Systems that present well‑structured tools and resources to agents instead of bespoke RPCs. We like: explicit contracts, discoverable tools, and stable schemas.
- **ASDLC patterns and Spec‑first workflows** — Specs, PBIs, Context Gates, and Agent Constitutions that clearly separate “why”, “what”, and “how”. We like that engineers and agents operate against the same artifacts and vocabulary.

**Further from our taste:**

- **Monolithic super‑agents** that try to infer everything from the filesystem and then mutate code and configs without grounding in explicit artifacts.
- **Wizardy UIs** that hide what’s happening behind opaque steps, cannot be scripted, and do not expose a programmatic interface like MCP.

If relevant, note target platforms or ecosystems:

- **Target platform(s):** Cursor plugin, VS Code extension (same codebase).
- **Ecosystems:** MCP servers/clients, Cursor `.cursor/rules` / skills, ASDLC artifacts (AGENTS.md, specs/, schemas/).

---

## 4. Voice and Language

How Agent Context Explorer (ACE) speaks in docs, UI, and agent instructions.

- **Tone:** Operational, concrete, and calm. Friendly but not cutesy. ACE should feel like a senior engineer showing you the map of your project, not a marketing page or a chatbot persona.
- **Preferred language patterns:** Use ASDLC terms explicitly (Vision, AGENTS.md / Constitution, Specs, PBIs, three pillars) and refer to “artifacts” and “context” instead of vague “magic understanding”. Call the product “Agent Context Explorer (ACE)” or “ACE” once introduced.
- **What we avoid saying:** No hype or aspirational language that implies unbuilt features (“ACE automatically understands your entire system with no setup”). No “AI magic” phrasing; always anchor behavior in specific artifacts and tools.
- **Target audience literacy:** Assume comfort with Git, VS Code/Cursor, CLIs, JSON/YAML, and basic ASDLC concepts. Do not re‑explain fundamentals like “what is Git” or “what is MCP”.

Examples:

- **Good copy:** “ACE scanned your `AGENTS.md`, specs/, and schemas/ and is ready to expose this context via MCP tools.”  
  **Bad copy:** “Our powerful AI reads your whole project and figures everything out for you!”

---

## 5. Decision Heuristics

Tie-breaking rules when specs are ambiguous. These should guide agents and humans making design/implementation decisions.

When in doubt, Agent Context Explorer (ACE) should prefer:

1. **Spec over vibes** — If behavior isn’t grounded in explicit artifacts (AGENTS.md, specs/, schemas/, `.cursor/rules/`), stop and update or create the artifact before implementing. ACE should not encode undeclared project rules.
2. **Ecosystem over bespoke** — Prefer integrating with existing ASDLC artifacts, MCP patterns, and skills (e.g., `vscode-extension-builder`, skills.sh) rather than inventing new, one‑off mechanisms inside ACE.
3. **Viewer‑only over mutating features** — When a feature could either display or mutate artifacts, default to display and linking (open in editor) unless there is a strong, explicit requirement to edit.
4. **Cross‑platform MCP over platform‑specific APIs** — If a feature can be implemented in a way that works for both Cursor and VS Code via MCP, choose that over a Cursor‑only or VS Code‑only path.

State a few **hard “no”s** that matter for this product (they can be echoed in the Constitution later):

- Never silently modify or delete project artifacts; any write behavior should be explicit and rare (and likely out of scope for ACE).
- Never introduce optimistic framework or state detection as a primary mechanism; detection must be artifact‑based.
- Never bypass AGENTS.md and `.cursor/rules/` when giving guidance to agents about how to treat this repo.

---

## 6. Placement and Use

Clarify how this VISION document relates to other artifacts in the repo so agents know where to look for what.

- **Constitution** (`AGENTS.md`) — How agents behave; operational boundaries, tech stack, non‑negotiable rules for this repo.
- **Vision** (`VISION.md`) — This file: who ACE is for, what kind of product it is, and the taste and tradeoffs that should shape future decisions.
- **Specs / PBIs** (e.g. `specs/**/spec.md`, `specs/**/tasks.md`) — What to build next; concrete behaviors, contracts, and acceptance criteria for features. PBIs are derived from the task breakdown in `tasks.md`.
- **Architecture docs** (e.g. HLA documents in `specs/**.hla.md` or future `docs/` files) — How the system is structured technically: scanners, MCP server, tree views, bundling, etc.

When adding a new feature, persona, or integration for Agent Context Explorer (ACE), ask:

> “Does this match the product we described in `VISION.md`? If not, are we evolving the vision on purpose, or are we accidentally drifting from it?”

Update this document when the **product’s taste or point of view changes**, not when individual features are added. Those belong in Specs, PBIs, and ADRs. Coordinate changes here with updates to `AGENTS.md` so the Constitution and Vision stay aligned.

---

_References: [ASDLC Product Vision](https://asdlc.io/fieldmanual/#product-vision), [Specs](https://asdlc.io/fieldmanual/#specs), [Agent Constitution](https://asdlc.io/fieldmanual/#agent-constitution), [Context Gates](https://asdlc.io/fieldmanual/#context-gates)._

