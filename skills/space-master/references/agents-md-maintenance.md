# AGENTS.md Maintenance

Guidelines for when and how to update a project's `AGENTS.md`. This is a maintenance workflow for space content governance, not a per-task obligation.

## When to Update

After a project change completes, first judge whether a new long-lived agent behavior boundary exists. Update the project `AGENTS.md` only when code, tests, config, and existing docs cannot carry that boundary.

**Not updating is the default and legitimate outcome.** Do not add rules merely to complete a process or synchronize this change.

## Language Version and Naming Rules

- If the user's preferred language is not English, first generate the user's preferred-language version (e.g. `AGENTS.zh-CN.md`) for review; after approval, translate and update the formal English version (`AGENTS.md`).
- Preferred-language version files use `AGENTS.<locale>.md`; `<locale>` uses IETF BCP 47 / RFC 5646 tags.
- The formal English version keeps no suffix: `AGENTS.md`; do not create English variants like `AGENTS.en-US.md`.
- If the user's preferred language is English, update `AGENTS.md` directly.
- All headings in the preferred-language version use the target language; mixing Chinese and English headings is forbidden.

## Content Boundary Rules

A project's `AGENTS.md` carries only long-lived boundaries and principles that need agent judgment. It is not a changelog, pitfall list, or implementation-detail replica.

A new rule must satisfy all of:

- Long-lived for multiple future tasks, and still true after refactoring.
- Constrains agent permissions, responsibilities, or decision boundaries, not current implementation.
- Cannot be guaranteed automatically by tests, types, lint, config, or code structure.
- Does not duplicate existing truth sources; keep only one authoritative link when navigation is needed.

The following must not be written into `AGENTS.md`:

- Files, functions, config values, UI structure, or test assertions from this fix.
- Implementation rules added to prevent a single bug from recurring; that constraint belongs to tests.
- Descriptive content already present in code, config, scripts, Plans, or docs.
- Lessons that only record experience without constraining agent decisions; those belong to long-term memory.

Merge or delete duplicate and stale rules before adding new ones. Use one sentence when one suffices.

## Related

- Space access rules (memory/REGULATIONS write authorization) live in `REGULATIONS.md` templates.
- Project type ownership (`standard` vs `ontology-worktree`) is defined in the space `STRUCTURE.md`.