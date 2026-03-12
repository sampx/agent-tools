# wopal-cli 集成 openclaw-security-monitor 方案

## 文档信息

| 项目 | 内容 |
|------|------|
| 状态 | ✅ 已完成 (2026-03-12) |
| 创建日期 | 2026-03-12 |
| 作者 | Wopal Agent |
| 目标版本 | wopal-cli v0.3.0 |

---

## 一、背景与问题

### 1.1 当前状态

wopal-cli 内置了 20 项安全检查（`src/scanner/checks/`），复刻自 openclaw-security-monitor 的检查逻辑。

### 1.2 问题分析

| 问题 | 影响 |
|------|------|
| **检查项差距大** | openclaw 51 项 vs wopal-cli 20 项，差距持续扩大 |
| **维护成本高** | openclaw 更新频繁（28+ CVEs, 30+ GHSAs），复刻跟不上 |
| **模式不完整** | 之前修复的误报问题（SKIP_FILES、IOC 解析）只是冰山一角 |
| **重复劳动** | IOC 数据库和检查模式需要同步维护 |

### 1.3 目标

**从"复刻"转向"集成"**：直接使用 openclaw-security-monitor 作为扫描引擎，零维护成本获得持续更新的安全检查。

---

## 二、方案概述

### 2.1 核心思路

```
当前架构：                          目标架构：
┌─────────────────┐                ┌─────────────────┐
│   wopal-cli     │                │   wopal-cli     │
│  (内置 20 项)   │                │     扫描入口    │
└─────────────────┘                └────────┬────────┘
                                            │
                                            ▼
                                 ┌─────────────────────┐
                                 │  wopal-scan-wrapper │
                                 │  (路径适配 + JSON)  │
                                 └──────────┬──────────┘
                                            │
                                            ▼
                                 ┌─────────────────────┐
                                 │   openclaw scan.sh  │
                                 │   (51 项检查)       │
                                 └─────────────────────┘
```

### 2.2 关键技术点

| 问题 | 解决方案 |
|------|----------|
| SKILLS_DIR 硬编码 | wrapper 脚本用 sed 替换路径 |
| 输出格式不兼容 | wrapper 解析并输出 JSON |
| openclaw 更新 | git pull 自动同步 |
| 不可用时处理 | 报错并提示更新 |

---

## 三、架构设计

### 3.1 目录结构

```
~/.wopal/
├── storage/
│   ├── ioc-db/                          # 保留（可选，用于兼容）
│   │
│   └── openclaw-security-monitor/       # 新增：openclaw 仓库
│       ├── .git/                        # git 管理
│       ├── .wopal-last-update           # 更新时间戳
│       ├── ioc/                         # IOC 数据库
│       │   ├── c2-ips.txt
│       │   ├── malicious-domains.txt
│       │   ├── malicious-publishers.txt
│       │   ├── malicious-skill-patterns.txt
│       │   └── file-hashes.txt
│       ├── scripts/
│       │   ├── scan.sh                  # 主扫描脚本（51项）
│       │   ├── remediate/
│       │   │   ├── _common.sh
│       │   │   ├── check-01-c2-ips.sh
│       │   │   ├── check-02-amos-stealer.sh
│       │   │   └── ... (共 51 个)
│       │   └── update-ioc.sh
│       └── wopal-scan-wrapper.sh        # 我们的 wrapper
```

### 3.2 调用流程

