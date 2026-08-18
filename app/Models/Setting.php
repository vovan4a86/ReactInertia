<?php

declare(strict_types=1);

namespace App\Models;

use App\Casts\SettingValueCast;
use App\Enums\SettingType;
use App\Helpers\SettingsThumb;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property int $setting_group_id
 * @property string $code
 * @property SettingType $type
 * @property string $name
 * @property string|null $description
 * @property mixed $value   // string|array|null — зависит от типа
 * @property array<string, mixed> $params
 * @property int $order
 */
class Setting extends Model
{
    public const UPLOAD_DISK = 'public';
    public const UPLOAD_DIR = 'uploads/settings';
    public const IMAGE_QUALITY = 90;
    public const CACHE_KEY = 'settings_data';
    public const CACHE_TTL = 3600;

    public $timestamps = false;

    protected $fillable = [
        'setting_group_id',
        'code',
        'type',
        'name',
        'description',
        'value',
        'params',
        'order'
    ];

    /** Статический кэш процесса (чтобы не дёргать Cache на каждый Setting::get()). */
    protected static ?array $cachedData = null;

    /**
     * Современный способ объявления кастов (метод, а не свойство).
     *
     * @return array<string, mixed>
     */
    protected function casts(): array
    {
        return [
            'setting_group_id' => 'integer',
            'order' => 'integer',
            'type' => SettingType::class,
            'params' => 'array',
            'value' => SettingValueCast::class,
        ];
    }

    protected static function booted(): void
    {
        // Кэш настроек всегда актуален — не нужно помнить про clearCache() в контроллерах.
        static::saved(static fn() => static::clearCache());
        static::deleted(static fn() => static::clearCache());
    }

    /* Отношения и скоупы
    | ----------------------------------------------------
    */

    public function group(): BelongsTo
    {
        return $this->belongsTo(SettingGroup::class, 'setting_group_id');
    }

    /** @param Builder<self> $query */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('order')->orderBy('id');
    }

    /* Быстрый доступ к значениям
    | ----------------------------------------------------
    */

    /**
     * Получить значение настройки по коду.
     *
     * @param string $code Системный ключ настройки
     * @param mixed $default Значение по умолчанию, если настройка не найдена
     */
    public static function get(string $code, mixed $default = null): mixed
    {
        self::$cachedData ??= Cache::remember(
            self::CACHE_KEY,
            self::CACHE_TTL,
            static fn(): array => DB::table('settings')
                ->select('code', 'value', 'type', 'setting_group_id')
                ->get()
                ->keyBy('code')
                ->map(static fn($row) => [
                    'value' => $row->value,
                    'type' => (int)$row->type,
                ])
                ->all()
        );

        if (!isset(self::$cachedData[$code])) {
            return $default;
        }

        $row = self::$cachedData[$code];
        $value = SettingValueCast::decode($row['value'], $row['type']);

        return $value === null || $value === '' ? ($default ?? $value) : $value;
    }

    /**
     * Получить значение настройки типа «Флажок».
     *
     * @example if (Setting::bool('maintenance_mode')) { ... }
     */
    public static function bool(string $code, bool $default = false): bool
    {
        $value = self::get($code);

        return $value === null ? $default : SettingValueCast::toBool($value);
    }

    /** Сбросить кэш настроек (процесса и Cache-хранилища). */
    public static function clearCache(): void
    {
        self::$cachedData = null;
        Cache::forget(self::CACHE_KEY);
    }

    /* Файлы
    | ----------------------------------------------------
    */

    /** Путь файла настройки относительно диска (storage/app/public/...). */
    public static function filePath(string $filename): string
    {
        return self::UPLOAD_DIR . '/' . ltrim($filename, '/');
    }

    /** Публичный URL файла настройки. */
    public static function fileUrl(?string $filename): ?string
    {
        return $filename
            ? Storage::disk(self::UPLOAD_DISK)->url(self::filePath($filename))
            : null;
    }

    /**
     * Плоская карта [имя файла => URL] по всем файлам настройки.
     * Используется фронтом: поиск по значению
     *
     * @return array<string, string>
     */
    public function fileUrlMap(): array
    {
        $map = [];

        foreach ($this->fileValues() as $filename) {
            $map[$filename] = self::fileUrl($filename);
        }

        return $map;
    }

    /**
     * Все значения-файлы настройки (с учётом типа и params.fields).
     *
     * @return list<string>
     */
    public function fileValues(): array
    {
        $value = $this->value;

        return match ($this->type) {
            SettingType::File => is_string($value) && $value !== '' ? [$value] : [],

            SettingType::Gallery => array_values(
                array_filter(
                    is_array($value) ? $value : [],
                    static fn($item) => is_string($item) && $item !== ''
                )
            ),

            SettingType::Data => $this->extractFieldFiles(is_array($value) ? [$value] : []),

            SettingType::ListData => $this->extractFieldFiles(is_array($value) ? $value : []),

            default => [],
        };
    }

    /**
     * Вытащить файловые поля (type === 3) из набора строк.
     *
     * @param array<int, mixed> $rows
     * @return list<string>
     */
    protected function extractFieldFiles(array $rows): array
    {
        $fields = $this->params['fields'] ?? [];
        $files = [];

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            foreach ($fields as $key => $config) {
                $item = $row[$key] ?? null;

                if ((int)($config['type'] ?? -1) === SettingType::File->value
                    && is_string($item) && $item !== ''
                ) {
                    $files[] = $item;
                }
            }
        }

        return array_values(array_unique($files));
    }

    /* Миниатюры галереи
    | ----------------------------------------------------
    */

    /** Конфигурация миниатюр из params.thumbs. */
    public function thumbsConfig(): array
    {
        return SettingsThumb::parseThumbsConfig($this->params['thumbs'] ?? '');
    }

    /**
     * URL миниатюры изображения галереи.
     *
     * @param  string|int  $index    Индекс изображения в галерее
     * @param  string|int  $thumbKey Ключ конфигурации миниатюры
     */
    public function thumb(string|int $index, string|int $thumbKey = 0): ?string
    {
        $images = $this->type === SettingType::Gallery && is_array($this->value) ? $this->value : [];
        $path   = $images[$index] ?? null;

        if (!is_string($path) || $path === '') {
            return null;
        }

        $config = $this->thumbsConfig();

        return isset($config[$thumbKey])
            ? SettingsThumb::get(self::filePath($path), $thumbKey, $config)
            : null;
    }

    /**
     * Все миниатюры одного изображения галереи.
     *
     * @return array<string|int, string>
     */
    public function thumbs(string|int $index): array
    {
        $images = $this->type === SettingType::Gallery && is_array($this->value) ? $this->value : [];
        $path   = $images[$index] ?? null;

        if (!is_string($path) || $path === '') {
            return [];
        }

        return SettingsThumb::getAll(self::filePath($path), $this->thumbsConfig());
    }

    /**
     * Галерея вместе с миниатюрами — удобно для вывода на витрине.
     *
     * @return list<array{original: string, path: string, thumbs: array}>
     */
    public function getGalleryWithThumbsAttribute(): array
    {
        if ($this->type !== SettingType::Gallery) {
            return [];
        }

        $config = $this->thumbsConfig();

        return array_values(array_map(
            fn (string $path) => [
                'original' => self::fileUrl($path),
                'path'     => self::filePath($path),
                'thumbs'   => SettingsThumb::getAll(self::filePath($path), $config),
            ],
            $this->fileValues()
        ));
    }

}
