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

### 2.2 Two Contribution Paths

Not all changes follow the same pipeline. Ontology has a three-layer architecture (main → type/* → space/*), and files fall into two status categories:

| Status | Meaning | Examples | Path |
|--------|---------|----------|------|
| **A-status** | Type-specific, exists only in type/* | Domain-specific skills, workflows, integration scripts | **Short path**: 4 steps |
| **M-status** | Generic capability, ultimately lands in main for all spaces | Generic skills, dev workflows, templates | **Long path**: 7 steps |

#### Short Path (A-status, type-specific)

```
space → type → upstream(type) → ✓ done
```

```
1. space contribute     space/* → type/*
2. ontology update      upstream → local (sync baseline)
3. ontology contribute  type/* → upstream(type) (topic PR)
4. ontology update      downstream sync after upstream merge
```

> Type-specific capabilities follow this path. No promote to main needed.

#### Long Path (M-status, generic)

```
space → type → upstream(type) → promote → upstream(main) → ✓ done
```

```
1. space contribute     space/* → type/*
2. ontology update      upstream → local (sync baseline)
3. ontology contribute  type/* → upstream(type) (topic PR)
4. ontology update      downstream sync after upstream merge
5. ontology promote     type/* → main (discuss scope with user first)
6. ontology contribute  main → upstream(main) (topic PR)
7. ontology update      downstream sync again
```

> Generic capabilities (e.g., generic skills, dev workflows, templates) follow this path. After promote, main branch has new divergence — must contribute to upstream(main) at step 6.

**Key difference**: The long path has 3 extra steps (promote → contribute main → update). It's easy to forget step 6 after promote.

### 2.3 Topic-Based PR Splitting

**One PR, one topic.** Changes from different directories or feature areas must be split into separate PRs.

#### Why splitting matters

- `--include` isolates files, but if two unrelated topics are bundled in one PR, reviewers can't review and merge them independently.
- If one topic gets rejected, the other is dragged down with it.
- Ontology repo is shared infrastructure across all spaces — PR history must be clean and traceable.

#### Splitting example

When `origin/main → upstream/main` shows these pending files:

| File | Topic |
|------|-------|
| `plugins/plugin-a/src/feature-x.ts` | plugin-a new features |
| `plugins/plugin-a/src/feature-y.ts` | plugin-a new features |
| `skills/skill-a/SKILL.md` | skill-a rewrite |
| `skills/skill-b/scripts/helper.py` | skill-b script improvement |

Split into **3 independent PRs**:

```bash
# PR 1: plugin-a new features
wopal ontology contribute --type common \
  --include "plugins/plugin-a/**" \
  --message "feat(plugin-a): add feature X and Y"

# PR 2: skill-a rewrite
wopal ontology contribute --type common \
  --include "skills/skill-a/**" \
  --message "feat(skill-a): rewrite workflow guide"

# PR 3: skill-b script improvement
wopal ontology contribute --type common \
  --include "skills/skill-b/scripts/helper.py" \
  --message "feat(skill-b): improve helper script"
```

#### Splitting rules

1. **Isolate by file path**: Changes under the same directory tree usually belong to the same topic
2. **Isolate by feature area**: Changes from different feature areas must not be bundled together
3. **Batch order**: Contribute PRs with dependencies first (e.g., a plugin that other changes depend on); independent topics can be in any order
4. **Repeat full gates for each batch**: Every PR goes through the sync analysis gate and pre-flight gate independently

### 2.4 Sync Gates

Every sync operation (`contribute`, `update`, `promote`) must pass through two gates in order:

#### Gate 1: Sync Analysis

Never auto-sync. The agent must understand the full picture first:

1. `wopal space status` — space-layer divergence
2. `wopal ontology status` — ontology-layer divergence (ahead/behind, file-level diff)
3. Present analysis to the user: what changed, sync scope, exclusion strategy, PR batches
4. Proceed only after explicit user confirmation

#### Gate 2: Pre-Flight

Always inspect before pushing:

1. Run **without `--confirm`** first (dry-run)
2. Verify only your changed files appear in the list
3. If wrong, adjust `--include` globs and re-dry-run
4. Only then: re-run with `--confirm`

> Omitting `--include` pushes everything from the branch — all accumulated changes by everyone. There is no undo.

### 2.5 Ontology Rules

1. **Never auto-sync.** Analyse and get user confirmation first.
2. **Always chain `--include`.** Multiple flags are additive. One glob per directory.
3. **Promote requires user discussion.** M-status capabilities (shared across spaces) are eligible for promotion; A-status (type-specific) are not. The agent must not decide promote scope autonomously.
4. **Clone mode blocks `contribute`.** Guide the user to fork mode if a PR is needed.
5. **Deletion-risk requires `reconcile`.** When `update` warns about files unique to `type/*` being at risk, run `wopal ontology reconcile --type <type> --theirs --confirm` to preserve them, then retry `update`.
6. **Verify after every operation.** Run `wopal ontology status` and `git diff --stat upstream/main origin/main`.

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
