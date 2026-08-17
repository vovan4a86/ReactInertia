<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Маркер загружаемого файла.
 *
 * Фронт кладёт в значение настройки строку вида `@upload:<token>`, а сам файл
 * отправляет отдельно в `uploads[<token>]`. Токен уникален и НЕ зависит от
 * индекса элемента, поэтому сортировка/удаление строк не ломают привязку файла.
 */
final class UploadMarker
{
    public const PREFIX = '@upload:';

    /** Является ли значение маркером загрузки. */
    public static function is(mixed $value): bool
    {
        return is_string($value) && str_starts_with($value, self::PREFIX);
    }

    /** Извлечь токен из маркера (или null, если это не маркер). */
    public static function token(mixed $value): ?string
    {
        if (!self::is($value)) {
            return null;
        }

        $token = substr($value, strlen(self::PREFIX));

        // Токен генерируется через crypto.randomUUID() — допускаем только безопасные символы.
        return preg_match('/^[A-Za-z0-9._-]{6,128}$/', $token) === 1 ? $token : null;
    }

    /**
     * Легаси-маркеры старой реализации (`settings[7][0][field]`, `settings.7`).
     * Больше не поддерживаются как источник файла, но должны игнорироваться,
     * чтобы не попасть в БД как «путь к файлу».
     */
    public static function isLegacy(mixed $value): bool
    {
        return is_string($value)
            && (str_starts_with($value, 'settings[') || str_starts_with($value, 'settings.'));
    }
}
