<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ActivityEvent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ActivityLogIndexRequest;
use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminActivityLogController
{

    public function index(ActivityLogIndexRequest $request): Response
    {
        $filters = $request->filters();

        $logs = ActivityLog::query()
            ->filter($filters)
            ->orderBy($filters['sort'], $filters['direction'])
            ->paginate($filters['per_page'])
            ->withQueryString();

        return Inertia::render('Admin/ActivityLog/Index', [
            'logs' => ActivityLogResource::collection($logs),
            'filters' => $filters,

            'options' => [
                'events' => ActivityEvent::options(),
                'subjects' => collect(config('activitylog.subjects'))
                    ->map(fn($c, $class) => ['value' => $class, 'label' => $c['plural'] ?? $c['label']])
                    ->values(),
                'causers' => User::query()
                    ->whereIn('id', ActivityLog::query()->distinct()->pluck('causer_id')->filter())
                    ->orderBy('name')
                    ->get(['id', 'name', 'email'])
                    ->map(fn($u) => ['value' => $u->id, 'label' => $u->name, 'email' => $u->email]),
                'perPageOptions' => [15, 25, 50, 100],
            ],

            // подгружается только при partial reload (only: ['selected'])
            'selected' => Inertia::optional(function () use ($request) {
                if (!$request->filled('log')) {
                    return null;
                }

                $log = ActivityLog::with(['causer', 'subject'])->find($request->integer('log'));

                return $log ? (new ActivityLogResource($log))->resolve($request) : null;
            }),

            // отложенная загрузка графика (Inertia 2 defer)
            'stats' => Inertia::defer(fn() => $this->stats(), 'charts'),
        ]);
    }

    public function destroy(ActivityLog $activityLog)
    {
        $activityLog->delete();

        return back()->with('success', 'Запись журнала удалена.');
    }

    public function bulkDestroy(Request $request)
    {
        $ids = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:activity_logs,id'],
        ])['ids'];

        $count = ActivityLog::whereIn('id', $ids)->delete();

        return back()->with('success', "Удалено записей: {$count}.");
    }

    public function prune(Request $request)
    {
        $days = (int)$request->validate([
            'days' => ['required', 'integer', 'min:0', 'max:3650'],
        ])['days'];

        $count = ActivityLog::where('created_at', '<', now()->subDays($days))->delete();

        return back()->with('success', "Очищено записей старше {$days} дн.: {$count}.");
    }

    public function export(ActivityLogIndexRequest $request): StreamedResponse
    {
        $filters = $request->filters();
        $filename = 'activity-log-' . now()->format('Y-m-d_H-i') . '.csv';
        return response()->streamDownload(function () use ($filters) {
            $out = fopen('php://output', 'w');
            fwrite(
                $out,
                "\xEF\xBB\xBF"
            ); // BOM для Excel

            fputcsv($out, ['ID', 'Дата', 'Пользователь', 'Событие', 'Объект', 'Название', 'IP', 'URL'], ';');

            ActivityLog::query()
                ->filter($filters)
                ->orderBy($filters['sort'], $filters['direction'])
                ->chunk(500, function ($rows) use ($out) {
                    foreach ($rows as $r) {
                        fputcsv($out, [
                            $r->id,
                            $r->created_at?->format('d.m.Y H:i:s'),
                            $r->causer_name,
                            ActivityEvent::tryFrom($r->event)?->label() ?? $r->event,
                            $r->subjectConfig()['label'] ?? '—',
                            $r->subject_label,
                            $r->ip,
                            $r->url,
                        ], ';');
                    }
                });

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** Данные для графиков за 30 дней */
    protected function stats(): array
    {
        $from = now()->subDays(29)->startOfDay();

        $byDay = ActivityLog::query()
            ->where('created_at', '>=', $from)
            ->select(DB::raw('DATE(created_at) as day'), DB::raw('COUNT(*) as total'))
            ->groupBy('day')
            ->pluck('total', 'day');

        $timeline = collect(range(0, 29))->map(function ($i) use ($from, $byDay) {
            $date = $from->copy()->addDays($i)->format('Y-m-d');

            return [
                'date' => $date,
                'label' => Carbon::parse($date)->format('d.m'),
                'total' => (int)($byDay[$date] ?? 0),
            ];
        })->values()->all();

        $byEvent = ActivityLog::query()
            ->where('created_at', '>=', $from)
            ->select('event', DB::raw('COUNT(*) as total'))
            ->groupBy('event')
            ->orderByDesc('total')
            ->get()
            ->map(fn($r) => [
                'event' => $r->event,
                'label' => ActivityEvent::tryFrom($r->event)?->label() ?? $r->event,
                'total' => (int)$r->total,
            ])->all();

        return [
            'timeline' => $timeline,
            'byEvent' => $byEvent,
            'total' => ActivityLog::count(),
            'today' => ActivityLog::whereDate('created_at', today())->count(),
            'week' => ActivityLog::where('created_at', '>=', now()->subWeek())->count(),
            'actors' => ActivityLog::whereNotNull('causer_id')->distinct('causer_id')->count('causer_id'),
        ];
    }
}
