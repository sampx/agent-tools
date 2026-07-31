---
name: space-master
description: |
  空间工作规范总纲。[MUST LOAD FIRST] — Wopal 不确定怎么做或任务意图不明确时，第一个加载本技能。

  Triggers: 任何意图不明确的任务、"用什么流程"、"该加载什么技能"、
  技能管理（安装/卸载/搜索）、空间运维（worktree/同步/上游/PR贡献）、多 Space 管理。

  [CRITICAL] 即使用户未明确说"上游同步"，只要涉及 ontology 仓库协作（update/sync/contribute/promote/PR），就必须加载本技能。
---

# space-master

负责 Wopal 的流程选择、场景路由、Ontology 本体维护和技能生命周期管理。

---

## 一、何时使用

| 场景 | 加载 | 说明 |
|------|------|------|
| 开发/修复/重构（Issue/Plan） | `dev-flow` + `agents-collab` | 先 agents-collab，再 dev-flow |
| 委派子 Agent | `agents-collab` | 委派前必须加载 |
| Ontology 运维（同步/贡献/升维） | 仅 `space-master` | 不加载 dev-flow 或 agents-collab |
| 创建/修改技能 | `skill-creator` | 独立技能 |

`dev-flow` 是默认开发流程，任务必须走标准状态机：`planning → reviewing → executing → verifying → done`。

---

## 二、Ontology 本体维护

### 2.1 运行模式

操作前先确认模式：

| 模式 | 能力 | Origin |
|------|------|--------|
| **clone** | 仅 `update`（下行同步） | 直连上游仓库 |
| **fork** | `update` + `contribute`（上游 PR）+ `promote` | 用户 Fork → 上游 |

命令：`wopal ontology status`

### 2.2 标准流程（Fork 模式）

```
1. space contribute   space/* → type/*
2. ontology update    上游 → 本地（上行贡献前先拉取最新）
3. ontology contribute  PR type/* → upstream（GitHub）
4. ontology update    上游合并后下行同步
5. ontology promote   type/* → main（先与用户讨论范围）
```

`contribute` 前必须先 `update`——不拉取上游最新就直接推送，容易产生冲突和过期 diff。

**命令**（全部需要链式 `--include`）：

```bash
# 1. 空间 → 类型
wopal space contribute \
  --include "skills/<name>/**" \
  --message "feat(scope): description" --confirm

# 2. 下行同步
wopal ontology update --confirm

# 3. 类型 → 上游 PR
wopal ontology contribute \
  --type coding \
  --include "skills/<name>/**" \
  --include "docs/**" \
  --message "feat(scope): description" --confirm

# 4. 合并后下行同步
wopal ontology update --confirm

# 5. 升维到 main
wopal ontology promote \
  --from type/coding \
  --include "templates/**" \
  --message "feat(ontology): promote generic templates to main" --confirm
```

### 2.3 同步门禁

每次同步操作（`contribute`、`update`、`promote`）必须依次通过两道门禁：

#### 门禁一：同步分析

禁止自动同步。Agent 必须先掌握完整状态：

1. `wopal space status` — 空间层差异
2. `wopal ontology status` — 本体层差异（领先/落后、文件级 diff）
3. 向用户汇报：变更文件、同步范围、排除策略
4. 用户明确确认后才进入下一步

#### 门禁二：飞前检查

先看再推：

1. **不加 `--confirm`** 先跑 dry-run
2. 确认列表中只有你改的文件
3. 不对则调整 `--include` glob，重跑
4. 确认无误才加 `--confirm`

> 不加 `--include` 会把分支上所有人的所有积累变更一次性全推出去。不可逆。

### 2.4 本体规则

1. **禁止自动同步。** 先分析后汇报用户，确认再执行。
2. **必须链式 `--include`。** 多个叠加生效，每个 glob 对应一个目录。
3. **分主题独立 PR。** 按目录或功能区域拆分子主题。
4. **Promote 必须与用户讨论。** M-status 能力（跨空间共享）可升维；A-status（类型专属）不可。
5. **Clone 模式不支持 `contribute`。** 如需 PR，引导用户切换到 Fork 模式。
6. **删除风险需 `reconcile`。** `update` 报 deletion-risk 时，`type/*` 独有的文件面临被删风险。先跑 `wopal ontology reconcile --type <type> --theirs --confirm` 保留它们，再重试 `update`。
7. **执行后必须验证。** `wopal ontology status` 和 `git diff --stat upstream/main origin/main`。

---

## 三、技能维护

### 3.1 生命周期

```
找 → 下 → 扫 → 装 → 评 → 删
```

```bash
wopal skills find "<query>"              # 搜索注册表
wopal skills download owner/repo@name    # 下载到审核区
wopal skills scan <name>                 # 安全扫描（强制步骤）
wopal skills install /path --force       # 安装到运行时
wopal skills remove <name> --force       # 从空间移除
```

### 3.2 技能规则

1. **安装前必须扫描。** `wopal skills scan` 是强制步骤——检查恶意代码、数据外泄、非法触发器。禁止跳过。
2. **变更后必须验证。** 安装或编辑后：`ls -la .wopal/skills/<name>/SKILL.md` 和 `wopal skills list`。
3. **创建/修改走 `skill-creator`。** 新建或编辑技能必须加载 `skill-creator` 技能。

---

## 四、参考资料

技能正文覆盖核心要点。遇到故障或边缘场景时，**必须阅读参考文档**——完整协议在其中：

| 文档 | 内容 |
|------|------|
| `references/ontology-maintenance.md` | 三层架构（main → type/* → space/*）、状态信号解读矩阵、按文件类型的冲突处理、远程分支清理 |
| `references/skills-maintenance.md` | 完整生命周期细节、安全扫描检查项、质量评估标准 |
