<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class Attachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_requisition_id',
        'purchase_requisition_item_id',
        'item_number',
        'file_name',
        'file_path',
        'file_size',
        'mime_type',
        'attachment_doc_type',
        'sap_document_number',
        'sap_sync_status',
        'sap_sync_message',
        'sap_synced_at',
        'user_id',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'sap_synced_at' => 'datetime',
    ];

    protected $appends = [
        'url',
        'formatted_size',
    ];

    /**
     * Get the associated Purchase Requisition.
     */
    public function purchaseRequisition(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequisition::class);
    }

    /**
     * Get the associated Purchase Requisition Item, if attached to an item.
     */
    public function item(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequisitionItem::class, 'purchase_requisition_item_id');
    }

    /**
     * Get the user who uploaded the attachment.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Accessor for full public URL.
     */
    public function getUrlAttribute(): ?string
    {
        if (empty($this->file_path)) {
            return null;
        }

        return Storage::disk('public')->url($this->file_path);
    }

    /**
     * Accessor for human-readable file size (KB / MB).
     */
    public function getFormattedSizeAttribute(): string
    {
        $bytes = (int) $this->file_size;
        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 1) . ' KB';
        }
        return $bytes . ' B';
    }
}
