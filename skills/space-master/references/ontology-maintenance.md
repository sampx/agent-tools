# Ontology Maintenance & Architecture Reference Manual

This manual provides technical reference for Wopal's three-layer capability architecture, Clone vs Fork distribution mode contracts, signal interpretation, deletion-risk protection, conflict resolution, and remote cleanup operations.

---

## 1. Three-Layer Capability Architecture & Mode Contracts

Wopal Ontology employs a strictly layered capability model (`main` ➔ `type/<type>` ➔ `space/<name>`):

```
┌─────────────────────────────────────────────────────────┐
│ main Branch                                             │
│ Global Generic Baseline (Templates, Common Skills)      │
└─────────────────────────────────────────────────────────┘
                            │ Downstream Propagation
                            ▼
┌─────────────────────────────────────────────────────────┐
│ type/<type> Branch (e.g., type/coding)                  │
│ Domain-Specific Layer (Type Capabilities + Generic Base)│
└─────────────────────────────────────────────────────────┘
                            │ Downstream Sync
                            ▼
┌─────────────────────────────────────────────────────────┐
│ space/<name> Branch (e.g., space/wopal-workspace)       │
│ Runtime Space Layer (Active Workspace Worktree)         │
└─────────────────────────────────────────────────────────┘
```

### Distribution Mode Contracts (Clone vs Fork Mode)

According to `DESIGN.md` §6.8 and `DISTRIBUTION.md`:

| Feature / Capability | Clone Mode (`clone`) | Fork Mode (`fork`) |
|----------------------|----------------------|--------------------|
| **Repository Setup** | `origin` points directly to canonical upstream | `origin` points to user's Fork; `upstream` points to canonical upstream |
| **Primary Purpose** | Personal local usage & downstream updates | Contribution, custom releases, and PR workflows |
| **Downstream Sync (`update`)** | Supported (`origin/main` ➔ `main` ➔ `type/*`) | Supported (`upstream/main` ➔ `main` ➔ `type/*`) |
| **Space Contribution (`space contribute`)** | Supported (`space/*` ➔ `type/*`) | Supported (`space/*` ➔ `type/*`) |
| **Upstream PR Contribution (`contribute`)** | **STRICTLY UNSUPPORTED** | Supported (Squash merge + Head branch push + PR) |
| **Main Promotion (`promote`)** | Local only | Supported (Promote + PR to `upstream/main`) |

**Agent Operational Rule**: When `wopal ontology status` reports `Mode: clone`, Agents MUST NOT invoke `wopal ontology contribute`. If the user asks to contribute a PR, explain that Clone mode is read-only for upstream contributions and guide the user to convert to Fork mode first.

### Promotion Authorization Rule (CRITICAL)
**Promote scope MUST be explicitly discussed with and confirmed by the user beforehand.** Agents are STRICTLY FORBIDDEN from deciding promotion boundaries autonomously. Present candidate generic files to the user and obtain explicit consent before executing `wopal ontology promote`.

### Capability Status Classification
- **M-status (Main Capabilities)**: Universal capabilities shared across all spaces (e.g., `space-master`, `dev-flow`, `templates/`). Eligible for promotion to `main`.
- **A-status (Type-Specific Capabilities)**: Exclusive capabilities tied to specific domain spaces (e.g., type-specific scripts or custom integrations). Isolated within `type/<type>`.

---

## 2. Status Signal Interpretation Matrix

When executing `wopal ontology status`, interpret the three analysis sections as follows:

### Section A: Downstream (`upstream → origin → local`)

| Signal | Status | Required Action |
|--------|--------|-----------------|
| `Up to date` | Clean | No downstream action required. |
| `Behind (upstream)` | Local is out of date | Execute `wopal ontology update --confirm` to pull upstream changes. |
| `Pushed: no / partial` | Push to origin failed | Inspect credentials or run `git push origin <branch>` manually. |

### Section B: Common Comparison (`type/* vs main`)

| Signal | Status | Required Action |
|--------|--------|-----------------|
| `Type-specific Capabilities` | Normal A-status files | Expected. Do NOT promote to main unless intended for global use. |
| `Behind (needs sync)` | Main has new features | Run `wopal ontology update` (propagates main → type). |
| `Ahead (can promote)` | Type has generic fixes | Discuss scope with user, then run `wopal ontology promote --from type/<type> --include "<path>" --confirm`. |

### Section C: Upstream (`origin → upstream`)

| Signal | Status | Required Action |
|--------|--------|-----------------|
| `0 changes` | Fully aligned | No PR required. |
| `Pending changes` | Local/origin has unmerged PRs | Package changes using chained `--include` and run `wopal ontology contribute`. |

