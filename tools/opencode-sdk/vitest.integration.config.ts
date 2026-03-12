import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/integration/**/*.test.ts'],
        exclude: ['node_modules', 'dist'],
        // 集成测试超时设长一些
        testTimeout: 15000,
        hookTimeout: 10000,
    },
});
