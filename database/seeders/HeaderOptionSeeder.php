<?php

namespace Database\Seeders;

use App\Models\HeaderOption;
use App\Models\User;
use Illuminate\Database\Seeder;

class HeaderOptionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $superadmin = User::whereHas('role', function ($q) {
            $q->where('name', 'superadmin');
        })->first();

        $adminId = $superadmin?->id ?? 1;

        $options = [
            [
                'code' => 'OPEX',
                'name' => 'Operational Expenditure (OPEX)',
                'description' => 'Day-to-day ongoing operational expenses, consumables, and recurring services.',
                'is_active' => true,
                'created_by' => $adminId,
            ],
            [
                'code' => 'CAPEX',
                'name' => 'Capital Expenditure (CAPEX)',
                'description' => 'Fixed assets, plant expansion, high-value machinery, and long-term infrastructure investment.',
                'is_active' => true,
                'created_by' => $adminId,
            ],
            [
                'code' => 'MRO',
                'name' => 'Maintenance, Repair & Operations (MRO)',
                'description' => 'Plant spare parts, valves, seals, rotating equipment maintenance, and factory upkeep.',
                'is_active' => true,
                'created_by' => $adminId,
            ],
            [
                'code' => 'URGENT',
                'name' => 'Emergency & Critical Breakdown',
                'description' => 'Unplanned outages and safety-critical parts requiring accelerated procurement routing.',
                'is_active' => true,
                'created_by' => $adminId,
            ],
            [
                'code' => 'AMC',
                'name' => 'Annual Maintenance Contract (AMC)',
                'description' => 'Annual equipment calibration, OEM vendor servicing, and preventive overhauls.',
                'is_active' => true,
                'created_by' => $adminId,
            ],
            [
                'code' => 'RAW-MAT',
                'name' => 'Raw Material & Feedstock Sourcing',
                'description' => 'Bulk industrial feedstocks, synthesis catalysts, and primary processing acids.',
                'is_active' => true,
                'created_by' => $adminId,
            ],
        ];

        foreach ($options as $option) {
            HeaderOption::firstOrCreate(
                ['code' => $option['code']],
                $option
            );
        }
    }
}
