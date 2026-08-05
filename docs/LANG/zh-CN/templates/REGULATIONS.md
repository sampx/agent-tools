# REGULATIONS.md — 空间守则

本法规是本工作空间内的根本行为规范。所有 Agent **必须**严格遵守。

---

## 安全红线

<CRITICAL_RULE>

### 误删防护

- 未经审慎考量不得删除任何文件或目录
- **授权要件**：仅当用户以命令式语句（如"删掉它"）明确确认时，方可执行删除。疑问形式（如"是否应该删除"）不构成授权
- **删除前必读**：任何删除操作前必须先读取文件内容，判断是否为用户工作产物
- **未跟踪文件保护**：`git status` 显示 `??`（未跟踪）的文件，一律禁止删除
- 删除统一用 `trash`，禁止 `rm` / `rm -fr`。`git rm` 同样删除磁盘文件，同属误删防护

### 未提交变更保护（并发安全）

**未提交的工作区变更是其他会话/agent 的未完成成果，与已提交代码同等重要，甚至更脆弱。** 多 agent 并发处理同一项目时，任何 git 重置操作都可能抹掉他人的未提交成果。

**可能触碰工作区的操作前，必须执行知情检查**：

- 涉及命令：`git reset`、`git checkout/restore <file>`、`git stash`、`git clean`、`git worktree add/remove`、`git switch -f`、`git merge/apply` 等
- 前置检查：`git status` 确认目标仓库工作区状态

**发现未提交变更时**：

- 不得执行上述操作——那是别人的成果，不是你的操作对象
- 上报用户：报告变更内容（文件列表），让用户决定（提交/保存/确认可动）
- 工作区干净时正常操作，不受影响

### 工作边界与敏感信息

- 操作领域限定为空间根目录；未经授权不得越出此边界修改系统配置或隐私文件
- 代码或提交中不得包含 `.env`、密钥等敏感凭证

### 敏感文件读取禁令

- 绝不允许阅读用户的 `.env`、`.bashrc`、`.zshrc` 等可能包含 token、密钥等敏感信息的文件
- 此类文件属于用户隐私，读取即构成敏感信息泄露风险，与写入禁令同等严格

</CRITICAL_RULE>

---

## 协作与流程门禁

### 强制技能门禁

以下任务在执行任何操作前，必须先加载对应技能，漏加载 = 严重失职：

| 任务 | 必加载技能 |
|------|-----------|
| 创建/编辑 Issue、创建 Plan、Plan 状态推进 | `dev-flow` |
| 委派任何 subagent | `agents-collab` |
| 新建/修改技能 | `skill-creator` |
| 任务意图不清、不确定用哪个技能/流程、空间运维、技能管理、多空间管理 | `space-master` |

- 执行前检查上下文中的 `<available_skills>` 列表，严禁放着现成技能不用、强行用通用能力执行
- **Issue/Plan 归属**：空间内所有 Issue、Plan 一律创建并存储于空间仓库，由 dev-flow 脚本自动检测定位。`--project` 仅决定 Plan 目录划分。信任脚本自动处理归属，禁止质疑或询问

### 子代理委托

<CRITICAL_RULE>

委派**任何** subagent 前：
1. 搜索记忆中的委派规则和过往教训
2. 检查 prompt 中所有路径使用空间根目录相对路径或绝对路径（裸相对路径会写到 workspace 根目录）
3. 确认 prompt 中包含目标项目路径上下文（subagent 默认在 workspace 根目录执行）

- **优先 wopal_task**；仅当不可用时才用内置 `Task` 工具
- **禁止 sleep 轮询**：任务通过 `[WOPAL TASK *]` 系统通知主动汇报，仅当任务告急或不正常时才需检查

</CRITICAL_RULE>

### 验证隔离

验证和测试工作不得污染空间项目文件。除正式开发场景外，验证操作只能在 `.wopal-space/.tmp/` 或系统临时文件夹中进行。

### 上下文压缩

- `context_manage compact` 是异步操作——压缩在后台执行，工具立即返回但压缩尚未完成
- **必须等待压缩完成通知**再继续：当前会话 → 等待 `<system-reminder>` 恢复协议；委托会话 → 等待 `[WOPAL TASK COMPACTED]` → `wopal_task_reply` 发送恢复指令
- **严禁在压缩完成前执行后续任务**

### 记忆与进化

**核心原则**：只记录与空间优化、项目建设高度相关且具有长期复用价值的信息。

#### 记忆加载

记忆只有被主动检索才有价值。以下场景必须主动搜索记忆：

| 场景 | 搜索关键词 |
|------|-----------|
| 复杂任务开始前 | 任务类型关键词 |
| 遇到模糊/冲突指令 | 相关主题关键词 |
| 用户批评后 | 问题领域关键词 |
| 关键决策节点 | 该节点关键词 |
| 工具执行错误后 | 任务类型关键词 |

**搜索方法**：选 2-3 个核心词，不要太宽泛也不要太窄。

#### 记录位置

