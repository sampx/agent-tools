# Agent Comparison Matrix

## Feature Matrix

| Feature | OpenCode | Claude Code | Gemini | Codex |
|---------|----------|-------------|--------|-------|
| **OpenSpec Integration** | ✅ Native | ⚠️ Manual | ❌ | ❌ |
| **Plan Mode** | ✅ | ✅ | ❌ | ❌ |
| **Headless Mode** | ✅ (`-p`) | ✅ (`-p`) | ✅ (default) | ✅ (`exec`) |
| **Interactive Mode** | ✅ | ✅ | ❌ | ✅ |
| **Parallel Execution** | ✅ | ✅ | ✅ | ✅ |
| **Permission Control** | ✅ Env var | ✅ Flags | N/A | ✅ Flags |
| **Context Management** | ✅ AGENTS.md | ✅ CLAUDE.md | ❌ | ❌ |
| **Git Integration** | ✅ | ✅ | ❌ | ✅ |
| **Test Execution** | ✅ | ✅ | ❌ | ✅ |

## Strengths & Weaknesses

### OpenCode

**Strengths:**
- Native OpenSpec support (reads proposal/design/specs/tasks)
- Non-interactive mode with environment variable permission control
- Fast execution, good for automated workflows
- Supports AGENTS.md for project-specific rules

**Weaknesses:**
- Non-interactive mode auto-rejects permission requests (must pre-authorize)
- Less conversational than Claude Code

**Best For:**
- OpenSpec-driven tasks
- Automated CI/CD workflows
- Headless execution with pre-defined permissions

### Claude Code

**Strengths:**
- Excellent Plan Mode for complex analysis
- Rich interactive capabilities
- Strong code understanding and refactoring
- Supports CLAUDE.md for persistent rules

**Weaknesses:**
- Interactive mode can hang in non-PTY environments
- Slash commands require tmux mode

**Best For:**
- Complex refactors requiring deep analysis
- Tasks needing iterative refinement
- Projects with detailed CLAUDE.md specifications

### Gemini

**Strengths:**
- Fast one-shot responses
- Simple interface (no complex flags)
- Good for quick analysis

**Weaknesses:**
- No persistent context
- No file editing capabilities
- Limited to Q&A and summaries

**Best For:**
- Quick codebase summaries
- One-shot Q&A
- Documentation generation

### Codex

**Strengths:**
- `--full-auto` mode for rapid execution
- Excellent for batch PR reviews
- `--yolo` mode for maximum speed (dangerous)

**Weaknesses:**
- Requires git repository
- `--yolo` mode has no safety rails
- Can be unpredictable in complex scenarios

**Best For:**
- Parallel PR reviews
- Batch issue fixing with worktrees
- Quick experimental tasks

## Execution Modes

### Headless (Non-Interactive)

All agents support headless execution for automation:

```bash
# OpenCode
opencode run "task"

# Claude Code
claude -p "task"

# Gemini
gemini "task"

# Codex
codex exec "task"
```

### Interactive

For complex tasks requiring back-and-forth:

```bash
# OpenCode (interactive)
opencode

# Claude Code (interactive)
claude

# Codex (interactive)
codex
```

**Note**: Interactive mode requires PTY support (use `bash pty:true`).

## Permission Models

### OpenCode

Environment variable (JSON):

```bash
export OPENCODE_PERMISSION='{
  "bash": {"*": "allow"},
  "edit": {"*": "allow"},
  "write": {"*": "allow"}
}'
```

### Claude Code

Command-line flags:

```bash
# Plan mode (read-only)
claude -p "task" --permission-mode plan

# Auto-approve specific tools
claude -p "task" --allowedTools "Bash,Read,Edit"
```

### Codex

Command-line flags:

```bash
# Full auto (sandboxed)
codex exec --full-auto "task"

# YOLO (no sandbox)
codex --yolo "task"
```

## Performance Characteristics

| Metric | OpenCode | Claude Code | Gemini | Codex |
|--------|----------|-------------|--------|-------|
| **Startup Time** | Fast | Medium | Fast | Fast |
| **Response Time** | Fast | Medium | Fast | Fast |
| **Context Window** | Large | Large | Medium | Large |
| **Memory Usage** | Medium | High | Low | Medium |

## Recommended Use Cases

| Scenario | Recommended Agent | Rationale |
|----------|------------------|-----------|
| OpenSpec-driven implementation | OpenCode | Native support, fast execution |
| Complex refactor with planning | Claude Code | Excellent Plan Mode |
| Quick codebase summary | Gemini | Fast, simple, no overhead |
| Parallel PR reviews | Codex | `--full-auto` + worktrees |
| CI/CD automation | OpenCode | Headless + env var permissions |
| Interactive debugging | Claude Code | Rich conversational capabilities |
| Batch issue fixing | Codex | Parallel execution with worktrees |
| Documentation generation | Gemini | Fast one-shot responses |

## Anti-Patterns

### ❌ Don't Use Gemini For:
- File editing tasks
- Multi-step workflows
- Context-dependent tasks

### ❌ Don't Use Codex For:
- Production-critical changes (without review)
- Tasks requiring nuanced judgment
- Non-git directories

### ❌ Don't Use OpenCode Without:
- Pre-configured permissions (non-interactive mode)
- AGENTS.md for project context
- Proper `workdir` to limit context

### ❌ Don't Use Claude Code For:
- Fully automated CI/CD (use OpenCode instead)
- Simple one-shot queries (use Gemini instead)
- Batch operations (use Codex instead)
