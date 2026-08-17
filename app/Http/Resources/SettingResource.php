<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\SettingType;
use App\Models\Setting;
use App\Services\Settings\SettingFileManager;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Единый формат настройки для React/Inertia.
 *
 * Ключевые моменты:
 *  - file_urls — ПЛОСКАЯ карта [имя файла => URL].
 *    Фронт ищет превью по значению поля, поэтому drag&drop-сортировка
 *    больше не «перемешивает» картинки;
 *  - thumbs_data тоже ключуется именем файла.
 *
 * @mixin Setting
 */
class SettingResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var Setting $setting */
        $setting = $this->resource;
        $files   = app(SettingFileManager::class);

        return [
            'id'               => $setting->id,
            'setting_group_id' => $setting->setting_group_id,
            'code'             => $setting->code,
            'name'             => $setting->name,
            'description'      => $setting->description,
            'order'            => $setting->order,
            'type'             => $setting->type->value,
            'type_label'       => $setting->type->label(),
            'params'           => $setting->params ?? [],
            'value'            => $setting->value,

            // Файлы
            'file_urls'    => $this->when($setting->type->handlesFiles(), fn () => $setting->fileUrlMap()),
            'file_url'     => $this->when(
                $setting->type === SettingType::File,
                fn () => Setting::fileUrl(is_string($setting->value) ? $setting->value : null)
            ),

            // Миниатюры галереи
            'thumbs_config' => $this->when($setting->type === SettingType::Gallery, fn () => $setting->thumbsConfig()),
            'thumbs_data'   => $this->when($setting->type === SettingType::Gallery, fn () => $files->thumbsData($setting)),
        ];
    }
}
