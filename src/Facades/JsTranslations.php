<?php

namespace EthanBarlo\JsTranslations\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @see \EthanBarlo\JsTranslations\JsTranslations
 */
class JsTranslations extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return \EthanBarlo\JsTranslations\JsTranslations::class;
    }
}
