<?php

declare(strict_types=1);

namespace App\Services\Settings;

use App\Enums\SettingType;
use App\Helpers\SettingsThumb;
use App\Models\Setting;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

/**
 * Всё, что связано с файлами настроек: сохранение, удаление, URL, миниатюры.
 *
 * ВАЖНО: в БД хранится ТОЛЬКО имя файла (`setting_12_ab12cd.jpg`).
 * Полный путь на диске всегда собирается через Setting::filePath(),
 * а в SettingsThumb передаётся путь относительно диска — единый контракт
 * (раньше в разные методы уходили то имя, то путь, из-за чего thumbs терялись).
 */
final class SettingFileManager
{
    /** @var list<string> */
    private const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'avif'];

    private function disk(): Filesystem
    {
        return Storage::disk(Setting::UPLOAD_DISK);
    }

    /* Сохранение
     | -----------------------------------------------------------------
     */

    /**
     * Сохранить загруженный файл и вернуть его имя для записи в БД.
     *
     * @param  bool  $stableName Использовать предсказуемое имя (для одиночных файлов)
     */
    public function store(UploadedFile $file, Setting $setting, bool $stableName = false): string
    {
        $extension = $this->normalizeExtension($file);
        $filename  = $stableName
            ? $this->stableFileName($setting, $extension)
            : $this->uniqueFileName($setting, $extension);

        $file->storeAs(Setting::UPLOAD_DIR, $filename, Setting::UPLOAD_DISK);

        if ($this->isImage($extension)) {
            $this->optimizeImage($filename);
        }

        return $filename;
    }

    /* Удаление
    | -----------------------------------------------------------------
    */

    /** Удалить файл настройки (и, при необходимости, его миниатюры). */
    public function delete(?string $filename, bool $withThumbs = false): void
    {
        if (empty($filename) || !is_string($filename)) {
            return;
        }

        // Защита от выхода за пределы каталога загрузок.
        $filename = basename($filename);
        $path     = Setting::filePath($filename);

        if ($withThumbs) {
            SettingsThumb::delete($path);
        }

        if ($this->disk()->exists($path)) {
            $this->disk()->delete($path);
        }
    }


    /**
     * Удалить файлы, которые были в старом значении, но отсутствуют в новом.
     *
     * @param  list<string>  $old
     * @param  list<string>  $new
     */
    public function deleteMissing(array $old, array $new, bool $withThumbs = false): void
    {
        foreach (array_diff($old, $new) as $filename) {
            $this->delete($filename, $withThumbs);
        }
    }

    /** Удалить все файлы настройки (при удалении настройки или группы). */
    public function deleteAll(Setting $setting): void
    {
        $withThumbs = $setting->type === SettingType::Gallery;

        foreach ($setting->fileValues() as $filename) {
            $this->delete($filename, $withThumbs);
        }
    }

    /* Миниатюры
    | -----------------------------------------------------------------
    */

    /** Сгенерировать недостающие миниатюры для галереи. */
    public function makeThumbs(Setting $setting): void
    {
        if ($setting->type !== SettingType::Gallery) {
            return;
        }

        $config = $setting->thumbsConfig();

        if ($config === []) {
            return;
        }

        foreach ($setting->fileValues() as $filename) {
            $path = Setting::filePath($filename);

            if ($this->disk()->exists($path)) {
                SettingsThumb::make($path, $config);
            }
        }
    }

    /**
     * Данные о миниатюрах для фронта.
     * Ключ — ИМЯ ФАЙЛА (ровно то, что лежит в value), чтобы React мог найти
     * миниатюры простым `thumbsData[value]` без разбора путей.
     *
     * @return array<string, array{original_url: string, filename: string, thumbs: array}>
     */
    public function thumbsData(Setting $setting): array
    {
        $config = $setting->thumbsConfig();

        if ($setting->type !== SettingType::Gallery || $config === []) {
            return [];
        }

        $result = [];

        foreach ($setting->fileValues() as $filename) {
            $path = Setting::filePath($filename);

            if (!$this->disk()->exists($path)) {
                continue;
            }

            $result[$filename] = [
                'original_url' => $this->disk()->url($path),
                'filename'     => $filename,
                'thumbs'       => $this->thumbsFor($path, $config),
            ];
        }

        return $result;
    }

    /**
     * Получить (или создать) миниатюры конкретного изображения.
     *
     * @param  array<string|int, string>  $config
     * @return array<string|int, array{url: string, config: string, size: array}>
     */
    private function thumbsFor(string $path, array $config): array
    {
        $thumbs  = [];
        $created = false;

        foreach ($config as $key => $definition) {
            $thumbPath = SettingsThumb::url($path, $key);

            if (!$this->disk()->exists($thumbPath) && !$created) {
                SettingsThumb::make($path, $config); // создаём все размеры разом
                $created = true;
            }

            if ($this->disk()->exists($thumbPath)) {
                $thumbs[$key] = [
                    'url'    => $this->disk()->url($thumbPath),
                    'config' => $definition,
                    'size'   => $this->parseThumbSize($definition),
                ];
            }
        }

        return $thumbs;
    }

    /**
     * Разбор строки размера: "200x100|cover" → ['width' => 200, 'height' => 100, 'mode' => 'cover'].
     *
     * @return array{width: int, height: int, mode: string}
     */
    public function parseThumbSize(string $definition): array
    {
        [$size, $mode] = array_pad(explode('|', $definition, 2), 2, 'cover');
        [$width, $height] = array_pad(explode('x', trim($size), 2), 2, '0');

        return [
            'width'  => (int) $width,
            'height' => (int) $height,
            'mode'   => trim((string) $mode) ?: 'cover',
        ];
    }



    /* Вспомогательное
    | -----------------------------------------------------------------
    */

    public function isImage(string $extension): bool
    {
        return in_array(strtolower($extension), self::IMAGE_EXTENSIONS, true);
    }

    /** Безопасное расширение: из MIME, с фоллбэком на оригинальное. */
    private function normalizeExtension(UploadedFile $file): string
    {
        $extension = strtolower($file->extension() ?: $file->getClientOriginalExtension());
        $extension = preg_replace('/[^a-z0-9]/', '', $extension) ?: 'bin';

        return $extension === 'jpe' ? 'jpg' : $extension;
    }

    /** Уникальное имя — безопасно для галерей и повторителей. */
    private function uniqueFileName(Setting $setting, string $extension): string
    {
        return sprintf('setting_%d_%s.%s', $setting->id, Str::lower(Str::random(12)), $extension);
    }


    /**
     * Предсказуемое имя для одиночных файлов, у которых важен постоянный URL
     * (прайс-лист, каталог и т.п.). Добавляем короткий хеш, чтобы обойти
     * кэш браузера/CDN при замене файла.
     */
    private function stableFileName(Setting $setting, string $extension): string
    {
        if (in_array($setting->code, ['library_file', 'price_list', 'catalog_file'], true)) {
            return $setting->code . '.' . $extension;
        }

        return sprintf('setting_%d_%s.%s', $setting->id, substr(md5((string) microtime(true)), 0, 8), $extension);
    }

    /** Пережатие изображения (Intervention Image v3). */
    private function optimizeImage(string $filename): void
    {
        if (!class_exists(ImageManager::class)) {
            return;
        }

        try {
            $fullPath = $this->disk()->path(Setting::filePath($filename));

            if (!is_file($fullPath) || str_ends_with(strtolower($filename), '.gif')) {
                return; // не трогаем анимированные GIF
            }

            (new ImageManager(new Driver()))
                ->decode($fullPath)
                ->save($fullPath, quality: Setting::IMAGE_QUALITY);
        } catch (\Throwable $e) {
            Log::warning('Settings image optimization failed', [
                'file'  => $filename,
                'error' => $e->getMessage(),
            ]);
        }
    }

}
