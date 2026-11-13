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
            $table->string('sap_release_status', 10)->nullable()->after('approval_status');
            $table->string('sap_release_status_text', 100)->nullable()->after('sap_release_status');
            $table->string('sap_processing_status', 10)->nullable()->after('sap_release_status_text');
            $table->string('sap_processing_status_text', 100)->nullable()->after('sap_processing_status');
            $table->timestamp('sap_status_synced_at')->nullable()->after('sap_synced_at');
        });

        Schema::table('purchase_requisition_items', function (Blueprint $table) {
            $table->string('pur_reqn_release_status', 10)->nullable()->after('item_category');
            $table->string('pur_reqn_release_status_text', 100)->nullable()->after('pur_reqn_release_status');
            $table->string('processing_status', 10)->nullable()->after('pur_reqn_release_status_text');
            $table->string('processing_status_text', 100)->nullable()->after('processing_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_requisitions', function (Blueprint $table) {
            $table->dropColumn([
                'sap_release_status',
                'sap_release_status_text',
                'sap_processing_status',
                'sap_processing_status_text',
                'sap_status_synced_at',
            ]);
        });

        Schema::table('purchase_requisition_items', function (Blueprint $table) {
            $table->dropColumn([
                'pur_reqn_release_status',
                'pur_reqn_release_status_text',
                'processing_status',
                'processing_status_text',
            ]);
        });
    }
};
