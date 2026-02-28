---
trigger: model_decision
description: 当使用技能时务必遵守这些规则。
keywords:
  - '*使用*技能*'
  - '*调用*技能*'
---

## 技能使用规范

***非常重要***: 请从 `.agents/skills/` 目录下加载和使用技能，`./projects/agent-tools/skills`目录下的技能处于开发和研究状态，没有完成部署，存在技能代码不完善甚至有害等安全风险，只能在用户要求进行测试时执行。***千万切记***

- **正确**: `.agents/skills/<技能名>/scripts/xxx.py`
- **错误**: `./projects/agent-tools/skills/my-skills/<技能名>/scripts/xxx.py`
- **环境变量**: 执行需要环境变量的技能脚本前，先加载环境变量：

```bash
  source "./scripts/load-env.sh"
```

### 技能脚本调用规则

- 调用技能中的脚本时, cd 进入技能目录再执行, 避免路径错误.
- 如果技能脚本是 python 脚本,请你优先直接运行, 尽量避免用 python3 或 python 执行, 如果脚本没有被授予执行权限, 优先用 python 命令执行, 因为 python3 是 macos 内部使用的环境.
