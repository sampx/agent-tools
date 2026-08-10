# REGULATIONS.md — Space Regulations

These regulations are the fundamental behavioral norms of this workspace. Every agent must comply unconditionally. Violation constitutes serious negligence.

---

## Safety Prohibitions

### Deletion Protection

- Deletion is permitted only when the user confirms with an imperative statement (e.g., "delete it"); questions do not constitute authorization
- Read file contents before any deletion to judge whether it is user work product; files shown as `??` (untracked) in `git status` must never be deleted
- Use `trash` for all deletions; `rm` / `rm -fr` / `git rm` are forbidden

### Uncommitted Changes Protection (Concurrency Safety)

- Before operations that may touch the working tree — `git reset`, `checkout/restore`, `stash`, `clean`, `worktree add/remove`, `switch -f`, `merge/apply` — run `git status` first to confirm the working-tree state
- When uncommitted changes are found: do not operate; report the file list and let the user decide
- **Never stash another agent's in-progress changes without confirmation**; when the user explicitly requests it, record the stash number, content summary, creator, and reason; check `git stash list` before finishing; report ownerless stashes; never drop/pop without authorization

### Boundaries & Sensitive Information

- Never read user files that may contain tokens or keys, such as `.env`, `.bashrc`, `.zshrc`; reading is as forbidden as writing
- Code or commits must not contain `.env`, keys, or other sensitive credentials
- `external/` is a collection of external resource references; creating, modifying, or deleting anything under it without authorization is forbidden

---

## Core Work Rules

**Thinking iron rule (highest priority)**: during thinking, no large code blocks, no content unrelated to the current project, no circular thinking. Violating any of these constitutes serious negligence.

### Content Retrieval

- This space is multi-repo: sub-repos are ignored by the space repo, and `glob` cannot traverse nested repos; prefer `read`/`ls` for locating files and directories
- Use `glob`/`grep` only after the project root or target directory is identified; never search across projects from the space root
- When the user mentions a project name, confirm it exists with `read projects/` or `ls projects/` first; never search with `glob` directly
- Use `rg` for content search: `rg "<pattern>" projects/<name>/` when the project root is known; `rg --no-ignore-vcs "<pattern>"` for cross-project search
- **`rg -r` is replace, not recursive; `rg` is recursive by default; use `rg -n` for line numbers; never use `rg -rn`**

- Writes requiring user authorization: `.wopal-space/memory/`, `.wopal-space/REGULATIONS.md`
- Temporary files go in `.wopal-space/.tmp/`
- Other reads/writes follow `.wopal-space/STRUCTURE.md`

### Forced Skill Gates

The following tasks must load the corresponding skill before any operation. Missing a load = serious negligence:

| Task | Required Skill |
|------|----------------|
| Issue/Plan creation and state transitions (submit/approve/complete/verify/archive) | `dev-flow` |
| Delegating any subagent (fae/rook and all types) | `agents-collab` |
| Creating/modifying a skill | `skill-creator` |
| Ambiguous intent, unsure which skill/flow, space maintenance, skill management, ontology repo operations (update/sync/contribute/promote) | `space-master` |

Never force generic capability execution when a ready skill exists.

### Sub-agent Delegation

Before delegating any subagent, complete the following steps in order. Skipping any step = serious negligence:
1. Run `memory_manage command=search` for "delegation" keywords to load path rules, agent-type rules, and past lessons
2. Check all paths in the prompt (`files_to_read`, output paths, etc.); use space-root-relative or absolute paths only; bare relative paths are forbidden
3. Confirm the prompt includes the target project path context (e.g., `projects/gesp/`); subagents run at the workspace root by default — without a project path, files land in the wrong place

- Prefer `wopal_task` for delegation; use the built-in `Task` only when unavailable
- No sleep + wopal_task_output polling; tasks report proactively via `[WOPAL TASK IDLE/STUCK/PROGRESS]` notifications; check only when anomalies appear

### Verification Isolation

Verification/testing work (by Wopal or Fae) must never modify space project files; it may only run in `.wopal-space/.tmp/` or system temporary directories.

### Context Compaction

`context_manage compact` is asynchronous — after triggering, wait for the completion notification before continuing:
- Current session: wait for `<system-reminder>` and follow its recovery protocol
- Delegated session: wait for `[WOPAL TASK COMPACTED]` and send recovery instructions via `wopal_task_reply`

Never execute follow-up tasks before compaction completes.

### Memory

- Proactively run `memory_manage command=search` (2-3 core keywords) before complex tasks, on ambiguous/conflicting instructions, after user criticism, at key decision points, and after tool errors
- Storage: knowledge/experience/pitfalls → LanceDB; user Profile → `USER.md`; work rules → `REGULATIONS.md`; project knowledge → project `AGENTS.md`; behavior traits → system prompt
- Full spec: `.wopal/rules/wopal/mem-rule.md`

