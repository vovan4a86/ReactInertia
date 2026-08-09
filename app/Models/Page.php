<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Page extends Model
{
    use HasFactory, SoftDeletes;

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
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'order' => 'integer',
    ];

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

    // Рекурсивное получение всех потомков
    public function descendants()
    {
        return $this->hasMany(Page::class, 'parent_id')
            ->with('descendants');
    }

    // Получение дерева
    public static function getTree()
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
