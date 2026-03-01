---
trigger: always_on
---
# Git 工作流规则

## **AI 代理约束**
- 必须先提供代码或文件变更供用户在编辑器中评审，**只有在用户明确确认并要求 commit 的情况下**，才能执行 `git commit` 或 `git push` 操作，严禁私自自动提交。
- 务必使用**项目规定的语言**生成 commit message, 通常会在 AGENTS.md 中明确。

## 提交规范
使用 Conventional Commits 规范：
- `feat:` - 新功能
- `fix:` - Bug 修复
- `refactor:` - 重构
- `docs:` - 文档更新
- `test:` - 测试相关
- `chore:` - 构建/工具相关

示例：
```
feat: add new scheduling engine with cron support
fix: resolve memory leak in browser handler
docs: update installation guide
```

## 分支策略
- `main` - 主分支，稳定版本
- `feature/*` - 功能分支
- `bugfix/*` - Bug 修复分支
- `hotfix/*` - 紧急修复分支

## 工作流程
1. 从 main 创建功能分支
2. 开发并提交更改
3. 推送到远程
4. 创建 Pull Request
5. Code Review
6. 合并到 main

## 最佳实践
- 保持提交原子性（每次提交一个逻辑更改）
- 编写清晰的提交信息
- 提交前运行测试
- 使用 `.gitignore` 排除敏感文件
- 不要提交 `.env` 文件
- 不要提交 `__pycache__/`, `node_modules/` 等构建产物

## 子模块工作流

如果项目使用 Git Submodule，请遵循以下原则：

- 修改子模块后需**逐层提交**（先子模块，后主仓库）
- 开发前必须切换分支，避免 detached HEAD
- 主仓库只记录里程碑版本指针

> 详细指南请使用 `/git-submodule` 技能
