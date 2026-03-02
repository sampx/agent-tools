---
description: 为未提交的更改创建符合规范的 commit
---

## 阶段一：检查变更

```bash
git status && git diff HEAD && git status --porcelain
```

根据变更内容确定类型：`feat` `fix` `refactor` `docs` `test` `chore`

## 阶段二：暂存并确认

```bash
git add <files> && git diff --staged
```

展示差异，提议 commit message（遵循 git-flow.md 规范），等待确认。

## 阶段三：提交

```bash
git commit -m "<message>" && git status
```

提交完成后，如果在子模块中执行，询问用户：
> 子模块提交完成。是否需要返回主项目执行 `/pin-submodule` 更新快照？
