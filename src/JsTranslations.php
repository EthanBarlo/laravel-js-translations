<?php

namespace EthanBarlo\JsTranslations;

use Illuminate\Support\Facades\File;

class JsTranslations
{
    /**
     * Get the current application locale.
     */
    public static function getLocale(): string
    {
        return app()->getLocale();
    }

    /**
     * Get the default locale from configuration.
     */
    public static function getDefaultLocale(): string
    {
        return config('js-translations.default_locale', 'en');
    }

    /**
     * Check if the current locale is the default locale.
     */
    public static function isDefaultLocale(): bool
    {
        return self::getLocale() === self::getDefaultLocale();
    }

    /**
     * Get all available locales by scanning the lang directory.
     *
     * @return array<string>
     */
    public static function getAvailableLocales(): array
    {
        $langPath = config('js-translations.lang_path', base_path('lang'));
        $locales = [];

        if (! File::isDirectory($langPath)) {
            return [self::getDefaultLocale()];
        }

        // Get locale directories (e.g., lang/en, lang/es)
        $directories = File::directories($langPath);
        foreach ($directories as $directory) {
            $locale = basename($directory);
            if ($locale !== 'vendor') {
                $locales[] = $locale;
            }
        }

        // Also check for JSON files (e.g., lang/en.json, lang/es.json)
        $jsonFiles = File::glob($langPath.'/*.json');
        foreach ($jsonFiles as $jsonFile) {
            $locale = basename($jsonFile, '.json');
            if (! in_array($locale, $locales)) {
                $locales[] = $locale;
            }
        }

        sort($locales);

        return $locales;
    }

    /**
     * Get the output path for generated translation files.
     */
    public static function getOutputPath(): string
    {
        return config('js-translations.output_path', resource_path('js/translations/generated'));
    }

    /**
     * Get the path to a specific locale's generated JSON file.
     */
    public static function getLocaleFilePath(string $locale): string
    {
        return self::getOutputPath().'/'.$locale.'.json';
    }

    /**
     * Check if a locale's JSON file has been generated.
     */
    public static function hasGeneratedLocale(string $locale): bool
    {
        return File::exists(self::getLocaleFilePath($locale));
    }

    /**
     * Get the relative path for Vite asset reference.
     */
    public static function getViteAssetPath(string $locale): string
    {
        return 'resources/js/translations/generated/'.$locale.'.json';
    }
}
