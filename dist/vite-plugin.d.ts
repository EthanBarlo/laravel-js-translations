import { Plugin } from 'vite';

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

interface LaravelTranslationsOptions {
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
 * Vite plugin for Laravel JS Translations.
 *
 * Features:
 * - Exports translations on dev server start
 * - Watches lang directory for changes and re-exports (using chokidar for cross-platform support)
 * - Exports translations before production build
 * - Provides virtual module for auto-initialization
 */
declare function laravelTranslations(userOptions?: LaravelTranslationsOptions): Plugin;

export { type LaravelTranslationsOptions, laravelTranslations as default, laravelTranslations };
