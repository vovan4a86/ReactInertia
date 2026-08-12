<?php

namespace Database\Seeders;

use App\Models\Page;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class PageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $home = Page::create([
            'name' => 'Главная',
            'alias' => '/',
            'text' => 'Текст главной страницы',
            'order' => 0,
        ]);

        Page::create([
            'name' => 'Каталог',
            'alias' => 'catalog',
            'text' => 'Наш каталог',
            'parent_id' => $home->id,
            'order' => 0,
        ]);

        Page::create([
            'name' => 'Новости',
            'alias' => 'news',
            'text' => 'Наши новости',
            'parent_id' => $home->id,
            'order' => 1,
        ]);

        Page::create([
            'name' => 'О нас',
            'alias' => 'about',
            'text' => 'О нас',
            'parent_id' => $home->id,
            'order' => 2,
        ]);

        Page::create([
            'name' => 'Контакты',
            'alias' => 'contacts',
            'text' => 'Наши контакты',
            'parent_id' => $home->id,
            'order' => 3,
        ]);
    }
}
