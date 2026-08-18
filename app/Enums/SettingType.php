<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Типы настроек.
 *
 * Числовые значения полностью совместимы со старой схемой БД (колонка `settings.type`),
 * но избавляют код от «магических чисел».
 */
enum SettingType: int
{
    case Text       = 0; // Текстовое поле
    case Textarea   = 1; // Текстовая область
    case Editor     = 2; // WYSIWYG-редактор
    case File       = 3; // Одиночный файл
    case Data       = 4; // Набор именованных полей (объект)
    case ListSimple = 5; // Простой список строк
    case ListData   = 6; // Список объектов (повторитель)
    case Gallery    = 7; // Галерея изображений
    case Boolean    = 8; // Флажок (да/нет)

    /** Человекочитаемое название типа. */
    public function label(): string
    {
        return match ($this) {
            self::Text       => 'Текстовое поле',
            self::Textarea   => 'Текстовая область',
            self::Editor     => 'Редактор',
            self::File       => 'Файл',
            self::Data       => 'Данные',
            self::ListSimple => 'Список',
            self::ListData   => 'Список данных',
            self::Gallery    => 'Галерея',
            self::Boolean    => 'Флажок',
        };
    }

    /**
     * Карта [значение => название] для селектов на фронте.
     *
     * @return array<int, string>
     */
    public static function labels(): array
    {
        return array_reduce(
            self::cases(),
            static fn (array $carry, self $case) => $carry + [$case->value => $case->label()],
            []
        );
    }

    /** Хранится ли значение в БД как JSON. */
    public function isJson(): bool
    {
        return in_array($this, [self::Data, self::ListSimple, self::ListData, self::Gallery], true);
    }

    /** Хранится ли значение как логический флаг ('1' / '0'). */
    public function isBoolean(): bool
    {
        return $this === self::Boolean;
    }

    /** Статический хелпер: является ли «сырой» тип логическим. */
    public static function isBooleanType(int|string|null $type): bool
    {
        return self::tryFrom((int) $type)?->isBoolean() ?? false;
    }

    /** Есть ли у типа настраиваемые под-поля (params.fields). */
    public function hasFields(): bool
    {
        return in_array($this, [self::Data, self::ListData], true);
    }

    /** Может ли тип содержать файлы. */
    public function handlesFiles(): bool
    {
        return in_array($this, [self::File, self::Data, self::ListData, self::Gallery], true);
    }

    /** Статический хелпер: определить, является ли «сырой» тип JSON-типом. */
    public static function isJsonType(int|string|null $type): bool
    {
        return self::tryFrom((int) $type)?->isJson() ?? false;
    }
}
