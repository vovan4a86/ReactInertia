<?php


/**
 * Ziggy бросает исключение на неизвестном имени роута — при рендере это
 * обнуляет весь компонент. Фолбэк на прямой URL спасает от «пустого» экрана.
 */
const FALLBACK_URLS = {
    'admin.pages.index':     () => '/admin/pages',
    'admin.pages.create':    () => '/admin/pages/create',
    'admin.pages.show':      (id) => `/admin/pages/${id}`,
    'admin.pages.update':    (id) => `/admin/pages/${id}`,
    'admin.pages.destroy':   (id) => `/admin/pages/${id}`,
    'admin.pages.move':      (id) => `/admin/pages/${id}/move`,
    'admin.pages.toggle':    (id) => `/admin/pages/${id}/toggle`,
    'admin.pages.duplicate': (id) => `/admin/pages/${id}/duplicate`,
};

export const safeRoute = (name, id) => {
    try {
        return typeof route === 'function' ? route(name, id) : FALLBACK_URLS[name]?.(id);
    } catch {
        if (import.meta.env.DEV) console.warn(`[PagesList] route "${name}" не найден, использую fallback`);
        return FALLBACK_URLS[name]?.(id) ?? '#';
    }
};

/**
 * ⚡ Универсальная нормализация входных данных.
 * Принимает: вложенное дерево (Page::tree), плоский массив (PageResource[]),
 * объект-обёртку { data: [...] } — и всегда возвращает корректное дерево.
 */
function normalizeTree(input) {
    const raw = Array.isArray(input) ? input : (input?.data ?? input?.tree ?? []);
    if (!Array.isArray(raw) || raw.length === 0) return [];

    const id = (v) => (v === null || v === undefined || v === '' ? null : String(v));

    // Уже дерево? — только приводим типы и подчищаем children
    const isNested = raw.some((n) => Array.isArray(n?.children) && n.children.length > 0);

    if (isNested) {
        const walk = (nodes) => (nodes ?? []).map((n) => ({
            ...n,
            id: id(n.id),
            parent_id: id(n.parent_id),
            children: walk(n.children),
        }));

        return walk(raw);
    }

    // Плоский список → собираем дерево по parent_id
    const nodes = raw.map((n) => ({ ...n, id: id(n.id), parent_id: id(n.parent_id), children: [] }));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const roots = [];

    for (const node of nodes) {
        const parent = node.parent_id ? byId.get(node.parent_id) : null;
        (parent ? parent.children : roots).push(node);
    }

    const sort = (list) => {
        list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name).localeCompare(String(b.name), 'ru'));
        list.forEach((n) => sort(n.children));
        return list;
    };

    return sort(roots);
}