```
wopal skills scan <skill-name>
        │
        ▼
┌───────────────────────────────────┐
│ scan.ts                           │
│ - 解析参数                         │
│ - 确定 INBOX 路径                  │
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│ openclaw-wrapper.ts               │
│ - 检查 openclaw 是否存在          │
│ - 调用 checkAndUpdateOpenclaw()   │
└───────────────┬───────────────────┘
                │
        ┌───────┴───────┐
        ▼               ▼
┌───────────────┐ ┌───────────────┐
│ 首次运行      │ │ 后续运行      │
│ git clone     │ │ 检查更新时间  │
└───────┬───────┘ │ ↓ 超过24h?   │
        │         │ git pull     │
        │         └───────┬───────┘
        │                 │
        └────────┬────────┘
                 │
                 ▼
┌───────────────────────────────────┐
│ wopal-scan-wrapper.sh             │
│ - sed 替换 SKILLS_DIR             │
│ - 执行 scan.sh                    │
│ - 解析输出并格式化 JSON           │
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│ openclaw-wrapper.ts               │
│ - 解析 JSON 输出                  │
│ - 转换为 ScanResult 格式          │
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│ scan.ts                           │
│ - 输出结果（文本/JSON）           │
│ - 返回退出码                      │
└───────────────────────────────────┘
```

### 3.3 数据流

```
INBOX/
└── my-skill/
    ├── SKILL.md
    └── scripts/
        └── ...

        │
        ▼ (传入路径)

wopal-scan-wrapper.sh --path INBOX/my-skill --output json

        │
        ▼ (执行)

scan.sh (SKILLS_DIR 被替换为 INBOX/my-skill)

        │
        ▼ (输出)

{
  "exitCode": 0,
  "status": "secure",
  "summary": {
    "critical": 0,
    "warnings": 0,
    "clean": 51
  },
  "findings": []
}

        │
        ▼ (转换为)

ScanResult {
  skillName: "my-skill",
  status: "pass",
  riskScore: 0,
  summary: { critical: 0, warning: 0, passed: 51 }
}
```

---

## 四、文件变更清单

### 4.1 新增文件

| 文件 | 用途 | 预计行数 |
|------|------|----------|
| `src/scanner/openclaw-updater.ts` | git clone/pull 更新 openclaw 仓库 | ~120 行 |
| `src/scanner/openclaw-wrapper.ts` | 调用 wrapper，解析输出，转换格式 | ~150 行 |
| `src/scanner/wopal-scan-wrapper.sh` | Shell wrapper，路径替换 + JSON 输出 | ~100 行 |

### 4.2 修改文件

| 文件 | 变更内容 | 改动量 |
|------|----------|--------|
| `src/commands/skills/scan.ts` | 调用 openclaw-wrapper 替代 scanSkill | ~20 行 |
| `src/scanner/constants.ts` | 添加 openclaw 配置常量 | ~15 行 |
| `src/lib/config.ts` | 添加 getOpenclawDir() 方法 | ~10 行 |
| `src/scanner/scanner.ts` | 简化为 openclaw 调用或删除 | - |
| `package.json` | 无需新增依赖（simple-git 已有） | - |
| `AGENTS.md` | 更新项目规范 | ~30 行 |

### 4.3 删除文件

| 文件/目录 | 说明 | 涉及文件数 |
|-----------|------|------------|
| `src/scanner/checks/*.ts` | 内置检查模块 | 20 个 |
| `src/scanner/ioc-loader.ts` | IOC 加载逻辑 | 1 个 |
| `src/scanner/ioc-updater.ts` | IOC 更新逻辑 | 1 个 |
| `src/scanner/scanner-utils.ts` | 扫描工具函数 | 1 个 |
| `src/scanner/whitelist.ts` | 白名单逻辑 | 1 个 |
| `src/scanner/types.ts` | 保留（类型定义仍需） | - |

**预计删除代码：~1500 行**
**预计新增代码：~400 行**
**净减少：~1100 行**

---

## 五、详细设计

### 5.1 openclaw-updater.ts

**职责**：管理 openclaw-security-monitor 仓库的克隆和更新

