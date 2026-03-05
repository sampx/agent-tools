---
name: agent-orchestration
description: >
  Orchestrate Coding Agents (OpenCode, Claude Code, Gemini, Codex) with OpenSpec-driven workflows.
  Use when you need to: (1) Drive agents with OpenSpec artifacts (proposal/design/specs/tasks),
  (2) Execute tasks in parallel with multiple agents, (3) Monitor and interact with background agent sessions,
  (4) Configure agent permissions and execution modes. This skill is for Wopal to coordinate AI agents as execution units.
---

# Agent Orchestration

Coordinate Coding Agents through process-adapter tool, using OpenSpec artifacts as execution contracts.

## Prerequisites

- ✅ macOS + zsh
- ✅ Node.js 18+
- ✅ @wopal/process installed globally
- ✅ Coding agents installed (opencode, claude, gemini, codex)

## Installation

```bash
# Install @wopal/process tool
cd projects/agent-tools/tools/process
npm install
npm link

# Verify
process-adapter --help
```

## Quick Start

### Launch Agent

```bash
# Start background task
process-adapter start "opencode run 'Implement feature X'" --name my-task

# Output: Started session: <session-id>
```

### Monitor Progress

```bash
# List all sessions
process-adapter list

# View output
process-adapter log <session-id>

# Check status
process-adapter poll <session-id>

# Terminate
process-adapter kill <session-id>

# Clean up
process-adapter remove <session-id>
```

## Core Workflow: OpenSpec-Driven Development

### Pattern: Spec → Worktree → OpenCode → Verify

```
Create OpenSpec → Create worktree (subproject) → OpenCode implements (with tests) → Verify
```

### Step 1: Create OpenSpec Artifacts

```bash
/openspec-new-change "add-feature-x"
# Or use: /openspec-ff-change to fast-forward all artifacts

# Verify completion
openspec status --change add-feature-x
```

### Step 2: Create Worktree (Subproject Level)

**IMPORTANT**: Create worktree in the **subproject** directory, not workspace root.

**Option A: Using worktree.sh script (Recommended)**

```bash
# From workspace root
./scripts/worktree.sh create add-feature-x --subproject agent-tools

# Auto-generates:
# - Worktree directory: .worktrees/agent-tools-add-feature-x/
# - OpenCode config: .worktrees/agent-tools-add-feature-x/opencode.jsonc
# - Plugin path: absolute path to task-notify.js
```

**Option B: Manual creation**

```bash
# Navigate to subproject
cd projects/agent-tools

# Create worktree (will create .worktrees/add-feature-x/)
git worktree add .worktrees/add-feature-x -b add-feature-x

# Verify
ls .worktrees/add-feature-x/
```

**Why subproject level?**
- Worktree shares Git history with subproject
- Isolates changes within subproject context
- Avoids cross-project contamination

**Worktree naming convention**:
- Format: `<subproject>-<branch-name>`
- Branch name `/` replaced with `-` (e.g., `feature/add-auth` → `agent-tools-feature-add-auth`)
- Directory: `.worktrees/<subproject>-<branch-name>/`

### Step 3: Prepare Task Prompt

**IMPORTANT**: Use **absolute paths** for OpenSpec files when running in worktree mode.

**Option A: Absolute path reference (Recommended for worktree mode)**

```bash
# Use absolute path to main repository
WORKSPACE_ROOT="/Users/sam/coding/wopal/wopal-workspace"
OPENSPEC_PATH="$WORKSPACE_ROOT/openspec/changes/add-feature-x"

opencode run "Read $OPENSPEC_PATH/tasks.md and implement all tasks. IMPORTANT: Run npm test and ensure ALL tests pass."
```

**Why absolute paths?**
- OpenCode runs in worktree (subproject directory)
- OpenSpec files are in main repository
- Relative paths won't work across worktree boundary
- `external_directory` permission allows reading from main repository

**Option B: Inline task description**

```bash
# Extract task summary and inline it
cat openspec/changes/add-feature-x/tasks.md | grep -A 100 "Implementation Tasks"

# Prompt template:
```

```
Implement [feature description]. 

TASKS:
[List tasks from tasks.md]

IMPORTANT:
1. Write comprehensive tests
2. Run npm test and ensure ALL tests pass
3. Fix any failing tests before completion

Report:
- What you implemented
- Test results (pass/fail counts)
- Files created/modified
```

### Step 4: Launch OpenCode

**Pattern: Background execution with completion notification**

