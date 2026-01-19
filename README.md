# Laravel JS Translations

[![Latest Version on Packagist](https://img.shields.io/packagist/v/ethanbarlo/laravel-js-translations.svg?style=flat-square)](https://packagist.org/packages/ethanbarlo/laravel-js-translations)
[![GitHub Tests Action Status](https://img.shields.io/github/actions/workflow/status/ethanbarlo/laravel-js-translations/run-tests.yml?branch=main&label=tests&style=flat-square)](https://github.com/ethanbarlo/laravel-js-translations/actions?query=workflow%3Arun-tests+branch%3Amain)
[![Total Downloads](https://img.shields.io/packagist/dt/ethanbarlo/laravel-js-translations.svg?style=flat-square)](https://packagist.org/packages/ethanbarlo/laravel-js-translations)

Use your Laravel translations in JavaScript. A single Composer package that includes both PHP and JavaScript code - no separate NPM package needed.

## Features

- **Single package** - Composer package includes pre-built JS, no NPM package required
- **Vendor imports** - Import JS directly from vendor directory (like Livewire)
- **Vanilla JS** - Framework-agnostic, works with any JavaScript setup
- **Auto-detect locales** - Automatically scans your `lang/` directory
- **PHP + JSON support** - Supports both `lang/en/*.php` and `lang/en.json` files
- **Vite integration** - Built-in Vite plugin for automatic export on dev/build
- **Lazy loading** - Default locale bundled eagerly, others loaded on-demand
- **Reactive** - Watches `<html lang="">` for locale changes

## Installation

Install the package via Composer:

```bash
composer require ethanbarlo/laravel-js-translations
```

Publish the config file (optional):

```bash
php artisan vendor:publish --tag="js-translations-config"
```

## Configuration

```php
// config/js-translations.php
return [
    // Default locale (bundled eagerly, others lazy-loaded)
    'default_locale' => config('app.locale', 'en'),

    // Output path for generated JSON files
    'output_path' => resource_path('js/translations/generated'),

    // Path to lang directory
    'lang_path' => base_path('lang'),

    // Include specific translation groups (null = all)
    'include' => null,

    // Exclude specific keys/groups
    'exclude' => [],
];
```

## Setup

### 1. Configure Vite

Add the Vite plugin and alias to your `vite.config.js`:

```js
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import { laravelTranslations } from './vendor/ethanbarlo/laravel-js-translations/dist/vite-plugin.js';

export default defineConfig({
    plugins: [
        laravelTranslations(),
        laravel({
            input: ['resources/js/app.js'],
            refresh: true,
        }),
    ],
    resolve: {
        alias: {
            '@translations': './vendor/ethanbarlo/laravel-js-translations/dist/index.js',
        },
    },
});
```

### 2. Blade Setup (Optional)

For optimal performance when using non-default locales, add the preload directive to your layout:

```blade
<head>
    @preloadActiveLang
    @vite('resources/js/app.js')
</head>
```

### 3. Export Translations

The Vite plugin automatically exports translations when you run `npm run dev` or `npm run build`. You can also export manually:

```bash
php artisan translations:export

# Export specific locale
php artisan translations:export --locale=es

# Export to custom path
php artisan translations:export --path=custom/path
```

## Usage

### Basic Translation

```js
import { __, trans_choice } from '@translations';

// Or direct vendor import
import { __, trans_choice } from '../vendor/ethanbarlo/laravel-js-translations/dist/index.js';

// Basic translation
const message = __('auth.failed');

// With replacements
const greeting = __('messages.welcome', { name: 'John' });
```

### Case Transformations

Laravel-style case transformations are supported:

```js
// :name → lowercase
__('hello.message', { name: 'WORLD' }); // "Hello world"

// :Name → ucfirst
__('hello.message', { name: 'world' }); // "Hello World"

// :NAME → uppercase
__('hello.message', { name: 'world' }); // "Hello WORLD"
```

### Pluralization

```js
// Simple: "item|items"
trans_choice('items.count', 1); // "item"
trans_choice('items.count', 5); // "items"

// Complex: "{0} No items|{1} :count item|[2,*] :count items"
trans_choice('items.label', 0); // "No items"
trans_choice('items.label', 1); // "1 item"
trans_choice('items.label', 5); // "5 items"
```

### Wait for Translations

For non-default locales that are lazy-loaded:

```js
import { translationsReady, __ } from '@translations';

// Wait for translations to load
await translationsReady;
console.log(__('messages.welcome'));
```

### Subscribe to Changes

React to locale changes (useful for reactive frameworks):

```js
import { onTranslationsChange } from '@translations';

const unsubscribe = onTranslationsChange((translations) => {
    // Re-render your component
    console.log('Translations updated:', translations);
});

// Cleanup when done
unsubscribe();
```

### Translation Manager

For advanced usage:

```js
import { getTranslationManager } from '@translations';

const manager = getTranslationManager();

// Get current locale
console.log(manager.getCurrentLocale());

// Check if translation exists
if (manager.has('messages.welcome')) {
    console.log(manager.get('messages.welcome'));
}

// Manually set locale (doesn't change HTML lang attribute)
await manager.setLocale('es');
```

## Vite Plugin Options

```js
laravelTranslations({
    // Path to Laravel lang directory
    langPath: 'lang',

    // Output path for JSON files
    outputPath: 'resources/js/translations/generated',

    // Default locale (bundled with your JS)
    defaultLocale: 'en',

    // PHP binary path
    php: 'php',

    // Watch for changes in dev mode
    watch: true,
})
```

## How It Works

1. **Export Command**: Scans `lang/` for PHP arrays and JSON files, flattens them to dot notation, and outputs JSON files
2. **Vite Plugin**: Runs export on dev start and production build, watches for changes
3. **JavaScript**: Default locale is bundled eagerly, other locales are lazy-loaded via `import.meta.glob`
4. **MutationObserver**: Watches `<html lang="">` for changes and automatically loads new locale

## Testing

```bash
composer test
```

## Changelog

Please see [CHANGELOG](CHANGELOG.md) for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](CONTRIBUTING.md) for details.

## Security Vulnerabilities

Please review [our security policy](../../security/policy) on how to report security vulnerabilities.

## Credits

- [EthanBarlo](https://github.com/ethanbarlo)
- [All Contributors](../../contributors)

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
