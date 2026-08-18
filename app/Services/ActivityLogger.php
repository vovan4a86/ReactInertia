<?php

namespace App\Services;

use App\Enums\ActivityEvent;
use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class ActivityLogger
{
    protected static ?string $batchUuid = null;

    /** Сгруппировать несколько действий в один "батч" */
    public static function batch(callable $callback): mixed
    {
        static::$batchUuid = (string) Str::uuid();

        try {
            return $callback();
        } finally {
            static::$batchUuid = null;
        }
    }

    public static function log(
        ActivityEvent|string $event,
        ?string $description = null,
        ?Model $subject = null,
        array $properties = [],
        ?Model $causer = null,
    ): ?ActivityLog {
        if (! config('activitylog.enabled', true)) {
            return null;
        }

        $event = $event instanceof ActivityEvent ? $event->value : $event;
        $causer ??= Auth::user();
        $request = request();

        return ActivityLog::create([
            'event'         => $event,
            'description'   => $description ?? static::describe($event, $subject),
            'subject_type'  => $subject?->getMorphClass(),
            'subject_id'    => $subject?->getKey(),
            'subject_label' => $subject ? static::subjectLabel($subject) : null,
            'causer_type'   => $causer?->getMorphClass(),
            'causer_id'     => $causer?->getKey(),
            'causer_name'   => $causer?->name ?? 'Система',
            'properties'    => static::sanitize($properties) ?: null,
            'batch_uuid'    => static::$batchUuid,
            'ip'            => $request?->ip(),
            'user_agent'    => Str::limit((string) $request?->userAgent(), 500, ''),
            'url'           => Str::limit((string) $request?->fullUrl(), 2000, ''),
            'method'        => $request?->method(),
        ]);
    }

    public static function subjectLabel(Model $model): string
    {
        if (method_exists($model, 'activityTitle')) {
            return (string) $model->activityTitle();
        }

        return (string) ($model->title ?? $model->name ?? $model->slug ?? "#{$model->getKey()}");
    }

    protected static function describe(string $event, ?Model $subject): string
    {
        $type = $subject
            ? (config("activitylog.subjects.{$subject->getMorphClass()}.label") ?? class_basename($subject))
            : null;

        $label = ActivityEvent::tryFrom($event)?->label() ?? $event;

        return $type ? "{$label}: {$type}" : $label;
    }

    /** Удаляем чувствительные поля из old/attributes */
    protected static function sanitize(array $properties): array
    {
        $hidden = config('activitylog.global_hidden', []);

        foreach (['old', 'attributes'] as $key) {
            if (! empty($properties[$key]) && is_array($properties[$key])) {
                $properties[$key] = collect($properties[$key])
                    ->except($hidden)
                    ->map(fn ($v) => is_array($v) ? $v : (is_object($v) ? (string) $v : $v))
                    ->all();
            }
        }

        return array_filter($properties, fn ($v) => $v !== null && $v !== []);
    }
}
