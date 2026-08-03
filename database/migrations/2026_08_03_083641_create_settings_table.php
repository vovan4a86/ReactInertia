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
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('setting_group_id')
                ->constrained('setting_groups')
                ->onDelete('cascade');
            $table->string('code')->default('');
            $table->unsignedTinyInteger('type')->default(0);
            $table->string('name');
            $table->string('description', 510)->nullable();
            $table->json('value')->nullable();
            $table->json('params')->nullable();
            $table->integer('order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
