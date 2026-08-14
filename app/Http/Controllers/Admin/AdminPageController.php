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

        // Получаем родителей для формы создания
        $parents = Page::select('id', 'name')->get();

        return Inertia::render('Admin/Pages/Index', [
            'treeData' => $treeData,
            'pagesData' => $pagesData,
            'parents' => $parents,
        ]);
    }

    public function show(Page $page)
    {
        $page->load('parent');
        $pageData = $page->toArray();
        $pageData['images'] = $page->getImagesWithUrls(); // Добавляем URL к изображениям

        $treeData = $this->getTreeData();
        $pagesData = $this->getPagesData();
        $parents = Page::where('id', '!=', $page->id)
            ->select('id', 'name')
            ->get();

        return Inertia::render('Admin/Pages/Index', [
            'treeData' => $treeData,
            'pagesData' => $pagesData,
            'parents' => $parents,
            'selectedPageData' => [
                'page' => $pageData,
                'parents' => $parents,
            ],
        ]);
    }

    public function create(Request $request)
    {
        $page = new Page();
        $pageData = $page->toArray();
        $pageData['images'] = [];
        $pageData['id'] = null;

        // Если передан parent_id, устанавливаем его
        if ($request->has('parent_id')) {
            $pageData['parent_id'] = $request->input('parent_id');
        }

        $treeData = $this->getTreeData();
        $pagesData = $this->getPagesData();
        $parents = Page::where('id', '!=', $page->id)
            ->select('id', 'name')
            ->get();

        return Inertia::render('Admin/Pages/Index', [
            'treeData' => $treeData,
            'pagesData' => $pagesData,
            'parents' => $parents,
            'selectedPageData' => [
                'page' => $pageData,
                'parents' => $parents,
                'isNew' => true,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'h1' => 'nullable|string|max:255',
            'alias' => 'nullable|string|max:255',
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
            'image_deleted' => 'nullable|boolean',
            'images' => 'nullable|array',
            'deleted_images' => 'nullable|array',
            'deleted_images.*' => 'string',
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
        $pageData['images'] = [];
        unset($pageData['new_images']);

        $page = Page::create($pageData);

        if ($request->hasFile('image')) {
            $page->image = $page->uploadSingleImage($request->file('image'));
        }

        $uploadedImages = [];
        if ($request->hasFile('new_images')) {
            foreach ($request->file('new_images') as $file) {
                $imageData = $page->uploadImages($file);
                if ($imageData) {
                    $uploadedImages[] = $imageData;
                }
            }
        }

        $page->images = $uploadedImages;
        $page->save();

        return redirect()->back()->with('success', 'Страница создана');

//        return redirect()
//            ->route('admin.pages.show', $page->id)
//            ->with('success', 'Страница создана');
    }

    public function update(Request $request, Page $page)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'h1' => 'nullable|string|max:255',
            'alias' => 'nullable|string|max:255',
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
            'image_deleted' => 'nullable|boolean',
            'images' => 'nullable|array',
            'deleted_images' => 'nullable|array',
            'deleted_images.*' => 'string',
            'new_images' => 'nullable|array',
            'new_images.*' => 'image|max:10240',
        ]);

        if (empty($validated['alias'])) {
            $validated['alias'] = Str::slug($validated['alias']);
        }

        $images = $validated['images'] ?? [];

        $deletedImages = [];
        if (!empty($validated['deleted_images'])) {
            $deletedImages = is_string($validated['deleted_images']) ? json_decode($validated['deleted_images'], true) : $validated['deleted_images'];
        }

        // Получаем текущие изображения из БД
        $currentImages = $page->images ?? [];

        $currentImagesMap = [];
        foreach ($currentImages as $image) {
            $key = $image['original'] ?? null;
            if ($key) {
                $currentImagesMap[$key] = $image;
            }
        }

        // Обработка удаления
        if (!empty($validated['deleted_images'])) {
            foreach ($validated['deleted_images'] as $deletedId) {
                if (isset($currentImagesMap[$deletedId])) {
                    $page->deleteImage($currentImagesMap[$deletedId]);
                    unset($currentImagesMap[$deletedId]);
                }
            }
        }

        // Применяем новый порядок изображений
        $orderedImages = [];
        if (!empty($validated['images'])) {
            foreach ($validated['images'] as $imageId) {
                if (isset($currentImagesMap[$imageId])) {
                    $orderedImages[] = $currentImagesMap[$imageId];
                    unset($currentImagesMap[$imageId]);
                }
            }
        }

        // Добавляем оставшиеся изображения
        $currentImages = array_merge($orderedImages, array_values($currentImagesMap));

        // Обработка новых изображений
        if ($request->hasFile('new_images')) {
            foreach ($request->file('new_images') as $file) {
                $imageData = $page->uploadImages($file);
                if ($imageData) {
                    $currentImages[] = $imageData;
                }
            }
        }

        // Обработка одиночного изображения
        if ($request->hasFile('image')) {
            if ($page->image) {
                $page->deleteSingleImage($page->image);
            }
            $page->image = $page->uploadSingleImage($request->file('image'));
        } elseif ($request->boolean('image_deleted')) {
            if ($page->image) {
                $page->deleteSingleImage($page->image);
            }
            $page->image = null;
        }

        // Обновляем страницу
        $page->images = $currentImages;
        $page->save();

        // Обновляем остальные поля
        unset($validated['images']);
        unset($validated['deleted_images']);
        unset($validated['new_images']);
        unset($validated['image_deleted']);
        unset($validated['image']);

        $page->update($validated);
//        $page->refresh();

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

    private function getTreeData()
    {
        $pages = Page::getTree();
        return $pages->map(function ($page) {
            return $page->toTreeNode();
        })->values()->toArray();
    }

    private function getPagesData()
    {
        return Page::with('parent')
            ->orderBy('order')
            ->orderBy('created_at', 'desc')
            ->get();
    }
}
