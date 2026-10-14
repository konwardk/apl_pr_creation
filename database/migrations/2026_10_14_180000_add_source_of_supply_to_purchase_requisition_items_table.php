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
            $table->string('item_category', 10)->nullable()->after('item_type');
            $table->string('manufacturer_part_number', 100)->nullable()->after('supplier_material_number');
            $table->string('fixed_vendor', 50)->nullable()->after('desired_supplier');
            $table->string('supplying_plant', 10)->nullable()->after('plant');
            $table->string('agreement_number', 20)->nullable()->after('purchasing_group');
            $table->string('agreement_item', 10)->nullable()->after('agreement_number');
            $table->string('info_record', 20)->nullable()->after('agreement_item');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_requisition_items', function (Blueprint $table) {
            $table->dropColumn([
                'item_category',
                'manufacturer_part_number',
                'fixed_vendor',
                'supplying_plant',
                'agreement_number',
                'agreement_item',
                'info_record',
            ]);
        });
    }
};
