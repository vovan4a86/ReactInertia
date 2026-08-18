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
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->string('event', 50)->index(); // created / updated / deleted / login ...
            $table->string('description')->nullable(); // человекочитаемое описание

            $table->nullableMorphs('subject'); // subject_type + subject_id
            $table->string('subject_label')->nullable(); // "снимок" названия объекта

            $table->nullableMorphs('causer'); // кто сделал (обычно User)
            $table->string('causer_name')->nullable(); // "снимок" имени автора

            $table->json('properties')->nullable(); // { old: {...}, attributes: {...} }
            $table->uuid('batch_uuid')->nullable()->index(); // группировка связанных операций

            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 512)->nullable();
            $table->string('url', 2048)->nullable();
            $table->string('method', 10)->nullable();

            $table->timestamps();
            $table->index(['causer_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