---

## 3. Deletion-Risk Protection & Reconcile Protocol

### What is Deletion-Risk?
During `ontology update`, if updating `type/<type>` from `main` would delete files existing only on the type branch (type-specific capabilities), the CLI aborts automatically and reports a `deletion-risk` warning to prevent data loss.

### Resolution Protocol
When `deletion-risk` is encountered:

1. **Option A (Preserve Type Files — Recommended)**:
   ```bash
   wopal ontology reconcile --type <type> --theirs --confirm
   wopal ontology update --confirm
   ```

2. **Option B (Accept Main Deletions)**:
   ```bash
   wopal ontology reconcile --type <type> --ours --confirm
   wopal ontology update --confirm
   ```

---

## 4. Conflict Resolution Matrix

When merge conflicts occur during `update`, `contribute`, or `promote`:

| File Type | Conflict Cause | Resolution Strategy |
|-----------|----------------|---------------------|
| `settings.jsonc` | Concurrent config block edits | Keep BOTH configuration blocks. Re-parse JSONC to ensure valid syntax. |
| `AGENTS.md` | Concurrent rule additions | Preserve both sets of rules in hierarchy. |
| `SKILL.md` | Concurrent instruction edits | Keep imperative workflow instructions. Ensure valid frontmatter YAML. |
| Code files | Concurrent implementation edits | Resolve in worktree, run tests, `git add <file>`, and complete merge. |

---

## 5. Remote Branch Cleanup & Recovery

* **Automatic Cleanup**: Execution of `wopal ontology update --confirm` automatically detects and deletes merged `origin/contribute/*` temporary head branches on `origin`.
* **Manual Fallback**: If remote deletion fails due to network glitches:
  ```bash
  git -C <WOPAL_HOME>/ontologies/wopal-space-ontology push origin --delete contribute/<branch-name>
  ```

---

## 6. Contribution Scope Determination

Detailed step-by-step procedure for §2.4 of SKILL.md (the body states the hard rules; this is the how-to).

**Step 1 — Present the full menu first.** Run `git diff --name-status <base>...<target>` to enumerate EVERY pending file. Group by directory/feature area and label each group's status (M-status generic / A-status type-specific). Show this complete inventory to the user BEFORE asking anything.

**Step 2 — Classify by STRUCTURAL criterion, not intuition.** M-status (eligible for promotion to main) = capabilities shared by ALL space types — they live on the `main` baseline. A-status (type-specific) = capabilities meaningful only to one space type (e.g. platform-specific skills, integration scripts). Do NOT classify from memory or gut feeling — when unsure whether a file is generic, read the ontology design (`docs/DESIGN.md`) and check whether the capability already exists on `main`. Space-specific customizations (e.g. a skill kept only in `space/<name>`) stay in type/* and are NOT contributed upstream until the user explicitly wants them shared.

**Step 3 — The user circles the scope.** Present the classified inventory and let the user: (a) decide which groups to contribute, (b) which to exclude, (c) which stay space-only. The agent proposes, the user disposes. Never execute `space contribute` / `ontology contribute` / `promote` until the user has explicitly confirmed the scope.

**Step 4 — Space-only assets stay out.** Skills kept only in the space (e.g. unverified or space-specific skills) must NOT enter type/* or upstream. If the user says "keep X in the space only", X never appears in any contribution.

---

## 7. Topic-Based PR Splitting (Worked Example)

Expanded example for §2.5 of SKILL.md.

When `origin/main → upstream/main` shows these pending files:

| File | Topic |
|------|-------|
| `plugins/plugin-a/src/feature-x.ts` | plugin-a new features |
| `plugins/plugin-a/src/feature-y.ts` | plugin-a new features |
| `skills/skill-a/SKILL.md` | skill-a rewrite |
| `skills/skill-b/scripts/helper.py` | skill-b script improvement |

Split into **3 independent PRs**:

```bash
# PR 1: plugin-a feature X and Y
wopal ontology contribute --type common \
  --include "plugins/plugin-a/**" \
  --message "feat(plugin-a): JWT auth and rate limiting for public API"

# PR 2: skill-a rewrite
wopal ontology contribute --type common \
  --include "skills/skill-a/**" \
  --message "feat(skill-a): step-by-step deployment guide with rollback"

# PR 3: skill-b script improvement
wopal ontology contribute --type common \
  --include "skills/skill-b/scripts/helper.py" \
  --message "feat(skill-b): skip empty inputs and dedupe output paths"
```

The message describes WHAT the change delivers (result state), not the mechanical action.
