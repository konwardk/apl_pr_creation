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
        Schema::table('purchasing_groups', function (Blueprint $table) {
            if (!Schema::hasColumn('purchasing_groups', 'sap_source')) {
                $table->string('sap_source', 150)
                    ->nullable()
                    ->default('YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI')
                    ->after('is_active')
                    ->comment('SAP CDS View identifier');
            }
            if (!Schema::hasColumn('purchasing_groups', 'is_synced')) {
                $table->boolean('is_synced')
                    ->default(false)
                    ->after('sap_source')
                    ->comment('True if synchronized from SAP S/4HANA Cloud');
            }
            if (!Schema::hasColumn('purchasing_groups', 'synced_at')) {
                $table->timestamp('synced_at')
                    ->nullable()
                    ->after('is_synced')
                    ->comment('Timestamp of last sync from SAP S/4HANA Cloud');
            }
            if (!Schema::hasColumn('purchasing_groups', 'raw_data')) {
                $table->json('raw_data')
                    ->nullable()
                    ->after('synced_at')
                    ->comment('Original raw attributes from SAP OData CDS entity');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchasing_groups', function (Blueprint $table) {
            $columnsToDrop = [];
            foreach (['sap_source', 'is_synced', 'synced_at', 'raw_data'] as $col) {
                if (Schema::hasColumn('purchasing_groups', $col)) {
                    $columnsToDrop[] = $col;
                }
            }
            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
