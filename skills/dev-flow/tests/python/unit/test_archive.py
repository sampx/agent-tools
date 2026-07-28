#!/usr/bin/env python3
# test_archive.py - Unit tests for archive command helpers
#
# Task 4 (Issue #155): Phase doc Related Plans table update on archive.
# Bug fix: _detect_worktree must return metadata even when worktree path
# has been cleaned up by verify-switch.

import unittest
import sys
import tempfile
import shutil
import argparse
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from support.bootstrap import ensure_scripts_path
ensure_scripts_path()

from commands.archive import (
    _update_phase_doc_plan_status,
    _detect_worktree,
    _PHASE_TABLE_HEADER,
    _PHASE_TABLE_SEP,
    cmd_archive,
)


def _make_phase_doc(path: Path, rows: list[tuple[str, str, str]]) -> None:
    """Write a minimal phase doc with a Related Plans table.

    Args:
        path: File path to write.
        rows: List of (project, plan, status) tuples.
    """
    lines = [
        "# Phase Title\n\n",
        "Some intro text.\n\n",
        "## Related Plans\n\n",
        _PHASE_TABLE_HEADER + "\n",
        _PHASE_TABLE_SEP + "\n",
    ]
    for proj, plan, status in rows:
        lines.append(f"| {proj} | {plan} | {status} |\n")
    lines.append("\nOther content.\n")
    path.write_text("".join(lines))


class TestUpdatePhaseDocPlanStatus(unittest.TestCase):
    """Tests for _update_phase_doc_plan_status."""

    def setUp(self):
        import tempfile
        self.tmpdir = Path(tempfile.mkdtemp())
        self.ws_root = self.tmpdir

    def tearDown(self):
        import shutil
        shutil.rmtree(self.tmpdir)

    def _create_phase_dir(self, product: str = "wopal-space"):
        phases = self.ws_root / "docs" / "products" / product / "phases"
        phases.mkdir(parents=True)
        return phases

    # ---- happy path: update status to done ----

    @patch("commands.archive.log_info")
    @patch("commands.archive.log_warn")
    @patch("commands.archive.log_success")
    def test_updates_status_to_done(self, mock_ok, mock_warn, mock_info):
        phases = self._create_phase_dir()
        doc = phases / "wopal-space-p1-one-click.md"
        _make_phase_doc(doc, [
            ("wopal-cli", "feat-cli-publish-p1", "planning"),
            ("wopal-site", "feat-site-blog", "executing"),
        ])

        result = _update_phase_doc_plan_status(
            self.ws_root, "feat-cli-publish-p1", "wopal-space", "p1",
        )

        self.assertIsNotNone(result)
        mock_ok.assert_called_once()
        content = doc.read_text()
        self.assertIn("| wopal-cli | feat-cli-publish-p1 | done |", content)
        self.assertIn("| wopal-site | feat-site-blog | executing |", content)
        mock_info.assert_not_called()
        mock_warn.assert_not_called()

    # ---- skip: Product missing ----

    @patch("commands.archive.log_info")
    @patch("commands.archive.log_warn")
    @patch("commands.archive.log_success")
    def test_skip_when_product_missing(self, mock_ok, mock_warn, mock_info):
        result = _update_phase_doc_plan_status(
            self.ws_root, "some-plan", "", "p1",
        )
        self.assertIsNone(result)
        mock_info.assert_called_once_with(
            "No Product/Phase metadata, skipping phase doc update"
        )
        mock_warn.assert_not_called()
        mock_ok.assert_not_called()

    # ---- skip: Phase missing ----

    @patch("commands.archive.log_info")
    @patch("commands.archive.log_warn")
    @patch("commands.archive.log_success")
    def test_skip_when_phase_missing(self, mock_ok, mock_warn, mock_info):
        result = _update_phase_doc_plan_status(
            self.ws_root, "some-plan", "wopal-space", "",
        )
        self.assertIsNone(result)
        mock_info.assert_called_once_with(
            "No Product/Phase metadata, skipping phase doc update"
        )
        mock_warn.assert_not_called()
        mock_ok.assert_not_called()

    # ---- warn: phase doc not found ----

    @patch("commands.archive.log_info")
    @patch("commands.archive.log_warn")
    @patch("commands.archive.log_success")
    def test_warn_when_phase_doc_not_found(self, mock_ok, mock_warn, mock_info):
        self._create_phase_dir()  # empty phases dir
        result = _update_phase_doc_plan_status(
            self.ws_root, "some-plan", "wopal-space", "p99",
        )
        self.assertIsNone(result)
        mock_warn.assert_called_once()
        warn_msg = str(mock_warn.call_args[0][0])
        self.assertIn("p99", warn_msg)
        mock_ok.assert_not_called()

    # ---- warn: plan row not found in table ----

    @patch("commands.archive.log_info")
    @patch("commands.archive.log_warn")
    @patch("commands.archive.log_success")
    def test_warn_when_plan_not_in_table(self, mock_ok, mock_warn, mock_info):
        phases = self._create_phase_dir()
        doc = phases / "wopal-space-p1-one-click.md"
        _make_phase_doc(doc, [
            ("wopal-cli", "other-plan", "planning"),
        ])

        result = _update_phase_doc_plan_status(
            self.ws_root, "missing-plan", "wopal-space", "p1",
        )

        self.assertIsNone(result)
        mock_warn.assert_called_once()
        warn_msg = str(mock_warn.call_args[0][0])
        self.assertIn("missing-plan", warn_msg)
        content = doc.read_text()
        self.assertNotIn("done", content)
        mock_ok.assert_not_called()

    # ---- warn: phases directory does not exist ----

    @patch("commands.archive.log_info")
    @patch("commands.archive.log_warn")
    @patch("commands.archive.log_success")
    def test_warn_when_phases_dir_missing(self, mock_ok, mock_warn, mock_info):
        result = _update_phase_doc_plan_status(
            self.ws_root, "some-plan", "nonexistent-product", "p1",
        )
        self.assertIsNone(result)
        mock_warn.assert_called_once()
        warn_msg = str(mock_warn.call_args[0][0])
        self.assertIn("Phases directory not found", warn_msg)
        mock_ok.assert_not_called()

    # ---- no table in doc ----

    @patch("commands.archive.log_info")
    @patch("commands.archive.log_warn")
    @patch("commands.archive.log_success")
    def test_warn_when_no_table_in_doc(self, mock_ok, mock_warn, mock_info):
        phases = self._create_phase_dir()
        doc = phases / "wopal-space-p1.md"
        doc.write_text("# Phase\n\nNo table here.\n")

        result = _update_phase_doc_plan_status(
            self.ws_root, "some-plan", "wopal-space", "p1",
        )

        self.assertIsNone(result)
        mock_warn.assert_called_once()
        warn_msg = str(mock_warn.call_args[0][0])
        self.assertIn("No Related Plans table found", warn_msg)
        mock_ok.assert_not_called()


