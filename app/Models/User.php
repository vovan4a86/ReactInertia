<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;

#[Fillable([
    'name',
    'email',
    'password',
    'name',
    'email',
    'password',
    'role',
    'is_active',
    'first_name',
    'last_name',
    'middle_name',
    'phone',
    'phone_alt',
    'birth_date',
    'gender',
    'country',
    'state',
    'city',
    'address',
    'company_name',
    'company_reg_id',
    'company_email',
    'company_phone',
    'country',
    'state',
    'city',
    'postal_code',
    'address',
    'address_2',
    'social_vk',
    'social_max',
    'social_telegram',
    'social_github',
    'avatar',
    'cover_photo',
    'company_name',
    'company_reg_id',
    'company_address',
    'company_email',
    'company_phone',
    'company_website',
    'job_title',
    'department',
    'bio',
    'timezone',
    'locale',
    'last_login_ip',
    'last_login_at',
    'settings',
    'metadata',
])]
#[Hidden(['password', 'remember_token'])]

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'birth_date' => 'date',
            'last_login_at' => 'datetime',
            'settings' => 'array',
            'metadata' => 'array',
        ];
    }

    // ================================================
    // 📌 АКСЕССОРЫ (Accessors)
    // ================================================

    /**
     * Получить полное имя пользователя
     */
    public function getFullNameAttribute(): string
    {
        $parts = array_filter([
            $this->last_name,
            $this->first_name,
            $this->middle_name,
        ]);

        return !empty($parts) ? implode(' ', $parts) : $this->name;
    }

    /**
     * Получить URL аватара
     */
    public function getAvatarUrlAttribute(): ?string
    {
        if ($this->avatar) {
            return Storage::url($this->avatar);
        }

        return null;
    }

    /**
     * Получить инициалы пользователя
     */
    public function getInitialsAttribute(): string
    {
        $first = mb_substr($this->first_name ?? $this->name, 0, 1);
        $last = mb_substr($this->last_name ?? '', 0, 1);

        return strtoupper($first . ($last ?: ''));
    }

    // ================================================
    // 📌 SCOPES (Области запросов)
    // ================================================

    /**
     * Только активные пользователи
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Только администраторы
     */
    public function scopeAdmins($query)
    {
        return $query->where('role', 'admin');
    }

    /**
     * Пользователи по роли
     */
    public function scopeByRole($query, string $role)
    {
        return $query->where('role', $role);
    }

    /**
     * Поиск по имени или email
     */
    public function scopeSearch($query, string $term)
    {
        return $query->where(function ($q) use ($term) {
            $q->where('name', 'like', "%{$term}%")
                ->orWhere('first_name', 'like', "%{$term}%")
                ->orWhere('last_name', 'like', "%{$term}%")
                ->orWhere('email', 'like', "%{$term}%")
                ->orWhere('company_name', 'like', "%{$term}%");
        });
    }

    // ================================================
    // 📌 МЕТОДЫ
    // ================================================

    /**
     * Проверить, является ли пользователь администратором
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Проверить, активен ли пользователь
     */
    public function isActive(): bool
    {
        return $this->is_active;
    }

    /**
     * Обновить время последнего входа
     */
    public function updateLastLogin(string $ip = null): void
    {
        $this->updateQuietly([
            'last_login_at' => now(),
            'last_login_ip' => $ip,
        ]);
    }
}
