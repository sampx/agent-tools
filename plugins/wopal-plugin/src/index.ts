/**
 * OpenCode Rules Plugin
 *
 * Discovers markdown rule files and injects them into the system prompt.
 * Also provides non-blocking task delegation tools (wopal_task, wopal_task_output, wopal_task_reply).
 * Task is a perpetual dialog channel - no terminal states, only running/waiting/error.
 */

import type { PluginInput, Hooks } from "@opencode-ai/plugin";
import type { SystemPromptMetadata, OpenCodeClient } from "./types.js";
import { createOpencodeClient as createV2OpencodeClient } from "@opencode-ai/sdk/v2";
import { discoverRuleFiles, type DiscoveredRule } from "./rules/index.js";
import { createHookContext, createAllHooks } from "./hooks/index.js";
import { sessionStore } from "./session-store-instance.js";
import { createPluginLoggers, type PluginLoggers } from "./logger.js";
import { SimpleTaskManager } from "./tasks/simple-task-manager.js";
import { MonitorEngine } from "./monitor/monitor-engine.js";
import { createMainSessionMonitorStrategy } from "./monitor/main-session-monitor.js";
import { registerManagerForCleanup } from "./lifecycle/process-cleanup.js";
import { createWopalTools } from "./tools/index.js";
import { createRuntimeContext, type RuntimeContext } from "./runtime-context.js";
import { loadRuntimeEnvironment, type RuntimeEnvironment } from "./runtime-environment.js";
import { createMemoryPrompts, type MemoryPrompts } from "./memory/prompts.js";

interface MemorySystem {
  injector: import("./memory/injector.js").MemoryInjector;
  distillEngine: import("./memory/distill.js").DistillEngine;
  store: import("./memory/store.js").MemoryStore;
  embedder: import("./memory/embedder.js").EmbeddingClient;
  llm: import("./llm-client.js").LLMClient;
  prompts: MemoryPrompts;
}

export interface PluginRuntime {
  context: RuntimeContext;
  env: RuntimeEnvironment;
  loggers: PluginLoggers;
  prompts: MemoryPrompts;
}

interface RuntimePluginInput {
  directory: string;
  wopalSpaceRoot?: string;
}

export function createPluginRuntime(input: RuntimePluginInput): PluginRuntime {
  const context = createRuntimeContext({
    directory: input.directory,
    ...(process.env.WOPAL_HOME ? { wopalHome: process.env.WOPAL_HOME } : {}),
    ...(input.wopalSpaceRoot !== undefined
      ? { wopalSpaceRoot: input.wopalSpaceRoot }
      : {}),
  });
  const env = loadRuntimeEnvironment(context);
  const loggers = createPluginLoggers(context, env);
  const prompts = createMemoryPrompts(context, env, loggers.memory);
  return Object.freeze({ context, env, loggers, prompts });
}

/** Check required env vars for memory system. Returns list of missing var names. */
function diagnoseMemoryEnv(environment: RuntimeEnvironment): string[] {
  const required = [
    "WOPAL_LLM_BASE_URL",
    "WOPAL_LLM_API_KEY",
    "WOPAL_EMBEDDING_BASE_URL",
    "WOPAL_EMBEDDING_MODEL",
  ];
  return required.filter((variable) => !environment[variable]);
}

async function createMemorySystem(runtime: PluginRuntime): Promise<MemorySystem | null> {
  const missing = diagnoseMemoryEnv(runtime.env);
  if (missing.length > 0) {
    runtime.loggers.core.warn(
      `Memory system disabled: missing env vars (${missing.join(", ")}). ` +
      `Set them in $WOPAL_HOME/.env or <space>/.wopal/.env. ` +
      `Set WOPAL_MEMORY_ENABLED=false to suppress this warning.`
    );
    return null;
  }

  try {
    const { MemoryStore } = await import("./memory/store.js");
    const { EmbeddingClient } = await import("./memory/embedder.js");
    const { LLMClient } = await import("./llm-client.js");
    const { DistillEngine } = await import("./memory/distill.js");
    const { MemoryRetriever } = await import("./memory/retriever.js");
    const { MemoryInjector } = await import("./memory/injector.js");

    const store = new MemoryStore(
      undefined,
      runtime.context.wopalHome,
      runtime.loggers.memory,
    );
    await store.init();

    const embedder = new EmbeddingClient(runtime.env, runtime.loggers.memory);
    const llm = new LLMClient(runtime.env, runtime.loggers.core);
    const distillEngine = new DistillEngine(
      store,
      embedder,
      llm,
      runtime.prompts,
      runtime.loggers.memory,
    );
    const retriever = new MemoryRetriever(store, embedder, runtime.loggers.memory);
    const injector = new MemoryInjector(retriever, runtime.loggers.memory);

    runtime.loggers.memory.info(`Memory system ready (LanceDB, Embedding, LLM)`);
    return { injector, distillEngine, store, embedder, llm, prompts: runtime.prompts };
  } catch (error) {
    runtime.loggers.core.warn({ err: error instanceof Error ? error : new Error(String(error)) }, "Memory system initialization failed (non-fatal)");
    return null;
  }
}

