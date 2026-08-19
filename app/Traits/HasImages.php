<?php

declare(strict_types=1);

namespace App\Traits;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\Format;
use Intervention\Image\ImageManager;

/**
 * Трейт для работы с изображениями модели.
 *
 * Поддерживает:
 *  - одиночное изображение (поле `image` в БД)
 *  - галерею изображений (поле `images` JSON в БД)
 *
 * Модель обязана реализовать getImageConfig(): array.
 *
 * Структура конфига:
 * [
 *   'disk'          => 'public',
 *   'path'          => 'uploads/pages/images',       // базовый путь галереи
 *   'single_path'   => 'uploads/pages/image',        // путь одиночного фото
 *   'formats'       => ['original', 'webp'],         // генерируемые форматы
 *   'thumbs' => [
 *     'thumb'  => ['width' => 100, 'height' => 100],
 *     'small'  => ['width' => 300, 'height' => 200],
 *     'medium' => ['width' => 600, 'height' => 400],
 *     'large'  => ['width' => 1200, 'height' => 800],
 *   ],
 *   'single_thumbs' => ['thumb' => ['width' => 100, 'height' => 100]],
 *   'quality'       => 80,
 *   'max_file_size' => 10240,  // KB
 * ]
 *
 * Структура записи галереи в JSON:
 * {
 *   "name":        "uuid.jpg",           ← оригинальное имя (ключ для синхронизации)
 *   "original":    "uploads/.../original/uuid.jpg",
 *   "thumb":       "uploads/.../thumbs/thumb/uuid_thumb.jpg",
 *   "thumb_webp":  "uploads/.../thumbs/thumb/uuid_thumb.webp",
 *   "medium":      "uploads/.../thumbs/medium/uuid_medium.jpg",
 *   "medium_webp": "uploads/.../thumbs/medium/uuid_medium.webp",
 *   "large":       "uploads/.../thumbs/large/uuid_large.jpg",
 *   "large_webp":  "uploads/.../thumbs/large/uuid_large.webp",
 * }
 */
trait HasImages
{
    /* ================================================================== */
    /*  ПУБЛИЧНЫЙ API                                                      */
    /* ================================================================== */

    /* ── Одиночное изображение ────────────────────────────────────────── */

    /**
     * Загрузить одиночное изображение.
     * Создаёт оригинал + превью по конфигу `single_thumbs`.
     *
     * @return string|null  Имя файла (хранить в поле `image`).
     */
    public function uploadSingleImage(UploadedFile $file, array $options = []): ?string
    {
        $config  = $this->getImageConfig();
        $disk    = $config['disk'] ?? 'public';
        $path    = $config['single_path'] ?? $config['path'];
        $quality = $config['quality'] ?? 80;
        $thumbs  = $config['single_thumbs'] ?? $config['thumbs'] ?? [];

        $name    = $this->generateImageName($file);
        $manager = $this->makeImageManager();

        // Оригинал
        $this->saveImageFile($disk, "{$path}/original/{$name}", $file->getRealPath(), null, null, $quality, $manager);

        // Превью
        foreach ($thumbs as $thumbName => $dims) {
            $this->saveImageThumbs($disk, $path, $name, $thumbName, $dims, $quality, $manager, isSingle: true);
        }

        return $name;
    }

    /**
     * Удалить одиночное изображение и все его превью.
     *
     * @param  string|null  $filename  Значение поля `image` модели.
     */
    public function deleteSingleImage(?string $filename): bool
    {
        if (blank($filename)) {
            return false;
        }

        $config = $this->getImageConfig();
        $disk   = $config['disk'] ?? 'public';
        $path   = $config['single_path'] ?? $config['path'];
        $thumbs = $config['single_thumbs'] ?? $config['thumbs'] ?? [];

        $storage = Storage::disk($disk);

        // Оригинал
        $this->deleteFileIfExists($storage, "{$path}/original/{$filename}");

        // Превью (jpg + webp)
        $stem = pathinfo($filename, PATHINFO_FILENAME);
        foreach (array_keys($thumbs) as $thumbName) {
            $this->deleteFileIfExists($storage, "{$path}/thumbs/{$thumbName}/{$stem}_{$thumbName}.jpg");
            $this->deleteFileIfExists($storage, "{$path}/thumbs/{$thumbName}/{$stem}_{$thumbName}.webp");
        }

        return true;
    }

    /* ── Галерея ──────────────────────────────────────────────────────── */

