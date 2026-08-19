<?php

declare(strict_types=1);

namespace App\Models;

use App\Traits\HasImages;
use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Модель страницы (дерево, materialized `slug`).
 *
 * Соглашения:
 *  - корень дерева — `parent_id === null` (НЕ id=1);
 *  - `alias`  — сегмент URL текущей страницы («about»);
 *  - `slug`   — полный путь от корня («company/about»), пересчитывается автоматически;
 *  - `order`  — позиция среди сиблингов, всегда 0..n-1 без дырок.
 *
 * @property int $id
 * @property string $name
 * @property string $alias
 * @property string|null $slug
 * @property int|null $parent_id
 * @property int $order
 * @property bool $published
 * @property array|null $images
 * @property-read string $url
 * @property-read Page|null $parent
 * @property-read EloquentCollection<int, Page> $children
 */
class Page extends Model
{
    use HasFactory;
    use HasImages;
    use LogsActivity;
    use SoftDeletes;

    /** Ключ кэша плоского справочника страниц. */
    public const CACHE_KEY = 'pages:flat';

    /** Свежесть / устаревание кэша (сек) для Cache::flexible(). */
    public const CACHE_TTL = [300, 1800];

    /** Максимальная глубина вложенности — страховка от циклов. */
    public const MAX_DEPTH = 20;