```bash
# 0. Clean up any residual marker files (CRITICAL)
rm -f /tmp/opencode-done-my-task

# 1. Launch OpenCode in background with task ID
WORKSPACE_ROOT="/Users/sam/coding/wopal/wopal-workspace"
SESSION1=$(process-adapter start \
  "PROCESS_ADAPTER_SESSION_ID=my-task \
   opencode run 'Read $WORKSPACE_ROOT/openspec/changes/add-feature-x/tasks.md and implement all tasks.'" \
  --name feature-x-impl \
  --cwd .worktrees/agent-tools-add-feature-x | awk '{print $3}')

echo "Session ID: $SESSION1"

# 2. Monitor completion (blocks until done)
./scripts/wait-for-opencode.sh my-task 300

# 3. View results
process-adapter log $SESSION1

# 4. Clean up marker file
rm -f /tmp/opencode-done-my-task
```

**Key points**:
- **Task ID** (`PROCESS_ADAPTER_SESSION_ID`): User-defined short name for marker file
- **Session ID** (`$SESSION1`): Auto-generated by process-adapter for management
- **Marker file**: `/tmp/opencode-done-<task-id>` created by plugin when task completes
- **Must clean marker files** before launch to avoid false positives

**Parallel execution example**:

```bash
# 0. Clean up residual marker files
rm -f /tmp/opencode-done-task-1 /tmp/opencode-done-task-2

# 1. Launch multiple tasks in parallel
SESSION1=$(process-adapter start \
  "PROCESS_ADAPTER_SESSION_ID=task-1 opencode run '...'" \
  --name task-1 | awk '{print $3}')

SESSION2=$(process-adapter start \
  "PROCESS_ADAPTER_SESSION_ID=task-2 opencode run '...'" \
  --name task-2 | awk '{print $3}')

# 2. Parallel monitoring with bash background jobs
bash "while [ ! -f /tmp/opencode-done-task-1 ]; do sleep 1; done && echo '✅ Task 1 done'" &
bash "while [ ! -f /tmp/opencode-done-task-2 ]; do sleep 1; done && echo '✅ Task 2 done'" &
wait

# 3. View results
process-adapter log $SESSION1
process-adapter log $SESSION2

# 4. Clean up
rm -f /tmp/opencode-done-task-1 /tmp/opencode-done-task-2
```

**Alternative: Using wait-for-opencode.sh script**

```bash
# Monitor with timeout (5 minutes)
./scripts/wait-for-opencode.sh my-task 300

# Output on success:
# ✅ 任务 my-task 完成

# Output on timeout:
# ❌ 任务 my-task 超时（300s）
# 排查步骤：
#   1. process-adapter list
#   2. process-adapter log <session-id>
#   3. process-adapter poll <session-id>
```

### Step 5: Verify Implementation

```bash
# Navigate to worktree
cd .worktrees/agent-tools-add-feature-x

# Run tests
npm test

# Manual verification
git diff main

# If satisfied, commit in worktree
git add .
git commit -m "feat: add feature x"
```

### Step 6: Cleanup

```bash
# Remove session
process-adapter remove <session-id>

# Remove worktree (after merging or abandoning)
cd projects/agent-tools
git worktree remove .worktrees/add-feature-x
git branch -D add-feature-x
```

## Agent Selection Guide

### Decision Tree

```
Is task defined by OpenSpec artifacts?
├─ Yes → OpenCode (headless mode)
└─ No
   ├─ Quick Q&A/Summary? → Gemini (one-shot)
   ├─ Complex refactor? → Claude Code (Plan Mode)
   └─ Parallel batch work? → Codex (--full-auto)
```

### Detailed Comparison

See [references/agent-comparison.md](references/agent-comparison.md) for:
- Full feature matrix
- Strengths/weaknesses per agent
- Recommended use cases

## Permission Configuration

### OpenCode (Non-Interactive Mode)

**Critical**: Non-interactive mode auto-rejects permission requests. Pre-authorize via environment variable:

```bash
export OPENCODE_PERMISSION='{
  "bash": {"*": "allow"},
  "edit": {"*": "allow"},
  "write": {"*": "allow"},
  "read": {"*": "allow"},
  "external_directory": {"*": "allow"}
}'
opencode run "Your task"
```

**Required permissions for OpenSpec-driven tasks**:
- `bash`, `edit`, `write`, `read` - Basic implementation permissions
- `external_directory` - **Critical for worktree mode**: Allows OpenCode to read OpenSpec files from main repository

**Why `external_directory` is needed**:
- OpenCode runs in worktree (subproject directory)
- OpenSpec files are in main repository (outside worktree)
- Without this permission, OpenCode cannot read tasks.md or other artifacts

