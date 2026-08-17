<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\SettingType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Валидация создания/редактирования самой настройки (не её значения).
 */
class SettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $id = $this->route('id');

        return [
            'name'             => ['required', 'string', 'max:255'],
            'code'             => [
                'required', 'string', 'max:255', 'regex:/^[a-z0-9_\-.]+$/i',
                Rule::unique('settings', 'code')->ignore($id),
            ],
            'type'             => ['required', 'integer', Rule::enum(SettingType::class)],
            'setting_group_id' => ['required', 'integer', Rule::exists('setting_groups', 'id')],
            'description'      => ['nullable', 'string', 'max:1000'],
            'order'            => ['nullable', 'integer', 'min:0', 'max:9999'],
            'params'           => ['nullable', 'array'],
            'params.thumbs'    => ['nullable', 'string', 'max:255'],
            'params.fields'    => ['nullable', 'array'],
            'params.fields.*.type'  => ['required_with:params.fields', 'integer', Rule::enum(SettingType::class)],
            'params.fields.*.title' => ['nullable', 'string', 'max:255'],
        ];
    }

    /** Нормализация данных до валидации (FormData присылает всё строками). */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'type'  => (int) $this->input('type', 0),
            'order' => $this->filled('order') ? (int) $this->input('order') : 0,
        ]);
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.regex'  => 'Системный ключ может содержать только латиницу, цифры, «_», «-» и «.».',
            'code.unique' => 'Настройка с таким системным ключом уже существует.',
        ];
    }
}
