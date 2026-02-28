---
description: 为未提交的更改创建 Git commit
---

为所有未提交的更改创建一个新的 commit。

1. **检查上下文**: 运行 `git status && git diff HEAD && git status --porcelain`
   - 判断当前位置: `git rev-parse --show-toplevel`

2. **暂存文件**:
   - ⚠️ **关键规则**: **始终**使用 `git add <specific_files>` 明确指定文件 - **禁止**使用 `git add .`
   - 此规则适用于主仓库和 submodule
   - 提交前用 `git diff --staged` 检查已暂存的更改
   - 注意排除敏感文件（`.env`、密钥等）、缓存文件以及日志文件等

3. **验证提交**: 运行 `git status` 确认提交成功

4. **Submodule 提醒**: 如果在 submodule 中提交，提醒用户是否需要更新主仓库的快照指针（仅在发布 milestone 时才需要）
