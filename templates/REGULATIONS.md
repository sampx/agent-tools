# REGULATIONS.md — Space Regulations

These regulations are the fundamental behavioral norms within this workspace. All agents **must** strictly comply.

---

## Safety Red Lines

<CRITICAL_RULE>

### Deletion Protection

- Never delete any file or directory without careful consideration
- **Authorization**: Only delete when the user confirms with an imperative statement (e.g., "delete it"). Questions ("should this be deleted?") do not constitute authorization
- **Read before delete**: Read file contents before any deletion to judge whether it is user work product
- **Untracked file protection**: Files shown as `??` (untracked) in `git status` must never be deleted
- Use `trash` for all deletes; `rm` / `rm -fr` is forbidden. `git rm` also deletes disk files and is subject to the same protection

### Uncommitted Changes Protection (Concurrency Safety)

**Uncommitted working-tree changes are another session's/agent's unfinished work — as important as committed code, and more fragile.** When multiple agents work on the same project concurrently, any git reset operation can wipe out others' uncommitted work.

**Before operations that may touch the working tree, an awareness check is mandatory**:

- Covered commands: `git reset`, `git checkout/restore <file>`, `git stash`, `git clean`, `git worktree add/remove`, `git switch -f`, `git merge/apply`, etc.
- Pre-check: `git status` to confirm the target repo's working-tree state

**When uncommitted changes are found**:

- Do not run the operations above — that is someone else's work, not your operation target
- Report to the user: summarize the changes (file list) and let the user decide (commit / save / confirm it may be touched)
- When the working tree is clean, operate normally without restriction

### Workspace Boundaries & Sensitive Information

- Operations are confined to the space root directory; do not modify system configuration or privacy files outside this boundary without authorization
- Code or commits must not contain `.env`, keys, or other sensitive credentials

### Sensitive File Read Prohibition

- Never read user files that may contain tokens or keys, such as `.env`, `.bashrc`, `.zshrc`
- Such files are user privacy; reading them constitutes a sensitive-information leak risk, as strictly forbidden as writing them

</CRITICAL_RULE>

---

## Collaboration & Flow Gates

### Forced Skill Gates

The following tasks **must** load the corresponding skill before any operation. Missing a load = serious negligence:

| Task | Required Skill |
|------|----------------|
| Create/edit Issue, create Plan, Plan state transitions | `dev-flow` |
| Delegate any subagent | `agents-collab` |
| Create/modify a skill | `skill-creator` |
| Ambiguous task intent, unsure which skill/flow to use, space maintenance, skill management, multi-space management | `space-master` |

- Check the `<available_skills>` list in context before choosing an approach. Never force generic capability execution when a skill exists
- **Issue/Plan ownership**: All Issues/Plans in a space are created/stored in the space repo, located automatically by the dev-flow script. `--project` only partitions Plan directories. Trust the script; do not question or ask about ownership

### Sub-agent Delegation

<CRITICAL_RULE>

Before delegating **any** subagent:
1. Search memory for delegation rules and past lessons
2. Verify all prompt paths use space-root-relative or absolute paths (bare relative paths write to the workspace root)
3. Confirm the prompt includes target project path context (subagents run at workspace root by default)

- **Prefer `wopal_task`**; use the built-in `Task` tool only when unavailable
- **No sleep polling**: tasks report via `[WOPAL TASK *]` system notifications; check only when a task is alarming or abnormal

</CRITICAL_RULE>

### Verification Isolation

Verification and testing work must not pollute space project files. Except in formal development scenarios, verification may only run in `.wopal-space/.tmp/` or system temporary directories.

### Context Compaction

- `context_manage compact` is asynchronous — compaction runs in the background; the tool returns immediately but compaction is unfinished
- **Must wait for the completion notification** before resuming: current session → wait for `<system-reminder>` recovery protocol; delegated session → wait for `[WOPAL TASK COMPACTED]` → send recovery via `wopal_task_reply`
- **Never execute follow-up tasks before compaction completes**

### Memory & Evolution

**Core principle**: record only information with high long-term reuse value related to space optimization and project building.

#### Memory Recall

Memory only has value when actively retrieved. Proactive search is mandatory in these scenarios:

| Scenario | Search Keywords |
|----------|----------------|
| Before complex tasks | Task-type keywords |
| Ambiguous/conflicting instructions | Related-topic keywords |
| After user criticism | Problem-domain keywords |
| Key decision points | Node-specific keywords |
| After tool errors | Task-type keywords |

**Search method**: pick 2-3 core keywords; neither too broad nor too narrow.

#### Storage Locations

