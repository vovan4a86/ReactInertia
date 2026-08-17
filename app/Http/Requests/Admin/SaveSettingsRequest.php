<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Валидация массового сохранения значений настроек группы.
 *
 * Тело запроса (multipart/form-data):
 *   setting_group_id : int
 *   payload          : JSON-строка { "<settingId>": <value> }
 *   uploads[<token>] : файл
 */
class SaveSettingsRequest extends FormRequest
{
    /** Максимальный размер загружаемого файла, КБ. */
    public const MAX_FILE_SIZE = 20480; // 20 MB

    public function authorize(): bool
    {
        return true; // при наличии политик: $this->user()->can('manage', Setting::class)
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'setting_group_id' => ['required', 'integer', Rule::exists('setting_groups', 'id')],
            'payload'          => ['required', 'string', 'json'],
            'uploads'          => ['sometimes', 'array'],
            'uploads.*'        => ['file', 'max:' . self::MAX_FILE_SIZE],
        ];
    }

    /**
     * Декодированный payload.
     *
     * @return array<array-key, mixed>
     */
    public function payload(): array
    {
        $decoded = json_decode((string) $this->input('payload'), true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Файлы, ключ — токен маркера.
     *
     * @return array<string, \Illuminate\Http\UploadedFile>
     */
    public function uploads(): array
    {
        $uploads = $this->file('uploads', []);

        return is_array($uploads) ? array_filter($uploads, static fn ($f) => $f !== null) : [];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'payload.json'  => 'Некорректный формат данных формы.',
            'uploads.*.max' => 'Размер файла не должен превышать :max КБ.',
        ];
    }
}
