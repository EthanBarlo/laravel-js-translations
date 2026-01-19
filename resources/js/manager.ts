/**
 * Translation Manager
 *
 * Centralized translation management for JavaScript applications.
 * Automatically loads translations based on the document's lang attribute
 * and watches for language changes via MutationObserver.
 */

export type TranslationData = Record<string, string>;
export type TranslationObserver = (translations: TranslationData) => void;

/**
 * Public interface for the TranslationManager.
 * This is the type exposed to consumers.
 */
export interface ITranslationManager {
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

/**
 * Load translation JSON files using Vite's import.meta.glob with lazy loading.
 * The actual glob pattern is injected during build/runtime.
 */
const translationModules = import.meta.glob<TranslationData>(
    '/resources/js/translations/generated/*.json',
    { eager: false }
);

/**
 * Load a translation module for a specific locale asynchronously.
 */
const loadLocale = async (locale: string): Promise<TranslationData> => {
    if (!locale) {
        return {};
    }

    const modulePath = `/resources/js/translations/generated/${locale}.json`;
    const modLoader = translationModules[modulePath];

    if (!modLoader) {
        if (import.meta.env.DEV) {
            console.warn(`[js-translations] Translation file not found for locale: ${locale}`);
        }
        return {};
    }

    // With lazy loading, translationModules contains functions that return promises
    const mod = await modLoader();

    // JSON modules are imported directly, not as default exports
    return (mod.default || mod) as TranslationData;
};

/**
 * Get the current locale from the document's lang attribute.
 */
const getCurrentLocale = (): string => {
    if (typeof document === 'undefined') {
        return getDefaultLocale();
    }

    const lang = document.documentElement.getAttribute('lang');
    if (!lang) {
        return getDefaultLocale();
    }

    // Convert locale format (e.g., 'en-US' -> 'en', 'es-ES' -> 'es')
    return lang.split('-')[0];
};

/**
 * Get the default locale from configuration or fallback to 'en'.
 */
const getDefaultLocale = (): string => {
    // Check for config element in the DOM
    if (typeof document !== 'undefined') {
        const configElement = document.getElementById('js-translations-config');
        if (configElement) {
            try {
                const config = JSON.parse(configElement.textContent || '{}');
                if (config.defaultLocale) {
                    return config.defaultLocale;
                }
            } catch {
                // Ignore parsing errors
            }
        }
    }

    return 'en';
};

/**
 * Translation state management singleton.
 */
class TranslationManager {
    private currentLocale: string;
    private defaultLocale: string;
    private translations: TranslationData;
    private defaultTranslations: TranslationData;
    private loadingPromise: Promise<void> | null;
    private observers: TranslationObserver[];
    private initialized: boolean;

    constructor() {
        this.defaultLocale = getDefaultLocale();
        this.currentLocale = getCurrentLocale();
        this.translations = {};
        this.defaultTranslations = {};
        this.loadingPromise = null;
        this.observers = [];
        this.initialized = false;
    }

    /**
     * Initialize the manager with default translations.
     * This should be called once when the module is imported.
     */
    init(defaultTranslations: TranslationData, defaultLocale?: string): void {
        if (this.initialized) {
            return;
        }

        this.initialized = true;
        this.defaultTranslations = defaultTranslations;
        this.translations = { ...defaultTranslations };

        if (defaultLocale) {
            this.defaultLocale = defaultLocale;
        }

        // Watch for changes to the document's lang attribute
        if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
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
        }

        // Load initial translations if not default locale
        if (this.currentLocale !== this.defaultLocale) {
            this.loadTranslations();
        }
    }

    /**
     * Get a promise that resolves when translations are ready.
     * Useful for ensuring translations are loaded before use.
     */
    async ready(): Promise<void> {
        // If we're loading translations, wait for them
        if (this.loadingPromise) {
            await this.loadingPromise;
            return;
        }

        // If locale is not default, ensure translations are loaded
        if (this.currentLocale !== this.defaultLocale) {
            await this.loadTranslations();
        }
    }

    /**
     * Load translations for the current locale.
     */
    private async loadTranslations(): Promise<void> {
        // If current locale is default or not set, use default only
        if (!this.currentLocale || this.currentLocale === this.defaultLocale) {
            this.translations = { ...this.defaultTranslations };
            this.notifyObservers();
            return;
        }

        // Prevent multiple simultaneous loads
        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        this.loadingPromise = loadLocale(this.currentLocale)
            .then((localeData) => {
                // Merge with default translations (locale data takes precedence)
                this.translations = { ...this.defaultTranslations, ...localeData };
                this.notifyObservers();
            })
            .catch((error) => {
                if (import.meta.env.DEV) {
                    console.error(
                        `[js-translations] Failed to load translations for locale "${this.currentLocale}":`,
                        error
                    );
                }
                // Fallback to default translations on error
                this.translations = { ...this.defaultTranslations };
                this.notifyObservers();
            })
            .finally(() => {
                this.loadingPromise = null;
            });

        return this.loadingPromise;
    }

    /**
     * Subscribe to translation updates.
     * Returns an unsubscribe function.
     */
    subscribe(callback: TranslationObserver): () => void {
        this.observers.push(callback);
        // Immediately call with current translations
        callback(this.translations);
        // Return unsubscribe function
        return () => {
            this.observers = this.observers.filter((obs) => obs !== callback);
        };
    }

    /**
     * Notify all observers of translation changes.
     */
    private notifyObservers(): void {
        this.observers.forEach((callback) => callback(this.translations));
    }

    /**
     * Get current translations synchronously.
     */
    getTranslations(): TranslationData {
        return this.translations;
    }

    /**
     * Get a specific translation by key.
     */
    get(key: string): string | undefined {
        return this.translations[key];
    }

    /**
     * Check if a translation key exists.
     */
    has(key: string): boolean {
        return key in this.translations;
    }

    /**
     * Get current locale.
     */
    getCurrentLocale(): string {
        return this.currentLocale;
    }

    /**
     * Get default locale.
     */
    getDefaultLocale(): string {
        return this.defaultLocale;
    }

    /**
     * Manually set the locale and load translations.
     * Note: This doesn't change the HTML lang attribute.
     */
    async setLocale(locale: string): Promise<void> {
        if (locale === this.currentLocale) {
            return;
        }

        this.currentLocale = locale;
        await this.loadTranslations();
    }
}

// Export singleton instance with public interface
export const translationManager: ITranslationManager = new TranslationManager();
