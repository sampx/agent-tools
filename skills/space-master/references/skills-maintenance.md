# Skills Maintenance & Evaluation Guide

This guide defines the lifecycle management, security scanning, installation, removal, and quality evaluation protocols for Wopal skills.

---

## 1. Skill Lifecycle Management (CLI Protocol)

Skills follow a strict lifecycle: `Find` ➔ `Download` ➔ `Scan` ➔ `Install` ➔ `Evaluate` ➔ `Remove`.

```bash
# 1. Search for skills in registries
wopal skills find "<query>"

# 2. Download skill package to review inbox
wopal skills download owner/repo@skill-name

# 3. Perform security scanning (Mandatory before installation)
wopal skills scan skill-name

# 4. Install skill to space runtime
wopal skills install /path/to/skill --force

# 5. Remove skill from space
wopal skills remove <skill-name> --force
```

### Security Scanning Requirements
Never install downloaded skills without running `wopal skills scan`. The scan inspects:
- Malicious command execution patterns.
- Unauthorized data exfiltration or filesystem escape attempts.
- Invalid YAML frontmatter or non-compliant trigger definitions.

---

## 2. Skill Quality Evaluation & Verification Protocol

When evaluating or optimizing existing skills:

### Evaluation Criteria
1. **Trigger Accuracy**: Ensure `description` in frontmatter triggers appropriately on target user queries without over-triggering on adjacent tasks.
2. **Action-Oriented Workflow**: Instructions MUST provide clear, imperative steps rather than verbose explanations.
3. **Resource Bundling**: Deterministic helper scripts should live in `scripts/`, while deep reference documentation lives in `references/`.

### Post-Install / Edit Verification
After installing or editing a skill, Agents MUST perform verification:

```bash
# Verify SKILL.md file existence and readability
ls -la .wopal/skills/<skill-name>/SKILL.md

# Verify skill is registered in active skills list
wopal skills list
```
Never declare skill installation or modification complete without running post-install verification.