    /** Флаги вывода в меню — используются в scopeMenu() и на фронте. */
    public const MENU_FLAGS = ['on_header_menu', 'on_footer_menu', 'on_mobile_menu'];

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
        'on_header_menu',
        'on_footer_menu',
        'on_mobile_menu',
        'images',
    ];

    protected $appends = ['url', 'single_image_src', 'single_thumb'];

    /** @var list<string> Поля, не попадающие в лог активности. */
    protected array $activityHidden = ['text', 'images'];

    /**
     * Приведение типов (метод, а не свойство — актуальный синтаксис Laravel 11+).
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'order' => 'integer',
            'parent_id' => 'integer',
            'published' => 'boolean',
            'on_header_menu' => 'boolean',
            'on_footer_menu' => 'boolean',
            'on_mobile_menu' => 'boolean',
            'images' => 'array',
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Жизненный цикл                                                     */
    /* ------------------------------------------------------------------ */

    /**
     * Хуки модели.
     *
     * Важно: внутри `saved` для INSERT `wasChanged()` пуст,
     * поэтому дополнительно проверяем `wasRecentlyCreated`.
     */
    protected static function booted(): void
    {
        static::saving(function (self $page): void {
            // alias обязателен: генерируем из name, если пусто
            if (blank($page->alias)) {
                $page->alias = $page->uniqueAlias($page->name);
            }

            // Позиция в конце списка сиблингов по умолчанию
            $page->order ??= (static::query()->childrenOf($page->parent_id)->max('order') ?? -1) + 1;
        });

        static::saved(function (self $page): void {
            if ($page->wasRecentlyCreated || $page->wasChanged(['alias', 'parent_id'])) {
                $page->rebuildSlugs();
            }

            if ($page->wasChanged('published') && !$page->published) {
                $page->unpublishDescendants();
            }

            static::flushCache();
        });

        static::deleted(static fn() => static::flushCache());
        static::restored(static fn() => static::flushCache());
        static::forceDeleted(static fn() => static::flushCache());
    }

    /* ------------------------------------------------------------------ */
    /*  Связи                                                              */
    /* ------------------------------------------------------------------ */

    /** Родительская страница. */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /** Прямые дочерние страницы (в порядке `order`). */
    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->ordered();
    }

    /**
     * Рекурсивная загрузка поддерева.
     * По 1 запросу на уровень вложенности — использовать только для небольших ветвей.
     */
    public function descendants(): HasMany
    {
        return $this->children()->with('descendants');
    }

    /* ------------------------------------------------------------------ */
    /*  Scopes (атрибуты #[Scope] — Laravel 12+; для 11 и ниже — scopeXxx) */
    /* ------------------------------------------------------------------ */

    /** Только опубликованные. */
    #[Scope]
    protected function published(Builder $query): void
    {
        $query->where('published', true);
    }

    /** Корневые страницы. */
    #[Scope]
    protected function roots(Builder $query): void
    {
        $query->whereNull('parent_id');
    }

    /** Стабильная сортировка внутри уровня. */
    #[Scope]
    protected function ordered(Builder $query): void
    {
        $query->orderBy('order')->orderBy('id');
    }

    /** Дети конкретного родителя (корректно обрабатывает null). */
    #[Scope]
    protected function childrenOf(Builder $query, ?int $parentId): void
    {
        $parentId === null
            ? $query->whereNull('parent_id')
            : $query->where('parent_id', $parentId);
    }

    /** Страницы конкретного меню: Page::menu('header')->get(). */
    #[Scope]
    protected function menu(Builder $query, string $menu): void
    {
        $column = "on_{$menu}_menu";

        abort_unless(in_array($column, self::MENU_FLAGS, true), 500, "Unknown menu [$menu]");

        $query->published()->where($column, true)->ordered();
    }

    /* ------------------------------------------------------------------ */
    /*  Дерево                                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Дерево для react-arborist: ОДИН SQL-запрос, сборка в памяти.
     *
     * `children === null` для листьев — это важно: arborist определяет лист
     * как «children не является массивом», иначе у пустых узлов рисуется стрелка.
     *
     * @return list<array<string, mixed>>
     */
    public static function tree(bool $onlyPublished = false): array
    {
        $pages = static::query()
            ->when($onlyPublished, fn(Builder $q) => $q->published())
            ->ordered()
            ->get([
                'id',
                'parent_id',
                'name',
                'alias',
                'slug',
                'order',
                'published',
                ...self::MENU_FLAGS,
            ])
            ->groupBy(fn(self $page) => (int)($page->parent_id ?? 0));

        return static::buildBranch($pages, 0);
    }

    /**
     * Рекурсивная сборка ветки из сгруппированной по parent_id коллекции.
     *
     * @param \Illuminate\Support\Collection<int, EloquentCollection<int, self>> $grouped
     * @return list<array<string, mixed>>
     */
    private static function buildBranch($grouped, int $parentId): array
    {
        return $grouped->get($parentId, collect())
            ->map(function (self $page) use ($grouped): array {
                $children = static::buildBranch($grouped, (int)$page->id);

                return [
                    'id' => (string)$page->id,      // arborist требует string
                    'parent_id' => $page->parent_id ? (string)$page->parent_id : null,
                    'name' => $page->name,
                    'alias' => $page->alias,
                    'slug' => $page->slug,
                    'url' => $page->url,
                    'order' => (int)$page->order,
                    'published' => (bool)$page->published,
                    'in_menu' => collect(self::MENU_FLAGS)->filter(fn($f) => (bool)$page->{$f})->values()->all(),
                    'children' => $children === [] ? null : $children,
                ];
            })
            ->values()
            ->all();
    }

    /* ------------------------------------------------------------------ */
    /*  Slug / публикация                                                  */
    /* ------------------------------------------------------------------ */

    /**
     * Пересчитать `slug` у себя и всего поддерева.
     * Обход итеративный (без рекурсии по БД), запись — минуя события модели.
     */
    public function rebuildSlugs(): void
    {
        $flat = static::withTrashed()->get(['id', 'parent_id', 'alias']);
        $byId = $flat->keyBy('id');
        $byParent = $flat->groupBy(fn(self $p) => (int)($p->parent_id ?? 0));

        // Путь родителя
        $prefix = [];
        $cursor = $this->parent_id ? $byId->get($this->parent_id) : null;
        for ($depth = 0; $cursor && $depth < self::MAX_DEPTH; $depth++) {
            array_unshift($prefix, $cursor->alias);
            $cursor = $cursor->parent_id ? $byId->get($cursor->parent_id) : null;
        }

        $updates = [];
        $stack = [[(int)$this->id, $this->alias, $prefix]];

        while ($stack) {
            [$id, $alias, $path] = array_pop($stack);
            $segments = array_values(array_filter([...$path, $alias]));
            $updates[$id] = implode('/', $segments);

            foreach ($byParent->get($id, []) as $child) {
                $stack[] = [(int)$child->id, $child->alias, $segments];
            }
        }

        DB::transaction(function () use ($updates): void {
            foreach ($updates as $id => $slug) {
                static::withTrashed()->whereKey($id)->update(['slug' => $slug]);
            }
        });

        // Синхронизируем текущий инстанс, чтобы не вызвать повторный save
        $this->setAttribute('slug', $updates[(int)$this->id]);
        $this->syncOriginalAttribute('slug');

        static::flushCache();
    }

    /** Снять публикацию со всего поддерева (одним запросом). */
    public function unpublishDescendants(): void
    {
        $ids = $this->descendantIds();

        if ($ids !== []) {
            static::whereKey($ids)->update(['published' => false]);
            static::flushCache();
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Навигация по дереву                                                */
    /* ------------------------------------------------------------------ */

    /**
     * Все предки: от ближайшего к корню (или наоборот).
     *
     * @return list<self>
     */
    public function ancestors(bool $rootFirst = true, bool $withSelf = false): array
    {
        $map = static::flatCached();
        $chain = $withSelf ? [$this] : [];
        $cursor = $this->parent_id ? $map->get($this->parent_id) : null;

        for ($depth = 0; $cursor && $depth < self::MAX_DEPTH; $depth++) {
            $chain[] = $cursor;
            $cursor = $cursor->parent_id ? $map->get($cursor->parent_id) : null;
        }

        return $rootFirst ? array_reverse($chain) : $chain;
    }

    /**
     * ID всех потомков (BFS, один запрос).
     *
     * @return list<int>
     */
    public function descendantIds(): array
    {
        $byParent = static::query()
            ->get(['id', 'parent_id'])
            ->groupBy(fn(self $p) => (int)($p->parent_id ?? 0));

        $ids = [];
        $queue = [(int)$this->id];

        while ($queue) {
            $current = array_shift($queue);
            foreach ($byParent->get($current, []) as $child) {
                $ids[] = (int)$child->id;
                $queue[] = (int)$child->id;
            }
        }

        return $ids;
    }

    /** Является ли текущая страница предком страницы $pageId. */
    public function isAncestorOf(int|string|null $pageId): bool
    {
        if ($pageId === null) {
            return false;
        }

        $map = static::flatCached();
        $cursor = $map->get((int)$pageId);

        for ($depth = 0; $cursor && $depth < self::MAX_DEPTH; $depth++) {
            if ((int)$cursor->parent_id === (int)$this->id) {
                return true;
            }
            $cursor = $cursor->parent_id ? $map->get($cursor->parent_id) : null;
        }

        return false;
    }

    /** Можно ли назначить $parentId родителем текущей страницы. */
    public function canHaveParent(int|string|null $parentId): bool
    {
        return $parentId === null
            || ((int)$parentId !== (int)$this->id && !$this->isAncestorOf($parentId));
    }

    /**
     * Переместить страницу: новый родитель + позиция среди сиблингов.
     * Порядок сиблингов нормализуется (0..n-1), slug пересчитывается событием `saved`.
     *
     * @throws RuntimeException при попытке создать цикл
     */
    public function moveTo(int|string|null $parentId, int $index = 0): void
    {
        $parentId = $parentId === null || $parentId === '' ? null : (int)$parentId;

        if (!$this->canHaveParent($parentId)) {
            throw new RuntimeException('Нельзя переместить страницу внутрь себя или своего потомка.');
        }

        DB::transaction(function () use ($parentId, $index): void {
            $siblings = static::query()->childrenOf($parentId)
                ->whereKeyNot($this->getKey())
                ->ordered()
                ->pluck('id')
                ->all();

            $index = max(0, min($index, count($siblings)));
            array_splice($siblings, $index, 0, [(int)$this->id]);

            foreach ($siblings as $position => $id) {
                static::whereKey($id)->update(['order' => $position]);
            }

            $this->parent_id = $parentId;
            $this->order = $index;
            $this->save();

            // Порядок в старой ветке тоже нормализуем
            if ((int)($this->getOriginal('parent_id') ?? 0) !== (int)($parentId ?? 0)) {
                static::normalizeOrder($this->getOriginal('parent_id'));
            }
        });
    }

    /** Пересчитать `order` = 0..n-1 внутри ветки. */
    public static function normalizeOrder(int|string|null $parentId): void
    {
        static::query()->childrenOf($parentId === null ? null : (int)$parentId)
            ->ordered()
            ->pluck('id')
            ->each(fn($id, $position) => static::whereKey($id)->update(['order' => $position]));
    }

    /* ------------------------------------------------------------------ */
    /*  Alias / URL                                                        */
    /* ------------------------------------------------------------------ */

    /** Сгенерировать уникальный alias внутри той же ветки. */
    public function uniqueAlias(?string $source = null): string
    {
        $base = Str::slug($source ?: $this->name ?: 'page') ?: 'page';
        $alias = $base;
        $counter = 1;

        while (
        static::query()
            ->withTrashed()
            ->childrenOf($this->parent_id)
            ->where('alias', $alias)
            ->whereKeyNot($this->getKey())
            ->exists()
        ) {
            $alias = "{$base}-" . $counter++;
        }

        return $alias;
    }

    /** Публичный URL страницы (по полному пути). */
    public function getUrlAttribute(): string
    {
        return '/' . ltrim((string)($this->slug ?: $this->alias), '/');
    }

    /* ------------------------------------------------------------------ */
    /*  Кэш плоского справочника                                           */
    /* ------------------------------------------------------------------ */

    /**
     * Плоский справочник страниц, ключ — id.
     * Cache::flexible() = stale-while-revalidate (Laravel 11.23+).
     *
     * @return EloquentCollection<int, self>
     */
    public static function flatCached(): EloquentCollection
    {
        $result = Cache::remember(
            self::CACHE_KEY,
            self::CACHE_TTL[0],
            fn() => static::query()
                ->ordered()
                ->get(['id', 'parent_id', 'name', 'alias', 'slug', 'published'])
                ->keyBy('id')
        );

        // Защита от битой десериализации (например после смены драйвера кэша)
        if (!($result instanceof EloquentCollection)) {
            static::flushCache();
            return static::query()
                ->ordered()
                ->get(['id', 'parent_id', 'name', 'alias', 'slug', 'published'])
                ->keyBy('id');
        }

        return $result;
    }

    /** Сбросить кэш дерева/справочника. */
    public static function flushCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /* ------------------------------------------------------------------ */
    /*  Изображения                                                        */
    /* ------------------------------------------------------------------ */

    /** Конфигурация HasImages для страниц. */
    protected function getImageConfig(): array
    {
        return [
            'disk' => 'public',
            'path' => 'uploads/pages/images',
            'formats' => ['original', 'webp'],
            'thumbs' => [
                'thumb' => ['width' => 100, 'height' => 100],
                'small' => ['width' => 300, 'height' => 200],
                'medium' => ['width' => 600, 'height' => 400],
                'large' => ['width' => 1200, 'height' => 800],
            ],
            'single_path' => 'uploads/pages/image',
            'single_thumbs' => ['thumb' => ['width' => 100, 'height' => 100]],
            'quality' => 80,
            'max_file_size' => 10240,
        ];
    }

    /** URL оригинала одиночного изображения. */
    public function getSingleImageSrcAttribute(): ?string
    {
        if (!$this->image) {
            return null;
        }

        $config = $this->getImageConfig();

        return Storage::disk($config['disk'])
            ->url(($config['single_path'] ?? $config['path']) . '/original/' . $this->image);
    }

    /** URL превью одиночного изображения. */
    public function getSingleThumb(string $thumb = 'thumb'): ?string
    {
        if (!$this->image) {
            return null;
        }

        $config = $this->getImageConfig();
        $thumbs = $config['single_thumbs'] ?? $config['thumbs'];

        if (!isset($thumbs[$thumb])) {
            return null;
        }

        $file = pathinfo($this->image, PATHINFO_FILENAME) . "_{$thumb}.webp";

        return Storage::disk($config['disk'])
            ->url(($config['single_path'] ?? $config['path']) . "/thumbs/{$thumb}/" . $file);
    }

    public function getSingleThumbAttribute(): ?string
    {
        return $this->getSingleThumb();
    }
}
