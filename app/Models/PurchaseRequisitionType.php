<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseRequisitionType extends Model
{
    use HasFactory;

    public const TYPE_NORMAL = 'normal';
    public const TYPE_EMERGENT = 'emergent';

    public const TYPES = [
        self::TYPE_NORMAL => [
            'code' => self::TYPE_NORMAL,
            'name' => 'Normal',
            'badge' => 'slate',
            'description' => 'Regular planned purchase requisition',
        ],
        self::TYPE_EMERGENT => [
            'code' => self::TYPE_EMERGENT,
            'name' => 'Emergent',
            'badge' => 'amber',
            'description' => 'Emergent / urgent purchase requisition',
        ],
    ];

    protected $table = 'purchase_requisition_types';

    protected $fillable = [
        'purchase_requisition_id',
        'pr_number',
        'sap_pr_number',
        'pr_type',
        'name',
        'description',
        'remarks',
        'user_id',
        'is_draft',
        'sap_sync_status',
    ];

    protected $casts = [
        'is_draft' => 'boolean',
    ];

    /**
     * Parent purchase requisition.
     */
    public function purchaseRequisition(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequisition::class, 'purchase_requisition_id');
    }

    /**
     * User who created this PR type record.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Helper to check if this PR is emergent.
     */
    public function isEmergent(): bool
    {
        return strtolower((string)$this->pr_type) === self::TYPE_EMERGENT;
    }

    /**
     * Helper to check if this PR is normal.
     */
    public function isNormal(): bool
    {
        return strtolower((string)$this->pr_type) === self::TYPE_NORMAL;
    }
}
