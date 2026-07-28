---
name: space-master
description: |
  空间工作规范总纲。[MUST LOAD FIRST] — Wopal 不确定怎么做或任务意图不明确时，第一个加载本技能。

  Triggers: 任何意图不明确的任务、"用什么流程"、"该加载什么技能"、
  技能管理（安装/卸载/搜索）、空间运维（worktree/同步/上游/PR贡献）、多 Space 管理。
  
  [CRITICAL] 即使用户未明确说"上游同步"，只要涉及 ontology 仓库协作（update/sync/contribute/promote/PR），就必须加载本技能。
---

# space-master — 空间工作规范总纲

本技能定义 Wopal 空间流程选择、场景技能路由、Ontology 本体开发契约、插件配置诊断机制、以及标准本体维护与 PR 贡献操作规程。

---

## 一、 空间工作体系与技能路由

### 1. 空间工作流程表

| 流程 | 适用场景 | 加载技能 |
|------|---------|---------|
| **dev-flow** | 开发/修复/重构 GitHub Issue、Plan 驱动的小功能迭代 | dev-flow + agents-collab |
| **无流程** | 单纯研究、讨论、解释、评审、临时小改动 | 无（Wopal Directly Process） |

`dev-flow` 是默认开发流程。

### 2. 场景➔技能路由表

| 场景 | 加载技能 | 说明 |
|------|---------|------|
| 开发/修复/重构 Issue | dev-flow + agents-collab | 先加载 agents-collab，再走 dev-flow |
| 委派任何子 Agent | agents-collab | 任何委派前必须加载 |
| 空间与本体运维（技能安装/同步/上游PR/Promote） | 仅本技能 | 不加载 dev-flow 或 agents-collab |
| 创建/修改技能 | skill-creator | 独立技能（修改/创建技能前必载） |
| 配置 ellamaka | ellamaka-config | 独立技能 |

---

## 二、 Ontology 本体开发契约与 dev-flow 规范

对本体能力或项目进行开发、修复与重构时，遵循以下官方标准契约：

### 1. 本体运行时契约
`.wopal/` 目录是当前空间绑定的本体运行时 worktree（对应 `space/<name>` 分支）。在 `.wopal/` 内直接编辑会实时作用于正在运行的插件与技能。

### 2. Issue / Plan 驱动开发契约 (dev-flow)
当任务涉及开发、修复、重构或小功能迭代时，**必须加载并遵循 `dev-flow` 技能**：
- 任务必须由 Issue 或 Plan 驱动，走 `flow.sh` 标准状态机：`planning → reviewing → executing → verifying → done`。
- 严禁绕过 `dev-flow` 手动进行非标准的分支或隔离开发。

### 3. 基础设施与分支管理铁律
- **基础设施独占**：Worktree 与 Feature 分支的生命周期由 `dev-flow` 脚本（`approve` / `verify-switch` / `archive`）独占管理。
- **Agent 分支约束**：Agent **禁止**手动创建或删除任何分支（禁止 `git branch -d/-D`）、**禁止**手动删除或创建 Worktree。Agent 唯一允许的分支操作是 `git merge`。

---

## 三、 插件配置与诊断日志 (wopal-plugin)

### 1. 配置文件加载优先级
```
3. 系统/Shell 环境变量（最高优先，不被 .env 覆盖）
2. 空间级 .wopal/.env               (仅当前空间生效)
1. 用户级 <WOPAL_HOME>/.env         (跨空间共享配置)
```

### 2. 诊断日志路径
- **空间内运行日志**：`<workspace>/.wopal-space/logs/wopal-plugin.log`
- **空间外运行日志**：`<WOPAL_HOME>/logs/wopal-plugin.log`
当插件运行异常或权限被拒时，Agent 应优先查看上述日志文件排查根因。

---

## 四、 Ontology 运维与 PR 贡献规程

### 1. 本体运行模式契约（Clone vs Fork Mode）
在建议或执行任何上游操作前，必须先调用 `wopal ontology status` 明确当前的本体运行模式（Mode）：

- **Clone 模式 (clone)**：默认单仓库源模式。`origin` 即官方/私有上游，无独立 Fork。
  - **能力限制**：**完全不支持 `contribute` 上游 PR 贡献操作，仅供自用与下行同步 (`update`)**。
  - **Agent 行为**：若用户要求提交上游 PR，Agent 必须提示 Clone 模式不支持 `contribute`，引导用户配置为 Fork 模式后再操作。
- **Fork 模式 (fork)**：开发者跨仓库模式。`origin` 为用户的 Fork 仓库，`upstream` 为官方上游。
  - **能力支持**：完整支持下行同步 (`update`) + 上游 PR 贡献 (`contribute`) + 主干提炼升维 (`promote`)。

### 2. 标准运维与 PR 贡献流程 (Fork 模式)

```
[空间层 space/*] 
      │ 1. space contribute (--include 链式)
      ▼
[类型层 type/*] 
      │ 2. ontology contribute (--include 链式) ➔ 在 GitHub Fork 远端自动创建 PR
      ▼
[官方上游 upstream] (GitHub 网页点击 Merge)
      │ 3. ontology update (--confirm) ➔ 拓扑平滑对齐 + 自动擦除 origin 陈旧临时分支
      ▼
[主干升维 promote] (--include 链式) ➔ 从 type/* 提炼通用能力回流 main 主干
```

- **检查状态与 Mode（预检）**：`wopal ontology status`
- **空间合入类型**：`wopal space contribute --message "feat(scope): description" --confirm`
- **创建上游 PR（Fork 模式，链式 `--include`）**：
  ```bash
  wopal ontology contribute \
    --type coding \
    --include "skills/dev-flow/**" \
    --include "skills/space-master/**" \
    --message "feat(skills): update dev-flow and space-master skills" \
    --confirm
  ```
- **网页合并后下行收尾**：`wopal ontology update --confirm`
- **主干提炼升维**：
  ```bash
  wopal ontology promote \
    --from type/coding \
    --include "templates/**" \
    --include "docs/**" \
    --message "feat(ontology): promote generic templates to main" \
    --confirm
  ```

### 3. 验证与自我推查规程
命令执行或技能修改后，Agent 必须进行自我验证，严禁未经验证即声明成功：
- **技能改动验证**：`ls -la .wopal/skills/<skill-name>/SKILL.md` 以及 `wopal skills list`
- **PR 贡献/推送验证**：`wopal ontology status` 以及 `git diff --stat upstream/main origin/main`
- **插件改动验证**：检查日志 `<workspace>/.wopal-space/logs/wopal-plugin.log`

### 4. 核心硬约束
- **Mode 检查约束**：Clone 模式下坚决禁止构建或调用 `contribute` 命令。
- **先状态后操作**：构建并执行修改类命令前，必须先调用 `wopal ontology status` 确认 Mode 与拓扑。
- **链式 `--include` 白名单**：贡献或升维时必须传入链式 `--include` 明确白名单范围。

---

## 五、 深度参考入口

* [ontology-maintenance.md](references/ontology-maintenance.md) — 本体三层架构、Clone/Fork 模式契约、Status 三段解读、Deletion-Risk 响应与冲突矩阵
* [skills-maintenance.md](references/skills-maintenance.md) — 技能 lifecycle 管理、安全扫描、安装与质量评估规程