---

## Development Standards

### Project Types & Ownership

- `standard`: independent git repos under `projects/<name>/`, main branch `main`
- `ontology-worktree` (`.wopal/`): never modify the `~/.wopal/ontologies/` main repo directly or push to `main`; all changes must be committed through the `.wopal/` worktree on `space/<name>`
- All Issues/Plans are created and stored in the space repo, located automatically by the dev-flow script; `--project` only partitions Plan directories; never question ownership

### Project Spec Updates (AGENTS.md)

- Project specs carry the long-term principles that constrain agent decisions in design, development, testing, and verification — the decision boundaries agents must strictly follow during implementation.
- Agents are obligated to keep project specs consistent with actual project content, but must not write implementation details, single-bug fix records, or other information without long-term value into project specs.

#### TDD

Code projects (`projects/`, ontology-worktree) enforce TDD: write a failing test first (red) → implement to pass (green) → refactor, adjusting tests alongside. Feature code without corresponding tests is incomplete and forbidden to commit. Exempt: documentation, configuration, pure scripts, typo fixes, and other changes without logic.

#### Project Workflow

Layer-by-layer commits, project first then space; the changed path determines which repo to check (`projects/*/` changes do not check the space root repo); ensure not in detached HEAD before development; complete add → commit → push inside the project.

#### Issue Titles

`<type>(<scope>): <description>`: type required, scope required (project or module name), description an English imperative ≤55 chars, total ≤72 chars. Label mapping: feat/enhance → `type/feature`, fix → `type/bug`, refactor → `type/refactor`, docs → `type/docs`, test → `type/test`, chore → `type/chore`, perf has no label.

### Git Workflow

#### Fundamentals

- Use `git -C <path>` to explicitly target the repo; the space root is itself an independent git repo — never rely on the default working directory for git operations on sub-projects
- Before implementation: `git status` (remind the user to commit uncommitted changes first) + `git log --oneline -5` (report unpushed commits from other sessions first)
- All code changes may be committed only after user verification and explicit confirmation; automated verification passing ≠ committable
- Before committing: `git status` + `git diff --staged --name-only` (confirm scope matches intent, no files from other tasks) + `git log --oneline -5`; confirm not in detached HEAD
- Commit language: Chinese for the space repo, English for project repos

#### Commit Format

`<type>(scope): <description> [#ref]`

- type required (see table below); scope optional, parenthesized, lowercase, concise (e.g. `(api)`, `(cli)`), omitted when globally unclear
- description: imperative, English lowercase first letter, no trailing period; ≤70 chars, ≤60 chars with Issue ref; first line total ≤100
- body optional: blank-line separated, explains what/why not how, ≤72 chars per line; breaking changes start with `BREAKING CHANGE:`
- Related changes go in one commit, unrelated changes split; atomic commits ease rollback and bisect

| Type | Purpose | Version Change | Type | Purpose | Version Change |
|------|---------|----------------|------|---------|----------------|
| `feat` | New feature | MINOR | `enhance` | Enhancement | MINOR |
| `fix` | Bug fix | PATCH | `perf` | Performance | — |
| `refactor` | Refactor (no behavior change) | — | `ci` | CI/CD config | — |
| `docs` | Documentation | — | `build` | Build system | — |
| `test` | Testing | — | `revert` | Revert commit | — |
| `chore` | Build/tooling | — | `style` | Code format (no logic change) | — |

#### Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Main branch, stable |
| `feature/*` | Feature development |
| `bugfix/*` | Bug fixes |
| `hotfix/*` | Emergency fixes |
| `refactor/*` | Refactoring |

#### Merge Verification (Structural Change Iron Rule)

When a feature branch contains structural changes — file renames, directory reorganization, multi-file merges/splits — merging must not rely on git auto-merge; no conflict ≠ lossless change.

Before merging: `git merge-base` to find the common ancestor → list the target branch's new commits → classify each file (1:1 renames may be auto-handled but must be verified; merges/splits must be ported manually) → report the classification and get user confirmation before merging.

### Forbidden Commits

Sensitive credentials (`.env`, keys) and temporary artifacts (`__pycache__/`, `node_modules/`, `.ruff_cache/`, IDE configs) must never enter the repository.

---

## Other Rules

### Time Handling

Always use system commands to get time; never guess: `date '+%Y-%m-%d %H:%M:%S'`.

### Documentation Standards

- Historical documents are not retroactively modified: records in `.wopal-space/plans/**/done/` and similar paths are not retroactively changed
