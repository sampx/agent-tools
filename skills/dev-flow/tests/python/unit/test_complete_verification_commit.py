#!/usr/bin/env python3
# test_complete_verification_commit.py
#
# complete 必须在 plan 所在仓库写入 Verification Commit 字段（供 verify L1
# 祖先检测）。当 feature 分支不在空间仓库（verify-switch 移除 worktree 后，
# 分支只存在于项目仓库）时，rev-parse 必须回退到代码仓库，失败则显式告警
# 而不是静默跳过。

import unittest
import sys
import os
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from support.bootstrap import ensure_scripts_path
ensure_scripts_path()

from commands.complete import _record_verification_commit


def _write_plan(tmp_path: str, branch: str = "feature/test-1-slug") -> str:
    content = f"""\
# test-plan

## Metadata
- **Status**: executing
- **Target Project**: gesp
- **Project Type**: standard
- **Project Path**: projects/gesp
- **Issue**: #42
- **Worktree**:
  - branch: {branch}
  - path: .worktrees/gesp-issue-1-slug

## Goal

Test.
"""
    plan_path = os.path.join(tmp_path, "42-feature-test.md")
    with open(plan_path, "w", encoding="utf-8") as f:
        f.write(content)
    return plan_path


class ActiveInfo:
    def __init__(self, repo_root: str):
        self.commit_repo_root = Path(repo_root)
        self.repo_relative_plan_path = "x.md"


class TestRecordVerificationCommit(unittest.TestCase):
    def setUp(self):
        import tempfile
        self.tmp = tempfile.mkdtemp(prefix="dev-flow-vc-")
        self.space_repo = os.path.join(self.tmp, "space")
        self.code_repo = os.path.join(self.tmp, "code")
        os.makedirs(self.space_repo)
        os.makedirs(self.code_repo)
        self.plan_path = _write_plan(self.tmp)
        self.active = ActiveInfo(self.space_repo)

    def tearDown(self):
        import shutil
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _fake_run(self, cmd, cwd=None, **kwargs):
        if cmd[0] == "git" and cmd[1] == "rev-parse":
            if Path(cwd) == Path(self.space_repo):
                return MagicMock(
                    returncode=128, stdout="", stderr="fatal: unknown revision"
                )
            return MagicMock(returncode=0, stdout="abc123def456\n")
        return MagicMock(returncode=0, stdout="")

    def test_falls_back_to_code_repo_when_space_repo_lacks_branch(self):
        with patch(
            "commands.complete.subprocess.run", side_effect=self._fake_run
        ):
            with patch(
                "commands.complete.resolve_project_path",
                return_value=Path(self.code_repo),
            ):
                result = _record_verification_commit(
                    self.plan_path, Path(self.tmp), self.active
                )

        self.assertEqual(result, "abc123def456")
        with open(self.plan_path, encoding="utf-8") as f:
            content = f.read()
        self.assertIn("- **Verification Commit**: abc123def456", content)

    def test_warns_when_branch_unresolvable_everywhere(self):
        def fake_run(cmd, cwd=None, **kwargs):
            if cmd[0] == "git" and cmd[1] == "rev-parse":
                return MagicMock(returncode=128, stdout="", stderr="fatal")
            return MagicMock(returncode=0, stdout="")

        with patch(
            "commands.complete.subprocess.run", side_effect=fake_run
        ):
            with patch("commands.complete.log_warn") as mock_warn:
                result = _record_verification_commit(
                    self.plan_path, Path(self.tmp), self.active
                )

        self.assertEqual(result, "")
        mock_warn.assert_called_once()
        with open(self.plan_path, encoding="utf-8") as f:
            content = f.read()
        self.assertNotIn("Verification Commit", content)

    def test_no_worktree_metadata_skips(self):
        import tempfile
        no_wt = os.path.join(tempfile.mkdtemp(prefix="dev-flow-vc-nw-"))
        plan_path = os.path.join(no_wt, "p.md")
        with open(plan_path, "w", encoding="utf-8") as f:
            f.write("# p\n\n## Metadata\n- **Status**: executing\n")

        with patch("commands.complete.get_plan_worktree", return_value=None):
            result = _record_verification_commit(
                plan_path, Path(no_wt), self.active
            )

        self.assertEqual(result, "")


if __name__ == "__main__":
    unittest.main()
