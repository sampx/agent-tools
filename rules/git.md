---
keywords:
  - 'git commit'
  - '提交变更'
  - '版本管理'
---
# Git 工作流与最佳实践

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
