<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Sync ~15,000 SAP materials directly to Meilisearch / local zero-SQL cache every 15 minutes
Schedule::command('sap:sync-materials')->everyFifteenMinutes()->withoutOverlapping();