    /**
     * Синхронизировать галерею.
     *
     * Алгоритм:
     *  1. Удалить файлы из $deletedPaths.
     *  2. Загрузить файлы из $newFiles.
     *  3. Сопоставить $order — строки «name» существующих + «new_N» для новых.
     *     Где N — порядковый индекс в $newFiles (0-based).
     *  4. Сохранить итоговый массив записей через saveQuietly().
     *
     * Фронт (ImageUploader.notify) отправляет:
     *  - order[]:   строки "name" существующих | "new_<tempId>" новых
     *  - newFiles[]: File-объекты в том же порядке, что «new_*» в order
     *  - deletedPaths[]: строки "name" удалённых
     *
     * @param  string[]       $order         Финальный порядок (name | "new_*").
     * @param  UploadedFile[] $newFiles       Новые файлы (по индексу совпадают с «new_*» в order).
     * @param  string[]       $deletedPaths  Имена (name) записей для удаления.
     */
    public function syncImages(array $order, array $newFiles, array $deletedPaths): bool
    {
        $config  = $this->getImageConfig();
        $disk    = $config['disk'] ?? 'public';
        $quality = $config['quality'] ?? 80;
        $thumbs  = $config['thumbs'] ?? [];
        $path    = $config['path'];
        $manager = $this->makeImageManager();

        // ── 1. Удаляем помеченные ──────────────────────────────────────
        $currentImages = collect($this->images ?? [])
            ->filter(fn ($item) => is_array($item))
            ->keyBy('name');                          // ключ = name

        foreach ($deletedPaths as $nameToDelete) {
            if ($currentImages->has($nameToDelete)) {
                $this->deleteImageFiles($disk, $path, $currentImages[$nameToDelete], $thumbs);
                $currentImages->forget($nameToDelete);
            }
        }

        // ── 2. Загружаем новые ────────────────────────────────────────
        // newFiles индексированы по порядку появления «new_*» в $order.
        $newFileIndex = 0;
        $uploadedNew  = [];   // tempKey => imageData

        foreach ($order as $token) {
            if (str_starts_with((string) $token, 'new_')) {
                $file = $newFiles[$newFileIndex] ?? null;
                $newFileIndex++;

                if ($file instanceof UploadedFile) {
                    $imageData = $this->uploadGalleryImage($file, $disk, $path, $thumbs, $quality, $manager);
                    if ($imageData) {
                        $uploadedNew[$token] = $imageData;
                    }
                }
            }
        }

        // ── 3. Строим финальный массив в нужном порядке ───────────────
        $result = [];

        foreach ($order as $token) {
            if (str_starts_with((string) $token, 'new_')) {
                if (isset($uploadedNew[$token])) {
                    $result[] = $uploadedNew[$token];
                }
            } elseif ($currentImages->has($token)) {
                $result[] = $currentImages[$token];
            }
        }

        // Добавляем записи, которых нет в $order (страховка)
        foreach ($currentImages as $name => $imageData) {
            if (!in_array($name, $order, true)) {
                $result[] = $imageData;
            }
        }

        // ── 4. Сохраняем ──────────────────────────────────────────────
        $this->images = $result ?: null;
        $this->saveQuietly();

        return true;
    }

    /**
     * Удалить одну запись галереи (по массиву записи).
     *
     * @param  array<string, string|null>|null  $imageData  Запись из поля images.
     */
    public function deleteImage(?array $imageData): bool
    {
        if (empty($imageData)) {
            return false;
        }

        $config = $this->getImageConfig();
        $disk   = $config['disk'] ?? 'public';
        $path   = $config['path'];
        $thumbs = $config['thumbs'] ?? [];

        $this->deleteImageFiles($disk, $path, $imageData, $thumbs);

        return true;
    }

    /**
     * Получить публичный URL для произвольного пути из галереи.
     * Используется в PageResource.
     */
    public function getGalleryUrl(?string $relativePath): ?string
    {
        if (blank($relativePath)) {
            return null;
        }

        $config = $this->getImageConfig();
        $disk   = $config['disk'] ?? 'public';

        return Storage::disk($disk)->url($relativePath);
    }

    /* ================================================================== */
    /*  ПРИВАТНЫЕ МЕТОДЫ                                                   */
    /* ================================================================== */

    /**
     * Загрузить одно изображение галереи: оригинал + все превью.
     *
     * @return array<string, string|null>|null  Запись для сохранения в JSON.
     */
    private function uploadGalleryImage(
        UploadedFile $file,
        string $disk,
        string $path,
        array $thumbs,
        int $quality,
        ImageManager $manager,
    ): ?array {
        $name = $this->generateImageName($file);

        // Оригинал
        $originalPath = "{$path}/original/{$name}";
        $this->saveImageFile($disk, $originalPath, $file->getRealPath(), null, null, $quality, $manager);

        $imageData = [
            'name'     => $name,
            'original' => $originalPath,
        ];

        // Превью
        foreach ($thumbs as $thumbName => $dims) {
            [$jpgPath, $webpPath] = $this->saveImageThumbs(
                $disk, $path, $name, $thumbName, $dims, $quality, $manager, isSingle: false,
            );
            $imageData[$thumbName]            = $jpgPath;
            $imageData["{$thumbName}_webp"]   = $webpPath;
        }

        return $imageData;
    }