```typescript
// src/scanner/openclaw-updater.ts

import * as fs from "fs";
import * as path from "path";
import { Logger } from "../lib/logger.js";
import { getConfig } from "../lib/config.js";
import simpleGit from "simple-git";

let logger: Logger;
export function setLogger(l: Logger): void { logger = l; }

const OPENCLAW_REPO = "https://github.com/adibirzu/openclaw-security-monitor.git";
const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function getOpenclawDir(): string {
  return path.join(getConfig().getStorageDir(), "openclaw-security-monitor");
}

export function getWrapperPath(): string {
  return path.join(getOpenclawDir(), "wopal-scan-wrapper.sh");
}

export function isAvailable(): boolean {
  return fs.existsSync(getWrapperPath());
}

export function needsUpdate(): boolean {
  const timestampFile = path.join(getOpenclawDir(), ".wopal-last-update");
  if (!fs.existsSync(timestampFile)) return true;
  
  const lastUpdate = new Date(fs.readFileSync(timestampFile, "utf-8").trim());
  return Date.now() - lastUpdate.getTime() >= UPDATE_INTERVAL_MS;
}

export async function checkAndUpdateOpenclaw(): Promise<void> {
  const openclawDir = getOpenclawDir();
  
  if (!fs.existsSync(openclawDir)) {
    await cloneOpenclaw(openclawDir);
    return;
  }
  
  if (needsUpdate()) {
    await pullOpenclaw(openclawDir);
  }
}

async function cloneOpenclaw(dir: string): Promise<void> {
  logger.info("Cloning openclaw-security-monitor...");
  
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  
  const git = simpleGit();
  await git.clone(OPENCLAW_REPO, dir, ["--depth", "1"]);
  
  copyWrapperScript(dir);
  writeTimestamp(dir);
  
  logger.info("openclaw-security-monitor cloned successfully");
}

async function pullOpenclaw(dir: string): Promise<void> {
  logger.info("Updating openclaw-security-monitor...");
  
  try {
    const git = simpleGit(dir);
    await git.fetch();
    const status = await git.status();
    
    if (status.behind > 0) {
      await git.pull();
      copyWrapperScript(dir);
      logger.info("openclaw-security-monitor updated");
    } else {
      logger.debug("openclaw-security-monitor is up to date");
    }
    
    writeTimestamp(dir);
  } catch (error) {
    logger.warn("Failed to update openclaw, using local copy");
    writeTimestamp(dir); // 重置时间戳避免频繁重试
  }
}

function copyWrapperScript(dir: string): void {
  const wrapperSrc = path.join(__dirname, "wopal-scan-wrapper.sh");
  const wrapperDest = path.join(dir, "wopal-scan-wrapper.sh");
  fs.copyFileSync(wrapperSrc, wrapperDest);
  fs.chmodSync(wrapperDest, 0o755);
}

function writeTimestamp(dir: string): void {
  fs.writeFileSync(
    path.join(dir, ".wopal-last-update"),
    new Date().toISOString()
  );
}
```

### 5.2 wopal-scan-wrapper.sh

**职责**：适配 openclaw scan.sh 的 SKILLS_DIR，并输出结构化 JSON

