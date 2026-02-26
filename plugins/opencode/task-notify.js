export const TaskNotifyPlugin = async ({ $ }) => {
    return {
        event: async ({ event }) => {
            // 只监听 session.idle 事件
            if (event.type === "session.idle") {
                // 使用 Bun 的 spawn 或 fetch 等非阻塞方式更好，但 $ 也是可以的
                // 关键是不要 await 它的结果，让它后台跑，或者用 catch 捕获防止崩溃
                // 使用 (async () => { ... })() 包裹来"fire and forget"
                (async () => {
                    try {
                        // 使用 Glass 音效，这是一个短促的声音
                        await $`afplay /System/Library/Sounds/Glass.aiff`
                    } catch (e) {
                        // 即使失败也不要崩溃
                    }
                })();
            }
        },
    }
}
