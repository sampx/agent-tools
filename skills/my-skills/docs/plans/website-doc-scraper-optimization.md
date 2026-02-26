# Website Doc Scraper 优化方案计划

## 背景

当前skill存在以下问题需要解决：
1. MCP tools验证方法不准确
2. Fast Path升级到Project Mode流程混乱，级联抓取和深度控制未实现
3. 文件命名不一致：Fast Path保存为`docs.md`而非`docs/index.md`
4. Tavily输出文件被读取，造成token浪费

## 目标

1. 重构为3种独立模式，流程清晰
2. 统一文件命名规则，确保Layer Mode和Site Mode最终文件结构一致
3. Layer Mode支持分层递归抓取，每层确认
4. 避免读取大文件，节省token

---

## Mode重新设计

### Mode 1: Fast Path（单页模式）

**用途**：快速抓取单个页面

**流程**：
1. 使用`tavily_extract`抓取URL
2. 使用`state_manager.py get-filename`获取正确文件名
3. Agent用`Write`工具保存内容
4. 询问："是否需要抓取该网站的其他页面？"
   - [A] 是，进入Layer Mode
   - [B] 否，完成

**适用场景**：
- 用户只需单个页面
- 想先预览再决定是否批量抓取

---

### Mode 2: Layer Mode（分层模式）⭐核心改造

**用途**：从单页升级，分层递归抓取

**策略**：
- 无固定层数限制
- 每层抓取完成后暂停，用户明确确认才进入下一层
- 从markdown文档提取链接（不使用tavily_map）
- 支持URL和语言过滤
- 自动去重（scraped_urls + pending_urls + failed_urls）

**核心特性**：
1. 抓取完成后**不自动计算**下一层链接
2. 用户明确"要下一层"时才提取并预览
3. 自然终止：某层提取链接为0时自动结束

**流程**：

#### 配置阶段
```
用户确认后进入Layer Mode配置：

1. URL过滤（可选）
   "是否需要按关键词/路径过滤URL？
    例如：只抓取 https://opencode.ai/docs 下的页面
    输入正则表达式（留空=不过滤）："

2. 语言过滤（可选）
   "是否有特定语言版本？
    例如：只抓取英文文档
    输入正则表达式（留空=不限）："

3. 确认开始
   "配置确认：
    - URL过滤: <pattern or '无'>
    - 语言过滤: <pattern or '无'>

    开始第1层抓取？[是/否]"
```

#### 第1层抓取
```
1. 提取链接
   python scripts/extract_links.py <output-dir> --output /tmp/urls_layer1.txt

2. 应用过滤（如果用户设置了）
   python scripts/state_manager.py filter-pending --output-dir <dir> --pattern "<pattern>" --mode keep

3. 显示统计和预览
   python scripts/state_manager.py stats --output-dir <dir>
   python scripts/state_manager.py preview --output-dir <dir> --size 10

   输出格式：
   "📊 第1层统计
   - 发现链接: 57个
   - 过滤后: 31个
   - 预览（前10个）:
     1. https://opencode.ai/docs/config/
     2. https://opencode.ai/docs/tools/
     ..."

4. 用户确认
   "第1层准备抓取31个页面。
   开始抓取？[是/否]"

5. 批量抓取
   循环直到pending队列为空：
     - get-next-batch (size=20)
     - tavily_extract (format="markdown")
     - save-batch (直接调用脚本，不读取文件)
     - mark-scraped

6. 第1层完成
   "✓ 第1层完成
   - 抓取页面: 31个
   - 失败: 0个
   - 总计: 32个（含初始页面）"

7. 询问是否继续
   "第1层已完成。
   是否继续抓取第2层？
   [A] 是，查看第2层链接
   [B] 否，完成抓取"
```

#### 第2层及后续
```
用户选择[A]后：

1. 提取链接（从所有已抓取文件）
   python scripts/extract_links.py <output-dir> --output /tmp/urls_layer2.txt

2. 添加到队列（自动去重）
   python scripts/state_manager.py add-urls --output-dir <dir> --urls-file /tmp/urls_layer2.txt

3. 显示统计
   python scripts/state_manager.py stats --output-dir <dir>

   输出格式：
   "📊 第2层统计
   - 提取链接: 15个
   - 新发现: 15个（已去重）
   - 预览（前10个）:
     1. https://opencode.ai/docs/config/cli/
     2. https://opencode.ai/docs/config/web/
     ..."

4. 用户确认
   "第2层发现15个新页面。
   开始抓取？[是/否]"

5. 批量抓取（同第1层步骤5）

6. 第2层完成
   "✓ 第2层完成
   - 新增页面: 15个
   - 总计: 47个"

7. 询问是否继续
   "第2层已完成。
   是否继续抓取第3层？
   [A] 是，查看第3层链接
   [B] 否，完成抓取"
```