```bash
#!/bin/bash
# wopal-scan-wrapper.sh - Wrapper for openclaw scan.sh
# Usage: wopal-scan-wrapper.sh --path <inbox-path> --output json

set -euo pipefail

INBOX_PATH=""
OUTPUT_FORMAT="text"

while [[ $# -gt 0 ]]; do
    case $1 in
        --path) INBOX_PATH="$2"; shift 2 ;;
        --output) OUTPUT_FORMAT="$2"; shift 2 ;;
        --help|-h)
            echo "Usage: $0 --path <path> [--output text|json]"
            echo ""
            echo "Options:"
            echo "  --path     Path to skill directory to scan"
            echo "  --output   Output format: text (default) or json"
            exit 0
            ;;
        *) echo "Unknown option: $1" >&2; exit 2 ;;
    esac
done

if [[ -z "$INBOX_PATH" ]]; then
    echo '{"error": "Missing --path argument"}' >&2
    exit 2
fi

if [[ ! -d "$INBOX_PATH" ]]; then
    echo "{\"error\": \"Path not found: $INBOX_PATH\"}" >&2
    exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCAN_SH="$SCRIPT_DIR/scripts/scan.sh"

if [[ ! -f "$SCAN_SH" ]]; then
    echo '{"error": "scan.sh not found. Run: wopal skills update-scanner"}' >&2
    exit 2
fi

# Create adapted scan script with modified SKILLS_DIR
ADAPTED_SCAN=$(mktemp)
trap "rm -f $ADAPTED_SCAN" EXIT

# Replace hardcoded SKILLS_DIR with INBOX_PATH
# Also set OPENCLAW_DIR to avoid touching user's ~/.openclaw
sed -e "s|^SKILLS_DIR=.*|SKILLS_DIR=\"$INBOX_PATH\"|" \
    -e "s|^OPENCLAW_DIR=.*|OPENCLAW_DIR=\"$SCRIPT_DIR\"|" \
    "$SCAN_SH" > "$ADAPTED_SCAN"

chmod +x "$ADAPTED_SCAN"

# Run scan and capture output
SCAN_OUTPUT=$("$ADAPTED_SCAN" 2>&1) || EXIT_CODE=$?
EXIT_CODE=${EXIT_CODE:-0}

# Parse output and convert to JSON if requested
if [[ "$OUTPUT_FORMAT" == "json" ]]; then
    # Extract summary counts
    CRITICAL=$(echo "$SCAN_OUTPUT" | grep -c "^CRITICAL:" || echo "0")
    WARNINGS=$(echo "$SCAN_OUTPUT" | grep -c "^WARNING:" || echo "0")
    CLEAN=$(echo "$SCAN_OUTPUT" | grep -c "^CLEAN:" || echo "0")
    
    # Determine status
    if [[ $EXIT_CODE -eq 0 ]]; then
        STATUS="secure"
    elif [[ $EXIT_CODE -eq 1 ]]; then
        STATUS="warnings"
    else
        STATUS="compromised"
    fi
    
    # Extract detailed findings
    FINDINGS=$(echo "$SCAN_OUTPUT" | grep -E "^(CRITICAL|WARNING):" | \
        jq -Rs 'split("\n") | map(select(length > 0)) | .[]' 2>/dev/null || echo "[]")
    
    # Build JSON output
    cat <<EOF
{
  "exitCode": $EXIT_CODE,
  "status": "$STATUS",
  "summary": {
    "critical": $CRITICAL,
    "warnings": $WARNINGS,
    "clean": $CLEAN,
    "total": $((CRITICAL + WARNINGS + CLEAN))
  },
  "findings": $FINDINGS,
  "rawOutput": $(echo "$SCAN_OUTPUT" | jq -Rs .)
}
EOF
else
    echo "$SCAN_OUTPUT"
fi

exit $EXIT_CODE
```

### 5.3 openclaw-wrapper.ts

**职责**：TypeScript 层调用 wrapper 并转换结果格式

