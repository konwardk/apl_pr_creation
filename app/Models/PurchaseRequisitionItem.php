<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseRequisitionItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_requisition_id',
        'item_number',
        'material_code',
        'description',
        'material_group',
        'quantity',
        'unit_of_measure',
        'unit_price',
        'total_price',
        'currency',
        'plant',
        'storage_location',
        'account_assignment_category',
        'cost_center',
        'gl_account',
        'delivery_date',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'unit_price' => 'decimal:2',
        'total_price' => 'decimal:2',
        'delivery_date' => 'date',
    ];

    public function purchaseRequisition(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequisition::class);
    }
}
