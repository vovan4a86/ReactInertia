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
            'title' => 'Главная',
            'slug' => 'main',
            'content' => 'Welcome to our website',
            'order' => 0,
            'template' => 'home',
        ]);

        Page::create([
            'title' => 'Каталог',
            'slug' => 'catalog',
            'content' => 'Наш каталог',
            'parent_id' => $home->id,
            'order' => 0,
        ]);

        Page::create([
            'title' => 'Новости',
            'slug' => 'news',
            'content' => 'Наши новости',
            'parent_id' => $home->id,
            'order' => 1,
        ]);

        Page::create([
            'title' => 'О нас',
            'slug' => 'about',
            'content' => 'О нас',
            'parent_id' => $home->id,
            'order' => 2,
        ]);

        Page::create([
            'title' => 'Контакты',
            'slug' => 'contacts',
            'content' => 'Наши контакты',
            'parent_id' => $home->id,
            'order' => 3,
        ]);
    }
}
