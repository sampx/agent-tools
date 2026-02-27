---
description: Create a new commit for uncommitted changes
---

Create a new commit for all of our uncommitted changes.

1. **Check Context First**: Run `git status && git diff HEAD && git status --porcelain`. 
    - ⚠️ **CRITICAL RULE**: If you are in the `ai-toolbox` root directory (Main repo), NEVER run `git add .` or `git commit -a`. You MUST selectively `git add <specific_files>` to avoid accidentally staging submodule updates (like `projects/web/wopal` or `projects/python/flex-scheduler`) unless explicitly requested by the user to "snapshot" a submodule.
    - If you are inside a business submodule (e.g., inside `projects/web/wopal`), you may use `git add .` normally to commit changes for that specific product.

2. Add an atomic commit message with an appropriate message.
3. Add a tag such as "feat", "fix", "docs", "chore" etc. that reflects our work.
4. If in a submodule, remind the user that this is a local/remote submodule commit, and ask if they also want to update the main repository's snapshot pointer now (only do so if they are releasing a milestone).
