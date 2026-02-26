---
trigger: model_decision
description: 使用 skill 技能过程中，发现需要环境变量时应用此规则。
---

## 规则描述
在执行需要环境变量的 Skills（技能）之前，必须确保项目的环境变量已被加载，以保证脚本和工具能访问必要的配置。

建议使用以下方式加载，以适应不同的工作目录：

```bash
# 方式 1: 确保在项目根目录下执行
source ./scripts/load-env.sh

# 方式 2: 如果在子目录下，使用动态路径（推荐）
source "$(git rev-parse --show-toplevel)/scripts/load-env.sh"
```

## 技能路径

本项目技能存放在 `.agents/skills/`（OpenCode 兼容目录）：
```
.agents/skills/<技能名>/scripts/xxx.py
```