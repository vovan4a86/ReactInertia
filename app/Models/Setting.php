<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

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

    public function getFileUrlAttribute(): ?string
    {
        if (empty($this->value)) {
            return null;
        }

        return Storage::disk(self::UPLOAD_DISK)->url(
            self::UPLOAD_DIR . '/' . $this->value
        );
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
