# {plan_name}

## Metadata

- **Issue**: #{issue}
- **Type**: {type}
- **Target Project**: {project}
- **Product**: {product}
- **Phase**: {phase}
- **Project Path**: {path}
- **Project Type**: {ptype}
- **Created**: {date}
- **Status**: planning
- **Base Commit**: (approve 时自动记录实施基线,集成分支 HEAD)
- **Final Commit**: (verify 时自动记录合入提交,集成分支 HEAD)


## Scope Assessment

- **Complexity**: Low|Medium|High
- **Confidence**: High|Medium|Low

## Goal

一句话描述本计划要达成的目标。

## Technical Context

<!-- 4 个子节均为可选，至少填写一个。简单任务只填 Architecture Context 即可。 -->

### Architecture Context

<!-- 当前架构现状、涉及模块、为什么需要变更。 -->
<当前架构描述，涉及模块，为什么需要变更>

### Research Findings

<!-- 前期研究结论摘要。参考资料只放上下文文档，不放本项目 DESIGN、源文件、配置文件。 -->
<研究结论摘要>

**参考资料**：
- `<上下文文档路径>`

### Key Decisions

<!-- 已确定的技术决策，使用 D-NN 编号格式。 -->
- D-01: <决策内容及理由>

### Key Interfaces

<!-- 关键类型/接口定义、模块间契约。 -->
<关键接口定义>

## In Scope

列出本次要完成的具体内容：

- 功能点 1
- 功能点 2

## Out of Scope

列出本次不做的内容：

- <本次不做的内容及原因>

## Affected Files

| Component | Files | Operation | Role |
|-----------|-------|-----------|------|
| <component> | `file1`, `file2` | 修改/创建/删除 | <在此变更中的作用> |

## Acceptance Criteria

<!-- 审阅者先看成功标准，再看实现细节。详见 plan-guide.md 的 AV/UV 规则。 -->

### Agent Verification

<!-- 每条必须写可执行命令。禁止纯描述。详见 plan-guide.md。 -->
1. [ ] <可执行命令 1：如 `rg -c '### Architecture Context' templates/plan.md` ≥ 1>
2. [ ] <可执行命令 2：如 `python -m pytest tests/ -v` 全部 pass>

### User Validation

<!-- 用户人工感知验证项。禁止放入 Agent 可自动验证的项。详见 plan-guide.md。 -->

#### Scenario 1: <本次变更影响的可感知行为>
- Goal: <确认什么行为差异>
- Precondition: <验证前的前置状态>
- User Actions:
  1. <用户操作步骤>
  2. <观察结果>
- Expected Result: <用户可观察到的预期结果>

- [ ] 用户已完成上述功能验证并确认结果符合预期

## Implementation

<!-- 每个 Task 按字段顺序排列（TDD 驱动）。详细指导见 plan-guide.md。 -->

### Task 1: Task Title

**Verification Intent**: <引用的 Agent Verification 条目编号，如 AC#1, AC#3>

**Behavior**: <预期行为描述。TDD 驱动：在 Design 之前定义"什么是对的"。非代码 Task 描述预期状态变化>

**Files**: `path/to/file`

**Pre-read**: <实施前需阅读的文件路径，无必要可写 N/A>

**Design**:
<!-- 完整实施设计（必填）。在 Behavior 之后。 -->
<完整实施设计>

**TDD**: true

<!-- true：代码 Task，Behavior 必填；false：非代码 Task，需说明理由。 -->

**Changes**:
<!-- 编号列表格式，禁止 checkbox。 -->
1. <具体改动点 1>
2. <具体改动点 2>

**Verify**:
<!-- 可执行命令。Agent 必须运行看到 exit 0 后才能勾选 Done。 -->
<验证命令，如 `rg -c 'pattern' file` ≥ 1>

**Done**:
<!-- 任务产出说明 + 要求委派的子 agent 实施后勾选, 每完成一个 task  后提交 git。 -->
任务产出：<一句话描述本 Task 产出>
- [ ] 实施 Agent 已完成上述功能开发和验证的所有步骤.

---

## Delegation Strategy

<!--
  Plan 有 2+ Task 或 Complexity = High 时必须填写。单一 Task 可写 N/A。
  用 wave 划分并行批次，高 wave 依赖低 wave。详见 plan-guide.md。
-->

| Wave | Task | 执行者 | 依赖 | 委派理由 |
|------|------|--------|------|---------|
| 1 | Task 1 | fae | 无 | <委派理由> |
