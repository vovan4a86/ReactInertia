<?php

namespace App\Helpers;

use App\Models\Setting;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Imagick\Driver;
use Intervention\Image\Exceptions\InvalidArgumentException;
use Intervention\Image\ImageManager;

class SettingsThumb
{
    private static string $dir = 'thumbs';
    private static string $postfix = '_thumb_';

    /**
     * Generate thumb URL path relative to disk
     */
    public static function url(string $originalPath, string|int $thumbKey): string
    {
        $pathParts = pathinfo($originalPath);

        return $pathParts['dirname'] . '/' .
            self::$dir . '/' .
            $pathParts['filename'] .
            self::$postfix . $thumbKey . '.' .
            $pathParts['extension'];
    }

    /**
     * Create thumbnails for an image
     *
     * @param string $originalPath Path relative to disk
     * @param array $thumbsConfig Array of thumb configurations ['200x100', '400x200|cover']
     * @return int Number of created thumbnails
     */
    public static function make(string $originalPath, array $thumbsConfig): int
    {
        $disk = 'public';
        $storage = Storage::disk($disk);

        if (!$storage->exists($originalPath)) {
            return 0;
        }

        $created = 0;

        try {
            $manager = new ImageManager(new Driver());

            $image = $manager->decode($storage->path($originalPath));

        } catch (InvalidArgumentException $e) {
            \Log::error('ImageManger: Cannot use current driver', [
                'path' => $originalPath,
                'error' => $e->getMessage()
            ]);
            return 0;
        } catch (\Exception $e) {
            \Log::error('Thumb: Cannot read original image', [
                'path' => $originalPath,
                'error' => $e->getMessage()
            ]);
            return 0;
        }

        foreach ($thumbsConfig as $key => $config) {
            // Parse config: "200x100" or "200x100|cover" or "200x100|resize"
            $parts = explode('|', $config);
            $size = $parts[0];
            $fit = $parts[1] ?? 'cover'; // Default to cover

            $sizes = explode('x', $size);
            if (count($sizes) !== 2) {
                continue;
            }

            $width = (int)$sizes[0];
            $height = (int)$sizes[1];

            if ($width <= 0 || $height <= 0) {
                continue;
            }

            $thumbPath = self::url($originalPath, $key);

            // Create directory if not exists
            $thumbDir = dirname($thumbPath);
            if (!$storage->exists($thumbDir)) {
                $storage->makeDirectory($thumbDir);
            }

            try {
                $thumbImage = clone $image;

                if ($fit === 'resize') {
                    // Proportional resize (fit inside dimensions)
                    $thumbImage->resize($width, $height, function ($constraint) {
                        $constraint->aspectRatio();
                        $constraint->upsize();
                    });
                } else {
                    // cover - обрезаем и заполняем
                    $thumbImage->cover($width, $height);
                }

                // Save with format detection
                $extension = pathinfo($originalPath, PATHINFO_EXTENSION);
                $format = self::getFormatByExtension($extension);

                $thumbImage->save(
                    $storage->path($thumbPath),
                    quality: Setting::IMAGE_QUALITY
                );

                $created++;
            } catch (\Exception $e) {
                \Log::error('Thumb: Error creating thumbnail', [
                    'original' => $originalPath,
                    'thumb' => $thumbPath,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return $created;
    }

    /**
     * Delete all thumbnails for an image
     *
     * @param string $originalPath Path relative to disk
     * @return int Number of deleted thumbnails
     */
    public static function delete(string $originalPath): int
    {
        $disk = 'public';
        $storage = Storage::disk($disk);

        $pathParts = pathinfo($originalPath);

        $pattern = self::$dir . '/' .
            $pathParts['dirname'] . '/' .
            $pathParts['filename'] .
            self::$postfix . '*.' .
            $pathParts['extension'];

        $deleted = 0;

        // Search for all matching thumbnails
        $thumbDir = dirname($pattern);
        if (!$storage->exists($thumbDir)) {
            return 0;
        }

        $files = $storage->files($thumbDir);
        $patternBase = basename($pattern);
        $patternRegex = '/^' . preg_quote($pathParts['filename'] . self::$postfix, '/') . '.*\.' . preg_quote($pathParts['extension'], '/') . '$/';

        foreach ($files as $file) {
            if (preg_match($patternRegex, basename($file))) {
                if ($storage->delete($file)) {
                    $deleted++;
                }
            }
        }

        return $deleted;
    }

    /**
     * Get thumbnail URL or create if not exists
     *
     * @param string $originalPath Path relative to disk
     * @param string|int $thumbKey Key of thumb configuration
     * @param array|null $thumbsConfig Thumb configurations (if null, will be taken from settings)
     * @return string|null URL to thumbnail
     */
    public static function get(string $originalPath, string|int $thumbKey, ?array $thumbsConfig = null): ?string
    {
        $disk = 'public';
        $storage = Storage::disk($disk);

        $thumbPath = self::url($originalPath, $thumbKey);

        // Check if thumb already exists
        if ($storage->exists($thumbPath)) {
            return $storage->url($thumbPath);
        }

        // If thumb config provided, try to create
        if ($thumbsConfig && isset($thumbsConfig[$thumbKey])) {
            $singleConfig = [$thumbKey => $thumbsConfig[$thumbKey]];
            $created = self::make($originalPath, $singleConfig);

            if ($created > 0 && $storage->exists($thumbPath)) {
                return $storage->url($thumbPath);
            }
        }

        return null;
    }

    /**
     * Get all thumbnail URLs for an image
     *
     * @param string $originalPath
     * @param array|null $thumbsConfig
     * @return array
     */
    public static function getAll(string $originalPath, ?array $thumbsConfig = null): array
    {
        if (!$thumbsConfig) {
            return [];
        }

        $urls = [];
        foreach ($thumbsConfig as $key => $config) {
            $url = self::get($originalPath, $key, $thumbsConfig);
            if ($url) {
                $urls[$key] = [
                    'config' => $config,
                    'url' => $url
                ];
            }
        }

        return $urls;
    }

    /**
     * Regenerate all thumbnails for settings gallery
     */
    public static function regenerateGallery(Setting $setting): void
    {
        $thumbsConfig = self::parseThumbsConfig($setting->params['thumbs'] ?? '');

        if (empty($thumbsConfig)) {
            return;
        }

        $images = json_decode($setting->value, true) ?? [];

        foreach ($images as $image) {
            if (is_string($image) && !empty($image)) {
                self::make($image, $thumbsConfig);
            }
        }
    }

    /**
     * Parse thumbs configuration string
     * "200x100, 400x200" -> ['200x100', '400x200']
     * "200x100|cover, 400x200|resize" -> ['200x100|cover', '400x200|resize']
     */
    public static function parseThumbsConfig(string $thumbsString): array
    {
        if (empty($thumbsString)) {
            return [];
        }

        $parts = explode(',', $thumbsString);
        return array_map('trim', $parts);
    }

    /**
     * Get format by file extension
     */
    private static function getFormatByExtension(string $extension): string
    {
        return match(strtolower($extension)) {
            'webp' => 'webp',
            'avif' => 'avif',
            'png' => 'png',
            'gif' => 'gif',
            'bmp' => 'bmp',
            default => 'jpg',
        };
    }
}
