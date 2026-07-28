# Ontology Maintenance — Agent Operations Guide

机制设计（四层检测原理、PR merge 策略、超集不变量、上行链条 U1-U5、贡献路径）见 ontology DESIGN §6.8。本指南只定义 agent 执行本体维护时的操作规则：看到什么信号，做什么操作。

---

## 触发条件

- 用户要求检查/更新/贡献本体
- `/ontology-maintain` 命令
- 定期维护

---

## 操作流程

### 第一步：Check

```
wopal ontology status
```

读取三段输出：
- **Downstream**（upstream → origin → local）：下行同步状态
- **Common Comparison**（type vs main）：层级差异分析
- **Upstream**（origin → upstream）：上行待贡献列表

合并 `git` 命令交叉验证差异：

```bash
git diff --stat upstream/main origin/main      # 真实文件差异
git rev-list --count origin/main..upstream/main # commit 差距
```

### 第二步：解读信号，确定操作

按优先级从高到低检查：

| 优先级 | 检查项 | 条件 | 操作 |
|--------|--------|------|------|
| 1 | worktree 状态 | 有未提交变更 | 先提交 |
| 2 | 下行 `upstream → origin` | 有文件变更 | `ontology update` |
| 3 | 下行 deletion-risk | main → type 会删除 type 专属文件 | `ontology reconcile` → 再 `ontology update` |
| 4 | 下行 `type → space` | space 落后 type | `space update` |
| 5 | 上行 `space → type` | space 有通用价值变更 | 按主题 `space contribute --include` |
| 6 | 上行 `origin → upstream` | fork 领先上游 | 按主题 `ontology contribute --include` |
| 7 | promote `type → main` | type 有 M/D 通用改进 | `ontology promote` → 再贡献到上游 |

**关键原则**：
- **不自动执行贡献**：贡献涉及"哪些变更有普遍价值"的语义判断，必须与用户讨论后决定
- **按主题分批**：绝不允许一次把所有变更 squash 成一个 PR
- **用 git 验证**：CLI 命令执行后，用 `git diff --stat` 和 `git rev-list --count` 交叉验证

### 第三步：执行下行同步

**ontology update（HOME 级）**：

```bash
# 1. 初次执行（可能触发 deletion-risk 保护）
wopal ontology update --confirm

# 2. 如有 deletion-risk 拦截 →
wopal ontology reconcile --type coding --confirm
wopal ontology update --confirm     # 重跑完成同步

# 3. 推送到 origin（fork 模式自动推送，失败时输出 pushErrors）
```

