<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class Setting extends Model
{
    protected $fillable = [
        'setting_group_id', 'code', 'type', 'name',
        'description', 'value', 'params', 'order'
    ];

    protected $casts = [
        'value' => 'json',
        'params' => 'json',
    ];

    public $timestamps = false;

    const UPLOAD_DISK = 'public';
    const UPLOAD_DIR = 'uploads/settings';

    public static $types = [
        0 => 'Текстовое поле',
        1 => 'Текстовая область',
        2 => 'Редактор',
        3 => 'Файл',
        4 => 'Данные',
        5 => 'Список',
        6 => 'Список данных',
        7 => 'Галерея',
    ];

    protected static ?array $_data = null;

    public static function get(string $code, mixed $default = null): mixed
    {
        if (!self::$_data) {
            self::$_data = Cache::remember('settings_data', 3600, function () {
                $data = [];
                $settings = DB::table('settings')
                    ->select('code', 'value', 'type', 'setting_group_id')
                    ->get();

                foreach ($settings as $item) {
                    $data[$item->code] = [
                        'code' => $item->code,
                        'value' => $item->value,
                        'type' => $item->type,
                        'setting_group_id' => $item->setting_group_id,
                    ];
                }

                return $data;
            });
        }

        if (!isset(self::$_data[$code])) {
            return $default;
        }

        $value = self::$_data[$code]['value'];

        // JSON types
        if (in_array(self::$_data[$code]['type'], [4, 5, 6, 7])) {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [];
        }

        return $value;
    }

    public function getFileUrlAttribute(): ?array
    {
        Log::info('123');
        $value = $this->value;

        if (empty($value)) {
            return [];
        }

        // Для типа 6 (ListDataInput) - массив объектов
        if ($this->type === 6 && is_array($value)) {
            $urls = [];
            foreach ($value as $rowIndex => $row) {
                if (is_array($row)) {
                    foreach ($row as $field => $fieldValue) {
                        if (is_string($fieldValue) && $this->isStoredFile($fieldValue)) {
                            if (!isset($urls[$rowIndex])) {
                                $urls[$rowIndex] = [];
                            }
                            $urls[$rowIndex][$field] = asset('storage/' . $fieldValue);
                        }
                    }
                }
            }
            return $urls; // Возвращаем индексированный массив с ключами по индексам
        }

        // Для типа 4 (DataFields) - объект с полями
        if ($this->type === 4 && is_array($value)) {
            $urls = [];
            foreach ($value as $field => $fieldValue) {
                if (is_string($fieldValue) && $this->isStoredFile($fieldValue)) {
                    $urls[$field] = asset('storage/' . $fieldValue); // Ключ - имя поля
                }
            }
            return $urls;
        }

        // Для типа 7 (Gallery) - массив изображений
        if ($this->type === 7 && is_array($value)) {
            $urls = [];
            foreach ($value as $index => $file) {
                if (is_string($file) && !empty($file) && $this->isStoredFile($file)) {
                    $urls[$index] = asset('storage/' . $file);
                }
            }
            return $urls;
        }

        // Для типа 3 (File) - одиночный файл
        if ($this->type === 3 && is_string($value) && $this->isStoredFile($value)) {
            return [$value => asset('storage/' . $value)];
        }

        return [];
    }

    /**
     * Check if value is a stored file (not a marker)
     */
    protected function isStoredFile($value): bool
    {
        if (!is_string($value)) {
            return false;
        }

        // Исключаем маркеры
        if (str_starts_with($value, 'settings.') || str_starts_with($value, 'settings[')) {
            return false;
        }

        // Проверяем, что это похоже на имя файла (содержит расширение)
        return preg_match('/\.[a-zA-Z0-9]{2,4}$/', $value) === 1;
    }

    public static function getFilePath(string $filename): string
    {
        return self::UPLOAD_DIR . '/' . $filename;
    }

    public static function clearCache(): void
    {
        self::$_data = null;
        Cache::forget('settings_data');
    }

    public function group()
    {
        return $this->belongsTo(SettingGroup::class, 'setting_group_id');
    }
}
