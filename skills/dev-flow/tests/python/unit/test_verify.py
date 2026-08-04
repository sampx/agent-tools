#!/usr/bin/env python3
# test_verify.py - Unit tests for verify command (merge status check)

import sys
from pathlib import Path
from unittest.mock import patch, MagicMock, call

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from support.bootstrap import ensure_scripts_path
ensure_scripts_path()


# -- Fixtures -----------------------------------------------------------------

PLAN_VERIFYING_STANDARD = """\
- **Status**: verifying
- **Type**: feature
- **Target Project**: gesp
- **Project Type**: standard
- **Project Path**: projects/gesp
- **Issue**: #42
- **Worktree**:
  - enabled: true
  - branch: feature/test-1-slug
  - path: .worktrees/gesp-issue-1-slug
  - repo_root: /workspace/projects/gesp
  - base_branch: main
  - merge_target: main
  - verify_mode: direct
  - cleanup_policy: archive
"""

PLAN_VERIFYING_ONTOLOGY = """\
- **Status**: verifying
- **Type**: refactor
- **Target Project**: wopal-space-ontology
- **Project Type**: ontology-worktree
- **Project Path**: .wopal
- **Issue**: #10
- **Worktree**:
  - enabled: true
  - branch: issue-10-slug
  - path: .worktrees/ontology-issue-10-slug
  - repo_root: /home/.wopal/ontologies/wopal-space-ontology
  - base_branch: space/main
  - merge_target: space/main
  - verify_mode: switch-runtime
  - cleanup_policy: archive
"""

PLAN_VERIFYING_NO_WORKTREE = """\
- **Status**: verifying
- **Type**: feature
- **Target Project**: gesp
- **Project Type**: standard
- **Project Path**: projects/gesp
- **Issue**: #42
"""


def _write_plan(tmp_path, content: str, name: str = "42-feature-dev-flow-test.md") -> Path:
    """Write a Plan file with given content and return its path."""
    plan_dir = tmp_path / "plans"
    plan_dir.mkdir(parents=True, exist_ok=True)
    plan_file = plan_dir / name
    plan_file.write_text(content)
    return plan_file


# -- Test: Final Commit recording -------------------------------------------------

class TestVerifyRecordsFinalCommit:
    """verify 应记录 Final Commit(合入后集成分支 HEAD)到 Plan metadata。"""

    def test_final_commit_records_integration_head(self, tmp_path):
        """Final Commit 应取集成分支 HEAD(standard: main)。"""
        from commands.verify import _record_final_commit
        plan_path = _write_plan(tmp_path, PLAN_VERIFYING_STANDARD)
        proj_dir = tmp_path / "projects" / "gesp"
        proj_dir.mkdir(parents=True)
        (proj_dir / ".git").mkdir()

        with patch("commands.verify.get_branch_head", return_value="deadbeef") as mock_head:
            with patch("commands.verify.set_plan_field", return_value=True) as mock_set:
                _record_final_commit(str(plan_path), tmp_path)

        mock_head.assert_called_once()
        mock_set.assert_called_once_with(
            str(plan_path), "Final Commit", "deadbeef"
        )

    def test_final_commit_uses_main_branch(self, tmp_path):
        """standard 项目 Final Commit 用 main 分支;ontology 用当前空间分支。"""
        from commands.verify import _record_final_commit
        plan_path = _write_plan(tmp_path, PLAN_VERIFYING_STANDARD)
        proj_dir = tmp_path / "projects" / "gesp"
        proj_dir.mkdir(parents=True)
        (proj_dir / ".git").mkdir()

        with patch("commands.verify.get_branch_head", return_value="abc123") as mock_head:
            with patch("commands.verify.set_plan_field", return_value=True):
                _record_final_commit(str(plan_path), tmp_path)

        cmd = mock_head.call_args[0][0]
        assert cmd == str(tmp_path / "projects" / "gesp")
        branch = mock_head.call_args[0][1]
        assert branch == "main"


# -- Test: _check_feature_branch_merged function -------------------------------

