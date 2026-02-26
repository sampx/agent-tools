---
name: git-submodule
description: 管理 Git 子模块的工作流指南。适用于：(1) 在主项目中包含外部仓库，(2) 跨多个项目管理共享库，(3) 将依赖锁定到特定版本，(4) 管理 monorepo 架构的独立组件，(5) 克隆/更新/移除子模块，(6) 处理嵌套子模块。
---

# Git Submodule 工作流指南

## 核心概念

Git submodule 是在主仓库中包含其他 Git 仓库的功能：
- 子模块通过引用**特定提交**来固定版本
- `.gitmodules` 文件记录子模块路径和 URL
- 子模块内的变更通过**独立提交**管理
- 修改嵌套子模块需要**从内向外逐层提交**

## 通用工作流

### 工作流 1：日常开发

**场景**：在子模块内修改代码

```bash
# 1. 进入子模块
cd <submodule-path>

# 2. 切换分支（解除 detached HEAD）
git checkout main

# 3. 开发、提交、推送
git add . && git commit -m "feat: xxx"
git push

# 4. 回到主仓库
cd <main-repo-root>

# 5. 更新主仓库的子模块引用
git add <submodule-path>
git commit -m "chore: 更新子模块引用"
git push
```

### 工作流 2：克隆含子模块的项目

```bash
# 完整克隆（包含所有子模块和嵌套）
git clone --recurse-submodules <repository-url>

# 或分步执行
git clone <repository-url>
cd <repository>
git submodule update --init --recursive
```

### 工作流 3：选择性克隆

```bash
# 只克隆主项目
git clone <repository-url>
cd <repository>

# 只初始化特定子模块
git submodule update --init <submodule-path>

# 初始化子模块及其嵌套子模块
git submodule update --init --recursive <submodule-path>
```

### 工作流 4：更新子模块到远程最新

```bash
# 更新所有子模块
git submodule update --remote --merge

# 更新特定子模块
git submodule update --remote <submodule-path> --merge

# 使用 rebase 代替 merge
git submodule update --remote --rebase
```

### 工作流 5：同步嵌套子模块上游更新

**场景**：子模块内有嵌套的第三方子模块，需要跟踪上游更新

```bash
# 1. 进入父级子模块
cd <parent-submodule>

# 2. 更新嵌套子模块
git submodule update --remote <nested-submodule-path>

# 3. 在父级子模块中提交
git add <nested-submodule-path>
git commit -m "chore: 同步嵌套子模块上游更新"
git push

# 4. 回到主仓库
cd <main-repo-root>

# 5. 更新主仓库引用
git add <parent-submodule>
git commit -m "chore: 同步子模块（嵌套更新）"
git push
```

### 工作流 6：检查子模块状态

```bash
# 查看所有子模块状态
git submodule status

# 递归查看（包含嵌套）
git submodule status --recursive

# 查看变更摘要
git submodule summary
```

### 工作流 7：批量操作

```bash
# 在所有子模块中切换分支
git submodule foreach 'git checkout main'

# 在所有子模块中拉取最新
git submodule foreach 'git pull origin main'

# 递归操作（包含嵌套）
git submodule foreach --recursive 'git fetch origin'

# 检查所有子模块状态
git submodule foreach 'git status'
```

---

## 快速参考

| 操作 | 命令 |
|------|------|
| 初始化子模块 | `git submodule update --init --recursive` |
| 更新到远程最新 | `git submodule update --remote --merge` |
| 查看状态 | `git submodule status` |
| 批量执行 | `git submodule foreach 'cmd'` |
| 解除 detached HEAD | `cd <submodule> && git checkout main` |
| 添加子模块 | `git submodule add -b main <url> <path>` |
| 移除子模块 | `git submodule deinit <path> && git rm <path>` |

---

## 详细参考

- **命令参考**：[commands.md](references/commands.md) - 完整命令列表
- **实战示例**：[examples.md](references/examples.md) - 常见场景示例
- **故障排除**：[troubleshooting.md](references/troubleshooting.md) - 常见问题与最佳实践
