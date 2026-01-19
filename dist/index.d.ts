/**
 * Translation Manager
 *
 * Centralized translation management for JavaScript applications.
 * Automatically loads translations based on the document's lang attribute
 * and watches for language changes via MutationObserver.
 */
type TranslationData = Record<string, string>;
type TranslationObserver = (translations: TranslationData) => void;
/**
 * Public interface for the TranslationManager.
 * This is the type exposed to consumers.
 */
interface ITranslationManager {
    init(defaultTranslations: TranslationData, defaultLocale?: string): void;
    ready(): Promise<void>;
    subscribe(callback: TranslationObserver): () => void;
    getTranslations(): TranslationData;
    get(key: string): string | undefined;
    has(key: string): boolean;
    getCurrentLocale(): string;
    getDefaultLocale(): string;
    setLocale(locale: string): Promise<void>;
}
declare const translationManager: ITranslationManager;

type ReplacementValues = Record<string, string | number | null | undefined>;
/**
 * Choose the correct plural form based on count.
 */
declare function choosePluralForm(translationString: string, count: number): string;
/**
 * Apply replacements to a translation string.
 *
 * Supports Laravel-style replacements:
 * - :name → lowercase
 * - :Name → ucfirst
 * - :NAME → uppercase
 */
declare function applyReplacements(template: string, replacements?: ReplacementValues): string;

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

/**
 * Initialize translations with default locale data.
 * This is called automatically by the Vite plugin.
 */
declare function initTranslations(defaultTranslations: TranslationData, defaultLocale?: string): void;
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
declare const translationsReady: Promise<void>;
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
declare function __(key: string, replacements?: ReplacementValues): string;
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
declare function trans_choice(key: string, count: number, replacements?: ReplacementValues): string;
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
declare function getTranslationManager(): ITranslationManager;
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
declare function onTranslationsChange(callback: TranslationObserver): () => void;
/**
 * Get the current locale.
 */
declare function getLocale(): string;
/**
 * Check if a translation key exists.
 */
declare function hasTranslation(key: string): boolean;

export { type ITranslationManager, type ReplacementValues, type TranslationData, type TranslationObserver, __, applyReplacements, choosePluralForm, getLocale, getTranslationManager, hasTranslation, initTranslations, onTranslationsChange, trans_choice, translationManager, translationsReady };
