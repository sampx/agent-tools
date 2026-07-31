/**
 * Prompt Loading
 *
 * Loads prompt templates via 4-layer cascading:
 * 1. Env var override (absolute/~/relative path)
 * 2. Space-level: <workspace>/.wopal/prompts/<filename>
 * 3. User-level: WOPAL_HOME/prompts/<filename>
 * 4. Inline fallback (caller provides)
 *
 * Env vars WOPAL_DISTILL_PROMPT_FILE / WOPAL_DEDUP_PROMPT_FILE / WOPAL_TITLE_PROMPT_FILE
 * override file paths with higher priority.
 */

import { join } from "path";
import { existsSync, readFileSync } from "fs";
import type { MemoryCategory } from "./types.js";
import { memoryLogger, type LoggerInstance } from "../logger.js";
import { createRuntimeContext, type RuntimeContext } from "../runtime-context.js";
import type { RuntimeEnvironment } from "../runtime-environment.js";

/**
 * Resolve prompt file path from environment variable.
 *
 * Supports:
 * - Absolute path: /path/to/file.md
 * - Home directory: ~/path/to/file.md
 * - Relative path: path/to/file.md (relative to cwd)
 */
function resolveEnvFilePath(
  environment: RuntimeEnvironment,
  directory: string,
  envVar: string,
): string | null {
  const envPath = environment[envVar];
  if (!envPath) return null;

  if (envPath.startsWith("/")) {
    return envPath;
  }

  if (envPath.startsWith("~/")) {
    return join(environment.HOME ?? process.env.HOME ?? "", envPath.slice(2));
  }

  return join(directory, envPath);
}

/**
 * Resolve a prompt template file via 4-layer cascading.
 * Returns the file path if found, null otherwise (caller falls back to inline default).
 *
 * Layers:
 * 1. Env var override — resolved via resolveEnvFilePath
 * 2. Space-level — .wopal/prompts/<filename> (if running inside a wopal-space)
 * 3. User-level — WOPAL_HOME/prompts/<filename>
 * 4. null — caller uses inline default
 */
function resolveRuntimePromptFile(
  context: RuntimeContext,
  environment: RuntimeEnvironment,
  envVar: string,
  filename: string,
): string | null {
  const envPath = resolveEnvFilePath(environment, context.directory, envVar);
  if (envPath && existsSync(envPath)) {
    return envPath;
  }

  if (context.wopalSpaceRoot) {
    const spacePath = join(context.wopalSpaceRoot, ".wopal", "prompts", filename);
    if (existsSync(spacePath)) {
      return spacePath;
    }
  }

  const userPath = join(context.wopalHome, "prompts", filename);
  if (existsSync(userPath)) {
    return userPath;
  }

  return null;
}

/**
 * Load a prompt file: env var override → space-level → user-level → null.
 * Returns null if no source is available (caller uses inline default).
 */
function loadPromptFile(
  context: RuntimeContext,
  environment: RuntimeEnvironment,
  logger: LoggerInstance,
  envVar: string,
  filename: string,
): string | null {
  const filePath = resolveRuntimePromptFile(context, environment, envVar, filename);
  if (!filePath) return null;

  try {
    logger.debug(`Loaded prompt from: ${filePath}`);
    return readFileSync(filePath, "utf-8");
  } catch (error) {
    logger.warn({ err: error }, `Failed to load prompt from ${filePath}`);
    return null;
  }
}

export interface MemoryPrompts {
  resolvePromptFile(envVar: string, filename: string): string | null;
  loadTitlePrompt(): string;
  buildExtractionPrompt(conversation: string): string;
  buildBatchDedupPrompt(
    candidates: Array<{ index: number; category: string; body: string }>,
    existingByCandidate: Map<number, Array<{ index: number; body: string; id: string }>>,
  ): string;
}

