<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\Page;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Базовые правила для create/update страницы. */
abstract class PageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // доступ уже ограничен middleware 'admin'
    }

    /** Страница, которую редактируем (null при создании). */
    protected function page(): ?Page
    {
        return $this->route('page');
    }

    /** Нормализация payload из FormData: '' → null, строки → bool. */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'parent_id' => filled($this->input('parent_id')) ? (int)$this->input('parent_id') : null,
            'alias' => filled($this->input('alias')) ? trim((string)$this->input('alias')) : null,
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $page = $this->page();

        return [
            'name' => ['required', 'string', 'max:255'],
            'h1' => ['nullable', 'string', 'max:255'],
            'alias' => [
                'nullable',
                'string',
                'max:255',
                'regex:/^[a-z0-9\-_]+$/i',
                // Unique в рамках одной ветки (не глобально), исключая себя
                Rule::unique('pages', 'alias')
                    ->where(fn($q) => $this->input('parent_id') === null
                        ? $q->whereNull('parent_id')
                        : $q->where('parent_id', $this->input('parent_id')))
                    ->ignore($page?->id),
            ],
            'announce' => ['nullable', 'string'],
            'text' => ['nullable', 'string'],

            /* ── Иерархия ── */
            'parent_id'   => [
                'nullable',
                'integer',
                'exists:pages,id',
                // Нельзя назначить себя или потомка родителем
                function (string $attribute, mixed $value, \Closure $fail) use ($page): void {
                    if ($value && !$page->canHaveParent((int) $value)) {
                        $fail('Нельзя назначить страницу или её потомка родителем.');
                    }
                },
            ],
            'order' => ['nullable', 'integer', 'min:0'],

            /* ── Публикация и меню ── */
            'published' => ['boolean'],
            'on_main' => ['boolean'],
            'on_header_menu' => ['boolean'],
            'on_footer_menu' => ['boolean'],
            'on_mobile_menu' => ['boolean'],

            /* ── SEO ── */
            'title' => ['nullable', 'string', 'max:255'],
            'keywords' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'og_title' => ['nullable', 'string', 'max:255'],
            'og_description' => ['nullable', 'string', 'max:255'],

            /* ── Одиночное изображение ── */
            'image' => ['nullable', 'image', 'max:10240'],
            'image_deleted' => ['nullable', Rule::in([0, 1, '0', '1'])],

            /* ── Галерея ────────────────────────────────────────────────
             *
             * images[]         — строки: имена/пути существующих фото в новом порядке
             * deleted_images[] — строки: имена фото для удаления
             * new_images[]     — файлы: новые загружаемые фото
             *
             * КРИТИЧНО: new_images.* — image, а НЕ просто new_images => image.
             * * ─────────────────────────────────────────────────────────── */
            'images'            => ['nullable', 'array'],
            'images.*'          => ['nullable', 'string'],

            'deleted_images'    => ['nullable', 'array'],
            'deleted_images.*'  => ['nullable', 'string'],

            'new_images'        => ['nullable', 'array', 'max:10'],
            'new_images.*'      => ['image', 'max:10240'],  // ← каждый элемент = файл
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'name.required'          => 'Название обязательно.',
            'alias.regex'            => 'Alias может содержать только строчные латинские буквы, цифры и дефисы.',
            'alias.unique'           => 'Такой alias уже занят в этой ветке.',
            'parent_id.exists'       => 'Выбранная родительская страница не существует.',
            'image.image'            => 'Главное фото должно быть изображением.',
            'image.max'              => 'Главное фото не может быть больше 10 MB.',
            'new_images.max'         => 'Нельзя загрузить больше 10 изображений.',
            'new_images.*.image'     => 'Каждый файл галереи должен быть изображением.',
            'new_images.*.max'       => 'Каждое изображение не может быть больше 10 MB.',
        ];
    }

    /** Только поля модели (без файлов и служебных ключей). */
    public function pageAttributes(): array
    {
        return collect($this->validated())
            ->except(['image', 'image_deleted', 'images', 'deleted_images', 'new_images'])
            ->all();
    }
}