#### 自然终止
```
如果某层提取后，新发现链接为0：
   "📊 第N层统计
   - 提取链接: 0个
   - 新发现: 0个（所有链接已抓取或失败）

   ✅ 所有链接已探索完毕，抓取完成。

   总计：
   - 抓取页面: 47个
   - 失败: 0个
   - 深度: 2层

   开始链接验证和修复..."
```

**适用场景**：
- 文档结构清晰，需要分层控制
- 用户需要看到每层结果再决定
- 避免盲目抓取大量页面

---

### Mode 3: Site Mode（整站模式）

**用途**：抓取整个网站

**策略**：
- 使用`tavily_map`一次性发现所有页面
- 批量抓取所有URL
- 确保文件命名与Layer Mode一致

**流程**：
1. 初始化state
2. 使用`tavily_map`发现网站结构
3. 添加发现的URL到队列
4. 用户确认配置（过滤、预览）
5. 批量抓取
6. 链接验证和修复

**适用场景**：
- 网站结构复杂
- 需要全面抓取所有页面
- 不关心分层控制

---

## 文件命名统一方案

### 问题

**当前**：
- Fast Path时Agent用`Write`工具直接保存
- 文件名生成规则不统一
- `https://opencode.ai/docs/` 被保存为 `docs.md` ❌
- 应该保存为 `docs/index.md` ✅

**已有逻辑**：
- `state_manager.py`的`save_batch_content`方法有正确的命名规则（223-249行）

### 解决方案：get-filename命令

**新增命令**：
```bash
python scripts/state_manager.py get-filename --url <url> --output-dir <dir>
```

**输出格式**（JSON）：
```json
{
  "filename": "docs/index.md",
  "full_path": "/path/to/output/docs/index.md"
}
```

**命名规则**（与`save_batch_content`一致）：
1. Root URL (如 `https://opencode.ai/docs/`) → `index.md`
2. Directory URL (如 `https://opencode.ai/docs/rules/`) → `rules/index.md`
3. File URL (如 `https://opencode.ai/docs/config.md`) → `config.md`

**Fast Path使用方式**：
```bash
# 1. 获取正确文件名
python scripts/state_manager.py get-filename --url https://opencode.ai/docs/ --output-dir docs/opencode

# 输出: {"filename": "index.md", "full_path": "docs/opencode/index.md"}

# 2. Agent用Write工具保存到指定路径

# 3. 导入到state
python scripts/state_manager.py import-single --output-dir docs/opencode --url https://opencode.ai/docs/ --file docs/opencode/index.md
```

**优点**：
- Fast Path直接用正确文件名保存
- 三种Mode命名逻辑完全一致
- 最终文件结构一致

---

## state_manager.py扩展需求

### 1. get-filename命令

**功能**：根据URL生成正确的文件名和完整路径

**参数**：
- `--url`: 目标URL
- `--output-dir`: 输出目录

**输出**：JSON格式
```json
{
  "filename": "docs/index.md",
  "full_path": "/absolute/path/to/output/docs/index.md"
}
```

**实现要点**：
- 复用`save_batch_content`中的命名逻辑（223-249行）
- 不需要检查文件是否存在
- 返回相对路径和绝对路径

---

### 2. stats命令

**功能**：显示当前统计信息

**参数**：
- `--output-dir`: 项目目录

**输出**：JSON格式
```json
{
  "total_scraped": 47,
  "total_failed": 0,
  "total_pending": 0
}
```

**实现要点**：
- 从`statistics`字段读取
- 不返回深度（Layer Mode每层明确知道自己的位置）
- 简洁输出关键指标

---

### 3. import-single增强

**现有参数**：
- `--url`: 已抓取的URL
- `--file`: 保存的文件路径（可选）

