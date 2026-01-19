/**
 * Laravel JS Translations
 *
 * Centralized translation system for JavaScript applications.
 * Automatically loads translations based on the document's lang attribute
 * and watches for language changes.
 *
 * @example
 * ```ts
 * import { __, trans_choice } from '@translations';
 *
 * const greeting = __('messages.hello', { name: 'World' });
 * const items = trans_choice('items.count', 5);
 * ```
 */

import { translationManager, type TranslationData, type TranslationObserver, type ITranslationManager } from './manager';
import { applyReplacements, choosePluralForm, type ReplacementValues } from './utils';

// Re-export types
export type { TranslationData, TranslationObserver, ReplacementValues, ITranslationManager };

// Re-export utilities for advanced usage
export { applyReplacements, choosePluralForm } from './utils';
export { translationManager } from './manager';

/**
 * Initialize translations with default locale data.
 * This is called automatically by the Vite plugin.
 */
export function initTranslations(defaultTranslations: TranslationData, defaultLocale?: string): void {
    translationManager.init(defaultTranslations, defaultLocale);
}

/**
 * Promise that resolves when initial translations are loaded.
 * Use this to ensure translations are ready before rendering.
 *
 * @example
 * ```ts
 * await translationsReady;
 * console.log(__('messages.welcome'));
 * ```
 */
export const translationsReady: Promise<void> = (async () => {
    // Small delay to ensure init() has completed
    await Promise.resolve();
    await translationManager.ready();
})();

/**
 * Translate a key with optional replacements.
 *
 * @param key - Translation key (e.g., 'common.status.active')
 * @param replacements - Optional replacements for placeholders
 * @returns Translated string
 *
 * @example
 * ```ts
 * // Basic translation
 * __('auth.failed');
 *
 * // With replacements
 * __('welcome.greeting', { name: 'John' });
 *
 * // Case transformations
 * // :name → lowercase, :Name → ucfirst, :NAME → uppercase
 * __('hello', { name: 'world' }); // "Hello world"
 * __('hello', { Name: 'world' }); // "Hello World"
 * ```
 */
export function __(key: string, replacements: ReplacementValues = {}): string {
    const translation = translationManager.get(key);

    if (!translation) {
        // In development, warn about missing translations
        if (import.meta.env.DEV) {
            console.warn(
                `[js-translations] Translation key "${key}" not found for locale "${translationManager.getCurrentLocale()}"`
            );
        }
        return key; // Return the key as fallback (Laravel behavior)
    }

    return applyReplacements(translation, replacements);
}

/**
 * Translate a key with pluralization support.
 *
 * @param key - Translation key
 * @param count - Count for pluralization
 * @param replacements - Optional replacements for placeholders
 * @returns Translated string with correct plural form
 *
 * @example
 * ```ts
 * // Simple pluralization: "item|items"
 * trans_choice('items.count', 1); // "item"
 * trans_choice('items.count', 5); // "items"
 *
 * // Complex pluralization: "{0} No items|{1} :count item|[2,*] :count items"
 * trans_choice('items.label', 0); // "No items"
 * trans_choice('items.label', 1); // "1 item"
 * trans_choice('items.label', 5); // "5 items"
 * ```
 */
export function trans_choice(
    key: string,
    count: number,
    replacements: ReplacementValues = {}
): string {
    const translation = translationManager.get(key);

    if (!translation) {
        // In development, warn about missing translations
        if (import.meta.env.DEV) {
            console.warn(
                `[js-translations] Translation key "${key}" not found for locale "${translationManager.getCurrentLocale()}"`
            );
        }
        return key; // Return the key as fallback
    }

    // Add count to replacements by default
    const replacementsWithCount = { ...replacements, count };

    // Choose the correct plural form
    const chosenForm = choosePluralForm(translation, count);

    return applyReplacements(chosenForm, replacementsWithCount);
}

/**
 * Get the translation manager instance for advanced usage.
 *
 * @example
 * ```ts
 * const manager = getTranslationManager();
 *
 * // Subscribe to translation changes
 * manager.subscribe((translations) => {
 *     console.log('Translations updated:', translations);
 * });
 *
 * // Get current locale
 * console.log(manager.getCurrentLocale());
 * ```
 */
export function getTranslationManager(): ITranslationManager {
    return translationManager;
}

/**
 * Subscribe to translation changes.
 * Useful for reactive frameworks that need to update when translations change.
 *
 * @param callback - Function called when translations change
 * @returns Unsubscribe function
 *
 * @example
 * ```ts
 * const unsubscribe = onTranslationsChange((translations) => {
 *     // Re-render component
 * });
 *
 * // Later: cleanup
 * unsubscribe();
 * ```
 */
export function onTranslationsChange(callback: TranslationObserver): () => void {
    return translationManager.subscribe(callback);
}

/**
 * Get the current locale.
 */
export function getLocale(): string {
    return translationManager.getCurrentLocale();
}

/**
 * Check if a translation key exists.
 */
export function hasTranslation(key: string): boolean {
    return translationManager.has(key);
}
