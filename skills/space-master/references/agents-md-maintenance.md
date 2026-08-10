# AGENTS.md Maintenance

The authoritative specification for creating and updating project-level or directory-level `AGENTS.md`. This is a maintenance workflow for space content governance, not a per-task obligation. The SKILL.md body only routes to this document — all details live here.

## 1. When to Update

After a project change completes, first judge whether a new long-lived agent behavior boundary exists. Update the project `AGENTS.md` only when code, tests, config, and existing docs cannot carry that boundary.

**Not updating is the default and legitimate outcome.** Do not add rules merely to complete a process or synchronize this change.

## 2. Language Version and Naming Rules

- If the user's preferred language is not English, first generate the user's preferred-language version (e.g. `AGENTS.zh-CN.md`) for review; after approval, translate and update the formal English version (`AGENTS.md`).
- Preferred-language version files use `AGENTS.<locale>.md`; `<locale>` uses IETF BCP 47 / RFC 5646 tags.
- The formal English version keeps no suffix: `AGENTS.md`; do not create English variants like `AGENTS.en-US.md`.
- If the user's preferred language is English, update `AGENTS.md` directly.
- All headings in the preferred-language version use the target language; mixing Chinese and English headings is forbidden.

## 3. Content Boundary Rules

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

## 4. Rule Audit (Before Any Update)

**An update to an existing `AGENTS.md` starts with auditing the current rules, not translating or polishing them.** Audit every existing rule against the codebase and authoritative documents, classify it as keep / delete / fix, and include the audit result in the confirmation plan.

### Delete Criteria (any one suffices)

1. **The code it references no longer exists.** The module/file/command named by the rule has been deleted or renamed. Verify: `rg "<name>" <project>/src/` returns nothing; `git log --all --oneline --diff-filter=D -- <path>` shows the deletion commit.
2. **The code structure now guarantees it automatically.** The rule was written for a constraint that has since been enforced by a single source of truth (shared constants module, generated types, CI check). Structure-enforced constraints need no agent rule — the rule is noise.
3. **It duplicates an authoritative document.** The rule restates DESIGN, PRD, or a protocol document. The body must not restate DESIGN; keep a reference link instead.
4. **It is a pure implementation fact, not a decision boundary.** Describes what the code does (reads, checks, reports) without constraining agent choice. Read the code to learn these; the rule adds no behavioral constraint.

### Keep Criteria

- **Safety boundaries**: deletion scope limits, single write path for credentials, protected content rules.
- **Behavior constraints**: patterns the agent must follow when modifying (thin handlers, output through OutputService, error-code conventions).
- **User-Supplied Rules section**: never touched.

### Fix Criteria

- Directory table or command list no longer matches the actual structure (added/removed dirs, new command domains).
- Rules conflict with a newer authoritative document or design mechanism (e.g. test layering rewritten by a new design).
- The two language versions drifted; the review version is newer than the formal version — merge both directions and align on the correct content.

### Audit Means

- `rg` / `ls` the referenced code paths — existence check.
- `git log --oneline` on the project — find refactors that deleted or moved the referenced modules.
- Compare each rule against DESIGN and protocol docs — duplicate check.
- Read the actual implementation of the referenced module — decision-boundary check.

## 5. Workflow

### Step 1: Resolve Target

1. If a path is given, use it directly.
2. If a project name is given, locate candidates from `.wopal-space/STRUCTURE.md` and `projects/`.
3. If exactly one project matches, ask the user to confirm the inferred path. If there are multiple exact or near matches, list the candidates and let the user choose.
4. Determine the target file: project-level uses `<project>/AGENTS.md`; directory-level uses `<target-directory>/AGENTS.md`.

**Output**: Target directory, target `AGENTS.md` path, and any path assumption that needs user confirmation.

### Step 2: Collect Context

Prefer reading:

- Target `AGENTS.md` and nearest parent `AGENTS.md`
- `.wopal-space/STRUCTURE.md`
- Related DESIGN; read PRD only when it exists and has not been merged into DESIGN; list `BUSINESS_RULES.md` only when it exists
- Project package / build / test / typecheck / lint configuration
- Key source files in the target scope, only to extract commands and hard constraints, not to create source encyclopedias
- `rules-context` when provided

**Then run the Rule Audit (§4) on every existing rule.**

Common WopalSpace document locations:

```text
docs/products/<name>/docs/PRD*.md
docs/products/<name>/docs/DESIGN*.md
projects/<name>/docs/DESIGN.md
<project repo>/AGENTS.md
```

