---
trigger: model_decision
description: Follow this rule when developing Chrome/Edge/Firefox browser extensions. Covers Manifest V3 spec, project structure, permission management, Service Worker lifecycle, security policies, and publishing and distribution.
keywords:
  - 'browser extension'
  - 'chrome extension'
  - 'manifest v3'
  - 'mv3'
  - 'service worker'
  - 'webextension'
---

# Chrome Browser Extension Development Conventions

## Version Requirements

- Must use **Manifest V3** (MV2 is no longer accepted for review)
- Supported by Chrome 85+, same for Edge
- Use the WebExtensions API if Firefox compatibility is needed

## Project Structure

```
my-extension/
├── manifest.json              # Core manifest (required, root directory)
├── background.js              # Service Worker (background script, event-driven)
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/
│   ├── options.html
│   └── options.js
├── content-scripts/
│   └── content.js             # Content script (injected into page DOM)
├── lib/
│   └── protocol.js            # Shared modules
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── _locales/
│   ├── en/messages.json       # Internationalization
│   └── zh_CN/messages.json
├── package.json
└── vite.config.ts             # Vite build recommended
```

### Structure Principles

- `manifest.json` **must** be placed in the project root directory
- Service Worker acts as the coordinator (routing + permissions + state management)
- Keep UI code in UI files (popup/options)
- Keep page interaction logic in content scripts
- Extract shared logic into the `lib/` directory
- Output build artifacts to `dist/`, and point to this directory when loading

## manifest.json Specification

```json
{
  "manifest_version": 3,
  "name": "__MSG_extName__",
  "version": "1.0.0",
  "description": "__MSG_extDescription__",
  "permissions": [
    "storage",
    "alarms",
    "notifications"
  ],
  "host_permissions": [
    "https://example.com/*"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "content_scripts": [{
    "matches": ["https://example.com/*"],
    "js": ["content-scripts/content.js"],
    "run_at": "document_idle"
  }],
  "options_ui": {
    "page": "options/options.html",
    "open_in_tab": true
  },
  "default_locale": "en",
  "web_accessible_resources": [{
    "resources": ["assets/*"],
    "matches": ["https://example.com/*"]
  }]
}
```

## Permission Management

### Least Privilege Principle

- **Only request permissions you truly need**; every additional permission adds review risk
- Use specific domains in `host_permissions`, avoid `<all_urls>` unless absolutely necessary
- Request non-essential permissions dynamically on demand with `chrome.permissions.request()`

```javascript
// Dynamically request permissions
chrome.permissions.request({
  permissions: ['activeTab'],
  origins: ['https://example.com/*']
}, (granted) => {
  if (!granted) {
    // Gracefully degrade when permission is denied
    notifyUser('部分功能需要授权才能使用');
  }
});
```

### Permission Categories

| Permission Category | Manifest Field | Description |
|----------|----------|------|
| Browser APIs | `permissions` | `storage`, `alarms`, `notifications`, `tabs`, `webRequest`, etc. |
| Host access | `host_permissions` | `https://example.com/*`, specifies accessible domains |
| Optional permissions | `optional_permissions` | Requested dynamically at runtime, reduces review pressure at initial install |

## Service Worker Lifecycle

### Core Rules

- Service Workers are **not persistent**; the browser destroys them after idle
- All state must be persisted (`chrome.storage`), never rely on global variables
- Use the `chrome.alarms` API for scheduled tasks

```javascript
// Correct: persist state with storage
const STORAGE_KEY = 'appState';

async function getState() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || {};
}

async function saveState(partial) {
  const current = await getState();
  await chrome.storage.local.set({ [STORAGE_KEY]: { ...current, ...partial } });
}
```

### Initialization Strategy

```javascript
// Triple guarantee: module level + onInstalled + onStartup
(async () => {
  // 1. Module level — runs on every Service Worker wake-up
  await initAlarm();
  await initDnrRules();
})();

chrome.runtime.onInstalled.addListener(() => {
  // 2. Runs on install/update
  migrateState();
});

chrome.runtime.onStartup.addListener(() => {
  // 3. Runs on browser startup
  verifyState();
});
```

### Scheduled Tasks

```javascript
const ALARM_NAME = 'my-extension-monitor';

async function syncAlarm(settings) {
  if (settings.monitorEnabled) {
    await chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: settings.interval,
      periodInMinutes: settings.interval,
    });
  } else {
    await chrome.alarms.clear(ALARM_NAME);
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    performBackgroundTask();
  }
});
```

## Communication Mechanisms

### Popup ↔ Service Worker

```javascript
// popup.js — send messages
function send(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

// background.js — receive messages (must support async)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case 'getData': {
          const data = await getData();
          sendResponse({ ok: true, data });
          return;
        }
        default:
          sendResponse({ ok: false, error: `Unknown: ${message.type}` });
      }
    } catch (e) {
      sendResponse({ ok: false, error: e.message });
    }
  })();
  return true; // must return true for async responses
});
```

### Content Script ↔ Service Worker

```javascript
// content-script.js — send requests
chrome.runtime.sendMessage({ type: 'pageAction', payload: { url: location.href } });

// Service Worker — respond
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // sender.tab contains information about which tab the message came from
});
```

### Popup ↔ Content Script (direct communication)

```javascript
// popup.js — send messages to the content script of the current tab
async function sendToActiveTab(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  
  chrome.tabs.sendMessage(tab.id, message, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Content script not available');
    }
  });
}
```

## Security Conventions

### Forbidden Items

- **Forbidden** to execute remote code (all JavaScript must be bundled inside the extension)
- **Forbidden** to use `eval()` or `new Function()`
- **Forbidden** to load external scripts from a CDN

### CSP Security