### Standard opencode.jsonc Template

For worktree-based OpenSpec tasks, use this configuration (auto-generated by `worktree.sh --subproject`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "/absolute/path/to/projects/agent-tools/plugins/opencode/task-notify.js"
  ],
  "permission": {
    "bash": {"*": "allow"},
    "edit": {"*": "allow"},
    "write": {"*": "allow"},
    "read": {"*": "allow"},
    "external_directory": {"*": "allow"}
  }
}
```

**Key points**:
- Plugin path must be **absolute** (generated by script)
- Permissions use wildcard `{"*": "allow"}` (safe in isolated worktree)
- Auto-generated when using `worktree.sh --subproject`

### Claude Code

Use `--allowedTools` to auto-approve specific tools:

```bash
# Read-only planning
claude -p "Analyze codebase" --permission-mode plan

# Execution with auto-approve
claude -p "Fix bugs" --allowedTools "Bash,Read,Edit,Write"
```

### Permission Scopes

| Scope | Risk Level | Use Case |
|-------|------------|----------|
| `"*"` | High | Trusted sandbox only |
| `"Bash(npm test)"` | Low | Specific commands |
| `"Read,Edit"` | Medium | Code modification |

See [references/permission-configs.md](references/permission-configs.md) for complete patterns.

## Session Management

### Basic Commands

```bash
# List sessions
process-adapter list              # All sessions
process-adapter list --running    # Running only
process-adapter list --finished   # Finished only

# View output
process-adapter log <session-id>                    # Last 200 lines
process-adapter log <session-id> --limit 100        # Last 100 lines
process-adapter log <session-id> --offset 50        # From line 50

# Check status
process-adapter poll <session-id>

# Terminate
process-adapter kill <session-id>     # SIGTERM
process-adapter kill <session-id> --force  # SIGKILL

# Clean up
process-adapter remove <session-id>   # Kill or clear
```

### Monitor Script

```bash
# Using monitor_session.py
python3 scripts/monitor_session.py <session-id>

# With options
python3 scripts/monitor_session.py <session-id> --limit 100
python3 scripts/monitor_session.py <session-id> --filter "Error|Warning"
python3 scripts/monitor_session.py <session-id> --watch  # Continuous monitoring
```

## End-to-End Example: Adding a Stats Command

This example demonstrates the complete workflow from spec to verification.

### Scenario

Add a `stats` command to `@wopal/process` tool that reports session statistics.

### Execution

**1. Create OpenSpec**

```bash
/openspec-new-change "add-stats-command"
# Create: proposal.md, design.md, specs/, tasks.md
```

**2. Create Worktree in Subproject**

```bash
# Using worktree.sh script (auto-generates opencode.jsonc)
./scripts/worktree.sh create add-stats --subproject agent-tools

# Output:
# - Worktree: .worktrees/agent-tools-add-stats/
# - Config: .worktrees/agent-tools-add-stats/opencode.jsonc
# - Workspace root: /Users/sam/coding/wopal/wopal-workspace
```

**3. Prepare Task Prompt**

```bash
# Use absolute path to OpenSpec files
WORKSPACE_ROOT="/Users/sam/coding/wopal/wopal-workspace"
OPENSPEC_PATH="$WORKSPACE_ROOT/openspec/changes/add-stats-command"

# Task prompt:
cat << 'EOF'
Implement a stats command for process-adapter tool.

Read /Users/sam/coding/wopal/wopal-workspace/openspec/changes/add-stats-command/tasks.md for full task details.

IMPORTANT: Run npm test and ensure ALL tests pass.
EOF
```

**4. Launch OpenCode**

```bash
# 0. Clean up marker files
rm -f /tmp/opencode-done-stats-impl

# 1. Launch with task ID
WORKSPACE_ROOT="/Users/sam/coding/wopal/wopal-workspace"
SESSION=$(process-adapter start \
  "PROCESS_ADAPTER_SESSION_ID=stats-impl \
   opencode run 'Read $WORKSPACE_ROOT/openspec/changes/add-stats-command/tasks.md and implement all tasks. Run npm test and ensure ALL tests pass.'" \
  --name stats-impl \
  --cwd .worktrees/agent-tools-add-stats/tools/process | awk '{print $3}')

echo "Session ID: $SESSION"

# 2. Wait for completion (5 minutes timeout)
./scripts/wait-for-opencode.sh stats-impl 300

# 3. View results
process-adapter log $SESSION

