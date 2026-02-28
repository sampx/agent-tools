---
description: 基于代码库分析创建全局规则 (AGENTS.md) 和项目文档 (README.md)
---

# 创建全局规则

通过分析代码库并提取模式，生成 AGENTS.md 和 README.md 文件。

## 使用方式

```bash
/create-init-rules                         # 当前目录（生成 AGENTS.md + README.md）
/create-init-rules --submodule wopal       # 为指定子模块生成
/create-init-rules --main                  # 为主仓库生成
/create-init-rules --all                   # 为主仓库 + 所有子模块生成
/create-init-rules --agents-only           # 仅生成 AGENTS.md
/create-init-rules --readme-only           # 仅生成 README.md
```

---

## 输出文件定位

| 文件 | 面向 | 目的 | 核心内容 |
|------|------|------|---------|
| **README.md** | 人类开发者 | 项目介绍、快速上手 | 简介、快速开始、组件列表、文档链接 |
| **AGENTS.md** | AI Agent | 项目上下文 | 项目概览、技术栈、结构、命令、关键文件 |
| **rules/*.md** | AI Agent | 通用代码规范 | 命名约定、代码风格、错误处理、Git 工作流 |

**职责分离**:

| 内容类型 | 放置位置 | 说明 |
|---------|---------|------|
| 项目概览、技术栈、结构 | AGENTS.md | 项目特定 |
| 常用命令、关键文件 | AGENTS.md | 项目特定 |
| 代码风格、命名约定 | rules/*.md | 通用规范，通过 glob 自动触发 |
| 错误处理、Git 工作流 | rules/*.md | 通用规范 |

**AGENTS.md 中的 "适用规则" 章节**:
- 列出项目适用的 rules 文件
- 不重复通用规范内容
- 仅填写项目**特有**的模式

---

## 目标

创建项目特定的全局规则，让 AI Agent 了解：
- 这个项目是什么
- 使用了哪些技术
- 代码如何组织
- 需要遵循的模式和约定
- 如何构建、测试和验证

---

## Phase 0: 定位 (LOCATE)

> **关键**: 首先确定当前在哪个位置，以及目标位置。

### 检测当前位置

```bash
# 检测是否在 git 仓库中
git rev-parse --is-inside-work-tree

# 获取当前仓库根目录
git rev-parse --show-toplevel

# 检测是否在 submodule 中
git rev-parse --show-superproject-working-tree
```

### 识别项目结构

| 位置判断方法 | 结果 |
|-------------|------|
| `show-superproject-working-tree` 非空 | 当前在 submodule 中 |
| 存在 `projects/*/` 且包含 `.git` | 主仓库，有 submodule |
| 无上述情况 | 单体项目 |

### 确定目标

根据参数和当前位置确定生成目标：

| 参数 | 当前位置 | 目标 |
|------|---------|------|
| 无 | 主仓库 | 主仓库 AGENTS.md + README.md |
| 无 | Submodule | 当前 submodule AGENTS.md + README.md |
| `--main` | 任意 | 主仓库 |
| `--submodule <name>` | 任意 | 指定 submodule |
| `--all` | 任意 | 主仓库 + 所有 submodule |
| `--agents-only` | 任意 | 仅 AGENTS.md |
| `--readme-only` | 任意 | 仅 README.md |

### 子模块列表

如需操作 submodule，先列出可用子模块：

```bash
git submodule status
```

---

## Phase 1: 探索 (DISCOVER)

### 识别项目类型

首先，确定这是什么类型的项目：

| 类型 | 指标 |
|------|------|
| Web App (全栈) | 分离的 client/server 目录，API routes |
| Web App (前端) | React/Vue/Svelte，无服务端代码 |
| API/Backend | Express/Fastify 等，无前端 |
| Library/Package | package.json 中有 `main`/`exports`，可发布 |
| CLI Tool | package.json 中有 `bin`，命令行界面 |
| Monorepo | 多个 packages，workspaces 配置 |
| Script/Automation | 独立脚本，任务导向 |

### 分析配置

查看根目录配置文件：

```
package.json       → dependencies, scripts, type
tsconfig.json      → TypeScript 设置
pyproject.toml     → Python 项目配置
requirements.txt   → Python 依赖
vite.config.*      → 构建工具
*.config.js/ts     → 各种工具配置
```

### 映射目录结构

探索代码库以理解组织方式：
- 源代码在哪里？
- 测试在哪里？
- 有共享代码吗？
- 配置文件位置？

---

## Phase 2: 分析 (ANALYZE)

### 提取技术栈

从 package.json / pyproject.toml 和配置文件中识别：
- 运行时/语言 (Node, Bun, Deno, Python, browser)
- 框架
- 数据库（如有）
- 测试工具
- 构建工具
- Linting/格式化

### 识别模式

研究现有代码：
- **命名**: 文件、函数、类如何命名？
- **结构**: 代码在文件内如何组织？
- **错误**: 错误如何创建和处理？
- **类型**: 类型/接口如何定义？
- **测试**: 测试如何结构化？

### 找到关键文件

识别需要了解的重要文件：
- 入口点
- 配置
- 核心业务逻辑
- 共享工具
- 类型定义

### Submodule 特有分析

如果在 submodule 中，额外识别：
- 与主仓库的关系（共享什么？）
- 独立的生命周期（CI/CD、发布）
- 依赖主仓库的资源（规则、技能、命令）

---

## Phase 3: 生成 (GENERATE)

### 选择模板

| 场景 | AGENTS 模板 | README 模板 |
|------|-------------|-------------|
| 主仓库 / 单体项目 | `templates/AGENTS-template.md` | `templates/README-template.md` |
| Submodule | `templates/AGENTS-submodule-template.md` | `templates/README-submodule-template.md` |

### 创建 AGENTS.md

**输出路径**: `<target>/AGENTS.md`

**核心章节**:

1. **Project Overview** - 这是什么，做什么用？
2. **Tech Stack** - 使用了哪些技术？
3. **Commands** - 如何开发、构建、测试、lint？
4. **Structure** - 代码如何组织？
5. **Applicable Rules** - 适用哪些通用规则？（引用 rules/）
6. **Project-Specific Patterns** - 项目特有的模式（非通用规范）
7. **Key Files** - 哪些文件需要了解？

**Submodule 额外章节**:
1. **与主仓库的关系** - 引用主仓库的共享规则
2. **独立生命周期** - 独立的 CI/CD、发布流程

### 创建 README.md

**输出路径**: `<target>/README.md`

**核心章节**:

1. **项目名称 + 一句话简介** - 这是什么？
2. **快速开始** - 如何安装和运行？
3. **核心功能/组件** - 主要特性列表
4. **技术栈**（可选）- 关键技术
5. **文档链接** - 相关文档

**风格要求**:
- 简洁、可扫描
- 使用表格展示组件/功能列表
- 代码块展示命令
- 中文撰写
- **严禁包含内部架构信息**: README.md 面向外部开源社区，**绝对不要**在其中包含"这是一个子模块"、"主仓库是什么"、"Submodule 工作流"等纯粹为了内部代码库组织的结构信息。把这些留给 `AGENTS.md`。

---

## Phase 4: 输出 (OUTPUT)

### 单项目输出

```markdown
## 项目文档已创建/更新

