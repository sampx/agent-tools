---
trigger: model_decision
description: Defines the format standard for BUSINESS_RULES.md, the boundary of business rule definitions, and the method for extracting business rules from existing project code. For Plan-level rule maintenance mechanisms (when to add/modify/deprecate and how to sync), see the dev-flow skill.
keywords:
  - '业务规则'
  - 'business rules'
  - 'BUSINESS_RULES'
  - '@BR-'
---

# Business Rules — Extraction Work Conventions

> Positioning: the work convention for Agents extracting and maintaining business rules from existing project code/documentation.
> For Plan-level rule maintenance mechanisms (when to add/modify/deprecate, templates, and syncing), see the dev-flow skill.

## 1. Business Rule Definition

**What is a business rule**: a stable, testable domain constraint in the project that is independent of implementation details. It differs from requirements — requirements say "what to do", rules say "how to compute it correctly".

**What is NOT a business rule** (belongs in AGENTS.md):
- Coding conventions, naming conventions, indentation style
- Architectural constraints, tech stack choices
- Test isolation strategy, CI/CD configuration
- Log formats, error handling patterns

**Boundary judgment**: "password must be at least 6 characters" → business rule. "hash passwords with bcryptjs" → technical rule.

## 2. File Specification

### Location

```
projects/{project-name}/docs/BUSINESS_RULES.md
```

One per product, at the same level as REQUIREMENT.md.

### Format

```markdown
# Business Rules — {Product Name}

> Positioning: the single source of truth for business rules. Technical rules belong in AGENTS.md.

---

## {Domain 1}

### BR-001 Rule Name `active`
{1-3 line rule description, in business language}

### BR-002 Rule Name `active`
{same as above}

## {Domain 2}

### BR-003 Rule Name `planned`
{same as above}
```

**Mandatory requirements**:
- One `###` heading per rule, in the format `BR-NNN Rule Name \`status\``
- Status values: `active` (implemented), `planned` (in design), `deprecated` (retired)
- Description is 1-3 lines, in business language, not bound to code paths
- Numbering is continuous across domains (globally incrementing); deprecated numbers are not recycled
- Domain information is expressed via `##` heading grouping, **not encoded into the BR ID**

## 3. Extraction Method

### Source Priority

| Priority | Source | Extraction Strategy |
|--------|------|---------|
| 1 | `REQUIREMENT.md` / `DESIGN.md` | Extract atomic rules from system positioning and functional constraints |
| 2 | Data model documentation | Extract from field constraints, relationship rules, and state machines |
| 3 | Service layer code | Reverse-infer from constants, branching conditions, and guard conditions |
| 4 | Shared constants | Extract from enum definitions and comments |

### Extraction Steps

1. **Read through the source documents** to understand the product domain boundaries
2. **Mark candidate rules**: what constraints must hold true? What judgments can be tested independently?
3. **Atomicize**: 1 rule = 1 constraint. Merge duplicates, split composite rules
4. **De-technicalize**: remove implementation details (function names, file paths), keep business semantics
5. **Mark status**: already implemented in code → `active`; only described in documentation → `planned`
6. **Group**: categorize by domain, expressed with `##` headings

### Common Pattern Recognition

| Code Pattern | Corresponding Business Rule |
|---------|------------|
| Constants `MAX_*`, `LIMIT_*` | Numeric upper bound constraint |
| `if (status === "completed") return error` | State machine transition constraint |
| `role >= ROLE.ADMIN` | Permission judgment rule |
| `score >= 6 ? correct : incorrect` | Scoring threshold rule |
| `.split(/[、，]/)` | Data format/splitting rule |

## 4. Code Reference Convention

Mark rule references in code with `@BR-NNN` comments:

```typescript
// @BR-003 评级升降判定
if (correctCount >= thresholdUp) {
  newLevel = Math.min(currentLevel + 1, 8);
}
```

- Place the comment above the code block where the rule takes effect
- One comment per BR reference
- Mark core rules prominently; auxiliary code is not annotated
