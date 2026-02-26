# Team Tasks — 多智能体协作任务管理器

## 简介

`team-tasks` 是一个基于文件系统的多智能体（Multi-Agent）协作协调工具。它通过共享的 JSON 任务文件来管理和跟踪开发团队代理（如 code-agent, test-agent, docs-agent 等）的工作进度。

该工具的核心理念是 **AGI 作为中央指挥部**，代理之间不直接通信，而是通过任务管理器的状态流转来协同工作。

主要特性：
- **三种协作模式**：线性流水线（Linear）、依赖图（DAG）、多方辩论（Debate）。
- **共享工作区**：支持多个代理在同一个文件系统路径下工作。
- **状态持久化**：所有状态保存在 JSON 文件中，支持随时查看、恢复和重置。
- **CLI 驱动**：提供 `task_manager.py` 脚本供 AGI 或开发者直接调用。

## 核心模式详解

### 1. 线性模式 (Linear Mode)

最简单的顺序工作流。任务按照预定义的顺序依次执行，前一个完成 (`done`) 后自动推进到下一个。

*   **适用场景**：标准开发流程，例如：`编码 -> 测试 -> 文档 -> 验收`。
*   **工作流**：
    1.  初始化项目并指定流水线：`init project -m linear -p "agent1,agent2,agent3"`。
    2.  查询当前任务：`next`。
    3.  执行并标记完成：`update agent1 done`。
    4.  系统自动指向 `agent2`。

### 2. DAG 模式 (Dependency Graph Mode)

基于依赖关系的有向无环图模式。支持并行任务分发，只有当所有依赖任务都完成时，下游任务才会变为“就绪（Ready）”状态。

*   **适用场景**：复杂项目，多个模块可以并行开发，但集成测试需要依赖所有模块完成。
*   **特性**：
    *   **并行分发**：`ready` 命令会返回所有依赖已满足的任务列表。
    *   **循环检测**：添加任务时自动防止死锁循环。
    *   **结果传递**：下游任务可以获取上游依赖任务的输出结果。

### 3. 辩论模式 (Debate Mode)

一种特殊的协作模式，用于引入多个视角对同一问题进行分析、评审或辩论，最后进行综合决策。

*   **适用场景**：安全审计、架构决策、代码审查、方案比对。
*   **工作流**：
    1.  **立题**：`init --mode debate -g "议题描述"`。
    2.  **邀请辩手**：`add-debater` 添加参与的代理及其扮演的角色（如“安全专家”、“性能优化师”）。
    3.  **第一轮：初始陈述** (`round start`)：各代理独立发表观点。
    4.  **第二轮：交叉评审** (`round cross-review`)：每个代理阅读其他人的观点并进行点评（支持/反对/补充）。
    5.  **综合** (`round synthesize`)：汇总所有观点和评审意见，生成最终结论。

## 常用命令指南

所有命令通过 `scripts/task_manager.py` 执行。为了方便，下文用 `$TM` 代替。

### 项目管理

*   **初始化线性项目**:
    ```bash
    $TM init my-web-app --mode linear -p "code-agent,test-agent" --workspace "/abs/path/to/work"
    ```
*   **初始化 DAG 项目**:
    ```bash
    $TM init complex-sys --mode dag --goal "Build microservices"
    ```
*   **初始化辩论项目**:
    ```bash
    $TM init security-audit --mode debate --goal "Review auth module for vulns"
    ```
*   **查看状态**:
    ```bash
    $TM status <project>          # 人类可读视图
    $TM status <project> --json   # 机器可读 JSON
    ```
*   **列出所有项目**:
    ```bash
    $TM list
    ```

### 任务执行与状态更新

*   **指派任务说明** (Linear/DAG):
    ```bash
    $TM assign <project> <stage_id> "具体任务描述"
    ```
*   **更新状态**:
    ```bash
    $TM update <project> <stage_id> in-progress  # 开始工作
    $TM update <project> <stage_id> done         # 完成工作
    $TM update <project> <stage_id> failed       # 标记失败
    ```
*   **记录结果与日志**:
    ```bash
    $TM result <project> <stage_id> "输出结果 summary" # 保存关键产出
    $TM log <project> <stage_id> "遇到了一些问题..."    # 添加日志
    ```
*   **获取下一个任务**:
    *   Lineaar: `$TM next <project>`
    *   DAG: `$TM ready <project>` (返回所有可并行执行的任务)

### DAG 专属命令

*   **添加任务及依赖**:
    ```bash
    # 添加一个无依赖的根任务
    $TM add <project> database -a code-agent --desc "Setup DB"
    
    # 添加依赖任务
    $TM add <project> api -a code-agent -d "database" --desc "Build API"
    ```
*   **查看依赖图**:
    ```bash
    $TM graph <project>
    ```

### 辩论模式专属命令

*   **添加辩手**:
    ```bash
    $TM add-debater <project> agent-a --role "Security Expert"
    ```
*   **流程控制**:
    ```bash
    $TM round <project> start              # 开始第一轮
    $TM round <project> cross-review       # 开始交叉评审轮
    $TM round <project> synthesize         # 生成最终报告
    ```
*   **收集回复**:
    ```bash
    $TM round <project> collect <agent_id> "我的观点内容..."
    ```

## 数据结构

所有数据存储在 `TEAM_TASKS_DIR` (默认 `/home/ubuntu/clawd/data/team-tasks`) 下的 JSON 文件中。

### 线性/DAG 结构示例
```json
{
  "project": "demo",
  "mode": "dag",
  "workspace": "/tmp/work",
  "stages": {
    "task1": {
      "status": "done",
      "dependsOn": [],
      "output": "Result 1"
    },
    "task2": {
      "status": "pending",
      "dependsOn": ["task1"]
    }
  }
}
```

### 辩论结构示例
```json
{
  "project": "audit",
  "mode": "debate",
  "debaters": {
    "agent1": { "role": "Role A", "responses": [...] }
  },
  "rounds": [
    { "type": "initial", "responses": {...} },
    { "type": "cross-review", "responses": {...} }
  ]
}
```

## 注意事项

1.  **Stage ID vs Agent Name**:
    *   在 **Linear** 模式下，Stage ID 通常直接使用 Agent Name（如 `code-agent`）。
    *   在 **DAG** 模式下，Stage ID 是任务的唯一标识符（如 `db-setup`），Agent 只是该任务的一个属性。
    *   在 **Debate** 模式下，操作的主体是 Agent ID。
2.  **原子性**: 每次 CLI 调用都是原子的，直接读写 JSON 文件。
3.  **错误处理**: 如果任务失败 (`failed`)，DAG 模式会阻塞依赖该任务的后续步骤，但其他分支仍可继续执行。可以使用 `reset` 命令重置失败的任务进行重试。
