<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\SettingType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Validation\Rule;

/**
 * Валидация создания/редактирования самой настройки (не её значения).
 */
class SettingRequest extends FormRequest
{
    /** Ключ поля: латиница, цифры, подчёркивание; начинается с буквы. */
    public const FIELD_KEY_PATTERN = '/^[a-zA-Z][a-zA-Z0-9_]*$/';

    /** Типы, допустимые для под-полей составных настроек. */
    private const FIELD_TYPES = [
        SettingType::Text->value,
        SettingType::Textarea->value,
        SettingType::Editor->value,
        SettingType::File->value,
        SettingType::Boolean->value,
    ];

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

            'params'                => ['nullable', 'array'],
            'params.thumbs'         => ['nullable', 'string', 'max:255'],
            'params.fields'         => ['nullable', 'array', 'max:50'],
            'params.fields.*'       => ['array'],
            'params.fields.*.type'  => ['required', 'integer', Rule::in(self::FIELD_TYPES)],
            'params.fields.*.title' => ['nullable', 'string', 'max:255'],
            'params.fields.*.order' => ['nullable', 'integer', 'min:0'],

            // [старый ключ => новый ключ] — чтобы не потерять сохранённые значения
            'field_renames'   => ['nullable', 'array', 'max:50'],
            'field_renames.*' => ['string', 'regex:' . self::FIELD_KEY_PATTERN],
        ];
    }

    /** Нормализация данных до валидации (FormData присылает всё строками). */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'type'          => (int) $this->input('type', 0),
            'order'         => $this->filled('order') ? (int) $this->input('order') : 0,
            'params'        => $this->decodeArray('params'),
            'field_renames' => $this->decodeArray('field_renames'),
        ]);
    }

    /**
     * Дополнительная проверка ключей полей: правила Laravel не применяются
     * к именам ключей массива, поэтому валидируем их вручную.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $fields = $this->input('params.fields');

            if (!is_array($fields)) {
                return;
            }

            foreach (array_keys($fields) as $key) {
                if (!is_string($key) || !preg_match(self::FIELD_KEY_PATTERN, $key)) {
                    $validator->errors()->add(
                        'params',
                        sprintf('Некорректный ключ поля «%s»: только латиница, цифры и «_», начиная с буквы.', $key)
                    );
                }
            }
        });
    }

    /**
     * Нормализованные params.
     *
     * @return array<string, mixed>
     */
    public function params(): array
    {
        $params = $this->input('params');

        return is_array($params) ? $params : [];
    }

    /**
     * Карта переименований полей: [старый ключ => новый ключ].
     *
     * @return array<string, string>
     */
    public function fieldRenames(): array
    {
        $renames = $this->input('field_renames');

        if (!is_array($renames)) {
            return [];
        }

        $result = [];

        foreach ($renames as $from => $to) {
            if (is_string($from) && is_string($to) && $from !== '' && $to !== '' && $from !== $to) {
                $result[$from] = $to;
            }
        }

        return $result;
    }

    /**
     * Разобрать поле, которое могло прийти JSON-строкой (FormData) или массивом.
     *
     * @return array<array-key, mixed>
     */
    private function decodeArray(string $key): array
    {
        $value = $this->input($key);

        if (is_string($value)) {
            $decoded = json_decode($value, true);

            return is_array($decoded) ? $decoded : [];
        }

        return is_array($value) ? $value : [];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.regex'              => 'Системный ключ может содержать только латиницу, цифры, «_», «-» и «.».',
            'code.unique'             => 'Настройка с таким системным ключом уже существует.',
            'params.fields.*.type.in' => 'Недопустимый тип поля: вложенные составные типы не поддерживаются.',
            'params.fields.max'       => 'Слишком много полей (максимум 50).',
            'field_renames.*.regex'   => 'Некорректный новый ключ поля.',
        ];
    }
}
