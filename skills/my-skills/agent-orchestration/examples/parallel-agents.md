# Parallel Agents Example

## Scenario

Fix multiple GitHub issues in parallel using git worktrees and Codex agents.

## Prerequisites

1. Multiple independent issues to fix
2. Main branch is clean and stable
3. Issues are well-documented with clear acceptance criteria

## Example Issues

- Issue #78: Fix login timeout bug
- Issue #99: Add pagination to user list
- Issue #102: Improve error messages

## Workflow

### Phase 1: Create Worktrees

```bash
# Create worktree for each issue
git worktree add -b fix/issue-78 /tmp/issue-78 main
git worktree add -b fix/issue-99 /tmp/issue-99 main
git worktree add -b fix/issue-102 /tmp/issue-102 main

# Verify worktrees
git worktree list

# Output:
# /Users/sam/coding/wopal/wopal-workspace/projects/web/wopal  abc1234 [main]
# /tmp/issue-78  abc1234 [fix/issue-78]
# /tmp/issue-99  abc1234 [fix/issue-99]
# /tmp/issue-102  abc1234 [fix/issue-102]
```

**Why Worktrees?** Isolated working directories prevent conflicts

### Phase 2: Install Dependencies (If Needed)

```bash
# Install dependencies in each worktree
cd /tmp/issue-78 && npm install
cd /tmp/issue-99 && npm install
cd /tmp/issue-102 && npm install
```

### Phase 3: Launch Parallel Codex Agents

```bash
# Agent 1: Fix issue #78
bash pty:true \
  workdir:/tmp/issue-78 \
  background:true \
  command:"codex exec --full-auto 'Fix issue #78: Login timeout bug. Users are being logged out after 5 minutes instead of 30 minutes. Fix the JWT expiration time in src/auth/jwt.ts. Commit with message: fix: correct JWT expiration to 30 minutes'"

# Returns sessionId: agent1

# Agent 2: Fix issue #99
bash pty:true \
  workdir:/tmp/issue-99 \
  background:true \
  command:"codex exec --full-auto 'Fix issue #99: Add pagination to user list. The /api/users endpoint returns all users. Add query parameters: page (default 1), limit (default 20). Modify src/pages/api/users.ts. Commit with message: feat: add pagination to user list API'"

# Returns sessionId: agent2

# Agent 3: Fix issue #102
bash pty:true \
  workdir:/tmp/issue-102 \
  background:true \
  command:"codex exec --full-auto 'Fix issue #102: Improve error messages. Replace generic \"Error\" messages with specific descriptions in src/utils/errors.ts. Commit with message: refactor: improve error message clarity'"

# Returns sessionId: agent3
```

**Why Codex?** `--full-auto` mode auto-approves changes, perfect for parallel execution

### Phase 4: Monitor All Agents

```bash
# List all running sessions
process-adapter list

# Output:
# agent1 (running) - codex exec --full-auto
# agent2 (running) - codex exec --full-auto
# agent3 (running) - codex exec --full-auto

# Monitor individual agents
process-adapter log agent1 --limit 50
process-adapter log agent2 --limit 50
process-adapter log agent3 --limit 50

# Or use monitor script
./scripts/monitor_session.py agent1 --watch
```

### Phase 5: Track Progress

```bash
# Agent 1 progress
process-adapter log agent1

# Example output:
Reading codebase...
Found JWT config in src/auth/jwt.ts
Current expiration: 300 seconds (5 minutes)
Updating to: 1800 seconds (30 minutes)
✓ Modified src/auth/jwt.ts
✓ Committed: fix: correct JWT expiration to 30 minutes
Done!

# Agent 2 progress
process-adapter log agent2

# Example output:
Analyzing /api/users endpoint...
Adding pagination logic
✓ Modified src/pages/api/users.ts
✓ Added page/limit query parameters
✓ Committed: feat: add pagination to user list API
Done!

# Agent 3 progress
process-adapter log agent3

# Example output:
Scanning error messages...
Found 15 generic error messages
Replacing with specific descriptions
✓ Modified src/utils/errors.ts
✓ Committed: refactor: improve error message clarity
Done!
```

### Phase 6: Verify Fixes

```bash
# Verify Agent 1 fix
cd /tmp/issue-78
git log -1 --oneline
# Output: abc1234 fix: correct JWT expiration to 30 minutes

npm test
# Output: ✓ All tests passed

# Verify Agent 2 fix
cd /tmp/issue-99
git log -1 --oneline
# Output: def5678 feat: add pagination to user list API

npm test
# Output: ✓ All tests passed

# Verify Agent 3 fix
cd /tmp/issue-102
git log -1 --oneline
# Output: ghi9012 refactor: improve error message clarity

npm test
# Output: ✓ All tests passed
```

### Phase 7: Push and Create PRs

```bash
# Push branches
cd /tmp/issue-78 && git push -u origin fix/issue-78
cd /tmp/issue-99 && git push -u origin fix/issue-99
cd /tmp/issue-102 && git push -u origin fix/issue-102

# Create PRs
cd /tmp/issue-78
gh pr create --repo user/wopal \
  --head fix/issue-78 \
  --title "fix: correct JWT expiration to 30 minutes" \
  --body "Fixes #78 - Users were being logged out after 5 minutes instead of 30 minutes."

cd /tmp/issue-99
gh pr create --repo user/wopal \
  --head fix/issue-99 \
  --title "feat: add pagination to user list API" \
  --body "Fixes #99 - Added page and limit query parameters to /api/users endpoint."

cd /tmp/issue-102
gh pr create --repo user/wopal \
  --head fix/issue-102 \
  --title "refactor: improve error message clarity" \
  --body "Fixes #102 - Replaced generic error messages with specific descriptions."
```

