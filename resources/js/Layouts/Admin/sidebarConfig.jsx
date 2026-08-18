/**
 * КОНФИГУРАЦИЯ САЙДБАРА
 *
 * Каждый пункт меню — объект со свойствами:
 *
 * @property {string}   id       — уникальный идентификатор (желательно строковый, не индекс)
 * @property {string}   label    — отображаемое название пункта
 * @property {string}   link     — URL для Inertia-ссылки
 * @property {string}   route    — имя Laravel-роута (для проверки активного состояния)
 * @property {node}     icon     — иконка MUI (React-компонент, не JSX!)
 * @property {array}    children — вложенные пункты (для выпадающих меню)
 * @property {string}   permission — право доступа (Laravel Gate/Policy).
 *                                   Если не указано — видно всем авторизованным.
 * @property {boolean}  divider  — показать разделитель перед пунктом
 */

import {
    Dashboard as DashboardIcon,
    People as UsersIcon,
    Person as ProfileIcon,
    Settings as SettingsIcon,
    Article as ArticleIcon,
    Category as CategoryIcon,
    HistoryOutlined as HistoryOutlinedIcon,
} from '@mui/icons-material';

const sidebarConfig = [
    {
        id: 'dashboard',
        label: 'Главная панель',
        link: '/admin/dashboard',
        route: 'admin.dashboard',
        icon: DashboardIcon, // <-- Передаём КОМПОНЕНТ, а не JSX!
    },

    // Разделитель
    { id: 'divider-1', divider: true },

    {
        id: 'pages',
        label: 'Структура сайта',
        link: '/admin/pages',
        route: 'admin.pages',
        icon: CategoryIcon,
        // permission: 'view-users', // Только для админов с таким правом
    },

    {
        id: 'users',
        label: 'Пользователи',
        link: '/admin/users',
        route: 'admin.users',
        icon: UsersIcon,
        // permission: 'view-users', // Только для админов с таким правом
    },

    // Пример вложенного меню
    {
        id: 'content',
        label: 'Контент',
        icon: ArticleIcon,
        children: [
            {
                id: 'articles',
                label: 'Статьи',
                link: '/admin/articles',
                route: 'admin.articles.index',
                // permission: 'manage-articles',
            },
            {
                id: 'categories',
                label: 'Категории',
                link: '/admin/categories',
                route: 'admin.categories.index',
                // permission: 'manage-categories',
            },
        ],
    },

    { id: 'divider-2', divider: true },

    {
        id: 'profile',
        label: 'Профиль',
        link: '/admin/profile',
        route: 'admin.profile',
        icon: ProfileIcon,
    },

    {
        id: 'settings',
        label: 'Настройки',
        link: '/admin/settings',
        route: 'admin.settings',
        icon: SettingsIcon,
        // permission: 'manage-settings',
    },

    {
        id: 'activity-log',
        label: 'Журнал активности',
        link: '/admin/activity-log',
        route: 'admin.activity-log',
        icon: HistoryOutlinedIcon,
        // permission: 'manage-settings',
    },
];

export default sidebarConfig;
