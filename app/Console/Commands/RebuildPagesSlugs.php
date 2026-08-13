<?php

namespace App\Console\Commands;

use App\Models\Page;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('pages:rebuild-slugs {--id= : ID конкретной страницы} {--all : Пересобрать все страницы}')]
#[Description('Перестройка slug для всех страниц на основе иерархии')]
class RebuildPagesSlugs extends Command
{
    /**
     * Execute the console command.
     */
    public function handle()
    {
        if ($this->option('id')) {
            $page = Page::find($this->option('id'));
            if ($page) {
                Page::updateUrlRecurse($page);
                $this->info("Slug перестроен для страницы с ID: {$page->id}");
            } else {
                $this->error("Страница не найдена");
            }
            return;
        }

        if ($this->option('all')) {
            $this->rebuildAllSlugs();
        } else {
            $this->info('Используй параметр --all чтобы перестроить все slugs или --id={page_id} для конкретной страницы');
        }
    }

    protected function rebuildAllSlugs()
    {
        $this->info('Начинаем перестройку slugs...');

        // Получаем корневые страницы (parent_id = 1 или 0)
        $rootPages = Page::where('parent_id', '<=', 1)->get();

        $bar = $this->output->createProgressBar($rootPages->count());
        $bar->start();

        foreach ($rootPages as $rootPage) {
            Page::updateUrlRecurse($rootPage);
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info('Все slugs были успешно перестроены!');
    }
}
