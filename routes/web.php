<?php

use App\Http\Controllers\Admin\AdminActivityLogController;
use App\Http\Controllers\Admin\AdminArticleController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminPageController;
use App\Http\Controllers\Admin\AdminProfileController;
use App\Http\Controllers\Admin\AdminSettingsController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\ProfileController;
use App\Models\Page;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Публичные маршруты
Route::get('/', function () {
    $page = Page::find(1);
    dd($page->getRawOriginal('images')); // Покажет сырые данные из БД


    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
    ]);
});

// Маршруты для обычных пользователей
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard');
    })->name('dashboard');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Административные маршруты
Route::middleware(['auth', 'verified', 'admin'])->prefix('admin')->name('admin.')
    ->group(function () {
        Route::get('/', [AdminDashboardController::class, 'index'])->name('dashboard');
        Route::get('/dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');

        // Пользователи
        Route::resource('users', AdminUserController::class);
        Route::post('/users/{user}/change-password', [AdminUserController::class, 'changePassword'])
            ->name('admin.users.change-password');

        // Настройки
        Route::prefix('/settings')->name('settings.')->group(function () {
            // Основные страницы
            Route::get('/', [AdminSettingsController::class, 'index'])->name('index');
            Route::get('/group/{id}/items', [AdminSettingsController::class, 'groupItems'])->name('groupItems');

            // CRUD для групп
            Route::post('/group', [AdminSettingsController::class, 'storeGroup'])->name('group.store');
            Route::put('/group/{id}', [AdminSettingsController::class, 'updateGroup'])->name('group.update');
            Route::delete('/group/{id}', [AdminSettingsController::class, 'destroyGroup'])->name('group.delete');

            // Модальное окно редактирования/создания настройки
            // Принимает ?setting_group_id для новой настройки и /{id} для редактирования
            Route::get('/edit/{id?}', [AdminSettingsController::class, 'editSetting'])->name('edit');

            // Сохранение новой настройки через модальное окно
            Route::post('/setting', [AdminSettingsController::class, 'storeSetting'])->name('store');
            // Обновление существующей настройки через модальное окно
            Route::put('/setting/{id}', [AdminSettingsController::class, 'updateSetting'])->name('update');
            // Удаление настройки
            Route::delete('/setting/{id}', [AdminSettingsController::class, 'destroySetting'])->name('setting.delete');

            // Специальные действия
            Route::post('/clear-value/{id}', [AdminSettingsController::class, 'clearValue'])->name('clearValue');
            Route::post('/save', [AdminSettingsController::class, 'saveSettings'])->name('save');
        });

        // Страницы
        Route::prefix('pages')->name('pages.')->group(function () {
            Route::get('/', [AdminPageController::class, 'index'])->name('index');

            // Маршруты ДОЛЖНЫ быть перед {page}
            Route::get('/create', [AdminPageController::class, 'create'])->name('create');
            Route::put('/reorder', [AdminPageController::class, 'reorder'])->name('reorder');
            Route::get('/parents', [AdminPageController::class, 'parents'])->name('parents');

            // CRUD операции
            Route::post('/', [AdminPageController::class, 'store'])->name('store');
            Route::get('/{page}', [AdminPageController::class, 'show'])->name('show');
            Route::put('/{page}', [AdminPageController::class, 'update'])->name('update');
            Route::delete('/{page}', [AdminPageController::class, 'destroy'])->name('destroy');
        });
        Route::resource('articles', AdminArticleController::class);

        // Журнал активности
        Route::prefix('activity-log')->name('activity-log.')->group(function () {
            Route::get('/', [AdminActivityLogController::class, 'index']);
            Route::get('/export', [AdminActivityLogController::class, 'export'])->name('export');
            Route::post('/prune', [AdminActivityLogController::class, 'prune'])->name('prune');
            Route::post('/bulk', [AdminActivityLogController::class, 'bulkDestroy'])->name('bulk-destroy');
            Route::delete('/{activityLog}', [AdminActivityLogController::class, 'destroy'])->name('destroy');
        });


        Route::any('/profile', [AdminProfileController::class, 'edit'])->name('profile.edit');
    });

require __DIR__ . '/auth.php';