```typescript
// src/scanner/openclaw-wrapper.ts

import * as childProcess from "child_process";
import { promisify } from "util";
import { Logger } from "../lib/logger.js";
import { ScanResult, CheckResult } from "./types.js";
import {
  getOpenclawDir,
  getWrapperPath,
  isAvailable,
  checkAndUpdateOpenclaw,
} from "./openclaw-updater.js";

const exec = promisify(childProcess.exec);

let logger: Logger;
export function setLogger(l: Logger): void { logger = l; }

interface OpenclawOutput {
  exitCode: number;
  status: "secure" | "warnings" | "compromised";
  summary: {
    critical: number;
    warnings: number;
    clean: number;
    total: number;
  };
  findings: string[];
  rawOutput: string;
  error?: string;
}

export async function scanWithOpenclaw(
  skillPath: string,
  skillName: string
): Promise<ScanResult> {
  logger.info(`Scanning skill: ${skillName}`, { path: skillPath });
  
  // Ensure openclaw is available
  await checkAndUpdateOpenclaw();
  
  if (!isAvailable()) {
    throw new Error(
      "openclaw-security-monitor not available. " +
      "Run 'wopal skills update-scanner' to install."
    );
  }
  
  const wrapperPath = getWrapperPath();
  const startTime = Date.now();
  
  try {
    const { stdout } = await exec(
      `"${wrapperPath}" --path "${skillPath}" --output json`,
      {
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024, // 10MB
      }
    );
    
    const output: OpenclawOutput = JSON.parse(stdout);
    
    if (output.error) {
      throw new Error(output.error);
    }
    
    const result = convertToScanResult(skillName, output);
    
    logger.info(`Scan complete: ${skillName}`, {
      status: result.status,
      riskScore: result.riskScore,
      duration: `${Date.now() - startTime}ms`,
    });
    
    return result;
    
  } catch (error) {
    if ((error as any).killed) {
      throw new Error("Scan timeout (60s)");
    }
    throw error;
  }
}

function convertToScanResult(
  skillName: string,
  output: OpenclawOutput
): ScanResult {
  // Convert to standard ScanResult format
  const checks: Record<string, CheckResult> = {};
  
  // Map openclaw summary to checks
  // (简化实现：将所有 critical 归为一个检查，warning 归为一个)
  if (output.summary.critical > 0) {
    checks["openclaw_critical"] = {
      id: "openclaw_critical",
      name: "Critical Security Issues",
      severity: "critical",
      status: "fail",
      findings: output.findings
        .filter((f) => f.includes("CRITICAL:"))
        .map((f) => ({
          file: skillName,
          line: 0,
          pattern: f,
          message: f,
        })),
    };
  }
  
  if (output.summary.warnings > 0) {
    checks["openclaw_warning"] = {
      id: "openclaw_warning",
      name: "Security Warnings",
      severity: "warning",
      status: "fail",
      findings: output.findings
        .filter((f) => f.includes("WARNING:"))
        .map((f) => ({
          file: skillName,
          line: 0,
          pattern: f,
          message: f,
        })),
    };
  }
  
  // Add passed check if no issues
  if (output.summary.critical === 0 && output.summary.warnings === 0) {
    checks["openclaw_all"] = {
      id: "openclaw_all",
      name: "All Security Checks",
      severity: "warning",
      status: "pass",
      findings: [],
    };
  }
  
  const riskScore = calculateRiskScore(output.summary);
  
  return {
    skillName,
    scanTime: new Date().toISOString(),
    riskScore,
    status: output.status === "secure" ? "pass" : "fail",
    checks,
    summary: {
      critical: output.summary.critical,
      warning: output.summary.warnings,
      passed: output.summary.clean,
    },
  };
}

function calculateRiskScore(summary: {
  critical: number;
  warnings: number;
}): number {
  return Math.min(100, summary.critical * 25 + summary.warnings * 10);
}
```

### 5.4 scan.ts 修改

```typescript
// src/commands/skills/scan.ts (关键修改)

import { scanWithOpenclaw } from "../../scanner/openclaw-wrapper.js";

async function scanSingleSkill(
  skillName: string,
  options: ScanCommandOptions,
): Promise<number> {
  const inboxPath = getInboxDir();
  const skillPath = path.join(inboxPath, skillName);

  if (!fs.existsSync(skillPath)) {
    logger.error(`Skill not found: ${skillName}`);
    return 2;
  }

  // 使用 openclaw 扫描
  const result = await scanWithOpenclaw(skillPath, skillName);

  if (options.json) {
    // ... JSON 输出逻辑不变 ...
  } else {
    displayScanResult(result);
  }

  return result.status === "pass" ? 0 : 1;
}
```

### 5.5 constants.ts 新增

