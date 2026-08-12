<?php

namespace App\Models;

use App\Traits\HasImages;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Page extends Model
{
    use HasFactory, SoftDeletes, HasImages;

    protected $fillable = [
        'title',
        'slug',
        'content',
        'parent_id',
        'order',
        'is_active',
        'meta_title',
        'meta_description',
        'template',
        'image',
        'images',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'order' => 'integer',
        'images' => 'array',
    ];

    protected $appends = ['url', 'single_image_src', 'single_thumb'];

    /**
     * Переопределяем конфигурацию для страниц
     */
    protected function getImageConfig(): array
    {
        return [
            'disk' => 'public',
            'path' => 'uploads/pages/images', // Свой путь для страниц
            'formats' => ['original', 'webp'],
            'thumbs' => [
                'thumb' => ['width' => 100, 'height' => 100],
                'small' => ['width' => 300, 'height' => 200],
                'medium' => ['width' => 600, 'height' => 400],
                'large' => ['width' => 1200, 'height' => 800],
            ],
            'single_path' => 'uploads/pages/image',
            'single_thumbs' => [
                'thumb' => ['width' => 100, 'height' => 100],
            ],
            'quality' => 80,
            'max_file_size' => 10240,
        ];
    }

    /**
     * Получить URL оригинального изображения
     */
    public function getSingleImageSrcAttribute(): ?string
    {
        if (!$this->image) {
            return null;
        }

        $config = $this->getImageConfig();
        $basePath = $config['single_path'] ?? $config['path'];

        return Storage::disk($config['disk'])->url($basePath . '/original/' . $this->image);
    }

    /**
     * Получить URL превью изображения
     */
    public function getSingleThumb($thumb = 'thumb'): ?string
    {
        if (!$this->image) {
            return null;
        }

        $config = $this->getImageConfig();
        $basePath = $config['single_path'] ?? $config['path'];
        $thumbs = $config['single_thumbs'] ?? $config['thumbs'];

        if (!isset($thumbs[$thumb])) {
            return null;
        }

        $webpFilename = pathinfo($this->image, PATHINFO_FILENAME) . "_{$thumb}.webp";

        return Storage::disk($config['disk'])->url($basePath . "/thumbs/{$thumb}/" . $webpFilename);
    }

    public function getSingleThumbAttribute(): ?string
    {
        return $this->getSingleThumb('thumb');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Page::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Page::class, 'parent_id')
            ->orderBy('order');
    }

    public function allChildren(): HasMany
    {
        return $this->hasMany(Page::class, 'parent_id')
            ->with('allChildren');
    }

    public function getUrlAttribute(): string
    {
        return '/' . $this->alias;
    }

    // Рекурсивное получение всех потомков
    public function descendants()
    {
        return $this->hasMany(Page::class, 'parent_id')
            ->with('descendants');
    }

    // Получение дерева
    public static function getTree(): Collection
    {
        return self::with('descendants')
            ->whereNull('parent_id')
            ->orderBy('order')
            ->get();
    }

    // Форматирование для react-arborist
    public function toTreeNode(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'is_active' => $this->is_active,
            'children' => $this->children ? $this->children->map(fn($child) => $child->toTreeNode())->toArray() : [],
        ];
    }

    // Проверка на циклическую зависимость
    public function isDescendantOf($pageId): bool
    {
        if ($this->parent_id === $pageId) {
            return true;
        }

        if ($this->parent) {
            return $this->parent->isDescendantOf($pageId);
        }

        return false;
    }

    // Получение всех id потомков
    public function getDescendantIds(): array
    {
        $ids = [];

        foreach ($this->children as $child) {
            $ids[] = $child->id;
            $ids = array_merge($ids, $child->getDescendantIds());
        }

        return $ids;
    }

    // Безопасное обновление родителя
    public function safeUpdateParent($newParentId): bool
    {
        // Нельзя установить родителем самого себя
        if ($newParentId === $this->id) {
            return false;
        }

        // Проверяем, не является ли новый родитель потомком текущей страницы
        if ($newParentId) {
            $newParent = Page::find($newParentId);
            if ($newParent && $newParent->isDescendantOf($this->id)) {
                return false;
            }
        }

        $this->parent_id = $newParentId;
        $this->save();

        return true;
    }
}
