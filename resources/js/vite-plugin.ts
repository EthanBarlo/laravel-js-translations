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
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import type { Plugin, ViteDevServer, ResolvedConfig } from 'vite';

const VIRTUAL_MODULE_ID = 'virtual:laravel-translations';
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID;

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
 * Escape special characters for use in a regular expression.
 */
function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
 * - Watches lang directory for changes and re-exports (using chokidar for cross-platform support)
 * - Exports translations before production build
 * - Provides virtual module for auto-initialization
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
    let config: ResolvedConfig;

    return {
        name: 'laravel-js-translations',
        enforce: 'pre',

        configResolved(resolvedConfig) {
            root = resolvedConfig.root;
            config = resolvedConfig;
        },

        /**
         * Resolve the virtual module ID.
         */
        resolveId(id) {
            if (id === VIRTUAL_MODULE_ID) {
                return RESOLVED_VIRTUAL_MODULE_ID;
            }
        },

        /**
         * Load the virtual module with auto-initialization.
         */
        load(id) {
            if (id === RESOLVED_VIRTUAL_MODULE_ID) {
                // Generate the virtual module that auto-initializes translations
                // Use absolute path from root for the import
                const outputPathFromRoot = '/' + options.outputPath;

                return `
// Auto-generated virtual module for Laravel JS Translations
import defaultTranslations from '${outputPathFromRoot}/${options.defaultLocale}.json';
import { initTranslations } from 'laravel-js-translations';

// Auto-initialize with default translations
initTranslations(defaultTranslations, '${options.defaultLocale}');

// Re-export everything from the main module
export * from 'laravel-js-translations';
`;
            }
        },

        /**
         * Transform manager.ts to use the configured output path.
         */
        transform(code, id) {
            // Transform the hardcoded output path in the manager module
            if (id.includes('/manager.') && (id.endsWith('.ts') || id.endsWith('.js'))) {
                const defaultPath = '/resources/js/translations/generated';
                const configuredPath = '/' + options.outputPath;

                if (code.includes(defaultPath) && defaultPath !== configuredPath) {
                    return code.replace(new RegExp(escapeRegExp(defaultPath), 'g'), configuredPath);
                }
            }
            return null;
        },

        /**
         * Export translations when the dev server starts.
         */
        configureServer(server: ViteDevServer) {
            // Export translations on server start
            exportTranslations(options, root);

            // Watch lang directory for changes using Vite's watcher (chokidar-based)
            // This is more reliable across platforms than fs.watch
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

                    // Use Vite's built-in watcher which is chokidar-based and works reliably on Linux
                    server.watcher.add(langPath);
                    server.watcher.on('change', (filePath) => {
                        if (filePath.startsWith(langPath) && (filePath.endsWith('.php') || filePath.endsWith('.json'))) {
                            debouncedExport();
                        }
                    });
                    server.watcher.on('add', (filePath) => {
                        if (filePath.startsWith(langPath) && (filePath.endsWith('.php') || filePath.endsWith('.json'))) {
                            debouncedExport();
                        }
                    });
                    server.watcher.on('unlink', (filePath) => {
                        if (filePath.startsWith(langPath) && (filePath.endsWith('.php') || filePath.endsWith('.json'))) {
                            debouncedExport();
                        }
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
    };
}

export default laravelTranslations;