### Phase 8: Cleanup Worktrees

```bash
# Remove worktrees after PRs merged
git worktree remove /tmp/issue-78
git worktree remove /tmp/issue-99
git worktree remove /tmp/issue-102

# Delete branches (optional)
git branch -D fix/issue-78
git branch -D fix/issue-99
git branch -D fix/issue-102
```

## Advanced: Batch PR Reviews

After creating PRs, use Codex to review them in parallel:

```bash
# Fetch all PR refs
git fetch origin '+refs/pull/*/head:refs/remotes/origin/pr/*'

# Launch parallel reviewers
bash pty:true workdir:projects/web/wopal background:true \
  command:"codex exec 'Review PR #78. git diff origin/main...origin/pr/78. Provide feedback on code quality and potential issues.'"

bash pty:true workdir:projects/web/wopal background:true \
  command:"codex exec 'Review PR #99. git diff origin/main...origin/pr/99. Provide feedback on code quality and potential issues.'"

bash pty:true workdir:projects/web/wopal background:true \
  command:"codex exec 'Review PR #102. git diff origin/main...origin/pr/102. Provide feedback on code quality and potential issues.'"

# Monitor reviews
process-adapter list
process-adapter log review1
```

## Key Learnings

### What Worked

1. **Worktrees for Isolation** - No conflicts between parallel fixes
2. **Codex --full-auto** - Auto-approves changes, no interruptions
3. **Background Mode** - All agents run simultaneously
4. **Clear Task Descriptions** - Agents knew exactly what to do
5. **Automated Commits** - Consistent commit messages

### What to Improve

1. **Dependency Installation** - Could automate with script
2. **Test Verification** - Could add test requirement to prompts
3. **PR Creation** - Could automate PR creation after agent finishes

## Variations

### Variation 1: Different Agents Per Task

```bash
# Use Claude Code for complex refactor
bash pty:true workdir:/tmp/complex-refactor background:true \
  command:"claude -p 'Complex refactoring task...' --allowedTools 'Bash,Read,Edit,Write'"

# Use Gemini for simple docs update
bash pty:true workdir:/tmp/docs-update \
  command:"gemini 'Update README with new API docs...'"

# Use OpenCode for OpenSpec task
bash pty:true workdir:/tmp/openspec-task background:true \
  command:"OPENCODE_PERMISSION='{\"bash\":{\"*\":\"allow\"},\"edit\":{\"*\":\"allow\"},\"write\":{\"*\":\"allow\"}}' \
  opencode run 'Read openspec/changes/feature-x/tasks.md...'"
```

### Variation 2: Sequential Dependencies

For tasks with dependencies:

```bash
# Task 1: Update database schema
bash pty:true workdir:/tmp/task1 background:true \
  command:"codex exec --full-auto 'Update database schema...'"

# Wait for Task 1 to complete
process-adapter poll task1

# Task 2: Update API (depends on Task 1)
bash pty:true workdir:/tmp/task2 background:true \
  command:"codex exec --full-auto 'Update API to use new schema...'"
```

### Variation 3: Mixed Parallel/Sequential

```bash
# Parallel: Fix independent bugs
bash pty:true workdir:/tmp/bug1 background:true command:"codex exec --full-auto 'Fix bug 1...'"
bash pty:true workdir:/tmp/bug2 background:true command:"codex exec --full-auto 'Fix bug 2...'"

# Sequential: Refactor after bugs fixed
# Wait for bug1 and bug2
process-adapter poll bug1
process-adapter poll bug2

# Then refactor
bash pty:true workdir:projects/web/wopal background:true \
  command:"claude -p 'Refactor authentication module...' --allowedTools 'Bash,Read,Edit,Write'"
```

## Best Practices

### ✅ Do

- Use worktrees for isolated contexts
- Choose agent based on task complexity
- Use background mode for parallel execution
- Monitor all agents with `process-adapter list`
- Verify fixes before creating PRs
- Clean up worktrees when done

### ❌ Don't

- Run multiple agents in same directory
- Forget to install dependencies in worktrees
- Use interactive mode for parallel tasks
- Skip verification step
- Leave worktrees after PRs merged

## Troubleshooting

### Conflict Between Agents

**Symptom:** Two agents modify same file

**Cause:** Tasks not truly independent

**Fix:** Use sequential execution or split tasks more carefully

### Worktree Cleanup Failed

**Symptom:** `git worktree remove` fails

**Cause:** Uncommitted changes or branch checked out elsewhere

**Fix:**
```bash
# Force remove
git worktree remove --force /tmp/issue-78

# Or manually delete
rm -rf /tmp/issue-78
git worktree prune
```

### Agent Stuck

**Symptom:** Agent not making progress

**Cause:** Missing `pty:true` or permission issue

**Fix:**
```bash
# Kill stuck agent
process-adapter kill stuck123

# Restart with correct parameters
bash pty:true workdir:/tmp/issue-78 background:true \
  command:"codex exec --full-auto 'Fix issue...'"
```

## Related Examples

- [Simple Task](simple-task.md) - Quick one-shot tasks
- [OpenSpec Workflow](openspec-workflow.md) - Complex multi-step workflow
