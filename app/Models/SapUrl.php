<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SapUrl extends Model
{
    use HasFactory;

    protected $table = 'sap_urls';

    protected $fillable = [
        'environment_name',
        'url',
        'username',
        'password',
        'description',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Bootstrap the model and its events.
     * Enforce single active URL constraint at application level.
     */
    protected static function booted(): void
    {
        static::saving(function (SapUrl $model) {
            // Normalize URL by removing whitespace
            $model->url = trim($model->url);

            // If this URL is marked as active, deactivate all other records
            if ($model->is_active) {
                static::where('id', '!=', $model->id ?? 0)
                    ->where('is_active', true)
                    ->update(['is_active' => false]);
            }
        });
    }

    /**
     * Get the currently active SAP URL string (trimmed of trailing slashes).
     */
    public static function getActiveUrl(): ?string
    {
        $active = static::where('is_active', true)->first();

        if ($active && !empty($active->url)) {
            return rtrim(trim($active->url), '/');
        }

        return null;
    }

    /**
     * Get the active SapUrl model instance.
     */
    public static function getActiveRecord(): ?self
    {
        return static::where('is_active', true)->first();
    }

    /**
     * Activate this specific URL and deactivate all others.
     */
    public function activate(): bool
    {
        // Deactivate all others first
        static::where('id', '!=', $this->id)
            ->where('is_active', true)
            ->update(['is_active' => false]);

        $this->is_active = true;
        return $this->save();
    }

    /**
     * User who created this record.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * User who last updated this record.
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
