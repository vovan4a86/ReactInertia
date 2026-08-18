<?php

namespace App\Traits;

use App\Enums\ActivityEvent;
use App\Models\ActivityLog;
use App\Services\ActivityLogger;
use Illuminate\Database\Eloquent\Relations\MorphMany;

trait LogsActivity
{
    /** Поля, которые не логируем у конкретной модели */
    protected array $activityHidden = [];

    public static function bootLogsActivity(): void
    {
        static::created(function ($model) {
            ActivityLogger::log(ActivityEvent::Created, null, $model, [
                'attributes' => $model->attributesToLog($model->getAttributes()),
            ]);
        });

        static::updated(function ($model) {
            $changes = $model->attributesToLog($model->getChanges());

            if (empty($changes)) {
                return;
            }

            $old = collect($model->getOriginal())->only(array_keys($changes))->all();

            ActivityLogger::log(ActivityEvent::Updated, null, $model, [
                'old' => $old,
                'attributes' => $changes,
            ]);
        });

        static::deleted(function ($model) {
            $isSoft = method_exists($model, 'isForceDeleting') && !$model->isForceDeleting();
            ActivityLogger::log(
                $isSoft ? ActivityEvent::Deleted : ActivityEvent::ForceDeleted,
                null,
                $model,
                ['old' => $model->attributesToLog($model->getOriginal())]
            );
        });

        if (method_exists(static::class, 'restored')) {
            static::restored(fn($model) => ActivityLogger::log(ActivityEvent::Restored, null, $model));
        }
    }

    public function attributesToLog(array $attributes): array
    {
        $hidden = array_merge(config('activitylog.global_hidden', []),
            $this->activityHidden,
            [$this->getKeyName(), 'created_at']);
        return collect($attributes)->except($hidden)->all();
    }

    /** Переопределяется в модели при необходимости */
    public function activityTitle(): string
    {
        return (string)($this->title ?? $this->name ?? "#{$this->getKey()}");
    }

    public function activities(): MorphMany
    {
        return $this->morphMany(ActivityLog::class, 'subject')->latest();
    }
}
