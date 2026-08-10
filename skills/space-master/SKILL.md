---
name: space-master
description: |
  Root skill and master specification for WopalSpace. Everything a space can do — how it runs, how it is configured, how to write commands/rules/skills/templates — is defined in the ontology repository and distributed, propagated, and optimized across spaces through the ontology update/contribute/promote flows.

  MUST load when:
  - Ontology repo operations: update, sync, contribute, promote, PR
  - Space structure maintenance: space init/status, .wopal directory layout, how the space runs and is configured
  - Space capability authoring: writing and modifying commands, rules, skills, templates
  - AGENTS.md authoring: creating or updating project/directory AGENTS.md
  - Skill lifecycle: install, scan, remove
  - Task intent is ambiguous or Wopal is unsure which workflow/skill to use — this is the routing entry point

  [CRITICAL] MUST LOAD whenever interacting with ontology repo operations (update/sync/contribute/promote/PR), even if the user does not explicitly say "upstream sync".
---

# space-master

Routes Wopal's decisions for workflow selection, scene-to-skill mapping, ontology maintenance, AGENTS.md maintenance, and the skill lifecycle.

---

## Skill Usage Scenarios

Space skills each serve their own purpose. Choose by scenario; do not stack loads:

| Scenario | Load | Notes |
|----------|------|-------|
| Dev / Fix / Refactor (Issue/Plan driven) | `dev-flow` | Default development workflow; tasks run through its state machine (planning → reviewing → executing → verifying → done) |
| Delegate any sub-agent (fae, rook, wsf-*, etc.) | `agents-collab` | MUST load before delegation; covers delegation tool APIs, task lifecycle, two-way communication, progress monitoring, and recovery |
| Create / modify / evaluate a skill | `skill-creator` | MUST load for new, edited, or evaluated skills; includes description optimization and evaluation flow |

This skill directly owns WopalSpace's space governance work — no routing needed:

- **Ontology maintenance**: the full sync/contribute/promote/PR flow — mode contract, contribution paths, scope determination, PR splitting, sync gates
- **AGENTS.md maintenance**: creating or updating project-level or directory-level AGENTS.md — rule audit, content boundaries, workflow
- **Skill maintenance**: the skill lifecycle — install, scan, remove

---

## Ontology Maintenance

### Mode Contract

Check the mode before any ontology operation:

| Mode | Capability | Origin |
|------|-----------|--------|
| **clone** | `update` (downstream sync) only | upstream repo directly |
| **fork** | `update` + `contribute` (upstream PR) + `promote` | user's fork → upstream |

Command: `wopal ontology status`

### Sync Directions and Layer Order

| Direction | Command |
|-----------|---------|
| **Downstream** | `wopal ontology update --confirm` |
| **Upstream** | `wopal space contribute` → `wopal ontology contribute` / `wopal ontology promote` |

Run downstream updates before starting a contribution batch and after PR merges. Upstream contribution follows this layer order:

```
space/<name> → local type/* → origin/type/* → upstream PR
```

