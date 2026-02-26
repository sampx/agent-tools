---
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

1. **不要用 `rm -rf` 操作子模块目录**，必须用 `git rm -r`
2. **进入子模块后第一步必须 `git checkout main`**，否则处于 detached HEAD 状态提交会丢失
3. **修改完子模块必须回到主仓库更新引用指针**，否则主仓库无法感知子模块的最新提交

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
