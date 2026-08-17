---
name: fc-local
description: |
  Local web scraping & search tool. MUST use when: (1) Scrape/crawl web pages to Markdown, (2) Web search, (3) Batch scrape multiple URLs, (4) Generate LLMs.txt. Trigger when user mentions URL scraping, site crawling, web search, or content extraction.
---

# fc-local — Local Web Scraping

CLI wrapper for web scraping and crawling.

## Prerequisites

### Core Commands

| Command | Description |
|---------|-------------|
| `fc-cli` | CLI for scrape/crawl operations |
| `my-fc` | Service manager (start/stop/status/health/logs) |

### fc-local Service

```bash
my-fc status          # Check container health
my-fc health          # Full check (API + scrape test)
my-fc start           # Start Docker services
my-fc logs api 100    # View API logs
```

**Verify dependencies**:
```bash
which fc-cli my-fc jq
```

## Command Matrix

| Need | Command | Options |
|------|---------|---------|
| Single page | `scrape <url>` | `--format`, `--clean`🤖, `--prompt`🤖 |
| Entire site | `crawl <url>` | `--limit`, `--wait`, `--clean`🤖 |
| Multiple URLs | `batch <file>` | `--wait` |
| Link discovery | `map <url>` | `--limit`, `--filter` |
| Web search | `search <query>` | `--limit` |
| LLMs.txt | `llmstxt <path>` | `--full` |
| Job status | `*-status <id>` | `--wait` |

🤖 = AI feature, high cost. Use only when user explicitly requests.

## Core Commands

### scrape — Single Page

```bash
fc-cli scrape <url> [-o .wopal-space/INBOX/docs/scraped/<name>.md] [--format markdown|html|links] [--clean] [--prompt <text>]
```

- `-o`: Output file path (default: `.wopal-space/INBOX/docs/scraped/<name>.md`)
- `--format`: Output format (default: markdown)
- `--clean`🤖: AI removes nav, ads, sidebars
- `--prompt`🤖: Custom AI processing (implies --clean)

### crawl — Website Crawling

```bash
fc-cli crawl <url> --limit <n> --wait [-o .wopal-space/INBOX/docs/scraped/<site>] [--clean] [--prompt <text>]
```

- `--limit`: Max pages to crawl
- `--wait`: Wait for completion
- `-o`: Output directory (default: `.wopal-space/INBOX/docs/scraped/<site>`)
- `--clean`🤖: AI content cleaning
- `--prompt`🤖: Custom AI processing

Output: Directory structure with `.md` files per page.

### batch — Multiple URLs

```bash
# Input: one URL per line or JSON array
fc-cli batch urls.txt --wait [-o results.json]
```

### map — Link Discovery

```bash
fc-cli map <url> [--limit <n>] [--filter <pattern>]
```

- `--filter`: Wildcard pattern (`*api*`, `*/docs/v1/*`)

### llmstxt — Generate LLMs.txt

```bash
# From URL
fc-cli llmstxt https://example.com

# From local directory
fc-cli llmstxt ./crawl-output [--full]
```

## Async Job Pattern

Most commands return job ID immediately. Use `--wait` for sync execution:

```bash
# Async
fc-cli crawl https://example.com
# Returns: job_abc123

# Check status
fc-cli crawl-status job_abc123

# Or sync mode
fc-cli crawl https://example.com --wait
```

Status commands: `crawl-status`, `batch-status`

## Global Options

| Option | Description |
|--------|-------------|
| `--api-url <url>` | Override API URL |
| `-o, --output <file>` | Save to file/directory |
| `-v, --verbose` | Detailed logging |

## 🚨 AI Features — STRICT RULES

**🔴 NEVER use AI options (`--clean`, `--prompt`) unless user EXPLICITLY requests them.**

| User says | Interpretation | Your action |
|-----------|----------------|-------------|
| "抓取这个页面" | Plain scrape | `fc-cli scrape <url>` |
| "结构化获取" | Markdown output (already structured) | `fc-cli scrape <url>` |
| "爬取整个网站" | Plain crawl | `fc-cli crawl <url>` |
| "用 AI 清理内容" | Explicit AI request | `fc-cli scrape <url> --clean` ✅ |

**Key principle**: `scrape` already returns structured Markdown. "结构化" ≠ AI extraction.

**AI options consume credits and are slower. Default to plain scrape/crawl.**

## Notes

- **Output directory**: Save scraped files to `.wopal-space/INBOX/docs/scraped/` using `-o` option
- **Speed**: Playwright renders 2-5s per page
- **Large sites**: Test with small `--limit` first

## Fallback: BrowserWing (Anti-crawling)

When fc-local fails due to anti-crawling (page keeps navigating, 403/500, captcha, empty content), switch to the **`browserwing`** skill. It drives a real Chrome with the user's persistent profile (cookies + login state), so anti-bot checks that block headless Playwright pass through.

**Anti-crawling indicators**:
- Playwright log: `page is navigating and changing the content`
- API returns 403/500 or a captcha page
- Content is empty or shows "access denied"

### Switch to BrowserWing

Load the `browserwing` skill, then:

```bash
# 1. Ensure server + browser running (first run may take a few seconds)
brw status || brw start
brw browser start

# 2. Open target and wait for it to settle
brw exec navigate "<url>"
brw exec wait --load networkidle

# 3a. Extract the main content region (preferred — skips nav/footer/ads)
brw exec extract "article, main, [class*=content]" --fields=text --multiple \
  > .wopal-space/INBOX/docs/scraped/<name>.md

# 3b. Or grab the full body text as a fallback
brw exec eval "document.body.innerText" \
  > .wopal-space/INBOX/docs/scraped/<name>.md
```

`brw` writes to `data_dir/chrome_user_data/` — the user's real Chrome profile keeps cookies and login state, which is why it bypasses detection that headless Playwright trips.

For anything more involved (multi-step login, infinite scroll, form submission before scraping), defer to the full `browserwing` skill — it covers `snapshot` (get element RefIDs), `click`/`type` interactions, and cookie management.

## Troubleshooting

When commands fail or return unexpected results:

```bash
# Quick diagnostics
my-fc status              # Container health
my-fc health              # Full API test
my-fc logs api 100        # Recent API logs
my-fc logs playwright-service 50  # Playwright errors
```

**Common issues**:
- Empty content → Check playwright logs for anti-crawling errors → Switch to the `browserwing` fallback above
- API not responding → `my-fc restart`
- Timeout → Increase `--timeout` or check site speed

👉 **Full guide**: `references/TROUBLESHOOTING.md`

## References

- Full API: `references/API_REFERENCE.md`
- Examples: `references/EXAMPLES.md`
- Troubleshooting: `references/TROUBLESHOOTING.md`
