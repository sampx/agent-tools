---
description: 为未提交的更改创建 Git commit
---

# 提交变更

为未提交的更改创建符合 Conventional Commits 规范的 commit。

**参数输入**: `$ARGUMENTS` （目标仓库，可选）

---

## 核心原则

- **意图优先分组** - 按变更意图/功能单元分组，而非文件类型
- **上下文驱动** - 关联会话上下文，message 描述"为什么改"
- **精准定位** - 有参数只处理指定仓库；无参数优先推断工作上下文
- **一次性确认** - 批量展示计划，确认后执行

---

## 步骤1：确定目标仓库

### 有参数

模糊匹配项目名/路径/别名，定位到单一仓库。

### 无参数

按优先级推断：

1. **当前目录**：在子项目内 → 仅处理该子项目
2. **会话上下文**：本次对话操作过的文件所属项目
3. **最近变更**：`git status` 显示的唯一有变更的项目
4. **全量扫描**：以上都无法确定时，扫描所有子项目 + 工作空间

---

## 步骤2：分析变更意图

```bash
git status --short
git diff --stat
```

**核心任务**：
1. 列出所有变更文件
2. **读取 diff 内容**，理解每个变更的目的
3. 按「变更意图」分组（同一功能/修复/重构的文件归一组）
4. 为每组确定 type 和 message

### 分组示例

```
变更文件:
  - src/auth/login.ts
  - src/auth/token.ts
  - docs/api/auth.md
  - README.md (无关修改，更新安装说明)

分组:
  组1 (feat): 登录功能增强 → login.ts + token.ts + auth.md
  组2 (docs): 更新安装说明 → README.md
```

### Type 判断

| Type | 判断依据 |
|------|----------|
| `feat` | 新增功能/能力 |
| `fix` | 修复 bug/错误 |
| `refactor` | 重构代码，不改变功能 |
| `docs` | 仅文档变更 |
| `test` | 仅测试相关 |
| `chore` | 构建/配置/依赖 |

---

## 步骤3：生成提交计划

```
📋 提交计划（共 N 个提交）

1. feat: 增加登录 token 自动刷新
   - src/auth/login.ts
   - src/auth/token.ts
   - docs/api/auth.md

2. docs: 更新安装说明中的依赖版本
   - README.md

...
```

**message 规范**：
- 描述"为什么改"或"改了什么功能"，而非"改了什么文件"
- 简洁明确，避免笼统的"更新文件"

⚠️ 等待用户确认（yes/no）

---

## 步骤4：执行提交

```bash
# 按组依次提交
git add <files-group-1>
git commit -m "feat: 增加登录 token 自动刷新"

git add <files-group-2>
git commit -m "docs: 更新安装说明中的依赖版本"
```

**完成后**：
- 单子项目变更 → 结束
- 多子项目/工作空间变更 → 提醒 `/pin-submodule`
