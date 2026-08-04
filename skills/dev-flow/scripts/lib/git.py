"""Git operations wrapper for dev-flow.

Provides subprocess-based Git operations with clear error handling.
All functions work with an explicit repo_path to support multi-repo scenarios.
"""

import subprocess
from pathlib import Path

from lib.logging import log_error


def is_repo_dirty(repo_path: str, ignore_paths: list[str] | None = None) -> bool:
    """Check if git repo has uncommitted changes.

    Args:
        repo_path: Path to git repository root
        ignore_paths: Optional list of absolute paths to exclude from dirty check.
            When the only dirty files are in this list, returns False.

    Returns:
        True if repo has uncommitted changes (staged or unstaged)
        False if repo is clean, path is not a valid repo, or only ignored files are dirty
    """
    dirty_lines = get_dirty_lines(repo_path)
    if not dirty_lines:
        return False
    if not ignore_paths:
        return True

    # Resolve both repo and ignore paths to canonical form (handles macOS /var→/private/var)
    repo = Path(repo_path).resolve()
    ignored_resolved: set[str] = set()
    for ip in ignore_paths:
        ignored_resolved.add(str(Path(ip).resolve()))

    # Filter out dirty lines whose resolved path matches an ignored path
    for line in dirty_lines:
        file_path = line[3:].strip()
        full_path = str((repo / file_path).resolve())
        if full_path not in ignored_resolved:
            return True
    return False


def get_dirty_lines(repo_path: str) -> list[str]:
    """Run git status --porcelain and return dirty file lines.

    Args:
        repo_path: Path to git repository root

    Returns:
        List of non-empty porcelain output lines. Empty list if clean or invalid.
    """
    result = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=repo_path,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return []
    return [line for line in result.stdout.split("\n") if line.strip()]