# 4. Clean up
rm -f /tmp/opencode-done-stats-impl
```

**5. Verify**

```bash
cd .worktrees/agent-tools-add-stats/tools/process
npm test
process-adapter stats  # Test the new command
```

**6. Cleanup**

```bash
process-adapter remove $SESSION
cd projects/agent-tools
git worktree remove .worktrees/add-stats
```

### Key Learnings

- **Worktree level**: Use `worktree.sh --subproject` to create in subproject with auto-config
- **Task delivery**: Use **absolute paths** to OpenSpec files (main repository)
- **Permissions**: Include `external_directory` permission for worktree mode
- **Completion notification**: Use `PROCESS_ADAPTER_SESSION_ID` + wait-for-opencode.sh
- **Marker files**: Always clean up before launch and after completion

### Pattern 2: Parallel Issue Fixing

```bash
# Create worktrees
git worktree add -b fix/issue-78 /tmp/issue-78 main
git worktree add -b fix/issue-99 /tmp/issue-99 main

# Launch parallel agents
process-adapter start \
  "codex exec --full-auto 'Fix issue #78. Commit and push.'" \
  --name issue-78 \
  --cwd /tmp/issue-78

process-adapter start \
  "codex exec --full-auto 'Fix issue #99. Commit and push.'" \
  --name issue-99 \
  --cwd /tmp/issue-99

# Monitor both
process-adapter list
```

See [examples/parallel-agents.md](examples/parallel-agents.md) for details.

### Pattern 3: Quick Analysis

```bash
# One-shot summary (foreground)
gemini 'Summarize the architecture of this scheduler system.'

# Background analysis
process-adapter start \
  "gemini 'Analyze codebase architecture and generate report.'" \
  --name analysis
```

## Common Pitfalls

### Pitfall 1: Wrong Worktree Level

**Problem**: Creating worktree in workspace root instead of subproject.

```bash
# ❌ Wrong (workspace level)
git worktree add .worktrees/feature-x -b feature-x

# ✅ Correct (subproject level)
cd projects/agent-tools
git worktree add .worktrees/feature-x -b feature-x
```

**Why it matters**: Worktree must share Git history with the subproject being modified.

### Pitfall 2: External File Access

**Problem**: OpenCode tries to read files outside worktree directory.

```bash
# ❌ Wrong (relative path from worktree)
opencode run 'Read openspec/changes/x/tasks.md and implement'
# Result: File not found

# ❌ Wrong (missing external_directory permission)
opencode run 'Read /workspace/openspec/changes/x/tasks.md and implement'
# Result: "permission requested: external_directory" → auto-reject

# ✅ Correct (absolute path + external_directory permission)
# 1. Use worktree.sh --subproject (auto-generates config with external_directory)
./scripts/worktree.sh create feature-x --subproject agent-tools

# 2. Use absolute path in task
opencode run 'Read /Users/sam/workspace/openspec/changes/x/tasks.md and implement'
```

**Solution**: 
1. Use `worktree.sh --subproject` to auto-generate `opencode.jsonc` with `external_directory` permission
2. Use absolute paths to OpenSpec files in main repository

### Pitfall 3: Insufficient Permissions

**Problem**: Using partial permissions causes failures.

```bash
# ❌ Wrong (missing read and external_directory)
OPENCODE_PERMISSION='{"bash":{"*":"allow"},"edit":{"*":"allow"},"write":{"*":"allow"}}'

# ✅ Correct (full permissions for worktree mode)
OPENCODE_PERMISSION='{
  "bash": {"*": "allow"},
  "edit": {"*": "allow"},
  "write": {"*": "allow"},
  "read": {"*": "allow"},
  "external_directory": {"*": "allow"}
}'
```

**Why it matters**: 
- OpenCode needs `bash`, `edit`, `write` for implementation
- OpenCode needs `read` and `external_directory` to access OpenSpec files from main repository

### Pitfall 4: Marker File Residue

**Problem**: Residual marker files cause false completion detection.

```bash
# ❌ Wrong (forgot to clean up marker files)
# Previous run left /tmp/opencode-done-task-1
# New run immediately thinks task is done

# ✅ Correct (always clean before launch)
rm -f /tmp/opencode-done-task-1
SESSION=$(process-adapter start "PROCESS_ADAPTER_SESSION_ID=task-1 ..." | awk '{print $3}')
./scripts/wait-for-opencode.sh task-1

