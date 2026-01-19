<?php

namespace EthanBarlo\JsTranslations\Commands;

use Illuminate\Console\Command;

class JsTranslationsCommand extends Command
{
    public $signature = 'laravel-js-translations';

    public $description = 'My command';

    public function handle(): int
    {
        $this->comment('All done');

        return self::SUCCESS;
    }
}
