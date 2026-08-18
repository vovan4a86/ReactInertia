<?php

namespace App\Providers;

use App\Enums\ActivityEvent;
use App\Services\ActivityLogger;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        Event::listen(Login::class, fn (Login $e) =>
            ActivityLogger::log(ActivityEvent::Login, "Вход в систему: $e->user->email", $e->user, [], $e->user));

        Event::listen(Logout::class, fn (Logout $e) =>
            $e->user && ActivityLogger::log(ActivityEvent::Logout, "Выход из системы: {$e->user->email}", $e->user, [], $e->user));

        Event::listen(Failed::class, fn (Failed $e) =>
            ActivityLogger::log(ActivityEvent::LoginFailed, 'Неудачная попытка входа: ' . ($e->credentials['email'] ?? '—'), null, [
                'attributes' => ['email' => $e->credentials['email'] ?? null],
            ], null));

        Event::listen(Registered::class, fn (Registered $e) =>
            ActivityLogger::log(ActivityEvent::Registered, "Регистрация пользователя: {$e->user->email}", $e->user, [], $e->user));

        Event::listen(PasswordReset::class, fn (PasswordReset $e) =>
            ActivityLogger::log(ActivityEvent::PasswordReset, "Сброс пароля: {$e->user->email}", $e->user, [], $e->user));
    }
}
