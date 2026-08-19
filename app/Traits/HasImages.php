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
        $config = $this->getImageConfig();
        $disk = $config['disk'] ?? 'public';
        $path = $config['single_path'] ?? $config['path'];
        $quality = $config['quality'] ?? 80;
        $thumbs = $config['single_thumbs'] ?? $config['thumbs'] ?? [];

        $name = $this->generateImageName($file);
        $source = $file->getRealPath();

        if (!$source || !is_file($source)) {
            return null;
        }

        // Оригинал
        Storage::disk($disk)->putFileAs("{$path}/original", $file, $name);

        // Превью
        $manager = $this->makeImageManager();
        foreach ($thumbs as $thumbName => $dims) {
            $this->makeThumbPair($disk, $path, $name, $thumbName, $dims, $quality, $manager, $source);
        }
        return $name;
    }

    /**
     * Удалить одиночное изображение и все его превью.
     *
     * @param string|null $filename Значение поля `image` модели.
     */
    public function deleteSingleImage(?string $filename): bool
    {
        if (blank($filename)) {
            return false;
        }

        $config = $this->getImageConfig();
        $disk = $config['disk'] ?? 'public';
        $path = $config['single_path'] ?? $config['path'];
        $thumbs = $config['single_thumbs'] ?? $config['thumbs'] ?? [];

        $storage = Storage::disk($disk);
        $stem = pathinfo($filename, PATHINFO_FILENAME);

        // Оригинал
        $storage->delete("{$path}/original/{$filename}");

        // Превью (jpg + webp)
        foreach (array_keys($thumbs) as $thumbName) {
            $storage->delete(
                [
                    "{$path}/thumbs/{$thumbName}/{$stem}_{$thumbName}.jpg",
                    "{$path}/thumbs/{$thumbName}/{$stem}_{$thumbName}.webp",
                ]
            );
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
     * @param string[] $order Финальный порядок (name | "new_*").
     * @param UploadedFile[] $newFiles Новые файлы (по индексу совпадают с «new_*» в order).
     * @param string[] $deletedPaths Имена (name) записей для удаления.
     */
    public function syncImages(array $order, array $newFiles, array $deletedPaths): bool
    {
        $c = $this->getImageConfig();
        $disk = $c['disk'] ?? 'public';
        $path = $c['path'];
        $thumbs = $c['thumbs'] ?? [];
        $quality = (int)($c['quality'] ?? 80);
        $manager = $this->makeImageManager();

        $current = collect($this->images ?? [])
            ->filter(static fn($i) => is_array($i) && filled($i['name'] ?? null))
            ->keyBy('name');

        /* ── 1. Удаляем помеченные ───────────────────────────── */
        foreach (array_filter(array_unique($deletedPaths)) as $name) {
            if ($current->has($name)) {
                $this->deleteImageFiles($disk, $path, $current->get($name), $thumbs);
                $current->forget($name);
            }
        }

        /* ── 2. Очередь новых файлов: "new:<tempId>" => File ── */
        $queue = [];
        foreach ($newFiles as $key => $file) {
            if ($file instanceof UploadedFile && $file->isValid()) {
                $queue[$this->normalizeNewToken((string)$key)] = $file;
            }
        }

        /* ── 3. Собираем результат строго по order ───────────── */
        $result = [];
        $seen = [];

        foreach ($order as $token) {
            $token = (string)$token;

            if ($this->isNewToken($token)) {
                $key = $this->resolveQueueKey($queue, $token);
                if ($key === null) {
                    continue;
                }
                $file = $queue[$key];
                unset($queue[$key]);

                if ($data = $this->uploadGalleryImage($file, $disk, $path, $thumbs, $quality, $manager)) {
                    $result[] = $data;
                }
                continue;
            }

            if ($current->has($token) && !isset($seen[$token])) {
                $result[] = $current->get($token);
                $seen[$token] = true;
            }
        }

        /* ── 4. Страховка: ничего не теряем ──────────────────── */
        foreach ($current as $name => $data) {
            if (!isset($seen[$name])) {
                $result[] = $data;
            }
        }

        // ⚡ Ключевой фикс: файлы без токена (create / нетронутый order) — тоже грузим
        foreach ($queue as $file) {
            if ($data = $this->uploadGalleryImage($file, $disk, $path, $thumbs, $quality, $manager)) {
                $result[] = $data;
            }
        }

        $this->images = $result ?: null;

        if ($this->exists) {
            $this->saveQuietly();
        }

        return true;
    }

    /**
     * Удалить одну запись галереи (по массиву записи).
     *
     * @param array<string, string|null>|null $imageData Запись из поля images.
     */
    public function deleteImage(?array $imageData): bool
    {
        if (empty($imageData)) {
            return false;
        }

        $c = $this->getImageConfig();
        $this->deleteImageFiles($c['disk'] ?? 'public', $c['path'], $imageData, $c['thumbs'] ?? []);

        return true;
    }

    /** Удалить ВСЕ файлы модели (одиночное + галерея). */
    public function purgeImages(): void
    {
        $this->deleteSingleImage($this->image);

        foreach ($this->images ?? [] as $imageData) {
            if (is_array($imageData)) {
                $this->deleteImage($imageData);
            }
        }
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

        return Storage::disk($this->getImageConfig()['disk'] ?? 'public')->url($relativePath);
    }

    /* ================================================================== */
    /*  ПРИВАТНЫЕ МЕТОДЫ                                                   */
    /* ================================================================== */

    private function isNewToken(string $token): bool
    {
        return str_starts_with($token, 'new:') || str_starts_with($token, 'new_');
    }

    private function normalizeNewToken(string $key): string
    {
        return $this->isNewToken($key) ? 'new:' . substr($key, 4) : "new:{$key}";
    }

    /** Точное совпадение → нормализованное → первый свободный (legacy new_0/new_1). */
    private function resolveQueueKey(array $queue, string $token): ?string
    {
        if ($queue === []) {
            return null;
        }

        return match (true) {
            array_key_exists($token, $queue) => $token,
            array_key_exists($n = $this->normalizeNewToken($token), $queue) => $n,
            default => array_key_first($queue),
        };
    }

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
        $source = $file->getRealPath();

        if (!$source || !is_file($source)) {
            return null;
        }

        $name = $this->generateImageName($file);
        Storage::disk($disk)->putFileAs("{$path}/original", $file, $name);

        $data = ['name' => $name, 'original' => "{$path}/original/{$name}"];

        foreach ($thumbs as $thumbName => $dims) {
            [$jpg, $webp] = $this->makeThumbPair($disk, $path, $name, $thumbName, $dims, $quality, $manager, $source);
            $data[$thumbName] = $jpg;
            $data["{$thumbName}_webp"] = $webp;
        }

        return $data;
    }

    /** @return array{0:string,1:string} [jpgPath, webpPath] */
    private function makeThumbPair(
        string $disk,
        string $path,
        string $name,
        string $thumbName,
        array $dims,
        int $quality,
        ImageManager $manager,
        string $source,
    ): array {
        $stem = pathinfo($name, PATHINFO_FILENAME);
        $dir = "{$path}/thumbs/{$thumbName}";
        $jpg = "{$dir}/{$stem}_{$thumbName}.jpg";
        $webp = "{$dir}/{$stem}_{$thumbName}.webp";

        $w = $dims['width'] ?? null;
        $h = $dims['height'] ?? null;

        // Декодируем один раз на пару форматов
        $image = $manager->decode($source);

        if ($w || $h) {
            $image->coverDown($w ?? $h, $h ?? $w);
        }

        $storage = Storage::disk($disk);
        $storage->put($jpg, (string)$image->encodeUsingFormat(Format::JPEG, quality: $quality));
        $storage->put($webp, (string)$image->encodeUsingFormat(Format::WEBP, quality: $quality));

        return [$jpg, $webp];
    }

    private function deleteImageFiles(string $disk, string $path, array $imageData, array $thumbs): void
    {
        $storage = Storage::disk($disk);
        $targets = [];

        if (!empty($imageData['original'])) {
            $targets[] = $imageData['original'];
        }

        if ($name = $imageData['name'] ?? null) {
            $stem = pathinfo($name, PATHINFO_FILENAME);
            foreach (array_keys($thumbs) as $thumbName) {
                $targets[] = "{$path}/thumbs/{$thumbName}/{$stem}_{$thumbName}.jpg";
                $targets[] = "{$path}/thumbs/{$thumbName}/{$stem}_{$thumbName}.webp";
            }
        }

        // Нестандартные пути прямо из записи
        foreach ($imageData as $key => $filePath) {
            if (!in_array($key, ['name', 'original'], true) && is_string($filePath) && $filePath !== '') {
                $targets[] = $filePath;
            }
        }

        $storage->delete(array_values(array_unique($targets)));
    }

    private function generateImageName(UploadedFile $file): string
    {
        $ext = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'jpg');

        return Str::uuid()->toString() . '.' . $ext;
    }

    private function makeImageManager(): ImageManager
    {
        return new ImageManager(new Driver());
    }

    abstract protected function getImageConfig(): array;
}
