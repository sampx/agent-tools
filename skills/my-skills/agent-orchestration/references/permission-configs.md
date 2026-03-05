# Permission Configuration Patterns

## Overview

Coding agents need permission configuration to perform file operations, run commands, and make changes. Different agents use different permission models.

## OpenCode Permission Configuration

### Environment Variable (Recommended)

OpenCode reads permissions from `OPENCODE_PERMISSION` environment variable in non-interactive mode:

```bash
export OPENCODE_PERMISSION='{
  "bash": {"*": "allow"},
  "edit": {"*": "allow"},
  "write": {"*": "allow"}
}'
```

### Permission Scopes

#### Full Access (High Risk)

```json
{
  "bash": {"*": "allow"},
  "edit": {"*": "allow"},
  "write": {"*": "allow"}
}
```

**Use Case**: Trusted sandbox, OpenSpec-driven tasks with full implementation

**Risk**: Agent can execute any command and modify any file

#### Specific Commands (Low Risk)

```json
{
  "bash": {
    "npm test": "allow",
    "npm run lint": "allow",
    "git status": "allow"
  },
  "read": {"*": "allow"}
}
```

**Use Case**: Read-only analysis with specific test commands

**Risk**: Low, limited to explicitly allowed commands

#### File Type Restrictions

```json
{
  "edit": {
    "*.ts": "allow",
    "*.tsx": "allow",
    "*.json": "allow"
  },
  "write": {
    "src/**": "allow"
  }
}
```

**Use Case**: Restrict modifications to specific file types or directories

**Risk**: Medium, prevents accidental modification of config files

### Common Patterns

#### Pattern 1: OpenSpec Implementation

```bash
export OPENCODE_PERMISSION='{
  "bash": {"*": "allow"},
  "edit": {"*": "allow"},
  "write": {"*": "allow"}
}'

opencode run 'Read openspec/changes/add-auth/tasks.md and implement all tasks.'
```

**Rationale**: Full permissions needed for implementation

#### Pattern 2: Read-Only Analysis

```bash
export OPENCODE_PERMISSION='{
  "bash": {
    "npm test": "allow",
    "git *": "allow"
  },
  "read": {"*": "allow"}
}'

opencode run 'Analyze the authentication module and suggest improvements.'
```

**Rationale**: No write permissions, only analysis

#### Pattern 3: Test-Driven Development

```bash
export OPENCODE_PERMISSION='{
  "bash": {
    "npm test": "allow",
    "npm run lint": "allow"
  },
  "edit": {
    "*.test.ts": "allow",
    "src/**/*.ts": "allow"
  },
  "write": {
    "*.test.ts": "allow"
  }
}'

opencode run 'Write tests for the UserService class.'
```

**Rationale**: Limited to source and test files

## Claude Code Permission Configuration

### Command-Line Flags

Claude Code uses `--allowedTools` and `--permission-mode` flags:

```bash
# Plan mode (read-only)
claude -p "task" --permission-mode plan

# Auto-approve specific tools
claude -p "task" --allowedTools "Bash,Read,Edit,Write"
```

### Permission Modes

#### Plan Mode

```bash
claude -p "Analyze architecture" --permission-mode plan
```

**Use Case**: Read-only analysis, planning, review

**Behavior**: Auto-approves read operations, asks for write operations

#### Accept Edits

```bash
claude -p "Fix bugs" --permission-mode acceptEdits
```

**Use Case**: Implementation tasks

**Behavior**: Auto-approves edits, asks for Bash commands

### Tool Allowlist

```bash
# Minimal (read-only)
--allowedTools "Read"

# Standard development
--allowedTools "Bash,Read,Edit"

# Full access
--allowedTools "Bash,Read,Edit,Write"
```

### Bash Command Scoping

```bash
# Specific commands only
--allowedTools "Bash(npm test),Bash(git status),Read,Edit"

# Pattern matching
--allowedTools "Bash(npm *),Read,Edit"
```

### Common Patterns

#### Pattern 1: Code Review

```bash
claude -p "Review PR #42" \
  --permission-mode plan \
  --allowedTools "Bash(git diff *),Bash(git log *),Read"
```

