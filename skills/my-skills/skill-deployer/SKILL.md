---
name: skill-deployer
description: Deploy AI agent skills from local source directories to specified agent skill directories. Use when user asks to deploy a skill, install a skill, copy a skill to an agent directory, or publish skills to different AI agents (Claude Code, OpenCode, etc.).
---

# Skill Deployer

Deploy AI agent skills from source to target directories.

## Quick Start

```bash
# Deploy skill (copy mode)
python3 scripts/deploy-skill.py --source /path/to/my-skill --dest .agents/skills/

# Deploy with symlink (for development)
python3 scripts/deploy-skill.py --source /path/to/my-skill --dest .agents/skills/ --symlink

# List available skills in a directory
python3 scripts/list-skills.py --dir ~/my-skills
```

## Target Directories

| Agent | Project Level | Global Level |
|-------|---------------|--------------|
| Universal | `.agents/skills/` | - |
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| OpenCode | `.opencode/skills/` | `~/.config/opencode/skills/` |
| Codex | - | `~/.codex/skills/` |

## Scripts

### deploy-skill.py

Deploy a skill from source to target directory.

```bash
python3 scripts/deploy-skill.py -s <source> -d <target> [options]
```

**Options:**
- `--source, -s` - Source directory containing SKILL.md (required)
- `--dest, -d` - Target directory (required)
- `--symlink, -l` - Create symlink instead of copying
- `--force, -f` - Overwrite existing skill
- `--name, -n` - Custom skill name (defaults to source directory name)

### list-skills.py

List all skills in a directory.

```bash
python3 scripts/list-skills.py --dir <path> [--format json]
```

## .skillignore

Skills can include a `.skillignore` file to exclude files from deployment (similar to .gitignore):

```
tests/
logs/
__pycache__/
*.pyc
```

## Notes

- Use `--symlink` during development for live updates
- Use copy mode (default) for production deployment
- Source must contain a valid SKILL.md file
