<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Page;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

/**
 * Бизнес-логика страниц: создание / обновление / удаление + синхронизация изображений.
 *
 * Соответствие сигнатурам HasImages:
 *   uploadSingleImage(UploadedFile $file, array $options = []): ?string
 *   deleteSingleImage(?string $filename): bool
 *   syncImages(array $order, array $newFiles, array $deletedPaths): bool
 *   deleteImage(?array $imageData): bool   ← принимает МАССИВ записи, не строку
 */
final readonly class PageService
{
    /* ------------------------------------------------------------------ */
    /*  CRUD                                                               */
    /* ------------------------------------------------------------------ */

    /**
     * Создать страницу вместе с изображениями.
     *
     * @param  array<string, mixed>                                           $attributes
     * @param  array{image?: UploadedFile|null, new_images?: UploadedFile[]}  $files
     */
    public function create(array $attributes, array $files = []): Page
    {
        return DB::transaction(function () use ($attributes, $files): Page {
            $page = new Page($attributes);
            $page->images = [];
            $page->save();

            // ── Одиночное изображение ────────────────────────────────────
            $this->syncSingleImage($page, $files['image'] ?? null, false);

            // ── Галерея: новые файлы без порядка и без удалений ──────────
            $page->syncImages(
                order:        [],
                newFiles:     $files['new_images'] ?? [],
                deletedPaths: [],
            );

            // syncImages() уже вызывает saveQuietly(), но сохраняем ещё раз,
            // чтобы зафиксировать изменение поля `image` из syncSingleImage().
            $page->saveQuietly();

            return $page->refresh();
        });
    }

    /**
     * Обновить страницу: поля, одиночное изображение, галерея.
     *
     * @param  array<string, mixed>  $attributes
     * @param  array{
     *     image?: UploadedFile|null,
     *     image_deleted?: bool,
     *     order?: string[],
     *     deleted?: string[],
     *     new_images?: UploadedFile[],
     * }  $files
     */
    public function update(Page $page, array $attributes, array $files = []): Page
    {
        return DB::transaction(function () use ($page, $attributes, $files): Page {
            // ── 1. Атрибуты (без save — один батч в конце) ───────────────
            $page->fill($attributes);

            // ── 2. Одиночное изображение ─────────────────────────────────
            $this->syncSingleImage(
                $page,
                $files['image'] ?? null,
                (bool) ($files['image_deleted'] ?? false),
            );

            // ── 3. Один save для полей + image ────────────────────────────
            $page->save();

            // ── 4. Галерея (syncImages сам вызывает saveQuietly) ─────────
            $page->syncImages(
                order:        $files['order'] ?? [],
                newFiles:     $files['new_images'] ?? [],
                deletedPaths: $files['deleted'] ?? [],
            );

            return $page->refresh();
        });
    }

    /**
     * Удалить страницу.
     *
     * @param  bool  $cascade  true — удалить всё поддерево;
     *                         false — «поднять» детей на уровень родителя.
     */
    public function delete(Page $page, bool $cascade = false): void
    {
        DB::transaction(function () use ($page, $cascade): void {
            if ($cascade) {
                // Удаляем снизу вверх через модели → срабатывают события и чистка файлов
                Page::whereKey($page->descendantIds())
                    ->orderByDesc('id')
                    ->get()
                    ->each(fn(Page $child) => $this->deleteAllFiles($child) || $child->delete());
            } else {
                $newParentId = $page->parent_id;

                $page->children()->get()->each(function (Page $child) use ($newParentId): void {
                    $child->parent_id = $newParentId;
                    $child->alias     = $child->uniqueAlias($child->alias);
                    $child->save();
                });
            }

            $parentId = $page->parent_id;

            $this->deleteAllFiles($page);
            $page->delete();

            Page::normalizeOrder($parentId);
            Page::flushCache();
        });
    }

    /**
     * Дублировать страницу (без поддерева).
     */
    public function duplicate(Page $page): Page
    {
        return DB::transaction(function () use ($page): Page {
            $copy = $page->replicate(['slug', 'order']);
            $copy->name      = "{$page->name} (копия)";
            $copy->alias     = null;   // сгенерируется в saving()
            $copy->published = false;
            $copy->images    = [];     // галерея не клонируется — файлы не дублируем
            $copy->image     = null;   // одиночное — тоже
            $copy->save();

            return $copy;
        });
    }

    /**
     * Переместить узел дерева (drag & drop).
     *
     * @throws \RuntimeException при попытке создать цикл
     */
    public function move(Page $page, int|string|null $parentId, int $index): Page
    {
        $page->moveTo($parentId, $index);

        return $page->refresh();
    }

    /* ------------------------------------------------------------------ */
    /*  Приватные хелперы                                                  */
    /* ------------------------------------------------------------------ */

    /**
     * Синхронизировать одиночное изображение (поле `image`).
     *
     * HasImages::uploadSingleImage() — возвращает filename (строку).
     * HasImages::deleteSingleImage() — принимает ?string filename.
     *
     * Метод мутирует $page->image, но НЕ вызывает save() —
     * это ответственность вызывающего кода.
     */
    private function syncSingleImage(Page $page, ?UploadedFile $file, bool $deleted): void
    {
        // Удалить старое изображение
        if ($deleted && $page->image) {
            $page->deleteSingleImage($page->image);  // string filename
            $page->image = null;
        }

        // Загрузить новое
        if ($file instanceof UploadedFile) {
            // Предварительно удаляем старый файл (если ещё не удалили выше)
            if ($page->image) {
                $page->deleteSingleImage($page->image);
            }

            $page->image = $page->uploadSingleImage($file);  // → string filename | null
        }
    }

    /**
     * Удалить ВСЕ файлы страницы: одиночное изображение + всю галерею.
     *
     * HasImages::deleteImage() принимает array $imageData (запись галереи), не строку.
     * HasImages::deleteSingleImage() принимает ?string filename.
     *
     * Всегда возвращает false — используется в цепочке `|| $page->delete()`.
     */
    private function deleteAllFiles(Page $page): false
    {
        // Одиночное изображение
        if ($page->image) {
            $page->deleteSingleImage($page->image);
        }

        // Галерея — $page->images хранит массив записей (array[])
        foreach ($page->images ?? [] as $imageData) {
            if (is_array($imageData)) {
                $page->deleteImage($imageData);   // ← array, не строка
            }
        }

        return false;
    }
}