```typescript
// src/scanner/constants.ts 新增

// openclaw-security-monitor 配置
export const OPENCLAW_REPO =
  "https://github.com/adibirzu/openclaw-security-monitor.git";
export const OPENCLAW_UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const OPENCLAW_SCAN_TIMEOUT_MS = 60000; // 60 seconds
```

### 5.6 config.ts 新增

```typescript
// src/lib/config.ts 新增

export class WopalConfig {
  // ... 现有代码 ...
  
  getStorageDir(): string {
    return path.join(this.wopalDir, "storage");
  }
  
  getOpenclawDir(): string {
    return path.join(this.getStorageDir(), "openclaw-security-monitor");
  }
}
```

---

## 六、命令变更

### 6.1 现有命令

```bash
# 扫描单个技能
wopal skills scan <skill-name>

# 扫描所有 INBOX 技能
wopal skills scan --all

# JSON 输出
wopal skills scan <skill-name> --json
```

**行为变更**：
- 首次运行时自动 clone openclaw 仓库
- 后续运行时自动检查更新（24h 间隔）
- openclaw 不可用时抛出明确错误

### 6.2 新增命令（可选）

```bash
# 手动更新 openclaw
wopal skills update-scanner

# 查看 openclaw 状态
wopal skills scanner-status
```

---

## 七、配置与环境变量

### 7.1 新增环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `WOPAL_OPENCLAW_REPO` | adibirzu/openclaw-security-monitor | 自定义上游仓库 |
| `WOPAL_OPENCLAW_UPDATE_INTERVAL` | 86400000 (24h) | 更新间隔（毫秒） |

### 7.2 配置文件

`~/.wopal/config.json` 可选新增：

```json
{
  "scanner": {
    "provider": "openclaw",
    "updateInterval": 86400000,
    "repoUrl": "https://github.com/adibirzu/openclaw-security-monitor.git"
  }
}
```

---

## 八、错误处理

### 8.1 错误场景

| 场景 | 处理方式 | 用户提示 |
|------|----------|----------|
| 首次运行无网络 | clone 失败 | "Failed to clone openclaw. Check network connection." |
| 后续运行无网络 | 跳过更新，使用本地 | (静默) |
| scan.sh 不存在 | 检查失败 | "Scanner not found. Run: wopal skills update-scanner" |
| 扫描超时 | 终止进程 | "Scan timeout (60s). Skill may be too large." |
| JSON 解析失败 | 回退到文本解析 | (内部处理) |

### 8.2 错误码

| 退出码 | 含义 |
|--------|------|
| 0 | 扫描通过（无问题） |
| 1 | 扫描发现问题（critical 或 warning） |
| 2 | 扫描失败（配置错误、超时等） |

---

## 九、测试计划

### 9.1 单元测试

```typescript
// tests/scanner/openclaw-updater.test.ts

describe("openclaw-updater", () => {
  it("should clone openclaw on first run", async () => {
    // ...
  });
  
  it("should skip update if within interval", async () => {
    // ...
  });
  
  it("should pull updates when interval exceeded", async () => {
    // ...
  });
});

// tests/scanner/openclaw-wrapper.test.ts

describe("openclaw-wrapper", () => {
  it("should parse secure status correctly", async () => {
    // ...
  });
  
  it("should parse compromised status correctly", async () => {
    // ...
  });
  
  it("should calculate risk score correctly", async () => {
    // ...
  });
});
```

### 9.2 集成测试

```bash
# 1. 首次运行（clone）
rm -rf ~/.wopal/storage/openclaw-security-monitor
wp skills scan test-skill
# 预期：clone 成功，扫描正常

# 2. 更新检查
# 手动修改 .wopal-last-update 为 25h 前
wp skills scan test-skill
# 预期：git pull 执行

# 3. 离线场景
# 断开网络
wp skills scan test-skill
# 预期：使用本地缓存，不报错

# 4. 全流程
wp skills download forztf/open-skilled-sdd
wp skills inbox list
wp skills scan open-skilled-sdd
wp skills install open-skilled-sdd
# 预期：全流程成功
```