**Output**: Canonical document list, existing rules summary with audit classification (keep / delete / fix), implementation facts summary, and missing or needs-confirmation information.

### Step 3: Draft Confirmation Plan

Before writing, present the full plan and get explicit user confirmation. The plan must include:

1. Target file path
2. Canonical documents to reference
3. frontmatter `name` and `description` to write or preserve
4. Summary of rules to preserve, add, remove, or compress, with the audit classification from §4
5. Original rules to move to section 6 (rules not fitting sections 1-5), and any rules proposed for deletion with justification
6. Architecture / directory summary plan
7. Development, testing, and verification requirements
8. Where `rules-context` will be merged
9. Compression or split strategy if the result may exceed 300 lines
10. Confirmation that `User-Supplied Rules` will remain unchanged
11. Low-information content to delete or avoid: `N/A` placeholders for nonexistent documents, text duplicated from DESIGN / frontmatter / global regulations, and long directory / API / command catalogs
12. For each structure-related item, whether it is a current fact, a durable target constraint, or a temporary plan

When updating an existing `AGENTS.md`, rules and specifications are immutable after initial creation. Any addition, modification, or deletion must first appear as a proposal in the plan and can only be executed after explicit user confirmation.

For a small update to an existing `AGENTS.md` (no frontmatter change, no target-path change, no scope change, and only 1-2 sections adjusted), the plan may be compressed to: target file, affected sections, preserved rules, proposed additions / deletions / merges, confirmation that `User-Supplied Rules` stay unchanged, and the structure-item classification above.

**Output**: Change plan waiting for user confirmation.

### Step 4: Write After Confirmation

1. If the user's preferred language is not English, first update `AGENTS.<locale>.md` in the same directory. `<locale>` must use an IETF BCP 47 / RFC 5646 tag.
2. After the user confirms the review version, translate and update the formal English `AGENTS.md`. The formal English version must stay semantically aligned with the confirmed version.
3. If the user's preferred language is English, create or update `AGENTS.md` directly. Do not generate English variants such as `AGENTS.en-US.md`.
4. Before confirmation, do not write, overwrite, or reorder the formal English `AGENTS.md`.

**Output**: Updated review-version and / or formal-version paths.

## 6. Quality Checklist

- [ ] Target path is explicit or safely inferred
- [ ] Every existing rule was audited against the codebase and authoritative docs (§4); the audit result was presented in the plan
- [ ] frontmatter `name` and `description` exist, and body content does not repeat frontmatter information
- [ ] frontmatter `description` is single-line, stable, and suitable for `wopal space scan`
- [ ] Target and parent `AGENTS.md` files were considered when present
- [ ] PRD, DESIGN, and `BUSINESS_RULES.md` were referenced when present
- [ ] Nonexistent canonical documents are not written as `N/A` placeholders
- [ ] The body does not repeat DESIGN, frontmatter, or space-wide regulations
- [ ] The architecture section has no architecture diagram, API catalog, command catalog, or directory encyclopedia
- [ ] The architecture directory table lists only paths that currently exist; durable target-structure constraints are not presented as current facts
- [ ] Project-level documents reference subdirectory `AGENTS.md` files instead of copying their details
- [ ] The document targets 80-150 lines and stays under the 300-line hard limit
- [ ] Basic development / testing commands are preserved
- [ ] Rules focus on technical implementation, testing, and verification
- [ ] If the user's preferred language is not English, the user-preferred language version was generated first
- [ ] Canonical documents are referenced instead of copied
- [ ] No rules were extracted from `BUSINESS_RULES.md` into the body
- [ ] Testing section includes a TDD requirement and identifies which logic must be automated vs which boundaries require manual verification only
- [ ] User-preferred language version follows the AGENTS template headings and does not translate template-defined English section headings
- [ ] `User-Supplied Rules` remained unchanged: no additions, modifications, deletions, or reordering (original specification migrations excepted)
- [ ] All non-obsolete original rules were preserved: rules fitting sections 1-5 placed there, remaining rules moved verbatim to section 6; any deleted rule has explicit justification in the plan
- [ ] The full plan was shown and confirmed before writing
- [ ] The formal English version was updated after confirmation when applicable

## 7. Response After Completion

Respond in the user's language with:

1. Updated file path
2. Scope covered
3. Key added / changed rules
4. Any ignored `rules-context` content and why
5. Any missing canonical references or assumptions

## Related

- Space access rules (memory/REGULATIONS write authorization) live in `REGULATIONS.md` templates.
- Project type ownership (`standard` vs `ontology-worktree`) is defined in the space `STRUCTURE.md`.
