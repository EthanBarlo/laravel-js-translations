<?php

namespace EthanBarlo\JsTranslations;

use Illuminate\Support\Facades\Blade;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;
use EthanBarlo\JsTranslations\Commands\ExportTranslationsCommand;

class JsTranslationsServiceProvider extends PackageServiceProvider
{
    public function configurePackage(Package $package): void
    {
        $package
            ->name('js-translations')
            ->hasConfigFile();
    }

    public function packageBooted(): void
    {
        $this->registerBladeDirectives();
        $this->registerCommands();
    }

    protected function registerBladeDirectives(): void
    {
        /**
         * Preload the active language file if it's not the default locale.
         *
         * This directive outputs a modulepreload link for the current locale's
         * translation file, improving performance by loading it before it's needed.
         *
         * Usage: @preloadActiveLang
         */
        Blade::directive('preloadActiveLang', function () {
            return "<?php
                \$locale = app()->getLocale();
                \$defaultLocale = config('js-translations.default_locale', 'en');
                if (\$locale !== \$defaultLocale) {
                    \$path = 'resources/js/translations/generated/' . \$locale . '.json';
                    echo '<link rel=\"modulepreload\" href=\"' . e(\\Illuminate\\Support\\Facades\\Vite::asset(\$path)) . '\" />';
                }
            ?>";
        });

        /**
         * Output the current locale as a JSON script for JavaScript access.
         *
         * Usage: @jsTranslationsConfig
         */
        Blade::directive('jsTranslationsConfig', function () {
            return "<?php
                echo '<script type=\"application/json\" id=\"js-translations-config\">' . json_encode([
                    'locale' => app()->getLocale(),
                    'defaultLocale' => config('js-translations.default_locale', 'en'),
                ]) . '</script>';
            ?>";
        });
    }

    protected function registerCommands(): void
    {
        if ($this->app->runningInConsole()) {
            $this->commands([
                ExportTranslationsCommand::class,
            ]);
        }
    }
}
