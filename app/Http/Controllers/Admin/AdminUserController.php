<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

use function Laravel\Prompts\alert;

class AdminUserController extends Controller
{
    public function index()
    {
        $users = User::paginate(10);

        return Inertia::render('Admin/Users/UserList', [
            'users' => $users
        ]);
    }

    public function edit(User $user)
    {
        return Inertia::render('Admin/Users/EditUser', [
            'user' => $user,
            'isEditable' => true,
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/Users/AddUser');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            // Шаг 0
//            'name' => 'required|string|max:255',
//            'phone' => 'required|unique:users,email',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'required|in:user,admin,manager',

            // Шаг 1
            'firstName' => 'nullable|string|max:255',
            'lastName' => 'nullable|string|max:255',
            'phoneNumber' => 'nullable|string|max:20',
            'country' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'city' => 'nullable|string|max:100',
            'address' => 'nullable|string|max:500',
            'avatar' => 'nullable|image|max:5120',

            // Шаг 2
            'companyName' => 'nullable|string|max:255',
            'companyRegId' => 'nullable|string|max:100',
            'companyEmail' => 'nullable|email|max:255',
            'companyContact' => 'nullable|string|max:50',

            // Шаг 3
            'social_vk' => 'nullable|url|max:255',
            'social_max' => 'nullable|url|max:255',
            'social_telegram' => 'nullable|url|max:255',
            'social_github' => 'nullable|url|max:255',
        ]);

        // Обработка аватара
        $avatarPath = null;
        if ($request->hasFile('avatar')) {
            $avatarPath = $request->file('avatar')->store('avatars', 'public');
        }

        // Создание пользователя
        $user = User::create([
            'name' => $validated['name'] ?? $validated['firstName'] . ' ' . $validated['lastName'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'first_name' => $validated['firstName'] ?? null,
            'last_name' => $validated['lastName'] ?? null,
            'phone' => $validated['phoneNumber'] ?? null,
            'country' => $validated['country'] ?? null,
            'state' => $validated['state'] ?? null,
            'city' => $validated['city'] ?? null,
            'address' => $validated['address'] ?? null,
            'company_name' => $validated['companyName'] ?? null,
            'company_reg_id' => $validated['companyRegId'] ?? null,
            'company_email' => $validated['companyEmail'] ?? null,
            'company_phone' => $validated['companyContact'] ?? null,
            'social_vk' => $validated['facebook'] ?? null,
            'social_max' => $validated['twitter'] ?? null,
            'social_telegram' => $validated['instagram'] ?? null,
            'social_github' => $validated['github'] ?? null,
            'avatar' => $avatarPath,
        ]);

        return redirect()->route('admin.users.index')
            ->with('success', 'Пользователь успешно создан!');
    }

    public function update(Request $request, int $userId)
    {
        $user = User::findOrFail($userId);

        try {
            $validated = $request->validate([
                'firstName' => 'required|string|max:255',
                'lastName' => 'nullable|string|max:255',
                'email' => 'required|email|unique:users,email,' . $user->id,
                'phone' => 'nullable|string|max:20',
                'role' => 'required|in:admin,user',
                'avatar' => 'nullable|file|image|max:2048', // Валидация файла
                'remove_avatar' => 'nullable|boolean',
            ]);

            // Обновляем основные данные
            $user->update([
                'first_name' => $validated['firstName'],
                'last_name' => $validated['lastName'],
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'role' => $validated['role'],
            ]);

            // Обработка аватара
            if ($request->boolean('remove_avatar')) {
                // Удаляем старый аватар
                if ($user->avatar && Storage::exists($user->avatar)) {
                    Storage::delete($user->avatar);
                }
                $user->update(['avatar' => null]);
            }

            if ($request->hasFile('avatar')) {
                // Удаляем старый аватар
                if ($user->avatar && Storage::exists($user->avatar)) {
                    Storage::delete($user->avatar);
                }

                // Сохраняем новый
                $path = $request->file('avatar')->store('avatars', 'public');
                $user->update(['avatar' => $path]);
            }

            return redirect()->back()->with('success', 'Пользователь успешно обновлен');

        } catch (ValidationException $e) {
            return redirect()->back()
                ->withErrors($e->validator)
                ->with('error', 'Исправьте ошибки в форме.');
        }
    }

    public function changePassword(Request $request, User $user)
    {
        $request->validate([
            'current_password' => 'required|current_password',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        $user->update([
            'password' => bcrypt($request->new_password),
        ]);

        return redirect()->back()->with('success', 'Пароль успешно изменен');
    }
}
