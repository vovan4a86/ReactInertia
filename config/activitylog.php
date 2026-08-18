<?php

return [
    'enabled' => env('ACTIVITY_LOG_ENABLED', true),

    // Сколько дней хранить записи (для команды очистки)
    'prune_days' => 60,

    // Поля, которые никогда не попадают в лог
    'global_hidden' => ['password', 'remember_token', 'api_token', 'updated_at'],

    /*
     | Реестр логируемых сущностей.
     | route — маршрут редактирования (принимает id), может быть null.
     */
    'subjects' => [
        \App\Models\Page::class => [
            'label' => 'Страница',
            'plural' => 'Страницы',
            'route' => 'admin.pages.edit',
        ],

        \App\Models\User::class => [
            'label' => 'Пользователь',
            'plural' => 'Пользователи',
            'route' => null,
        ],

        // раскомментировать при появлении моделей
        // \App\Models\Catalog::class => ['label' => 'Каталог',  'plural' => 'Каталоги',  'route' => 'admin.catalogs.edit'],
        // \App\Models\Product::class => ['label' => 'Товар',    'plural' => 'Товары',    'route' => 'admin.products.edit'],
        // \App\Models\News::class    => ['label' => 'Новость',  'plural' => 'Новости',   'route' => 'admin.news.edit'],
        // \App\Models\Project::class => ['label' => 'Проект',   'plural' => 'Проекты',   'route' => 'admin.projects.edit'],
    ],
];
