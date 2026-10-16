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
        Schema::create('purchasing_organizations', function (Blueprint $table) {
            $table->id();
            $table->string('code', 10)->unique()->comment('SAP Purchasing Organization Code (EKORG, e.g. 1100, 1200, 9000)');
            $table->string('name', 255)->comment('Purchasing Organization Description (e.g. Central Purchase Org)');
            $table->string('company_code', 10)->default('1000')->comment('Associated SAP Company Code');
            $table->json('plants')->nullable()->comment('Associated SAP Plants (e.g. ["1100", "1200", "1300", "1400"])');
            $table->text('description')->nullable()->comment('Detailed operational usage or notes');
            $table->boolean('is_active')->default(true)->index()->comment('Whether this purchasing organization is enabled for PR requisitions');
            $table->string('sap_source', 150)->default('YY1_PURCHASEORGANIZATION_CDS / YY1_PURCHASEORGANIZATION')->comment('SAP CDS View identifier');
            $table->boolean('is_synced')->default(true)->comment('True if synchronized from SAP Cloud');
            $table->timestamp('synced_at')->nullable()->comment('Timestamp of last sync from SAP Cloud');
            $table->json('raw_data')->nullable()->comment('Original raw attributes from SAP OData CDS entity');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchasing_organizations');
    }
};
