<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * Корневой шаблон, который загружается при первом посещении страницы.
     * Обычно это ваш app.blade.php, где монтируется React.
     *
     * @var string
     */
    protected $rootView = 'admin';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * КЛЮЧЕВОЙ МЕТОД: share()
     *
     * Данные, возвращаемые этим методом, будут ДОСТУПНЫ В КАЖДОМ Inertia-ответе.
     * Они автоматически передаются на фронтенд и доступны через usePage().props
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            // ================================================
            // 1. Пользователь (auth.user)
            // ================================================
            'auth' => [
                'user' => $this->getUserData($request),
            ],
            // ================================================
            // 2. Flash-сообщения (успех/ошибка после действий)
            // ================================================
            'flash' => [
                'message' => fn () => $request->session()->get('message'),
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'info' => fn () => $request->session()->get('info'),
                'validation_errors' => fn () => $request->session()->get('errors'),
            ],

            // ================================================
            // 3. Дополнительные глобальные данные (опционально)
            // ================================================
            'appName' => config('app.name'),
            'currentYear' => now()->year,

            // Пример: разрешения пользователя
            'can' => [
                'manage_users' => $request->user()?->can('manage_users'),
                'manage_settings' => $request->user()?->can('manage_settings'),
            ],
        ];
    }

    /**
     * Формируем данные пользователя для фронтенда
     *
     * ВАЖНО: Не передавайте чувствительные данные (пароли, токены и т.д.)
     * Передаем только то, что нужно для отображения в интерфейсе
     */
    private function getUserData(Request $request): ?array
    {
        $user = $request->user();

        // Если пользователь не авторизован — возвращаем null
        if (!$user) {
            return null;
        }

        // Возвращаем только нужные поля
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'avatar' => $user->avatar, // Если есть аватар (например, через медиа-библиотеку)
            'role' => $user->role?->name ?? 'user', // Роль пользователя
            'created_at' => $user->created_at?->format('Y-m-d'), // Дата регистрации

            // Дополнительные поля для админки
//            'permissions' => $user->getAllPermissions()->pluck('name'), // Если используете Spatie Permissions
//            'is_admin' => $user->hasRole('admin'),
        ];
    }
}