#### Pattern 2: Bug Fix

```bash
claude -p "Fix login bug" \
  --permission-mode acceptEdits \
  --allowedTools "Bash,Read,Edit"
```

#### Pattern 3: Refactoring

```bash
claude -p "Refactor UserService" \
  --permission-mode acceptEdits \
  --allowedTools "Bash(npm test),Bash(npm run lint),Read,Edit,Write"
```

## Codex Permission Configuration

### Execution Flags

Codex uses execution flags for permission control:

```bash
# Sandbox with auto-approve
codex exec --full-auto "task"

# No sandbox, no approvals (dangerous)
codex --yolo "task"
```

### Modes

#### Full Auto (Recommended)

```bash
codex exec --full-auto "Add dark mode toggle"
```

**Behavior**:
- Runs in sandbox
- Auto-approves changes within workspace
- Safe for most tasks

**Use Case**: Standard development tasks

#### YOLO Mode (High Risk)

```bash
codex --yolo "Refactor authentication"
```

**Behavior**:
- No sandbox
- No approval prompts
- Maximum speed

**Use Case**: Experimental tasks, trusted environments only

### Common Patterns

#### Pattern 1: Feature Implementation

```bash
codex exec --full-auto "Add user profile page"
```

#### Pattern 2: Parallel PR Reviews

```bash
codex exec --full-auto "Review PR #86. git diff origin/main...origin/pr/86"
```

#### Pattern 3: Emergency Fix (YOLO)

```bash
codex --yolo "Fix critical security vulnerability in auth"
```

## Security Best Practices

### 1. Principle of Least Privilege

**❌ Bad**: Grant full permissions for read-only tasks

```bash
# Don't do this
export OPENCODE_PERMISSION='{"bash":{"*":"allow"},"edit":{"*":"allow"}}'
opencode run "Summarize the codebase"
```

**✅ Good**: Grant minimal permissions

```bash
# Do this instead
export OPENCODE_PERMISSION='{"read":{"*":"allow"}}'
opencode run "Summarize the codebase"
```

### 2. Scope Bash Commands

**❌ Bad**: Allow all Bash commands

```bash
--allowedTools "Bash,Read,Edit"
```

**✅ Good**: Allow specific commands

```bash
--allowedTools "Bash(npm test),Bash(git status),Read,Edit"
```

### 3. Protect Sensitive Files

**❌ Bad**: Allow editing all files

```bash
export OPENCODE_PERMISSION='{"edit":{"*":"allow"}}'
```

**✅ Good**: Exclude sensitive files

```bash
export OPENCODE_PERMISSION='{
  "edit": {
    "*": "allow",
    ".env": "deny",
    "secrets/**": "deny"
  }
}'
```

### 4. Use Worktrees for Parallel Work

**❌ Bad**: Run multiple agents in same directory

```bash
codex --yolo "Fix issue #78" &
codex --yolo "Fix issue #99" &
```

**✅ Good**: Use git worktrees

```bash
git worktree add /tmp/issue-78 fix/issue-78
codex --yolo "Fix issue #78" --workdir /tmp/issue-78
```

## Troubleshooting

### Permission Denied Errors

**Symptom**: Agent fails with "Permission denied"

**Cause**: Missing permission configuration

**Fix**: Add appropriate permissions:

```bash
# OpenCode
export OPENCODE_PERMISSION='{"bash":{"*":"allow"},"edit":{"*":"allow"}}'

# Claude Code
--allowedTools "Bash,Read,Edit"
```

### Agent Asks Too Many Questions

**Symptom**: Agent prompts for approval frequently

**Cause**: Permissions too restrictive

**Fix**: Broaden permissions or use auto-approve flags:

```bash
# OpenCode: Use wildcards
export OPENCODE_PERMISSION='{"bash":{"*":"allow"}}'

# Claude Code: Use acceptEdits mode
--permission-mode acceptEdits
```

### Accidental File Modification

**Symptom**: Agent modified unintended files

**Cause**: Permissions too broad

**Fix**: Scope permissions to specific paths:

```bash
export OPENCODE_PERMISSION='{
  "edit": {
    "src/**": "allow",
    "tests/**": "allow"
  }
}'
```
