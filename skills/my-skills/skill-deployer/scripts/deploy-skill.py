#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Deploy AI agent skills from source to target directory."""

import argparse
import fnmatch
import os
import shutil
import sys
from pathlib import Path


def parse_skillignore(skill_dir: Path) -> list[str]:
    """Parse .skillignore file and return list of patterns."""
    ignore_file = skill_dir / ".skillignore"
    if not ignore_file.exists():
        return []

    patterns = []
    for line in ignore_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            patterns.append(line)
    return patterns


def should_ignore(path: Path, relative_path: str, patterns: list[str]) -> bool:
    """Check if a path should be ignored based on patterns."""
    if not patterns:
        return False

    name = path.name
    for pattern in patterns:
        if pattern.endswith("/"):
            if path.is_dir() and fnmatch.fnmatch(name, pattern[:-1]):
                return True
        elif fnmatch.fnmatch(name, pattern):
            return True
        elif fnmatch.fnmatch(relative_path, pattern):
            return True

    return False


def copy_skill(source: Path, target: Path, patterns: list[str]) -> None:
    """Copy skill directory, excluding files matching ignore patterns."""
    for item in source.iterdir():
        relative_path = item.name
        if should_ignore(item, relative_path, patterns):
            continue

        target_item = target / item.name

        if item.is_dir():
            target_item.mkdir(exist_ok=True)
            copy_skill_recursive(item, target_item, patterns, relative_path)
        else:
            shutil.copy2(item, target_item)


def copy_skill_recursive(
    source_dir: Path, target_dir: Path, patterns: list[str], base_path: str
) -> None:
    """Recursively copy directory contents, respecting ignore patterns."""
    for item in source_dir.iterdir():
        relative_path = f"{base_path}/{item.name}"
        if should_ignore(item, relative_path, patterns):
            continue

        target_item = target_dir / item.name

        if item.is_dir():
            target_item.mkdir(exist_ok=True)
            copy_skill_recursive(item, target_item, patterns, relative_path)
        else:
            shutil.copy2(item, target_item)


def validate_skill_dir(path: Path) -> bool:
    """Check if directory contains a valid skill (has SKILL.md)."""
    skill_md = path / "SKILL.md"
    return skill_md.exists()


def deploy_skill(
    source: Path,
    dest: Path,
    symlink: bool = False,
    force: bool = False,
    name: str | None = None,
) -> bool:
    """Deploy skill from source to target directory."""
    if not source.exists():
        print(f"Error: Source directory does not exist: {source}")
        return False

    if not validate_skill_dir(source):
        print(
            f"Error: Source is not a valid skill directory (missing SKILL.md): {source}"
        )
        return False

    skill_name = name or source.name
    target = dest / skill_name

    dest.mkdir(parents=True, exist_ok=True)

    if target.exists():
        if force:
            if target.is_symlink() or target.is_dir():
                shutil.rmtree(target)
            else:
                target.unlink()
        else:
            print(f"Error: Skill already exists at {target}. Use --force to overwrite.")
            return False

    if symlink:
        target.symlink_to(source.resolve())
        print(f"Created symlink: {target} -> {source}")
    else:
        patterns = parse_skillignore(source)
        target.mkdir(exist_ok=True)
        copy_skill(source, target, patterns)
        print(f"Deployed skill to: {target}")
        if patterns:
            print(f"  Excluded {len(patterns)} pattern(s) from .skillignore")

    return True


def expand_path(path: str) -> Path:
    """Expand ~ and environment variables in path."""
    return Path(os.path.expandvars(os.path.expanduser(path)))


def main():
    parser = argparse.ArgumentParser(description="Deploy AI agent skills")
    parser.add_argument(
        "--source", "-s", required=True, help="Source directory containing the skill"
    )
    parser.add_argument(
        "--dest", "-d", required=True, help="Target installation directory"
    )
    parser.add_argument(
        "--symlink", "-l", action="store_true", help="Create symlink instead of copying"
    )
    parser.add_argument(
        "--force", "-f", action="store_true", help="Overwrite existing skill"
    )
    parser.add_argument("--name", "-n", help="Custom skill name")

    args = parser.parse_args()

    source = expand_path(args.source)
    dest = expand_path(args.dest)

    success = deploy_skill(source, dest, args.symlink, args.force, args.name)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
