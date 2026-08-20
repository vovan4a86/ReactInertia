<?php

use App\Http\Controllers\Admin\AdminActivityLogController;
use App\Http\Controllers\Admin\AdminArticleController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminPageController;
use App\Http\Controllers\Admin\AdminProfileController;
use App\Http\Controllers\Admin\AdminSettingsController;
use App\Http\Controllers\Admin\AdminUserController;

// Административные маршруты

Route::get('/', [AdminDashboardController::class, 'index'])->name('index');
//Route::get('/dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');

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

    // Статические сегменты — строго до {page}
    Route::get('/create', [AdminPageController::class, 'create'])->name('create');
    Route::put('/reorder', [AdminPageController::class, 'reorder'])->name('reorder');

    Route::post('/', [AdminPageController::class, 'store'])->name('store');

    // whereNumber — иначе /create перехватится при добавлении новых роутов
    Route::prefix('{page}')->whereNumber('page')->group(function () {
        Route::get('/', [AdminPageController::class, 'show'])->name('show');
        //multipart/form-data c PHP не парсится на PUT — Inertia использует _method=PUT spoofing, и роут должен принимать POST
        Route::match(['put', 'post'], '/', [AdminPageController::class, 'update'])->name('update'); // POST + _method=PUT для файлов
        Route::delete('/', [AdminPageController::class, 'destroy'])->name('destroy');
        Route::patch('/toggle', [AdminPageController::class, 'togglePublished'])->name('toggle');
        Route::patch('/move', [AdminPageController::class, 'move'])->name('move');
        Route::post('/duplicate', [AdminPageController::class, 'duplicate'])->name('duplicate');
    });
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