Use `space status` to identify the files to contribute. When selected files still exist on the space branch, run `space contribute` first. Run `ontology contribute` only after those files have entered local type/*. Do not insert `ontology update` between `space contribute` and the type PR.

### Two Contribution Paths

Ontology has a three-layer architecture (main → type/* → space/*), and files fall into two status categories:

| Status | Meaning | Examples | Path |
|--------|---------|----------|------|
| **A-status** | Type-specific, exists only in type/* | Domain-specific skills, workflows, integration scripts | **Short path**: 4 steps |
| **M-status** | Generic capability, ultimately lands in main for all spaces | Generic skills, dev workflows, templates | **Long path**: 7 steps |

#### Short Path (A-status, type-specific)

```
0. ontology update      complete pending downstream sync before this batch
1. space contribute     space/* → local type/* → origin/type/*
2. ontology contribute  type/* → upstream(type) (topic PR)
3. ontology update      downstream sync after upstream merge
```

#### Long Path (M-status, generic)

```
0. ontology update      complete pending downstream sync before this batch
1. space contribute     space/* → local type/* → origin/type/*
2. ontology contribute  type/* → upstream(type) (topic PR)
3. ontology update      downstream sync after type PR merge
4. ontology promote     type/* → main (discuss scope with user first)
5. ontology contribute  main → upstream(main) (topic PR, split per Topic-Based PR Splitting)
6. ontology update      downstream sync again after main PR merge
```

> After promote, main branch has new divergence — must contribute to upstream(main) at step 6.

**Post-promote completeness check** (mandatory after step 4): The promote classifier can misclassify newly added files as A-status and exclude them (observed: new test files under `skills/dev-flow/tests/` were missed). Compare the `promote --confirm` output's promote list against the type PR file set item by item; re-add missing files with `--include <files>`.

**Promote backfill timing**: After promote, main is ahead of type/*; another promote errors with `type branch is behind main`. Run `ontology update --confirm` first to sync main → type/*, then retry promote. The backfill `--include` only adds new files; it does not re-promote existing content.

### Contribution Scope Determination

Contribution scope is decided by the USER, never assumed or delegated back:

1. **Present the full menu first.** Enumerate EVERY pending file (`git diff --name-status`), group by directory/feature area, classify each group (M-status / A-status), and show the complete inventory to the user BEFORE asking anything. Never ask "what do you want to contribute" before showing what is contributable.
2. **Classify by structure, not intuition.** M-status (promotable to `main`) = shared by ALL space types; A-status (type-specific) = meaningful to one space type. When unsure whether a file is generic, read `docs/DESIGN.md` and check whether the capability already exists on `main`. Do not classify from memory or gut feeling.
3. **User circles the scope, then confirm.** Let the user pick which groups contribute, which exclude, which stay space-only. Space-only assets (e.g. unverified or space-specific skills) never enter type/* or upstream. No `--confirm` until the user has explicitly confirmed the file scope.

Full procedure and classification detail: `references/ontology-maintenance.md`.

### Topic-Based PR Splitting

**One PR, one topic.** Changes from different directories or feature areas must be split into separate PRs. This applies to both the type PR and the main PR — promote pushes multiple M-status topics into main at once; re-split them by file directory when contributing. Contribute dependent PRs first; independent topics in any order.

**Multi-round changes ship in ONE PR.** All accumulated changes to the same topic (from multiple prior contribute commits) are contributed together in a single PR — do NOT split them and do NOT ask the user whether to split them.

#### PR message rules

**The message describes WHAT the change delivers, not the action taken.** Write it as the resulting state the reader gets after merge, not the mechanical operation that produced it. Ask: **"What does the reader gain after this merges?"** — answer that, not "what did I do".

- ❌ Action + path: `docs(space-master): add agents-md maintenance guide` (says "I added a guide", not what it contains)
- ✅ Content: `docs(space-master): AGENTS.md maintenance rules and update guidance`
- ❌ Empty action: `docs: sync templates and rules to main` (nothing about content)
- ✅ Content: `docs(templates): concurrency safety protection and sensitive-file read prohibition`

Format: `<type>(<scope>): <content-described-as-result-state>`, a noun phrase describing the delivered capability.

**Repeat full gates for each batch**: every PR goes through the sync analysis and pre-flight gates independently.

### Sync Gates

Every sync operation (`contribute`, `update`, `promote`) must pass through two gates in order:

#### Gate 1: Sync Analysis

Never auto-sync. The agent must understand the full picture first:

1. `wopal space status` — space-layer divergence
2. `wopal ontology status` — ontology-layer divergence (ahead/behind, file-level diff)
3. Follow Contribution Scope Determination: present the full inventory, let the user circle the scope, and get EXPLICIT scope confirmation before any `--confirm` operation. A dry-run inspection is never a substitute for user scope approval.

**Pre-promote report** (mandatory before any `promote --confirm`): classify promotable items proactively (M-status promotable / A-status type-specific) with justification, confirm the `--include`/`--exclude` boundaries item by item, and estimate the PR split (per Topic-Based PR Splitting) with each PR's file scope, `--message`, and order. Only after the user confirms may promote and the subsequent main contribution run.

#### Gate 2: Pre-Flight

Always inspect before pushing:

1. Run **without `--confirm`** first (dry-run)
2. Verify only your changed files appear in the list
3. If wrong, adjust `--include` globs and re-dry-run
4. Only then: re-run with `--confirm`

> Omitting `--include` pushes everything from the branch — all accumulated changes by everyone. There is no undo.
> Eyeball the `exclude` list in dry-run output — excluded files never enter the PR. If a file that should be contributed shows up there, the glob is wrong.

### Ontology Rules

1. **Separate multiple patterns with commas — never chain `--include`.** `--include` is a single-value flag; chaining (`--include A --include B`) keeps only the last one (verified empirically), overriding the others — which pushes the uncovered changes out too (irreversible). Write multiple patterns as `--include "a/**,b/**,c"` (comma-separated, spaces optional). Same for `--exclude`.
2. **Clone mode blocks `contribute`.** Guide the user to fork mode if a PR is needed.
3. **Deletion-risk requires `reconcile`.** When `update` warns about files unique to `type/*` being at risk, run `wopal ontology reconcile --type <type> --theirs --confirm` to preserve them, then retry `update`.
4. **Verify after every operation.** Run `wopal ontology status` and `git diff --stat upstream/main origin/main`.

---

## AGENTS.md Maintenance

When creating or updating a project-level or directory-level `AGENTS.md`, work by these rules:

1. **Audit existing rules first**: before updating an existing `AGENTS.md`, audit every current rule (per the Rule Audit criteria in the reference):
   - **Delete**: code no longer exists / structure guarantees it (single source of truth) / duplicates an authoritative document / pure implementation fact
   - **Keep**: safety boundaries (deletion scope, single credential write path), behavior constraints, User-Supplied Rules
   - **Fix**: directory descriptions outdated, conflicts with a newer design mechanism, language versions drifted
2. **Plan before writing**: present the audit classification (keep / delete / fix with reasons) plus the proposed change list, and wait for user confirmation
3. **Review version first, formal version second**: update `AGENTS.<locale>.md` first, then the formal English `AGENTS.md` after approval
4. Not updating is the default and legitimate outcome — update only when code, tests, config, and existing docs cannot carry the boundary

**Full specification** (content boundaries, workflow, quality checklist) lives in `references/agents-md-maintenance.md`. The `/cupdate-agent-rules` command is an entry point only and carries no specification.

---

## Skill Maintenance

### Lifecycle

```
find → download → scan → install → evaluate → remove
```

```bash
wopal skills find "<query>"              # Search registries
wopal skills download owner/repo@name    # Download to review inbox
wopal skills scan <name>                 # Security scan (MANDATORY)
wopal skills install /path --force       # Install to runtime
wopal skills remove <name> --force       # Remove from space
```

### Skill Rules

1. **Scan before install.** `wopal skills scan` is mandatory — it checks for malicious code, data exfiltration, and invalid triggers. Never skip it.
2. **Verify after change.** After install or edit: `ls -la .wopal/skills/<name>/SKILL.md` and `wopal skills list`.
3. **Create or modify via `skill-creator`.** Load the `skill-creator` skill for any new skill or edit.

---

## References

The skill body covers the essentials. When troubleshooting or encountering edge cases, **read the reference documents** — they contain the full protocol:

| Document | What you'll find |
|----------|------------------|
| `references/ontology-maintenance.md` | Three-layer architecture (main → type/* → space/*), status signal interpretation matrix, conflict resolution by file type, remote branch cleanup |
| `references/skills-maintenance.md` | Full lifecycle details, security scan checks, quality evaluation criteria |
| `references/agents-md-maintenance.md` | Full AGENTS.md maintenance specification: content boundaries, rule audit criteria, workflow, quality checklist |
