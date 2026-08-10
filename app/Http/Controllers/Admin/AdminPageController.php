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

        return response()->json([
            'page' => $page,
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
            'images' => 'nullable|array', // Добавляем валидацию для изображений
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

        $page = Page::create($validated);

        if ($request->wantsJson()) {
            return response()->json($page, 201);
        }

        return redirect()->back()->with('success', 'Страница создана');
    }

    public function update(Request $request, Page $page)
    {
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
            'images' => 'nullable|array', // Добавляем валидацию для изображений
            'deleted_images' => 'nullable|array', // Индексы удаленных изображений
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['title']);
        }

        // Обработка удаления изображений
        if (!empty($validated['deleted_images'])) {
            $currentImages = $page->images ?? [];
            foreach ($validated['deleted_images'] as $index) {
                if (isset($currentImages[$index])) {
                    $page->deleteImage($currentImages[$index]);
                    unset($currentImages[$index]);
                }
            }
            $validated['images'] = array_values($currentImages);
        }

        // Убираем deleted_images из данных для сохранения
        unset($validated['deleted_images']);

        $page->update($validated);

        if ($request->wantsJson()) {
            return response()->json($page);
        }

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
        // Добавляем новые изображения к существующим
        $existingImages = $page->images ?? [];
        $allImages = array_merge($existingImages, $uploadedImages);

        $page->update(['images' => $allImages]);

        // Формируем ответ с URL для предпросмотра
        $imagesWithUrls = collect($allImages)->map(function ($image) use ($page) {
            if (is_string($image)) {
                return [
                    'url' => Storage::disk('public')->url($image),
                    'thumbnail' => Storage::disk('public')->url($image),
                ];
            }

            return [
                'id' => $image['original'] ?? uniqid(),
                'url' => $page->getImageUrl($image, 'medium'),
                'thumbnail' => $page->getImageUrl($image, 'thumb'),
                'large' => $page->getImageUrl($image, 'large'),
                'original' => Storage::disk('public')->url($image['original'] ?? ''),
                'meta' => $image['meta'] ?? [],
            ];
        });


        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Изображения загружены',
                'images' => $imagesWithUrls,
            ]);
        }

        return redirect()->back()->with([
            'success' => 'Изображения загружены',
            'uploaded_images' => $imagesWithUrls,
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