| 信息性质 | 存储位置 |
|----------|----------|
| 知识/经验/避坑 | LanceDB（`memory_manage` 工具） |
| 用户 Profile | `USER.md` |
| 工作规则 | `REGULATIONS.md` |
| 项目知识 | 项目 `AGENTS.md` |
| 行为特质 | 灵魂（系统提示词） |

#### 写入规则

- 长期记忆写入需：先去重 → 展示完整内容给用户 → 等待明确确认 → 执行写入
- 仅记录与空间优化、项目建设高度相关且具有长期复用价值的信息
- 记忆与 AGENTS.md / REGULATIONS 冲突时 → 规范优先；记忆有独特细节 → 合并到规范后删除记忆

---

## 开发规范

### 项目归属与类型

- **`standard`**：独立 Git 仓库，位于 `projects/<name>/`，主分支 `main`
- **`ontology-worktree`**（仅位于 `.wopal/`）：变更直接生效；禁止直接修改 `~/.wopal/ontologies/` 主仓库或直接 push 到 main——必须通过 `.wopal/` worktree 提交到 `space/<name>` 分支，再走贡献流程

### 空间存取规则

- 需用户授权写入：`.wopal-space/memory/`、`.wopal-space/REGULATIONS.md`
- 临时文件放 `.wopal-space/.tmp/`
- 其他读写遵循 `.wopal-space/STRUCTURE.md`

### Git 工作流

- **目录先决**：git 操作对象必须与命令作用仓库一致。空间根目录本身是独立 git repo，在此运行 git 作用的是空间仓库，不是子 repo。用 `git -C <path>` 指定，或进入对应项目/worktree 目录。禁止依赖默认工作目录对子项目执行 git 操作
- **实施前双重检查**：开始前运行 `git status` + `git log --oneline -5`
- **提交前检查**：`git status`、`git diff --staged --name-only`、`git log --oneline -5`；确认不在 detached HEAD

#### 提交格式

`<type>(scope): <description> [#ref]`

| 元素 | 必选 | 规则 |
|------|------|------|
| `type` | 是 | 见类型表 |
| `scope` | 否 | 括号包裹，小写简洁（如 `(api)`、`(cli)`） |
| `description` | 是 | ≤70 chars；有 Issue ref 时 ≤60 chars |
| `Issue ref` | 否 | 项目仓库末尾加 `(#N)` |

**Type 类型表**：

| Type | 用途 | 版本变更 |
|------|------|----------|
| `feat` | 新功能 | MINOR |
| `fix` | Bug 修复 | PATCH |
| `refactor` | 重构（不改变功能） | — |
| `docs` | 文档更新 | — |
| `test` | 测试相关 | — |
| `chore` | 构建/工具 | — |
| `enhance` | 功能增强 | MINOR |
| `style` | 代码格式（无逻辑变更） | — |
| `perf` | 性能优化 | — |
| `ci` | CI/CD 配置 | — |
| `build` | 构建系统 | — |
| `revert` | 回滚提交 | — |

**长度约束**：description ≤70 chars（无 Issue ref）或 ≤60 chars（有 Issue ref）；首行总长 ≤100 chars（type + scope + description + Issue ref）。

**Description 规则**：祈使句（`add` 而非 `added`）；英文首字母小写；结尾无句号；简洁但描述性。

**Scope 规范**：括号包裹；常见 scope 为 `api`、`ui`、`auth`、`db`、`config`、`deps`、`docs`；Monorepo 用包名/模块名；全局或不明确时跳过。

**Body（可选）**：空行分隔；解释 **what** 和 **why**，而非 **how**；每行 ≤72 chars；复杂变更用 body 保持首行简洁。

**Footer（可选）**：空行分隔；破坏性变更：`BREAKING CHANGE: <desc>`；Issue 引用：`Refs: #N`（或末尾 `(#N)`）。

#### 提交拆分

- 相关变更合并为一个提交
- 不相关变更拆分为多个提交
- 原子提交便于回滚和 bisect 排查

#### 分支策略

| 分支 | 用途 |
|------|------|
| `main` | 主分支，稳定版本 |
| `feat/*` | 功能开发 |
| `fix/*` | Bug 修复/紧急修复 |
| `refactor/*` | 重构 |

### 合并验证（重构后）

当特性分支对代码进行了文件重命名、目录重组或多文件合并/拆分等结构变更后，合并时禁止依赖 git 自动合并。无冲突 ≠ 变更无损。逐个提交分类（`merge-base` → `git show --name-only`），merge/split 文件必须手动移植，用 `rg` 验证关键变更已在新路径生效，确认后合并。

---

## 工程细节

### 时间处理

必须用系统命令获取时间，严禁推断。命令：`date '+%Y-%m-%d %H:%M:%S'`

### 路径与文件定位

空间是多 repo 架构：`glob` 无法可靠穿透嵌套 repo。定位优先用 `read`/`ls`；搜索前先确认 `projects/` 中项目存在。内容搜索用 `rg`（遵循 .gitignore；跨项目用 `--no-ignore-vcs`）。

### 工程规范

- **历史文档不追溯**：`.wopal-space/plans/**/done/` 等历史记录不追溯修改