# ✅ Correct (clean after completion)
rm -f /tmp/opencode-done-task-1
```

**Why it matters**: Marker files persist across sessions, causing immediate false positives if not cleaned.

### Pitfall 5: OpenCode Crash (No Completion Notification)

**Problem**: OpenCode crashes without triggering `session.idle`, marker file never created.

```bash
# Task hangs forever
./scripts/wait-for-opencode.sh my-task  # Never completes

# ✅ Correct (use timeout + check session status)
./scripts/wait-for-opencode.sh my-task 300  # 5 minutes timeout

# On timeout, script outputs:
# ❌ 任务 my-task 超时（300s）
# 排查步骤：
#   1. process-adapter list
#   2. process-adapter log <session-id>
#   3. process-adapter poll <session-id>
```

**Why it matters**: Non-normal exits (crashes, kills) don't trigger completion plugin, causing infinite waits.

## PTY Mode Limitations

**Important**: PTY (interactive) mode is **limited on macOS** due to system constraints.

### What Doesn't Work

- ❌ Interactive input via `process-adapter write` (macOS PTY device limit)
- ❌ Interactive commands requiring real-time input (vim, top, etc.)

### What Still Works

- ✅ All background task execution
- ✅ All monitoring and management commands
- ✅ All coding agents with pre-configured permissions

### Workarounds

1. **Pre-configure permissions** (recommended):
   ```bash
   OPENCODE_PERMISSION='{"bash":{"*":"allow"},"edit":{"*":"allow"},"write":{"*":"allow"}}' opencode run "task"
   ```

2. **Use auto-confirm flags**:
   ```bash
   npm install --yes
   git commit -m "message"  # Avoid opening editor
   ```

3. **Use tmux for interactive sessions**:
   ```bash
   tmux new-session -d -s agent1 "opencode"
   tmux attach -t agent1  # Attach to interact
   ```

## Troubleshooting

### Agent Hangs

**Cause**: Process not properly backgrounded

**Fix**: Always use `process-adapter start`:
```bash
# ✅ Correct
process-adapter start "opencode run 'task'"

# ❌ Wrong (will block terminal)
opencode run 'task'
```

### Permission Rejected (OpenCode)

**Cause**: Non-interactive mode auto-rejects permission requests

**Fix**: Use `OPENCODE_PERMISSION` environment variable (see Permission Configuration)

### Session Not Found

**Cause**: Invalid sessionId or session expired

**Fix**: List sessions with `process-adapter list` to find valid IDs

### Log Output Truncated

**Cause**: Long output exceeds buffer (10MB auto-truncation)

**Fix**: Use offset/limit:
```bash
process-adapter log <session-id> --limit 100 --offset 50
```

### PTY Mode Falls Back to Normal

**Expected**: On macOS, PTY mode often falls back to normal spawn mode

**Impact**: Only affects `write()` command, all other functionality works

**Action**: No action needed, this is expected behavior

See [references/troubleshooting.md](references/troubleshooting.md) for complete guide.

## Resources

### Scripts
- `scripts/worktree.sh` - Git worktree management (supports `--subproject` for auto-config)
- `scripts/wait-for-opencode.sh` - Monitor OpenCode task completion with timeout
- `scripts/monitor_session.py` - Monitor agent session progress with filtering
- `scripts/prepare_openspec_context.sh` - Generate execution summary from OpenSpec artifacts

### References
- `references/agent-comparison.md` - Detailed agent feature matrix
- `references/permission-configs.md` - Complete permission configuration patterns
- `references/troubleshooting.md` - Common issues and solutions

### Examples
- `examples/simple-task.md` - Basic task execution
- `examples/openspec-workflow.md` - Complete OpenSpec-driven workflow
- `examples/parallel-agents.md` - Parallel agent coordination

## Key Learnings

1. **Use process-adapter** - Provides reliable background process management
2. **Pre-authorize permissions** - Non-interactive mode rejects permission requests
3. **Context boundary matters** - Use `--cwd` to run agents in target directory
4. **OpenSpec as contract** - Artifacts serve as execution specification
5. **Use absolute paths** - Worktree mode requires absolute paths to main repository files
6. **Enable external_directory** - Critical for worktree mode to access OpenSpec files
7. **Completion notification** - Use `PROCESS_ADAPTER_SESSION_ID` + wait-for-opencode.sh
8. **Clean marker files** - Always clean before launch and after completion
9. **Handle timeouts** - Use timeout in wait-for-opencode.sh to detect crashes
10. **Parallel is powerful** - Multiple agents can work simultaneously on isolated contexts
11. **PTY has limits** - macOS PTY limitations, use pre-configuration instead
