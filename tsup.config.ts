import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        index: 'resources/js/index.ts',
        'vite-plugin': 'resources/js/vite-plugin.ts',
    },
    format: ['esm'],
    dts: true,
    clean: true,
    external: ['vite'],
    outDir: 'dist',
    splitting: false,
    sourcemap: false,
    minify: false,
});
