<?php

namespace Tests\Feature;

use App\Models\PurchaseRequisition;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseRequisitionTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_access_dashboard(): void
    {
        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_user_can_access_dashboard(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('dashboard'));
        $response->assertOk();
    }

    public function test_user_can_create_purchase_requisition(): void
    {
        $user = User::factory()->create();

        $payload = [
            'description' => 'Test Centrifugal Pump Replacement',
            'pr_type' => 'NB',
            'company_code' => '1010',
            'plant' => '1010',
            'currency' => 'USD',
            'items' => [
                [
                    'material_code' => 'PUMP-01',
                    'description' => 'Centrifugal Impeller',
                    'material_group' => 'M001',
                    'quantity' => 2,
                    'unit_of_measure' => 'PC',
                    'unit_price' => 500.00,
                    'plant' => '1010',
                    'cost_center' => '10101101',
                    'gl_account' => '51000000',
                ],
            ],
        ];

        $response = $this->actingAs($user)->post(route('purchase-requisitions.store'), $payload);

        $response->assertRedirect();
        $this->assertDatabaseHas('purchase_requisitions', [
            'description' => 'Test Centrifugal Pump Replacement',
            'total_amount' => 1000.00,
            'sap_sync_status' => 'pending',
        ]);
        $this->assertDatabaseHas('purchase_requisition_items', [
            'description' => 'Centrifugal Impeller',
            'quantity' => 2,
            'unit_price' => 500.00,
        ]);
    }

    public function test_user_can_sync_purchase_requisition_to_sap(): void
    {
        $user = User::factory()->create();

        $pr = PurchaseRequisition::create([
            'pr_number' => 'PR-2026-99999',
            'user_id' => $user->id,
            'description' => 'Sync Test PR',
            'pr_type' => 'NB',
            'company_code' => '1010',
            'plant' => '1010',
            'total_amount' => 1200.00,
            'currency' => 'USD',
            'approval_status' => 'approved',
            'sap_sync_status' => 'pending',
        ]);

        $response = $this->actingAs($user)->post(route('purchase-requisitions.sync', $pr));

        $response->assertRedirect();
        $pr->refresh();

        $this->assertEquals('synced', $pr->sap_sync_status);
        $this->assertNotNull($pr->sap_pr_number);
    }
}
