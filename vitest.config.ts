import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['resources/js/__tests__/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['resources/js/**/*.ts'],
            exclude: [
                'resources/js/__tests__/**',
                'resources/js/env.d.ts',
            ],
        },
    },
    resolve: {
        alias: {
            '@': '/resources/js',
        },
    },
});
