# REGULATIONS.md — Agents 空间守则

本法规为本工作空间之根本行为规范，一切 Agent 必须无条件遵守。违者视为严重失职。

---

## 安全禁令

### 删除防护

- 删除仅限用户以命令式语句（如"删掉它"）明确确认时方可执行；疑问形式不构成授权
- 删除前必须读取文件内容，判断是否为用户工作产物；`git status` 显示 `??` 的未跟踪文件一律禁止删除
- 删除一律使用 `trash`，禁止 `rm` / `rm -fr` / `git rm`

### 未提交变更保护（并发安全）

- 执行 `git reset`、`checkout/restore`、`stash`、`clean`、`worktree add/remove`、`switch -f`、`merge/apply` 等可能触碰工作区的操作前，必须先 `git status` 确认工作区状态
- 发现未提交变更：禁止操作，上报文件列表，由用户决定处置
- **严禁无确认 stash 他人正在执行的变更**；用户明确要求时，必须记录 stash 编号、内容摘要、创建者、原因；完成前自查 `git stash list`，无主 stash 上报，不得擅自 drop/pop

### 边界与敏感信息

- 禁止读取用户 `.env`、`.bashrc`、`.zshrc` 等可能含 token/密钥的文件；读取与写入同罪
- 代码或提交中不得包含 `.env`、密钥等敏感凭证
- `external/` 为外部资源引用集合，未经授权不得创建、修改、删除其中任何内容

---

## 核心工作规则

**思考铁律（最高优先级）**：思考过程中禁止输出大块代码、禁止出现与本项目无关的内容、禁止循环思考。违反任何一条即为严重失职。

### 内容检索

- 本空间为多 repo 架构，子 repo 在空间 repo 中被忽略，`glob` 无法跨嵌套 repo 工作；文件与目录定位优先用 `read`/`ls`
- `glob`/`grep` 仅在已确定项目根或目标目录后使用，禁止从空间根跨项目搜索文档
- 用户提及项目名时，先 `read projects/` 或 `ls projects/` 确认存在，禁止直接用 `glob` 搜索
- 内容搜索用 `rg`：已确定项目根时 `rg "<pattern>" projects/<name>/`；跨项目搜索时 `rg --no-ignore-vcs "<pattern>"`
- **`rg -r` 为替换（replace）而非递归，`rg` 默认递归，行号用 `rg -n`；禁止使用 `rg -rn`**

- 需用户授权写入：`.wopal-space/memory/`、`.wopal-space/REGULATIONS.md`
- 临时文件一律放 `.wopal-space/.tmp/`
- 其他读写遵循 `.wopal-space/STRUCTURE.md`

### 强制技能门禁

以下任务在执行任何操作前必须加载对应技能，漏加载 = 严重失职：

| 任务 | 必加载技能 |
|------|-----------|
| Issue/Plan 创建与状态推进（submit/approve/complete/verify/archive） | `dev-flow` |
| 委派任何 subagent（fae/rook 等所有类型） | `agents-collab` |
| 新建/修改技能 | `skill-creator` |
| 意图不清、不确定技能/流程、空间运维、技能管理、ontology 仓库操作（update/sync/contribute/promote） | `space-master` |

严禁放着现成技能不用、强行以通用能力执行。

### 子代理委派

委派任何 subagent 前，必须按序完成以下步骤，跳过任何一步 = 严重失职：
1. `memory_manage command=search` 搜索"委派"关键词，加载路径规则、agent 类型规则、过往教训
2. 检查 prompt 中所有路径（`files_to_read`、输出路径等），一律使用基于空间根目录的相对路径或绝对路径，禁止裸相对路径
3. 确认 prompt 包含目标项目路径上下文（如 `projects/gesp/`）；subagent 默认在 workspace 根目录执行，无项目路径即文件写到错误位置

- 委派必须优先使用 `wopal_task`，仅当不可用时才用内置 `Task`
- 禁止 sleep + wopal_task_output 轮询；任务通过 `[WOPAL TASK IDLE/STUCK/PROGRESS]` 通知主动汇报，仅异常迹象时检查纠偏

### 验证隔离

验证/测试工作（无论 Wopal 还是 Fae）一律禁止修改空间内项目文件，只能在 `.wopal-space/.tmp/` 或系统临时文件夹中进行。

### 上下文压缩

`context_manage compact` 为异步操作，触发后必须等待压缩完成通知方可继续：
- 当前会话：等待 `<system-reminder>`，按其恢复协议执行
- 委托会话：等待 `[WOPAL TASK COMPACTED]`，以 `wopal_task_reply` 发送恢复指令

严禁在压缩完成前执行后续任务。

### 记忆

- 复杂任务前、模糊/冲突指令、用户批评、关键节点决策、工具执行错误后，必须主动 `memory_manage command=search`（2-3 个核心词）
- 存储位置：知识/经验/避坑 → LanceDB；用户 Profile → `USER.md`；工作规则 → `REGULATIONS.md`；项目知识 → 项目 `AGENTS.md`；行为特质 → 系统提示词
- 详细规范见 `.wopal/rules/wopal/mem-rule.md`

