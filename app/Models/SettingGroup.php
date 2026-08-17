<?php

declare(strict_types=1);

namespace App\Models;

use App\Services\Settings\SettingFileManager;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Группа настроек — вкладка в админке.
 *
 * @property int         $id
 * @property string      $name
 * @property string|null $description
 * @property int         $page_id
 * @property int         $order
 *
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Setting> $settings
 */
class SettingGroup extends Model
{
    /** Группы, не привязанные к странице (общие настройки сайта). */
    public const GLOBAL_PAGE_ID = 0;

    protected $fillable = ['name', 'description', 'page_id', 'order'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'page_id' => 'integer',
            'order'   => 'integer',
        ];
    }

    protected static function booted(): void
    {
        // Каскад на уровне модели: группа может удаляться откуда угодно
        // (контроллер, консольная команда, связанная страница),
        // а файлы настроек не должны оставаться сиротами на диске.
        static::deleting(static function (self $group): void {
            $files = app(SettingFileManager::class);

            $group->settings()->cursor()->each(static function (Setting $setting) use ($files): void {
                $files->deleteAll($setting);
                $setting->delete();
            });
        });

        static::saved(static fn () => Setting::clearCache());
        static::deleted(static fn () => Setting::clearCache());
    }

    /* Отношения
    | -----------------------------------------------------------------
    */

    /** Настройки группы (всегда в пользовательском порядке). */
    public function settings(): HasMany
    {
        return $this->hasMany(Setting::class, 'setting_group_id')
            ->orderBy('order')
            ->orderBy('id');
    }

    /* Скоупы
    | -----------------------------------------------------------------
    */

    /** @param Builder<self> $query */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('order')->orderBy('id');
    }

    /**
     * Группы конкретной страницы (по умолчанию — общие настройки сайта).
     *
     * @param Builder<self> $query
     */
    public function scopeForPage(Builder $query, int $pageId = self::GLOBAL_PAGE_ID): Builder
    {
        return $query->where('page_id', $pageId);
    }

    /* Хелперы
    | -----------------------------------------------------------------
    */

    /** Следующий порядковый номер внутри страницы. */
    public static function nextOrder(int $pageId = self::GLOBAL_PAGE_ID): int
    {
        return (int) static::query()->where('page_id', $pageId)->max('order') + 1;
    }

    /**
     * Все значения группы в виде [code => value] — удобно на витрине:
     * `SettingGroup::values('contacts')['phone']`.
     *
     * @return array<string, mixed>
     */
    public static function values(string $groupName): array
    {
        return static::query()
            ->where('name', $groupName)
            ->with('settings')
            ->first()
            ?->settings
            ->mapWithKeys(static fn (Setting $setting) => [$setting->code => $setting->value])
            ->all() ?? [];
    }

}
