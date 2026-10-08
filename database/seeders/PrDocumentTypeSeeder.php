<?php

namespace Database\Seeders;

use App\Models\PrDocumentType;
use App\Models\User;
use Illuminate\Database\Seeder;

class PrDocumentTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $superadmin = User::whereHas('role', fn($q) => $q->where('name', 'superadmin'))->first()
            ?? User::where('email', 'superadmin@assam-petrochemicals.com')->first();

        $userId = $superadmin?->id;

        $types = [
            [
                'code' => 'ZCOM',
                'name' => 'Domestic Cmpste PR (ZCOM)',
                'category' => 'Domestic Composite',
                'description' => 'Standard Assam Petro-Chemicals composite requisition for plant materials and maintenance services.',
                'is_active' => true,
                'sap_source' => 'YY1_PURCHASEREQTYPE_CDS / I_PurchaseRequisitionType',
                'is_synced' => true,
                'synced_at' => now(),
            ],
            [
                'code' => 'NB',
                'name' => 'Pur. Requisition (NB)',
                'category' => 'Standard SAP',
                'description' => 'Standard Purchase Requisition conforming to baseline SAP S/4HANA Cloud schemas.',
                'is_active' => true,
                'sap_source' => 'YY1_PURCHASEREQTYPE_CDS / I_PurchaseRequisitionType',
                'is_synced' => true,
                'synced_at' => now(),
            ],
            [
                'code' => 'NBS',
                'name' => 'Pur. Requisition NBS (NBS)',
                'category' => 'Special Item',
                'description' => 'Purchase requisition requiring specialized supplier routing or consignment terms.',
                'is_active' => true,
                'sap_source' => 'YY1_PURCHASEREQTYPE_CDS / I_PurchaseRequisitionType',
                'is_synced' => true,
                'synced_at' => now(),
            ],
            [
                'code' => 'RV',
                'name' => 'Outline Agrmt. Reqn. (RV)',
                'category' => 'Outline Agreement',
                'description' => 'Requisition linked to existing Corporate Blanket Contract or Long-Term Sourcing Agreement.',
                'is_active' => true,
                'sap_source' => 'YY1_PURCHASEREQTYPE_CDS / I_PurchaseRequisitionType',
                'is_synced' => true,
                'synced_at' => now(),
            ],
            [
                'code' => 'ZICP',
                'name' => 'Import Cmpste PR (ZICP)',
                'category' => 'Import Procurement',
                'description' => 'International composite procurement requiring customs clearance, forex, and import duties.',
                'is_active' => true,
                'sap_source' => 'YY1_PURCHASEREQTYPE_CDS / I_PurchaseRequisitionType',
                'is_synced' => true,
                'synced_at' => now(),
            ],
            [
                'code' => 'ZIMT',
                'name' => 'Import Material PR (ZIMT)',
                'category' => 'Import Materials',
                'description' => 'Direct international raw chemical and synthesis catalyst material order.',
                'is_active' => true,
                'sap_source' => 'YY1_PURCHASEREQTYPE_CDS / I_PurchaseRequisitionType',
                'is_synced' => true,
                'synced_at' => now(),
            ],
            [
                'code' => 'ZISR',
                'name' => 'Import Service PR (ZISR)',
                'category' => 'Import Services',
                'description' => 'Overseas OEM technical consultant servicing, license renewals, and expert engineering.',
                'is_active' => true,
                'sap_source' => 'YY1_PURCHASEREQTYPE_CDS / I_PurchaseRequisitionType',
                'is_synced' => true,
                'synced_at' => now(),
            ],
            [
                'code' => 'ZMAT',
                'name' => 'Domestic Material PR (ZMAT)',
                'category' => 'Domestic Materials',
                'description' => 'Direct plant inventory materials, feedstocks, drums, and packaging.',
                'is_active' => true,
                'sap_source' => 'YY1_PURCHASEREQTYPE_CDS / I_PurchaseRequisitionType',
                'is_synced' => true,
                'synced_at' => now(),
            ],
            [
                'code' => 'ZSER',
                'name' => 'Domestic Service PR (ZSER)',
                'category' => 'Domestic Services',
                'description' => 'Local industrial overhaul, plant electrical instrumentation, and civil contractor jobs.',
                'is_active' => true,
                'sap_source' => 'YY1_PURCHASEREQTYPE_CDS / I_PurchaseRequisitionType',
                'is_synced' => true,
                'synced_at' => now(),
            ],
        ];

        foreach ($types as $type) {
            PrDocumentType::updateOrCreate(
                ['code' => $type['code']],
                array_merge($type, ['created_by' => $userId])
            );
        }
    }
}