### 9.3 兼容性测试

| 平台 | bash | jq | 预期结果 |
|------|------|-----|----------|
| macOS 14+ | 3.2 | 1.6+ | ✅ |
| Ubuntu 22.04 | 5.1 | 1.6+ | ✅ |
| Ubuntu 20.04 | 5.0 | 1.6+ | ✅ |

---

## 十、迁移计划

### 10.1 阶段划分

| 阶段 | 任务 | 预计时间 | 验收标准 |
|------|------|----------|----------|
| **Phase 1** | 创建 openclaw-updater.ts | 1h | clone/pull 成功 |
| **Phase 2** | 创建 wopal-scan-wrapper.sh | 1h | 路径替换正常 |
| **Phase 3** | 创建 openclaw-wrapper.ts | 1.5h | JSON 解析正确 |
| **Phase 4** | 修改 scan.ts 集成 | 1h | 命令正常工作 |
| **Phase 5** | 删除旧 scanner/checks/ | 0.5h | 编译通过 |
| **Phase 6** | 更新 AGENTS.md | 0.5h | 文档准确 |
| **Phase 7** | 端到端测试 | 1h | 全流程通过 |

**总计：约 6.5 小时**

### 10.2 回滚方案

```bash
# 回滚到旧版本
git revert <commit-hash>
# 或
git checkout <previous-tag>
```

保留旧代码 7 天后再彻底删除。

---

## 十一、风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| openclaw scan.sh 路径/格式变更 | 低 | 高 | 版本锁定，变更日志监控 |
| 网络问题导致首次 clone 失败 | 中 | 高 | 清晰错误提示 + 重试指导 |
| bash/jq 版本兼容性 | 低 | 中 | 文档说明最低版本要求 |
| 扫描性能下降 | 低 | 低 | 60s 超时保护 |

---

## 十二、待确认事项

### 12.1 必须确认

| # | 事项 | 选项 | 推荐 |
|---|------|------|------|
| 1 | **wrapper 脚本位置** | A) 打包在 wopal-cli 中 / B) 运行时从模板生成 | **A** |
| 2 | **输出解析粒度** | A) 只解析 summary / B) 解析每项检查详情 | **A**（先简单） |
| 3 | **白名单功能** | A) 保留并迁移 / B) 暂不实现 | **B** |

### 12.2 可选确认

| # | 事项 | 选项 | 推荐 |
|---|------|------|------|
| 4 | **是否新增 update-scanner 命令** | A) 是 / B) 否 | **A** |
| 5 | **是否保留旧 scanner 作为 fallback** | A) 是 / B) 否 | **B** |

---

## 十三、附录

### A. openclaw scan.sh 退出码

```
0 = SECURE (无问题)
1 = WARNINGS (有警告)
2 = COMPROMISED (有严重问题)
```

### B. openclaw 输出示例

```
========================================
OPENCLAW SECURITY SCAN - 2026-03-12T10:00:00Z
Scanner: v3.5 (openclaw-security-monitor)
========================================

[1/51] Scanning for C2 IP addresses...
CLEAN: No C2 IPs detected

[2/51] Scanning for AMOS stealer...
CRITICAL: AMOS/stealer markers found in:
  malicious-skill/skill.md:15

...

========================================
SCAN COMPLETE: 1 critical, 0 warnings, 50 clean
========================================
STATUS: COMPROMISED - Immediate action required
```

### C. 相关文档

- openclaw-security-monitor: https://github.com/adibirzu/openclaw-security-monitor
- wopal-cli AGENTS.md: `projects/agent-tools/wopal-cli/AGENTS.md`
- 原有误报分析: `.tmp/.working-context.md`

---

**文档结束**

请确认以上方案，特别是"待确认事项"部分的决策。
