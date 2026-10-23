<?php

namespace Database\Seeders;

use App\Models\PurchasingGroup;
use App\Models\User;
use Illuminate\Database\Seeder;

class PurchasingGroupSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $superadmin = User::whereHas('role', fn($q) => $q->where('name', 'superadmin'))->first()
            ?? User::where('email', 'superadmin@example.com')->first();

        $userId = $superadmin?->id;

        $groups = [
            [
                'code' => '103',
                'name' => 'Operational Plant Purchasing Team',
                'description' => 'Responsible for routine plant consumables, maintenance items, and operational spares procurement.',
                'email' => 'purchasing103@assampetrochemicals.co.in',
                'phone_number' => '+91-374-2451203',
                'is_active' => true,
            ],
            [
                'code' => '001',
                'name' => 'General Purchasing Team 001',
                'description' => 'General administration, stationery, standard office equipment, and routine facility requisitions.',
                'email' => 'purchasing001@assampetrochemicals.co.in',
                'phone_number' => '+91-374-2451001',
                'is_active' => true,
            ],
            [
                'code' => '101',
                'name' => 'Central Purchasing / Corporate Strategic',
                'description' => 'Corporate strategic sourcing, long-term contracts, rate agreements, and critical spares.',
                'email' => 'central.purchase@assampetrochemicals.co.in',
                'phone_number' => '+91-374-2451101',
                'is_active' => true,
            ],
            [
                'code' => '102',
                'name' => 'Technical & Mechanical Purchasing',
                'description' => 'Engineering, rotating machinery, turbines, heat exchangers, valves, and mechanical equipment.',
                'email' => 'technical.procure@assampetrochemicals.co.in',
                'phone_number' => '+91-374-2451102',
                'is_active' => true,
            ],
            [
                'code' => '104',
                'name' => 'Projects & CAPEX Purchasing',
                'description' => 'Capital expenditures, plant expansion projects, turnkey contracts, and construction services.',
                'email' => 'project.purchase@assampetrochemicals.co.in',
                'phone_number' => '+91-374-2451104',
                'is_active' => true,
            ],
            [
                'code' => '112',
                'name' => 'Chemicals & Raw Materials Purchasing',
                'description' => 'Bulk chemicals, catalysts, raw natural gas supplies, process additives, and feedstocks.',
                'email' => 'chemicals.procure@assampetrochemicals.co.in',
                'phone_number' => '+91-374-2451112',
                'is_active' => true,
            ],
            [
                'code' => '114',
                'name' => 'Laboratory & Reagents Purchasing',
                'description' => 'Quality control laboratory supplies, analytical testing reagents, and calibration standards.',
                'email' => 'lab.procure@assampetrochemicals.co.in',
                'phone_number' => '+91-374-2451114',
                'is_active' => true,
            ],
            [
                'code' => '119',
                'name' => 'Services & Manpower Purchasing',
                'description' => 'Specialized consultancy, annual maintenance contracts (AMC), statutory inspection, and services.',
                'email' => 'services.purchase@assampetrochemicals.co.in',
                'phone_number' => '+91-374-2451119',
                'is_active' => true,
            ],
        ];

        foreach ($groups as $group) {
            PurchasingGroup::updateOrCreate(
                ['code' => $group['code']],
                array_merge($group, ['created_by' => $userId])
            );
        }
    }
}
