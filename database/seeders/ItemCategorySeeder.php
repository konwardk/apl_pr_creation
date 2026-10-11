<?php

namespace Database\Seeders;

use App\Models\ItemCategory;
use App\Models\User;
use Illuminate\Database\Seeder;

class ItemCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $superadmin = User::whereHas('role', fn($q) => $q->where('name', 'superadmin'))->first()
            ?? User::where('email', 'superadmin@example.com')->first();

        $userId = $superadmin?->id;

        $categories = [
            [
                'code' => 'Standard',
                'name' => 'Standard (0 / Blank)',
                'description' => 'Standard material or service procurement',
                'is_active' => true,
            ],
            [
                'code' => 'K',
                'name' => 'K - Consignment',
                'description' => 'Vendor consignment stock stored at plant',
                'is_active' => true,
            ],
            [
                'code' => 'L',
                'name' => 'L - Subcontracting',
                'description' => 'Components provided to external vendor for processing',
                'is_active' => true,
            ],
            [
                'code' => 'S',
                'name' => 'S - Third Party',
                'description' => 'Vendor ships direct to end-customer',
                'is_active' => true,
            ],
            [
                'code' => 'U',
                'name' => 'U - Stock Transfer',
                'description' => 'Inter-plant stock transport order',
                'is_active' => true,
            ],
            [
                'code' => 'D',
                'name' => 'D - Service',
                'description' => 'External service line item',
                'is_active' => true,
            ],
            [
                'code' => 'B',
                'name' => 'B - Limit Order',
                'description' => 'Blanket purchase requisition with value limit',
                'is_active' => true,
            ],
            [
                'code' => 'T',
                'name' => 'T - Text Item',
                'description' => 'Non-valuated descriptive text line',
                'is_active' => true,
            ],
        ];

        foreach ($categories as $cat) {
            ItemCategory::updateOrCreate(
                ['code' => $cat['code']],
                array_merge($cat, ['created_by' => $userId])
            );
        }
    }
}
