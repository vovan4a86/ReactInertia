<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\MovePageRequest;
use App\Http\Requests\Admin\ReorderPageRequest;
use App\Http\Requests\Admin\StorePageRequest;
use App\Http\Requests\Admin\UpdatePageRequest;
use App\Http\Resources\PageResource;
use App\Models\Page;
use App\Services\PageService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

/**
 * Управление страницами сайта.
 *
 * Архитектура: одна Inertia-страница `Admin/Pages/Index` = дерево + панель формы.
 * Все переходы делаются частичными перезагрузками (`only`), поэтому
 * состояние дерева (раскрытые узлы, скролл) не теряется.
 */
final class AdminPageController extends Controller
{
    public function __construct(private readonly PageService $service) {}

    /**
     * Список/дерево страниц. Форма подгружается лениво.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('Admin/Pages/Index', [
            // грузится всегда: нужен для дерева и для списка
            'tree' => fn() => Page::tree(),
            'parents' => Inertia::optional(fn() => $this->parentOptions()),
            // форма: только когда фронт её реально запрашивает
            'page' => Inertia::optional(fn() => null),
            'mode' => 'list',
            'filters' => $request->only('search', 'published'),
        ]);
    }

    /**
     * Форма создания. `parent` — предзаполненный родитель из контекстного меню дерева.
     */
    public function create(Request $request): Response
    {
        $parentId = $request->integer('parent') ?: null;

        return Inertia::render('Admin/Pages/Index', [
            'tree' => fn() => Page::tree(),
            'parents' => fn() => $this->parentOptions(),
            'page' => fn() => [
                'id' => null,
                'parent_id' => $parentId ? (string)$parentId : '',
                'published' => true,
            ],
            'mode' => 'create',
        ]);
    }

    /**
     * Форма редактирования.
     */
    public function show(Page $page): Response
    {
        return Inertia::render('Admin/Pages/Index', [
            'tree' => fn() => Page::tree(),
            'parents' => fn() => $this->parentOptions($page),
            'page' => fn() => PageResource::make($page)->resolve(),
            'mode' => 'edit',
        ]);
    }

    /**
     * Создать страницу.
     */
    public function store(StorePageRequest $request): RedirectResponse
    {
        $page = $this->service->create($request->pageAttributes(), $request->imagePayload());

        return to_route('admin.pages.show', $page)
            ->with('success', "Страница «{$page->name}» создана.");
    }

    /**
     * Обновить страницу.
     */
    public function update(UpdatePageRequest $request, Page $page): RedirectResponse
    {
        $this->service->update($page, $request->pageAttributes(), $request->imagePayload());

        return to_route('admin.pages.show', $page) // ← не back(): гарантированно отдаём свежий page
            ->with('success', 'Изменения сохранены.');
    }

    /**
     * Удалить страницу. `?cascade=1` — вместе с поддеревом.
     */
    public function destroy(Request $request, Page $page): RedirectResponse
    {
        $name = $page->name;

        $this->service->delete($page, $request->boolean('cascade'));

        return to_route('admin.pages.index')
            ->with('success', "Страница «{$name}» удалена.");
    }

    /**
     * Drag & drop дерева: новый родитель + позиция.
     */
    public function reorder(ReorderPageRequest $request): RedirectResponse
    {
        $page = Page::findOrFail($request->integer('id'));

        try {
            $this->service->move($page, $request->input('parent_id'), $request->integer('index'));
        } catch (RuntimeException $e) {
            return back()->withErrors(['tree' => $e->getMessage()]);
        }

        return back(); // Inertia сам перезагрузит `tree`
    }

    /**
     * Быстрое переключение публикации из контекстного меню.
     */
    public function togglePublished(Page $page): RedirectResponse
    {
        $page->update(['published' => !$page->published]);

        return back()->with('success', $page->published ? 'Опубликована.' : 'Снята с публикации.');
    }

    /**
     * Дублировать страницу.
     */
    public function duplicate(Page $page): RedirectResponse
    {
        $copy = $this->service->duplicate($page);

        return to_route('admin.pages.show', $copy)->with('success', 'Копия создана.');
    }

    /**
     * Перемещение страницы: смена родителя и/или позиции среди сиблингов.
     *
     * Поддерживает два режима:
     *   • { parent_id, index }  — точное позиционирование (drag & drop)
     *   • { direction }         — относительный сдвиг: up | down | top | bottom
     */
    public function move(MovePageRequest $request, Page $page): RedirectResponse
    {
        $parentId = $request->has('parent_id') ? $request->validated('parent_id') : $page->parent_id;

        $index = match ($request->validated('direction')) {
            'up'     => max(0, $page->siblingIndex() - 1),
            'down'   => $page->siblingIndex() + 1,
            'top'    => 0,
            'bottom' => PHP_INT_MAX,
            default  => $request->validated('index') ?? $page->siblingIndex(),
        };

        $this->service->move($page, $parentId, $index);

        return back()->with('success', 'Порядок обновлён.');
    }

    /**
     * Плоский список возможных родителей с отступами по уровню.
     * Исключает саму страницу и её потомков (иначе получим цикл).
     *
     * @return list<array{id: string, name: string, depth: int}>
     */
    private function parentOptions(?Page $exclude = null): array
    {
        $excluded = $exclude
            ? [(int)$exclude->id, ...$exclude->descendantIds()]
            : [];

        $grouped = Page::query()
            ->ordered()
            ->get(['id', 'parent_id', 'name'])
            ->reject(fn(Page $p) => in_array((int)$p->id, $excluded, true))
            ->groupBy(fn(Page $p) => (int)($p->parent_id ?? 0));

        $options = [];

        $walk = function (int $parentId, int $depth) use (&$walk, $grouped, &$options): void {
            foreach ($grouped->get($parentId, []) as $page) {
                $options[] = [
                    'id' => (string)$page->id,
                    'name' => $page->name,
                    'depth' => $depth,
                ];
                $walk((int)$page->id, $depth + 1);
            }
        };

        $walk(0, 0);

        return $options;
    }
}
