<?php

declare(strict_types=1);

namespace App\Helpers;

use App\Models\Setting;
use App\Support\ImageFactory;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Миниатюры изображений настроек.
 *
 * ЕДИНЫЙ КОНТРАКТ: во все методы передаётся путь ОТНОСИТЕЛЬНО диска
 * (`uploads/settings/setting_16_ab12.jpg`), а не голое имя файла.
 * Собирать путь следует через Setting::filePath().
 *
 * Исправлено по сравнению с прежней версией:
 *  - жёстко зашитый драйвер Imagick → авто-выбор через ImageFactory
 *    (без Imagick миниатюры не создавались вообще);
 *  - режим `resize` использовал API Intervention v2 (resize с колбэком
 *    $constraint) → в v3 бросал исключение, миниатюра не создавалась;
 *  - `clone $image` в v3 копирует объект поверхностно: обработка второй
 *    миниатюры шла поверх уже обрезанной первой. Теперь исходник читается
 *    заново для каждого размера;
 *  - save($path, quality: ...) падал для PNG/GIF/BMP (энкодер не принимает
 *    quality) — теперь через ImageFactory::saveTo();
 *  - getFormatByExtension() вычислялся, но никуда не передавался (мёртвый код);
 *  - regenerateGallery() делал json_decode() поверх уже раскастованного
 *    массива (TypeError) и передавал имя файла вместо пути — миниатюры
 *    никогда не перегенерировались;
 *  - диск был захардкожен строкой 'public' вместо Setting::UPLOAD_DISK.
 */
final class SettingsThumb
{
    /** Подкаталог с миниатюрами внутри каталога оригинала. */
    private const DIR = 'thumbs';

    /** Разделитель в имени миниатюры: name_thumb_<key>.ext */
    private const POSTFIX = '_thumb_';

    /** Режимы вписывания. */
    private const MODE_COVER   = 'cover';   // обрезать по центру и заполнить
    private const MODE_RESIZE  = 'resize';  // вписать без апскейла
    private const MODE_CONTAIN = 'contain'; // вписать и добить фоном до размера
    private const MODE_STRETCH = 'stretch'; // растянуть без сохранения пропорций

    private static function disk(): Filesystem
    {
        return Storage::disk(Setting::UPLOAD_DISK);
    }

    /* Пути
    | -----------------------------------------------------------------
    */

    /**
     * Путь миниатюры относительно диска.
     *
     * @param  string      $originalPath Путь оригинала относительно диска
     * @param  string|int  $thumbKey     Ключ конфигурации миниатюры
     */
    public static function url(string $originalPath, string|int $thumbKey): string
    {
        $parts     = pathinfo($originalPath);
        $dirname   = ($parts['dirname'] ?? '.') === '.' ? '' : $parts['dirname'] . '/';
        $extension = $parts['extension'] ?? 'jpg';

        return $dirname
            . self::DIR . '/'
            . $parts['filename']
            . self::POSTFIX . self::safeKey($thumbKey)
            . '.' . $extension;
    }

    /** Ключ миниатюры, безопасный для имени файла. */
    private static function safeKey(string|int $thumbKey): string
    {
        return preg_replace('/[^a-zA-Z0-9_\-]/', '', (string) $thumbKey) ?: '0';
    }

    /* Создание
    | -----------------------------------------------------------------
    */

