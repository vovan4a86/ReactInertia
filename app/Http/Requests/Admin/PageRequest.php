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
            'parent_id' => filled($this->input('parent_id')) ? (int) $this->input('parent_id') : null,
            'alias'     => filled($this->input('alias')) ? trim((string) $this->input('alias')) : null,
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $page = $this->page();

        return [
            'name'   => ['required', 'string', 'max:255'],
            'h1'     => ['nullable', 'string', 'max:255'],
            'alias'  => [
                'nullable', 'string', 'max:255', 'regex:/^[a-z0-9\-_]+$/i',
                Rule::unique('pages', 'alias')
                    ->where(fn ($q) => $this->input('parent_id') === null
                        ? $q->whereNull('parent_id')
                        : $q->where('parent_id', $this->input('parent_id')))
                    ->ignore($page?->id),
            ],
            'announce'  => ['nullable', 'string'],
            'text'      => ['nullable', 'string'],
            'parent_id' => [
                'nullable', 'integer', 'exists:pages,id',
                function (string $attribute, $value, callable $fail) use ($page): void {
                    if ($page && ! $page->canHaveParent($value)) {
                        $fail('Нельзя выбрать саму страницу или её потомка в качестве родителя.');
                    }
                },
            ],
            'order'          => ['nullable', 'integer', 'min:0'],
            'published'      => ['boolean'],
            'on_main'        => ['boolean'],
            'on_header_menu' => ['boolean'],
            'on_footer_menu' => ['boolean'],
            'on_mobile_menu' => ['boolean'],

            'title'          => ['nullable', 'string', 'max:255'],
            'keywords'       => ['nullable', 'string', 'max:255'],
            'description'    => ['nullable', 'string', 'max:1000'],
            'og_title'       => ['nullable', 'string', 'max:255'],
            'og_description' => ['nullable', 'string', 'max:255'],

            'image'          => ['nullable', 'image', 'max:10240'],
            'image_deleted'  => ['boolean'],
            'images'         => ['nullable', 'array'],
            'images.*'       => ['string'],
            'deleted_images' => ['nullable', 'array'],
            'deleted_images.*' => ['string'],
            'new_images'     => ['nullable', 'array', 'max:10'],
            'new_images.*'   => ['image', 'max:10240'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'name.required' => 'Укажите название страницы.',
            'alias.unique'  => 'Такой alias уже занят внутри этого раздела.',
            'alias.regex'   => 'Alias может содержать только латиницу, цифры, «-» и «_».',
            'new_images.*.image' => 'Каждый файл галереи должен быть изображением.',
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
