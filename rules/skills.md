---
trigger: model_decision
description: 用户要求开发 skill 技能时，严格遵循此流程规则。
---

# 技能（Skills）开发规范

## 技能结构
每个技能必须包含：
- `SKILL.md` - 技能说明文档
- `scripts/` - 可执行脚本目录
- 可选：`examples/` - 使用示例

## SKILL.md Frontmatter
必须包含：
```yaml
---
name: skill-name
description: 技能描述（1-1024 字符）
---
```

可选字段：
- `license` - 许可证
- `compatibility` - 兼容性说明
- `metadata` - 元数据（字符串到字符串的映射）

## 技能命名规则
- 1-64 字符
- 小写字母、数字和单个连字符分隔符
- 不能以 `-` 开头或结尾
- 不能有连续的 `--`
- 必须与目录名匹配

正则表达式：`^[a-z0-9]+(-[a-z0-9]+)*$`

如果技能复杂，请务必使用 skill-creator 技能来了解详细开发规范。

## 脚本开发
- 使用 Python 或 Shell 脚本
- 如果使用 Python，要用 `#!/usr/bin/env python`，使其可以直接运行
- 添加适当的执行权限
- 添加文档和使用示例
- 处理错误并返回适当的退出码

## 技能开发路径
-  `projects/agent-tools/skills/my-skills/<name>/SKILL.md`

## 技能部署路径
- 项目级：`.agents/skills/<name>/SKILL.md`
- 全局级：`~/.agents/skills/<name>/SKILL.md`

## 技能部署
- 使用 skill-deployer 技能进行部署