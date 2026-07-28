---
name: space-master
description: |
  Master specification for WopalSpace. [MUST LOAD FIRST] — Load this skill when Wopal is uncertain how to proceed, task intent is ambiguous, or performing ontology/space maintenance.

  Triggers: Ambiguous task intent, "what workflow to use", "what skill to load",
  skill management (install/remove/search), space maintenance (worktrees, sync, PR contribution, promote), multi-space management.
  
  [CRITICAL] MUST LOAD whenever interacting with ontology repo operations (update/sync/contribute/promote/PR), even if the user does not explicitly say "upstream sync".
---

# space-master — Space Operation Specification Master

This skill defines Wopal space workflow selection, scene-to-skill routing rules, ontology development contracts, plugin configuration & diagnostic log locations, and standard ontology maintenance with PR contribution command procedures.

---

## Section 1: Workflows & Scene Routing

### 1. Space Workflow System

| Workflow | Use Case | Skills to Load |
|----------|----------|----------------|
| **dev-flow** | Development, bug fixes, or refactoring driven by GitHub Issues or Plans | dev-flow + agents-collab |
| **No Workflow** | Pure research, discussions, explanations, code reviews, or minor ad-hoc tweaks | None (Wopal handles directly) |

`dev-flow` is the default development workflow.

### 2. Scene-to-Skill Routing Table

| Scene | Skills to Load | Description |
|-------|----------------|-------------|
| Dev / Fix / Refactor Issue | dev-flow + agents-collab | Load agents-collab first, then follow dev-flow |
| Delegate any sub-agent | agents-collab | MANDATORY to load before any sub-agent delegation |
| Space & Ontology Ops (Install/Sync/PR/Promote) | space-master only | Do NOT load dev-flow or agents-collab |
| Create or modify skills | skill-creator | Independent skill (MUST load before creating/modifying skills) |
| Configure ellamaka | ellamaka-config | Independent skill |

---

## Section 2: Ontology Development Contract & dev-flow Specification

When performing development, bug fixes, or refactoring on ontology capabilities or projects, adhere to the following official standard contracts:

### 1. Ontology Runtime Contract
The `.wopal/` directory is the active runtime worktree bound to the current space (corresponding to the `space/<name>` branch). Edits made directly in `.wopal/` immediately affect running plugins and skills.

### 2. Issue / Plan-Driven Development Contract (dev-flow)
When a task involves development, bug fixes, refactoring, or minor feature iterations, **Agents MUST load and follow the `dev-flow` skill**:
- Tasks MUST be backed by a GitHub Issue or Plan, driven through the official `flow.sh` state machine: `planning → reviewing → executing → verifying → done`.
- Bypassing `dev-flow` to manually perform non-standard branch or isolation operations is STRICTLY FORBIDDEN.

### 3. Infrastructure & Branch Management Iron Laws
- **Infrastructure Exclusivity**: The lifecycle of worktrees and feature branches is exclusively managed by `dev-flow` scripts (`approve` / `verify-switch` / `archive`).
- **Agent Branch Restrictions**: Agents MUST NOT manually create or delete any branches (FORBIDDEN: `git branch -d/-D`), and MUST NOT manually create or delete worktrees. The ONLY allowed git branch operation for agents is `git merge`.

---

## Section 3: Plugin Configuration & Diagnostic Logs

### 1. Configuration Priority
```
3. System / Shell Environment Variables (Highest priority, not overridden by .env)
2. Space-level .wopal/.env               (Applies to current space only)
1. User-level <WOPAL_HOME>/.env         (Shared across spaces)
```

### 2. Diagnostic Log Locations
- **In-space execution log**: `<workspace>/.wopal-space/logs/wopal-plugin.log`
- **Out-of-space execution log**: `<WOPAL_HOME>/logs/wopal-plugin.log`
When plugin errors or permission issues occur, inspect the above log files first to diagnose root causes.

