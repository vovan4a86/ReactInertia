<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/** Drag&drop-перемещение узла дерева. */
final class ReorderPageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'parent_id' => filled($this->input('parent_id')) ? (int) $this->input('parent_id') : null,
            'index'     => (int) $this->input('index', 0),
        ]);
    }

    public function rules(): array
    {
        return [
            'id'        => ['required', 'integer', 'exists:pages,id'],
            'parent_id' => ['nullable', 'integer', 'exists:pages,id'],
            'index'     => ['required', 'integer', 'min:0'],
        ];
    }
}
