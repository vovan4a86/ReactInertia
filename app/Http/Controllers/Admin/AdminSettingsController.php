<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\SettingType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveSettingsRequest;
use App\Http\Requests\Admin\SettingRequest;
use App\Http\Resources\SettingResource;
use App\Models\Setting;
use App\Models\SettingGroup;
use App\Services\Settings\SettingFieldsManager;
use App\Services\Settings\SettingFileManager;
use App\Services\Settings\SettingValueProcessor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Управление группами настроек, самими настройками и их значениями.
 */
class AdminSettingsController extends Controller
{
    public function __construct(
        private readonly SettingValueProcessor $processor,
        private readonly SettingFileManager $files,
        private readonly SettingFieldsManager $fields,
    ) {}

    /* Страницы
    | -----------------------------------------------------------------
    */

    /** Список групп + настройки первой группы. */
    public function index(): Response
    {
        $groups = $this->groups();

        return $this->renderIndex($groups, $groups->first());
    }

    /** Настройки конкретной группы. */
    public function groupItems(int $id): Response
    {
        $group = SettingGroup::findOrFail($id);

        return $this->renderIndex($this->groups(), $group);
    }

    /**
     * Форма создания/редактирования настройки (открывается в модалке).
     * Страница под модалкой сохраняет своё состояние.
     */
    public function editSetting(Request $request, ?int $id = null): Response
    {
        $setting = $id
            ? Setting::findOrFail($id)
            : new Setting([
                'setting_group_id' => $request->integer('setting_group_id'),
                'type'             => SettingType::Text,
                'params'           => [],
                'order'            => 0,
            ]);

        $groupId     = $id ? $setting->setting_group_id : $request->integer('setting_group_id');
        $activeGroup = $groupId ? SettingGroup::find($groupId) : null;

        return $this->renderIndex($this->groups(), $activeGroup, [
            'open'      => true,
            'component' => 'Admin/Settings/Edit',
            'props'     => [
                'setting' => (new SettingResource($setting))->toArray($request),
                'groups'      => $this->groups(),
                'types'       => SettingType::labels(),
                'fieldTypes'  => SettingFieldsManager::fieldTypeLabels(),
            ],
        ]);
    }

    /* Группы
    | -----------------------------------------------------------------
    */

    public function storeGroup(Request $request): RedirectResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:255']]);

        $group = SettingGroup::create($data + [
                'page_id' => 0,
                'order'   => (int) SettingGroup::where('page_id', 0)->max('order') + 1,
            ]);

