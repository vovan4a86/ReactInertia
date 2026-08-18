<?php

declare(strict_types=1);

namespace App\Services\Settings;

use App\Casts\SettingValueCast;
use App\Enums\SettingType;
use App\Models\Setting;
use App\Support\HtmlSanitizer;
use App\Support\UploadMarker;
use Illuminate\Http\UploadedFile;

/**
 * Применение пришедшего с фронта значения к настройке.
 *
 * Контракт запроса (единый для всех типов):
 *   payload           — JSON-строка вида { "<settingId>": <value>, ... }
 *   uploads[<token>]  — сам файл, где <token> взят из маркера "@upload:<token>"
 *
 * Благодаря токенам порядок элементов и удаление строк больше не ломают
 * привязку файлов (раньше ключ содержал индекс: settings[7][0][field]).
 */
final class SettingValueProcessor
{
    public function __construct(private readonly SettingFileManager $files)
    {
    }

    /**
     * Записать новое значение настройки и подчистить неиспользуемые файлы.
     *
     * @param  mixed                          $incoming Значение из payload
     * @param  array<string, UploadedFile>    $uploads  Файлы, ключ — токен
     */
    public function apply(Setting $setting, mixed $incoming, array $uploads): void
    {
        $oldFiles = $setting->fileValues();

        $setting->value = match ($setting->type) {
            SettingType::Text       => HtmlSanitizer::plain($this->toStringOrNull($incoming)),
            SettingType::Textarea   => $this->toStringOrNull($incoming) ?? '',
            SettingType::Editor     => HtmlSanitizer::clean($this->toStringOrNull($incoming)),
            SettingType::File       => $this->processFile($setting, $incoming, $uploads, $oldFiles),
            SettingType::Data       => $this->processData($setting, $incoming, $uploads, $oldFiles),
            SettingType::ListSimple => $this->processSimpleList($incoming),
            SettingType::ListData   => $this->processListData($setting, $incoming, $uploads, $oldFiles),
            SettingType::Gallery    => $this->processGallery($setting, $incoming, $uploads, $oldFiles),
            SettingType::Boolean    => SettingValueCast::toBool($incoming),
        };

        $setting->save();

        $withThumbs = $setting->type === SettingType::Gallery;
        $this->files->deleteMissing($oldFiles, $setting->fileValues(), $withThumbs);

        if ($withThumbs) {
            $this->files->makeThumbs($setting);
        }
    }

    /* -----------------------------------------------------------------
     |  Обработчики типов
     | -----------------------------------------------------------------
     */

    /** Тип 3 — одиночный файл. */
    private function processFile(Setting $setting, mixed $incoming, array $uploads, array $known): ?string
    {
        return $this->resolveFile(
            $setting,
            $incoming,
            $known[0] ?? null,
            $uploads,
            $known,
            stableName: true
        );
    }

    /**
     * Тип 4 — объект с фиксированным набором полей (params.fields).
     *
     * @return array<string, mixed>
     */
    private function processData(Setting $setting, mixed $incoming, array $uploads, array $known): array
    {
        $incoming = $this->toArray($incoming);
        $old      = is_array($setting->value) ? $setting->value : [];

        return $this->processRow($setting, $incoming, $old, $uploads, $known);
    }

    /**
     * Тип 5 — простой список строк.
     *
     * @return list<string>
     */
    private function processSimpleList(mixed $incoming): array
    {
        $items = array_map(
            static fn ($item) => is_scalar($item) ? trim((string) $item) : '',
            $this->toArray($incoming)
        );

        return array_values(array_filter($items, static fn (string $item) => $item !== ''));
    }

    /**
     * Тип 6 — список объектов (повторитель).
     *
     * @return list<array<string, mixed>>
     */
    private function processListData(Setting $setting, mixed $incoming, array $uploads, array $known): array
    {
        $rows    = array_values($this->toArray($incoming));
        $oldRows = is_array($setting->value) ? array_values($setting->value) : [];

        // Старые строки сопоставляем по значению файла, а не по индексу:
        // после сортировки индексы уже не совпадают.
        $result = [];

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $processed = $this->processRow($setting, $row, $this->matchOldRow($row, $oldRows), $uploads, $known);

            // Пустые строки не сохраняем
            if ($this->isEmptyRow($processed)) {
                continue;
            }

            $result[] = $processed;
        }