class TestDetectWorktree(unittest.TestCase):
    """Tests for _detect_worktree.

    Regression: after verify-switch cleans up the worktree directory,
    the Plan metadata still records the branch that needs cleanup.
    _detect_worktree must return the metadata so archive can delete
    the feature branch.
    """

    def setUp(self):
        self.tmpdir = Path(tempfile.mkdtemp())
        self.ws_root = self.tmpdir
        # Plan file location (mirror real layout)
        self.plans_dir = self.tmpdir / "plans"
        self.plans_dir.mkdir(parents=True)
        self.plan_path = self.plans_dir / "test-plan.md"

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def _write_plan_with_worktree(self, branch: str, wt_path: str) -> None:
        self.plan_path.write_text(
            f"# test-plan\n\n"
            f"## Metadata\n\n"
            f"- **Type**: feature\n"
            f"- **Target Project**: wopal-cli\n"
            f"- **Status**: done\n"
            f"- **Worktree**:\n"
            f"  - branch: {branch}\n"
            f"  - path: {wt_path}\n"
        )

    @patch("commands.archive.get_plan_worktree")
    def test_returns_metadata_when_worktree_path_exists(self, mock_gpw):
        """Sanity: when path exists, metadata is returned as-is."""
        wt_dir = self.tmpdir / ".worktrees" / "wopal-cli-my-feature"
        wt_dir.mkdir(parents=True)
        mock_gpw.return_value = {
            "branch": "my-feature",
            "path": str(wt_dir.relative_to(self.ws_root)),
        }

        result = _detect_worktree(str(self.plan_path), "wopal-cli", self.ws_root)

        self.assertIsNotNone(result)
        self.assertEqual(result["branch"], "my-feature")

    @patch("commands.archive.get_plan_worktree")
    def test_returns_metadata_when_worktree_path_missing(self, mock_gpw):
        """Regression: path cleaned up by verify-switch must not erase
        branch metadata — the feature branch still needs deletion."""
        missing_path = self.tmpdir / ".worktrees" / "wopal-cli-my-feature"
        self.assertFalse(missing_path.exists())

        mock_gpw.return_value = {
            "branch": "my-feature",
            "path": str(missing_path.relative_to(self.ws_root)),
        }

        result = _detect_worktree(str(self.plan_path), "wopal-cli", self.ws_root)

        self.assertIsNotNone(result, "must return metadata even when path is gone")
        self.assertEqual(result["branch"], "my-feature")

    @patch("commands.archive.get_plan_worktree")
    def test_returns_none_when_no_metadata_and_no_glob_match(self, mock_gpw):
        mock_gpw.return_value = None

        result = _detect_worktree(str(self.plan_path), "wopal-cli", self.ws_root)

        self.assertIsNone(result)


