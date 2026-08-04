# 故障与高级流程

## 错误处理

| 错误 | 处理 |
|------|------|
| `Invalid transition` | 回到正确状态顺序执行 |
| `Plan not found` | 先运行 `plan` |
| `check-doc failed` | 修好 Plan 再 `approve` |
| `Done completion failed` | 勾选所有 Task Done checkbox |
| `Agent Verification failed` | 补齐 Agent Verification checkbox |
| `dirty workspace` | 清理/提交 或使用 worktree 隔离 |
| `PR not merged yet` | 等 merge 后再 `verify --confirm` |
| `User Validation gate failed` | 让用户完成验证并勾选最终 checkbox |
| `Feature branch not yet merged`（squash 后仍报错） | 确认合并方式：tree 相等判据已自动识别 squash/ff/--no-ff。若仍报错,检查 Plan `Verification Commit` 字段是否残留旧 SHA(错误 fill 或 stale),删掉该字段后重试 |
| `Feature branch not yet merged`（main 在 feature 分叉后前进过） | 集成分支在 feature 分叉后合入了并行提交时，整树相等判据（L2）必然失效——main tree 含并行提交内容，即使 squash 已正确完成。此时使用**变更集判据**（L2.5）：feature 相对 merge-base 的每个变更路径与集成分支逐一比对，全部一致即判定已合入。若仍报错，检查 feature 是否真的合入（`git diff --quiet main <feature> -- <path>` 逐路径验证）；确认已合入后可在 Plan 补写 `Verification Commit`（squash commit SHA）重试 |

## 边缘场景

1. 已有 Plan 再次 `plan` — 不重复创建，继续推进
2. `complete` 时 Done 未勾选 — 先勾选再 complete
3. `complete` 时 Agent Verification 未完成 — 先补齐
4. rook BLOCK 后 complete — 停止，修复后重新审查
5. rook 连续 3 轮 BLOCK/REVISE — 保留分歧注释，用户裁决
6. PR 未 merge 时 `verify --confirm` — 等 merge
7. 目标项目工作区不干净 — 清理或使用 worktree 隔离
8. 参数选择：Issue 驱动传 issue number，无 Issue 传 plan-name
9. **squash 合并后 verify 通过** — 默认支持。squash 的 feature tip 不是 main
   祖先，但 tree 相等判据（L2）会识别已合并。合并后 feature 分支保留到
   archive 才删除，verify 期间不要手动删分支
10. **实施基线可追溯** — approve 记录 `Base Commit`（集成分支 HEAD），
    verify 记录 `Final Commit`（合入后 HEAD）。两字段对照可确定 feature
    影响范围，revert 时用 `git diff Base..Final` 查看完整变更
11. **main 前进 + squash 合并** — feature 从旧 main 分叉且 main 在开发期间
    合入过并行提交时，L2 整树判据失效；变更集判据（L2.5）逐路径比对自动
    识别。`Verification Commit` 字段在 complete 时写入（feature tip SHA），
    若分支不在空间仓库（verify-switch 后），complete 会回退到项目仓库解析，
    仍失败则显式告警并靠 L2/L2.5 兜底
12. **`Verification Commit` 字段缺失** — complete 已自动写入（含跨仓库回退）。
    历史 plan 缺失时可在 verify 前手工补写 squash commit SHA 跳过 L2/L2.5

## PR 工作流（可选）

默认不走 PR。仅当仓库要求 PR 合并或需要 CI/branch protection 时使用：

```text
complete --pr → PR opened → PR merged → verify --confirm → archive
```
