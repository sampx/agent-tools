#!/bin/bash
#
# Git Hooks 安装脚本
# 自动检测 projects/ 下所有子项目，根据 hooks 机制（husky 或原生）安装 commit-msg hook
#
# 运行方式：在 space 根目录下执行即可
# 脚本可位于 .wopal/scripts/ 或 WOPAL_HOME/bin/ 下

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 从 CWD 往上找 workspace root（含有 .wopal-space/ 的目录）
find_workspace_root() {
  local dir="$PWD"
  while [ "$dir" != "/" ]; do
    if [ -d "$dir/.wopal-space" ]; then
      echo "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  return 1
}

WORKSPACE_ROOT="$(find_workspace_root)" || {
  echo -e "${RED}错误: 未找到 space root（缺少 .wopal-space/ 目录）${NC}"
  echo "请在 space 根目录下执行此脚本"
  exit 1
}

# 源 hook 文件查找：依次尝试脚本同目录、脚本同目录的 git-hooks/、space 的 .wopal/scripts/git-hooks/
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_HOOK=""
for candidate in "$SCRIPT_DIR/commit-msg" "$SCRIPT_DIR/git-hooks/commit-msg" "$WORKSPACE_ROOT/.wopal/scripts/git-hooks/commit-msg"; do
  if [ -f "$candidate" ]; then
    SOURCE_HOOK="$candidate"
    break
  fi
done

if [ -z "$SOURCE_HOOK" ]; then
  echo -e "${RED}错误: 未找到源 hook 文件${NC}"
  echo "  搜索路径: $SCRIPT_DIR/commit-msg"
  echo "           $SCRIPT_DIR/git-hooks/commit-msg"
  echo "           $WORKSPACE_ROOT/.wopal/scripts/git-hooks/commit-msg"
  exit 1
fi

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}   Git Hooks 安装脚本${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""
echo -e "  ${CYAN}Space Root:${NC} $WORKSPACE_ROOT"
echo -e "  ${CYAN}Source Hook:${NC} $SOURCE_HOOK"
echo ""

# 收集所有需要安装的项目（空间根 + projects/ 下独立 git 仓库）
PROJECTS=()
PROJECTS+=("$WORKSPACE_ROOT")

for dir in "$WORKSPACE_ROOT/projects"/*; do
  if [ -d "$dir/.git" ]; then
    PROJECTS+=("$dir")
  fi
done

echo -e "${CYAN}检测到的项目:${NC}"
for p in "${PROJECTS[@]}"; do
  name=$(basename "$p")
  if [ "$p" = "$WORKSPACE_ROOT" ]; then
    name="workspace-root"
  fi
  echo "  - $name"
done
echo ""

# 检测项目的 hooks 机制
detect_hooks_mechanism() {
  local project_dir="$1"

  local hooks_path
  hooks_path=$(cd "$project_dir" && git config core.hooksPath 2>/dev/null || echo "")

  if [ -n "$hooks_path" ]; then
    echo "husky"
    return
  fi

  echo "native"
}

# 安装 hook 到项目
install_hook() {
  local project_dir="$1"
  local mechanism="$2"
  local target_file
  local project_name
  project_name=$(basename "$project_dir")
  [ "$project_dir" = "$WORKSPACE_ROOT" ] && project_name="workspace-root"

  if [ "$mechanism" = "husky" ]; then
    local hooks_path
    hooks_path=$(cd "$project_dir" && git config core.hooksPath 2>/dev/null || echo "")
    target_file="$project_dir/$hooks_path/commit-msg"
    mkdir -p "$(dirname "$target_file")"
  else
    target_file="$project_dir/.git/hooks/commit-msg"
    mkdir -p "$(dirname "$target_file")"
  fi

  # 检查是否已存在且内容相同
  if [ -f "$target_file" ]; then
    if cmp -s "$SOURCE_HOOK" "$target_file"; then
      echo -e "${GREEN}  ✓ $project_name: commit-msg 已存在且内容一致 (跳过)${NC}"
      return 0
    else
      echo -e "${YELLOW}  ⚠ $project_name: commit-msg 已存在但内容不同${NC}"
      if [ -t 0 ]; then
        echo -n "    是否覆盖? [y/N] "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
          echo -e "${BLUE}    跳过 $project_name${NC}"
          return 0
        fi
      else
        echo -e "${CYAN}    自动覆盖${NC}"
      fi
    fi
  fi

  cp "$SOURCE_HOOK" "$target_file"
  chmod +x "$target_file"

  echo -e "${GREEN}  ✓ $project_name: 已安装 commit-msg ($mechanism)${NC}"
}

# 安装到每个项目
echo -e "${CYAN}安装 hooks:${NC}"
for project in "${PROJECTS[@]}"; do
  mechanism=$(detect_hooks_mechanism "$project")
  install_hook "$project" "$mechanism"
done

echo ""
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}   安装完成！${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo -e "${BLUE}提示:${NC}"
echo "  - 提交消息必须遵循 Conventional Commits 规范"
echo "  - 格式: <type>: <description>"
echo "  - 示例: feat: 添加用户认证模块"
echo ""