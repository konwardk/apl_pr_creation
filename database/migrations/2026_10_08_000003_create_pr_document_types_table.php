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
        Schema::create('pr_document_types', function (Blueprint $table) {
            $table->id();
            $table->string('code', 10)->unique()->comment('SAP PR Document Type Code (e.g. NB, ZCOM, NBS, RV)');
            $table->string('name', 255)->comment('Description from SAP CDS View I_PurchaseRequisitionType');
            $table->text('description')->nullable()->comment('Detailed operational and business usage explanation');
            $table->string('category', 100)->nullable()->comment('Procurement Category (Standard SAP, Domestic Composite, Import, etc.)');
            $table->boolean('is_active')->default(true)->index()->comment('Whether this document type is enabled for PR requesters');
            $table->string('sap_source', 100)->default('YY1_PURCHASEREQTYPE_CDS / I_PurchaseRequisitionType')->comment('SAP CDS View identifier');
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
        Schema::dropIfExists('pr_document_types');
    }
};
