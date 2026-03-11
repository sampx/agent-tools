# OpenCode SDK & CLI

[![npm version](https://badge.fury.io/js/opencode-sdk.svg)](https://www.npmjs.com/package/opencode-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

OpenCode SDK 和 CLI 工具，通过 OpenAPI 规范自动生成，提供与 OpenCode 服务器交互的完整能力。

## 特性

- 🚀 **完整的 SDK** - 自动生成的 TypeScript API 客户端
- 💻 **功能丰富的 CLI** - 支持会话、项目、文件、配置管理
- 📡 **流式响应** - 支持 SSE 流式对话
- 🎨 **美化输出** - 表格、JSON 多种输出格式
- 🧪 **完整测试** - 使用 Vitest 进行单元测试
- 📦 **零配置** - 开箱即用的 TypeScript 项目

## 安装

```bash
# 本地安装
pnpm add opencode-sdk

# 全局安装 CLI
pnpm add -g opencode-sdk
```

## 快速开始

### SDK 使用

```typescript
import { Configuration, DefaultApi } from 'opencode-sdk';

// 创建配置
const config = new Configuration({
  basePath: 'http://127.0.0.1:3456'
});

// 初始化 API 客户端
const api = new DefaultApi(config);

// 健康检查
const health = await api.globalHealth();
console.log('健康状态:', health.data.healthy);

// 创建会话
const session = await api.sessionCreate(undefined, undefined, {
  title: 'AI Chat'
});

// 发送消息
const response = await api.sessionPrompt(session.data.id, undefined, undefined, {
  parts: [{ type: 'text', text: 'Hello, AI!' }]
});
```

### CLI 使用

```bash
# 健康检查
oc-cli health

# 查看当前项目
oc-cli project current

# 列出会话
oc-cli session list

# 创建会话
oc-cli session create --title "实现新功能"

# 查看提供商
oc-cli provider list

# 获取配置
oc-cli config get
```

## CLI 命令

| 命令 | 功能 |
|------|------|
| `health` | 健康检查 |
| `global agents` | 列出可用的 AI Agents |
| `global skills` | 列出可用的 Skills |
| `global commands` | 列出可用的命令 |
| `project current` | 显示当前项目 |
| `project list` | 列出所有项目 |
| `session list` | 列出所有会话 |
| `session create` | 创建新会话 |
| `session get <id>` | 查看会话详情 |
| `session delete <id>` | 删除会话 |
| `session abort <id>` | 中止会话 |
| `provider list` | 列出 AI 提供商 |
| `provider auth` | 查看认证状态 |
| `config get` | 获取配置 |
| `config set <key> <value>` | 设置配置 |
| `file list <path>` | 列出目录内容 |
| `file read <path>` | 读取文件内容 |
| `find files <pattern>` | 按名称查找文件 |
| `find text <pattern>` | 在文件中搜索文本 |
| `find symbols <query>` | 查找符号 |

## 开发

### 安装依赖

```bash
pnpm install
```

### 构建

```bash
# 构建 SDK 和 CLI
pnpm build

# 仅构建 SDK
pnpm build:sdk

# 仅构建 CLI
pnpm build:cli
```

### 测试

```bash
# 运行测试
pnpm test

# 运行测试（单次）
pnpm test:run

# 生成覆盖率报告
pnpm coverage
```

### 代码质量

```bash
# Lint 检查
pnpm lint

# Lint 自动修复
pnpm lint:fix

# 格式化代码
pnpm format

# 检查格式
pnpm format:check
```

### 本地开发

```bash
# 直接运行 CLI（开发模式）
pnpm dev -- health
pnpm dev -- session list

# 使用构建后的 CLI
pnpm cli health
```

## 配置

SDK 支持通过 `Configuration` 类进行配置：

```typescript
const config = new Configuration({
  basePath: 'http://127.0.0.1:3456',  // API 基础路径
  apiKey: 'your-api-key',               // API 密钥
  username: 'user',                     // 用户名
  password: 'pass',                     // 密码
  accessToken: 'token',                 // 访问令牌
  baseOptions: {                        // Axios 基础选项
    timeout: 5000,
    headers: {
      'X-Custom-Header': 'value'
    }
  }
});
```

## 流式响应

SDK 支持通过 EventSource 进行流式对话：

```typescript
import { streamResponse } from 'opencode-sdk/cli';

const eventSource = await streamResponse({
  sessionId: 'abc123',
  directory: '/path/to/project',
  onDelta: (text) => process.stdout.write(text),
  onComplete: () => console.log('\n完成!'),
  onError: (error) => console.error('错误:', error)
});
```

## 许可证

MIT License

## 相关资源

- [OpenCode 文档](https://opencode.ai)
- [OpenAPI 规范](https://spec.openapis.org/oas/latest.html)
- [完整使用指南](./docs/README.md)
