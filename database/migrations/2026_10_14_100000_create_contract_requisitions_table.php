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
        Schema::create('contract_requisitions', function (Blueprint $table) {
            $table->id();

            // SAP Custom Business Object Keys & Identifiers
            $table->string('cr_no', 20)->unique()->index(); // SAP Key: CRNo
            $table->string('pr_number_sap', 20)->nullable()->index(); // SAP Key: PRNumber (Purchase Requisition Number in SAP)
            $table->foreignId('purchase_requisition_id')->nullable()->constrained('purchase_requisitions')->cascadeOnDelete();
            $table->uuid('sap_uuid')->nullable(); // SAP UUID (Edm.Guid)

            // Header & Contract Specifications (YY1_API_CONTRACTREQUISITION v2)
            $table->string('contract_title', 500)->nullable(); // ContractTitle (max 500)
            $table->string('scope_of_work', 500)->nullable(); // ScopeOfWork (max 500)
            $table->string('payment_terms', 500)->nullable(); // PaymentTerms (max 500)
            $table->string('bidders_qualification_criteria', 500)->nullable(); // BiddersQualificationCriteria (max 500)
            $table->string('special_terms_condition', 500)->nullable(); // SpecialTermsCondition (max 500)
            $table->string('guarantee_warranty_period', 500)->nullable(); // GuaranteeWarrantyPeriod (max 500)
            $table->string('defect_liability_period', 50)->nullable(); // DefectLiabilityPeriod (max 50)
            $table->string('others', 500)->nullable(); // Others (max 500)

            // Requisitioner Information
            $table->string('requisitioner_name', 100)->nullable(); // RequisitionerName
            $table->string('req_designation', 500)->nullable(); // ReqDesignation
            $table->string('req_department', 500)->nullable(); // ReqDepartment

            // Tender & Evaluation Details
            $table->string('tender_type', 50)->nullable()->default('Single'); // Options: Single, Open, Openlimited, Limited
            $table->string('tender_estimate_value', 50)->nullable()->default('Excluding GST'); // Options: Excluding GST, Including GST
            $table->decimal('total_pr_value', 15, 2)->nullable(); // TotalPRValue
            $table->string('total_pr_value_in_word', 500)->nullable(); // TotalPRValueInWord

            // Custom Extension Fields (CustomField1 to CustomField8 - optional for future enhancement)
            $table->string('custom_field_1', 500)->nullable();
            $table->string('custom_field_2', 500)->nullable();
            $table->string('custom_field_3', 500)->nullable();
            $table->string('custom_field_4', 500)->nullable();
            $table->string('custom_field_5', 500)->nullable();
            $table->string('custom_field_6', 500)->nullable();
            $table->string('custom_field_7', 500)->nullable();
            $table->string('custom_field_8', 500)->nullable();

            // SAP Audit & Metadata
            $table->string('sap_last_changed_by', 12)->nullable();
            $table->timestamp('sap_last_changed_on')->nullable();
            $table->string('sap_created_by', 12)->nullable();
            $table->timestamp('sap_created_on')->nullable();
            $table->string('sap_description', 80)->nullable();

            // Integration & Sync Tracking
            $table->enum('sap_sync_status', ['pending', 'synced', 'failed'])->default('pending');
            $table->text('sap_sync_message')->nullable();
            $table->timestamp('sap_synced_at')->nullable();
            $table->json('sap_payload')->nullable();
            $table->json('sap_response')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contract_requisitions');
    }
};
