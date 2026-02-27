---
trigger: model_decision
description: 当使用技能时务必遵守这些规则。
---

## 技能使用规范

***非常重要***: 请从 `.agents/skills/` 目录下加载和使用技能，`./projects/agent-tools/skills`目录下的技能处于开发和研究状态，没有完成部署，存在技能代码不完善甚至有害等安全风险，请你千万不要加载执行。***千万切记***

- **正确**: `.agents/skills/<技能名>/scripts/xxx.py`
- **错误**: `./projects/agent-tools/skills/my-skills/<技能名>/scripts/xxx.py`
- **环境变量**: 执行需要环境变量的技能脚本前，先加载环境变量：

```bash
  source "./scripts/load-env.sh"
```