| 文件 | 状态 | 说明 |
|------|------|------|
| `AGENTS.md` | ✅ 已创建 | AI Agent 编码指导 |
| `README.md` | ✅ 已创建 | 项目介绍和快速开始 |

### 项目类型

{检测到的项目类型}

### 技术栈摘要

{检测到的关键技术}

### 后续步骤

1. 检查生成的 `README.md` 和 `AGENTS.md`
2. 添加任何项目特定的内容
3. 可选：在 `docs/references/` 创建参考文档
```

### 批量输出 (--all)

```markdown
## 项目文档已创建

| 位置 | AGENTS.md | README.md | 项目类型 |
|------|-----------|-----------|---------|
| 主仓库 | ✅ | ✅ | Monorepo |
| wopal | ✅ | ✅ | Web App (前端) |
| flex-scheduler | ✅ | ✅ | API/Backend |

### 后续步骤

1. 检查各生成的文档
2. 确认 submodule 正确引用了主仓库规则
3. 为各项目添加特定内容
```

---

## 提示 (Tips)

- **README.md**: 面向人类，保持简洁，聚焦"是什么"和"怎么用"。将项目作为一个独立产品来介绍，**绝不要**提及它是子模块或属于某个 Monorepo。
- **AGENTS.md**: 面向 AI，可以详细，聚焦"怎么开发"
- 不要在两者中重复相同内容（README 引用 AGENTS 获取详情）
- 随项目演进及时更新
- Submodule 的 `AGENTS.md` 文档应简洁，复杂通用规则引用主仓库
