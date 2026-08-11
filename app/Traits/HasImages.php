<?php

namespace App\Traits;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\Format;
use Intervention\Image\ImageManager;

trait HasImages
{
    /**
     * Конфигурация размеров изображений
     */
    protected function getImageConfig(): array {
        return [
            'disk' => 'public',
            'path' => $this->getImagePath(),
            'formats' => ['original', 'webp'],
            'thumbs' => [
                'thumb' => ['width' => 100, 'height' => 100],
                'small' => ['width' => 300, 'height' => 200],
                'medium' => ['width' => 600, 'height' => 400],
                'large' => ['width' => 1200, 'height' => 800],
            ],
            'quality' => 80,
            'max_file_size' => 10240,
        ];
    }

    /**
     * Путь для хранения изображений
     */
    protected function getImagePath(): string
    {
        return strtolower(class_basename($this)) . 's';
    }

    /**
     * Загрузка изображения с созданием webp и превью
     */
    public function uploadImage($file, array $options = []): ?array
    {
        $config = array_merge($this->getImageConfig(), $options);

        try {
            if (!$this->validateImage($file, $config)) {
                return null;
            }

            $manager = new ImageManager(new Driver());
            $image = $manager->decode($file);

            $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
            $basePath = $config['path'];

            $result = [
                'original' => null,
                'webp' => null,
                'thumbs' => [],
                'meta' => [
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getClientMimeType(),
                    'size' => $file->getSize(),
                    'dimensions' => [
                        'width' => $image->width(),
                        'height' => $image->height(),
                    ],
                ]
            ];

            // Сохраняем оригинал
            if (in_array('original', $config['formats'])) {
                $originalPath = $basePath . '/original/' . $filename;
                Storage::disk($config['disk'])->put($originalPath, (string) $image->encode());
                $result['original'] = $originalPath;
            }

            // Создаем WebP версию
            if (in_array('webp', $config['formats'])) {
                $webpFilename = pathinfo($filename, PATHINFO_FILENAME) . '.webp';
                $webpPath = $basePath . '/webp/' . $webpFilename;

                $webpImage = clone $image;
                Storage::disk($config['disk'])->put(
                    $webpPath,
                    (string) $webpImage->encodeUsingFormat(Format::WEBP, quality: $config['quality'])
                );
                $result['webp'] = $webpPath;
            }

            // Создаем превью разных размеров
            foreach ($config['thumbs'] as $size => $dimensions) {
                $thumbFilename = pathinfo($filename, PATHINFO_FILENAME) . "_{$size}." . $file->getClientOriginalExtension();
                $thumbWebpFilename = pathinfo($filename, PATHINFO_FILENAME) . "_{$size}.webp";

                $thumbImage = clone $image;
                $thumbImage->cover($dimensions['width'], $dimensions['height']);

                // Оригинальный формат
                if (in_array('original', $config['formats'])) {
                    $thumbPath = $basePath . "/thumbs/{$size}/" . $thumbFilename;
                    Storage::disk($config['disk'])->put($thumbPath, (string) $thumbImage->encode());
                    $result['thumbs'][$size] = $thumbPath;
                }

                // WebP формат для превью
                if (in_array('webp', $config['formats'])) {
                    $thumbWebpPath = $basePath . "/thumbs/{$size}/" . $thumbWebpFilename;
                    Storage::disk($config['disk'])->put(
                        $thumbWebpPath,
                        (string) $thumbImage->encodeUsingFormat(Format::WEBP, quality: $config['quality'])
                    );
                    $result['thumbs'][$size . '_webp'] = $thumbWebpPath;
                }
            }

            return $result;
        } catch (\Exception $e) {
            \Log::error('Image upload failed: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Удаление изображения и всех его версий
     */
    public function deleteImage(?array $imageData): bool
    {
        if (!$imageData) {
            return false;
        }

        try {
            $filesToDelete = [];

            if (!empty($imageData['original'])) {
                $filesToDelete[] = $imageData['original'];
            }

            if (!empty($imageData['webp'])) {
                $filesToDelete[] = $imageData['webp'];
            }

            if (!empty($imageData['thumbs'])) {
                foreach ($imageData['thumbs'] as $thumb) {
                    if (is_string($thumb)) {
                        $filesToDelete[] = $thumb;
                    }
                }
            }

            if (!empty($filesToDelete)) {
                Storage::disk($this->getImageConfig()['disk'])->delete($filesToDelete);
            }

            return true;
        } catch (\Exception $e) {
            \Log::error('Image deletion failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Получение URL для изображения
     */
    protected function getStorageUrl(string $path): string
    {
        return $path;
//        return Storage::disk($this->getImageConfig()['disk'])->url($path);
    }

    /**
     * Получить URL первого изображения
     */
    public function getFirstImageUrl(?string $size = 'medium', string $format = 'webp'): ?string
    {
        $images = $this->images;
        if (empty($images) || !is_array($images)) {
            return null;
        }

        $firstImage = $images[0];

        if (is_string($firstImage)) {
            return $this->getStorageUrl($firstImage);
        }

        return $this->getImageUrl($firstImage, $size, $format);
    }

    /**
     * Получить URL изображения с учетом формата
     */
    public function getImageUrl(?array $imageData, string $size = 'medium', string $format = 'webp'): ?string
    {
        if (!$imageData) return null;

        $relativePath = $this->getRelativePath($imageData, $size);

        if ($relativePath) {
            return $this->getStorageUrl($relativePath);
        }

        return null;
    }

    /**
     * Получить относительный путь к изображению
     */
    private function getRelativePath(array $imageData, string $size): ?string
    {
        if (!$imageData) return null;

        // Ищем webp версию
        $webpKey = $size . '_webp';
        if (isset($imageData['thumbs'][$webpKey])) {
            return $imageData['thumbs'][$webpKey];
        }

        // Ищем оригинальный формат в thumbs
        if (isset($imageData['thumbs'][$size])) {
            return $imageData['thumbs'][$size];
        }

        // Ищем webp в корне
        if ($size === 'medium' && isset($imageData['webp'])) {
            return $imageData['webp'];
        }

        // Ищем original
        if ($size === 'medium' && isset($imageData['original'])) {
            return $imageData['original'];
        }

        return null;
    }

    /**
     * Получение всех изображений с URL
     */
    public function getImagesWithUrls(): array
    {
        $images = $this->images ?? [];

        if (empty($images)) {
            return [];
        }

        return collect($images)->map(function ($image) {
            return [
                'id' => $image['original'] ?? uniqid(),
                // Возвращаем ОТНОСИТЕЛЬНЫЕ пути, как они хранятся в БД
                'url' => $image['url'] ?? $this->getImageUrl($image, 'medium'),
                'thumb' => $image['thumb'] ?? $this->getRelativePath($image, 'thumb'),
                'small' => $image['small'] ?? $this->getRelativePath($image, 'small'),
                'medium' => $image['medium'] ?? $this->getRelativePath($image, 'medium'),
                'large' => $image['large'] ?? $this->getRelativePath($image, 'large'),
                'original' => $image['original'] ?? null,
                'webp' => $image['webp'] ?? null,
                'meta' => $image['meta'] ?? [],
            ];
        })->values()->toArray();
    }

    /**
     * Валидация изображения
     */
    protected function validateImage($file, array $config): bool
    {
        $allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

        if (!in_array($file->getMimeType(), $allowedMimes)) {
            return false;
        }

        if ($file->getSize() > $config['max_file_size'] * 1024) {
            return false;
        }

        return true;
    }
}
