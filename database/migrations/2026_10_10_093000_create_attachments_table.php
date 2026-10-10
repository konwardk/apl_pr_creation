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
        Schema::dropIfExists('attachments');

        Schema::create('attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_requisition_id')->constrained('purchase_requisitions')->cascadeOnDelete();
            $table->foreignId('purchase_requisition_item_id')->nullable()->constrained('purchase_requisition_items')->cascadeOnDelete();
            $table->string('item_number', 10)->nullable()->comment('Line item number e.g. 00010');
            $table->string('file_name', 255)->comment('Original uploaded file name');
            $table->string('file_path', 500)->comment('Relative path in storage/app/public');
            $table->unsignedBigInteger('file_size')->default(0)->comment('File size in bytes');
            $table->string('mime_type', 100)->nullable()->comment('MIME type e.g. application/pdf');
            $table->string('attachment_doc_type', 50)->default('SL1')->comment('SAP Document type e.g. SL1, SL9, YB0, YP1, YP2');
            $table->string('sap_document_number', 100)->nullable()->comment('SAP DMS Document Info Record or Attachment ID');
            $table->enum('sap_sync_status', ['pending', 'synced', 'failed'])->default('pending');
            $table->text('sap_sync_message')->nullable();
            $table->timestamp('sap_synced_at')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['purchase_requisition_id', 'purchase_requisition_item_id'], 'att_pr_item_idx');
            $table->index('sap_sync_status', 'att_sap_sync_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attachments');
    }
};