const openCodeRulesPlugin = async (pluginInput: PluginInput): Promise<Hooks> => {
  const input = pluginInput as PluginInput & { wopalSpaceRoot?: string };
  const runtime = createPluginRuntime({
    directory: input.directory,
    ...(input.wopalSpaceRoot !== undefined
      ? { wopalSpaceRoot: input.wopalSpaceRoot }
      : {}),
  });
  const { context: runtimeCtx, env, loggers } = runtime;
  const {
    core: coreLogger,
    rules: rulesLogger,
    context: contextLogger,
  } = loggers;

  coreLogger.debug(`Loading plugin: ${input.directory}`);
  coreLogger.info({
    wopal_space: runtimeCtx.isWopalSpace,
    ...(runtimeCtx.wopalSpaceRoot ? { space_root: runtimeCtx.wopalSpaceRoot } : {}),
    wopal_home: runtimeCtx.wopalHome,
  }, "Runtime context initialized");

  const rulesInjectionEnabled = env.WOPAL_RULES_INJECTION_ENABLED !== "false";
  const memoryEnabled = env.WOPAL_MEMORY_ENABLED !== "false";
  const memoryInjectionEnabled = env.WOPAL_MEMORY_INJECTION_ENABLED !== "false";
  coreLogger.debug({
    rules_injection: rulesInjectionEnabled,
    memory: memoryEnabled,
    memory_injection: memoryInjectionEnabled,
  }, "Feature switches");

  // Rules module initialization
  let ruleFiles: DiscoveredRule[];
  if (rulesInjectionEnabled) {
    ruleFiles = await discoverRuleFiles(undefined, rulesLogger, {
      wopalHome: runtimeCtx.wopalHome,
      ...(runtimeCtx.wopalSpaceRoot
        ? { wopalSpaceRoot: runtimeCtx.wopalSpaceRoot }
        : {}),
    });
  } else {
    coreLogger.info("Rules module disabled");
    ruleFiles = [];
  }

  // Memory module initialization
  let memory: MemorySystem | null;
  if (memoryEnabled) {
    memory = await createMemorySystem(runtime);
  } else {
    coreLogger.debug("Memory module disabled");
    memory = null;
  }

  coreLogger.debug(`Tools registered: wopal_task, wopal_task_output, wopal_task_reply, memory_manage, context_manage`);

  // Extract the internal fetch from v1 client (which uses Server.Default().fetch
  // to route requests to the in-process Hono server, bypassing real HTTP).
  // We must pass it to v2 client so question.reply reaches the Question service.
  const client = pluginInput.client as unknown as { _client?: { getConfig?: () => { fetch?: typeof globalThis.fetch } } } | undefined
  const internalFetch = client?._client?.getConfig?.()?.fetch ?? globalThis.fetch;

  const v2Client = createV2OpencodeClient({
    baseUrl: pluginInput.serverUrl.toString(),
    directory: pluginInput.directory,
    fetch: internalFetch,
  });

  const taskManager = new SimpleTaskManager(
    pluginInput.client as unknown as OpenCodeClient,
    v2Client as unknown as OpenCodeClient,
    pluginInput.directory,
    pluginInput.serverUrl,
    sessionStore,
    loggers.task,
  );

  // Create MonitorEngine and register strategies
  const monitorEngine = new MonitorEngine({
    strategies: [
      taskManager.createMonitorStrategy(),
      createMainSessionMonitorStrategy({
        sessionStore,
        client: pluginInput.client as unknown as OpenCodeClient,
        directory: pluginInput.directory,
        taskManager,
        logger: contextLogger,
      }),
    ],
    logger: coreLogger,
  });
  monitorEngine.start();

  // Register monitor engine for process cleanup
  registerManagerForCleanup(monitorEngine);

  const systemSnapshots = new Map<string, string[]>();
  const systemMetadataMap = new Map<string, SystemPromptMetadata>();
  const systemInjectionsMap = new Map<string, string[]>();

  const ctx = createHookContext({
    client: input.client as OpenCodeClient,
    directory: input.directory,
    projectDirectory: input.directory,
    ruleFiles,
    sessionStore,
    coreLogger: coreLogger,
    rulesLogger: loggers.rules,
    taskLogger: loggers.task,
    memoryLogger: loggers.memory,
    contextLogger: loggers.context,
    taskManager,
    memoryInjector: memory?.injector,
    systemSnapshots,
    systemMetadataMap,
    systemInjectionsMap,
    rulesInjectionEnabled,
    memoryInjectionEnabled,
    ...(memory
      ? {
          generateSessionTitle: async (summary: string) =>
            memory.llm.completeJson(
              memory.prompts.loadTitlePrompt().replace("{{summary}}", summary),
            ),
        }
      : {}),
  });

  const { hooks: hookHandlers, transformedMessagesMap } = createAllHooks(ctx);

  const tools = createWopalTools(taskManager, memory?.store, memory?.embedder, sessionStore, memory?.distillEngine, pluginInput.client);

  // context_manage is session/context management — independent of memory system
  const { createContextManageTool } = await import("./tools/context-manage.js");
  tools.context_manage = createContextManageTool(
    pluginInput.client as unknown as OpenCodeClient,
    systemSnapshots,
    systemMetadataMap,
    systemInjectionsMap,
    transformedMessagesMap,
    pluginInput.directory,
    sessionStore,
    taskManager,
  );

  coreLogger.debug({ log_file: loggers.logFile, log_level: loggers.logLevel }, "Logger config");
  coreLogger.info({ tools: Object.keys(tools).join(", "), memory: !!memory }, "Plugin initialized");

  return {
    ...hookHandlers,
    tool: tools,
  };
};

export default {
  id: "wopal-wopal-plugin",
  server: openCodeRulesPlugin,
};
