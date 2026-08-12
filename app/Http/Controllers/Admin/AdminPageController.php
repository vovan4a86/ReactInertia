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
            'name' => 'required|string|max:255',
            'h1' => 'nullable|string|max:255',
            'alias' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'announce' => 'nullable|string',
            'text' => 'nullable|string',
            'parent_id' => 'nullable|exists:pages,id',
            'order' => 'nullable|integer',
            'published' => 'boolean',
            'on_main' => 'boolean',
            'on_header_menu' => 'boolean',
            'on_footer_menu' => 'boolean',
            'on_mobile_menu' => 'boolean',
            'title' => 'nullable|string|max:255',
            'keywords' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'og_title' => 'nullable|string|max:255',
            'og_description' => 'nullable|string|max:255',
            'image' => 'nullable|image|max:10240',
            'images' => 'nullable',
            'new_images' => 'nullable|array',
            'new_images.*' => 'image|max:10240',
        ]);

        if (empty($validated['alias'])) {
            $validated['alias'] = Str::slug($validated['name']);
        }

        // Убеждаемся, что slug уникален
        $originalSlug = $validated['alias'];
        $counter = 1;
        while (Page::where('alias', $validated['alias'])->exists()) {
            $validated['alias'] = $originalSlug . '-' . $counter;
            $counter++;
        }

        // Создаем страницу с базовыми данными
        $pageData = $validated;
        $pageData['images'] = []; // Временно пустой массивadd
        unset($pageData['new_images']);

        $page = Page::create($pageData);

        if ($request->hasFile('image')) {
            $imageData = $page->uploadSingleImage($request->file('image'));
            $page->update(['image' => $imageData['original'] ?? null]);
        } else {
            $page->update(['image' => null]);
        }

        // Загружаем изображения после создания страницы
        $uploadedImages = [];
        if ($request->hasFile('new_images')) {
            foreach ($request->file('new_images') as $file) {
                $imageData = $page->uploadImages($file);
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
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'h1' => 'nullable|string|max:255',
            'alias' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'announce' => 'nullable|string',
            'text' => 'nullable|string',
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
            'published' => 'boolean',
            'on_main' => 'boolean',
            'on_header_menu' => 'boolean',
            'on_footer_menu' => 'boolean',
            'on_mobile_menu' => 'boolean',
            'title' => 'nullable|string|max:255',
            'keywords' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'og_title' => 'nullable|string|max:255',
            'og_description' => 'nullable|string|max:255',
            'image' => 'nullable|image|max:10240',
            'images' => 'nullable',
            'new_images' => 'nullable|array',
            'new_images.*' => 'image|max:10240',
        ]);

        if (empty($validated['alias'])) {
            $validated['alias'] = Str::slug($validated['alias']);
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

            foreach ($deletedImages as $imageId) {
                // Ищем изображение по ID в текущих изображениях
                foreach ($currentImages as $index => $image) {
                    $currentImageId = $image['original'] ?? null;
                    if ($currentImageId === $imageId) {
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

            $uploadedImages = [];
            foreach ($request->file('new_images') as $file) {
                $imageData = $page->uploadImages($file);
                if ($imageData) {
                    $uploadedImages[] = $imageData;
                }
            }

            // Добавляем новые изображения в конец
            $currentImages = array_merge($currentImages, $uploadedImages);
        }

        // Обработка одиночного изображения страницы
        if ($request->hasFile('image')) {
            // Удаляем старое изображение
            if ($page->image) {
                $page->deleteSingleImage($page->image);
            }
            // Загружаем новое
            $validated['image'] = $page->uploadSingleImage($request->file('image'));
        } elseif ($request->has('image_deleted') && $request->input('image_deleted') === 'true') {
            // Явное удаление изображения
            if ($page->image) {
                $page->deleteSingleImage($page->image);
            }
            $validated['image'] = null;
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
            'parents' => Page::select('id', 'name')->get()
        ]);
    }
}