```json
// manifest.json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### Precise web_accessible_resources Control

```json
{
  "web_accessible_resources": [{
    "resources": ["images/*", "fonts/*"],
    "matches": ["https://specific-domain.com/*"],
    "use_dynamic_url": true
  }]
}
```

### Data Storage Security

- Store sensitive data (such as API keys, cookies) in `chrome.storage.local` (not automatically synced to the cloud)
- Use `chrome.storage.sync` only for user preferences (8KB max per key, 100KB total)
- Use IndexedDB for large data
- Do not hardcode sensitive information in code

## Network Request Interception

### Use declarativeNetRequest (recommended)

In MV3, the blocking mode of `webRequest` has been removed; use the declarative API for network request interception:

```json
{
  "permissions": ["declarativeNetRequest"],
  "declarative_net_request": {
    "rule_resources": [{
      "id": "ruleset_1",
      "enabled": true,
      "path": "rules.json"
    }]
  }
}
```

```json
// rules.json
[{
  "id": 1,
  "priority": 1,
  "action": { "type": "block" },
  "condition": {
    "urlFilter": "||ads.example.com",
    "resourceTypes": ["script", "image"]
  }
}]
```

### Read-Only webRequest Observation

If you only need to **read** request headers (without modifying), you can use webRequest's non-blocking mode:

```javascript
// Read-only observation of request headers — legitimate use
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    const cookie = extractCookie(details.requestHeaders);
    if (cookie) storeCapturedCookie(cookie);
  },
  { urls: ["https://api.example.com/*"] },
  ["requestHeaders", "extraHeaders"]
);
```

## Content Scripts

```javascript
// content-script.js — script injected into pages
// Note: content scripts run in an isolated world and do not conflict with page JS

// Read page information
const pageData = {
  title: document.title,
  url: location.href,
  selectedText: window.getSelection()?.toString(),
};

// Send to Service Worker
chrome.runtime.sendMessage({ type: 'pageData', payload: pageData });

// Receive messages from popup/background
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'getPageContent') {
    sendResponse({ content: document.body.innerText });
  }
});
```

## Icon Requirements

| Size | Purpose | Required |
|------|------|----------|
| 16x16 | Browser toolbar, address bar | Recommended |
| 48x48 | Extension management page | Recommended |
| 128x128 | Chrome Web Store listing, install dialog | **Required** |

## Internationalization (recommended)

```json
// _locales/en/messages.json
{
  "extName": { "message": "My Extension" },
  "extDescription": { "message": "Description here" }
}

// _locales/zh_CN/messages.json
{
  "extName": { "message": "我的扩展" },
  "extDescription": { "message": "扩展描述" }
}

// manifest.json reference
{
  "name": "__MSG_extName__",
  "description": "__MSG_extDescription__",
  "default_locale": "en"
}
```

## Development and Build

### Recommended Toolchain

- **Vite** + **CRXJS** plugin — supports hot-reload development
- **TypeScript** — type safety
- **ESLint + Prettier** — code conventions

```bash
# Development
npm create vite@latest my-extension -- --template vanilla-ts
cd my-extension
npm install @crxjs/vite-plugin
# npm run dev → hot-reload development

# Build
npm run build
# Artifacts are in the dist/ directory; load it as an unpacked extension
```

### Debugging Tips

- `chrome://extensions/` — load/manage extensions
- `chrome://inspect/#service-workers` — debug the Service Worker
- Use `console.log()` in the Service Worker for logging, viewable in the background page inspector

## Common Service Worker Pitfalls

| Wrong Approach | Correct Approach | Reason |
|----------|----------|------|
| Storing state in global variables | Persist to `chrome.storage` | SW can be destroyed at any time |
| Async `onMessage` without returning `true` | `return true` to mark async | Otherwise the callback is cleaned up immediately |
| Using `fetch` without `credentials: "omit"` | Explicitly specify the credentials policy | Avoid the browser auto-leaking cookies |
| Relying on `setTimeout` for scheduled tasks | Use `chrome.alarms` | Timers fail after the SW sleeps |
| Manipulating DOM in the SW | SW cannot access the DOM | Use content scripts to manipulate pages |

## Publishing and Distribution

### Chrome Web Store

1. Register as a developer: one-time fee of `$5`
2. Prepare assets: 128x128 icon + 1280x800 screenshots (up to 5)
3. Package: `zip -r extension.zip . -x "*.git*" "node_modules/*" ".svn*" ".DS_Store" "src/*"`
4. Submission process:
   - Upload the ZIP
   - Fill in the store listing (name, description, category)
   - Fill in privacy practices (single purpose, permission justification, data collection statements)
   - Submit for review (1-3 business days)

### Multi-Platform Distribution

| Platform | Fee | Notes |
|------|------|------|
| Chrome Web Store | $5 (one-time) | **Recommended**, best user installation experience |
| Edge Add-ons | Free | Largely compatible with Chrome code |
| Firefox Add-ons | Free | Requires WebExtensions API compatibility |
| Self-hosted | Free | Direct installation on Linux only; Windows/macOS require "load unpacked extension" |

### Self-Hosted Distribution (internal/technical users)

```bash
# 1. Package as ZIP
zip -r my-extension-v1.0.zip . -x "*.git*" "node_modules/*" ".DS_Store" "src/*"

# 2. Upload to the server

# 3. User installation steps (common to macOS/Linux/Windows):
#    a. Download and unzip the ZIP
#    b. Open chrome://extensions/
#    c. Enable "Developer mode"
#    d. Click "Load unpacked" → select the unzipped folder

# 4. User update steps:
#    a. Download the new version ZIP and unzip to overwrite
#    b. Click the extension's refresh button in chrome://extensions/
```