    /**
     * Создать миниатюры изображения.
     *
     * @param  string                     $originalPath Путь оригинала относительно диска
     * @param  array<string|int, string>  $thumbsConfig ['200x100', 'big' => '400x200|resize']
     * @param  bool                       $force        Пересоздавать уже существующие
     * @return int                                      Сколько миниатюр создано
     */
    public static function make(string $originalPath, array $thumbsConfig, bool $force = false): int
    {
        $storage = self::disk();

        if ($thumbsConfig === [] || !$storage->exists($originalPath) || !ImageFactory::available()) {
            return 0;
        }

        $sourcePath = $storage->path($originalPath);
        $created    = 0;

        foreach ($thumbsConfig as $key => $definition) {
            $size = self::parseSize((string) $definition);

            if ($size === null) {
                continue;
            }

            $thumbPath = self::url($originalPath, $key);

            if (!$force && $storage->exists($thumbPath)) {
                continue;
            }

            $storage->makeDirectory(dirname($thumbPath));

            try {
                // Исходник читается заново для КАЖДОГО размера:
                // clone в Intervention v3 не изолирует внутреннее состояние.
                $image = ImageFactory::read($sourcePath);

                match ($size['mode']) {
                    self::MODE_RESIZE  => $image->scaleDown($size['width'], $size['height']),
                    self::MODE_CONTAIN => $image->contain($size['width'], $size['height'], 'ffffff'),
                    self::MODE_STRETCH => $image->resize($size['width'], $size['height']),
                    default            => $image->cover($size['width'], $size['height']),
                };

                ImageFactory::saveTo($image, $storage->path($thumbPath), Setting::IMAGE_QUALITY);
                $created++;
            } catch (\Throwable $e) {
                Log::error('SettingsThumb: не удалось создать миниатюру', [
                    'original' => $originalPath,
                    'thumb'    => $thumbPath,
                    'config'   => $definition,
                    'error'    => $e->getMessage(),
                ]);
            }
        }

        return $created;
    }

    /* Чтение
    | -----------------------------------------------------------------
    */

    /**
     * URL миниатюры; при отсутствии — попытка создать на лету.
     *
     * @param  array<string|int, string>|null  $thumbsConfig
     */
    public static function get(string $originalPath, string|int $thumbKey, ?array $thumbsConfig = null): ?string
    {
        $storage   = self::disk();
        $thumbPath = self::url($originalPath, $thumbKey);

        if ($storage->exists($thumbPath)) {
            return $storage->url($thumbPath);
        }

        if ($thumbsConfig !== null && isset($thumbsConfig[$thumbKey])) {
            self::make($originalPath, [$thumbKey => $thumbsConfig[$thumbKey]]);

            if ($storage->exists($thumbPath)) {
                return $storage->url($thumbPath);
            }
        }

        return null;
    }

    /**
     * Все миниатюры изображения.
     *
     * @param  array<string|int, string>|null  $thumbsConfig
     * @return array<string|int, array{url: string, config: string, size: array{width:int,height:int,mode:string}}>
     */
    public static function getAll(string $originalPath, ?array $thumbsConfig = null): array
    {
        if (empty($thumbsConfig)) {
            return [];
        }

        $result = [];

        foreach ($thumbsConfig as $key => $definition) {
            $url = self::get($originalPath, $key, $thumbsConfig);

            if ($url !== null) {
                $result[$key] = [
                    'url'    => $url,
                    'config' => (string) $definition,
                    'size'   => self::parseSize((string) $definition) ?? ['width' => 0, 'height' => 0, 'mode' => self::MODE_COVER],
                ];
            }
        }

        return $result;
    }

    /** Существует ли миниатюра. */
    public static function exists(string $originalPath, string|int $thumbKey): bool
    {
        return self::disk()->exists(self::url($originalPath, $thumbKey));
    }

    /* Удаление
     | -----------------------------------------------------------------
     */

    /**
     * Удалить все миниатюры изображения.
     *
     * @return int Сколько файлов удалено
     */
    public static function delete(string $originalPath): int
    {
        $storage = self::disk();
        $parts   = pathinfo($originalPath);

        $dirname   = ($parts['dirname'] ?? '.') === '.' ? '' : $parts['dirname'] . '/';
        $thumbDir  = rtrim($dirname . self::DIR, '/');
        $extension = $parts['extension'] ?? '';

        if (!$storage->exists($thumbDir)) {
            return 0;
        }

        $pattern = '/^'
            . preg_quote($parts['filename'] . self::POSTFIX, '/')
            . '.*'
            . ($extension !== '' ? '\.' . preg_quote($extension, '/') : '')
            . '$/';

        $deleted = 0;

        foreach ($storage->files($thumbDir) as $file) {
            if (preg_match($pattern, basename($file)) && $storage->delete($file)) {
                $deleted++;
            }
        }

        return $deleted;
    }