**修改**：
- `--file`参数记录实际保存的文件路径
- 不做重命名逻辑（由Agent通过get-filename处理）

**实现要点**：
- 在state中记录`url -> file`的映射（可选）
- 主要用于后续链接验证时定位文件

---

## Layer Mode关键设计决策

### 技术细节确定

1. **get-filename输出格式**：JSON（便于Agent解析）

2. **stats命令返回内容**：仅统计信息（total_scraped, total_failed, total_pending）
   - 不返回深度（每层明确）

3. **import-single的--file参数**：保留，记录实际文件路径

4. **配置阶段过滤顺序**：先过滤再预览
   - 用户看到的就是要抓取的
   - 减少确认轮次

5. **每层显示信息**：
   - 发现链接数
   - 过滤后数量
   - 新发现数量
   - 前10个链接预览
   - 抓取结果（成功/失败）

### 人性化设计原则

1. **多确认，少自动**：
   - 每层完成后暂停询问
   - 抓取前确认
   - 配置前确认

2. **清晰反馈**：
   - 显示具体数字（31个页面）
   - 显示预览（前10个链接）
   - 显示进度（第1层/第2层）

3. **灵活控制**：
   - 过滤可选
   - 随时可停止
   - 自然终止

---

## 实施计划

### Phase 1: state_manager.py扩展（高优先级）

**任务**：
1. ✅ 实现get-filename命令
   - 复用命名逻辑
   - JSON输出

2. ✅ 实现stats命令
   - 返回统计信息
   - JSON输出

3. ✅ 增强import-single
   - 记录--file参数
   - 更新state数据结构（如果需要）

**预计时间**：2-3小时

---

### Phase 2: SKILL.md完整重写（高优先级）

**任务**：
1. ✅ 更新Mode Selection（3种mode）
2. ✅ 重写Fast Path（使用get-filename）
3. ✅ 实现Layer Mode完整流程
   - 配置阶段
   - 第N层循环
   - 自然终止
4. ✅ 更新Site Mode（保持现有逻辑）
5. ✅ 更新Guidelines
   - 统一命名规则
   - 不读取tavily输出文件
   - 人性化确认原则

**预计时间**：3-4小时

---

### Phase 3: 测试验证（高优先级）

**任务**：
1. ✅ 测试Fast Path命名正确性
   - 验证`docs/index.md`而非`docs.md`
   - 验证`docs/rules/index.md`

2. ✅ 测试Layer Mode 3层流程
   - 每层确认
   - 链接提取
   - 批量抓取
   - 去重验证

3. ✅ 测试Layer Mode自然终止
   - 某层新链接为0时自动结束
   - 显示完整统计

4. ✅ 测试Site Mode与Layer Mode命名一致性
   - 相同URL的两种模式应生成相同文件名
   - 最终文件结构一致

5. ✅ 测试链接验证和修复
   - check_markdown_links
   - fix_markdown_links
   - 重新验证

**预计时间**：2-3小时

---

### Phase 4: 文档更新（中优先级）

**任务**：
1. ✅ 更新scraper-guide.md
   - 添加get-filename命令说明
   - 添加stats命令说明
   - 更新使用示例

2. ✅ 添加Layer Mode使用示例
   - 3层抓取流程
   - 穷尽模式流程

**预计时间**：1-2小时

---

## 成功标准

1. ✅ 三种Mode流程清晰，相互独立
2. ✅ 文件命名统一，Layer Mode和Site Mode结果一致
3. ✅ Layer Mode支持分层递归，每层确认
4. ✅ 自动去重机制正常工作
5. ✅ 链接验证和修复功能正常
6. ✅ 不读取tavily输出文件，节省token
7. ✅ 用户反馈清晰，确认点合理

---

## 风险和缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 文件重命名逻辑复杂 | Fast Path可能仍有问题 | 充分测试get-filename命令 |
| Layer Mode用户确认过多 | 体验繁琐 | 提供清晰的统计和预览 |
| 去重逻辑遗漏 | 重复抓取 | 测试验证三重去重 |
| Site Mode与Layer Mode不一致 | 文件结构混乱 | 严格复用命名逻辑 |

---

## 时间估算

- Phase 1: 2-3小时
- Phase 2: 3-4小时
- Phase 3: 2-3小时
- Phase 4: 1-2小时

**总计**: 8-12小时
