<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ActivityLogIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // при необходимости: $this->user()->can('viewAny', ActivityLog::class)
    }

    public function rules(): array
    {
        return [
            'search'       => ['nullable', 'string', 'max:255'],
            'event'        => ['nullable', 'array'],
            'event.*'      => ['string', 'max:50'],
            'subject_type' => ['nullable', 'string', Rule::in(array_keys(config('activitylog.subjects')))],
            'causer_id'    => ['nullable', 'integer'],
            'date_from'    => ['nullable', 'date'],
            'date_to'      => ['nullable', 'date', 'after_or_equal:date_from'],
            'sort'         => ['nullable', Rule::in(['created_at', 'event', 'causer_name'])],
            'direction'    => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page'     => ['nullable', 'integer', Rule::in([15, 25, 50, 100])],
            'log'          => ['nullable', 'integer'],
        ];
    }

    public function filters(): array
    {
        return [
            'search'       => $this->input('search'),
            'event'        => $this->input('event', []),
            'subject_type' => $this->input('subject_type'),
            'causer_id'    => $this->input('causer_id'),
            'date_from'    => $this->input('date_from'),
            'date_to'      => $this->input('date_to'),
            'sort'         => $this->input('sort', 'created_at'),
            'direction'    => $this->input('direction', 'desc'),
            'per_page'     => (int) $this->input('per_page', 25),
        ];
    }
}
