<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->rememberToken();

            // ================================================
            // 📌 Шаг 0: Аккаунт
            // ================================================

            /**
             * Роль пользователя
             * Возможные значения: 'user', 'admin', 'manager'
             */
            $table->string('role')->default('user');

            /**
             * Статус активности пользователя
             * true - активен, false - заблокирован
             */
            $table->boolean('is_active')->default(true);

            // ================================================
            // 📌 Шаг 1: Персональные данные
            // ================================================

            /**
             * Имя (отдельно от name)
             */
            $table->string('first_name')->nullable();

            /**
             * Фамилия
             */
            $table->string('last_name')->nullable();

            /**
             * Отчество (дополнительно, для русских имен)
             */
            $table->string('middle_name')->nullable();

            /**
             * Номер телефона
             */
            $table->string('phone')->nullable();

            /**
             * Альтернативный номер телефона
             */
            $table->string('phone_alt')->nullable();

            /**
             * Дата рождения
             */
            $table->date('birth_date')->nullable();

            /**
             * Пол
             * 'male', 'female', 'other'
             */
            $table->string('gender', 20)->nullable();

            // ================================================
            // 📌 Адрес и местоположение
            // ================================================

            /**
             * Страна
             */
            $table->string('country', 100)->nullable();

            /**
             * Регион/Штат/Область
             */
            $table->string('state', 100)->nullable();

            /**
             * Город
             */
            $table->string('city', 100)->nullable();

            /**
             * Почтовый индекс
             */
            $table->string('postal_code', 20)->nullable();

            /**
             * Полный адрес (улица, дом, квартира)
             */
            $table->text('address')->nullable();

            /**
             * Адрес строкой 2 (дополнительно)
             */
            $table->text('address_2')->nullable();

            // ================================================
            // 📌 Аватар и медиа
            // ================================================

            /**
             * Путь к аватару в storage
             * Например: avatars/abc123.jpg
             */
            $table->string('avatar')->nullable();

            /**
             * URL аватара из внешнего источника (Google, Facebook и т.д.)
             */
            $table->text('avatar_url')->nullable();

            /**
             * Обложка профиля
             */
            $table->string('cover_photo')->nullable();

            // ================================================
            // 📌 Шаг 2: Бизнес-данные
            // ================================================

            /**
             * Название компании
             */
            $table->string('company_name')->nullable();

            /**
             * Регистрационный номер компании (ИНН, ОГРН и т.д.)
             */
            $table->string('company_reg_id', 100)->nullable();

            /**
             * Юридический адрес компании
             */
            $table->text('company_address')->nullable();

            /**
             * Email компании
             */
            $table->string('company_email')->nullable();

            /**
             * Телефон компании
             */
            $table->string('company_phone', 50)->nullable();

            /**
             * Веб-сайт компании
             */
            $table->string('company_website')->nullable();

            /**
             * Должность в компании
             */
            $table->string('job_title')->nullable();

            /**
             * Отдел/департамент
             */
            $table->string('department')->nullable();

            // ================================================
            // 📌 Шаг 3: Социальные сети
            // ================================================

            /**
             * Профиль VK
             */
            $table->string('social_vk')->nullable();

            /**
             * Профиль Max
             */
            $table->string('social_max')->nullable();

            /**
             * Профиль GitHub
             */
            $table->string('social_github')->nullable();

                      /**
             * Профиль Telegram
             */
            $table->string('social_telegram')->nullable();

            // ================================================
            // 📌 Дополнительные поля
            // ================================================

            /**
             * Краткая биография/о себе
             */
            $table->text('bio')->nullable();

            /**
             * Часовой пояс пользователя
             */
            $table->string('timezone', 50)->default('UTC');

            /**
             * Язык/локаль пользователя
             */
            $table->string('locale', 10)->default('ru');

            /**
             * Последний IP-адрес входа
             */
            $table->string('last_login_ip', 45)->nullable();

            /**
             * Дата и время последнего входа
             */
            $table->timestamp('last_login_at')->nullable();

            // ================================================
            // 📌 Метаданные (JSON)
            // ================================================

            /**
             * Дополнительные настройки пользователя в формате JSON
             * Например: предпочтения интерфейса, уведомлений и т.д.
             */
            $table->json('settings')->nullable();

            /**
             * Метаданные пользователя в формате JSON
             * Для хранения любых дополнительных данных
             */
            $table->json('metadata')->nullable();

            // ================================================
            // 📌 Индексы
            // ================================================

            /**
             * Индекс для поиска по роли
             */
            $table->index('role');

            /**
             * Индекс для поиска по статусу активности
             */
            $table->index('is_active');

            /**
             * Индекс для поиска по стране и городу
             */
            $table->index(['country', 'city']);

            /**
             * Индекс для поиска по компании
             */
            $table->index('company_name');

            /**
             * Полнотекстовый индекс для поиска по имени и email
             * Только для MySQL
             */
//            $table->fullText(['name', 'first_name', 'last_name', 'email']);

            // ================================================
            // 📌 Timestamps (дата создания и обновления)
            // ================================================
            $table->timestamps();

            /**
             * Soft Deletes - мягкое удаление
             * Пользователи не удаляются физически, а помечаются как удаленные
             */
            $table->softDeletes();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
