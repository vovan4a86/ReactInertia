<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Полное представление страницы для формы редактирования.
 *
 * @mixin \App\Models\Page
 */
final class PageResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id'        => (string) $this->id,
            'parent_id' => $this->parent_id ? (string) $this->parent_id : '',
            'name'      => (string) $this->name,
            'h1'        => (string) ($this->h1 ?? ''),
            'alias'     => (string) $this->alias,
            'slug'      => (string) $this->slug,
            'url'       => $this->url,
            'announce'  => (string) ($this->announce ?? ''),
            'text'      => (string) ($this->text ?? ''),
            'order'     => (int) $this->order,

            'published'      => (bool) $this->published,
            'on_header_menu' => (bool) $this->on_header_menu,
            'on_footer_menu' => (bool) $this->on_footer_menu,
            'on_mobile_menu' => (bool) $this->on_mobile_menu,

            'title'          => (string) ($this->title ?? ''),
            'keywords'       => (string) ($this->keywords ?? ''),
            'description'    => (string) ($this->description ?? ''),
            'og_title'       => (string) ($this->og_title ?? ''),
            'og_description' => (string) ($this->og_description ?? ''),

            // Одиночное изображение
            'image'      => $this->image,
            'single_image_src'  => $this->single_image_src,
            'single_thumb' => $this->single_thumb,

            // ─────────────────────────────────────────────────────────────
            // Галерея.
            // HasImages сохраняет images как JSON-массив записей:
            //   [['name'=>'uuid.jpg','original'=>'path/...','thumb'=>'...', ...], ...]
            //
            // ImageUploader ожидает на входе именно массив таких объектов —
            // он сам знает как строить URL через getDisplayUrl().
            //
            // Мы дополнительно добавляем плоские поля thumb_webp / medium_webp /
            // large_webp, чтобы ImageUploader мог выбрать лучший формат.
            // ─────────────────────────────────────────────────────────────
            'images' => collect($this->images ?? [])
                ->filter(fn ($item) => is_array($item))   // защита от битого JSON
                ->map(fn (array $img) => $this->formatGalleryItem($img))
                ->values()
                ->all(),

            'breadcrumbs' => collect($this->ancestors())->map(fn ($p) => [
                'id'   => (string) $p->id,
                'name' => $p->name,
            ])->values(),

            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    /**
     * Приводим запись галереи к формату, который понимает ImageUploader.
     *
     * HasImages кладёт в JSON примерно такую структуру:
     * {
     *   "name": "uuid.jpg",
     *   "original": "uploads/pages/images/original/uuid.jpg",
     *   "thumb":    "uploads/pages/images/thumbs/thumb/uuid_thumb.webp",
     *   "thumb_webp":"uploads/pages/images/thumbs/thumb/uuid_thumb.webp",
     *   "small":    "uploads/pages/images/thumbs/small/uuid_small.jpg",
     *   "small_webp":"uploads/pages/images/thumbs/small/uuid_small.webp",
     *   "medium":   "uploads/pages/images/thumbs/medium/uuid_medium.jpg",
     *   "medium_webp":"uploads/pages/images/thumbs/medium/uuid_medium.webp",
     *   "large":    "uploads/pages/images/thumbs/large/uuid_large.jpg",
     *   "large_webp":"uploads/pages/images/thumbs/large/uuid_large.webp",
     * }
     *
     * ImageUploader.getDisplayUrl() ищет плоские ключи thumb_webp, thumb, medium_webp и т.д.
     * Мы отдаём их как absolute URL через Storage::url().
     *
     * @param  array<string, string|null>  $img
     * @return array<string, string|null>
     */
    private function formatGalleryItem(array $img): array
    {
        // Метод HasImages для получения публичных URL
        // getImagesWithUrls() возвращает готовые URL, но нам нужна плоская структура.
        // Используем getImageUrl() если он есть, иначе строим вручную.
        $urlFor = fn (?string $path): ?string =>
        $path ? $this->resource->getGalleryUrl($path) : null;

        return [
            // Идентификатор записи — путь к оригиналу (то, что хранит БД и что
            // нужно передавать в order[] и deleted_images[] на бэк)
            'name'        => $img['name']     ?? null,
            'original'    => $img['original'] ?? null,

            // Превью для сетки (ImageUploader использует thumb → thumb_webp)
            'thumb'       => $urlFor($img['thumb']       ?? null),
            'thumb_webp'  => $urlFor($img['thumb_webp']  ?? $img['thumb'] ?? null),

            // Среднее (используется в DragOverlay)
            'medium'      => $urlFor($img['medium']      ?? null),
            'medium_webp' => $urlFor($img['medium_webp'] ?? $img['medium'] ?? null),

            // Полный размер (используется для предпросмотра по клику)
            'large'       => $urlFor($img['large']       ?? null),
            'large_webp'  => $urlFor($img['large_webp']  ?? $img['large'] ?? null),

            // Оригинал для скачивания
            'src'         => $urlFor($img['original']    ?? null),
        ];
    }
}
