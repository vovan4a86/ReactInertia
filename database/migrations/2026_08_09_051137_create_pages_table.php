<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('pages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()
                ->constrained('pages')->onDelete('cascade');
            $table->string('name');
            $table->string('h1')->nullable();
            $table->string('alias');
            $table->string('slug')->nullable();
            $table->string('image')->nullable();
            $table->string('announce')->nullable();
            $table->text('text')->nullable();
            $table->integer('order')->default(0);
            $table->string('title')->nullable();
            $table->string('keywords')->nullable();
            $table->string('description', 512)->nullable();
            $table->string('og_title')->nullable();
            $table->string('og_description')->nullable();
            $table->json('images')->nullable();
            $table->boolean('published')->default(true);
            $table->boolean('on_header_menu')->default(false);
            $table->boolean('on_footer_menu')->default(false);
            $table->boolean('on_mobile_menu')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['parent_id', 'order'], 'pages_parent_order_index');
            $table->index('slug', 'pages_slug_index');
            $table->unique(['parent_id', 'alias'], 'pages_parent_alias_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pages');
    }
};
