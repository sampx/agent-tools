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

### 2.1.1 能力分层：日常同步 vs 高级提升/贡献

本体交互分两个层级，能力边界与确认要求不同：

| 层级 | 操作 | 需要 | 面向用户 |
|------|------|------|---------|
| **日常同步（基础）** | `update`（下行）、`space contribute` → `ontology contribute`（type 层 PR） | 所有 fork/clone 用户 | 普通 wopalspace 产品用户 |
| **跨类型提升/贡献（高级）** | `promote`（type/* → main）+ 随后的 `main` 贡献 PR | fork 模式 + 上游仓库维护者 | 上游 `wopal-space-ontology` 维护者 |

**判定规则**：
- **先完成常规更新和贡献流程**，再考虑提升/贡献。执行顺序：日常同步（`update` + type 层贡献）→ 完成 → 才评估是否跨类型提升。
- **提升/贡献是高级特性，必须主动向用户确认**：完成常规更新与贡献后，向用户确认"是否执行跨空间类型能力提升和贡献"，用户明确同意后才执行 `promote`。不得默认自动执行。
- **普通用户可能只需要日常同步**：如果用户是普通 wopalspace 产品用户（非上游维护者），日常同步即可满足，无需提升/贡献。Agent 不应把提升/贡献当作默认流程强加。

### 2.2 同步本体的含义

"同步本体"包含两个方向，缺一不可：

| 方向 | 含义 | 命令 |
|------|------|------|
| **下行** | 拉取上游最新变更到本地 | `wopal ontology update --confirm` |
| **上行** | 将本地变更贡献回上游 | `wopal space contribute` → `wopal ontology contribute` / `wopal ontology promote` |

同步不是固定的一串命令。下行更新在贡献批次开始前和 PR 合并后执行。上行贡献必须按以下层级顺序推进：

```
space/<name> → local type/* → origin/type/* → upstream PR
```

先用 `space status` 确认待贡献文件。文件仍在 space 分支时，先运行 `space contribute`。只有选定文件已经进入 local type/* 后，才能运行 `ontology contribute` 创建上游 PR。贡献过程中不要在 `space contribute` 与 type PR 之间插入 `ontology update`。

### 2.3 两种贡献路径

不是所有变更都走同样的流程。Ontology 有三层架构（main → type/* → space/*），文件按状态分为两类：

| 状态 | 含义 | 示例 | 路径 |
|------|------|------|------|
| **A-status** | 类型专属，只存在于 type/* | 特定领域的技能、工作流、集成脚本 | **短路径**：4 步 |
| **M-status** | 通用能力，最终进入 main 供所有空间共享 | 通用技能、开发流程、模板 | **长路径**：7 步 |

#### 短路径（A-status 类型专属）

```
space → type → upstream(type) → ✓ 完成
```

```
0. ontology update      如下行有待同步内容，先在本批次开始前完成
1. space contribute     space/* → local type/* → origin/type/*
2. ontology contribute  type/* → upstream(type)（话题 PR）
3. ontology update      上游合并后下行同步
```

> 类型专属的能力走此路径。不需要 promote 到 main。

#### 长路径（M-status 通用能力）

```
space → type → upstream(type) → promote → upstream(main) → ✓ 完成
```

```
0. ontology update      如下行有待同步内容，先在本批次开始前完成
1. space contribute     space/* → local type/* → origin/type/*
2. ontology contribute  type/* → upstream(type)（话题 PR）
3. ontology update      上游 type PR 合并后下行同步
4. ontology promote     type/* → main（先与用户讨论范围）
5. ontology contribute  main → upstream(main)（话题 PR，按 §2.4 分主题拆分）
6. ontology update      上游 main PR 合并后再次下行同步
```

> 通用能力（如通用技能、开发流程、模板）走此路径。promote 后 main 分支产生了新的 divergence，必须在步骤 6 再次贡献到 upstream(main)。

**关键差异**：长路径比短路径多 3 步（promote → contribute main → update）。执行时容易在 promote 后忘记 main PR。

**promote 完整性核对**（步骤 4 完成后必做）：promote 的分类器可能把新增文件误判为 A-status 排除（实测 `skills/dev-flow/tests/` 新增测试文件被漏掉）。核对 `promote --confirm` 输出的 promote 文件列表，与 type PR 的文件集合逐项比对，确认无遗漏。发现遗漏时用 `--include <files>` 强制补入。

**promote 补漏时序**：promote 后 main 领先 type/*，再次 promote 会报 `type branch is behind main` 错误。必须先 `ontology update --confirm` 同步 main → type/*，再重试 promote。补漏的 `--include` 只补新增文件，不会重复已提升内容。

### 2.4 分主题分批 PR

**一次 PR 只含一个主题。** 不同目录或功能区域的变更必须拆分为独立 PR。此规则同时适用于 type PR（步骤 2）和 main PR（步骤 5）——promote 常把多个主题的 M-status 文件一并推入 main，贡献时必须按文件目录重新拆回独立 PR。

#### 为什么必须拆分

- `--include` 可以隔离变更文件，但如果两个不相关的话题混在一个 PR 里，Reviewer 无法分别审核和合并。
- 混在一起的 PR 如果其中一个话题被 Reject，另一个也受牵连。
- Ontology 仓库是所有空间的共享基础设施，PR 历史必须清晰可追溯。

#### 拆分实例

假设 `origin/main → upstream/main` 显示以下待贡献文件：

| 文件 | 所属话题 |
|------|----------|
| `plugins/plugin-a/src/feature-x.ts` | plugin-a 新功能 |
| `plugins/plugin-a/src/feature-y.ts` | plugin-a 新功能 |
| `skills/skill-a/SKILL.md` | skill-a 技能重写 |
| `skills/skill-b/scripts/helper.py` | skill-b 脚本改进 |

应拆分为 **3 个独立 PR**：

```bash
# PR 1: plugin-a 新功能
wopal ontology contribute --type common \
  --include "plugins/plugin-a/**" \
  --message "feat(plugin-a): add feature X and Y"

# PR 2: skill-a 技能重写
wopal ontology contribute --type common \
  --include "skills/skill-a/**" \
  --message "feat(skill-a): rewrite workflow guide"

# PR 3: skill-b 脚本改进
wopal ontology contribute --type common \
  --include "skills/skill-b/scripts/helper.py" \
  --message "feat(skill-b): improve helper script"
```

#### 拆分规则

1. **按文件路径隔离**：同一目录树的变更通常属于同一话题
2. **按功能区域隔离**：不同 feature area 的变更不应混在一起
3. **批次顺序**：建议先贡献有依赖关系的 PR（如某个插件可能被其他变更依赖），同层级无依赖的可任意顺序
4. **每批重复完整门禁**：每个 PR 都独立过同步分析门禁和飞前检查门禁

### 2.5 同步门禁

每次同步操作（`contribute`、`update`、`promote`）必须依次通过两道门禁：

#### 门禁一：同步分析

禁止自动同步。Agent 必须先掌握完整状态：

1. `wopal space status` — 空间层差异
2. `wopal ontology status` — 本体层差异（领先/落后、文件级 diff）
3. 向用户汇报：变更文件、同步范围、排除策略、拆分批次
4. 用户明确确认后才进入下一步

**提升（promote）前的强制汇报**（本门禁的强化要求）：

- **主动分析，不等用户询问**：`wopal ontology status` 展示可提升项后，Agent 必须主动分类分析（M-status 可提升 / A-status 类型专属），判断哪些应提升、哪些应留在 type/*，并说明理由，向用户给出明确建议，不得静默等待或自行决定。
- **提升边界必须与用户确认**：可提升的文件范围（`--include`/`--exclude` 边界）、是否强制补入误判文件，全部列出并与用户逐项确认，用户批准前禁止执行 `promote --confirm`。
- **明确 PR 数量与信息**：分析必须预估提升后的贡献拆分为几个 PR（按 §2.4 分主题），逐个列出 PR 的文件范围、提交信息（`--message`）和顺序。PR 数量与信息经用户确认后，才允许执行 promote 和随后的 main 贡献。

#### 门禁二：飞前检查

先看再推：

1. **不加 `--confirm`** 先跑 dry-run
2. 确认列表中只有你改的文件
3. 不对则调整 `--include` glob，重跑
4. 确认无误才加 `--confirm`

> 不加 `--include` 会把分支上所有人的所有积累变更一次性全推出去。不可逆。
> dry-run 输出中被 `exclude` 的文件必须逐一目视确认——它们不会进入 PR，如果本应贡献的文件出现在 exclude 列表，说明 glob 写错了。

### 2.6 本体规则

1. **禁止自动同步。** 先分析后汇报用户，确认再执行。
2. **多个文件模式用逗号分隔，不要链式 `--include`。** `--include` 是单值参数，链式（`--include A --include B`）实测只有最后一个生效，其余模式被覆盖——会把未覆盖的变更一并推出去（不可逆）。多模式必须写成 `--include "a/**,b/**,c"`（逗号分隔，空格可选）。`--exclude` 同理。
3. **Promote 必须与用户讨论。** M-status 能力（跨空间共享）可升维；A-status（类型专属）不可。Agent 禁止自行决定 promote 范围。
4. **Clone 模式不支持 `contribute`。** 如需 PR，引导用户切换到 Fork 模式。
5. **删除风险需 `reconcile`。** `update` 报 deletion-risk 时，`type/*` 独有的文件面临被删风险。先跑 `wopal ontology reconcile --type <type> --theirs --confirm` 保留它们，再重试 `update`。
6. **执行后必须验证。** `wopal ontology status` 和 `git diff --stat upstream/main origin/main`。

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