    /* Работа с настройкой целиком
     | -----------------------------------------------------------------
     */

    /**
     * Пересоздать миниатюры всех изображений галереи.
     * Вызывается после изменения params.thumbs.
     *
     * @return int Сколько миниатюр создано
     */
    public static function regenerateGallery(Setting $setting, bool $force = true): int
    {
        $config = $setting->thumbsConfig();

        if ($config === []) {
            return 0;
        }

        $created = 0;

        // fileValues() уже учитывает тип настройки и отдаёт имена файлов,
        // а filePath() превращает их в путь относительно диска.
        foreach ($setting->fileValues() as $filename) {
            $path = Setting::filePath($filename);

            if ($force) {
                self::delete($path);
            }

            $created += self::make($path, $config, $force);
        }

        return $created;
    }

    /** Удалить миниатюры всех изображений настройки. */
    public static function purgeGallery(Setting $setting): int
    {
        $deleted = 0;

        foreach ($setting->fileValues() as $filename) {
            $deleted += self::delete(Setting::filePath($filename));
        }

        return $deleted;
    }

    /* Конфигурация
     | -----------------------------------------------------------------
     */

    /**
     * Разбор строки конфигурации миниатюр.
     *
     * Поддерживаются оба формата:
     *   "200x100, 400x200|resize"            → [0 => '200x100', 1 => '400x200|resize']
     *   "small:200x100, big:400x200|contain" → ['small' => '200x100', 'big' => '400x200|contain']
     *
     * @return array<string|int, string>
     */
    public static function parseThumbsConfig(?string $thumbsString): array
    {
        if ($thumbsString === null || trim($thumbsString) === '') {
            return [];
        }

        $result = [];
        $index  = 0;

        foreach (explode(',', $thumbsString) as $chunk) {
            $chunk = trim($chunk);

            if ($chunk === '') {
                continue;
            }

            $key = $index;

            // Именованный ключ: "small:200x100". Двоеточие внутри размера невозможно.
            if (str_contains($chunk, ':')) {
                [$name, $chunk] = array_map('trim', explode(':', $chunk, 2));

                if ($name !== '' && $chunk !== '') {
                    $key = preg_replace('/[^a-zA-Z0-9_\-]/', '', $name) ?: $index;
                }
            }

            if (self::parseSize($chunk) === null) {
                continue; // мусорные значения игнорируем, а не роняем генерацию
            }

            $result[$key] = $chunk;

            if (is_int($key)) {
                $index++;
            }
        }

        return $result;
    }

    /**
     * Разбор одного размера: "400x200|resize" → ['width'=>400,'height'=>200,'mode'=>'resize'].
     *
     * @return array{width: int, height: int, mode: string}|null null — некорректная строка
     */
    public static function parseSize(string $definition): ?array
    {
        [$size, $mode] = array_pad(explode('|', trim($definition), 2), 2, self::MODE_COVER);
        [$width, $height] = array_pad(explode('x', strtolower(trim($size)), 2), 2, '0');

        $width  = (int) trim($width);
        $height = (int) trim($height);

        if ($width <= 0 || $height <= 0) {
            return null;
        }

        $mode = strtolower(trim((string) $mode));

        return [
            'width'  => $width,
            'height' => $height,
            'mode'   => in_array($mode, [self::MODE_COVER, self::MODE_RESIZE, self::MODE_CONTAIN, self::MODE_STRETCH], true)
                ? $mode
                : self::MODE_COVER,
        ];
    }

}
