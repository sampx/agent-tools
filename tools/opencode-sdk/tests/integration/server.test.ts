/**
 * OpenCode Server 集成测试
 * 测试目标: http://127.0.0.1:20000
 *
 * 运行前提: OpenCode 服务器必须正在运行
 * 运行方式: pnpm test:integration
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createOpencodeClient, OpencodeClient } from '@opencode-ai/sdk';

const SERVER = 'http://127.0.0.1:20000';

let c: OpencodeClient;

beforeAll(() => {
    c = createOpencodeClient({ baseUrl: SERVER });
});

describe(`OpenCode Server 集成测试 (${SERVER})`, () => {
    describe('健康检查', () => {
        it('GET /global/health — 服务器应健康响应', async () => {
            const res = await fetch(`${SERVER}/global/health`);
            expect(res.ok).toBe(true);
            const data = await res.json();
            expect(data).toBeDefined();
            expect(data.healthy).toBe(true);
        });
    });

    describe('全局配置', () => {
        it('GET /config — 应返回全局配置对象', async () => {
            const res = await c.config.get();
            expect(res.response.status).toBe(200);
            expect(res.data).toBeDefined();
        });
    });

    describe('提供商', () => {
        it('GET /provider — 应返回提供商列表（数组）', async () => {
            const res = await c.provider.list();
            expect(res.response.status).toBe(200);
            expect(res.data).toBeDefined();
        });
    });

    describe('项目', () => {
        it('GET /project/current — 应返回当前项目信息', async () => {
            const res = await c.project.current({ query: { directory: process.cwd() } });
            expect(res.response.status).toBe(200);
            expect(res.data).toBeDefined();
            expect(typeof (res.data as any).id).toBe('string');
        });
    });

    describe('会话', () => {
        it('GET /session — 应返回会话列表（数组）', async () => {
            const res = await c.session.list({});
            expect(res.response.status).toBe(200);
            expect(Array.isArray(res.data)).toBe(true);
        });
    });
});
