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

            'image'      => $this->image,
            'image_src'  => $this->single_image_src,
            'image_thumb' => $this->single_thumb,
            'images'     => collect($this->images ?? [])->map(fn (string $name) => [
                'name'  => $name,
                'src'   => $this->getImageSrc($name),
                'thumb' => $this->getThumb($name, 'thumb'),
            ])->values(),

            'breadcrumbs' => collect($this->ancestors())->map(fn ($p) => [
                'id'   => (string) $p->id,
                'name' => $p->name,
            ])->values(),

            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