> ⚠️ 经验教训：`ontology update` 对 type/* 分支的 push 可能失败（catch 块静默吞掉）。如果输出显示 `Pushed: no` 或 `Pushed: partial`，手动运行 `git push origin <branch>` 完成推送。

**space update（Space 级）**：

```bash
wopal space update            # dry-run 检查状态
wopal space update --confirm  # 执行合并
```

> ⚠️ dry-run 逻辑：`analyzeFlowSegment` 用 `git merge-tree --write-tree` 比较 tree。当 type 有 commits 但 tree 相同时（合并仅对齐拓扑），dry-run 可能误报 "already up to date"。`--confirm` 会正确执行 `git merge`。此 bug 已在 wopal-cli 0.3.2 修复（增加 `gitRevListCount` 检查）。

### 第四步：执行上行贡献（按主题分批）

上行是链条，必须从 U1 开始逐级上行：

**U1（space → type/coding）**：

```bash
# 按主题分批贡献，每次一个 --include 模式
wopal space contribute \
  --include 'skills/dev-flow/**' \
  --message 'enhance(dev-flow): ...' \
  --confirm
```

`--include` 接受逗号分隔的 glob 模式。用 `--confirm` 前先 dry-run 验证过滤结果。

建议按主题拆分（参考）：

| 批次 | include 模式 | 说明 |
|------|-------------|------|
| 清理废弃文档 | `docs/references/**,docs/research/**` | 删除过时研究/参考 |
| 技能改进 | `skills/dev-flow/**,skills/agents-collab/**` | 工作流和协作技能 |
| 扩展更新 | `extensions/opencode-usage-extension/**` | 浏览器扩展 |
| 模板/配置 | `templates/**,config/settings.jsonc` | 空间初始化和配置 |
| 命令更新 | `commands/**` | CLI 命令改进 |

**U4/U5（origin → upstream）**：

```bash
# 同样按主题分批，--include 模式
wopal ontology contribute \
  --type coding \
  --include 'skills/dev-flow/**' \
  --message 'enhance(dev-flow): ...' \
  --confirm
```

每次执行后确认 PR 创建成功，等待用户合并后再做下一批。

**Promote（type → main） + 贡献到上游**：

```bash
# 1. 将 type 的 M/D 通用改进 promote 到 main
wopal ontology promote --from type/coding --confirm

# 2. promote 后 origin/main 领先 upstream/main，需再贡献
wopal ontology contribute \
  --type common \
  --include 'skills/dev-flow/**,~~' \
  --message '...' \
  --confirm
```

> promote 自动排除 A-status 文件（type 专属能力，如 WSF 技能、Agent 角色）。promote 后的 main 变更需要单独 PR 到 upstream。

### PR 合并后的收尾

每次上游 PR 合并后：

```bash
wopal ontology update --confirm    # 同步上游到本地
wopal space update --confirm       # 同步 type 到 space worktree
```

---

## 冲突解决规则

### 预测

check 输出中的 `mergePrediction` 字段在执行前预测冲突（基于 `git merge-tree`）：
- `clean` → 自动 merge
- `conflict` → 报告冲突文件列表

### 解决

agent 手动编辑冲突文件，保留双方有价值的改动：

| 冲突类型 | 解决策略 |
|---------|---------|
| `settings.jsonc`（尾换行 + 配置块） | 合并保留两者（配置块 + 尾换行） |
| 上游修改了通用能力，本地也修改了同一文件 | 以上游版本为基，移植本地特有改动 |
| 双方新增同名文件 | 对比内容，合并两边改动 |
| 上游删除了文件（下行信号） | 确认删除是否适用于本地空间 |

解决后：`git add <resolved-files>` → `git commit --no-edit` 完成 merge。

---

## PR 规范

| 规范 | 说明 |
|------|------|
| 提交格式 | Conventional Commits（`feat/fix/enhance/chore(scope): <desc>`） |
| 提交语言 | 上游仓库用英文，空间仓库用用户偏好语言 |
| squash merge | 所有上行回流采用 squash merge |
| 贡献分支 | 临时分支，PR 合并后自动清理 |
| **按主题拆分** | **严禁一批提交包含多个无关主题** |

---

## 验证

每次操作后用 git 命令交叉验证：

```bash
# 下行同步后：确认零差异
git diff --stat upstream/main origin/main
git diff --stat origin/main..main

# 上行贡献后：确认 PR 创建成功
# 空间同步后
wopal space update   # 应显示 "already up to date"
wopal ontology status # down/up 均应 "Up to date"

# promote 后
git diff --stat type/coding..main  # 检查 promote 内容
wopal ontology status              # 检查 upstream 状态
```

最终状态检查清单：

| 检查项 | 正常状态 |
|--------|---------|
| `upstream → origin` | 0 diff |
| `origin → upstream` | 0 diff |
| `origin → local` | 0 diff |
| `space → type` | space 领先 type（正常，space 比 type 多） |
| `host repo 分支` | `main`（非 worktree） |

---

## 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| `ontology update` 输出 `Pushed: no` | push 被 catch 块静默吞掉 | 手动 `git push origin <branch>` |
| `ontology update` 拦截 type/coding | deletion-risk 保护 | 先 `reconcile` 再重跑 `update` |
| `space update` dry-run 说 up to date，但 `--confirm` 执行了合并 | topology gap（tree 相同但 commits 不同） | wopal-cli 0.3.2 已修复。旧版本直接 `--confirm` |
| `ontology contribute` 一次性 PR 了所有变更 | 没加 `--include` 过滤 | abort 后按主题重新分批执行 |
