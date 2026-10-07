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
        'item_type',
        'material_code',
        'supplier_material_number',
        'batch',
        'revision_level',
        'description',
        'material_group',
        'desired_supplier',
        'quantity',
        'unit_of_measure',
        'unit_price',
        'price_unit',
        'total_price',
        'currency',
        'tax_code',
        'po_price_type',
        'plant',
        'storage_location',
        'account_assignment_category',
        'requirement_tracking_number',
        'cost_center',
        'gl_account',
        'purchasing_organization',
        'purchasing_group',
        'delivery_date',
        'requisition_date',
        'release_date',
        'planned_delivery_time',
        'gr_processing_time',
        'item_text',
        'item_note',
        'delivery_text',
        'material_po_text',
        'closure_comment',
        'attachment_doc_type',
        'attachment_name',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'unit_price' => 'decimal:2',
        'total_price' => 'decimal:2',
        'price_unit' => 'integer',
        'planned_delivery_time' => 'integer',
        'gr_processing_time' => 'integer',
        'delivery_date' => 'date',
        'requisition_date' => 'date',
        'release_date' => 'date',
    ];

    public function purchaseRequisition(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequisition::class);
    }
}
