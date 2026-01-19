// resources/js/manager.ts
var translationModules = import.meta.glob(
  "/resources/js/translations/generated/*.json",
  { eager: false }
);
var loadLocale = async (locale) => {
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
  const mod = await modLoader();
  return mod.default || mod;
};
var getCurrentLocale = () => {
  if (typeof document === "undefined") {
    return getDefaultLocale();
  }
  const lang = document.documentElement.getAttribute("lang");
  if (!lang) {
    return getDefaultLocale();
  }
  return lang.split("-")[0];
};
var getDefaultLocale = () => {
  if (typeof document !== "undefined") {
    const configElement = document.getElementById("js-translations-config");
    if (configElement) {
      try {
        const config = JSON.parse(configElement.textContent || "{}");
        if (config.defaultLocale) {
          return config.defaultLocale;
        }
      } catch {
      }
    }
  }
  return "en";
};
var TranslationManager = class {
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
  init(defaultTranslations, defaultLocale) {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    this.defaultTranslations = defaultTranslations;
    this.translations = { ...defaultTranslations };
    if (defaultLocale) {
      this.defaultLocale = defaultLocale;
    }
    if (typeof document !== "undefined" && typeof MutationObserver !== "undefined") {
      const observer = new MutationObserver(() => {
        const newLocale = getCurrentLocale();
        if (newLocale !== this.currentLocale) {
          this.currentLocale = newLocale;
          this.loadTranslations();
        }
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["lang"]
      });
    }
    if (this.currentLocale !== this.defaultLocale) {
      this.loadTranslations();
    }
  }
  /**
   * Get a promise that resolves when translations are ready.
   * Useful for ensuring translations are loaded before use.
   */
  async ready() {
    if (this.loadingPromise) {
      await this.loadingPromise;
      return;
    }
    if (this.currentLocale !== this.defaultLocale) {
      await this.loadTranslations();
    }
  }
  /**
   * Load translations for the current locale.
   */
  async loadTranslations() {
    if (!this.currentLocale || this.currentLocale === this.defaultLocale) {
      this.translations = { ...this.defaultTranslations };
      this.notifyObservers();
      return;
    }
    if (this.loadingPromise) {
      return this.loadingPromise;
    }
    this.loadingPromise = loadLocale(this.currentLocale).then((localeData) => {
      this.translations = { ...this.defaultTranslations, ...localeData };
      this.notifyObservers();
    }).catch((error) => {
      if (import.meta.env.DEV) {
        console.error(
          `[js-translations] Failed to load translations for locale "${this.currentLocale}":`,
          error
        );
      }
      this.translations = { ...this.defaultTranslations };
      this.notifyObservers();
    }).finally(() => {
      this.loadingPromise = null;
    });
    return this.loadingPromise;
  }
  /**
   * Subscribe to translation updates.
   * Returns an unsubscribe function.
   */
  subscribe(callback) {
    this.observers.push(callback);
    callback(this.translations);
    return () => {
      this.observers = this.observers.filter((obs) => obs !== callback);
    };
  }
  /**
   * Notify all observers of translation changes.
   */
  notifyObservers() {
    this.observers.forEach((callback) => callback(this.translations));
  }
  /**
   * Get current translations synchronously.
   */
  getTranslations() {
    return this.translations;
  }
  /**
   * Get a specific translation by key.
   */
  get(key) {
    return this.translations[key];
  }
  /**
   * Check if a translation key exists.
   */
  has(key) {
    return key in this.translations;
  }
  /**
   * Get current locale.
   */
  getCurrentLocale() {
    return this.currentLocale;
  }
  /**
   * Get default locale.
   */
  getDefaultLocale() {
    return this.defaultLocale;
  }
  /**
   * Manually set the locale and load translations.
   * Note: This doesn't change the HTML lang attribute.
   */
  async setLocale(locale) {
    if (locale === this.currentLocale) {
      return;
    }
    this.currentLocale = locale;
    await this.loadTranslations();
  }
};
var translationManager = new TranslationManager();

