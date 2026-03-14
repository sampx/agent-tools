# Agent Tools

AI Agent 工具集，包含自定义命令、规则、技能和插件，用于增强 AI 编码助手的能力。

## 核心功能

| 功能 | 说明 |
|------|------|
| **自定义命令** | 扩展 AI 助手的指令集（Git 提交、PRD 创建、功能规划等） |
| **开发规范** | TypeScript、Python、Astro、Git Flow 等规则文件 |
| **技能系统** | OpenSpec 工作流、技能安全扫描、文档抓取等 |
| **子代理** | Claude Code 和 OpenCode 的专用子代理配置 |

## 目录结构

```
agent-tools/
├── commands/        # 共享命令
├── rules/           # 开发规范
├── skills/          # 共享技能
└── agents/          # Agent 专用资源
```

## 主要技能

| 技能 | 功能 |
|------|------|
| `agent-orchestration` | 多 Agent 编排协作 |
| `skill-security-scanner` | 技能安全扫描（20 项检查） |
| `ai-ref-creator` | 官方文档压缩为 AI 参考 |
| `website-doc-scraper` | 网站文档抓取 |
| `git-worktrees` | Worktree 工作流管理 |
| `opencode-config` | OpenCode 配置管理 |

## 开发

```bash
# 部署到工作空间
python scripts/sync-to-wopal.py -y

# 验证部署
ls .wopal/commands .wopal/rules .wopal/skills
```

## 文档

- [AGENTS.md](AGENTS.md) - 完整开发规范与架构说明

## License

MIT