| Info Type | Storage |
|-----------|---------|
| Knowledge/experience/pitfalls | LanceDB (`memory_manage` tool) |
| User Profile | `USER.md` |
| Work rules | `REGULATIONS.md` |
| Project knowledge | project `AGENTS.md` |
| Behavior traits | soul (system prompt) |

#### Write Rules

- Long-term memory writes require: deduplicate first → show full content to user → wait for explicit approval → execute
- Record only information with long-term reuse value related to space optimization and project building
- Memory conflicts with AGENTS.md / REGULATIONS → constitution wins; unique memory details → merge into constitution then delete memory

---

## Development Standards

### Project Types & Ownership

- **`standard`**: independent git repos under `projects/<name>/`, main branch `main`
- **`ontology-worktree`** (only in `.wopal/`): changes take effect at runtime; never modify the `~/.wopal/ontologies/` main repo directly or push to `main` — commit through the `.wopal/` worktree on `space/<name>`, then follow the contribution flow

### Space Access Rules

- Writes requiring user authorization: `.wopal-space/memory/`, `.wopal-space/REGULATIONS.md`
- Temporary files go in `.wopal-space/.tmp/`
- Other reads/writes follow `.wopal-space/STRUCTURE.md`

### Git Workflow

- **Directory precondition**: git operations must target the repo the command acts on. The space root is itself an independent git repo — running git there acts on the **space repo**, not sub-repos. Use `git -C <path>` to specify a repo, or run inside the target project/worktree. Never rely on the default working directory for git operations on sub-projects
- **Pre-implementation check**: run `git status` + `git log --oneline -5` before starting
- **Pre-commit check**: `git status`, `git diff --staged --name-only`, `git log --oneline -5`; confirm not in detached HEAD

#### Commit Format

`<type>(scope): <description> [#ref]`

| Element | Required | Rule |
|---------|----------|------|
| `type` | yes | see type table |
| `scope` | no | parenthesized, lowercase, concise (e.g. `(api)`, `(cli)`) |
| `description` | yes | ≤70 chars; ≤60 chars with Issue ref |
| `Issue ref` | no | appendix `(#N)` for project repos |

**Type table**:

| Type | Purpose | Version Change |
|------|---------|----------------|
| `feat` | New feature | MINOR |
| `fix` | Bug fix | PATCH |
| `refactor` | Refactor (no behavior change) | — |
| `docs` | Documentation | — |
| `test` | Testing | — |
| `chore` | Build/tooling | — |
| `enhance` | Enhancement | MINOR |
| `style` | Code format (no logic change) | — |
| `perf` | Performance | — |
| `ci` | CI/CD config | — |
| `build` | Build system | — |
| `revert` | Revert commit | — |

**Length constraints**: description ≤70 chars (no Issue ref) or ≤60 chars (with Issue ref); first line total ≤100 chars (type + scope + description + Issue ref).

**Description rules**: imperative (`add`, not `added`); English lowercase first letter; no trailing period; concise but descriptive.

**Scope**: parenthesized; common scopes `api`, `ui`, `auth`, `db`, `config`, `deps`, `docs`; monorepo uses package/module name; skip when global or unclear.

**Body (optional)**: blank-line separated; explain **what** and **why**, not **how**; ≤72 chars per line; use body for complex changes to keep the first line concise.

**Footer (optional)**: blank-line separated; breaking change: `BREAKING CHANGE: <desc>`; Issue ref: `Refs: #N` (or appendix `(#N)`).

#### Commit Splitting

- Group related changes into one commit
- Split unrelated changes into separate commits
- Atomic commits ease rollback and bisect

#### Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Main branch, stable |
| `feature/*` | Feature development |
| `bugfix/*` | Bug fixes |
| `hotfix/*` | Emergency fixes |
| `refactor/*` | Refactoring |

### Merge Verification (Post-Refactor)

When a feature branch structurally changes code (file renames, directory reorganization, multi-file merges/splits), never rely on git auto-merge when merging into the target branch. No conflict ≠ lossless change. Classify each commit (`merge-base` → `git show --name-only`); merge/split files must be manually ported; verify key changes landed at new paths with `rg`, then confirm before merging.

---

## Engineering Details

### Time Handling

Always use system commands to get time; never guess. Command: `date '+%Y-%m-%d %H:%M:%S'`

### Path & File Location

Spaces are multi-repo: `glob` cannot reliably traverse nested repos. Prefer `read`/`ls` for location; confirm a project exists under `projects/` before searching. Use `rg` for content search (follows .gitignore; use `--no-ignore-vcs` to cross projects).

### Engineering Standards

- **Historical documents are not retroactively modified**: records in `.wopal-space/plans/**/done/` and similar paths are not retroactively changed