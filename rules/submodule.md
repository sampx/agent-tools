---
trigger: model_decision
description: 涉及到 git submodule 的版本管理任务时加载此规则。
globs:
  - 'projects/python/**'
  - 'projects/web/**'
  - 'projects/agent-tools/**'
keywords:
  - 'submodule'
  - 'git submodule'
---

# Git Submodule 工作流

本项目使用 Git Submodule 管理独立项目，修改子模块后需**逐层提交**：请务必使用 git-submodule 技能。

## 项目结构

```
ai-toolbox/ (主仓库 → cnb.cool/wopal/ai-toolbox)
├── projects/python/flex-scheduler/    # → cnb.cool/wopal/wopal-admin
├── projects/web/wopal/                # → cnb.cool/wopal/wopal-site
└── projects/agent-tools/              # → github.com/sampx/agent-tools
    └── skills/download/openclaw/openclaw-security-monitor/  # 嵌套子模块（上游 adibirzu）
```

## ⚠️ 必须遵守的规则

1. **彻底移除子模块时切忌只删目录**：如果需要从主工程移除某个子模块档案，绝对不能只用 `rm -rf` 删物理文件夹，必须使用 `git rm -r <路径>` 让主仓库彻底清除对其追踪的印记。
2. **警惕在克隆或拉取后处于游离状态（Detached HEAD）开发**：主仓库的 `update` 操作会将子模块强制定格在固定的 Commit ID 上。写代码前须主动 `git checkout <您的分支>`（如 `main` 或特性分支）将代码绑定到工作区。
3. **主仓库只记录里程碑/稳定版的指针**：子模块可以有频繁的阶段性提交（推送到其子模块远端即可），**无需每次都更新主仓库指针**。只有当子模块开发完成、准备向主工程全团队发布这一变动时，才回到主仓库执行 `git add <子模块路径>` 并提交引用更新。

## 日常开发流程

```bash
# Step 1: 进入子模块，切换到 main 分支
cd projects/web/wopal   # 或其他子模块路径
git checkout main

# Step 2: 修改、提交、推送子模块
git add . && git commit -m "feat: xxx" && git push

# Step 3: 回到主仓库，更新子模块引用（必须执行！）
cd ../..
git add projects/web/wopal
git commit -m "chore: 更新 wopal 子模块" && git push
```

## 同步嵌套子模块上游（openclaw）

```bash
cd projects/agent-tools
git checkout main
git submodule update --remote skills/download/openclaw/openclaw-security-monitor
git add skills/download/openclaw/openclaw-security-monitor
git commit -m "chore: 同步 openclaw-security-monitor 上游更新" && git push

cd ../..
git add projects/agent-tools
git commit -m "chore: 同步子模块上游更新" && git push
```

## 子模块出现大量"删除"变更时（紧急修复）

```bash
# 在出问题的子模块里执行
cd projects/<子模块路径>
git fetch origin && git reset --hard origin/main
```
