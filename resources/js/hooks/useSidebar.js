import { useState, useCallback, useEffect } from 'react';
import { usePage } from '@inertiajs/react';

/**
 * КАСТОМНЫЙ ХУК ДЛЯ САЙДБАРА
 *
 * Что делает:
 * 1. Проверяет, активен ли пункт меню (сравнивает текущий URL/роут)
 * 2. Управляет раскрытием/закрытием вложенных меню
 * 3. Фильтрует пункты по правам доступа (если переданы permissions пользователя)
 * 4. Управляет состоянием свёрнутого/развёрнутого сайдбара
 *
 * @param {array}  config           — конфигурация меню (sidebarConfig)
 * @param {object} options          — доп. настройки
 * @param {array}  options.permissions — массив прав текущего пользователя
 * @returns {object} — методы и состояния для Sidebar
 */

export default function useSidebar(config, { permissions = []}) {
    // --- СВЁРНУТ/РАЗВЁРНУТ САЙДБАР ---
    // Инициализируем из localStorage, если есть сохранённое значение
    const [collapsed, setCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebar_collapsed');
        return saved ? JSON.parse(saved) : false;
    });

    // Сохраняем состояние в localStorage при изменении
    useEffect(() => {
        localStorage.setItem('sidebar_collapsed', JSON.stringify(collapsed));
    }, [collapsed]);

    const toggleCollapse = useCallback(() => setCollapsed(prev => !prev), []);

    // --- РАСКРЫТЫЕ ВЛОЖЕННЫЕ ГРУППЫ ---
    // Храним id раскрытых групп
    const [expandedGroups, setExpandedGroups] = useState([]);

    const toggleGroup = useCallback((groupId) => {
        setExpandedGroups(prev => prev.includes(groupId)
            ? prev.filter(id => id !== groupId)
            : [...prev, groupId]
        );
    }, []);

    // --- ПОЛУЧАЕМ ТЕКУЩИЙ URL/РОУТ ---
    const { url, component } = usePage(); // Inertia даёт текущий URL и имя компонента

    /**
     * Проверка: активен ли пункт меню?
     * Сравниваем текущий URL с link, либо route с именем компонента.
     *
     * @param {object} item — пункт меню из конфига
     * @returns {boolean}
     */
    const isActive = useCallback((item) => {
        if (item.link && url.startsWith(item.link)) {
            return true;
        }

        // Дополнительно: проверка по имени Laravel-роута (если route из Ziggy)
        if (item.route && route().current(item.route)) {
            return true;
        }

        // Для вложенных: активна, если любой дочерний пункт активен
        if (item.children?.some(child => isActive(child))) {
            return true;
        }
        return false;
    }, [url]);

    /**
     * Фильтрация пунктов по правам доступа.
     * Если у пункта есть permission, а у пользователя его нет — скрываем пункт.
     *
     * @param {object} item — пункт меню
     * @returns {boolean} — показывать ли пункт
     */
    const hasAccess = useCallback((item) => {
        // Если права не указаны — видно всем
        if (!item.permission) return true;
        // Если у пользователя нет permissions — скрываем (безопасность!)
        if (!permissions.length) return false;
        // Проверяем наличие права
        return permissions.includes(item.permission);
    }, [permissions]);

    /**
     * Рекурсивная фильтрация всего меню.
     * Убираем пункты без прав, а также пустые группы.
     */
    const filterByAccess = useCallback((items) => {
        return items
            .filter(hasAccess) // убираем запрещённые
            .map(item => {
                // Если есть дочерние — фильтруем и их
                if (item.children) {
                    const filteredChildren = filterByAccess(item.children);
                    // Если после фильтрации детей не осталось — скрываем родителя
                    if (filteredChildren.length === 0) return null;
                    return { ...item, children: filteredChildren };
                }
                return item;
            })
            .filter(Boolean); // убираем null-ы
    }, [hasAccess]);

    // Применяем фильтрацию к конфигу
    const filteredConfig = filterByAccess(config);

    return {
        collapsed,
        toggleCollapse,
        expandedGroups,
        toggleGroup,
        isActive,
        filteredConfig,
        // Дополнительно: текущий URL, если нужен в Sidebar
        currentUrl: url,
    };
}
