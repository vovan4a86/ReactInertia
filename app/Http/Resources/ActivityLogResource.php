<?php

namespace App\Http\Resources;

use App\Enums\ActivityEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ActivityLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'event' => $this->event,
            'event_label' => ActivityEvent::tryFrom($this->event)?->label() ?? $this->event,
            'description' => $this->description,
            'causer' => [
                'id' => $this->causer_id,
                'name' => $this->causer_name ?: 'Система',
                'email' => $this->whenLoaded('causer', fn() => $this->causer?->email),
            ],
            'subject' => $this->subject_type ? [
                'type' => $this->subject_type,
                'id' => $this->subject_id,
                'label' => $this->subject_label,
                'title' => $this->subjectConfig()['label'] ?? class_basename($this->subject_type),
                'link' => $this->subjectLink(),
                'exists' => (bool)$this->resource->subject,
            ] : null,
            'properties' => $this->when($request->routeIs('*.show') || $request->has('log'), $this->properties),
            'changes_count' => count($this->properties['attributes'] ?? []),
            'batch_uuid' => $this->batch_uuid,
            'ip' => $this->ip,
            'user_agent' => $this->user_agent,
            'url' => $this->url,
            'method' => $this->method,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
