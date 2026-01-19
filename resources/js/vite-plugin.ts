/**
 * Laravel JS Translations Vite Plugin
 *
 * Automatically exports Laravel translations to JSON and watches for changes.
 *
 * @example
 * ```ts
 * // vite.config.js
 * import { laravelTranslations } from './vendor/ethanbarlo/laravel-js-translations/dist/vite-plugin.js';
 *
 * export default defineConfig({
 *   plugins: [
 *     laravelTranslations(),
 *     laravel({ ... }),
 *   ],
 * });
 * ```
 */

import { execSync } from 'node:child_process';
import { existsSync, watch, type FSWatcher, type WatchEventType } from 'node:fs';
import { resolve, join } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';

export interface LaravelTranslationsOptions {
    /**
     * Path to the Laravel lang directory.
     * @default 'lang'
     */
    langPath?: string;

    /**
     * Output path for generated JSON files.
     * @default 'resources/js/translations/generated'
     */
    outputPath?: string;

    /**
     * Default locale to bundle eagerly.
     * @default 'en'
     */
    defaultLocale?: string;

    /**
     * Path to PHP binary.
     * @default 'php'
     */
    php?: string;

    /**
     * Whether to watch for changes in development mode.
     * @default true
     */
    watch?: boolean;
}

/**
 * Run the translations:export Artisan command.
 */
function exportTranslations(options: Required<LaravelTranslationsOptions>, root: string): void {
    const artisanPath = resolve(root, 'artisan');

    if (!existsSync(artisanPath)) {
        console.warn('[js-translations] artisan file not found, skipping export');
        return;
    }

    try {
        const command = `${options.php} artisan translations:export --path="${options.outputPath}"`;
        execSync(command, {
            cwd: root,
            stdio: 'inherit',
        });
    } catch (error) {
        console.error('[js-translations] Failed to export translations:', error);
    }
}

/**
 * Create a debounced function that only executes after a delay.
 */
function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return ((...args: unknown[]) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            fn(...args);
            timeoutId = null;
        }, delay);
    }) as T;
}

/**
 * Vite plugin for Laravel JS Translations.
 *
 * Features:
 * - Exports translations on dev server start
 * - Watches lang directory for changes and re-exports
 * - Exports translations before production build
 */
export function laravelTranslations(userOptions: LaravelTranslationsOptions = {}): Plugin {
    const options: Required<LaravelTranslationsOptions> = {
        langPath: userOptions.langPath ?? 'lang',
        outputPath: userOptions.outputPath ?? 'resources/js/translations/generated',
        defaultLocale: userOptions.defaultLocale ?? 'en',
        php: userOptions.php ?? 'php',
        watch: userOptions.watch ?? true,
    };

    let root: string;
    let watcher: FSWatcher | null = null;

    return {
        name: 'laravel-js-translations',
        enforce: 'pre',

        configResolved(config) {
            root = config.root;
        },

        /**
         * Export translations when the dev server starts.
         */
        configureServer(server: ViteDevServer) {
            // Export translations on server start
            exportTranslations(options, root);

            // Watch lang directory for changes
            if (options.watch) {
                const langPath = resolve(root, options.langPath);

                if (existsSync(langPath)) {
                    const debouncedExport = debounce(() => {
                        console.log('[js-translations] Detected changes in lang directory, re-exporting...');
                        exportTranslations(options, root);

                        // Trigger HMR for translation files
                        const outputPath = resolve(root, options.outputPath);
                        server.watcher.emit('change', join(outputPath, `${options.defaultLocale}.json`));
                    }, 300);

                    watcher = watch(
                        langPath,
                        { recursive: true },
                        (eventType: WatchEventType, filename: string | null) => {
                            if (filename && (filename.endsWith('.php') || filename.endsWith('.json'))) {
                                debouncedExport();
                            }
                        }
                    );

                    // Clean up watcher on server close
                    server.httpServer?.on('close', () => {
                        watcher?.close();
                    });
                }
            }
        },

        /**
         * Export translations before production build.
         */
        buildStart() {
            exportTranslations(options, root);
        },

        /**
         * Clean up watcher on build end.
         */
        buildEnd() {
            watcher?.close();
            watcher = null;
        },
    };
}

export default laravelTranslations;
