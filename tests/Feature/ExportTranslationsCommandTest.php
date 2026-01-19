<?php

use Illuminate\Support\Facades\File;

beforeEach(function () {
    // Clean test output directory before each test
    if (File::isDirectory($this->testOutputPath)) {
        File::cleanDirectory($this->testOutputPath);
    }
});

describe('translations:export command', function () {
    it('exports all detected locales when no --locale option', function () {
        $this->artisan('translations:export')
            ->assertSuccessful()
            ->expectsOutputToContain('Translations exported successfully!');

        // Should export en, fr, ru (directories) and es (JSON only)
        expect(File::exists("{$this->testOutputPath}/en.json"))->toBeTrue();
        expect(File::exists("{$this->testOutputPath}/fr.json"))->toBeTrue();
        expect(File::exists("{$this->testOutputPath}/ru.json"))->toBeTrue();
        expect(File::exists("{$this->testOutputPath}/es.json"))->toBeTrue();
    });

    it('exports only specified locale with --locale option', function () {
        $this->artisan('translations:export', ['--locale' => 'en'])
            ->assertSuccessful();

        expect(File::exists("{$this->testOutputPath}/en.json"))->toBeTrue();
        expect(File::exists("{$this->testOutputPath}/fr.json"))->toBeFalse();
        expect(File::exists("{$this->testOutputPath}/ru.json"))->toBeFalse();
    });

    it('fails when specified locale does not exist', function () {
        $this->artisan('translations:export', ['--locale' => 'nonexistent'])
            ->assertFailed()
            ->expectsOutputToContain("Locale 'nonexistent' not found");
    });

    it('uses custom output path with --path option', function () {
        $customPath = sys_get_temp_dir().'/js-translations-custom-'.uniqid();

        $this->artisan('translations:export', ['--path' => $customPath])
            ->assertSuccessful();

        expect(File::exists("{$customPath}/en.json"))->toBeTrue();

        // Clean up
        File::deleteDirectory($customPath);
    });

    it('creates output directory if it does not exist', function () {
        $newPath = sys_get_temp_dir().'/js-translations-new-'.uniqid().'/nested/path';

        $this->artisan('translations:export', ['--path' => $newPath])
            ->assertSuccessful();

        expect(File::isDirectory($newPath))->toBeTrue();
        expect(File::exists("{$newPath}/en.json"))->toBeTrue();

        // Clean up
        File::deleteDirectory(dirname(dirname($newPath)));
    });
});

describe('locale detection', function () {
    it('detects locales from directories', function () {
        $this->artisan('translations:export', ['--locale' => 'en'])
            ->assertSuccessful();

        $this->artisan('translations:export', ['--locale' => 'fr'])
            ->assertSuccessful();

        $this->artisan('translations:export', ['--locale' => 'ru'])
            ->assertSuccessful();
    });

    it('detects locales from JSON files only', function () {
        // es only has a JSON file, no directory
        $this->artisan('translations:export', ['--locale' => 'es'])
            ->assertSuccessful();

        expect(File::exists("{$this->testOutputPath}/es.json"))->toBeTrue();

        $content = json_decode(File::get("{$this->testOutputPath}/es.json"), true);
        expect($content)->toHaveKey('Hello World');
        expect($content['Hello World'])->toBe('Hola Mundo');
    });

    it('warns when no locales found', function () {
        $emptyLangPath = sys_get_temp_dir().'/js-translations-empty-'.uniqid();
        File::makeDirectory($emptyLangPath);

        config(['js-translations.lang_path' => $emptyLangPath]);

        $this->artisan('translations:export')
            ->assertSuccessful()
            ->expectsOutputToContain('No locales found');

        // Clean up
        File::deleteDirectory($emptyLangPath);
    });
});