// resources/js/utils.ts
function parsePluralString(translationString) {
  const segments = [];
  const parts = translationString.split(/(?<!\\)\|/);
  for (const part of parts) {
    const trimmedPart = part.trim();
    const intervalMatch = trimmedPart.match(/^(\{[^}]+\}|\[[^\]]+\])\s*(.+)$/);
    if (intervalMatch) {
      const intervalStr = intervalMatch[1];
      const value = intervalMatch[2].replace(/\\\|/g, "|");
      if (intervalStr.startsWith("{")) {
        const exact = parseInt(intervalStr.slice(1, -1));
        if (!isNaN(exact)) {
          segments.push({ value, exact });
        }
      } else if (intervalStr.startsWith("[")) {
        const rangeContent = intervalStr.slice(1, -1);
        const [minStr, maxStr] = rangeContent.split(",");
        const min = minStr === "*" ? void 0 : parseInt(minStr);
        const max = maxStr === "*" ? void 0 : parseInt(maxStr);
        if (!isNaN(min) || min === void 0) {
          if (!isNaN(max) || max === void 0) {
            segments.push({ value, min, max });
          }
        }
      }
    } else {
      segments.push({ value: trimmedPart.replace(/\\\|/g, "|") });
    }
  }
  return segments;
}
function countMatchesSegment(count, segment) {
  if (segment.exact !== void 0) {
    return count === segment.exact;
  }
  if (segment.min !== void 0 || segment.max !== void 0) {
    const min = segment.min ?? -Infinity;
    const max = segment.max ?? Infinity;
    return count >= min && count <= max;
  }
  return count > 1;
}
function choosePluralForm(translationString, count) {
  const segments = parsePluralString(translationString);
  if (segments.length === 0) {
    return translationString;
  }
  const hasIntervals = segments.some(
    (seg) => seg.exact !== void 0 || seg.min !== void 0 || seg.max !== void 0
  );
  if (!hasIntervals) {
    if (count === 1 && segments.length > 0) {
      return segments[0].value;
    } else if (count > 1 && segments.length > 1) {
      return segments[1].value;
    } else if (segments.length > 0) {
      return segments[0].value;
    }
  }
  for (const segment of segments) {
    if (countMatchesSegment(count, segment)) {
      return segment.value;
    }
  }
  return segments[segments.length - 1].value;
}
function applyReplacements(template, replacements = {}) {
  if (!template || Object.keys(replacements).length === 0) {
    return template;
  }
  return template.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, key) => {
    const value = replacements[key.toLowerCase()];
    if (value === null || value === void 0) {
      return match;
    }
    const valueStr = String(value);
    if (key === key.toUpperCase()) {
      return valueStr.toUpperCase();
    } else if (key.charAt(0) === key.charAt(0).toUpperCase()) {
      return valueStr.charAt(0).toUpperCase() + valueStr.slice(1);
    } else {
      return valueStr;
    }
  });
}

// resources/js/index.ts
function initTranslations(defaultTranslations, defaultLocale) {
  translationManager.init(defaultTranslations, defaultLocale);
}
var translationsReady = (async () => {
  await Promise.resolve();
  await translationManager.ready();
})();
function __(key, replacements = {}) {
  const translation = translationManager.get(key);
  if (!translation) {
    if (import.meta.env.DEV) {
      console.warn(
        `[js-translations] Translation key "${key}" not found for locale "${translationManager.getCurrentLocale()}"`
      );
    }
    return key;
  }
  return applyReplacements(translation, replacements);
}
function trans_choice(key, count, replacements = {}) {
  const translation = translationManager.get(key);
  if (!translation) {
    if (import.meta.env.DEV) {
      console.warn(
        `[js-translations] Translation key "${key}" not found for locale "${translationManager.getCurrentLocale()}"`
      );
    }
    return key;
  }
  const replacementsWithCount = { ...replacements, count };
  const chosenForm = choosePluralForm(translation, count);
  return applyReplacements(chosenForm, replacementsWithCount);
}
function getTranslationManager() {
  return translationManager;
}
function onTranslationsChange(callback) {
  return translationManager.subscribe(callback);
}
function getLocale() {
  return translationManager.getCurrentLocale();
}
function hasTranslation(key) {
  return translationManager.has(key);
}
export {
  __,
  applyReplacements,
  choosePluralForm,
  getLocale,
  getTranslationManager,
  hasTranslation,
  initTranslations,
  onTranslationsChange,
  trans_choice,
  translationManager,
  translationsReady
};
