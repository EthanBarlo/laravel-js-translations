/**
 * Translation Manager
 *
 * Centralized translation system for Alpine.js and React components.
 * Automatically loads translations based on the document's lang attribute
 * and watches for language changes.
 *
 * Usage:
 * ```ts
 * import { __, trans_choice } from '@translations';
 *
 * // In Alpine components
 * const label = __('common.status.active');
 * const text = __('actions.create_item', { item: 'Document' });
 * ```
 */

import enTranslations from './generated/en.json';
import { choosePluralForm, applyReplacements, type ReplacementValues } from './utils';

/**
 * Load translation JSON files using Vite's import.meta.glob with lazy loading
 * This loads locale JSON files asynchronously when needed
 */
const translationModules = import.meta.glob<Record<string, string>>(
    '/resources/js/translations/generated/*.json',
    { eager: false }
);

/**
 * Load a translation module for a specific locale asynchronously
 */
const loadLocale = async (locale: string): Promise<Record<string, string>> => {
    if (!locale) {
        return {};
    }

    const modulePath = `/resources/js/translations/generated/${locale}.json`;
    const modLoader = translationModules[modulePath];

    if (!modLoader) {
        if (import.meta.env.DEV) {
            console.warn(`Translation file not found for locale: ${locale}`);
        }
        return {};
    }

    // With lazy loading, translationModules contains functions that return promises
    const mod = await modLoader();

    // JSON modules are imported directly, not as default exports
    return (mod.default || mod) as Record<string, string>;
};

/**
 * Get the current locale from the document's lang attribute
 */
const getCurrentLocale = (): string => {
    const lang = document.documentElement.getAttribute('lang');
    if (!lang) {
        return 'en';
    }
    // Convert locale format (e.g., 'en-US' -> 'en', 'es-ES' -> 'es')
    return lang.split('-')[0];
};

/**
 * Translation state management
 */
class TranslationManager {
    private currentLocale: string;
    private translations: Record<string, string>;
    private loadingPromise: Promise<void> | null;
    private observers: Array<(translations: Record<string, string>) => void>;

    constructor() {
        this.currentLocale = getCurrentLocale();
        this.translations = enTranslations;
        this.loadingPromise = null;
        this.observers = [];
        this.init();
    }

    private init(): void {
        // Watch for changes to the document's lang attribute
        const observer = new MutationObserver(() => {
            const newLocale = getCurrentLocale();
            if (newLocale !== this.currentLocale) {
                this.currentLocale = newLocale;
                this.loadTranslations();
            }
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['lang'],
        });

        // Load initial translations if not English
        // Note: This is async, but we start it immediately
        // Components should wait for ready() promise if they need translations immediately
        if (this.currentLocale !== 'en') {
            this.loadTranslations();
        }
    }

    /**
     * Get a promise that resolves when translations are ready
     * Useful for ensuring translations are loaded before use
     */
    async ready(): Promise<void> {
        // If we're loading translations, wait for them
        if (this.loadingPromise) {
            await this.loadingPromise;
            return;
        }
        
        // If locale is not English, ensure translations are loaded
        // (This handles the case where ready() is called before init() completes)
        if (this.currentLocale !== 'en') {
            await this.loadTranslations();
        }
    }

    private async loadTranslations(): Promise<void> {
        // If current locale is English or not set, use English only
        if (!this.currentLocale || this.currentLocale === 'en') {
            this.translations = enTranslations;
            this.notifyObservers();
            return;
        }

        // Prevent multiple simultaneous loads
        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        this.loadingPromise = loadLocale(this.currentLocale)
            .then((localeData) => {
                this.translations = { ...enTranslations, ...localeData };
                this.notifyObservers();
            })
            .catch((error) => {
                if (import.meta.env.DEV) {
                    console.error(
                        `Failed to load translations for locale "${this.currentLocale}":`,
                        error,
                    );
                }
                // Fallback to English on error
                this.translations = enTranslations;
                this.notifyObservers();
            })
            .finally(() => {
                this.loadingPromise = null;
            });

        return this.loadingPromise;
    }

    /**
     * Subscribe to translation updates
     */
    subscribe(callback: (translations: Record<string, string>) => void): () => void {
        this.observers.push(callback);
        // Immediately call with current translations
        callback(this.translations);
        // Return unsubscribe function
        return () => {
            this.observers = this.observers.filter((obs) => obs !== callback);
        };
    }

    private notifyObservers(): void {
        this.observers.forEach((callback) => callback(this.translations));
    }

    /**
     * Get current translations synchronously
     */
    getTranslations(): Record<string, string> {
        return this.translations;
    }

    /**
     * Get current locale
     */
    getCurrentLocale(): string {
        return this.currentLocale;
    }
}

// Create singleton instance (auto-initializes on import)
const translationManager = new TranslationManager();

// Export a promise that resolves when initial translations are loaded
// This ensures translations are ready before components use them
export const translationsReady = (async () => {
    // Small delay to ensure init() has completed and loadTranslations() has been called
    await Promise.resolve();
    await translationManager.ready();
})();

/**
 * Translate a key with optional replacements
 * @param key - Translation key (e.g., 'common.status.compliant')
 * @param replacements - Optional replacements for placeholders
 * @returns Translated string
 */
export function __(key: string, replacements: ReplacementValues = {}): string {
    const translations = translationManager.getTranslations();
    const translation = translations[key];

    if (!translation) {
        // In development, warn about missing translations
        if (import.meta.env.DEV) {
            console.warn(
                `Translation key "${key}" not found for locale "${translationManager.getCurrentLocale()}"`,
            );
        }
        return key; // Return the key as fallback (Laravel behavior)
    }

    return applyReplacements(translation, replacements);
}

/**
 * Translate a key with pluralization support
 * @param key - Translation key
 * @param count - Count for pluralization
 * @param replacements - Optional replacements for placeholders
 * @returns Translated string with correct plural form
 */
export function trans_choice(
    key: string,
    count: number,
    replacements: ReplacementValues = {},
): string {
    const translations = translationManager.getTranslations();
    const translation = translations[key];

    if (!translation) {
        // In development, warn about missing translations
        if (import.meta.env.DEV) {
            console.warn(
                `Translation key "${key}" not found for locale "${translationManager.getCurrentLocale()}"`,
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
 * Get the translation manager instance (for advanced usage)
 */
export function getTranslationManager(): TranslationManager {
    return translationManager;
}

