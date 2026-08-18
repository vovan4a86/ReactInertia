<?php

namespace App\Enums;

enum ActivityEvent: string
{
    case Created       = 'created';
    case Updated       = 'updated';
    case Deleted       = 'deleted';
    case Restored      = 'restored';
    case ForceDeleted  = 'force_deleted';
    case Sorted        = 'sorted';
    case Published     = 'published';
    case Unpublished   = 'unpublished';
    case Login         = 'login';
    case Logout        = 'logout';
    case LoginFailed   = 'login_failed';
    case Registered    = 'registered';
    case PasswordReset = 'password_reset';
    case Imported      = 'imported';
    case Exported      = 'exported';

    public function label(): string
    {
        return match ($this) {
            self::Created       => 'Создание',
            self::Updated       => 'Изменение',
            self::Deleted       => 'Удаление',
            self::Restored      => 'Восстановление',
            self::ForceDeleted  => 'Удаление навсегда',
            self::Sorted        => 'Сортировка',
            self::Published     => 'Публикация',
            self::Unpublished   => 'Снятие с публикации',
            self::Login         => 'Вход',
            self::Logout        => 'Выход',
            self::LoginFailed   => 'Неудачный вход',
            self::Registered    => 'Регистрация',
            self::PasswordReset => 'Сброс пароля',
            self::Imported      => 'Импорт',
            self::Exported      => 'Экспорт',
        };
    }

    public static function options(): array
    {
        return array_map(
            fn (self $c) => ['value' => $c->value, 'label' => $c->label()],
            self::cases()
        );
    }
}
