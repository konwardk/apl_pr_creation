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
        Schema::table('purchase_requisitions', function (Blueprint $table) {
            $table->text('header_note')->nullable()->after('description');
            $table->boolean('auto_source_determination')->default(false)->after('pr_type');
            $table->string('requisitioner', 100)->nullable()->after('currency');
        });

        Schema::table('purchase_requisition_items', function (Blueprint $table) {
            $table->string('item_type', 20)->default('material')->after('item_number');
            $table->string('desired_supplier', 100)->nullable()->after('material_group');
            $table->string('supplier_material_number', 100)->nullable()->after('material_code');
            $table->string('batch', 50)->nullable()->after('supplier_material_number');
            $table->string('revision_level', 20)->nullable()->after('batch');
            $table->date('requisition_date')->nullable()->after('delivery_date');
            $table->date('release_date')->nullable()->after('requisition_date');
            $table->integer('planned_delivery_time')->nullable()->default(0)->after('release_date');
            $table->integer('gr_processing_time')->nullable()->default(0)->after('planned_delivery_time');
            $table->integer('price_unit')->default(1)->after('unit_price');
            $table->string('tax_code', 20)->nullable()->after('price_unit');
            $table->string('po_price_type', 50)->nullable()->after('tax_code');
            $table->string('requirement_tracking_number', 100)->nullable()->after('account_assignment_category');
            $table->string('purchasing_organization', 20)->nullable()->after('plant');
            $table->string('purchasing_group', 20)->nullable()->after('purchasing_organization');
            $table->text('item_text')->nullable()->after('gl_account');
            $table->text('item_note')->nullable()->after('item_text');
            $table->text('delivery_text')->nullable()->after('item_note');
            $table->text('material_po_text')->nullable()->after('delivery_text');
            $table->text('closure_comment')->nullable()->after('material_po_text');
            $table->string('attachment_doc_type', 50)->nullable()->after('closure_comment');
            $table->string('attachment_name', 255)->nullable()->after('attachment_doc_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_requisitions', function (Blueprint $table) {
            $table->dropColumn(['header_note', 'auto_source_determination', 'requisitioner']);
        });

        Schema::table('purchase_requisition_items', function (Blueprint $table) {
            $table->dropColumn([
                'item_type',
                'desired_supplier',
                'supplier_material_number',
                'batch',
                'revision_level',
                'requisition_date',
                'release_date',
                'planned_delivery_time',
                'gr_processing_time',
                'price_unit',
                'tax_code',
                'po_price_type',
                'requirement_tracking_number',
                'purchasing_organization',
                'purchasing_group',
                'item_text',
                'item_note',
                'delivery_text',
                'material_po_text',
                'closure_comment',
                'attachment_doc_type',
                'attachment_name',
            ]);
        });
    }
};
