---
description: 更新主仓库的子模块指针到最新快照
---

## 阶段一：扫描子模块

```bash
git submodule foreach 'echo "=== $name ===" && git status --short && git log -1 --oneline'
```

⚠️ 有未提交更改 → 提示先执行 `/commit`

## 阶段二：同步并暂存

```bash
git submodule update --remote --merge && git add <submodule> && git diff --cached
```

展示指针变更，等待用户确认。

## 阶段三：提交

```bash
git commit -m "chore: 更新子模块快照" && git push && git status
```

完成后告知用户快照已锁定。
