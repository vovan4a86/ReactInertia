<?php

namespace App\Models;

use App\Traits\HasImages;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class Page extends Model
{
    use HasFactory, SoftDeletes, HasImages;

    protected $fillable = [
        'name',
        'h1',
        'alias',
        'slug',
        'image',
        'announce',
        'text',
        'parent_id',
        'order',
        'title',
        'keywords',
        'description',
        'og_title',
        'og_description',
        'published',
        'on_main',
        'on_header_menu',
        'on_footer_menu',
        'on_mobile_menu',
        'images',
    ];

    protected $casts = [
        'published' => 'boolean',
        'on_main' => 'boolean',
        'on_header_menu' => 'boolean',
        'on_footer_menu' => 'boolean',
        'on_mobile_menu' => 'boolean',
        'order' => 'integer',
        'images' => 'array',
    ];

    protected $appends = ['url', 'single_image_src', 'single_thumb'];

    private bool $_disableEventUpdateSlug = false;
    private bool $_disableEventUpdatePublished = false;
    protected array $_parents = [];

    public static function boot(): void
    {
        parent::boot();

        self::saved(function (self $category) {
            if ($category->isDirty('alias') || $category->isDirty('parent_id')) {
                if (!$category->_disableEventUpdateSlug) {
                    self::updateUrlRecurse($category);
                }
            }
            if ($category->isDirty('published') && $category->published == 0) {
                if (!$category->_disableEventUpdatePublished) {
                    self::updateDisablePublishedRecurse($category);
                }
            }
        });
    }

    public static function updateUrlRecurse(self $category): void
    {
        // Проверяем существование категории
        if (!$category || !$category->exists) {
            return;
        }

        $parents = $category->getParents(true, true);
        $slug_arr = [];
        foreach ($parents as $parent) {
            if ($parent && $parent->alias) {
                $slug_arr[] = $parent->alias;
            }
        }

        // Используем try-finally для гарантии сброса флага
        $category->_disableEventUpdateSlug = true;
        try {
            $category->update(['slug' => implode('/', $slug_arr)]);

            // Оптимизация: используем chunk для больших деревьев
            $category->children()->chunk(100, function ($children) {
                foreach ($children as $child) {
                    self::updateUrlRecurse($child);
                }
            });
        } finally {
            $category->_disableEventUpdateSlug = false;
        }
    }

    public static function updateDisablePublishedRecurse(self $category): void
    {
        if (!$category || !$category->exists) {
            return;
        }

        $category->_disableEventUpdatePublished = true;
        try {
            $category->update(['published' => 0]);

            // Исправлено: вызываем правильный метод для рекурсии
            $category->children()->chunk(100, function ($children) {
                foreach ($children as $child) {
                    self::updateDisablePublishedRecurse($child);
                }
            });
        } finally {
            $category->_disableEventUpdatePublished = false;
        }
    }

    public function getParents($with_self = false, $reverse = false): array
    {
        $p = $this;
        $parents = [];

        if ($with_self) {
            $parents[] = $p;
        }

        // Используем кэшированные родительские связи
        if (empty($this->_parents) && $this->parent_id > 1) {
            $currentParentId = $this->parent_id;
            $maxDepth = 50; // Защита от бесконечного цикла
            $depth = 0;

            while ($currentParentId > 1 && $depth < $maxDepth) {
                $parent = self::getPages($currentParentId);
                if (!$parent) {
                    break;
                }
                $this->_parents[] = $parent;
                $currentParentId = $parent->parent_id;
                $depth++;
            }
        }

        $parents = array_merge($parents, $this->_parents);

        if ($reverse) {
            $parents = array_reverse($parents);
        }

        return $parents;
    }

    public static function getPages($id = null)
    {
        // Добавляем блокировку для предотвращения гонок при кэшировании
        $pages = Cache::get('pages', []);

        if (empty($pages)) {
            // Используем lock для предотвращения множественных запросов
            $lock = Cache::lock('pages_lock', 10);

            try {
                $lock->block(5);

                // Повторная проверка после получения блокировки
                $pages = Cache::get('pages', []);

                if (empty($pages)) {
                    $pages_arr = Page::all(['id', 'name', 'alias', 'published', 'parent_id']);
                    foreach ($pages_arr as $item) {
                        $pages[$item->id] = $item;
                    }
                    Cache::put('pages', $pages, 60); // Увеличиваем время кэширования
                }
            } finally {
                optional($lock)->release();
            }
        }

        if ($id) {
            return $pages[$id] ?? null;
        }

        return $pages;
    }

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
            'id' => (string)$this->id, //обязательно string для react-дерева
            'title' => $this->name,
            'slug' => $this->alias,
            'is_active' => $this->published,
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
