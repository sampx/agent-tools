---
name: space-master
description: |
  WopalSpace 空间的根技能与总纲。空间的一切能力——如何运行、如何配置、如何编写命令/规则/技能/模板——都定义在本体（ontology）仓库中，通过本体的更新、贡献、提升流程在空间间分发、传播和优化。

  必须加载的场景：
  - 本体仓库操作：更新（update）、同步（sync）、贡献（contribute）、提升（promote）、PR
  - 空间结构维护：space init/status、.wopal 目录结构、空间如何运行与配置
  - 空间能力编写：命令、规则、技能、模板的编写与修改规范
  - AGENTS.md 编写：创建或更新项目级/目录级 AGENTS.md
  - 技能生命周期：安装、扫描、移除
  - 意图不明确、不确定用哪个流程/技能时，作为总纲路由到正确技能

  [CRITICAL] 涉及 ontology 仓库协作（update/sync/contribute/promote/PR）时，即使用户未明确说"上游同步"，也必须加载本技能。
---

# space-master

负责 Wopal 的流程选择、场景路由、Ontology 本体维护、AGENTS.md 维护和技能生命周期管理。

---

## 技能使用场景

空间内的技能各司其职。按场景选择，不叠加加载：

| 场景 | 加载 | 要点 |
|------|------|------|
| 开发/修复/重构（Issue/Plan 驱动） | `dev-flow` | 默认开发流程；任务走其状态机（planning → reviewing → executing → verifying → done） |
| 委派任何子 Agent（fae/rook/wsf-* 等所有类型） | `agents-collab` | 委派前必须加载；覆盖委派工具 API、任务生命周期、双向通信、进度监控与恢复 |
| 创建/修改/评估技能 | `skill-creator` | 新建、编辑或评估技能必须加载；含描述优化与评估流程 |

本技能直接承担 WopalSpace 的空间治理工作，无需路由：

- **本体运维**：同步、贡献、提升、PR 全流程——运行模式、贡献路径、范围判定、PR 拆分、同步门禁
- **AGENTS.md 维护**：创建/更新项目级或目录级 AGENTS.md——规则审计、内容边界、工作流
- **技能维护**：技能生命周期——安装、扫描、移除

---

## Ontology 本体维护

### 运行模式

操作前先确认模式：

| 模式 | 能力 | Origin |
|------|------|--------|
| **clone** | 仅 `update`（下行同步） | 直连上游仓库 |
| **fork** | `update` + `contribute`（上游 PR）+ `promote` | 用户 Fork → 上游 |

命令：`wopal ontology status`

### 同步方向与层级顺序

| 方向 | 命令 |
|------|------|
| **下行** | `wopal ontology update --confirm` |
| **上行** | `wopal space contribute` → `wopal ontology contribute` / `wopal ontology promote` |

下行更新在贡献批次开始前和 PR 合并后执行。上行贡献必须按以下层级顺序推进：

```
space/<name> → local type/* → origin/type/* → upstream PR
```

