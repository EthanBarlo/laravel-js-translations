<?php

namespace EthanBarlo\JsTranslations\Tests;

use EthanBarlo\JsTranslations\JsTranslationsServiceProvider;
use Illuminate\Support\Facades\File;
use Orchestra\Testbench\TestCase as Orchestra;

class TestCase extends Orchestra
{
    protected string $testOutputPath;

    protected function setUp(): void
    {
        // Initialize the test output path BEFORE parent::setUp() which calls defineEnvironment
        $this->testOutputPath = sys_get_temp_dir().'/js-translations-test-'.uniqid();

        parent::setUp();

        File::ensureDirectoryExists($this->testOutputPath);
    }

    protected function tearDown(): void
    {
        if (isset($this->testOutputPath) && File::isDirectory($this->testOutputPath)) {
            File::deleteDirectory($this->testOutputPath);
        }

        parent::tearDown();
    }

    protected function getPackageProviders($app): array
    {
        return [
            JsTranslationsServiceProvider::class,
        ];
    }

    protected function defineEnvironment($app): void
    {
        $app['config']->set('js-translations.lang_path', $this->getFixturesPath('lang'));
        $app['config']->set('js-translations.output_path', $this->testOutputPath);
    }

    protected function getFixturesPath(string $path = ''): string
    {
        return __DIR__.'/Fixtures'.($path ? '/'.$path : '');
    }
}
