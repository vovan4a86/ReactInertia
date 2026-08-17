<?php

declare(strict_types=1);

namespace App\Support;

use Intervention\Image\Image;
use Intervention\Image\ImageManager;
use Intervention\Image\Interfaces\ImageInterface;

/**
 * Единая точка создания ImageManager и безопасного сохранения изображений.
 *
 * Зачем нужен отдельный класс:
 *  1. Драйвер выбирался по-разному в разных местах (SettingsThumb — Imagick,
 *     SettingFileManager — Gd). Если Imagick не установлен, миниатюры молча
 *     не создавались. Теперь драйвер определяется один раз и автоматически.
 *  2. Intervention Image v3 передаёт опции save() прямо в конструктор энкодера.
 *     PngEncoder/GifEncoder/BmpEncoder НЕ принимают `quality` — вызов
 *     `save($path, quality: 90)` для PNG падал с ошибкой «Unknown named parameter».
 *     saveTo() передаёт quality только тем форматам, которые его поддерживают.
 */
final class ImageFactory
{
    /** Форматы, у которых энкодер принимает параметр quality. */
    private const QUALITY_FORMATS = ['jpg', 'jpeg', 'jfif', 'webp', 'avif', 'heic', 'heif'];

    private static ?ImageManager $manager = null;

    /**
     * ImageManager с наилучшим доступным драйвером.
     * Imagick предпочтительнее: лучше качество ресайза и поддержка avif/heic.
     */
    public static function manager(): ImageManager
    {
        return self::$manager ??= new ImageManager(self::driver());
    }

    /** Доступна ли вообще работа с изображениями. */
    public static function available(): bool
    {
        return class_exists(ImageManager::class)
            && (extension_loaded('imagick') || extension_loaded('gd'));
    }

    /**
     * Класс драйвера. Отдельным методом — чтобы его можно было переопределить
     * конфигом (`config('image.driver')`), не трогая код.
     *
     * @return class-string
     */
    public static function driver(): string
    {
        $configured = config('image.driver');

        if (is_string($configured) && class_exists($configured)) {
            return $configured;
        }

        return extension_loaded('imagick')
            ? \Intervention\Image\Drivers\Imagick\Driver::class
            : \Intervention\Image\Drivers\Gd\Driver::class;
    }

    /** Прочитать изображение с диска. */
    public static function read(string $absolutePath): ImageInterface
    {
        return self::manager()->decode($absolutePath);
    }

    /**
     * Сохранить изображение, корректно обработав quality.
     *
     * @param  string  $absolutePath Абсолютный путь (формат определяется по расширению)
     * @param  int     $quality      Качество 1..100 — применяется только к jpg/webp/avif/heic
     */
    public static function saveTo(ImageInterface|Image $image, string $absolutePath, int $quality = 90): void
    {
        $extension = strtolower(pathinfo($absolutePath, PATHINFO_EXTENSION));

        if (in_array($extension, self::QUALITY_FORMATS, true)) {
            $image->save($absolutePath, quality: max(1, min(100, $quality)));

            return;
        }

        // PNG / GIF / BMP: параметр quality не поддерживается энкодером.
        $image->save($absolutePath);
    }

    /** Сброс закэшированного менеджера (нужно только в тестах). */
    public static function flush(): void
    {
        self::$manager = null;
    }
}
