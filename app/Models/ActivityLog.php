<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Facades\Route;

class ActivityLog extends Model
{
    protected $table = 'activity_logs';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'properties' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    public function causer(): MorphTo
    {
        return $this->morphTo();
    }

    /* ------------------------------ Scopes ------------------------------ */
    public function scopeFilter(Builder $query, array $f): Builder
    {
        return $query->when(
            $f['search'] ?? null,
            function (Builder $q, string $search) {
                $q->where(
                    function (Builder $q) use ($search) {
                        $q->where('description', 'like', "%{$search}%")
                            ->orWhere('subject_label', 'like', "%{$search}%")
                            ->orWhere('causer_name', 'like', "%{$search}%")
                            ->orWhere('ip', 'like', "%{$search}%");
                    }
                );
            }
        )->when($f['event'] ?? null, fn(Builder $q, $v) => $q->whereIn('event', (array)$v))
            ->when($f['subject_type'] ?? null, fn(Builder $q, $v) => $q->where('subject_type', $v))
            ->when($f['causer_id'] ?? null, fn(Builder $q, $v) => $q->where('causer_id', $v))
            ->when($f['date_from'] ?? null, fn(Builder $q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($f['date_to'] ?? null, fn(Builder $q, $v) => $q->whereDate('created_at', '<=', $v));
    }

    /* ---------------------------- Presenters ---------------------------- */
    public function subjectConfig(): ?array
    {
        return $this->subject_type
            ? config("activitylog.subjects.{$this->subject_type}")
            : null;
    }

    public function subjectLink(): ?string
    {
        $config = $this->subjectConfig();

        if (!$config || empty($config['route']) || !$this->subject_id) {
            return null;
        }

        return Route::has($config['route'])
            ? route($config['route'], $this->subject_id)
            : null;
    }
}
