---
description: 为未提交的更改创建 Git commit
---

为所有未提交的更改创建一个并且符合规范的 commit。

1. **检查上下文与分析更改**: 
   - 运行 `git status && git diff HEAD && git status --porcelain`
   - 判断当前位置: `git rev-parse --show-toplevel`
   - 根据 `git diff` 的内容，在内部总结这是属于 `feat`, `fix`, `refactor`, `docs` 等哪种类型的更改（严格遵循 Conventional Commits 规范）。

2. **精细暂存文件**:
   - ⚠️ **关键规则**: **始终**使用 `git add <specific_files>` 明确指定文件 - **禁止**使用 `git add .`
   - 此规则适用于主仓库和 submodule。
   - 注意排除敏感文件（`.env`、密钥等）、缓存文件以及不相关的产物。
   - 运行 `git diff --staged` 生成已暂存更改的回顾。

3. **请求用户审核与确认 (强制拦截)**:
   - 基于暂存的代码差异，向用户提议一个遵循 Conventional Commits 规范的提交信息（例如 `feat: add new XXX feature`）。
   - **核心安全红线：必须在这里停止操作，等待用户在编辑器中评审，明确要求用户确认是否可以进行 Commit。**

4. **执行提交与验证**:
   - **只有在获得用户明确授权后**，才能运行 `git commit -m "<审批过的提交信息>"`。
   - 运行 `git status` 确认提交成功。

5. **Submodule 提醒闭环**: 
   - 检查提交是否发生在一个子模块中。如果是，请贴心地提醒用户：“这似乎是一个子模块，如果您认为他达到了更新里程碑，您可以稍后在主项目使用 `/pin-submodule` 刷新最新快照指针。”
