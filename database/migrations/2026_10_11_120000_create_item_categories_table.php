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
        Schema::create('item_categories', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique()->comment('SAP Item Category Code (e.g. Standard, K, L, S, U, D, B, T)');
            $table->string('name', 255)->comment('Item category display name');
            $table->text('description')->nullable()->comment('Detailed operational and business explanation');
            $table->boolean('is_active')->default(true)->index()->comment('Whether enabled for PR line items F4 search help');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('item_categories');
    }
};
