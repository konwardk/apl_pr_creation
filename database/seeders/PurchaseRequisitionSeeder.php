<?php

namespace Database\Seeders;

use App\Models\PurchaseRequisition;
use App\Models\PurchaseRequisitionItem;
use App\Models\User;
use Illuminate\Database\Seeder;

class PurchaseRequisitionSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first() ?? User::factory()->create([
            'name' => 'Dipankar Paul',
            'email' => 'admin@apl.com',
        ]);

        $samples = [
            [
                'pr_number' => 'PR-2026-00101',
                'sap_pr_number' => '10004829',
                'description' => 'Industrial Centrifugal Pump Spares & Impellers',
                'pr_type' => 'NB',
                'company_code' => '1010',
                'plant' => '1010',
                'total_amount' => 14850.00,
                'currency' => 'USD',
                'approval_status' => 'approved',
                'sap_sync_status' => 'synced',
                'sap_sync_message' => 'HTTP 201 Created: Purchase Requisition 10004829 posted successfully via OData V4',
                'sap_synced_at' => now()->subHours(3),
                'items' => [
                    [
                        'item_number' => '00010',
                        'material_code' => 'PUMP-CP-01',
                        'description' => 'Centrifugal Impeller Bronze 250mm',
                        'material_group' => 'M001',
                        'quantity' => 4,
                        'unit_of_measure' => 'PC',
                        'unit_price' => 2200.00,
                        'total_price' => 8800.00,
                        'plant' => '1010',
                        'storage_location' => '101A',
                        'account_assignment_category' => 'K',
                        'cost_center' => '10101101',
                        'gl_account' => '51000000',
                    ],
                    [
                        'item_number' => '00020',
                        'material_code' => 'MECH-SEAL-X4',
                        'description' => 'Tungsten Carbide Mechanical Shaft Seal',
                        'material_group' => 'M001',
                        'quantity' => 5,
                        'unit_of_measure' => 'PC',
                        'unit_price' => 1210.00,
                        'total_price' => 6050.00,
                        'plant' => '1010',
                        'storage_location' => '101A',
                        'account_assignment_category' => 'K',
                        'cost_center' => '10101101',
                        'gl_account' => '51000000',
                    ],
                ],
            ],
            [
                'pr_number' => 'PR-2026-00102',
                'sap_pr_number' => '10004830',
                'description' => 'Factory Automation High-Speed Optical Sensors',
                'pr_type' => 'NB',
                'company_code' => '1010',
                'plant' => '1010',
                'total_amount' => 6400.00,
                'currency' => 'USD',
                'approval_status' => 'approved',
                'sap_sync_status' => 'synced',
                'sap_sync_message' => 'HTTP 201 Created: Purchase Requisition 10004830 posted successfully via OData V4',
                'sap_synced_at' => now()->subDay(),
                'items' => [
                    [
                        'item_number' => '00010',
                        'material_code' => 'SENS-OPT-50',
                        'description' => 'Photoelectric Distance Sensor 0-50m IP67',
                        'material_group' => 'E002',
                        'quantity' => 16,
                        'unit_of_measure' => 'EA',
                        'unit_price' => 400.00,
                        'total_price' => 6400.00,
                        'plant' => '1010',
                        'storage_location' => '101B',
                        'account_assignment_category' => 'K',
                        'cost_center' => '10102200',
                        'gl_account' => '51000000',
                    ],
                ],
            ],
            [
                'pr_number' => 'PR-2026-00103',
                'sap_pr_number' => null,
                'description' => 'IT Infrastructure Server Rack Upgrades & Switches',
                'pr_type' => 'NB',
                'company_code' => '1010',
                'plant' => '1020',
                'total_amount' => 18950.00,
                'currency' => 'USD',
                'approval_status' => 'in_approval',
                'sap_sync_status' => 'pending',
                'sap_sync_message' => 'Queued for SAP Cloud POST upon final budget approval',
                'sap_synced_at' => null,
                'items' => [
                    [
                        'item_number' => '00010',
                        'material_code' => 'NET-SW-48P',
                        'description' => '48-Port Managed PoE+ Core Switch L3',
                        'material_group' => 'IT01',
                        'quantity' => 3,
                        'unit_of_measure' => 'EA',
                        'unit_price' => 4500.00,
                        'total_price' => 13500.00,
                        'plant' => '1020',
                        'storage_location' => '201A',
                        'account_assignment_category' => 'K',
                        'cost_center' => '10104400',
                        'gl_account' => '52000000',
                    ],
                    [
                        'item_number' => '00020',
                        'material_code' => 'NET-SFP-10G',
                        'description' => '10GBASE-SR SFP+ Transceiver Module',
                        'material_group' => 'IT01',
                        'quantity' => 20,
                        'unit_of_measure' => 'PC',
                        'unit_price' => 272.50,
                        'total_price' => 5450.00,
                        'plant' => '1020',
                        'storage_location' => '201A',
                        'account_assignment_category' => 'K',
                        'cost_center' => '10104400',
                        'gl_account' => '52000000',
                    ],
                ],
            ],
            [
                'pr_number' => 'PR-2026-00104',
                'sap_pr_number' => null,
                'description' => 'Chemical Laboratory Reagents & Safety Glassware',
                'pr_type' => 'NB',
                'company_code' => '1010',
                'plant' => '1010',
                'total_amount' => 3200.00,
                'currency' => 'USD',
                'approval_status' => 'draft',
                'sap_sync_status' => 'pending',
                'sap_sync_message' => 'Ready for local review before SAP OData submission',
                'sap_synced_at' => null,
                'items' => [
                    [
                        'item_number' => '00010',
                        'material_code' => 'LAB-REAG-09',
                        'description' => 'High-Purity Analytical Grade Reagent Set',
                        'material_group' => 'CH01',
                        'quantity' => 10,
                        'unit_of_measure' => 'SET',
                        'unit_price' => 320.00,
                        'total_price' => 3200.00,
                        'plant' => '1010',
                        'storage_location' => '101C',
                        'account_assignment_category' => 'K',
                        'cost_center' => '10103300',
                        'gl_account' => '53000000',
                    ],
                ],
            ],
            [
                'pr_number' => 'PR-2026-00105',
                'sap_pr_number' => null,
                'description' => 'Plant Maintenance Hydraulic Fluid & Filters (Bulk)',
                'pr_type' => 'NB',
                'company_code' => '1010',
                'plant' => '1010',
                'total_amount' => 5750.00,
                'currency' => 'USD',
                'approval_status' => 'approved',
                'sap_sync_status' => 'failed',
                'sap_sync_message' => 'OData V4 Error: Cost Center 10109999 blocked for primary postings in Plant 1010',
                'sap_synced_at' => null,
                'items' => [
                    [
                        'item_number' => '00010',
                        'material_code' => 'OIL-HYD-ISO46',
                        'description' => 'Hydraulic Oil ISO VG 46 (208L Drum)',
                        'material_group' => 'L002',
                        'quantity' => 5,
                        'unit_of_measure' => 'DR',
                        'unit_price' => 1150.00,
                        'total_price' => 5750.00,
                        'plant' => '1010',
                        'storage_location' => '101A',
                        'account_assignment_category' => 'K',
                        'cost_center' => '10109999',
                        'gl_account' => '51000000',
                    ],
                ],
            ],
        ];

        foreach ($samples as $sample) {
            $items = $sample['items'];
            unset($sample['items']);

            $sample['user_id'] = $user->id;
            $prNumber = $sample['pr_number'];
            $pr = PurchaseRequisition::where('pr_number', $prNumber)->first();
            if (!$pr) {
                $pr = PurchaseRequisition::create($sample);

                foreach ($items as $item) {
                    $item['purchase_requisition_id'] = $pr->id;
                    $item['currency'] = $pr->currency;
                    $item['delivery_date'] = now()->addDays(14);
                    PurchaseRequisitionItem::create($item);
                }

                // Save sample payload
                $pr->update([
                    'sap_payload' => $pr->toSapODataV4Payload(),
                ]);
            }
        }
    }
}