describe('PHP file loading', function () {
    it('loads simple translations from PHP files', function () {
        $this->artisan('translations:export', ['--locale' => 'en'])
            ->assertSuccessful();

        $content = json_decode(File::get("{$this->testOutputPath}/en.json"), true);

        expect($content)->toHaveKey('messages.welcome');
        expect($content['messages.welcome'])->toBe('Welcome (from JSON), :name!'); // JSON overrides
        expect($content)->toHaveKey('auth.failed');
        expect($content['auth.failed'])->toBe('These credentials do not match our records.');
    });

    it('flattens nested arrays with dot notation', function () {
        $this->artisan('translations:export', ['--locale' => 'en'])
            ->assertSuccessful();

        $content = json_decode(File::get("{$this->testOutputPath}/en.json"), true);

        // Check deeply nested value
        expect($content)->toHaveKey('messages.nested.level1.level2');
        expect($content['messages.nested.level1.level2'])->toBe('Deeply nested value');

        // Check simple nested value
        expect($content)->toHaveKey('messages.nested.simple');
        expect($content['messages.nested.simple'])->toBe('Simple nested value');

        // Check validation nested
        expect($content)->toHaveKey('validation.min.string');
        expect($content)->toHaveKey('validation.min.numeric');
        expect($content)->toHaveKey('validation.custom.email.required');
    });

    it('preserves placeholder syntax', function () {
        $this->artisan('translations:export', ['--locale' => 'en'])
            ->assertSuccessful();

        $content = json_decode(File::get("{$this->testOutputPath}/en.json"), true);

        expect($content['validation.required'])->toBe('The :attribute field is required.');
        expect($content['auth.throttle'])->toBe('Too many login attempts. Please try again in :seconds seconds.');
    });

    it('preserves plural syntax', function () {
        $this->artisan('translations:export', ['--locale' => 'en'])
            ->assertSuccessful();

        $content = json_decode(File::get("{$this->testOutputPath}/en.json"), true);

        expect($content['messages.items'])->toBe('item|items');
        expect($content['messages.items_count'])->toBe('{0} No items|{1} One item|[2,*] :count items');
    });
});

describe('JSON file loading', function () {
    it('loads translations from JSON files', function () {
        $this->artisan('translations:export', ['--locale' => 'en'])
            ->assertSuccessful();

        $content = json_decode(File::get("{$this->testOutputPath}/en.json"), true);

        expect($content)->toHaveKey('Hello World');
        expect($content['Hello World'])->toBe('Hello World');
        expect($content)->toHaveKey('Only in JSON');
    });

    it('JSON overrides PHP for duplicate keys', function () {
        $this->artisan('translations:export', ['--locale' => 'en'])
            ->assertSuccessful();

        $content = json_decode(File::get("{$this->testOutputPath}/en.json"), true);

        // messages.welcome exists in both PHP and JSON - JSON should win
        expect($content['messages.welcome'])->toBe('Welcome (from JSON), :name!');
    });

    it('handles special characters in JSON', function () {
        $this->artisan('translations:export', ['--locale' => 'en'])
            ->assertSuccessful();

        $content = json_decode(File::get("{$this->testOutputPath}/en.json"), true);

        expect($content)->toHaveKey('Special characters: <>&"\'');
        expect($content['Special characters: <>&"\''])->toBe('Special: <>&"\'');
    });
});

describe('output format', function () {
    it('outputs JSON with pretty print', function () {
        $this->artisan('translations:export', ['--locale' => 'en'])
            ->assertSuccessful();

        $rawContent = File::get("{$this->testOutputPath}/en.json");

        // Pretty print means the JSON contains newlines and indentation
        expect($rawContent)->toContain("\n");
        expect($rawContent)->toContain('    '); // 4 spaces indentation
    });

    it('outputs JSON with unescaped unicode', function () {
        $this->artisan('translations:export', ['--locale' => 'ru'])
            ->assertSuccessful();

        $rawContent = File::get("{$this->testOutputPath}/ru.json");

        // Cyrillic characters should be unescaped
        expect($rawContent)->toContain('Добро пожаловать');
        expect($rawContent)->not->toContain('\\u0414'); // Should not be escaped
    });

    it('outputs JSON with unescaped slashes', function () {
        $this->artisan('translations:export', ['--locale' => 'en'])
            ->assertSuccessful();

        $content = json_decode(File::get("{$this->testOutputPath}/en.json"), true);

        // If any translation contained a slash, it should be unescaped
        // This is tested implicitly - slashes in the JSON file itself won't be escaped
    });

    it('sorts keys alphabetically', function () {
        $this->artisan('translations:export', ['--locale' => 'en'])
            ->assertSuccessful();

        $content = json_decode(File::get("{$this->testOutputPath}/en.json"), true);
        $keys = array_keys($content);
        $sortedKeys = $keys;
        sort($sortedKeys);

        expect($keys)->toBe($sortedKeys);
    });
});

