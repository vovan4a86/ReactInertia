<?php

declare(strict_types=1);

namespace App\Casts;

use App\Enums\SettingType;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;


/**
 * Типозависимый каст значения настройки.
 *
 * Кодирование/декодирование выполняется ровно один раз и только для
 * JSON-типов (4,5,6,7). Текстовые типы (0,1,2) и файл (3) хранятся как есть.
 *
 * @implements CastsAttributes<mixed, mixed>
 */
final class SettingValueCast implements CastsAttributes
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function get(Model $model, string $key, mixed $value, array $attributes): mixed
    {
        return self::decode($value, $attributes['type'] ?? null);
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): array
    {
        if (is_array($value)) {
            return [$key => json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)];
        }

        // Логический тип хранится как '1' / '0'.
        // Без этой ветки (string) false дало бы '' — значение стало бы
        // «пустым», и Setting::get('flag', true) вернул бы default вместо false.
        if (is_bool($value)) {
            return [$key => $value ? '1' : '0'];
        }

        return [$key => $value === null ? null : (string) $value];
    }

    /**
     * Декодировать «сырое» значение из БД с учётом типа настройки.
     * Используется и моделью, и статическим кэшем Setting::get().
     */
    public static function decode(mixed $value, int|string|null $type): mixed
    {
        if (!SettingType::isJsonType($type)) {
            return $value;
        }

        if (is_array($value)) {
            return $value;
        }

        if (!is_string($value) || $value === '') {
            return [];
        }

        $decoded = json_decode($value, true);

        // Защита от легаси двойного кодирования: "\"[...]\"" → "[...]" → [...]
        if (is_string($decoded)) {
            $decoded = json_decode($decoded, true);
        }

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Привести любое «сырое» представление флага к bool.
     * Принимаются '1'/'0', 'true'/'false', 'on', 'yes', null.
     */
    public static function toBool(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if ($value === null || $value === '') {
            return false;
        }

        return filter_var($value, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE) ?? (bool) $value;
    }
}

