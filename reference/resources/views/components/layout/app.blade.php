<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="overscroll-none">
    <head>
        ...
        <!-- Scripts -->
        @if(app()->getLocale() !== 'en')
            @vite('resources/js/translations/generated/'.app()->getLocale().'.json')
        @endif
        @viteReactRefresh
        @vite('resources/js/app.js')
    </head>

    .....