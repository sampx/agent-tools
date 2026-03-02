---
description: 在主仓库中创建子模块里程碑快照
---

为指定子模块创建里程碑快照，更新主仓库的子模块指针。

## 阶段一：询问与验证（只读）

1. 询问用户目标子模块（默认全部）和分支名称（默认 main）
2. 一次性执行只读检查：
```bash
cd <submodule_path> && git status && git branch --show-current && git log -1 --oneline
```
3. 如果有未提交更改，询问是否先执行 `/commit`

## 阶段二：同步子模块（写入操作）

执行同步：
```bash
git checkout <branch> && git pull origin <branch>
```

## 阶段三：更新主仓库指针（只读+暂存）

返回主仓库并暂存：
```bash
cd <root_dir> && git add <submodule_path> && git diff --cached
```

⚠️ **安全拦截点**：
- 展示子模块指针变更内容
- 等待用户确认

## 阶段四：提交快照（写入操作）

**只有在获得用户明确授权后**，一次性执行：
```bash
git commit -m "chore: 更新 <submodule> 子模块快照" && git push && git status
```

## 完成

告知用户 `<submodule>` 的里程碑引用指针已成功锁定。