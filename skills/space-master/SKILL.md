---
name: space-master
description: |
  Master specification for WopalSpace. [MUST LOAD FIRST] — Load this skill when Wopal is uncertain how to proceed, task intent is ambiguous, or performing ontology/space maintenance.

  Triggers: Ambiguous task intent, "what workflow to use", "what skill to load",
  skill management (install/remove/search), space maintenance (worktrees, sync, PR contribution, promote), multi-space management.

  [CRITICAL] MUST LOAD whenever interacting with ontology repo operations (update/sync/contribute/promote/PR), even if the user does not explicitly say "upstream sync".
---

# space-master

Routes Wopal's decisions for workflows, scene-to-skill mapping, ontology maintenance, and skills lifecycle.

---

## 1. When to Use

| Scene | Load | Notes |
|-------|------|-------|
| Dev / Fix / Refactor (Issue/Plan) | `dev-flow` + `agents-collab` | agents-collab first |
| Delegate any sub-agent | `agents-collab` | MUST load before delegation |
| Ontology ops (sync, contribute, promote) | `space-master` only | Do NOT load dev-flow or agents-collab |
| Create or modify a skill | `skill-creator` | Independent skill |

`dev-flow` is the default development workflow. Tasks must be driven through its state machine: `planning → reviewing → executing → verifying → done`.

---

## 2. Ontology Maintenance

### 2.1 Mode Contract

Before any ontology operation, check the mode:

| Mode | Capability | Origin |
|------|-----------|--------|
| **clone** | `update` (downstream sync) only | upstream repo directly |
| **fork** | `update` + `contribute` (upstream PR) + `promote` | user's fork → upstream |

Command: `wopal ontology status`

### 2.2 Standard Protocol (Fork Mode)

```
1. space contribute   merge space/* → type/*
2. ontology update    sync upstream → local (pull latest before contributing)
3. ontology contribute  PR type/* → upstream (GitHub)
4. ontology update    sync downstream after upstream merge
5. ontology promote   type/* → main (discuss scope with user first)
```

Always run `update` before `contribute` — pushing without first pulling upstream changes risks conflicts and stale diffs.

**Commands** (all require chained `--include`):

```bash
# 1. Space → Type
wopal space contribute \
  --include "skills/<name>/**" \
  --message "feat(scope): description" --confirm

# 2. Downstream sync
wopal ontology update --confirm

# 3. Type → Upstream PR
wopal ontology contribute \
  --type coding \
  --include "skills/<name>/**" \
  --include "docs/**" \
  --message "feat(scope): description" --confirm

# 4. Downstream sync after merge
wopal ontology update --confirm

# 5. Promote to main
wopal ontology promote \
  --from type/coding \
  --include "templates/**" \
  --message "feat(ontology): promote generic templates to main" --confirm
```

### 2.3 Sync Gates

Every sync operation (`contribute`, `update`, `promote`) passes through two gates in order:

#### Gate 1: Sync Analysis

Never auto-sync. The agent must understand the full picture first:

1. `wopal space status` — space-layer divergence
2. `wopal ontology status` — ontology-layer divergence (ahead/behind, file-level diff)
3. Present analysis to the user: what changed, sync scope, exclusion strategy
4. Proceed only after explicit user confirmation

#### Gate 2: Pre-Flight

Always inspect before pushing:

1. Run **without `--confirm`** first (dry-run)
2. Verify only your changed files appear in the list
3. If wrong, adjust `--include` globs and re-dry-run
4. Only then: re-run with `--confirm`

> Omitting `--include` pushes everything from the branch — all accumulated changes by everyone. There is no undo.

### 2.4 Ontology Rules

1. **Never auto-sync.** Analyse and get user confirmation first.
2. **Always chain `--include`.** Multiple flags are additive. One glob per directory.
3. **Topic-based PRs only.** Split unrelated changes by directory or feature area.
4. **Promote requires user discussion.** M-status capabilities (shared across spaces) are eligible for promotion; A-status (type-specific) are not.
5. **Clone mode blocks `contribute`.** Guide the user to fork mode if a PR is needed.
6. **Deletion-risk requires `reconcile`.** When `update` warns about files unique to `type/*` being at risk, run `wopal ontology reconcile --type <type> --theirs --confirm` to preserve them, then retry `update`.
7. **Verify after every operation.** Run `wopal ontology status` and `git diff --stat upstream/main origin/main`.

---

## 3. Skills Maintenance

### 3.1 Lifecycle

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

### 3.2 Skills Rules

1. **Scan before install.** `wopal skills scan` is mandatory — it checks for malicious code, data exfiltration, and invalid triggers. Never skip it.
2. **Verify after change.** After install or edit: `ls -la .wopal/skills/<name>/SKILL.md` and `wopal skills list`.
3. **Create or modify via `skill-creator`.** Load the `skill-creator` skill for any new skill or edit.

---

## 4. References

The skill body covers the essentials. When troubleshooting or encountering edge cases, **read the reference documents** — they contain the full protocol:

| Document | What you'll find |
|----------|------------------|
| `references/ontology-maintenance.md` | Three-layer architecture (main → type/* → space/*), status signal interpretation matrix, conflict resolution by file type, remote branch cleanup |
| `references/skills-maintenance.md` | Full lifecycle details, security scan checks, quality evaluation criteria |