const TITLE_FALLBACK = "You are a title generator. Output ONLY valid JSON: {\"title\":\"Brief natural thread title\"}. The title must be a single line, ≤50 characters, and use the same language as the summary. Never output labels like Thread Title or Title as the title value.\n\n---\nConversation summary:\n{{summary}}";
const EXTRACTION_FALLBACK = "# Memory Extraction\n\nAnalyze the conversation below and extract memories worth preserving for future sessions.\n\n## Recent Conversation\n{{conversation}}\n\n## Output Format\n\nReturn a JSON object:\n{\"memories\": [{\"category\": \"knowledge\", \"body\": \"Title\\n\\nCore content...\", \"tags\": [\"tag\"]}]}\n\nIf nothing to extract, return {\"memories\": []}";
const DEDUP_FALLBACK = "You are a memory deduplicator. For each candidate, compare with similar existing memories and decide: create (unrelated, coexist), skip (discard), merge (supplement), or replace (outdated).\n\nInput:\n{{input}}\n\nOutput JSON:\n{\"decisions\": [{\"index\": 1, \"action\": \"create\"}, {\"index\": 2, \"action\": \"skip\"}, {\"index\": 3, \"action\": \"merge\", \"merge_into\": 1, \"merged_body\": \"...\", \"tags\": [\"tag\"]}]}";

export function createMemoryPrompts(
  context: RuntimeContext,
  environment: RuntimeEnvironment,
  logger: LoggerInstance = memoryLogger,
): MemoryPrompts {
  const load = (envVar: string, filename: string) =>
    loadPromptFile(context, environment, logger, envVar, filename);
  return {
    resolvePromptFile: (envVar, filename) =>
      resolveRuntimePromptFile(context, environment, envVar, filename),
    loadTitlePrompt: () => load("WOPAL_TITLE_PROMPT_FILE", "title.md") ?? TITLE_FALLBACK,
    buildExtractionPrompt: (conversation) =>
      (load("WOPAL_DISTILL_PROMPT_FILE", "distill.md") ?? EXTRACTION_FALLBACK)
        .replace("{{conversation}}", conversation),
    buildBatchDedupPrompt: (candidates, existingByCandidate) => {
      const candidatesWithExisting = candidates.filter(
        (candidate) => (existingByCandidate.get(candidate.index)?.length ?? 0) > 0,
      );
      const input = candidatesWithExisting.map((candidate) => ({
        candidate: {
          index: candidate.index,
          category: candidate.category,
          body: candidate.body,
        },
        similar_existing: existingByCandidate.get(candidate.index)!.map((existing) => ({
          index: existing.index,
          body: existing.body,
        })),
      }));
      return (load("WOPAL_DEDUP_PROMPT_FILE", "dedup.md") ?? DEDUP_FALLBACK)
        .replace("{{input}}", JSON.stringify(input, null, 2));
    },
  };
}

function defaultPrompts(): MemoryPrompts {
  const context = createRuntimeContext({
    directory: process.cwd(),
    ...(process.env.WOPAL_HOME ? { wopalHome: process.env.WOPAL_HOME } : {}),
  });
  return createMemoryPrompts(context, process.env);
}

export function resolvePromptFile(envVar: string, filename: string): string | null {
  return defaultPrompts().resolvePromptFile(envVar, filename);
}

export function loadTitlePrompt(): string {
  return defaultPrompts().loadTitlePrompt();
}

/** Extracted memory from LLM (single-layer body) */
export interface ExtractResult {
  memories: Array<{
    category: MemoryCategory;
    body: string;
    tags: string[];
  }>;
  title?: string;
}

/**
 * Load extraction prompt template.
 */
export function buildExtractionPrompt(conversation: string): string {
  return defaultPrompts().buildExtractionPrompt(conversation);
}

/**
 * Build deduplication prompt — single LLM call for decision + merge content.
 */
export function buildBatchDedupPrompt(
  candidates: Array<{ index: number; category: string; body: string }>,
  existingByCandidate: Map<number, Array<{ index: number; body: string; id: string }>>
): string {
  return defaultPrompts().buildBatchDedupPrompt(candidates, existingByCandidate);
}
