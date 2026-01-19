<?php

namespace EthanBarlo\JsTranslations;

use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;
use EthanBarlo\JsTranslations\Commands\JsTranslationsCommand;

class JsTranslationsServiceProvider extends PackageServiceProvider
{
    public function configurePackage(Package $package): void
    {
        /*
         * This class is a Package Service Provider
         *
         * More info: https://github.com/spatie/laravel-package-tools
         */
        $package
            ->name('laravel-js-translations')
            ->hasConfigFile()
            ->hasViews()
            ->hasMigration('create_laravel_js_translations_table')
            ->hasCommand(JsTranslationsCommand::class);
    }
}
