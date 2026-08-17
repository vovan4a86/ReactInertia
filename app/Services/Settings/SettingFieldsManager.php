<?php

declare(strict_types=1);

namespace App\Services\Settings;

use App\Enums\SettingType;
use App\Helpers\SettingsThumb;
use App\Models\Setting;

/**
 * Работа с описанием под-полей настройки (params.fields) и с последствиями
 * его изменения для уже сохранённого значения.
 *
 * Проблема, которую решает сервис: params.fields — это объект, ключи которого
 * одновременно являются ключами в сохранённом value. Раньше при переименовании
 * ключа в редакторе полей значение оставалось под старым ключом и «пропадало»,
 * а файлы удалённых полей навсегда оставались на диске.
 */
final class SettingFieldsManager
{
    /** Разрешённые типы под-полей (составные типы вкладывать нельзя). */
    private const ALLOWED_FIELD_TYPES = [
        SettingType::Text,
        SettingType::Textarea,
        SettingType::Editor,
        SettingType::File,
    ];

    public function __construct(private readonly SettingFileManager $files)
    {
    }

    /* -----------------------------------------------------------------
     |  Нормализация params
     | -----------------------------------------------------------------
     */

    /**
     * Привести params к чистой структуре под конкретный тип настройки.
     *
     * fields[key] = ['type' => int, 'title' => string, 'order' => int]
     *
     * `order` добавляется намеренно: JSON-объект не гарантирует порядок ключей
     * (JS переставляет числовые ключи в начало), поэтому порядок полей хранится
     * явно, а не выводится из порядка ключей.
     *
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    public function normalizeParams(SettingType|int|null $type, array $params): array
    {
        $type = $type instanceof SettingType ? $type : SettingType::tryFrom((int) $type);

        if ($type?->hasFields()) {
            return ['fields' => $this->normalizeFields($params['fields'] ?? [])];
        }

        if ($type === SettingType::Gallery) {
            return ['thumbs' => trim((string) ($params['thumbs'] ?? ''))];
        }

        return [];
    }

    /**
     * @param  mixed  $rawFields
     * @return array<string, array{type: int, title: string, order: int}>
     */
    public function normalizeFields(mixed $rawFields): array
    {
        if (!is_array($rawFields)) {
            return [];
        }

        $rows = [];

        foreach ($rawFields as $key => $field) {
            $key = is_string($key) ? trim($key) : (string) $key;

            // Ключ должен быть валидным идентификатором: он используется
            // и как ключ JSON-значения, и в шаблонах на витрине.
            if (!preg_match('/^[a-zA-Z][a-zA-Z0-9_]*$/', $key) || !is_array($field)) {
                continue;
            }

            $fieldType = SettingType::tryFrom((int) ($field['type'] ?? SettingType::Text->value));

            if ($fieldType === null || !in_array($fieldType, self::ALLOWED_FIELD_TYPES, true)) {
                $fieldType = SettingType::Text;
            }

            $rows[$key] = [
                'type'  => $fieldType->value,
                'title' => trim((string) ($field['title'] ?? '')) ?: $key,
                'order' => isset($field['order']) ? (int) $field['order'] : count($rows),
            ];
        }

        // Стабильная сортировка по order + перенумерация.
        uasort($rows, static fn (array $a, array $b) => $a['order'] <=> $b['order']);

        $position = 0;

        foreach ($rows as $key => $field) {
            $rows[$key]['order'] = $position++;
        }

        return $rows;
    }

    /* -----------------------------------------------------------------
     |  Синхронизация значения
     | -----------------------------------------------------------------
     */

    /**
     * Перенести сохранённое значение на новую структуру полей.
     *
     * @param  array<string, array{type: int, title: string, order: int}>  $newFields
     * @param  array<string, string>  $renames Карта [старый ключ => новый ключ]
     */
    public function syncValue(Setting $setting, array $newFields, array $renames = []): void
    {
        if (!$setting->type->hasFields()) {
            return;
        }

        $oldFields = $setting->params['fields'] ?? [];
        $isSingle  = $setting->type === SettingType::Data;

        $rows = $isSingle
            ? (is_array($setting->value) ? [$setting->value] : [])
            : (is_array($setting->value) ? array_values($setting->value) : []);

        if ($rows === []) {
            return;
        }

        // [новый ключ => старый ключ]
        $sources = [];

        foreach (array_keys($newFields) as $newKey) {
            $source = array_search($newKey, $renames, true);
            $sources[$newKey] = is_string($source) ? $source : $newKey;
        }

        $migrated = [];

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $newRow = [];

            foreach ($newFields as $newKey => $config) {
                $oldKey   = $sources[$newKey];
                $oldValue = $row[$oldKey] ?? null;

                $wasFile = (int) ($oldFields[$oldKey]['type'] ?? -1) === SettingType::File->value;
                $isFile  = (int) $config['type'] === SettingType::File->value;

                // Тип поля сменился с файлового: значение (имя файла) бессмысленно.
                if ($wasFile && !$isFile) {
                    $this->files->delete(is_string($oldValue) ? $oldValue : null);
                    $newRow[$newKey] = '';

                    continue;
                }

                if (!$wasFile && $isFile) {
                    $newRow[$newKey] = null;

                    continue;
                }

                $newRow[$newKey] = $oldValue ?? ($isFile ? null : '');
            }

            $migrated[] = $newRow;
        }

        // Файлы полей, которых больше нет в структуре.
        $this->deleteOrphanFiles($rows, $oldFields, array_values($sources));

        $setting->value = $isSingle ? ($migrated[0] ?? []) : $migrated;
    }

    /**
     * Удалить файлы полей, исчезнувших из params.fields.
     *
     * @param  array<int, mixed>  $rows
     * @param  array<string, mixed>  $oldFields
     * @param  list<string>  $keptKeys
     */
    private function deleteOrphanFiles(array $rows, array $oldFields, array $keptKeys): void
    {
        foreach ($oldFields as $key => $config) {
            if (in_array($key, $keptKeys, true)
                || (int) ($config['type'] ?? -1) !== SettingType::File->value
            ) {
                continue;
            }

            foreach ($rows as $row) {
                if (is_array($row) && is_string($row[$key] ?? null)) {
                    $this->files->delete($row[$key]);
                }
            }
        }
    }

    /* -----------------------------------------------------------------
     |  Миниатюры
     | -----------------------------------------------------------------
     */

    /**
     * Пересобрать миниатюры, если изменилась строка params.thumbs.
     *
     * @param  string|null  $oldThumbs Значение params.thumbs ДО сохранения
     */
    public function syncThumbs(Setting $setting, ?string $oldThumbs): void
    {
        if ($setting->type !== SettingType::Gallery) {
            return;
        }

        $new = trim((string) ($setting->params['thumbs'] ?? ''));
        $old = trim((string) $oldThumbs);

        if ($new === $old) {
            return;
        }

        // Старые размеры больше не описаны конфигом — их файлы никто не удалит.
        SettingsThumb::purgeGallery($setting);

        if ($new !== '') {
            SettingsThumb::regenerateGallery($setting);
        }
    }

    /**
     * Карта [ключ => подпись] допустимых типов под-полей — для селекта на фронте.
     *
     * @return array<int, string>
     */
    public static function fieldTypeLabels(): array
    {
        return array_reduce(
            self::ALLOWED_FIELD_TYPES,
            static fn (array $carry, SettingType $type) => $carry + [$type->value => $type->label()],
            []
        );
    }
}