def get_current_branch(repo_path: str) -> str:
    """Get current branch name.

    Args:
        repo_path: Path to git repository root

    Returns:
        Branch name, or empty string if not on a branch (detached HEAD)
        or path is not a valid repo
    """
    result = subprocess.run(
        ["git", "branch", "--show-current"],
        cwd=repo_path,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def get_remote_url(repo_path: str) -> str:
    """Get remote URL for origin.

    Args:
        repo_path: Path to git repository root

    Returns:
        Remote URL string, or empty string if no origin configured
    """
    result = subprocess.run(
        ["git", "remote", "get-url", "origin"],
        cwd=repo_path,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def get_branch_head(repo_path: str, branch: str) -> str:
    """Get HEAD commit SHA of a branch.

    Args:
        repo_path: Path to git repository root
        branch: Branch name (e.g. "main", "space/wopal-workspace")

    Returns:
        Full commit SHA, or empty string if branch does not exist
    """
    result = subprocess.run(
        ["git", "rev-parse", branch],
        cwd=repo_path,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return ""
    return result.stdout.strip()


def commit_all(repo_path: str, message: str) -> bool:
    """Commit all changes with given message.

    Args:
        repo_path: Path to git repository root
        message: Commit message

    Returns:
        True if commit succeeded (or nothing to commit)
        False if commit failed
    """
    # Stage all changes
    subprocess.run(
        ["git", "add", "-A"],
        cwd=repo_path,
        capture_output=True,
    )

    # Commit
    result = subprocess.run(
        ["git", "commit", "-m", message],
        cwd=repo_path,
        capture_output=True,
        text=True,
    )

    # Git returns 1 if nothing to commit, which is acceptable
    # Return True for success (0) or nothing to commit
    return result.returncode == 0 or "nothing to commit" in result.stdout


def push(repo_path: str) -> bool:
    """Push current branch to remote.

    Args:
        repo_path: Path to git repository root

    Returns:
        True if push succeeded (or already up to date)
        False if push failed
    """
    branch = get_current_branch(repo_path)
    if not branch:
        return False  # Can't push detached HEAD

    result = subprocess.run(
        ["git", "push", "origin", branch],
        cwd=repo_path,
        capture_output=True,
        text=True,
    )

    return result.returncode == 0


def is_git_repo(path: str) -> bool:
    """Check if path is inside a git repository.

    Args:
        path: Any path to check

    Returns:
        True if path is inside a git repo
    """
    result = subprocess.run(
        ["git", "rev-parse", "--is-inside-work-tree"],
        cwd=path,
        capture_output=True,
        text=True,
    )
    return result.returncode == 0 and result.stdout.strip() == "true"


def get_repo_root(path: str) -> str:
    """Get repository root directory from any path inside it.

    Args:
        path: Any path inside a git repo

    Returns:
        Absolute path to repo root, or empty string if not in a repo
    """
    result = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        cwd=path,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def get_common_git_dir(path: str) -> str:
    """Get the common git directory (shared across worktrees).

    For a main working tree this is .git/; for a worktree it resolves
    to the main repo's .git/ directory.  Comparing this value across
    two paths is a reliable way to test whether they belong to the
    same underlying repository.

    Args:
        path: Any path inside a git repo

    Returns:
        Absolute path to the common git directory, or empty string
    """
    result = subprocess.run(
        ["git", "rev-parse", "--git-common-dir"],
        cwd=path,
        capture_output=True,
        text=True,
    )
    raw = result.stdout.strip()
    if not raw:
        return ""
    # git rev-parse --git-common-dir returns a path relative to the repo working
    # directory.  Resolve it against cwd (the `path` argument) so it becomes
    # absolute regardless of the process CWD.
    common_dir = (Path(path) / raw).resolve()
    return str(common_dir)


def is_commit_in_remote(repo_path: str, remote: str = "origin", branch: str = "main") -> bool:
    """Check if HEAD commit is already pushed to remote branch.

    Args:
        repo_path: Path to git repository root
        remote: Remote name (default: origin)
        branch: Branch name (default: main)

    Returns:
        True if HEAD is ancestor of remote/branch (already pushed)
        False if HEAD is not pushed yet or cannot determine
    """
    # Fetch remote first (silent)
    subprocess.run(
        ["git", "fetch", remote, branch],
        cwd=repo_path,
        capture_output=True,
    )

    # Check if HEAD is ancestor of remote/branch
    result = subprocess.run(
        ["git", "merge-base", "--is-ancestor", "HEAD", f"{remote}/{branch}"],
        cwd=repo_path,
        capture_output=True,
    )

    # returncode 0 = HEAD is ancestor (already pushed)
    return result.returncode == 0


def is_branch_merged(branch: str, target: str, repo_path: str = ".") -> bool:
    """Check if branch has been merged into target.

    Returns True if all commits from branch are reachable from target.
    """
    result = subprocess.run(
        ["git", "merge-base", "--is-ancestor", branch, target],
        cwd=repo_path,
        capture_output=True,
    )
    return result.returncode == 0


def get_relative_path(file_path: str, base_path: str) -> str:
    """Get relative path from base_path to file_path.

    Args:
        file_path: Absolute file path
        base_path: Base directory path

    Returns:
        Relative path string
    """
    file = Path(file_path).resolve()
    base = Path(base_path).resolve()

    try:
        return str(file.relative_to(base))
    except ValueError:
        # file_path is not relative to base_path
        return str(file)


def merge_branch(
    repo_path: str,
    branch: str,
    target: str = 'main',
    no_ff: bool = True,
) -> tuple[bool, list[str]]:
    """Merge branch into target branch.

    Args:
        repo_path: Path to git repository root
        branch: Source branch to merge
        target: Target branch to merge into (default: main)
        no_ff: Use --no-ff for merge commit (default: True)

    Returns:
        Tuple of (success, conflict_files).
        success: True if merge succeeded without conflicts.
        conflict_files: List of files with conflicts (empty if success).
    """
    # Ensure we are on target branch
    subprocess.run(
        ["git", "checkout", target],
        cwd=repo_path,
        capture_output=True,
    )

    # Build merge command
    cmd = ["git", "merge"]
    if no_ff:
        cmd.append("--no-ff")
    cmd.append(branch)

    result = subprocess.run(
        cmd,
        cwd=repo_path,
        capture_output=True,
        text=True,
    )

    if result.returncode == 0:
        return (True, [])

    # Merge failed — check for conflicts
    diff_result = subprocess.run(
        ["git", "diff", "--name-only", "--diff-filter=U"],
        cwd=repo_path,
        capture_output=True,
        text=True,
    )
    conflict_files = [
        f for f in diff_result.stdout.strip().split('\n') if f
    ]

    if conflict_files:
        # Abort the merge to leave repo in clean state
        subprocess.run(
            ["git", "merge", "--abort"],
            cwd=repo_path,
            capture_output=True,
        )
        return (False, conflict_files)

    # Non-conflict failure
    subprocess.run(
        ["git", "merge", "--abort"],
        cwd=repo_path,
        capture_output=True,
    )
    return (False, [])


def branch_exists(repo_path: str, branch: str) -> bool:
    """Check if a local branch exists.

    Args:
        repo_path: Path to git repository root
        branch: Branch name to check

    Returns:
        True if branch exists locally
    """
    result = subprocess.run(
        ["git", "branch", "--list", branch],
        cwd=repo_path,
        capture_output=True,
        text=True,
    )
    return bool(result.stdout.strip())


def delete_branch(repo_path: str, branch: str, force: bool = False) -> bool:
    """Delete a local branch.

    Args:
        repo_path: Path to git repository root
        branch: Branch name to delete
        force: Use -D instead of -d

    Returns:
        True if deletion succeeded
    """
    flag = "-D" if force else "-d"
    result = subprocess.run(
        ["git", "branch", flag, branch],
        cwd=repo_path,
        capture_output=True,
        text=True,
    )
    return result.returncode == 0


def push_branch(repo_path: str, branch: str = 'main') -> bool:
    """Push specified branch to origin.

    Args:
        repo_path: Path to git repository root
        branch: Branch name to push (default: main)

    Returns:
        True if push succeeded
    """
    result = subprocess.run(
        ["git", "push", "origin", branch],
        cwd=repo_path,
        capture_output=True,
        text=True,
    )
    return result.returncode == 0


def has_uncommitted_changes(repo_path: str) -> bool:
    """Check if repo has uncommitted changes. Alias for is_repo_dirty.

    Args:
        repo_path: Path to git repository root

    Returns:
        True if repo has uncommitted changes
    """
    return is_repo_dirty(repo_path)


def commit_paths(repo_root: str, paths: list[str], message: str) -> bool:
    """Stage and commit specific paths in a given repo.

    Only stages the listed paths (not git add -A), then commits.
    Returns True if commit succeeded or there was nothing to commit.

    Args:
        repo_root: Path to git repository root
        paths: List of repo-relative paths to stage and commit
        message: Commit message

    Returns:
        True if commit succeeded or nothing to commit
    """
    if not paths:
        return True

    # Stage specific paths
    add_result = subprocess.run(
        ["git", "add", *paths],
        cwd=repo_root,
        capture_output=True,
        text=True,
    )
    if add_result.returncode != 0:
        return False

    # Commit
    commit_result = subprocess.run(
        ["git", "commit", "-m", message],
        cwd=repo_root,
        capture_output=True,
        text=True,
    )

    if commit_result.returncode == 0:
        return True

    # "nothing to commit" is acceptable
    if "nothing to commit" in commit_result.stdout:
        return True

    return False


def push_repo(repo_root: str, branch: str | None = None) -> bool:
    """Push a specific branch in a given repo.

    If branch is None, pushes the current branch.

    Args:
        repo_root: Path to git repository root
        branch: Branch name to push (None = current branch)

    Returns:
        True if push succeeded
    """
    if branch is None:
        branch = get_current_branch(repo_root)
        if not branch:
            return False

    result = subprocess.run(
        ["git", "push", "origin", branch],
        cwd=repo_root,
        capture_output=True,
        text=True,
    )
    return result.returncode == 0


def check_branch_merged(workspace_root: Path, plan_path: str) -> int:
    """Check that the feature branch has been merged to the integration branch.

    Reads Plan Worktree metadata to get the feature branch name,
    determines the integration branch based on project type, and runs
    git branch --merged to verify.

    Args:
        workspace_root: Workspace root path
        plan_path: Path to the Plan file

    Returns:
        0 if merged (or no worktree metadata), 1 if not merged or on error
    """
    from plan import get_plan_worktree, get_plan_project_path, get_plan_field

    wt_meta = get_plan_worktree(plan_path)
    if not wt_meta or not wt_meta.get("branch"):
        return 0

    feature_branch = wt_meta["branch"]

    # Determine repo root for git operations
    project_path = get_plan_project_path(plan_path)
    if project_path:
        repo_root = str(Path(workspace_root) / project_path)
    else:
        repo_root = str(workspace_root)

    # Determine integration branch based on project type
    project_type = get_plan_field(plan_path, "Project Type")
    if project_type == "ontology-worktree":
        # .wopal/ worktree sits on the current space layer branch (space/<name>),
        # detected at runtime — there is no fixed integration branch name.
        integration_branch = get_current_branch(repo_root)
    else:
        integration_branch = "main"

    # Prefer Verification Commit SHA — works even if branch ref is deleted
    verification_commit = get_plan_field(plan_path, "Verification Commit")
    if verification_commit:
        try:
            result = subprocess.run(
                ["git", "merge-base", "--is-ancestor", verification_commit, integration_branch],
                cwd=repo_root,
                capture_output=True,
            )
            if result.returncode == 0:
                return 0
        except (subprocess.CalledProcessError, FileNotFoundError):
            pass
        # SHA not in ancestry — do not fail yet. Squash merge 的 feature tip
        # 永远不会成为 integration 祖先,继续内容级检测。

    # Content-based detection: integration tree == feature tree.
    # Squash merge 判据:main 上只有 feature 内容的副本提交,但 tree 与
    # feature tip 字节级一致。对 --no-ff / fast-forward 同样成立(祖先
    # 检测已提前返回),因此该判据对三种合并方式都安全。
    try:
        int_tree = subprocess.run(
            ["git", "rev-parse", f"{integration_branch}^{{tree}}"],
            cwd=repo_root,
            capture_output=True,
            text=True,
        )
        feat_tree = subprocess.run(
            ["git", "rev-parse", f"{feature_branch}^{{tree}}"],
            cwd=repo_root,
            capture_output=True,
            text=True,
        )
        if (
            int_tree.returncode == 0
            and feat_tree.returncode == 0
            and int_tree.stdout.strip()
            and int_tree.stdout.strip() == feat_tree.stdout.strip()
        ):
            return 0
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass

    # Changeset criterion: full-tree equality fails when the integration
    # branch advanced after the feature branched (parallel commits on main
    # make the trees differ even after a clean squash). Instead compare the
    # paths the feature actually changed against the integration branch —
    # if every changed path is byte-identical in both branches, the feature
    # content is merged regardless of unrelated main progress.
    try:
        base_res = subprocess.run(
            ["git", "merge-base", integration_branch, feature_branch],
            cwd=repo_root,
            capture_output=True,
            text=True,
        )
        if base_res.returncode == 0 and base_res.stdout.strip():
            base_sha = base_res.stdout.strip()
            changed_res = subprocess.run(
                [
                    "git", "diff", "--name-only",
                    base_sha, feature_branch,
                ],
                cwd=repo_root,
                capture_output=True,
                text=True,
            )
            if changed_res.returncode == 0 and changed_res.stdout.strip():
                paths = [
                    p for p in changed_res.stdout.split("\n") if p.strip()
                ]
                all_present = True
                for p in paths:
                    check = subprocess.run(
                        [
                            "git", "diff", "--quiet",
                            integration_branch, feature_branch, "--", p,
                        ],
                        cwd=repo_root,
                        capture_output=True,
                        text=True,
                    )
                    if check.returncode != 0:
                        all_present = False
                        break
                if all_present:
                    return 0
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass

    # Run git branch --merged <integration> and check for feature branch
    try:
        result = subprocess.run(
            ["git", "branch", "--merged", integration_branch],
            cwd=repo_root,
            capture_output=True,
            text=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        log_error(
            f"Failed to check merge status for branch '{feature_branch}'"
        )
        return 1

    if result.returncode != 0:
        log_error(
            f"Failed to check merge status for branch '{feature_branch}'"
        )
        return 1

    # Parse merged branches: strip "* " / "+ " prefix, trim whitespace
    merged_branches = [
        b.strip().lstrip("*+ ") for b in result.stdout.strip().split("\n")
        if b.strip()
    ]

    if feature_branch in merged_branches:
        return 0

    # Branch not found in local merged list.
    # Fallback 1: check remote merged branches (branch may exist remotely)
    try:
        result2 = subprocess.run(
            ["git", "branch", "-r", "--merged", integration_branch],
            cwd=repo_root,
            capture_output=True,
            text=True,
        )
        remote_branches = [
            b.strip() for b in result2.stdout.strip().split("\n") if b.strip()
        ]
        for rb in remote_branches:
            if rb.endswith(f"/{feature_branch}"):
                return 0
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass

    # Fallback 2: branch deleted everywhere, check if merge exists in history
    # Works for both FF merge (branch name in commit messages) and
    # non-FF merge ("Merge branch 'xxx'" commit)
    try:
        result3 = subprocess.run(
            ["git", "log", "--oneline", integration_branch,
             "--grep", feature_branch],
            cwd=repo_root,
            capture_output=True,
            text=True,
        )
        if result3.stdout.strip():
            return 0
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass

    log_error(
        f"Feature branch '{feature_branch}' not yet merged to "
        f"{integration_branch}. Please merge first."
    )
    return 1