class TestCheckFeatureBranchMerged:
    """Test _check_feature_branch_merged helper function.

    After refactoring, _check_feature_branch_merged delegates to
    lib.git.check_branch_merged. Mocks target lib.git where the actual
    subprocess and log_error calls happen.
    """

    def test_standard_branch_merged_returns_zero(self, tmp_path):
        """Standard project: feature branch is in merged list, returns 0."""
        from commands.verify import _check_feature_branch_merged

        plan_path = _write_plan(tmp_path, PLAN_VERIFYING_STANDARD)
        # Create project dir with .git so repo_root resolves
        proj_dir = tmp_path / "projects" / "gesp"
        proj_dir.mkdir(parents=True)
        (proj_dir / ".git").mkdir()

        merged_output = "  main\n* feature/test-1-slug\n"

        with patch("lib.git.subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(
                returncode=0,
                stdout=merged_output,
            )
            result = _check_feature_branch_merged(tmp_path, str(plan_path))

        assert result == 0

    def test_standard_branch_not_merged_returns_one(self, tmp_path):
        """Standard project: feature branch NOT in merged list, returns 1."""
        from commands.verify import _check_feature_branch_merged

        plan_path = _write_plan(tmp_path, PLAN_VERIFYING_STANDARD)
        proj_dir = tmp_path / "projects" / "gesp"
        proj_dir.mkdir(parents=True)
        (proj_dir / ".git").mkdir()

        # Subprocess calls: local merged, tree x2, remote merged, git log --grep
        def fake_run(cmd, *args, **kwargs):
            if cmd[0] == "git" and cmd[1] == "branch" and "--merged" in cmd and "-r" not in cmd:
                return MagicMock(returncode=0, stdout="  main\n")
            if "rev-parse" in cmd and any("^{tree}" in c for c in cmd):
                return MagicMock(returncode=0, stdout="tree-diff-main\n")
            if cmd[1] == "branch" and "-r" in cmd:
                return MagicMock(returncode=0, stdout="")
            return MagicMock(returncode=0, stdout="")

        # Override: feature tree differs from integration tree
        def fake_run2(cmd, *args, **kwargs):
            if "rev-parse" in cmd and any("^{tree}" in c for c in cmd):
                if any("feature/test-1-slug" in c for c in cmd):
                    return MagicMock(returncode=0, stdout="tree-diff-feature\n")
                return MagicMock(returncode=0, stdout="tree-diff-main\n")
            return fake_run(cmd, *args, **kwargs)

        with patch("lib.git.subprocess.run", side_effect=fake_run2) as mock_run:
            with patch("lib.git.log_error") as mock_log:
                result = _check_feature_branch_merged(tmp_path, str(plan_path))

        assert result == 1
        mock_log.assert_any_call(
            "Feature branch 'feature/test-1-slug' not yet merged to main. "
            "Please merge first."
        )

    def test_ontology_branch_merged_returns_zero(self, tmp_path):
        """Ontology-worktree: feature branch is in merged list, returns 0."""
        from commands.verify import _check_feature_branch_merged

        plan_path = _write_plan(tmp_path, PLAN_VERIFYING_ONTOLOGY)
        wopal_dir = tmp_path / ".wopal"
        wopal_dir.mkdir(parents=True)
        (wopal_dir / ".git").mkdir()

        merged_output = "  space/wopal-workspace\n* issue-10-slug\n"

        with patch("lib.git.subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(
                returncode=0,
                stdout=merged_output,
            )
            with patch("lib.git.get_current_branch", return_value="space/wopal-workspace"):
                result = _check_feature_branch_merged(tmp_path, str(plan_path))

        assert result == 0

    def test_ontology_branch_not_merged_returns_one(self, tmp_path):
        """Ontology-worktree: feature branch NOT in merged list, returns 1."""
        from commands.verify import _check_feature_branch_merged

        plan_path = _write_plan(tmp_path, PLAN_VERIFYING_ONTOLOGY)
        wopal_dir = tmp_path / ".wopal"
        wopal_dir.mkdir(parents=True)
        (wopal_dir / ".git").mkdir()

        # Subprocess calls: local merged, tree x2, remote merged, git log --grep
        def fake_run(cmd, *args, **kwargs):
            if cmd[0] == "git" and cmd[1] == "branch" and "--merged" in cmd and "-r" not in cmd:
                return MagicMock(returncode=0, stdout="  space/wopal-workspace\n")
            if "rev-parse" in cmd and any("^{tree}" in c for c in cmd):
                if any("issue-10-slug" in c for c in cmd):
                    return MagicMock(returncode=0, stdout="tree-diff-feature\n")
                return MagicMock(returncode=0, stdout="tree-diff-main\n")
            if cmd[1] == "branch" and "-r" in cmd:
                return MagicMock(returncode=0, stdout="")
            return MagicMock(returncode=0, stdout="")

        with patch("lib.git.subprocess.run", side_effect=fake_run):
            with patch("lib.git.get_current_branch", return_value="space/wopal-workspace"):
                with patch("lib.git.log_error") as mock_log:
                    result = _check_feature_branch_merged(tmp_path, str(plan_path))

        assert result == 1
        mock_log.assert_any_call(
            "Feature branch 'issue-10-slug' not yet merged to space/wopal-workspace. "
            "Please merge first."
        )

    def test_no_worktree_metadata_returns_zero(self, tmp_path):
        """Plan without worktree metadata: skip check, returns 0."""
        from commands.verify import _check_feature_branch_merged

        plan_path = _write_plan(tmp_path, PLAN_VERIFYING_NO_WORKTREE)

        result = _check_feature_branch_merged(tmp_path, str(plan_path))
        assert result == 0

    def test_no_branch_in_worktree_returns_zero(self, tmp_path):
        """Worktree metadata without branch: skip check, returns 0."""
        from commands.verify import _check_feature_branch_merged

        plan_content = PLAN_VERIFYING_NO_WORKTREE + "\n- **Worktree**:  | .worktrees/some-path\n"
        plan_path = _write_plan(tmp_path, plan_content)

        with patch("plan.get_plan_worktree", return_value={"branch": "", "path": ""}):
            result = _check_feature_branch_merged(tmp_path, str(plan_path))

        assert result == 0

    def test_git_command_failure_returns_one(self, tmp_path):
        """git branch --merged fails: returns 1."""
        from commands.verify import _check_feature_branch_merged

        plan_path = _write_plan(tmp_path, PLAN_VERIFYING_STANDARD)
        proj_dir = tmp_path / "projects" / "gesp"
        proj_dir.mkdir(parents=True)
        (proj_dir / ".git").mkdir()

        with patch("lib.git.subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(
                returncode=128,
                stderr="fatal: bad revision 'unknown'",
            )
            with patch("lib.git.log_error") as mock_log:
                result = _check_feature_branch_merged(tmp_path, str(plan_path))

        assert result == 1
        mock_log.assert_any_call(
            "Failed to check merge status for branch 'feature/test-1-slug'"
        )

    def test_uses_correct_integration_branch(self, tmp_path):
        """Verify git branch --merged is called with correct integration branch."""
        from commands.verify import _check_feature_branch_merged

        # Standard → main (branch in merged list → fallback not triggered)
        plan_path_std = _write_plan(
            tmp_path, PLAN_VERIFYING_STANDARD, name="42-std.md"
        )
        proj_dir = tmp_path / "projects" / "gesp"
        proj_dir.mkdir(parents=True)
        (proj_dir / ".git").mkdir()

        def fake_run_std(cmd, *args, **kwargs):
            if cmd[0] == "git" and cmd[1] == "branch" and "--merged" in cmd and "-r" not in cmd:
                return MagicMock(returncode=0, stdout="  main\n* feature/test-1-slug\n")
            return MagicMock(returncode=0, stdout="")

        with patch("lib.git.subprocess.run", side_effect=fake_run_std) as mock_run:
            _check_feature_branch_merged(tmp_path, str(plan_path_std))

        merged_calls = [
            c.args[0] for c in mock_run.call_args_list
            if "--merged" in c.args[0]
        ]
        assert merged_calls, "expected git branch --merged call"
        cmd = merged_calls[0]
        assert "--merged" in cmd
        assert "main" in cmd

        # Ontology → current .wopal/ branch (dynamically detected)
        plan_path_ont = _write_plan(
            tmp_path, PLAN_VERIFYING_ONTOLOGY, name="10-ont.md"
        )
        wopal_dir = tmp_path / ".wopal"
        wopal_dir.mkdir(parents=True)
        (wopal_dir / ".git").mkdir()

        def fake_run_ont(cmd, *args, **kwargs):
            if cmd[0] == "git" and cmd[1] == "branch" and "--merged" in cmd and "-r" not in cmd:
                return MagicMock(returncode=0, stdout="  space/wopal-workspace\n* issue-10-slug\n")
            return MagicMock(returncode=0, stdout="")

        with patch("lib.git.subprocess.run", side_effect=fake_run_ont) as mock_run:
            with patch("lib.git.get_current_branch", return_value="space/wopal-workspace"):
                _check_feature_branch_merged(tmp_path, str(plan_path_ont))

        merged_calls = [
            c.args[0] for c in mock_run.call_args_list
            if "--merged" in c.args[0]
        ]
        assert merged_calls, "expected git branch --merged call"
        cmd = merged_calls[0]
        assert "--merged" in cmd
        assert "space/wopal-workspace" in cmd

    def test_ontology_integration_branch_is_dynamic_current_branch(self, tmp_path):
        """Ontology integration branch is the current .wopal/ branch, detected
        at runtime — not a hardcoded value.

        Regression: previously hardcoded 'space/main', which broke non-main
        spaces (e.g. space/wopal-workspace, space/gesp-space)."""
        from commands.verify import _check_feature_branch_merged

        plan_path = _write_plan(tmp_path, PLAN_VERIFYING_ONTOLOGY, name="10-dyn.md")
        wopal_dir = tmp_path / ".wopal"
        wopal_dir.mkdir(parents=True)
        (wopal_dir / ".git").mkdir()

        # Simulate a different space name to prove the value is dynamic
        current_space_branch = "space/gesp-space"

        def fake_run(cmd, *args, **kwargs):
            if cmd[0] == "git" and cmd[1] == "branch" and "--merged" in cmd and "-r" not in cmd:
                return MagicMock(
                    returncode=0,
                    stdout=f"  {current_space_branch}\n* issue-10-slug\n",
                )
            return MagicMock(returncode=0, stdout="")

        with patch("lib.git.subprocess.run", side_effect=fake_run) as mock_run:
            with patch("lib.git.get_current_branch", return_value=current_space_branch) as mock_branch:
                result = _check_feature_branch_merged(tmp_path, str(plan_path))

        assert result == 0
        # get_current_branch must have been called with .wopal/ repo root
        mock_branch.assert_called_once_with(str(wopal_dir))
        # git branch --merged must use the dynamically detected branch
        merged_calls = [
            c.args[0] for c in mock_run.call_args_list
            if "--merged" in c.args[0]
        ]
        assert merged_calls, "expected git branch --merged call"
        cmd = merged_calls[0]
        assert current_space_branch in cmd
