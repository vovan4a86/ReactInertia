<?php

namespace App\Http\Controllers\Admin;

use App\Models\Setting;
use App\Models\SettingGroup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Intervention\Image\ImageManager;

class AdminSettingsController
{
    protected array $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];

    public function index()
    {
        $groups = SettingGroup::where('page_id', 0)
            ->orderBy('order')
            ->get();

        $activeGroup = $groups->first();
        $settings = $activeGroup
            ? $activeGroup->settings()->orderBy('order')->get()
            : collect();

        return Inertia::render('Admin/Settings/Index', [
            'groups' => $groups,
            'activeGroup' => $activeGroup,
            'settings' => $this->formatSettings($settings),
        ]);
    }

    public function groupItems(int $id)
    {
        $group = SettingGroup::with(['settings' => fn($q) => $q->orderBy('order')])->findOrFail($id);
        $groups = SettingGroup::where('page_id', 0)->orderBy('order')->get();

        return Inertia::render('Admin/Settings/Index', [
            'groups' => $groups,
            'activeGroup' => $group,
            'settings' => $this->formatSettings($group->settings),
        ]);
    }

    public function storeGroup(Request $request)
    {
        $data = $request->validate(['name' => 'required|string|max:255']);
        $data['page_id'] = 0;

        SettingGroup::create($data);

        return back()->with('success', 'Группа создана');
    }

    public function updateGroup(Request $request, int $id)
    {
        $data = $request->validate(['name' => 'required|string|max:255']);

        $group = SettingGroup::findOrFail($id);
        $group->update($data);

        return back()->with('success', 'Группа обновлена');
    }

    public function destroyGroup(int $id)
    {
        $group = SettingGroup::findOrFail($id);

        // Delete all settings files in this group
        $settings = Setting::where('setting_group_id', $id)->get();
        foreach ($settings as $setting) {
            $this->deleteSettingFiles($setting);
        }

        Setting::where('setting_group_id', $id)->delete();
        $group->delete();

        Setting::clearCache();

        return back()->with('success', 'Группа удалена');
    }

    public function editSetting(Request $request, ?int $id = null)
    {
        $setting = $id ? Setting::findOrFail($id) : new Setting([
            'setting_group_id' => $request->input('setting_group_id'),
            'type' => 0,
            'params' => [],
        ]);

        $groups = SettingGroup::where('page_id', 0)->orderBy('order')->get();

        return Inertia::render('Admin/Settings/Edit', [
            'setting' => $setting,
            'groups' => $groups,
            'types' => Setting::$types,
        ]);
    }

    public function storeSetting(Request $request)
    {
        return $this->saveSetting($request);
    }

    public function updateSetting(Request $request, int $id)
    {
        return $this->saveSetting($request, $id);
    }

    public function clearValue(int $id)
    {
        $setting = Setting::findOrFail($id);

        if ($setting->value) {
            $this->deleteFile($setting->value);
            $setting->value = null;
            $setting->save();
            Setting::clearCache();
        }

        return back()->with('success', 'Значение очищено');
    }

    public function saveSettings(Request $request)
    {
        $request->validate(['setting_group_id' => 'required|exists:setting_groups,id']);

        $groupId = $request->input('setting_group_id');
        $settingsData = $request->input('settings', []);

        $settings = Setting::where('setting_group_id', $groupId)->get();

        foreach ($settings as $setting) {
            $value = $settingsData[$setting->id] ?? null;
            $this->processSettingValue($setting, $value, $request);
        }

        Setting::clearCache();

        return back()->with('success', 'Изменения сохранены');
    }

    protected function saveSetting(Request $request, ?int $id = null)
    {
        $rules = [
            'name' => 'required|string|max:255',
            'type' => 'required|integer|in:0,1,2,3,4,5,6,7',
            'code' => 'required|string|max:255|unique:settings,code',
            'setting_group_id' => 'required|exists:setting_groups,id',
            'description' => 'nullable|string',
            'params' => 'nullable|array',
        ];

        if ($id) {
            $setting = Setting::findOrFail($id);
            $rules['code'] = 'required|string|max:255|unique:settings,code,' . $id;
        }

        $data = $request->validate($rules);

        // Process params based on type
        $data['params'] = $this->processParams($data['type'], $request->input('params', []));

        if ($id) {
            $setting->update($data);
            $message = 'Настройка обновлена';
        } else {
            $order = Setting::where('setting_group_id', $data['setting_group_id'])->max('order') ?? 0;
            $data['order'] = $order + 1;
            $setting = Setting::create($data);
            $message = 'Настройка создана';
        }

        Setting::clearCache();

        return back()->with('success', $message);
    }

    protected function processParams(int $type, array $params): array
    {
        if (in_array($type, [4, 6]) && isset($params['fields'])) {
            $fields = [];

            // Если fields пришел как объект с ключами (из React)
            foreach ($params['fields'] as $key => $fieldData) {
                if (empty($key)) {
                    continue;
                }

                // Проверяем, является ли $fieldData массивом с type и title
                if (is_array($fieldData) && isset($fieldData['type'])) {
                    $fields[$key] = [
                        'type' => (int)$fieldData['type'],
                        'title' => $fieldData['title'] ?? '',
                    ];
                }
            }

            return ['fields' => $fields];
        }

        return $params;
    }

    /**
     * Process setting value based on its type
     */
    protected function processSettingValue(Setting $setting, mixed $value, Request $request): void
    {
        switch ($setting->type) {
            case 0: // Text
                $setting->value = $this->sanitizeTextValue($value);
                $setting->save();
                break;

            case 1: // Textarea
                $setting->value = $value !== null ? $value : '';
                $setting->save();
                break;

            case 2: // Editor - сохраняем HTML как есть
                $setting->value = $this->sanitizeHtmlValue($value);
                $setting->save();
                break;

            case 3: // File
                $this->processSingleFile($setting, $value, $request);
                break;

            case 4: // Data with possible files
                $this->processStructuredData($setting, $value, $request);
                break;

            case 5: // Simple list
                $this->processList($setting, $value);
                break;

            case 6: // List data with possible files
                $this->processListData($setting, $value, $request);
                break;

            case 7: // Gallery
                $this->processGallery($setting, $value ?? [], $request);
                break;
        }
    }

    /**
     * Process single file upload (type 3)
     */
    protected function processSingleFile(Setting $setting, mixed $value, Request $request): void
    {
        $fileInputName = 'settings.' . $setting->id;

        if ($request->hasFile($fileInputName)) {
            // Delete old file
            $this->deleteFile($setting->value);

            $file = $request->file($fileInputName);
            $fileName = $this->generateFileName($setting, $file->getClientOriginalExtension());

            $this->storeFile($file, $fileName);

            $setting->value = $fileName;
            $setting->save();
        } elseif ($value === null || $value === '') {
            // Очищаем файл если значение null или пустая строка
            if (!empty($setting->value)) {
                $this->deleteFile($setting->value);
                $setting->value = null;
                $setting->save();
            }
        }
    }

    /**
     * Process structured data that may contain files (type 4)
     */
    protected function processStructuredData(Setting $setting, mixed $value, Request $request): void
    {
        if (!is_array($value)) {
            return;
        }

        $params = $setting->params ?? [];
        $fields = $params['fields'] ?? [];
        $oldValue = is_string($setting->value) ? json_decode($setting->value, true) : [];

        // Обрабатываем файлы в структуре данных
        $processedValue = $this->processNestedFiles($value, $fields, $request, $setting, $oldValue);

        $setting->value = json_encode($processedValue);
        $setting->save();
    }

    /**
     * Process simple list (type 5)
     */
    protected function processList(Setting $setting, mixed $value): void
    {
        if (!is_array($value)) {
            return;
        }

        // Remove empty elements
        $value = array_filter($value, function($item) {
            return $item !== null && $item !== '';
        });

        $setting->value = json_encode(array_values($value));
        $setting->save();
    }

    /**
     * Process list data that may contain files (type 6)
     */
    protected function processListData(Setting $setting, mixed $value, Request $request): void
    {
        if (!is_array($value)) {
            return;
        }

        $params = $setting->params ?? [];
        $oldValue = is_string($setting->value) ? json_decode($setting->value, true) : [];

        // Транспонируем массив для list data
        if ($this->isAssociativeArray($value) && !empty($value)) {
            $rows = [];
            $firstKey = array_key_first($value);
            if (is_array($value[$firstKey])) {
                foreach ($value[$firstKey] as $index => $v) {
                    $row = [];
                    foreach ($value as $field => $fieldValues) {
                        $row[$field] = $fieldValues[$index] ?? null;
                    }
                    $rows[] = $row;
                }
                $value = $rows;
            }
        }

        // Remove empty rows
        $value = array_filter($value, function($row) {
            if (!is_array($row)) return false;
            return !empty(array_filter($row, function($val) {
                return $val !== null && $val !== '';
            }));
        });

        // Process files in each row
        $processedValue = [];
        foreach ($value as $row) {
            $processedValue[] = $this->processNestedFiles($row, $params, $request, $setting, $oldValue);
        }

        $setting->value = json_encode(array_values($processedValue));
        $setting->save();
    }

    /**
     * Process gallery (type 7)
     */
    protected function processGallery(Setting $setting, array $value, Request $request): void
    {
        $existingFiles = is_string($setting->value)
            ? json_decode($setting->value, true) ?? []
            : [];

        $newFiles = [];

        foreach ($value as $index => $item) {
            $fileInputName = "settings.{$setting->id}.{$index}";

            if ($request->hasFile($fileInputName)) {
                $file = $request->file($fileInputName);
                $fileName = $this->generateUniqueFileName($setting, $file->getClientOriginalExtension());

                $this->storeFile($file, $fileName);

                // Delete old file if replacing
                if (isset($existingFiles[$index])) {
                    $this->deleteFile($existingFiles[$index]);
                }

                $newFiles[] = $fileName;
            } elseif (is_string($item) && !empty($item)) {
                // Keep existing file
                $newFiles[] = $item;
            }
        }

        // Delete removed files
        $filesToDelete = array_diff($existingFiles, $newFiles);
        foreach ($filesToDelete as $deletedFile) {
            $this->deleteFile($deletedFile);
        }

        $setting->value = json_encode(array_values($newFiles));
        $setting->save();
    }

    protected function processNestedFiles(array $data, array $params, Request $request, Setting $setting, array $oldData, string $prefix = ''): array
    {
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $newPrefix = $prefix === '' ? (string)$key : $prefix . '.' . $key;
                $data[$key] = $this->processNestedFiles($value, $params, $request, $setting, $oldData[$key] ?? [], $newPrefix);
            } else {
                // Формируем имя поля для поиска файла
                // Для типа 6: settings.{settingId}.{rowIndex}.{fieldName}
                $fileInputName = $prefix === ''
                    ? 'settings.' . $setting->id . '.' . $key
                    : 'settings.' . $setting->id . '.' . $prefix . '.' . $key;

                // Проверяем, есть ли файл в запросе
                if ($request->hasFile($fileInputName)) {
                    $file = $request->file($fileInputName);

                    // Если это массив файлов (может случиться при неправильной отправке)
                    if (is_array($file)) {
                        $file = reset($file); // Берем первый файл
                    }

                    if ($file instanceof \Illuminate\Http\UploadedFile) {
                        $fileName = $this->generateUniqueFileName($setting, $file->getClientOriginalExtension());
                        $this->storeFile($file, $fileName);

                        // Delete old file if exists
                        $oldFile = $oldData[$key] ?? null;
                        if ($oldFile && is_string($oldFile) && !str_starts_with($oldFile, 'settings.')) {
                            $this->deleteFile($oldFile);
                        }

                        $data[$key] = $fileName;
                    }
                } elseif ($this->isFileUploadMarker($value)) {
                    $fileInputName = $this->convertDotNotationToBrackets($value);

                    if ($request->hasFile($fileInputName)) {
                        $file = $request->file($fileInputName);

                        if (is_array($file)) {
                            $file = reset($file);
                        }

                        if ($file instanceof \Illuminate\Http\UploadedFile) {
                            $fileName = $this->generateUniqueFileName($setting, $file->getClientOriginalExtension());
                            $this->storeFile($file, $fileName);

                            $oldFile = $oldData[$key] ?? null;
                            if ($oldFile && is_string($oldFile) && !str_starts_with($oldFile, 'settings.')) {
                                $this->deleteFile($oldFile);
                            }

                            $data[$key] = $fileName;
                        }
                    } else {
                        $oldFile = $oldData[$key] ?? null;
                        $data[$key] = (is_string($oldFile) && !str_starts_with($oldFile, 'settings.')) ? $oldFile : null;
                    }
                }
            }
        }

        return $data;
    }

    /**
     * Convert dot notation to bracket notation for file inputs
     * Example: settings.123.title -> settings[123][title]
     */
    protected function convertDotNotationToBrackets(string $dotNotation): string
    {
        $parts = explode('.', $dotNotation);
        $result = array_shift($parts); // settings

        foreach ($parts as $part) {
            $result .= '[' . $part . ']';
        }

        return $result;
    }

    protected function isFileUploadMarker(mixed $value): bool
    {
        return is_string($value) && str_starts_with($value, 'settings.');
    }

    protected function isAssociativeArray(array $arr): bool
    {
        if ([] === $arr) return false;
        return array_keys($arr) !== range(0, count($arr) - 1);
    }

    /**
     * Delete all files associated with a setting
     */
    protected function deleteSettingFiles(Setting $setting): void
    {
        switch ($setting->type) {
            case 3:
                $this->deleteFile($setting->value);
                break;

            case 4:
            case 5:
            case 6:
            case 7:
                $values = is_string($setting->value)
                    ? json_decode($setting->value, true) ?? []
                    : [];
                $this->deleteFilesRecursive($values);
                break;
        }
    }

    /**
     * Recursively delete files from array structure
     */
    protected function deleteFilesRecursive(array $data): void
    {
        foreach ($data as $item) {
            if (is_array($item)) {
                $this->deleteFilesRecursive($item);
            } elseif (is_string($item) && !empty($item)) {
                $this->deleteFile($item);
            }
        }
    }

    /**
     * Store uploaded file to storage
     */
    protected function storeFile(\Illuminate\Http\UploadedFile $file, string $fileName): string
    {
        $path = $file->storeAs(
            Setting::UPLOAD_DIR,
            $fileName,
            Setting::UPLOAD_DISK
        );

        // Optimize image if applicable
        if ($this->isImage($file->getClientOriginalExtension())) {
            $this->optimizeImage($fileName);
        }

        return $path;
    }

    /**
     * Delete file from storage
     */
    protected function deleteFile(?string $fileName): void
    {
        if (empty($fileName)) {
            return;
        }

        $filePath = Setting::getFilePath($fileName);

        if (Storage::disk(Setting::UPLOAD_DISK)->exists($filePath)) {
            Storage::disk(Setting::UPLOAD_DISK)->delete($filePath);
        }
    }

    /**
     * Optimize image using Intervention Image
     */
    protected function optimizeImage(string $fileName): void
    {
        if (!class_exists(ImageManager::class)) {
            return;
        }

        try {
            $filePath = Setting::getFilePath($fileName);
            $fullPath = Storage::disk(Setting::UPLOAD_DISK)->path($filePath);

            if (file_exists($fullPath)) {
                $quality = 100;

                // Можно также указать драйвер через enum
                $manager = new ImageManager(
                    driver: \Intervention\Image\Drivers\Gd\Driver::class
                );

                $image = $manager->decode($fullPath);

                // Дополнительная оптимизация для JPEG/PNG
                $image->save($fullPath, quality: $quality);
            }
        } catch (\Exception $e) {
            \Log::warning('Image optimization failed: ' . $e->getMessage());
        }
    }

    /**
     * Generate filename for single file upload
     */
    protected function generateFileName(Setting $setting, string $extension): string
    {
        // Special naming for specific codes
        if (in_array($setting->code, ['bim_library', 'price_list'])) {
            return $setting->code . '.' . $extension;
        }

        return 'setting_' . $setting->id . '.' . $extension;
    }

    /**
     * Generate unique filename for multiple files
     */
    protected function generateUniqueFileName(Setting $setting, string $extension): string
    {
        return 'setting_' . $setting->id . '_' . uniqid() . '.' . $extension;
    }

    /**
     * Check if string is a file upload marker
     */
    protected function isFileUploadKey(string $value): bool
    {
        return str_starts_with($value, 'setting_file_');
    }

    /**
     * Extract the actual upload key from the marker
     */
    protected function extractUploadKey(string $value): string
    {
        return str_replace('setting_file_', '', $value);
    }

    /**
     * Find old file value in nested array by key
     */
    protected function findOldFileValue(array $data, $searchKey)
    {
        foreach ($data as $key => $value) {
            if ($key === $searchKey) {
                return is_string($value) ? $value : null;
            }
            if (is_array($value)) {
                $result = $this->findOldFileValue($value, $searchKey);
                if ($result !== null) {
                    return $result;
                }
            }
        }
        return null;
    }

    /**
     * Check if file extension is an image
     */
    protected function isImage(string $extension): bool
    {
        return in_array(strtolower($extension), $this->imageExtensions);
    }

    /**
     * Format settings for frontend display
     */
    protected function formatSettings($settings): array
    {
        return $settings->map(function (Setting $setting) {
            $data = $setting->toArray();

            // Decode JSON values for complex types
            if (in_array($setting->type, [4, 5, 6, 7])) {
                $data['value'] = is_string($setting->value)
                    ? json_decode($setting->value, true) ?? []
                    : $setting->value;
            }

            // Add file URLs for file types
            if ($setting->type == 3 && !empty($setting->value)) {
                $data['file_url'] = Storage::disk(Setting::UPLOAD_DISK)
                    ->url(Setting::getFilePath($setting->value));
            }

            // Add file URLs for nested files in complex types
            if (in_array($setting->type, [4, 6, 7])) {
                $data['file_urls'] = $this->generateFileUrls(
                    $data['value'],
                    $setting->params ?? []
                );
            }

            return $data;
        })->toArray();
    }

    /**
     * Generate file URLs for nested structures
     */
    protected function generateFileUrls(mixed $data, array $params = []): mixed
    {
        if (is_string($data) && !empty($data)) {
            return Storage::disk(Setting::UPLOAD_DISK)->url(
                Setting::getFilePath($data)
            );
        }

        if (is_array($data)) {
            $result = [];
            foreach ($data as $key => $value) {
                if (is_array($value)) {
                    $result[$key] = $this->generateFileUrls($value, $params);
                } elseif (is_string($value)) {
                    // Check if this field is a file type based on params
                    $isFileField = isset($params['fields'][$key]) &&
                        $params['fields'][$key]['type'] == 3;

                    $result[$key] = ($isFileField && !empty($value))
                        ? Storage::disk(Setting::UPLOAD_DISK)->url(Setting::getFilePath($value))
                        : $value;
                } else {
                    $result[$key] = $value;
                }
            }
            return $result;
        }

        return $data;
    }

    /**
     * Санитизация HTML контента (разрешаем безопасные теги)
     */
    protected function sanitizeHtmlValue($value): string
    {
        if (empty($value)) {
            return '';
        }

        // Разрешенные HTML теги
        $allowedTags = '<p><br><strong><b><em><i><u><s><strike><del><ins><mark><span><div>'
            . '<h1><h2><h3><h4><h5><h6>'
            . '<ul><ol><li>'
            . '<blockquote><pre><code>'
            . '<a><img><table><thead><tbody><tr><th><td>'
            . '<hr><sub><sup>';

        // Разрешенные атрибуты
        $allowedAttributes = [
            'href', 'src', 'alt', 'title', 'target', 'rel',
            'class', 'id', 'style', 'align', 'width', 'height',
            'colspan', 'rowspan', 'data-type', 'data-checked',
            'start', 'type', 'reversed', 'compact'
        ];

        // Очищаем HTML
        $value = strip_tags($value, $allowedTags);

        // Дополнительная очистка атрибутов
        $value = preg_replace_callback('/<([a-zA-Z][a-zA-Z0-9]*)\s+([^>]*)>/', function($matches) use ($allowedAttributes) {
            $tag = $matches[1];
            $attributes = $matches[2];

            // Оставляем только разрешенные атрибуты
            $cleanedAttributes = '';
            preg_match_all('/([a-zA-Z-]+)\s*=\s*["\']([^"\']*)["\']/', $attributes, $attrMatches);

            foreach ($attrMatches[1] as $i => $attrName) {
                if (in_array(strtolower($attrName), $allowedAttributes)) {
                    $attrValue = $attrMatches[2][$i];
                    // Дополнительная защита от XSS в атрибутах
                    $attrValue = htmlspecialchars($attrValue, ENT_QUOTES, 'UTF-8');
                    $cleanedAttributes .= " $attrName=\"$attrValue\"";
                }
            }

            return "<$tag$cleanedAttributes>";
        }, $value);

        return $value;
    }

    /**
     * Санитизация текстовых значений
     */
    protected function sanitizeTextValue($value): string
    {
        if (empty($value)) {
            return '';
        }

        // Для текстовых полей убираем все HTML теги
        return strip_tags($value);
    }
}
