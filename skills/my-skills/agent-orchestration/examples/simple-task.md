# Simple Task Example

## Scenario

Quickly summarize the architecture of a Python project using Gemini.

## Task

"Summarize the architecture of the flex-scheduler project, focusing on the core components and their interactions."

## Execution

### Step 1: Choose Agent

**Decision:** Use Gemini for quick one-shot summary

**Rationale:** 
- Task is simple Q&A
- No file editing needed
- Fast response required

### Step 2: Launch Agent

```bash
# Foreground (blocking)
gemini 'Summarize the architecture of this scheduler system, focusing on core components and their interactions. Be concise (max 300 words).'

# Background (non-blocking)
process-adapter start \
  "gemini 'Summarize the architecture of this scheduler system, focusing on core components and their interactions. Be concise (max 300 words).'" \
  --name summary-task
```

### Step 3: Monitor Output (Background Mode)

```bash
# Check session status
process-adapter poll <session-id>

# View output
process-adapter log <session-id>

# Example output:
The flex-scheduler is a Python-based task scheduling system with three core components:

1. **Scheduler Engine** - Manages task queue and execution timing
2. **Task Runner** - Executes tasks with configurable retry logic
3. **State Manager** - Persists task state to database

**Data Flow:**
User submits task → Scheduler queues task → Runner executes → State Manager records result

**Key Design:**
- Plugin-based architecture for extensibility
- Async I/O for concurrent task execution
- PostgreSQL for state persistence
```

### Step 4: Follow-up (Optional)

If more detail needed:

```bash
# Foreground
gemini 'What design patterns are used in the Scheduler Engine? List 3 patterns with examples.'

# Background
process-adapter start \
  "gemini 'What design patterns are used in the Scheduler Engine? List 3 patterns with examples.'" \
  --name followup
```

## Alternative Agents

### Using Claude Code (More Detailed)

```bash
# Foreground
claude -p 'Analyze the architecture of this scheduler system. Identify: 1) Core components, 2) Design patterns, 3) Data flow. Provide a structured summary.'

# Background
process-adapter start \
  "claude -p 'Analyze the architecture of this scheduler system. Identify: 1) Core components, 2) Design patterns, 3) Data flow. Provide a structured summary.'" \
  --name detailed-analysis
```

**Pros:** More detailed analysis, better code understanding
**Cons:** Slower, more verbose

### Using OpenCode (Project-Aware)

```bash
# Foreground (with pre-configured permissions)
OPENCODE_PERMISSION='{"bash":{"*":"allow"},"edit":{"*":"allow"},"write":{"*":"allow"}}' \
  opencode run 'Read AGENTS.md and summarize the architecture based on the project context.'

# Background
process-adapter start \
  "OPENCODE_PERMISSION='{\"bash\":{\"*\":\"allow\"},\"edit\":{\"*\":\"allow\"},\"write\":{\"*\":\"allow\"}}' opencode run 'Read AGENTS.md and summarize the architecture based on the project context.'" \
  --name project-analysis
```

**Pros:** Reads project-specific rules (AGENTS.md)
**Cons:** Requires AGENTS.md to exist

## Best Practices

### ✅ Do

- Keep prompts specific and concise
- Choose agent based on task complexity
- Use Gemini for simple Q&A
- Use background mode for longer tasks

### ❌ Don't

- Use Gemini for file editing tasks
- Over-specify prompts (Gemini works best with concise instructions)
- Block terminal with long-running tasks (use `process-adapter start`)

## When to Use This Pattern

Use this simple task pattern when:

- Quick codebase summary needed
- One-shot Q&A questions
- No file modifications required
- Fast response preferred
- Simple analysis tasks

## Related Examples

- [OpenSpec Workflow](openspec-workflow.md) - Complex multi-step workflow
- [Parallel Agents](parallel-agents.md) - Running multiple agents simultaneously
