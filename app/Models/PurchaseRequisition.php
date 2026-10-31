<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class PurchaseRequisition extends Model
{
    use HasFactory;

    protected $fillable = [
        'pr_number',
        'sap_pr_number',
        'user_id',
        'description',
        'header_note',
        'header_option_id',
        'pr_type',
        'auto_source_determination',
        'company_code',
        'plant',
        'total_amount',
        'currency',
        'requisitioner',
        'approval_status',
        'is_draft',
        'sap_sync_status',
        'sap_sync_message',
        'sap_synced_at',
        'sap_payload',
        'sap_response',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'auto_source_determination' => 'boolean',
        'is_draft' => 'boolean',
        'sap_synced_at' => 'datetime',
        'sap_payload' => 'array',
        'sap_response' => 'array',
    ];

    protected $appends = [
        'is_editable',
        'resolved_contract_requisition',
    ];

    /**
     * Determine if this PR can currently be edited (draft mode or failed sync, and not synced to SAP).
     */
    public function getIsEditableAttribute(): bool
    {
        return ((bool) $this->is_draft || $this->sap_sync_status === 'failed') && $this->sap_sync_status !== 'synced';
    }

    public function isDraft(): bool
    {
        return (bool) $this->is_draft;
    }

    public function isEditable(): bool
    {
        return ((bool) $this->is_draft || $this->sap_sync_status === 'failed') && $this->sap_sync_status !== 'synced';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseRequisitionItem::class);
    }

    public function headerOption(): BelongsTo
    {
        return $this->belongsTo(HeaderOption::class, 'header_option_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class);
    }

    /**
     * Relation between Purchase Requisition and Contract Requisition based on the Purchase Requisition Number in SAP.
     */
    public function contractRequisition(): HasOne
    {
        return $this->hasOne(ContractRequisition::class, 'pr_number_sap', 'sap_pr_number');
    }

    /**
     * Local fallback relation based on purchase_requisition_id.
     */
    public function contractRequisitionLocal(): HasOne
    {
        return $this->hasOne(ContractRequisition::class, 'purchase_requisition_id');
    }

    /**
     * Resolved contract requisition (by SAP PR number or local ID).
     */
    public function getResolvedContractRequisitionAttribute(): ?ContractRequisition
    {
        return $this->contractRequisition ?? $this->contractRequisitionLocal;
    }

    /**
     * Map common commercial unit codes to SAP internal unit codes (MSEHI).
     */
    public static function mapUnitOfMeasureToSapInternal(string $uom): string
    {
        $map = [
            'AU' => 'LE',
            'PC' => 'ST',
            'HR' => 'STD',
            'DAY' => 'TAG',
        ];

        $upper = strtoupper(trim($uom));
        return $map[$upper] ?? $upper;
    }

    /**
     * Map common SAP BaseUnit codes to their corresponding ISO codes required by OData V4.
     */
    public static function mapUnitOfMeasureToIso(string $uom): string
    {
        $map = [
            'EA' => 'EA',
            'PC' => 'PCE',
            'ST' => 'PCE',
            'PCE' => 'PCE',
            'KG' => 'KGM',
            'KGM' => 'KGM',
            'L' => 'LTR',
            'LTR' => 'LTR',
            'LE' => 'C62',
            'AU' => 'C62',
            'C62' => 'C62',
            'PAA' => 'PR',
            'PR' => 'PR',
            'M' => 'MTR',
            'MTR' => 'MTR',
            'TO' => 'TNE',
            'TNE' => 'TNE',
            'M3' => 'MTQ',
            'MTQ' => 'MTQ',
            'H' => 'HUR',
            'HR' => 'HUR',
            'STD' => 'HUR',
            'HUR' => 'HUR',
            'DAY' => 'DAY',
            'TAG' => 'DAY',
            'MON' => 'MON',
            'SET' => 'SET',
            'BOX' => 'BX',
            'BX' => 'BX',
            'ROL' => 'RO',
            '%' => 'P1',
            'P1' => 'P1',
            'NO' => 'C62',
            'JOB' => 'JOB',
            'LOT' => 'LOT',
        ];

        $upper = strtoupper(trim($uom));
        return $map[$upper] ?? $upper;
    }

    /**
     * Build SAP S/4HANA Cloud OData V4 POST Payload matching api_purchaserequisition_2 / PurchaseReqn
     *
     * @param bool $doOnlyValidation Whether to only validate without creating
     * @param array<string, array{sapCode: string, isoCode: string}|string> $uomIsoMapping Optional SAP UoM mapping
     */
    public function toSapODataV4Payload(bool $doOnlyValidation = false, array $uomIsoMapping = []): array
    {
        if (empty($uomIsoMapping)) {
            try {
                $uomIsoMapping = app(\App\Services\SapMasterDataService::class)->buildUomIsoMapping();
            } catch (\Throwable $e) {
                $uomIsoMapping = [];
            }
        }

        $payload = [
            'PurchaseRequisitionType' => $this->pr_type ?: 'ZMAT',
            'PurReqnDescription' => mb_substr($this->description ?: 'Purchase Requisition', 0, 40),
            'PurReqnHeaderNote' => (string) ($this->header_note ?? ''),
            'SourceDetermination' => (bool) $this->auto_source_determination,
            'PurReqnDoOnlyValidation' => $doOnlyValidation,
            '_PurchaseRequisitionItem' => $this->items->map(function ($item, $index) use ($uomIsoMapping) {
                $itemNum = (string) (intval($item->item_number) ?: (($index + 1) * 10));
                $baseUnit = $item->unit_of_measure ?: 'EA';

                // Resolve SAP internal unit & ISO code from CDS View mapping or fallback
                $upperUnit = strtoupper(trim($baseUnit));
                $uomInfo = $uomIsoMapping[$upperUnit] ?? null;
                $sapUnit = is_array($uomInfo)
                    ? ($uomInfo['sapCode'] ?: static::mapUnitOfMeasureToSapInternal($baseUnit))
                    : static::mapUnitOfMeasureToSapInternal($baseUnit);
                $isoCode = is_array($uomInfo)
                    ? ($uomInfo['isoCode'] ?: static::mapUnitOfMeasureToIso($sapUnit ?: $baseUnit))
                    : (is_string($uomInfo) && $uomInfo !== '' ? $uomInfo : static::mapUnitOfMeasureToIso($sapUnit ?: $baseUnit));

                $itemPayload = [
                    'PurchaseRequisitionItem' => $itemNum,
                    'PurchaseRequisitionItemText' => mb_substr($item->description, 0, 40),
                    'Material' => $item->material_code ?: '',
                    'MaterialGroup' => $item->material_group ?: 'YBPM01',
                    'RequestedQuantity' => (float) $item->quantity,
                    'BaseUnit' => $sapUnit,
                    'BaseUnitISOCode' => $isoCode,
                    'PurchaseRequisitionPrice' => (float) $item->unit_price,
                    'PurReqnPriceQuantity' => (int) ($item->price_unit ?: 1),
                    'PurchasingOrganization' => $item->purchasing_organization ?: '1100',
                    'PurchasingGroup' => $item->purchasing_group ?: '103',
                    'Plant' => $item->plant ?: '1200',
                    'CompanyCode' => $this->company_code ?: '1000',
                    'DeliveryDate' => $item->delivery_date ? $item->delivery_date->format('Y-m-d') : now()->addDays(7)->format('Y-m-d'),
                    'PurReqnItemCurrency' => $item->currency ?: ($this->currency ?: 'INR'),
                ];

                // Account Assignment is only sent when valid controlling category is provided (e.g. 'K' for Cost Center)
                $aac = trim((string) $item->account_assignment_category);
                if (!empty($aac) && strtoupper($aac) !== 'NONE' && strtoupper($aac) !== 'BLANK') {
                    $itemPayload['AccountAssignmentCategory'] = $aac;
                    $itemPayload['_PurchaseReqnAcctAssgmt'] = [
                        [
                            'PurchaseReqnAcctAssgmtNumber' => '1',
                            'CostCenter' => $item->cost_center ?: '10101PCC01',
                            'GLAccount' => $item->gl_account ?: '65301000',
                        ]
                    ];
                } else {
                    $itemPayload['AccountAssignmentCategory'] = '';
                }

                if (!empty($item->storage_location)) {
                    $itemPayload['StorageLocation'] = $item->storage_location;
                }

                if (!empty($item->tax_code)) {
                    $itemPayload['TaxCode'] = $item->tax_code;
                }

                if (!empty($item->desired_supplier)) {
                    $itemPayload['Supplier'] = $item->desired_supplier;
                }

                if (!empty($item->supplier_material_number)) {
                    $itemPayload['SupplierMaterialNumber'] = $item->supplier_material_number;
                }

                if (!empty($item->batch)) {
                    $itemPayload['Batch'] = $item->batch;
                }

                if (!empty($item->requirement_tracking_number)) {
                    $itemPayload['RequirementTracking'] = $item->requirement_tracking_number;
                }

                if ($item->item_type === 'service') {
                    $itemPayload['ProductTypeCode'] = '2';
                    if ($item->requisition_date) {
                        $itemPayload['PerformancePeriodStartDate'] = $item->requisition_date->format('Y-m-d');
                    }
                    if ($item->delivery_date) {
                        $itemPayload['PerformancePeriodEndDate'] = $item->delivery_date->format('Y-m-d');
                    }
                } else {
                    $itemPayload['ProductTypeCode'] = '1';
                }

                return $itemPayload;
            })->values()->toArray(),
        ];

        return $payload;
    }
}
