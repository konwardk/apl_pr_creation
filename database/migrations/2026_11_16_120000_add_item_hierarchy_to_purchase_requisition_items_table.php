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
        Schema::table('purchase_requisition_items', function (Blueprint $table) {
            $table->string('hierarchy_number', 50)->nullable()->after('item_number');
            $table->string('parent_item_number', 10)->nullable()->after('hierarchy_number');
            $table->string('parent_hierarchy_number', 50)->nullable()->after('parent_item_number');
            $table->boolean('is_outline')->default(false)->after('parent_hierarchy_number');
            $table->string('item_hierarchy_type', 30)->default('functional_item')->after('is_outline');
            $table->string('external_sort_number', 10)->nullable()->after('item_hierarchy_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_requisition_items', function (Blueprint $table) {
            $table->dropColumn([
                'hierarchy_number',
                'parent_item_number',
                'parent_hierarchy_number',
                'is_outline',
                'item_hierarchy_type',
                'external_sort_number',
            ]);
        });
    }
};
