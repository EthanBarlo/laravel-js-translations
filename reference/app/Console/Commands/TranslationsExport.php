<?php

namespace App\Console\Commands;

use App\Enums\SupportedLanguages;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class TranslationsExport extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'translations:export {--path= : The output path for the generated JSON files}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Export Laravel translation files to JSON format for use in React components';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $outputPath = $this->option('path') ?? base_path('resources/js/translations/generated');

        // Ensure the output directory exists
        if (! File::isDirectory($outputPath)) {
            File::makeDirectory($outputPath, 0755, true);
        }

        // Clean the directory first
        $files = File::glob($outputPath.'/*.json');
        foreach ($files as $file) {
            File::delete($file);
        }

        $locales = SupportedLanguages::values();

        $this->info('Exporting translations to resources/js/translations/generated');

        foreach ($locales as $locale) {
            $translations = $this->loadTranslationsForLocale($locale);

            if (empty($translations)) {
                $this->warn("No translations found for locale: {$locale}");

                continue;
            }

            $jsonPath = "{$outputPath}/{$locale}.json";
            File::put($jsonPath, json_encode($translations, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

            $this->info('✓ Exported '.count($translations).' translation keys to '."resources/js/translations/generated/{$locale}.json");
        }

        return self::SUCCESS;
    }

    /**
     * Load all translations for a locale by reading language files and flattening them
     */
    private function loadTranslationsForLocale(string $locale): array
    {
        $translations = [];
        $langPath = base_path("lang/{$locale}");

        if (! is_dir($langPath)) {
            return [];
        }

        // Get all PHP files in the locale directory
        $files = glob($langPath.'/*.php');

        foreach ($files as $file) {
            $filename = basename($file, '.php');
            $fileTranslations = require $file;

            // Flatten nested arrays using dot notation
            $flattened = $this->flattenArray($fileTranslations, $filename);
            $translations = array_merge($translations, $flattened);
        }

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
}