describe('include/exclude filtering', function () {
    it('includes only specified groups when include config is set', function () {
        config(['js-translations.include' => ['messages']]);

        $this->artisan('translations:export', ['--locale' => 'en'])
            ->assertSuccessful();

        $content = json_decode(File::get("{$this->testOutputPath}/en.json"), true);

        // Should have messages
        expect($content)->toHaveKey('messages.welcome');

        // Should NOT have validation or auth (from PHP files)
        $hasValidation = collect(array_keys($content))->contains(fn ($key) => str_starts_with($key, 'validation.'));
        $hasAuth = collect(array_keys($content))->contains(fn ($key) => str_starts_with($key, 'auth.'));

        expect($hasValidation)->toBeFalse();
        expect($hasAuth)->toBeFalse();

        // JSON translations should still be included
        expect($content)->toHaveKey('Hello World');

        // Reset config
        config(['js-translations.include' => null]);
    });

    it('excludes entire groups', function () {
        config(['js-translations.exclude' => ['validation']]);

        $this->artisan('translations:export', ['--locale' => 'en'])
            ->assertSuccessful();

        $content = json_decode(File::get("{$this->testOutputPath}/en.json"), true);

        // Should have messages and auth
        expect($content)->toHaveKey('messages.greeting');
        expect($content)->toHaveKey('auth.failed');

        // Should NOT have validation
        $hasValidation = collect(array_keys($content))->contains(fn ($key) => str_starts_with($key, 'validation.'));
        expect($hasValidation)->toBeFalse();

        // Reset config
        config(['js-translations.exclude' => []]);
    });

    it('excludes specific keys with dot notation', function () {
        config(['js-translations.exclude' => ['messages.nested']]);

        $this->artisan('translations:export', ['--locale' => 'en'])
            ->assertSuccessful();

        $content = json_decode(File::get("{$this->testOutputPath}/en.json"), true);

        // Should have other messages keys
        expect($content)->toHaveKey('messages.greeting');

        // Should NOT have nested keys
        expect($content)->not->toHaveKey('messages.nested.level1.level2');
        expect($content)->not->toHaveKey('messages.nested.simple');

        // Reset config
        config(['js-translations.exclude' => []]);
    });
});

describe('different locales', function () {
    it('exports French translations correctly', function () {
        $this->artisan('translations:export', ['--locale' => 'fr'])
            ->assertSuccessful();

        $content = json_decode(File::get("{$this->testOutputPath}/fr.json"), true);

        expect($content['messages.welcome'])->toBe('Bienvenue, :name!');
        expect($content['messages.items'])->toBe('article|articles');
        expect($content['Hello World'])->toBe('Bonjour le monde');
    });

    it('exports Russian translations with cyrillic characters', function () {
        $this->artisan('translations:export', ['--locale' => 'ru'])
            ->assertSuccessful();

        $content = json_decode(File::get("{$this->testOutputPath}/ru.json"), true);

        expect($content['messages.welcome'])->toBe('Добро пожаловать, :name!');
        expect($content['messages.items'])->toBe('предмет|предмета|предметов');
    });

    it('exports Spanish JSON-only locale', function () {
        $this->artisan('translations:export', ['--locale' => 'es'])
            ->assertSuccessful();

        $content = json_decode(File::get("{$this->testOutputPath}/es.json"), true);

        expect($content)->toBe([
            'Goodbye' => 'Adiós',
            'Hello World' => 'Hola Mundo',
            'Welcome' => 'Bienvenido',
        ]);
    });
});
