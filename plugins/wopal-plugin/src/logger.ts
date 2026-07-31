import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "fs"
import { dirname, join } from "path"
import { homedir } from "os"
import type { RuntimeContext } from "./runtime-context.js"
import type { RuntimeEnvironment } from "./runtime-environment.js"

// ---------------------------------------------------------------------------
// Level definitions
// ---------------------------------------------------------------------------

const LEVELS: Record<string, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
}

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

export function getMinLevel(environment: RuntimeEnvironment = process.env): number {
  const level = environment.WOPAL_PLUGIN_LOG_LEVEL ?? "info"
  return LEVELS[level] ?? LEVELS["info"]!
}

export function getMinLevelName(environment: RuntimeEnvironment = process.env): string {
  const level = environment.WOPAL_PLUGIN_LOG_LEVEL ?? "info"
  return Object.hasOwn(LEVELS, level) ? level : "info"
}

export function getLogFile(
  context?: RuntimeContext,
  environment: RuntimeEnvironment = process.env,
): string {
  if (environment.VITEST) {
    return environment.WOPAL_PLUGIN_LOG_FILE ?? ""
  }
  const configured = environment.WOPAL_PLUGIN_LOG_FILE
  if (configured) return configured
  if (context) return join(context.logDir, "wopal-plugin.log")
  const wopalHome = environment.WOPAL_HOME ?? join(homedir(), ".wopal")
  return join(wopalHome, "logs", "wopal-plugin.log")
}

function getAllowedModules(environment: RuntimeEnvironment): Set<string> | null {
  const env = environment.WOPAL_PLUGIN_LOG_MODULES
  if (!env || env.trim() === "") return null // null = all modules
  return new Set(env.split(",").map(m => m.trim().toLowerCase()))
}

// ---------------------------------------------------------------------------
// Sanitization — sensitive key redaction
// ---------------------------------------------------------------------------

const SENSITIVE_KEYS = [
  /token/i,
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /credential/i,
  /authorization/i,
  /private[_-]?key/i,
]

function sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.some(pattern => pattern.test(key))) {
      out[key] = "[REDACTED]"
    } else if (value instanceof Error) {
      // Preserve Error message (not the full Error object)
      out[key] = { message: value.message }
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      out[key] = sanitizeData(value as Record<string, unknown>)
    } else {
      out[key] = value
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function timeString(): string {
  return new Date().toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).replace(/\//g, "-")
}

function formatMeta(data: Record<string, unknown>): string {
  const keys = Object.keys(data)
  if (keys.length === 0) return ""
  const parts: string[] = []
  for (const [k, v] of Object.entries(data)) {
    if (v instanceof Error) {
      parts.push(`${k}=${v.message}`)
    } else if (
      typeof v === "object" &&
      v !== null &&
      "message" in v &&
      Object.keys(v).length === 1
    ) {
      // Sanitized Error object: { message: string }
      parts.push(`${k}=${(v as { message: string }).message}`)
    } else if (typeof v === "object" && v !== null) {
      parts.push(`${k}=${JSON.stringify(v)}`)
    } else {
      parts.push(`${k}=${v}`)
    }
  }
  return parts.length > 0 ? " " + parts.join(" ") : ""
}

// ---------------------------------------------------------------------------
// File output
// ---------------------------------------------------------------------------

const initializedLogFiles = new Set<string>()

function ensureLogFile(logFile: string): boolean {
  const dir = dirname(logFile)
  if (!existsSync(dir)) {
    try {
      mkdirSync(dir, { recursive: true })
    } catch {
      return false
    }
  }
  return true
}

interface LoggerConfiguration {
  context?: RuntimeContext
  environment: RuntimeEnvironment
}

function writeLine(line: string, configuration: LoggerConfiguration): void {
  const logFile = getLogFile(configuration.context, configuration.environment)
  if (!logFile) return
  if (!ensureLogFile(logFile)) return
  try {
    if (!initializedLogFiles.has(logFile)) {
      initializedLogFiles.add(logFile)
      const clearOnStart = !configuration.environment.VITEST
        && getMinLevel(configuration.environment) <= LEVELS["debug"]!
      if (clearOnStart) {
        writeFileSync(logFile, line, "utf-8")
      } else {
        appendFileSync(logFile, line, "utf-8")
      }
    } else {
      appendFileSync(logFile, line, "utf-8")
    }
  } catch {
    // silently ignore write errors
  }
}

// ---------------------------------------------------------------------------
// Core log function
// ---------------------------------------------------------------------------

function shouldLog(
  levelNum: number,
  moduleName: string,
  environment: RuntimeEnvironment,
): boolean {
  if (levelNum < getMinLevel(environment)) return false
  const allowed = getAllowedModules(environment)
  if (allowed !== null && !allowed.has(moduleName)) return false
  return true
}

function log(
  level: string,
  levelNum: number,
  moduleName: string,
  configuration: LoggerConfiguration,
  ...args: [string] | [Record<string, unknown>, string]
): void {
  if (!shouldLog(levelNum, moduleName, configuration.environment)) return

  let data: Record<string, unknown>
  let msg: string

  if (args.length === 1) {
    data = {}
    msg = args[0]
  } else {
    data = args[0]
    msg = args[1]
  }

  const sanitized = sanitizeData(data)
  const meta = formatMeta(sanitized)
  const timestamp = timeString()
  const line = `${timestamp} [${level.toUpperCase()}] [${moduleName}]${meta} ${msg}\n`
  writeLine(line, configuration)
}

// ---------------------------------------------------------------------------
// LoggerInstance interface + factory
// ---------------------------------------------------------------------------

export interface LoggerInstance {
  trace(msg: string): void
  trace(data: Record<string, unknown>, msg: string): void
  debug(msg: string): void
  debug(data: Record<string, unknown>, msg: string): void
  info(msg: string): void
  info(data: Record<string, unknown>, msg: string): void
  warn(msg: string): void
  warn(data: Record<string, unknown>, msg: string): void
  error(msg: string): void
  error(data: Record<string, unknown>, msg: string): void
  fatal(msg: string): void
  fatal(data: Record<string, unknown>, msg: string): void
}

function createLogger(
  moduleName: string,
  configuration: LoggerConfiguration = { environment: process.env },
): LoggerInstance {
  return {
    trace: (...args: [string] | [Record<string, unknown>, string]) =>
      log("trace", LEVELS["trace"]!, moduleName, configuration, ...args),
    debug: (...args: [string] | [Record<string, unknown>, string]) =>
      log("debug", LEVELS["debug"]!, moduleName, configuration, ...args),
    info: (...args: [string] | [Record<string, unknown>, string]) =>
      log("info", LEVELS["info"]!, moduleName, configuration, ...args),
    warn: (...args: [string] | [Record<string, unknown>, string]) =>
      log("warn", LEVELS["warn"]!, moduleName, configuration, ...args),
    error: (...args: [string] | [Record<string, unknown>, string]) =>
      log("error", LEVELS["error"]!, moduleName, configuration, ...args),
    fatal: (...args: [string] | [Record<string, unknown>, string]) =>
      log("fatal", LEVELS["fatal"]!, moduleName, configuration, ...args),
  }
}

export interface PluginLoggers {
  core: LoggerInstance
  rules: LoggerInstance
  task: LoggerInstance
  memory: LoggerInstance
  context: LoggerInstance
  logFile: string
  logLevel: string
}

export function createPluginLoggers(
  context: RuntimeContext,
  environment: RuntimeEnvironment,
): PluginLoggers {
  const configuration = { context, environment }
  return {
    core: createLogger("core", configuration),
    rules: createLogger("rules", configuration),
    task: createLogger("task", configuration),
    memory: createLogger("memory", configuration),
    context: createLogger("context", configuration),
    logFile: getLogFile(context, environment),
    logLevel: getMinLevelName(environment),
  }
}

// ---------------------------------------------------------------------------
// Module logger singletons
// ---------------------------------------------------------------------------

export const coreLogger: LoggerInstance = createLogger("core")
export const rulesLogger: LoggerInstance = createLogger("rules")
export const taskLogger: LoggerInstance = createLogger("task")
export const memoryLogger: LoggerInstance = createLogger("memory")
export const contextLogger: LoggerInstance = createLogger("context")

// ---------------------------------------------------------------------------
// Utility — formatSessionID (migrated from debug.ts)
// ---------------------------------------------------------------------------

/**
 * Format session ID for logging: last 10 chars + (main/task) role.
 * e.g. "ffeEpC3rH1(main)", "fffeUoPDLV7(task)"
 */
export function formatSessionID(
  sessionID: string | undefined,
  isTask: boolean,
): string {
  if (!sessionID) return "unknown"
  return `${sessionID.slice(-10)}(${isTask ? "task" : "main"})`
}
