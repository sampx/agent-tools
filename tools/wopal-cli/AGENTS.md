# wopal-cli - Agent 项目规范

## 项目概览

wopal-cli 是 Wopal 工作空间的技能管理命令行工具，实现 INBOX 隔离工作流（下载 → 扫描 → 评估 → 安装），为 AI Agent 技能管理提供安全保障。

**核心价值**：
- INBOX 隔离机制：外部技能先进入隔离区，扫描安全后再安装
- 20 项静态安全检查：检测恶意代码、C2 基础设施、凭证泄露等
- 版本指纹追踪：GitHub Tree SHA + 本地 hash 双重比对
- 白名单过滤：减少误报，提升扫描效率

## 目录结构

```
wopal-cli/
├── src/
│   ├── cli.ts              # 命令行入口（commander.js）
│   ├── commands/           # 命令实现（8 个）
│   │   ├── init.ts         # 初始化配置
│   │   ├── download.ts     # 技能下载
│   │   ├── scan.ts         # 安全扫描
│   │   ├── check.ts        # 版本检查
│   │   ├── install.ts      # 安装到目标目录
│   │   ├── list.ts         # 技能列表
│   │   ├── inbox.ts        # INBOX 管理
│   │   └── passthrough.ts  # 透传搜索
│   ├── scanner/            # 安全扫描器
│   │   ├── scanner.ts      # 扫描引擎
│   │   ├── checks/         # 20 项安全检查
│   │   ├── ioc-loader.ts   # IOC 数据库加载
│   │   └── whitelist.ts    # 白名单过滤
│   ├── utils/              # 工具模块
│   │   ├── config.ts       # 配置管理
│   │   ├── git.ts          # Git 操作
│   │   ├── hash.ts         # 文件哈希
│   │   ├── logger.ts       # 日志系统
│   │   ├── skill-lock.ts   # 技能锁文件
│   │   ├── lock-manager.ts # 锁文件管理器
│   │   ├── source-parser.ts # 源地址解析
│   │   ├── help-texts.ts   # 帮助文本模板（CLI UX 规范）
│   │   ├── error-utils.ts  # 错误提示工具（CommandError）
│   │   └── ...             # 其他工具
│   └── types/              # TypeScript 类型定义
│       ├── cli.ts          # CLI 类型
│       └── lock.ts         # 锁文件类型
├── tests/                  # 测试文件
│   ├── *.test.ts           # 单元测试
│   └── *.integration.test.ts # 集成测试
├── bin/                    # 编译输出（git ignored）
├── logs/                   # 日志输出（git ignored）
├── package.json
├── tsconfig.json
└── pnpm-lock.yaml
```

## 技术栈

| 技术 | 用途 | 版本 |
|------|------|------|
| TypeScript | 核心语言 | ^5.9.3 |
| commander.js | CLI 框架 | ^12.0.0 |
| simple-git | Git 操作 | ^3.32.3 |
| fs-extra | 文件系统 | ^11.3.4 |
| gray-matter | Frontmatter 解析 | ^4.0.3 |
| p-limit | 并发控制 | ^7.3.0 |
| picocolors | 终端着色 | ^1.1.1 |
| vitest | 测试框架 | ^4.0.18 |
| prettier | 代码格式化 | ^3.6.2 |

## 开发命令

```bash
# 编译 TypeScript
pnpm build

# 开发模式（ts-node 实时运行）
pnpm dev

# 运行测试
pnpm test

# 运行测试（单次）
pnpm test:run

# 代码格式化
pnpm format

# 格式检查
pnpm format:check
```

## 命令列表

### 全局命令

```bash
# 初始化配置（生成 .wopalrc）
wopal init

# 显示帮助
wopal help [command]

# 显示版本
wopal -v
```

### 技能管理命令

所有命令支持 `--help` 查看详细帮助（EXAMPLES / OPTIONS / NOTES / WORKFLOW）。

```bash
# 下载技能到 INBOX
wopal skills download <sources...>
  --branch <name>    # 指定分支
  --tag <tag>        # 指定标签
  --force            # 强制覆盖
  --json             # JSON 格式输出

# 安全扫描
wopal skills scan [skill-name]
  --all              # 扫描 INBOX 所有技能
  --json             # JSON 格式输出
  --output <file>    # 输出到文件

# 版本检查
wopal skills check [skill-name]
  --local            # 检查本地技能
  --global           # 检查全局技能
  --json             # JSON 格式输出

# 安装技能
wopal skills install <skill-name>
  -g, --global       # 安装到全局
  --force            # 强制覆盖
  --skip-scan        # 跳过安全扫描
  --mode <mode>      # 安装模式（copy/symlink）

# 列出技能
wopal skills list
  --info             # 显示详细信息
  --json             # JSON 格式输出

# INBOX 管理
wopal skills inbox list --json    # JSON 格式输出
wopal skills inbox show <skill-name>
wopal skills inbox remove <skill-name>

# 透传搜索（调用 skills.sh API）
wopal find [query]
```

### CLI UX 规范

