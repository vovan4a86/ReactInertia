<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Page;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

/** Бизнес-логика страниц: создание/обновление/удаление + синхронизация изображений. */
final readonly class PageService
{
    /**
     * Создать страницу вместе с изображениями.
     *
     * @param  array<string, mixed>  $attributes
     * @param  array{image?: UploadedFile|null, new_images?: list<UploadedFile>}  $files
     */
    public function create(array $attributes, array $files = []): Page
    {
        return DB::transaction(function () use ($attributes, $files): Page {
            $page = new Page($attributes);
            $page->images = [];
            $page->save();

            $this->syncSingleImage($page, $files['image'] ?? null, false);
            $page->images = $this->appendGallery($page, [], $files['new_images'] ?? []);
            $page->save();

            return $page;
        });
    }

    /**
     * Обновить страницу: поля, одиночное изображение, галерея (порядок/удаление/добавление).
     *
     * @param  array<string, mixed>  $attributes
     * @param  array{image?: UploadedFile|null, image_deleted?: bool, order?: list<string>, deleted?: list<string>, new_images?: list<UploadedFile>}  $files
     */
    public function update(Page $page, array $attributes, array $files = []): Page
    {
        return DB::transaction(function () use ($page, $attributes, $files): Page {
            $gallery = $this->reorderGallery(
                $page,
                $files['order'] ?? [],
                $files['deleted'] ?? []
            );

            $gallery = $this->appendGallery($page, $gallery, $files['new_images'] ?? []);

            $this->syncSingleImage($page, $files['image'] ?? null, (bool) ($files['image_deleted'] ?? false));

            // Единственный save: одна пачка событий, один пересчёт slug
            $page->fill($attributes);
            $page->images = $gallery;
            $page->save();

            return $page;
        });
    }

    /**
     * Удалить страницу.
     *
     * @param  bool  $cascade  true — удалить всё поддерево;
     *                         false — «поднять» детей на уровень выше (slug пересчитается)
     */
    public function delete(Page $page, bool $cascade = false): void
    {
        DB::transaction(function () use ($page, $cascade): void {
            if ($cascade) {
                // Удаляем снизу вверх, через модели → срабатывают события и чистка файлов
                Page::whereKey($page->descendantIds())
                    ->orderByDesc('id')
                    ->get()
                    ->each(fn (Page $child) => $this->deleteFiles($child) || $child->delete());
            } else {
                $newParentId = $page->parent_id;

                // ВАЖНО: через модели, а не query builder — иначе slug детей останется старым
                $page->children()->get()->each(function (Page $child) use ($newParentId): void {
                    $child->parent_id = $newParentId;
                    $child->alias = $child->uniqueAlias($child->alias); // защита от конфликта на новом уровне
                    $child->save();
                });
            }

            $parentId = $page->parent_id;

            $this->deleteFiles($page);
            $page->delete();

            Page::normalizeOrder($parentId);
            Page::flushCache();
        });
    }

    /**
     * Дублировать страницу (без поддерева) — удобно для контент-менеджера.
     */
    public function duplicate(Page $page): Page
    {
        return DB::transaction(function () use ($page): Page {
            $copy = $page->replicate(['slug', 'order']);
            $copy->name = "{$page->name} (копия)";
            $copy->alias = null;          // сгенерируется в saving()
            $copy->published = false;
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
    /*  Изображения                                                        */
    /* ------------------------------------------------------------------ */

    /**
     * Обновить одиночное изображение (обложку).
     *
     * @param  UploadedFile|null  $file     новый файл
     * @param  bool              $deleted  снять текущее изображение
     */
    private function syncSingleImage(Page $page, ?UploadedFile $file, bool $deleted): void
    {
        if ($deleted && $page->image) {
            $page->deleteSingleImage();   // из трейта HasImages
            $page->image = null;
        }

        if ($file instanceof UploadedFile) {
            if ($page->image) {
                $page->deleteSingleImage();
            }

            $page->image = $page->storeSingleImage($file);
        }
    }

    /**
     * Добавить новые файлы в галерею.
     *
     * @param  list<string>        $gallery  текущий список имён файлов
     * @param  list<UploadedFile>  $files
     * @return list<string>
     */
    private function appendGallery(Page $page, array $gallery, array $files): array
    {
        foreach ($files as $file) {
            if ($file instanceof UploadedFile) {
                $gallery[] = $page->storeImage($file);
            }
        }

        return array_values(array_unique($gallery));
    }

    /**
     * Применить новый порядок галереи и удалить помеченные файлы.
     *
     * @param  list<string>  $order    желаемый порядок (имена файлов с фронта)
     * @param  list<string>  $deleted  файлы к удалению
     * @return list<string>
     */
    private function reorderGallery(Page $page, array $order, array $deleted): array
    {
        $current = collect($page->images ?? []);

        foreach ($deleted as $name) {
            if ($current->contains($name)) {
                $page->deleteImage($name);
            }
        }

        $kept = $current->reject(fn (string $name) => in_array($name, $deleted, true));

        // Порядок с фронта — источник истины, но только для реально существующих файлов
        $ordered = collect($order)->filter(fn (string $name) => $kept->contains($name));

        return $ordered
            ->merge($kept->diff($ordered))   // файлы, которых не было в payload — в конец
            ->values()
            ->all();
    }

    /** Удалить все файлы страницы (обложка + галерея). */
    private function deleteFiles(Page $page): bool
    {
        if ($page->image) {
            $page->deleteSingleImage();
        }

        foreach ($page->images ?? [] as $name) {
            $page->deleteImage($name);
        }

        return false; // чтобы `|| $page->delete()` всегда выполнялся
    }
}
