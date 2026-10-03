<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseRequisition extends Model
{
    use HasFactory;

    protected $fillable = [
        'pr_number',
        'sap_pr_number',
        'user_id',
        'description',
        'pr_type',
        'company_code',
        'plant',
        'total_amount',
        'currency',
        'approval_status',
        'sap_sync_status',
        'sap_sync_message',
        'sap_synced_at',
        'sap_payload',
        'sap_response',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'sap_synced_at' => 'datetime',
        'sap_payload' => 'array',
        'sap_response' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseRequisitionItem::class);
    }

    /**
     * Build SAP S/4HANA Cloud OData V4 POST Payload
     */
    public function toSapODataV4Payload(): array
    {
        return [
            'PurchaseRequisitionType' => $this->pr_type ?: 'NB',
            'PurReqnDescription' => $this->description,
            '_PurchaseRequisitionItem' => $this->items->map(function ($item) {
                return [
                    'PurchaseRequisitionItem' => $item->item_number,
                    'Material' => $item->material_code ?: '',
                    'PurchaseRequisitionItemText' => $item->description,
                    'MaterialGroup' => $item->material_group ?: 'L001',
                    'RequestedQuantity' => (float) $item->quantity,
                    'BaseUnit' => $item->unit_of_measure ?: 'PC',
                    'PurchaseRequisitionPrice' => (float) $item->unit_price,
                    'PurReqnPriceQuantity' => 1,
                    'Plant' => $item->plant ?: '1010',
                    'StorageLocation' => $item->storage_location ?: '101A',
                    'AccountAssignmentCategory' => $item->account_assignment_category ?: 'K',
                    'DeliveryDate' => $item->delivery_date ? $item->delivery_date->format('Y-m-d') : now()->addDays(7)->format('Y-m-d'),
                    '_PurchaseReqnAcctAssgmt' => [
                        [
                            'CostCenter' => $item->cost_center ?: '10101101',
                            'GLAccount' => $item->gl_account ?: '51000000',
                            'CompanyCode' => $this->company_code ?: '1010',
                        ]
                    ]
                ];
            })->toArray(),
        ];
    }
}