先用 `space status` 确认待贡献文件。文件仍在 space 分支时，先运行 `space contribute`。只有选定文件已经进入 local type/* 后，才能运行 `ontology contribute` 创建上游 PR。贡献过程中不要在 `space contribute` 与 type PR 之间插入 `ontology update`。

### 两种贡献路径

Ontology 有三层架构（main → type/* → space/*），文件按状态分为两类：

| 状态 | 含义 | 示例 | 路径 |
|------|------|------|------|
| **A-status** | 类型专属，只存在于 type/* | 特定领域的技能、工作流、集成脚本 | **短路径**：4 步 |
| **M-status** | 通用能力，最终进入 main 供所有空间共享 | 通用技能、开发流程、模板 | **长路径**：7 步 |

#### 短路径（A-status 类型专属）

```
0. ontology update      如下行有待同步内容，先在本批次开始前完成
1. space contribute     space/* → local type/* → origin/type/*
2. ontology contribute  type/* → upstream(type)（话题 PR）
3. ontology update      上游合并后下行同步
```

#### 长路径（M-status 通用能力）

```
0. ontology update      如下行有待同步内容，先在本批次开始前完成
1. space contribute     space/* → local type/* → origin/type/*
2. ontology contribute  type/* → upstream(type)（话题 PR）
3. ontology update      上游 type PR 合并后下行同步
4. ontology promote     type/* → main（先与用户讨论范围）
5. ontology contribute  main → upstream(main)（话题 PR，按「分主题分批 PR」拆分）
6. ontology update      上游 main PR 合并后再次下行同步
```

> promote 后 main 分支产生了新的 divergence，必须在步骤 6 再次贡献到 upstream(main)。

**promote 完整性核对**（步骤 4 完成后必做）：promote 的分类器可能把新增文件误判为 A-status 排除（实测 `skills/dev-flow/tests/` 新增测试文件被漏掉）。核对 `promote --confirm` 输出的 promote 文件列表，与 type PR 的文件集合逐项比对，确认无遗漏。发现遗漏时用 `--include <files>` 强制补入。

**promote 补漏时序**：promote 后 main 领先 type/*，再次 promote 会报 `type branch is behind main` 错误。必须先 `ontology update --confirm` 同步 main → type/*，再重试 promote。补漏的 `--include` 只补新增文件，不会重复已提升内容。

### 贡献范围判定

贡献范围由**用户决定**，Agent 不得自行假设或把决策推回给用户：

1. **先展示完整清单。** 用 `git diff --name-status` 枚举所有待贡献文件，按目录/功能区分组，标注每组状态（M-status / A-status），在问任何问题前先把完整清单展示给用户。禁止在展示"可贡献什么"之前就问"你想贡献哪些"。
2. **按结构判定，不凭直觉。** M-status（可提升到 main）= 所有类型空间共享的能力；A-status（类型专属）= 只对单一空间类型有意义。不确定某文件是否通用时，读 `docs/DESIGN.md` 并检查该能力是否已存在于 `main`。禁止凭记忆或感觉分类。
3. **用户圈定范围，然后确认。** 让用户决定哪些组贡献、哪些排除、哪些仅保留在空间内部。"仅空间内部"的资产（如未验证或空间专属技能）绝不进入 type/* 或上游。用户明确确认文件范围前，禁止任何 `--confirm`。

完整流程与分类细节：`references/ontology-maintenance.md`。

### 分主题分批 PR

**一次 PR 只含一个主题。** 不同目录或功能区域的变更必须拆分为独立 PR。此规则同时适用于 type PR 和 main PR——promote 常把多个 M-status 主题推入 main，贡献时必须按文件目录重新拆分。有依赖的 PR 先贡献，独立主题顺序不限。

**多轮修改一次性贡献。** 同一主题累积的所有变更（来自此前多次 contribute 提交）在一次 PR 中贡献——不要拆分，也不要问用户是否拆分。

#### PR message 规则

**message 描述变更交付的内容，而非采取的动作。** 写成合并后读者获得的结果状态，而不是产生它的机械操作。自问：**"合并后读者收获了什么？"**——回答这个，而不是"我做了什么操作"。

- ❌ 动作+路径：`docs(space-master): add agents-md maintenance guide`（只说"我加了个指南"，没说里面是什么）
- ✅ 内容：`docs(space-master): AGENTS.md maintenance rules and update guidance`（告诉读者指南覆盖什么）
- ❌ 空泛动作：`docs: sync templates and rules to main`（对内容毫无说明）
- ✅ 内容：`docs(templates): concurrency safety protection and sensitive-file read prohibition`（说明实际加入的规则）

格式：`<type>(<scope>): <描述内容的结果状态>`，用无祈使语气的名词短语描述交付的能力。

**每个批次都重复完整门禁**：每个 PR 独立经过同步分析门禁与飞前检查门禁。

### 同步门禁

每次同步操作（`contribute`、`update`、`promote`）必须依次通过两道门禁：

#### 门禁一：同步分析

禁止自动同步。Agent 必须先掌握完整状态：

1. `wopal space status` — 空间层差异
2. `wopal ontology status` — 本体层差异（领先/落后、文件级 diff）
3. 按「贡献范围判定」执行：展示完整清单 → 用户圈定范围 → 明确确认文件范围，之后任何 `--confirm` 才被允许。dry-run 检查不能替代用户范围确认。

**提升（promote）前强制汇报**（任何 `promote --confirm` 前必做）：主动分类可提升项（M-status 可提升 / A-status 类型专属）并说明理由，逐项确认 `--include`/`--exclude` 边界，预估 PR 拆分（按「分主题分批 PR」）并列出每个 PR 的文件范围、`--message` 和顺序。用户确认后才允许执行 promote 和随后的 main 贡献。

#### 门禁二：飞前检查

先看再推：

1. **不加 `--confirm`** 先跑 dry-run
2. 确认列表中只有你改的文件
3. 不对则调整 `--include` glob，重跑
4. 确认无误才加 `--confirm`

> 不加 `--include` 会把分支上所有人的所有积累变更一次性全推出去。不可逆。
> dry-run 输出中被 `exclude` 的文件必须逐一目视确认——它们不会进入 PR，如果本应贡献的文件出现在 exclude 列表，说明 glob 写错了。

### 本体规则

1. **多个文件模式用逗号分隔，不要链式 `--include`。** `--include` 是单值参数，链式（`--include A --include B`）实测只有最后一个生效，其余模式被覆盖——会把未覆盖的变更一并推出去（不可逆）。多模式必须写成 `--include "a/**,b/**,c"`（逗号分隔，空格可选）。`--exclude` 同理。
2. **Clone 模式不支持 `contribute`。** 如需 PR，引导用户切换到 Fork 模式。
3. **删除风险需 `reconcile`。** `update` 报 deletion-risk 时，`type/*` 独有的文件面临被删风险。先跑 `wopal ontology reconcile --type <type> --theirs --confirm` 保留它们，再重试 `update`。
4. **执行后必须验证。** `wopal ontology status` 和 `git diff --stat upstream/main origin/main`。

---

## AGENTS.md 维护

创建或更新项目级/目录级 `AGENTS.md` 时，按以下规范开展工作：

1. **规则审计先行**：更新现有 `AGENTS.md` 前，必须逐条审计现有规则（「规则审计」判据）：
   - **删**：代码已删除 / 结构自动保证（单一真相源）/ 重复权威文档 / 纯实现事实
   - **留**：安全边界（删除范围、凭证单写入口）、行为约束、User-Supplied Rules
   - **改**：目录描述过时、与设计文档机制冲突、中英版本漂移
2. **更新前出计划**：展示审计分类结果（保留/删除/修正 + 理由）+ 拟变更清单，获用户确认后才动笔
3. **先中文审核版，后英文正式版**：用户确认审核版后，再同步英文版
4. 不更新是默认且合法的结果——只有代码、测试、配置和既有文档无法承载边界时才更新

**完整规范**（内容边界、工作流、质量清单）见 `references/agents-md-maintenance.md`。命令 `/cupdate-agent-rules` 仅作入口引导，不承载规范。

---

## 技能维护

### 生命周期

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

### 技能规则

1. **安装前必须扫描。** `wopal skills scan` 是强制步骤——检查恶意代码、数据外泄、非法触发器。禁止跳过。
2. **变更后必须验证。** 安装或编辑后：`ls -la .wopal/skills/<name>/SKILL.md` 和 `wopal skills list`。
3. **创建/修改走 `skill-creator`。** 新建或编辑技能必须加载 `skill-creator` 技能。

---

## 参考资料

技能正文覆盖核心要点。遇到故障或边缘场景时，**必须阅读参考文档**——完整协议在其中：

| 文档 | 内容 |
|------|------|
| `references/ontology-maintenance.md` | 三层架构（main → type/* → space/*）、状态信号解读矩阵、按文件类型的冲突处理、远程分支清理 |
| `references/skills-maintenance.md` | 完整生命周期细节、安全扫描检查项、质量评估标准 |
| `references/agents-md-maintenance.md` | AGENTS.md 维护完整规范：内容边界、规则审计判据、工作流、质量清单 |
