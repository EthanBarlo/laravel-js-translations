<?php

// config for EthanBarlo/JsTranslations
return [
    /*
    |--------------------------------------------------------------------------
    | Default Locale
    |--------------------------------------------------------------------------
    |
    | The default locale will be bundled eagerly with your JavaScript, while
    | other locales will be lazy-loaded when needed. This should match your
    | application's default locale for optimal performance.
    |
    */
    'default_locale' => config('app.locale', 'en'),

    /*
    |--------------------------------------------------------------------------
    | Output Path
    |--------------------------------------------------------------------------
    |
    | The directory where generated JSON translation files will be stored.
    | This path should be accessible by your Vite build process.
    |
    */
    'output_path' => resource_path('js/translations/generated'),

    /*
    |--------------------------------------------------------------------------
    | Language Path
    |--------------------------------------------------------------------------
    |
    | The directory where your Laravel translation files are stored.
    | By default, this is the 'lang' directory in your application root.
    |
    */
    'lang_path' => base_path('lang'),

    /*
    |--------------------------------------------------------------------------
    | Include Groups
    |--------------------------------------------------------------------------
    |
    | Specify which translation groups to include. Set to null to include all
    | translation groups. Use an array to limit exports to specific groups.
    |
    | Example: ['auth', 'validation', 'messages']
    |
    */
    'include' => null,

    /*
    |--------------------------------------------------------------------------
    | Exclude Keys
    |--------------------------------------------------------------------------
    |
    | Specify translation keys or groups to exclude from the export.
    | Use dot notation for nested keys.
    |
    | Example: ['validation', 'passwords.reset']
    |
    */
    'exclude' => [],
];