        return redirect()
            ->route('admin.settings.groupItems', $group->id)
            ->with('success', 'Группа создана');
    }

    public function updateGroup(Request $request, int $id): RedirectResponse
    {
        $data  = $request->validate(['name' => ['required', 'string', 'max:255']]);
        $group = SettingGroup::findOrFail($id);
        $group->update($data);

        return back()->with('success', 'Группа обновлена');
    }

    public function destroyGroup(int $id): RedirectResponse
    {
        $group = SettingGroup::findOrFail($id);

        DB::transaction(function () use ($group): void {
            $group->settings()->each(function (Setting $setting): void {
                $this->files->deleteAll($setting);
                $setting->delete();
            });

            $group->delete();
        });

        Setting::clearCache();

        return redirect()
            ->route('admin.settings.index')
            ->with('success', 'Группа удалена');
    }

    /* Настройки
     | -----------------------------------------------------------------
     */

    public function storeSetting(SettingRequest $request): RedirectResponse
    {
        $data           = $request->validated();
        $data['params'] = $this->normalizeParams((int) $data['type'], $request->input('params', []));
        $data['order']  = $data['order']
            ?: (int) Setting::where('setting_group_id', $data['setting_group_id'])->max('order') + 1;

        Setting::create($data);

        return redirect()
            ->route('admin.settings.groupItems', $data['setting_group_id'])
            ->with('success', 'Настройка создана');
    }

    public function updateSetting(SettingRequest $request, int $id): RedirectResponse
    {
        $setting = Setting::findOrFail($id);

        $data           = $request->validated();
        $data['params'] = $this->normalizeParams((int) $data['type'], $request->input('params', []));

        // Смена типа делает старое значение невалидным — чистим вместе с файлами.
        if ($setting->type->value !== (int) $data['type']) {
            $this->files->deleteAll($setting);
            $data['value'] = null;
        }

        $setting->update($data);

        return redirect()
            ->route('admin.settings.groupItems', $data['setting_group_id'])
            ->with('success', 'Настройка обновлена');
    }

    public function destroySetting(int $id): RedirectResponse
    {
        $setting = Setting::findOrFail($id);
        $groupId = $setting->setting_group_id;

        DB::transaction(function () use ($setting): void {
            $this->files->deleteAll($setting);
            $setting->delete();
        });

        return redirect()
            ->route('admin.settings.groupItems', $groupId)
            ->with('success', 'Настройка удалена');
    }

    /** Очистить значение настройки вместе со всеми её файлами. */
    public function clearValue(int $id): RedirectResponse
    {
        $setting = Setting::findOrFail($id);

        $this->files->deleteAll($setting);
        $setting->value = $setting->type->isJson() ? [] : null;
        $setting->save();

        return back()->with('success', 'Значение очищено');
    }

    /* Сохранение значений
    | -----------------------------------------------------------------
    */

    /**
     * Массовое сохранение значений настроек группы.
     *
     * Обрабатываются ТОЛЬКО те настройки, что реально присутствуют в payload —
     * частичное сохранение не затирает остальные значения.
     */
    public function saveSettings(SaveSettingsRequest $request): RedirectResponse
    {
        $payload = $request->payload();
        $uploads = $request->uploads();

        $settings = Setting::where('setting_group_id', $request->integer('setting_group_id'))
            ->ordered()
            ->get();

        DB::transaction(function () use ($settings, $payload, $uploads): void {
            foreach ($settings as $setting) {
                if (!array_key_exists((string) $setting->id, $payload)) {
                    continue;
                }

                $this->processor->apply($setting, $payload[(string) $setting->id], $uploads);
            }
        });

        Setting::clearCache();

        return back()->with('success', 'Изменения сохранены');
    }


    /* Внутренние
    | -----------------------------------------------------------------
    */

    /** @return Collection<int, SettingGroup> */
    private function groups(): Collection
    {
        return SettingGroup::where('page_id', 0)->orderBy('order')->orderBy('id')->get();
    }

    /**
     * Единая точка рендера страницы настроек — исключает рассинхрон пропсов
     * между index/groupItems/editSetting.
     *
     * @param  Collection<int, SettingGroup>  $groups
     * @param  array<string, mixed>|null      $modalData
     */
    private function renderIndex(Collection $groups, ?SettingGroup $activeGroup, ?array $modalData = null): Response
    {
        $settings = $activeGroup
            ? $activeGroup->settings()->ordered()->get()
            : collect();

        return Inertia::render('Admin/Settings/Index', [
            'groups'      => $groups,
            'activeGroup' => $activeGroup,
            'settings'    => SettingResource::collection($settings)->resolve(),
            'modalData'   => $modalData,
        ]);
    }

    /**
     * Нормализация params под конкретный тип настройки.
     * Гарантирует чистую структуру: fields[key] = ['type' => int, 'title' => string].
     *
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    private function normalizeParams(int $type, array $params): array
    {
        $settingType = SettingType::tryFrom($type);

        if ($settingType?->hasFields()) {
            $fields = [];

            foreach ((array) ($params['fields'] ?? []) as $key => $field) {
                $key = is_string($key) ? trim($key) : '';

                if ($key === '' || !is_array($field) || !isset($field['type'])) {
                    continue;
                }

                $fields[$key] = [
                    'type'  => (int) $field['type'],
                    'title' => (string) ($field['title'] ?? $key),
                ];
            }

            return ['fields' => $fields];
        }

        if ($settingType === SettingType::Gallery) {
            return ['thumbs' => trim((string) ($params['thumbs'] ?? ''))];
        }

        return [];
    }
}