    /**
     * Сохранить превью в jpg + webp для одного размера.
     *
     * @return array{0: string, 1: string}  [jpgPath, webpPath]
     */
    private function saveImageThumbs(
        string $disk,
        string $path,
        string $name,
        string $thumbName,
        array $dims,
        int $quality,
        ImageManager $manager,
        bool $isSingle,
    ): array {
        $stem     = pathinfo($name, PATHINFO_FILENAME);
        $w        = $dims['width']  ?? null;
        $h        = $dims['height'] ?? null;
        $thumbDir = $isSingle
            ? "{$path}/thumbs/{$thumbName}"
            : "{$path}/thumbs/{$thumbName}";

        $jpgPath  = "{$thumbDir}/{$stem}_{$thumbName}.jpg";
        $webpPath = "{$thumbDir}/{$stem}_{$thumbName}.webp";

        $this->saveImageFile($disk, $jpgPath,  null, $w, $h, $quality, $manager, format: 'jpg',  source: $this->getTempPath($disk, "{$path}/original/{$name}"));
        $this->saveImageFile($disk, $webpPath, null, $w, $h, $quality, $manager, format: 'webp', source: $this->getTempPath($disk, "{$path}/original/{$name}"));

        return [$jpgPath, $webpPath];
    }

    /**
     * Сохранить изображение на диск (оригинал или превью).
     *
     * @param  string|null  $realPath  Путь к исходному файлу (для оригинала).
     * @param  string|null  $source    Путь к уже загруженному оригиналу (для превью).
     */
    private function saveImageFile(
        string $disk,
        string $storagePath,
        ?string $realPath,
        ?int $w,
        ?int $h,
        int $quality,
        ImageManager $manager,
        string $format = 'jpg',
        ?string $source = null,
    ): void {
        $srcPath = $realPath ?? $source;

        if (!$srcPath || !file_exists($srcPath)) {
            return;
        }

        $image = $manager->decode($srcPath);

        if ($w || $h) {
            $image->coverDown($w ?? $h, $h ?? $w);
        }

        $encoded = match ($format) {
            'webp'  => $image->encodeUsingFormat(Format::WEBP, quality: $quality),
            default => $image->encodeUsingFormat(Format::JPEG, quality: $quality)
        };

        Storage::disk($disk)->put($storagePath, (string) $encoded);
    }

    /** Удалить все файлы записи галереи (оригинал + все превью). */
    private function deleteImageFiles(string $disk, string $path, array $imageData, array $thumbs): void
    {
        $storage = Storage::disk($disk);
        $name    = $imageData['name'] ?? null;
        $stem    = $name ? pathinfo($name, PATHINFO_FILENAME) : null;

        // Оригинал
        if (!empty($imageData['original'])) {
            $this->deleteFileIfExists($storage, $imageData['original']);
        }

        // Превью по конфигу
        if ($stem) {
            foreach (array_keys($thumbs) as $thumbName) {
                $this->deleteFileIfExists($storage, "{$path}/thumbs/{$thumbName}/{$stem}_{$thumbName}.jpg");
                $this->deleteFileIfExists($storage, "{$path}/thumbs/{$thumbName}/{$stem}_{$thumbName}.webp");
            }
        }

        // Превью из самой записи (на случай нестандартных путей)
        foreach ($imageData as $key => $filePath) {
            if (in_array($key, ['name', 'original'], true) || !is_string($filePath)) {
                continue;
            }
            $this->deleteFileIfExists($storage, $filePath);
        }
    }

    /** Сгенерировать уникальное имя файла. */
    private function generateImageName(UploadedFile $file): string
    {
        return Str::uuid() . '.' . ($file->getClientOriginalExtension() ?: 'jpg');
    }

    /** Создать ImageManager (Intervention Image v3). */
    private function makeImageManager(): ImageManager
    {
        return new ImageManager(new Driver());
    }

    /**
     * Получить локальный путь к уже загруженному файлу.
     * Нужен для создания превью после сохранения оригинала.
     */
    private function getTempPath(string $disk, string $storagePath): ?string
    {
        $storage = Storage::disk($disk);

        if (!$storage->exists($storagePath)) {
            return null;
        }

        // Для local/public дисков — абсолютный путь
        // Для S3 и др. — скачиваем во temp
        try {
            return $storage->path($storagePath);
        } catch (\Throwable) {
            $tmp = tempnam(sys_get_temp_dir(), 'img_');
            file_put_contents($tmp, $storage->get($storagePath));
            return $tmp;
        }
    }

    /** Удалить файл если существует. */
    private function deleteFileIfExists($storage, string $path): void
    {
        if ($storage->exists($path)) {
            $storage->delete($path);
        }
    }

    /* ================================================================== */
    /*  АБСТРАКТНЫЙ МЕТОД — реализовать в модели                          */
    /* ================================================================== */

    /**
     * Конфигурация изображений модели.
     * Должна быть реализована в модели, использующей трейт.
     */
    abstract protected function getImageConfig(): array;
}
