# wopal-plugin

Wopal's Ellamaka runtime plugin provides rule injection, task delegation, memory management, and context recovery.

## Runtime ownership

Ellamaka supplies an optional `PluginInput.wopalSpaceRoot` for each plugin invocation. The plugin creates an immutable runtime context and effective environment inside `server(input)`. Multiple spaces can therefore run in one process without sharing a current-space singleton.

Environment priority is process startup values, then `<wopalSpaceRoot>/.wopal/.env`, then `$WOPAL_HOME/.env`. Loading returns a read-only environment and leaves `process.env` unchanged.

| Resource | Global invocation | WopalSpace invocation |
|----------|-------------------|-----------------------|
| Rules | `$WOPAL_HOME/rules` | Global rules plus `<wopalSpaceRoot>/.wopal/rules` |
| Log | `$WOPAL_HOME/logs/wopal-plugin.log` | `<wopalSpaceRoot>/.wopal-space/logs/wopal-plugin.log` |
| Prompts | `$WOPAL_HOME/prompts` | Space prompts, then global prompts |
| Memory database | `$WOPAL_HOME/storage/memory` | `$WOPAL_HOME/storage/memory` |
| Session context | `$WOPAL_HOME/storage/session_context` | `$WOPAL_HOME/storage/session_context` |

## Development

```bash
bun install
bun run typecheck
bun run test:run
bun run build
```
