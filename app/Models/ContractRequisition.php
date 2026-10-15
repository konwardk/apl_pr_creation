<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractRequisition extends Model
{
    use HasFactory;

    protected $table = 'contract_requisitions';

    protected $fillable = [
        'cr_no',
        'pr_number_sap',
        'purchase_requisition_id',
        'sap_uuid',
        'contract_title',
        'scope_of_work',
        'payment_terms',
        'bidders_qualification_criteria',
        'special_terms_condition',
        'guarantee_warranty_period',
        'defect_liability_period',
        'others',
        'requisitioner_name',
        'req_designation',
        'req_department',
        'tender_type',
        'tender_estimate_value',
        'total_pr_value',
        'total_pr_value_in_word',
        'custom_field_1',
        'custom_field_2',
        'custom_field_3',
        'custom_field_4',
        'custom_field_5',
        'custom_field_6',
        'custom_field_7',
        'custom_field_8',
        'sap_last_changed_by',
        'sap_last_changed_on',
        'sap_created_by',
        'sap_created_on',
        'sap_description',
        'sap_sync_status',
        'sap_sync_message',
        'sap_synced_at',
        'sap_payload',
        'sap_response',
    ];

    protected $casts = [
        'tender_type' => 'string',
        'tender_estimate_value' => 'string',
        'total_pr_value' => 'decimal:2',
        'sap_last_changed_on' => 'datetime',
        'sap_created_on' => 'datetime',
        'sap_synced_at' => 'datetime',
        'sap_payload' => 'array',
        'sap_response' => 'array',
    ];

    /**
     * Relationship with PurchaseRequisition based on the Purchase Requisition Number in SAP.
     */
    public function purchaseRequisition(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequisition::class, 'pr_number_sap', 'sap_pr_number');
    }

    /**
     * Local fallback relationship by purchase_requisition_id.
     */
    public function purchaseRequisitionLocal(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequisition::class, 'purchase_requisition_id');
    }

    /**
     * Convert this Contract Requisition record into the exact SAP S/4HANA OData V4 CBO Payload
     * based on YY1_API_CONTRACTREQUISITION specification (v2).
     */
    public function toSapODataV4Payload(?string $sapPrNumber = null): array
    {
        $prNum = $sapPrNumber ?: ($this->pr_number_sap ?: $this->purchaseRequisition?->sap_pr_number ?: '');

        return [
            'CRNo' => (string) substr((string) ($this->cr_no ?: ''), 0, 20),
            'PRNumber' => (string) substr((string) $prNum, 0, 20),
            'ContractTitle' => (string) substr((string) ($this->contract_title ?? ''), 0, 500),
            'ScopeOfWork' => (string) substr((string) ($this->scope_of_work ?? ''), 0, 500),
            'PaymentTerms' => (string) substr((string) ($this->payment_terms ?? ''), 0, 500),
            'BiddersQualificationCriteria' => (string) substr((string) ($this->bidders_qualification_criteria ?? ''), 0, 500),
            'SpecialTermsCondition' => (string) substr((string) ($this->special_terms_condition ?? ''), 0, 500),
            'GuaranteeWarrantyPeriod' => (string) substr((string) ($this->guarantee_warranty_period ?? ''), 0, 500),
            'DefectLiabilityPeriod' => (string) substr((string) ($this->defect_liability_period ?? ''), 0, 50),
            'Others' => (string) substr((string) ($this->others ?? ''), 0, 500),
            'RequisitionerName' => (string) substr((string) ($this->requisitioner_name ?? ''), 0, 100),
            'ReqDesignation' => (string) substr((string) ($this->req_designation ?? ''), 0, 500),
            'ReqDepartment' => (string) substr((string) ($this->req_department ?? ''), 0, 500),
            'TenderType' => (string) substr((string) ($this->tender_type ?: 'Single'), 0, 50),
            'TenderEstimateValue' => (string) substr((string) ($this->tender_estimate_value ?: 'Excluding GST'), 0, 50),
            'TotalPRValue' => (string) ($this->total_pr_value !== null ? number_format((float)$this->total_pr_value, 2, '.', '') : '0.00'),
            'TotalPRValueInWord' => (string) substr((string) ($this->total_pr_value_in_word ?? ''), 0, 500),
            'CustomField1' => (string) substr((string) ($this->custom_field_1 ?? ''), 0, 500),
            'CustomField2' => (string) substr((string) ($this->custom_field_2 ?? ''), 0, 500),
            'CustomField3' => (string) substr((string) ($this->custom_field_3 ?? ''), 0, 500),
            'CustomField4' => (string) substr((string) ($this->custom_field_4 ?? ''), 0, 500),
            'SAPDescription' => (string) substr((string) ($this->sap_description ?: ($this->contract_title ?: 'Contract Requisition')), 0, 80),
        ];
    }
}
