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

本项目使用 Git Submodule 管理独立项目，修改子模块后需**逐层提交**：请务必使用 git-submodule 技能.

## 项目结构

```
ai-toolbox/ (主仓库)
├── projects/python/flex-scheduler/    # → sampx/flex-scheduler
├── projects/web/wopal/                # → wopal-cn/wopal
└── projects/agent-tools/              # → sampx/agent-tools
```

## 日常开发流程

1. 在子模块内提交：
   ```bash
   cd projects/agent-tools && git add . && git commit -m "feat: xxx" && git push
   ```

2. 回到主仓库更新子模块引用：
   ```bash
   cd ../.. && git add projects/agent-tools && git commit -m "chore: 更新子模块"
   ```

## 同步嵌套子模块上游

```bash
cd projects/agent-tools
git submodule update --remote skills/download/openclaw/openclaw-security-monitor
git add . && git commit -m "chore: 同步上游更新" && git push
cd ../.. && git add projects/agent-tools && git commit -m "chore: 同步子模块上游更新"
```
