---
description: 创建或更新项目 AGENTS.md
---

# 创建或更新 Agent 规则

创建或更新项目级或目录级 `AGENTS.md`。

**用户输入参数**: `$1` `$2`

**参数说明**: `[路径|项目名] [额外规则上下文]`。路径或项目名必填；仅给项目名时，结合 `.wopal-space/STRUCTURE.md` 和 `projects/` 推断候选，无法唯一确定则确认。

---

## 工作方式

本命令只是入口引导——权威规范在 `space-master` 技能中。

1. 加载 `space-master` 技能。
2. 按技能中「AGENTS.md 维护」章节及 `references/agents-md-maintenance.md` 的完整规范开展工作：规则审计、确认计划、语言版本顺序、质量清单。
3. 命令无法解决时，用技能的路由表找到正确流程。

不要在此重复或改写规范内容。有疑问时，阅读参考文档。