---

## Section 4: Ontology Maintenance & Upstream PR Contribution

### 1. Ontology Mode Contract (Clone vs Fork Mode)
Before suggesting or executing any upstream operations, Agents MUST run `wopal ontology status` to check the active Mode:

- **Clone Mode (`clone`)**: Default single-repo source mode. `origin` is the upstream repo; no separate Fork exists.
  - **Capability Restrictions**: **`contribute` IS NOT SUPPORTED in Clone mode**. It is restricted to local usage and downstream sync (`update`).
  - **Agent Behavior**: If the user requests an upstream PR contribution, the Agent MUST explain that Clone mode does not support `contribute` and guide the user to configure Fork mode first.
- **Fork Mode (`fork`)**: Developer cross-repo mode. `origin` points to the user's Fork; `upstream` points to official upstream.
  - **Capability Support**: Fully supports downstream sync (`update`) + upstream PR contributions (`contribute`) + main promotion (`promote`).

### 2. Standard Maintenance Protocol (Fork Mode)

```
[Space Layer space/*] 
      │ 1. space contribute (chained --include)
      ▼
[Type Layer type/*] 
      │ 2. ontology contribute (chained --include) ➔ Auto-creates PR on GitHub origin
      ▼
[Upstream upstream] (Merge on GitHub UI)
      │ 3. ontology update (--confirm) ➔ Downstream topology sync + Auto-clean stale origin branches
      ▼
[Main Promotion promote] (chained --include) ➔ MUST discuss with user to confirm scope before promoting to main
```

- **Check Status & Mode (Pre-check)**: `wopal ontology status`
- **Merge Space into Type**: `wopal space contribute --message "feat(scope): short description" --confirm`
- **Create Upstream PR (Fork Mode, Chained `--include`)**:
  ```bash
  wopal ontology contribute \
    --type coding \
    --include "skills/dev-flow/**" \
    --include "skills/space-master/**" \
    --message "feat(skills): update dev-flow and space-master skills" \
    --confirm
  ```
- **Post-Merge Downstream Sync**: `wopal ontology update --confirm`
- **Promote Generic to Main (MUST discuss scope with user first)**:
  ```bash
  wopal ontology promote \
    --from type/coding \
    --include "templates/**" \
    --include "docs/**" \
    --message "feat(ontology): promote generic templates to main" \
    --confirm
  ```

### 3. Verification & Self-Inspection Protocol
Agents MUST perform verification after executing commands or modifying skills, and never assume success:
- **Skill Modification Verification**: `ls -la .wopal/skills/<skill-name>/SKILL.md` and `wopal skills list`
- **PR Contribution Verification**: `wopal ontology status` and `git diff --stat upstream/main origin/main`
- **Plugin Modification Verification**: Inspect `<workspace>/.wopal-space/logs/wopal-plugin.log`

### 4. Core Iron Laws
- **MANDATORY User Discussion for Promote**: **The scope of `wopal ontology promote` MUST be thoroughly discussed with and explicitly confirmed by the user beforehand. Agents are STRICTLY FORBIDDEN from acting on their own assumptions!**
- **Mode Enforcement**: NEVER construct or invoke `contribute` commands in Clone mode.
- **Read Status First**: Always call `wopal ontology status` to inspect Mode and topology before building modifying commands.
- **Chained `--include` Whitelist**: Always specify explicit whitelist paths using chained `--include` flags when contributing or promoting.
- **Topic-Based Contributions**: Never combine unrelated changes into a single PR.

---

## Section 5: Deep Reference Entry

* [ontology-maintenance.md](references/ontology-maintenance.md) — Three-layer capability architecture, Clone vs Fork mode contracts, status interpretation matrix, deletion-risk handling, and conflict resolution guide
* [skills-maintenance.md](references/skills-maintenance.md) — Skill lifecycle management (find/download/scan/install), security protocols, and quality evaluation guide
