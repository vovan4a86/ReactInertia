<?php

use App\Models\ActivityLog;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(fn() => ActivityLog::where('created_at', '<', now()->subDays(config('activitylog.prune_days')))->delete())
    ->daily()
    ->name('activity-log:prune');
