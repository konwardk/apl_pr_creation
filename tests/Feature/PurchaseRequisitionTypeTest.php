<?php

namespace Tests\Feature;

use App\Models\PurchaseRequisition;
use App\Models\PurchaseRequisitionType;
use App\Models\User;
use App\Services\SapMasterDataService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseRequisitionTypeTest extends TestCase
{
    use RefreshDatabase;

    public function test_pr_stores_normal_type_and_creates_record_in_purchase_requisition_types_table(): void
    {
        $user = User::factory()->create();

        $payload = [
            'is_draft' => 1,
            'description' => 'Test Normal PR',
            'pr_type' => 'ZMAT',
            'requisition_type' => 'normal',
            'company_code' => '1000',
            'plant' => '1200',
            'currency' => 'INR',
            'items' => [
                [
                    'item_number' => '00010',
                    'description' => 'General Bearing Spare',
                    'material_code' => '400000000',
                    'material_group' => '100001',
                    'quantity' => 5,
                    'unit_of_measure' => 'EA',
                    'unit_price' => 250.00,
                    'price_unit' => 1,
                    'plant' => '1200',
                ],
            ],
        ];

        $response = $this->actingAs($user)->post(route('purchase-requisitions.store'), $payload);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('purchase_requisitions', [
            'description' => 'Test Normal PR',
            'requisition_type' => 'normal',
            'is_draft' => 1,
        ]);

        $pr = PurchaseRequisition::where('description', 'Test Normal PR')->firstOrFail();

        $this->assertDatabaseHas('purchase_requisition_types', [
            'purchase_requisition_id' => $pr->id,
            'pr_number' => $pr->pr_number,
            'pr_type' => 'normal',
            'name' => 'Normal',
            'is_draft' => 1,
        ]);

        $this->assertNotNull($pr->purchaseRequisitionType);
        $this->assertTrue($pr->purchaseRequisitionType->isNormal());
    }

    public function test_pr_stores_emergent_type_with_remarks_in_purchase_requisition_types_table(): void
    {
        $user = User::factory()->create();

        $payload = [
            'is_draft' => 1,
            'description' => 'Urgent Turbine Seal Replacement',
            'pr_type' => 'ZMAT',
            'requisition_type' => 'emergent',
            'pr_type_remarks' => 'Turbine seal breakdown causing emergency shutdown',
            'company_code' => '1000',
            'plant' => '1200',
            'currency' => 'INR',
            'items' => [
                [
                    'item_number' => '00010',
                    'description' => 'Emergency Turbine Seal',
                    'material_code' => '400000000',
                    'material_group' => '100001',
                    'quantity' => 2,
                    'unit_of_measure' => 'EA',
                    'unit_price' => 15000.00,
                    'price_unit' => 1,
                    'plant' => '1200',
                ],
            ],
        ];

        $response = $this->actingAs($user)->post(route('purchase-requisitions.store'), $payload);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('purchase_requisitions', [
            'description' => 'Urgent Turbine Seal Replacement',
            'requisition_type' => 'emergent',
            'is_draft' => 1,
        ]);

        $pr = PurchaseRequisition::where('description', 'Urgent Turbine Seal Replacement')->firstOrFail();

        $this->assertDatabaseHas('purchase_requisition_types', [
            'purchase_requisition_id' => $pr->id,
            'pr_number' => $pr->pr_number,
            'pr_type' => 'emergent',
            'name' => 'Emergent',
            'remarks' => 'Turbine seal breakdown causing emergency shutdown',
            'is_draft' => 1,
        ]);

        $this->assertNotNull($pr->purchaseRequisitionType);
        $this->assertTrue($pr->purchaseRequisitionType->isEmergent());
    }

    public function test_updating_draft_pr_updates_purchase_requisition_types_record(): void
    {
        $user = User::factory()->create();

        // 1. Create initial normal PR
        $createPayload = [
            'is_draft' => 1,
            'description' => 'Draft To Be Changed To Emergent',
            'pr_type' => 'ZMAT',
            'requisition_type' => 'normal',
            'company_code' => '1000',
            'plant' => '1200',
            'currency' => 'INR',
            'items' => [
                [
                    'item_number' => '00010',
                    'description' => 'Valve Spare',
                    'material_code' => '400000000',
                    'material_group' => '100001',
                    'quantity' => 1,
                    'unit_of_measure' => 'EA',
                    'unit_price' => 500.00,
                    'price_unit' => 1,
                    'plant' => '1200',
                ],
            ],
        ];

        $this->actingAs($user)->post(route('purchase-requisitions.store'), $createPayload);
        $pr = PurchaseRequisition::where('description', 'Draft To Be Changed To Emergent')->firstOrFail();

        $this->assertEquals('normal', $pr->purchaseRequisitionType->pr_type);

        // 2. Update to emergent
        $updatePayload = [
            'is_draft' => 1,
            'description' => 'Draft Changed To Emergent Successfully',
            'pr_type' => 'ZMAT',
            'requisition_type' => 'emergent',
            'pr_type_remarks' => 'Elevated to emergency order due to pipeline leak',
            'company_code' => '1000',
            'plant' => '1200',
            'currency' => 'INR',
            'items' => [
                [
                    'id' => $pr->items[0]->id,
                    'item_number' => '00010',
                    'description' => 'Valve Spare High Pressure',
                    'material_code' => '400000000',
                    'material_group' => '100001',
                    'quantity' => 1,
                    'unit_of_measure' => 'EA',
                    'unit_price' => 800.00,
                    'price_unit' => 1,
                    'plant' => '1200',
                ],
            ],
        ];

        $res = $this->actingAs($user)->put(route('purchase-requisitions.update', $pr), $updatePayload);
        $res->assertSessionHasNoErrors();

        $pr->refresh();
        $pr->load('purchaseRequisitionType');

        $this->assertEquals('emergent', $pr->requisition_type);
        $this->assertEquals('emergent', $pr->purchaseRequisitionType->pr_type);
        $this->assertEquals('Elevated to emergency order due to pipeline leak', $pr->purchaseRequisitionType->remarks);
    }
}
