#!/usr/bin/env python3
# test_sync_preserves_context.py - Test sync_plan_to_issue preserves Context
#
# Test Case: sync only updates Plan link, does not overwrite Context
#
# Scenarios:
#   1. Plan link updated, Context content preserved
#   2. Plan link appended when no Related Resources section exists

import unittest
import sys
import os
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from support.bootstrap import ensure_scripts_path
ensure_scripts_path()

from commands.sync import sync_plan_to_issue


class TestSyncPreservesContext(unittest.TestCase):
    """Test sync_plan_to_issue preserves Context section"""

    def _create_plan_file(self, content: str) -> str:
        """Create a temp plan file and return its path."""
        f = tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False)
        f.write(content)
        f.close()
        return f.name

    def test_sync_updates_plan_link_preserves_context(self):
        """sync replaces Plan row but preserves Context section"""
        plan_content = (
            "# Plan\n\n"
            "- **Status**: executing\n"
            "- **Issue**: #42\n"
            "- **Target Project**: ontology\n"
        )
        plan_file = self._create_plan_file(plan_content)

        try:
            original_body = (
                "## Context\n\n"
                "Agent research notes\n\n"
                "## Related Resources\n\n"
                "| Plan | old_link |"
            )

            with patch('commands.sync.get_issue_info') as mock_get:
                mock_get.return_value = {"body": original_body}
                with patch('commands.sync._build_plan_link') as mock_build:
                    mock_build.return_value = "| Plan | [new-plan](http://new) |"
                    with patch('commands.sync.subprocess.run') as mock_run:
                        mock_run.return_value = MagicMock(returncode=0)
                        with patch('commands.sync.shutil.which', return_value=True):
                            with patch('commands.sync.find_workspace_root', return_value='/fake'):
                                rc = sync_plan_to_issue("42", plan_file, "test/repo")
                                self.assertEqual(rc, 0)

                                # Verify body passed to gh issue edit
                                call_args = mock_run.call_args[0][0]
                                body = call_args[call_args.index('--body') + 1]
                                self.assertIn("Agent research notes", body)
                                self.assertIn("[new-plan](http://new)", body)
                                self.assertNotIn("old_link", body)
        finally:
            os.unlink(plan_file)

    def test_sync_appends_plan_link_if_missing(self):
        """sync appends Plan link when no Related Resources section exists"""
        plan_content = (
            "# Plan\n\n"
            "- **Status**: executing\n"
            "- **Issue**: #42\n"
            "- **Target Project**: ontology\n"
        )
        plan_file = self._create_plan_file(plan_content)

        try:
            original_body = "## Context\n\nAgent notes\n\nSome other content"

            with patch('commands.sync.get_issue_info') as mock_get:
                mock_get.return_value = {"body": original_body}
                with patch('commands.sync._build_plan_link') as mock_build:
                    mock_build.return_value = "| Plan | [appended-plan](http://appended) |"
                    with patch('commands.sync.subprocess.run') as mock_run:
                        mock_run.return_value = MagicMock(returncode=0)
                        with patch('commands.sync.shutil.which', return_value=True):
                            with patch('commands.sync.find_workspace_root', return_value='/fake'):
                                rc = sync_plan_to_issue("42", plan_file, "test/repo")
                                self.assertEqual(rc, 0)

                                call_args = mock_run.call_args[0][0]
                                body = call_args[call_args.index('--body') + 1]
                                self.assertIn("Agent notes", body)
                                self.assertIn("## Related Resources", body)
                                self.assertIn("[appended-plan](http://appended)", body)
        finally:
            os.unlink(plan_file)


if __name__ == '__main__':
    unittest.main()
