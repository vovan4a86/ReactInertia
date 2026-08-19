<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\Page;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class MovePageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'parent_id' => filled($this->input('parent_id')) ? (int) $this->input('parent_id') : null,
            'index'     => $this->filled('index') ? max(0, (int) $this->input('index')) : null,
        ]);
    }

    public function rules(): array
    {
        return [
            // Вариант А: точное позиционирование (drag & drop)
            'parent_id' => [
                'nullable', 'integer', 'exists:pages,id',
                function (string $attr, mixed $value, Closure $fail): void {
                    /** @var Page $page */
                    $page = $this->route('page');

                    if ($value && ! $page->canHaveParent((int) $value)) {
                        $fail('Нельзя переместить страницу внутрь себя или своего потомка.');
                    }
                },
            ],
            'index' => ['nullable', 'integer', 'min:0'],

            // Вариант Б: относительный сдвиг (кнопки ↑ / ↓)
            'direction' => ['nullable', Rule::in(['up', 'down', 'top', 'bottom'])],
        ];
    }

    public function messages(): array
    {
        return [
            'parent_id.exists' => 'Родительская страница не найдена.',
            'direction.in'     => 'Неизвестное направление перемещения.',
        ];
    }
}
