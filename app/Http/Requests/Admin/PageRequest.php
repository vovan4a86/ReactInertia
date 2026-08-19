<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\Page;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Базовые правила для create/update страницы. */
abstract class PageRequest extends FormRequest
{
    private const MAX_IMAGE_KB = 10240;
    private const MAX_GALLERY  = 10;

    public function authorize(): bool
    {
        return true; // доступ уже ограничен middleware 'admin'
    }

    /** Страница, которую редактируем (null при создании). */
    protected function page(): ?Page
    {
        $page = $this->route('page');

        return $page instanceof Page ? $page : null;
    }

    /** Нормализация payload из FormData: '' → null, строки → bool. */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'parent_id' => filled($this->input('parent_id')) ? (int) $this->input('parent_id') : null,
            'alias'     => filled($this->input('alias')) ? trim((string) $this->input('alias')) : null,
            // Приводим к массивам — фронт может не прислать ключ вовсе
            'images'         => (array) $this->input('images', []),
            'deleted_images' => (array) $this->input('deleted_images', []),
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $page = $this->page();
        $parentId = $this->input('parent_id');

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
                    ->where(fn ($q) => $parentId === null
                        ? $q->whereNull('parent_id')
                        : $q->where('parent_id', $parentId))
                    ->whereNull('deleted_at')
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
            'image'         => ['nullable', 'file', 'image', 'max:' . self::MAX_IMAGE_KB],
            'image_deleted' => ['nullable', 'boolean'],

            /* ── Галерея ────────────────────────────────────────────────
             *
             * images[]         — строки: имена/пути существующих фото в новом порядке
             * deleted_images[] — строки: имена фото для удаления
             * new_images[]     — файлы: новые загружаемые фото
             *
             * КРИТИЧНО: new_images.* — image, а НЕ просто new_images => image.
             * * ─────────────────────────────────────────────────────────── */
            'images'           => ['array', 'max:' . self::MAX_GALLERY],
            'images.*'         => ['string', 'max:255'],

            'deleted_images'   => ['array'],
            'deleted_images.*' => ['string', 'max:255'],

            'new_images'       => ['nullable', 'array', 'max:' . self::MAX_GALLERY],
            'new_images.*'     => ['file', 'image', 'max:' . self::MAX_IMAGE_KB],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'name.required'      => 'Название обязательно.',
            'alias.regex'        => 'Alias может содержать только латинские буквы, цифры, дефис и подчёркивание.',
            'alias.unique'       => 'Такой alias уже занят в этой ветке.',
            'parent_id.exists'   => 'Выбранная родительская страница не существует.',
            'image.image'        => 'Главное фото должно быть изображением.',
            'image.max'          => 'Главное фото не может быть больше 10 MB.',
            'images.max'         => 'В галерее не может быть больше ' . self::MAX_GALLERY . ' изображений.',
            'new_images.max'     => 'Нельзя загрузить больше ' . self::MAX_GALLERY . ' изображений за раз.',
            'new_images.*.image' => 'Каждый файл галереи должен быть изображением.',
            'new_images.*.max'   => 'Каждое изображение не может быть больше 10 MB.',
        ];
    }

    /** Только поля модели (без файлов и служебных ключей). */
    public function pageAttributes(): array
    {
        return collect($this->safe()->except([
            'image', 'image_deleted', 'images', 'deleted_images', 'new_images',
        ]))->all();
    }

    /** Единая точка сборки payload изображений для PageService. */
    public function imagePayload(): array
    {
        return [
            'image'         => $this->file('image'),
            'image_deleted' => $this->boolean('image_deleted'),
            'order'         => $this->validated('images', []),
            'deleted'       => $this->validated('deleted_images', []),
            'new_images'    => $this->file('new_images', []),
        ];
    }
}