        return $result;
    }

    /**
     * Тип 7 — галерея. Порядок берём строго из payload (индексы больше не участвуют).
     *
     * @return list<string>
     */
    private function processGallery(Setting $setting, mixed $incoming, array $uploads, array $known): array
    {
        $items  = $this->toArray($incoming);
        $result = [];

        foreach ($items as $item) {
            if ($token = UploadMarker::token($item)) {
                $file = $uploads[$token] ?? null;

                if ($file instanceof UploadedFile) {
                    $result[] = $this->files->store($file, $setting);
                }

                continue; // маркер без файла — просто пропускаем позицию
            }

            // В галерею допускаются только уже известные файлы этой настройки
            if (is_string($item) && $item !== '' && in_array($item, $known, true)) {
                $result[] = $item;
            }
        }

        return array_values(array_unique($result));
    }

    /* -----------------------------------------------------------------
     |  Общие помощники
     | -----------------------------------------------------------------
     */

    /**
     * Обработать одну «строку данных» по описанию params.fields.
     * Лишние (не описанные в params) ключи отбрасываются.
     *
     * @param  array<string, mixed>  $row
     * @param  array<string, mixed>  $oldRow
     * @return array<string, mixed>
     */
    private function processRow(Setting $setting, array $row, array $oldRow, array $uploads, array $known): array
    {
        $fields = $setting->params['fields'] ?? [];
        $result = [];

        foreach ($fields as $key => $config) {
            $type    = SettingType::tryFrom((int) ($config['type'] ?? 0)) ?? SettingType::Text;
            $value   = $row[$key] ?? null;
            $oldFile = is_string($oldRow[$key] ?? null) ? $oldRow[$key] : null;

            $result[$key] = match ($type) {
                SettingType::File     => $this->resolveFile($setting, $value, $oldFile, $uploads, $known),
                SettingType::Editor   => HtmlSanitizer::clean($this->toStringOrNull($value)),
                SettingType::Textarea => $this->toStringOrNull($value) ?? '',
                SettingType::Boolean  => SettingValueCast::toBool($value),
                default               => HtmlSanitizer::plain($this->toStringOrNull($value)),
            };
        }

        return $result;
    }

    /**
     * Единая логика разрешения файлового значения.
     *
     * 1. `@upload:token` → сохраняем новый файл;
     * 2. null / ''       → файл очищен;
     * 3. известное имя   → оставляем как есть;
     * 4. всё остальное   → игнорируем (защита от подстановки чужих путей).
     *
     * @param  array<string, UploadedFile>  $uploads
     * @param  list<string>                 $known
     */
    private function resolveFile(
        Setting $setting,
        mixed $value,
        ?string $oldFile,
        array $uploads,
        array $known,
        bool $stableName = false
    ): ?string {
        if ($token = UploadMarker::token($value)) {
            $file = $uploads[$token] ?? null;

            return $file instanceof UploadedFile
                ? $this->files->store($file, $setting, $stableName)
                : $oldFile; // файл не долетел — не теряем старый
        }

        if ($value === null || $value === '' || UploadMarker::isLegacy($value)) {
            return null;
        }

        return is_string($value) && in_array($value, $known, true) ? $value : $oldFile;
    }

    /**
     * Найти прежнюю версию строки, чтобы не потерять файл при неудачной загрузке.
     * Сопоставление по любому совпадающему файловому значению.
     *
     * @param  array<string, mixed>              $row
     * @param  list<array<string, mixed>>        $oldRows
     * @return array<string, mixed>
     */
    private function matchOldRow(array $row, array $oldRows): array
    {
        $strings = array_filter($row, static fn ($v) => is_string($v) && $v !== '');

        foreach ($oldRows as $oldRow) {
            if (!is_array($oldRow)) {
                continue;
            }

            foreach ($strings as $key => $value) {
                if (($oldRow[$key] ?? null) === $value) {
                    return $oldRow;
                }
            }
        }

        return [];
    }

    /**
     * Считается ли строка повторителя пустой (такие не сохраняются).
     *
     * ВАЖНО: false у флажка — это «не заполнено». Без явной проверки строка
     * с одними лишь выключенными флажками считалась бы заполненной
     * (false !== null && false !== ''), и повторитель копил бы пустые строки.
     *
     * @param array<string, mixed> $row
     */
    private function isEmptyRow(array $row): bool
    {
        foreach ($row as $value) {
            $filled = match (true) {
                is_bool($value)  => $value,
                is_array($value) => $value !== [],
                default          => $value !== null && $value !== '',
            };

            if ($filled) {
                return false;
            }
        }

        return true;
    }

    /**
     * Нормализация в массив: принимаем и массив, и JSON-строку
     * (последнее — чтобы пережить legacy-клиентов и multipart-квирки).
     *
     * @return array<array-key, mixed>
     */
    private function toArray(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (is_string($value) && $value !== '') {
            $decoded = json_decode($value, true);

            return is_array($decoded) ? $decoded : [];
        }

        return [];
    }

    private function toStringOrNull(mixed $value): ?string
    {
        return is_scalar($value) ? (string) $value : null;
    }
}
