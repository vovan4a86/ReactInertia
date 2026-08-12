<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Page;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AdminPageController extends Controller
{
    public function index()
    {
        $pages = Page::getTree();
        $treeData = $pages->map(function ($page) {
            return $page->toTreeNode();
        })->values()->toArray(); // Добавляем values() для сброса ключей

        // Получаем все страницы с родителями для списка
        $pagesData = Page::with('parent')
            ->orderBy('order')
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Admin/Pages/Index', [
            'treeData' => $treeData,
            'pagesData' => $pagesData,
        ]);
    }

    public function show(Page $page)
    {
        $page->load('parent');

        // Получаем данные страницы с URL изображений
        $pageData = $page->toArray();
        $pageData['images'] = $page->getImagesWithUrls(); // Добавляем URL к изображениям

        return response()->json([
            'page' => $pageData,
            'parents' => Page::where('id', '!=', $page->id)
                ->select('id', 'title')
                ->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:pages,slug',
            'content' => 'nullable|string',
            'parent_id' => 'nullable|exists:pages,id',
            'order' => 'nullable|integer',
            'is_active' => 'boolean',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
            'template' => 'nullable|string',
            'images' => 'nullable', // Добавляем валидацию для изображений
            'new_images' => 'nullable|array',
            'new_images.*' => 'image|max:10240',
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['title']);
        }

        // Убеждаемся, что slug уникален
        $originalSlug = $validated['slug'];
        $counter = 1;
        while (Page::where('slug', $validated['slug'])->exists()) {
            $validated['slug'] = $originalSlug . '-' . $counter;
            $counter++;
        }

        // Создаем страницу с базовыми данными
        $pageData = $validated;
        $pageData['images'] = []; // Временно пустой массив
        unset($pageData['new_images']);

        $page = Page::create($pageData);

        // Загружаем изображения после создания страницы
        $uploadedImages = [];
        if ($request->hasFile('new_images')) {
            foreach ($request->file('new_images') as $file) {
                $imageData = $page->uploadImage($file);
                if ($imageData) {
                    $uploadedImages[] = $imageData;
                }
            }

            if (!empty($uploadedImages)) {
                $page->update(['images' => $uploadedImages]);
                $page->refresh();
            }
        }

        return redirect()
            ->route('admin.pages.show', $page->id)
            ->with('success', 'Страница создана');
    }

    public function update(Request $request, Page $page)
    {
        // Детальное логирование входящих данных
        \Log::info('=== UPDATE REQUEST START ===');
        \Log::info('Request method: ' . $request->method());
        \Log::info('Content-Type: ' . $request->header('Content-Type'));
        \Log::info('All request data:', $request->all());
        \Log::info('Has files: ' . ($request->hasFile('new_images') ? 'YES' : 'NO'));

        if ($request->hasFile('new_images')) {
            $files = $request->file('new_images');
            \Log::info('new_images is array: ' . (is_array($files) ? 'YES' : 'NO'));
            \Log::info('new_images count: ' . (is_array($files) ? count($files) : 0));

            if (is_array($files)) {
                foreach ($files as $index => $file) {
                    \Log::info("File {$index}:", [
                        'name' => $file->getClientOriginalName(),
                        'type' => $file->getClientMimeType(),
                        'size' => $file->getSize(),
                        'error' => $file->getError(),
                        'is_valid' => $file->isValid()
                    ]);
                }
            }
        }

        \Log::info('=== UPDATE REQUEST END ===');

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:pages,slug,' . $page->id,
            'content' => 'nullable|string',
            'parent_id' => [
                'nullable',
                'exists:pages,id',
                function ($attribute, $value, $fail) use ($page) {
                    if ($value == $page->id) {
                        $fail('A page cannot be its own parent.');
                    }
                    if ($value) {
                        $parent = Page::find($value);
                        if ($parent && $parent->isDescendantOf($page->id)) {
                            $fail('Cannot set a descendant as parent.');
                        }
                    }
                },
            ],
            'order' => 'nullable|integer',
            'is_active' => 'boolean',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
            'template' => 'nullable|string',
            'images' => 'nullable',
            'deleted_images' => 'nullable',
            'new_images' => 'nullable|array',
            'new_images.*' => 'image|max:10240',
        ]);

        \Log::info('Validation passed');
        \Log::info('Validated data:', $validated);

        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['title']);
        }

        // Декодируем JSON строки в массивы, если нужно
        $images = [];
        if (!empty($validated['images'])) {
            $images = is_string($validated['images']) ? json_decode($validated['images'], true) : $validated['images'];
        }

        $deletedImages = [];
        if (!empty($validated['deleted_images'])) {
            $deletedImages = is_string($validated['deleted_images']) ? json_decode($validated['deleted_images'], true) : $validated['deleted_images'];
        }

        // Получаем текущие изображения из БД
        $currentImages = $page->images ?? [];

        // Обработка удаления изображений
        if (!empty($deletedImages)) {
            \Log::info('Processing deleted images:', $deletedImages);

            foreach ($deletedImages as $imageId) {
                // Ищем изображение по ID в текущих изображениях
                foreach ($currentImages as $index => $image) {
                    $currentImageId = $image['original'] ?? null;
                    if ($currentImageId === $imageId) {
                        \Log::info('Deleting image:', ['id' => $imageId, 'index' => $index]);
                        $page->deleteImage($image);
                        unset($currentImages[$index]);
                        break;
                    }
                }
            }
            // Переиндексируем массив
            $currentImages = array_values($currentImages);
        }

        // Применяем новый порядок изображений
        if (!empty($images)) {
            \Log::info('Reordering images:', $images);

            $orderedImages = [];
            $unmatchedImages = [];

            // Сначала находим изображения в указанном порядке
            foreach ($images as $imageId) {
                $found = false;
                foreach ($currentImages as $key => $image) {
                    $currentImageId = $image['original'] ?? null;
                    if ($currentImageId === $imageId) {
                        $orderedImages[] = $image;
                        unset($currentImages[$key]);
                        $found = true;
                        break;
                    }
                }
                // Если это ID нового изображения (начинается с "new_"), пропускаем
                if (!$found && !str_starts_with($imageId, 'new_')) {
                    \Log::warning('Image not found for reordering:', ['id' => $imageId]);
                }
            }

            // Добавляем оставшиеся изображения, которые не были в списке порядка
            $currentImages = array_merge($orderedImages, array_values($currentImages));
        }

        // Обработка новых загруженных изображений
        if ($request->hasFile('new_images')) {
            \Log::info('Processing new images:', ['count' => count($request->file('new_images'))]);

            $uploadedImages = [];
            foreach ($request->file('new_images') as $file) {
                $imageData = $page->uploadImage($file);
                if ($imageData) {
                    $uploadedImages[] = $imageData;
                }
            }

            // Добавляем новые изображения в конец
            $currentImages = array_merge($currentImages, $uploadedImages);
        }

        // Обновляем данные для сохранения
        $validated['images'] = $currentImages;
        unset($validated['new_images']);
        unset($validated['deleted_images']);

        // Сохраняем все изменения разом
        $page->update($validated);
        $page->refresh();

        return redirect()->back()->with('success', 'Страница обновлена');
    }

    public function destroy(Page $page)
    {
        // Переносим дочерние страницы на уровень выше
        Page::where('parent_id', $page->id)->update([
            'parent_id' => $page->parent_id
        ]);
        $page->delete();

        if (request()->wantsJson()) {
            return response()->json(['message' => 'Страница удалена']);
        }

        return redirect()->back()->with('success', 'Страница удалена');
    }

    public function reorder(Request $request)
    {
        $validated = $request->validate([
            'id' => 'required|exists:pages,id',
            'parent_id' => 'nullable|exists:pages,id',
            'order' => 'required|integer',
        ]);

        $page = Page::findOrFail($validated['id']);

        // Проверка на циклическую зависимость
        if ($validated['parent_id']) {
            if ($validated['parent_id'] == $page->id) {
                return response()->json(['message' => 'Cannot set page as its own parent'], 422);
            }

            $parent = Page::find($validated['parent_id']);
            if ($parent && $parent->isDescendantOf($page->id)) {
                return response()->json(['message' => 'Cannot set descendant as parent'], 422);
            }
        }

        $page->parent_id = $validated['parent_id'];
        $page->order = $validated['order'];
        $page->save();

        // Пересчитываем порядок для остальных страниц на том же уровне
        $siblings = Page::where('parent_id', $validated['parent_id'])
            ->where('id', '!=', $page->id)
            ->orderBy('order')
            ->get();

        foreach ($siblings as $index => $sibling) {
            $newOrder = $index >= $validated['order'] ? $index + 1 : $index;
            if ($sibling->order != $newOrder) {
                $sibling->order = $newOrder;
                $sibling->save();
            }
        }

        return redirect()->back()->with('success', 'Порядок изменен');
    }

    public function parents()
    {
        return response()->json([
            'parents' => Page::select('id', 'title')->get()
        ]);
    }

    /**
     * HasImages
     * Загрузка изображений через Inertia
     */
    public function uploadImages(Request $request, Page $page)
    {
        $request->validate([
            'images' => 'required|array',
            'images.*' => 'required|image|max:10240',
        ]);

        $uploadedImages = [];

        foreach ($request->file('images') as $file) {
            $imageData = $page->uploadImage($file);
            if ($imageData) {
                $uploadedImages[] = $imageData;
            }
        }

        $existingImages = $page->images ?? [];

        $allImages = array_merge($existingImages, $uploadedImages);

        // Сохраняем
        $page->update(['images' => $allImages]);
        $page->refresh();

        $imagesWithUrls = $page->getImagesWithUrls();

        return response()->json([
            'success' => true,
            'message' => 'Изображения загружены',
            'images' => $imagesWithUrls,
        ]);
    }

    /**
     * Удаление изображения
     */
    public function deleteImage(Request $request, Page $page)
    {
        $request->validate([
            'image_index' => 'required|integer',
        ]);

        $images = $page->images ?? [];
        $index = $request->input('image_index');

        if (!isset($images[$index])) {
            return redirect()->back()->with('error', 'Изображение не найдено');
        }

        $page->deleteImage($images[$index]);
        unset($images[$index]);
        $page->update(['images' => array_values($images)]);

        return redirect()->back()->with('success', 'Изображение удалено');
    }

    /**
     * Переупорядочивание изображений
     */
    public function reorderImages(Request $request, Page $page)
    {
        $request->validate([
            'order' => 'required|array',
            'order.*' => 'required|integer|min:0',
        ]);

        $images = $page->images ?? [];
        $newOrder = $request->input('order');

        $orderedImages = [];
        foreach ($newOrder as $index) {
            if (isset($images[$index])) {
                $orderedImages[] = $images[$index];
            }
        }

        $page->update(['images' => $orderedImages]);

        return redirect()->back()->with('success', 'Порядок изображений обновлен');
    }
}
