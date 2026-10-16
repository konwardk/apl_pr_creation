<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchasingOrganization extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'purchasing_organizations';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'code',
        'name',
        'company_code',
        'plants',
        'description',
        'is_active',
        'sap_source',
        'is_synced',
        'synced_at',
        'raw_data',
        'created_by',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_active' => 'boolean',
        'is_synced' => 'boolean',
        'synced_at' => 'datetime',
        'plants' => 'array',
        'raw_data' => 'array',
    ];

    /**
     * Scope a query to only include active purchasing organizations.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to search purchasing organizations by code, name, description, or mapped plant.
     */
    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if (empty($term)) {
            return $query;
        }

        $term = '%' . trim($term) . '%';

        return $query->where(function (Builder $q) use ($term) {
            $q->where('code', 'like', $term)
              ->orWhere('name', 'like', $term)
              ->orWhere('description', 'like', $term)
              ->orWhere('company_code', 'like', $term)
              ->orWhere('plants', 'like', $term);
        });
    }

    /**
     * Get the user who imported or created this purchasing organization.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
