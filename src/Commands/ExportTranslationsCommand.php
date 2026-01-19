<?php

namespace EthanBarlo\JsTranslations\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class ExportTranslationsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'translations:export
                            {--locale= : Export only a specific locale}
                            {--path= : The output path for the generated JSON files}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Export Laravel translation files to JSON format for use in JavaScript';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $outputPath = $this->option('path') ?? config('js-translations.output_path');
        $langPath = config('js-translations.lang_path', base_path('lang'));
        $specificLocale = $this->option('locale');
        $includeGroups = config('js-translations.include');
        $excludeKeys = config('js-translations.exclude', []);

        // Ensure the output directory exists
        if (! File::isDirectory($outputPath)) {
            File::makeDirectory($outputPath, 0755, true);
        }

        // Auto-detect locales from the lang directory
        $locales = $this->detectLocales($langPath);

        if (empty($locales)) {
            $this->warn('No locales found in the lang directory.');

            return self::SUCCESS;
        }

        // Filter to specific locale if provided
        if ($specificLocale) {
            if (! in_array($specificLocale, $locales)) {
                $this->error("Locale '{$specificLocale}' not found in the lang directory.");

                return self::FAILURE;
            }
            $locales = [$specificLocale];
        }

        $this->info('Exporting translations to '.$this->getRelativePath($outputPath));

        foreach ($locales as $locale) {
            $translations = $this->loadTranslationsForLocale($langPath, $locale, $includeGroups, $excludeKeys);

            if (empty($translations)) {
                $this->warn("No translations found for locale: {$locale}");

                continue;
            }

            $jsonPath = "{$outputPath}/{$locale}.json";
            File::put($jsonPath, json_encode($translations, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

            $this->info("  Exported ".count($translations)." translation keys to {$locale}.json");
        }

        $this->newLine();
        $this->info('Translations exported successfully!');

        return self::SUCCESS;
    }

    /**
     * Detect available locales from the lang directory
     */
    private function detectLocales(string $langPath): array
    {
        $locales = [];

        if (! File::isDirectory($langPath)) {
            return [];
        }

        // Get locale directories (e.g., lang/en, lang/es)
        $directories = File::directories($langPath);
        foreach ($directories as $directory) {
            $locale = basename($directory);
            // Skip vendor directory
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
     * Load all translations for a locale by reading language files and flattening them
     */
    private function loadTranslationsForLocale(string $langPath, string $locale, ?array $includeGroups, array $excludeKeys): array
    {
        $translations = [];

        // Load PHP files from locale directory (e.g., lang/en/*.php)
        $localeDir = "{$langPath}/{$locale}";
        if (File::isDirectory($localeDir)) {
            $phpFiles = File::glob($localeDir.'/*.php');

            foreach ($phpFiles as $file) {
                $group = basename($file, '.php');

                // Skip if not in include list (when include is specified)
                if ($includeGroups !== null && ! in_array($group, $includeGroups)) {
                    continue;
                }

                // Skip if group is excluded
                if (in_array($group, $excludeKeys)) {
                    continue;
                }

                $fileTranslations = require $file;

                if (is_array($fileTranslations)) {
                    // Flatten nested arrays using dot notation
                    $flattened = $this->flattenArray($fileTranslations, $group);

                    // Apply key exclusions
                    $flattened = $this->filterExcludedKeys($flattened, $excludeKeys);

                    $translations = array_merge($translations, $flattened);
                }
            }
        }

        // Load JSON file for locale (e.g., lang/en.json)
        $jsonFile = "{$langPath}/{$locale}.json";
        if (File::exists($jsonFile)) {
            $jsonContent = File::get($jsonFile);
            $jsonTranslations = json_decode($jsonContent, true);

            if (is_array($jsonTranslations)) {
                // JSON translations are typically already flat (key => value)
                // Apply key exclusions
                $jsonTranslations = $this->filterExcludedKeys($jsonTranslations, $excludeKeys);

                // Merge with PHP translations (JSON takes precedence for duplicate keys)
                $translations = array_merge($translations, $jsonTranslations);
            }
        }

        // Sort by key for consistent output
        ksort($translations);

        return $translations;
    }

    /**
     * Flatten a nested array with dot notation
     */
    private function flattenArray(array $array, string $prefix = ''): array
    {
        $result = [];

        foreach ($array as $key => $value) {
            $newKey = $prefix ? "{$prefix}.{$key}" : $key;

            if (is_array($value)) {
                $result = array_merge($result, $this->flattenArray($value, $newKey));
            } else {
                $result[$newKey] = $value;
            }
        }

        return $result;
    }

    /**
     * Filter out excluded keys from translations
     */
    private function filterExcludedKeys(array $translations, array $excludeKeys): array
    {
        if (empty($excludeKeys)) {
            return $translations;
        }

        return array_filter($translations, function ($key) use ($excludeKeys) {
            foreach ($excludeKeys as $excludeKey) {
                // Check if the key matches exactly or starts with the excluded prefix
                if ($key === $excludeKey || str_starts_with($key, $excludeKey.'.')) {
                    return false;
                }
            }

            return true;
        }, ARRAY_FILTER_USE_KEY);
    }

    /**
     * Get a relative path for display purposes
     */
    private function getRelativePath(string $path): string
    {
        $basePath = base_path();
        if (str_starts_with($path, $basePath)) {
            return ltrim(substr($path, strlen($basePath)), DIRECTORY_SEPARATOR);
        }

        return $path;
    }
}
