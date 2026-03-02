---
description: 为未提交的更改创建 Git commit
---

为所有未提交的更改创建一个符合规范的 commit。

## 阶段一：检查与分析（只读）

一次性执行以下命令获取完整上下文：
```bash
git status && git diff HEAD && git status --porcelain && git rev-parse --show-toplevel
```

根据 `git diff` 内容判断更改类型：
- `feat` - 新功能
- `fix` - Bug 修复
- `refactor` - 重构（不改变功能）
- `docs` - 文档更新
- `test` - 测试相关
- `chore` - 构建/工具

## 阶段二：暂存并请求确认

使用 `git add <specific_files>` 精细暂存文件，**禁止 `git add .`**。

一次性执行：
```bash
git add <file1> <file2> ... && git diff --staged
```

⚠️ **安全拦截点**：
- 展示暂存的代码差异
- 提议符合规范的中文 commit message
- 等待用户确认

## 阶段三：执行提交（写入操作）

**只有在获得用户明确授权后**，一次性执行：
```bash
git commit -m "<审批过的提交信息>" && git status
```

## 子模块提醒

检查是否在子模块中：
```bash
git rev-parse --show-superproject-working-tree
```

如果返回路径，提醒用户：
> 这似乎是一个子模块，如果您认为它达到了更新里程碑，可以稍后在主项目使用 `/pin-submodule` 刷新最新快照指针。