---

## 开发规范

### 项目归属与类型

- `standard`：独立 Git 仓库，位于 `projects/<name>/`，主分支 `main`
- `ontology-worktree`（`.wopal/`）：禁止直接修改 `~/.wopal/ontologies/` 主仓库或直接 push 到 main；所有变更必须通过 `.wopal/` worktree 提交到 `space/<name>` 分支
- 所有 Issue/Plan 一律创建并存储于空间仓库，由 dev-flow 脚本自动定位；`--project` 仅决定 Plan 目录划分，禁止质疑归属

### 项目规范更新（AGENTS.md）

- 项目规范承载规范和约束 agent 在设计、开发、测试、验证过程中所需的架构、机制、流程等决策边界的长期原则，是 agent 开展项目实施过程中必须严格遵循。
- Agent 有义务持续维护项目规范，确保与项目实际内容匹配一致，但禁止在项目规范中写入实现细节、单 Bug 修复记录等无长期价值的信息。

#### TDD

代码类项目（`projects/`、ontology-worktree）强制 TDD：先写失败测试（红）→ 实现通过（绿）→ 重构，重构必须同步调整测试。无对应测试用例的功能代码视为不完整，禁止提交。豁免：文档类、配置类、纯脚本类、typo 修复等无逻辑变更。

#### 项目工作流

分层提交，先项目后空间；变更路径决定检查哪个仓库（`projects/*/` 的变更不检查空间根仓库）；开发前确保脱离 detached HEAD；在项目内完成 add → commit → push。

#### Issue 标题

`<type>(<scope>): <description>`：type 必选、scope 必选（对应项目或模块名）、description 英文祈使句 ≤55 chars、整体 ≤72 chars。Label 映射：feat/enhance → `type/feature`、fix → `type/bug`、refactor → `type/refactor`、docs → `type/docs`、test → `type/test`、chore → `type/chore`、perf 无 label。

### Git 工作流

#### 基本法

- 必须用 `git -C <path>` 显式指定目标仓库；空间根目录是独立 git repo，禁止依赖默认工作目录对子项目执行 git 操作
- 实施前必须检查：`git status`（有未提交变更先提醒用户提交）+ `git log --oneline -5`（非本会话未推送提交先报告）
- 所有代码变更必须经用户验证并明确确认后才可提交；自动化验证通过 ≠ 可提交
- 提交前必须检查：`git status` + `git diff --staged --name-only`（确认变更范围与提交意图一致，无其他任务文件）+ `git log --oneline -5`；确认不在 detached HEAD
- 提交语言：空间仓库中文，项目仓库英文

#### 提交格式

`<type>(scope): <description> [#ref]`

- type 必选（见下表）；scope 可选，括号包裹、小写简洁（如 `(api)`、`(cli)`），全局不明确时省略
- description：祈使句，英文首字母小写，结尾无句号；≤70 chars，有 Issue ref 时 ≤60 chars；首行总长 ≤100
- body 可选：空行分隔，解释 what/why 而非 how，每行 ≤72；破坏性变更以 `BREAKING CHANGE:` 开头
- 相关变更合为一提交，不相关变更拆分；原子提交便于回滚与 bisect

| Type | 用途 | 版本变更 | Type | 用途 | 版本变更 |
|------|------|----------|------|------|----------|
| `feat` | 新功能 | MINOR | `enhance` | 功能增强 | MINOR |
| `fix` | Bug 修复 | PATCH | `perf` | 性能优化 | — |
| `refactor` | 重构（功能不变） | — | `ci` | CI/CD 配置 | — |
| `docs` | 文档更新 | — | `build` | 构建系统 | — |
| `test` | 测试相关 | — | `revert` | 回滚提交 | — |
| `chore` | 构建/工具 | — | `style` | 代码格式（无逻辑变更） | — |

#### 分支策略

| 分支 | 用途 |
|------|------|
| `main` | 主分支，稳定版本 |
| `feature/*` | 功能开发 |
| `bugfix/*` | Bug 修复 |
| `hotfix/*` | 紧急修复 |
| `refactor/*` | 重构 |

#### 合并验证（结构变更铁律）

特性分支含文件重命名、目录重组、多文件合并/拆分等结构变更时，合并禁止依赖 git 自动合并；无冲突 ≠ 变更无损。

合并前必须：`git merge-base` 找到共同祖先 → 列出目标分支新增提交 → 逐文件分类判断（1:1 rename 可自动处理但须验证；merge/split 必须手动移植）→ 上报分类结果，获用户确认后执行 merge。

### 禁止提交

敏感凭证（`.env`、密钥）与临时产物（`__pycache__/`、`node_modules/`、`.ruff_cache/`、IDE 配置）一律不得进入仓库。

---

## 其他规则

### 时间处理

必须用系统命令获取时间，严禁推断：`date '+%Y-%m-%d %H:%M:%S'`。

### 文档规范

- 历史文档不追溯：`.wopal-space/plans/**/done/` 等历史记录不追溯修改