- **语言统一**：所有用户界面输出使用英文
- **帮助文档**：每个命令都有详细的 EXAMPLES / OPTIONS / NOTES / WORKFLOW
- **JSON 输出**：`list`、`inbox list`、`download`、`scan`、`check` 支持 `--json`
- **错误格式**：统一使用 `src/utils/error-utils.ts` 和 `src/utils/help-texts.ts`

## 架构设计

### 命令注册模式

所有命令采用统一的注册模式：

```typescript
// src/commands/xxx.ts
export function registerXxxCommand(program: Command): void {
  const cmd = program.command('xxx')
    .description('...')
    .option('--flag', '...')
    .action(async (options) => {
      // 命令逻辑
    });
}

// 依赖注入 Logger
export function setLogger(logger: Logger): void {
  // 模块级 logger 变量
}
```

### Logger 注入

所有命令模块通过 `setLogger()` 注入 Logger 实例，在 `cli.ts` 的 `preAction` hook 中统一注入：

```typescript
program.hook('preAction', (thisCommand) => {
  const logger = new Logger(debug);
  setXxxLogger(logger); // 注入到各模块
});
```

### 环境变量加载

`cli.ts` 在 `preAction` hook 中调用 `loadEnv(debug)`，从以下位置加载 `.env` 文件（按优先级）：

1. `./.env`（当前工作目录）
2. `~/.wopal/.env`（全局配置）

### 错误处理

统一使用 `src/utils/error-utils.ts` 提供的错误处理工具：

```typescript
import { handleError, createError } from './utils/error-utils.js';

try {
  // ...
} catch (error) {
  handleError(error, '命令执行失败');
}
```

## 测试规范

### 测试文件命名

- 单元测试：`*.test.ts`（如 `hash.test.ts`）
- 集成测试：`*.integration.test.ts`（如 `check-integration.test.ts`）

### 测试框架

使用 vitest，示例：

```typescript
import { describe, it, expect } from 'vitest';

describe('模块名', () => {
  it('功能描述', () => {
    expect(true).toBe(true);
  });
});
```

### 测试覆盖

- 核心工具函数：100% 覆盖
- 命令逻辑：关键路径覆盖
- 集成测试：端到端流程覆盖

## 环境变量

| 变量名 | 用途 | 默认值 |
|--------|------|--------|
| `WOPAL_SKILLS_INBOX_DIR` | INBOX 目录路径 | `~/.wopal/skills/INBOX` |
| `WOPAL_SKILLS_IOCDB_DIR` | IOC 数据库目录 | `~/.wopal/skills/iocdb` |
| `WOPAL_SKILLS_DIR` | 技能安装目录 | `.wopal/skills` |
| `GITHUB_TOKEN` / `GH_TOKEN` | GitHub API Token | -（可选，提高速率限制） |

> **Deprecated**: `WOPAL_SKILL_INBOX_DIR`、`WOPAL_SKILL_IOCDB_DIR` 已弃用，请使用复数形式。

## 开发约定

### 代码风格

- 使用 Prettier 格式化（配置见 `package.json`）
- 2 空格缩进
- 单引号字符串
- 分号结尾

### TypeScript 规范

- 严格模式（`strict: true`）
- ES modules（`type: "module"`）
- 显式类型注解（避免 `any`）
- 导出接口和类型

### 命令模块约定

1. 命令注册函数命名：`register<Command>Command`
2. Logger 注入函数命名：`setLogger`
3. 异步操作使用 `async/await`
4. 错误使用 `handleError` 统一处理

### Git 提交规范

遵循工作空间 Git 规范（见 `AGENTS.md`），使用 Conventional Commits：

- `feat: 新增 check 命令`
- `fix: 修复下载失败问题`
- `refactor: 重构扫描器架构`
- `test: 添加集成测试`

## 关键模块说明

### scanner/ - 安全扫描器

20 项静态安全检查（9 项严重 + 11 项警告）：

**严重级别**：
- `c2-infrastructure` - C2 基础设施
- `reverse-shell` - 反向 shell
- `malware-markers` - 恶意软件标记
- `binary-download` - 二进制文件下载
- `crypto-wallet` - 加密钱包操作
- ...

**警告级别**：
- `base64-obfuscation` - Base64 混淆
- `env-leakage` - 环境变量泄露
- `curl-pipe` - curl | bash 模式
- ...

### utils/skill-lock.ts - 技能锁文件

管理技能元数据（版本、来源、哈希）：

```typescript
interface SkillLock {
  name: string;
  source: string;
  installedAt: string;
  skillFolderHash: string;
  commit?: string;
  ref?: string;
  tag?: string;
}
```

### utils/lock-manager.ts - 锁文件管理器

管理 `wopal-skills.lock` 文件，提供 CRUD 操作。

## 扩展计划

- [ ] `wopal skills update` - 批量更新技能
- [ ] `wopal skills backup` - 备份技能配置
- [ ] `wopal config` - 配置管理命令
- [ ] 插件系统（支持自定义扫描规则）