class TestArchiveMergeDetection(unittest.TestCase):
    """Tests for archive merge detection (Task 2, Issue #171).

    Four scenarios:
    1. worktree exists + merged → skip merge, proceed to cleanup
    2. worktree exists + unmerged → error exit
    3. worktree doesn't exist → skip merge, cleanup branch
    4. PR path → skip merge, cleanup worktree
    """

    def setUp(self):
        self.tmpdir = Path(tempfile.mkdtemp())
        self.ws_root = self.tmpdir
        self.plans_dir = self.tmpdir / "plans"
        self.plans_dir.mkdir(parents=True)
        self.plan_path = self.plans_dir / "42-test-plan.md"
        self.plan_path.write_text("# test-plan\n")
        self.proj_dir = self.tmpdir / "projects" / "test-project"
        self.proj_dir.mkdir(parents=True)
        (self.proj_dir / ".git").mkdir()
        self.wt_dir = self.tmpdir / ".worktrees" / "test-project-issue-42"
        self.wt_dir.mkdir(parents=True)

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def _make_args(self, target="42"):
        return argparse.Namespace(target=target)

    def _setup_common_mocks(
        self,
        mock_find_ws,
        mock_find_plan,
        mock_parse_status,
        mock_guard,
        mock_get_project,
        mock_get_type,
        mock_get_issue,
        mock_resolve_repo,
        mock_get_field,
        mock_resolve_path,
        mock_update_phase,
        mock_commit,
        mock_close,
    ):
        """Configure mocks common to all scenarios."""
        mock_find_ws.return_value = self.ws_root
        mock_find_plan.return_value = str(self.plan_path)
        mock_parse_status.return_value = "done"
        mock_guard.return_value = True
        mock_get_project.return_value = "test-project"
        mock_get_type.return_value = "feature"
        mock_get_issue.return_value = 42
        mock_resolve_repo.return_value = "owner/repo"
        mock_get_field.side_effect = lambda plan_path, field: {
            "Project Type": "standard",
            "Product": "",
            "Phase": "",
        }.get(field, "")
        mock_resolve_path.return_value = str(self.proj_dir)
        mock_update_phase.return_value = None
        mock_commit.return_value = True
        mock_close.return_value = True

    @patch("commands.archive.close_issue")
    @patch("commands.archive.update_issue_plan_link")
    @patch("commands.archive.commit_archived_plan")
    @patch("commands.archive._update_phase_doc_plan_status")
    @patch("commands.archive._cleanup_worktree")
    @patch("commands.archive.check_branch_merged")
    @patch("commands.archive.has_uncommitted_changes")
    @patch("commands.archive._is_pr_path")
    @patch("commands.archive._detect_worktree")
    @patch("commands.archive.resolve_project_path")
    @patch("commands.archive.get_plan_field")
    @patch("commands.archive.ensure_issue_labels")
    @patch("commands.archive.sync_status_label")
    @patch("commands.archive.sync_plan_to_issue_body")
    @patch("commands.archive.resolve_space_repo")
    @patch("commands.archive.get_plan_issue")
    @patch("commands.archive.get_plan_type")
    @patch("commands.archive.get_plan_project")
    @patch("commands.archive.guard_status")
    @patch("commands.archive.parse_plan_status")
    @patch("commands.archive.find_plan")
    @patch("commands.archive.find_workspace_root")
    def test_worktree_exists_merged_skip_merge(
        self,
        mock_find_ws,
        mock_find_plan,
        mock_parse_status,
        mock_guard,
        mock_get_project,
        mock_get_type,
        mock_get_issue,
        mock_resolve_repo,
        mock_sync_body,
        mock_sync_label,
        mock_ensure_labels,
        mock_get_field,
        mock_resolve_path,
        mock_detect_wt,
        mock_is_pr,
        mock_has_uncommitted,
        mock_check_merged,
        mock_cleanup,
        mock_update_phase,
        mock_commit,
        mock_update_link,
        mock_close,
    ):
        """Scenario 1: worktree exists + merged → skip merge, proceed to cleanup."""
        self._setup_common_mocks(
            mock_find_ws, mock_find_plan, mock_parse_status, mock_guard,
            mock_get_project, mock_get_type, mock_get_issue, mock_resolve_repo,
            mock_get_field, mock_resolve_path, mock_update_phase,
            mock_commit, mock_close,
        )
        mock_detect_wt.return_value = {
            "branch": "feature/test-1",
            "path": ".worktrees/test-project-issue-42",
        }
        mock_is_pr.return_value = False
        mock_has_uncommitted.return_value = False
        mock_check_merged.return_value = 0
        mock_cleanup.return_value = True

        result = cmd_archive(self._make_args())

        self.assertEqual(result, 0)
        mock_check_merged.assert_called_once_with(self.ws_root, str(self.plan_path))
        mock_cleanup.assert_called_once()

    @patch("commands.archive.close_issue")
    @patch("commands.archive.update_issue_plan_link")
    @patch("commands.archive.commit_archived_plan")
    @patch("commands.archive._update_phase_doc_plan_status")
    @patch("commands.archive._cleanup_worktree")
    @patch("commands.archive.check_branch_merged")
    @patch("commands.archive.has_uncommitted_changes")
    @patch("commands.archive._is_pr_path")
    @patch("commands.archive._detect_worktree")
    @patch("commands.archive.resolve_project_path")
    @patch("commands.archive.get_plan_field")
    @patch("commands.archive.ensure_issue_labels")
    @patch("commands.archive.sync_status_label")
    @patch("commands.archive.sync_plan_to_issue_body")
    @patch("commands.archive.resolve_space_repo")
    @patch("commands.archive.get_plan_issue")
    @patch("commands.archive.get_plan_type")
    @patch("commands.archive.get_plan_project")
    @patch("commands.archive.guard_status")
    @patch("commands.archive.parse_plan_status")
    @patch("commands.archive.find_plan")
    @patch("commands.archive.find_workspace_root")
    def test_worktree_exists_unmerged_error_exit(
        self,
        mock_find_ws,
        mock_find_plan,
        mock_parse_status,
        mock_guard,
        mock_get_project,
        mock_get_type,
        mock_get_issue,
        mock_resolve_repo,
        mock_sync_body,
        mock_sync_label,
        mock_ensure_labels,
        mock_get_field,
        mock_resolve_path,
        mock_detect_wt,
        mock_is_pr,
        mock_has_uncommitted,
        mock_check_merged,
        mock_cleanup,
        mock_update_phase,
        mock_commit,
        mock_update_link,
        mock_close,
    ):
        """Scenario 2: worktree exists + unmerged → error exit."""
        self._setup_common_mocks(
            mock_find_ws, mock_find_plan, mock_parse_status, mock_guard,
            mock_get_project, mock_get_type, mock_get_issue, mock_resolve_repo,
            mock_get_field, mock_resolve_path, mock_update_phase,
            mock_commit, mock_close,
        )
        mock_detect_wt.return_value = {
            "branch": "feature/test-1",
            "path": ".worktrees/test-project-issue-42",
        }
        mock_is_pr.return_value = False
        mock_has_uncommitted.return_value = False
        mock_check_merged.return_value = 1  # NOT merged

        result = cmd_archive(self._make_args())

        self.assertEqual(result, 1)
        mock_check_merged.assert_called_once_with(self.ws_root, str(self.plan_path))
        mock_cleanup.assert_not_called()

    @patch("commands.archive.close_issue")
    @patch("commands.archive.update_issue_plan_link")
    @patch("commands.archive.commit_archived_plan")
    @patch("commands.archive._update_phase_doc_plan_status")
    @patch("commands.archive._cleanup_worktree")
    @patch("commands.archive.check_branch_merged")
    @patch("commands.archive.has_uncommitted_changes")
    @patch("commands.archive._is_pr_path")
    @patch("commands.archive._detect_worktree")
    @patch("commands.archive.resolve_project_path")
    @patch("commands.archive.get_plan_field")
    @patch("commands.archive.ensure_issue_labels")
    @patch("commands.archive.sync_status_label")
    @patch("commands.archive.sync_plan_to_issue_body")
    @patch("commands.archive.resolve_space_repo")
    @patch("commands.archive.get_plan_issue")
    @patch("commands.archive.get_plan_type")
    @patch("commands.archive.get_plan_project")
    @patch("commands.archive.guard_status")
    @patch("commands.archive.parse_plan_status")
    @patch("commands.archive.find_plan")
    @patch("commands.archive.find_workspace_root")
    def test_worktree_not_exists_skip_merge(
        self,
        mock_find_ws,
        mock_find_plan,
        mock_parse_status,
        mock_guard,
        mock_get_project,
        mock_get_type,
        mock_get_issue,
        mock_resolve_repo,
        mock_sync_body,
        mock_sync_label,
        mock_ensure_labels,
        mock_get_field,
        mock_resolve_path,
        mock_detect_wt,
        mock_is_pr,
        mock_has_uncommitted,
        mock_check_merged,
        mock_cleanup,
        mock_update_phase,
        mock_commit,
        mock_update_link,
        mock_close,
    ):
        """Scenario 3: worktree doesn't exist → skip merge, cleanup branch."""
        self._setup_common_mocks(
            mock_find_ws, mock_find_plan, mock_parse_status, mock_guard,
            mock_get_project, mock_get_type, mock_get_issue, mock_resolve_repo,
            mock_get_field, mock_resolve_path, mock_update_phase,
            mock_commit, mock_close,
        )
        # Worktree metadata exists but directory won't exist on disk
        mock_detect_wt.return_value = {
            "branch": "feature/test-1",
            "path": ".worktrees/nonexistent",
        }
        mock_is_pr.return_value = False
        mock_cleanup.return_value = True

        result = cmd_archive(self._make_args())

        self.assertEqual(result, 0)
        mock_check_merged.assert_not_called()
        mock_cleanup.assert_called_once()

    @patch("commands.archive.close_issue")
    @patch("commands.archive.update_issue_plan_link")
    @patch("commands.archive.commit_archived_plan")
    @patch("commands.archive._update_phase_doc_plan_status")
    @patch("commands.archive._cleanup_worktree")
    @patch("commands.archive.check_branch_merged")
    @patch("commands.archive.has_uncommitted_changes")
    @patch("commands.archive._is_pr_path")
    @patch("commands.archive._detect_worktree")
    @patch("commands.archive.resolve_project_path")
    @patch("commands.archive.get_plan_field")
    @patch("commands.archive.ensure_issue_labels")
    @patch("commands.archive.sync_status_label")
    @patch("commands.archive.sync_plan_to_issue_body")
    @patch("commands.archive.resolve_space_repo")
    @patch("commands.archive.get_plan_issue")
    @patch("commands.archive.get_plan_type")
    @patch("commands.archive.get_plan_project")
    @patch("commands.archive.guard_status")
    @patch("commands.archive.parse_plan_status")
    @patch("commands.archive.find_plan")
    @patch("commands.archive.find_workspace_root")
    def test_pr_path_skip_merge(
        self,
        mock_find_ws,
        mock_find_plan,
        mock_parse_status,
        mock_guard,
        mock_get_project,
        mock_get_type,
        mock_get_issue,
        mock_resolve_repo,
        mock_sync_body,
        mock_sync_label,
        mock_ensure_labels,
        mock_get_field,
        mock_resolve_path,
        mock_detect_wt,
        mock_is_pr,
        mock_has_uncommitted,
        mock_check_merged,
        mock_cleanup,
        mock_update_phase,
        mock_commit,
        mock_update_link,
        mock_close,
    ):
        """Scenario 4: PR path → skip merge, cleanup worktree."""
        self._setup_common_mocks(
            mock_find_ws, mock_find_plan, mock_parse_status, mock_guard,
            mock_get_project, mock_get_type, mock_get_issue, mock_resolve_repo,
            mock_get_field, mock_resolve_path, mock_update_phase,
            mock_commit, mock_close,
        )
        mock_detect_wt.return_value = {
            "branch": "feature/test-1",
            "path": ".worktrees/test-project-issue-42",
        }
        mock_is_pr.return_value = True  # PR path
        mock_cleanup.return_value = True

        result = cmd_archive(self._make_args())

        self.assertEqual(result, 0)
        mock_check_merged.assert_not_called()
        mock_cleanup.assert_called_once()


if __name__ == "__main__":
    unittest.main()