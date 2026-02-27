---
description: Create a snapshot commit in the main repo referencing the latest submodule status.
---

Create an architecture-level milestone snapshot for the specified submodule.
This command is used when a submodule (e.g., `projects/web/wopal`) has reached a milestone (all local changes are committed and pushed), and we now need the main `ai-toolbox` monorepo to recognize and save this updated pointer.

1.  **Ask for Target:** Ask the user "Which submodule do you want to sync/snapshot?" (e.g., `wopal`, `flex-scheduler`, or `agent-tools`). Ask which branch they want to snapshot (default to `main`).
2.  **Verify Submodule:**
    Navigate into the corresponding directory. For example: `cd projects/web/wopal`.
3.  **Ensure Branch & Clean:**
    Run `git checkout <branch>` to ensure we are no longer in `detached HEAD`.
    Run `git pull origin <branch>` to make sure the submodule is matched cleanly with the remote.
    Check if the working tree is clean (`git status`). If uncommitted local changes exist inside the submodule, prompt the user to use `/commit` locally first.
4.  **Update Main Repository Pointer:**
    Navigate back to the monorepo root: `cd <root_dir>`.
    Update the submodule state in Git by running: `git add <path/to/submodule>` (e.g. `git add projects/web/wopal`). Note: Do NOT add trailing slashes. 
5.  **Commit the Snapshot:**
    Run `git commit -m "chore: snapshot update <submodule> to latest milestone"`
    Run `git push` to save this pointer record into `ai-toolbox`.
6.  **Confirm:** Let the user know the new milestone reference pointer for `<submodule>` is successfully locked.
