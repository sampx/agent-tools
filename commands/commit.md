---
description: 为未提交的更改创建 Git commit
---

为所有未提交的更改创建符合规范的 commit，包括子项目内部的变更。

## 阶段一：检查与分析（只读）

### 1.1 检查主仓库状态

```bash
git status && git diff HEAD && git status --porcelain && git rev-parse --show-toplevel
```

### 1.2 检查子项目状态

**关键：** 如果发现子项目显示 `modified content` 或 `untracked content`，必须进入子项目内部检查：

```bash
# 列出所有子项目状态
git submodule status

# 对每个 dirty 的子项目，进入检查
cd <submodule-path> && git status && git diff HEAD
```

### 1.3 分析变更类型

根据 `git diff` 内容判断更改类型：
- `feat` - 新功能
- `fix` - Bug 修复
- `refactor` - 重构（不改变功能）
- `docs` - 文档更新
- `test` - 测试相关
- `chore` - 构建/工具

## 阶段二：子项目提交（优先处理）

**如果子项目内有变更，必须先在子项目内提交。**

### 2.1 暂存子项目变更

进入子项目目录：
```bash
cd <submodule-path> && git add <file1> <file2> ... && git diff --staged
```

⚠️ **安全拦截点**：
- 展示子项目暂存的代码差异
- 提议符合规范的中文 commit message
- 等待用户确认

### 2.2 提交子项目变更

**只有在获得用户明确授权后**，在子项目内执行：
```bash
cd <submodule-path> && git commit -m "<审批过的提交信息>" && git status
```

### 2.3 重复处理其他子项目

对所有有变更的子项目重复 2.1-2.2 步骤。

## 阶段三：主仓库提交

### 3.1 暂存主仓库变更

回到主仓库根目录，使用 `git add <specific_files>` 精细暂存文件，**禁止 `git add .`**。

```bash
git add <file1> <file2> ... && git diff --staged
```

⚠️ **安全拦截点**：
- 展示暂存的代码差异
- 提议符合规范的中文 commit message
- 等待用户确认

### 3.2 提交主仓库变更

**只有在获得用户明确授权后**，一次性执行：
```bash
git commit -m "<审批过的提交信息>" && git status
```

## 阶段四：子项目快照提示

**如果刚才提交了子项目变更**，提醒用户：

> ✅ 子项目 `<name>` 已提交。
> 
> 是否需要更新主仓库的子项目指针？如需要，请使用 `/pin-submodule` 命令。

## 环境检测

检查是否在子项目中：
```bash
git rev-parse --show-superproject-working-tree
```

如果返回路径，说明当前在子项目内，提醒用户：
> 当前在子项目中。提交后如需更新主项目快照，请切换到主项目使用 `/pin-submodule`。

## 重要原则

1. **先子项目，后主仓库**：子项目变更必须在子项目内独立提交
2. **逐层提交**：不能跨模块污染 Git 历史
3. **等待确认**：每次提交前必须展示差异并等待用户确认
4. **中文 commit message**：遵循 Conventional Commits 规范
