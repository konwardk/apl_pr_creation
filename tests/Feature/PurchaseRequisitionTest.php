<?php

namespace Tests\Feature;

use App\Models\PurchaseRequisition;
use App\Models\Role;
use App\Models\User;
use App\Services\SapMasterDataService;
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

    public function test_authenticated_user_can_access_create_pr_page(): void
    {
        $user = User::factory()->create([
            'plant' => '1200 - Dibrugarh Manufacturing Plant',
        ]);

        $response = $this->actingAs($user)->get(route('purchase-requisitions.create'));
        $response->assertOk();
    }

    public function test_user_can_create_purchase_requisition(): void
    {
        $user = User::factory()->create();

        $this->mock(SapMasterDataService::class, function ($mock) {
            $mock->shouldReceive('postPurchaseRequisition')
                ->once()
                ->andReturn([
                    'success' => true,
                    'sap_pr_number' => '1100000018',
                    'status' => 201,
                    'latency_ms' => 120,
                    'message' => 'Successfully posted to SAP S/4HANA Cloud (PR #1100000018)',
                    'response' => ['PurchaseRequisition' => '1100000018'],
                    'payload' => [],
                ]);
        });

        $payload = [
            'description' => 'Test Centrifugal Pump Replacement',
            'pr_type' => 'ZMAT',
            'company_code' => '1000',
            'plant' => '1200',
            'currency' => 'INR',
            'items' => [
                [
                    'material_code' => '1300000001',
                    'description' => 'Centrifugal Impeller',
                    'material_group' => 'YBPM01',
                    'quantity' => 2,
                    'unit_of_measure' => 'EA',
                    'unit_price' => 500.00,
                    'plant' => '1200',
                    'purchasing_organization' => '1100',
                    'purchasing_group' => '103',
                ],
            ],
        ];

        $response = $this->actingAs($user)->post(route('purchase-requisitions.store'), $payload);

        $response->assertRedirect();
        $this->assertDatabaseHas('purchase_requisitions', [
            'description' => 'Test Centrifugal Pump Replacement',
            'total_amount' => 1000.00,
            'sap_pr_number' => '1100000018',
            'sap_sync_status' => 'synced',
        ]);
        $this->assertDatabaseHas('purchase_requisition_items', [
            'description' => 'Centrifugal Impeller',
            'quantity' => 2,
            'unit_price' => 500.00,
        ]);
    }

    public function test_user_can_sync_purchase_requisition_to_sap(): void
    {
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'Administrator']);
        $user = User::factory()->create(['role_id' => $adminRole->id]);

        $this->mock(SapMasterDataService::class, function ($mock) {
            $mock->shouldReceive('postPurchaseRequisition')
                ->once()
                ->andReturn([
                    'success' => true,
                    'sap_pr_number' => '1100000019',
                    'status' => 201,
                    'latency_ms' => 150,
                    'message' => 'Successfully posted to SAP S/4HANA Cloud (PR #1100000019)',
                    'response' => ['PurchaseRequisition' => '1100000019'],
                    'payload' => [],
                ]);
        });

        $pr = PurchaseRequisition::create([
            'pr_number' => 'PR-2026-99999',
            'user_id' => $user->id,
            'description' => 'Sync Test PR',
            'pr_type' => 'ZMAT',
            'company_code' => '1000',
            'plant' => '1200',
            'total_amount' => 1200.00,
            'currency' => 'INR',
            'approval_status' => 'approved',
            'sap_sync_status' => 'pending',
        ]);

        $response = $this->actingAs($user)->post(route('purchase-requisitions.sync', $pr));

        $response->assertRedirect();
        $pr->refresh();

        $this->assertEquals('synced', $pr->sap_sync_status);
        $this->assertEquals('1100000019', $pr->sap_pr_number);
    }

    public function test_guest_cannot_access_sap_materials(): void
    {
        $response = $this->get(route('sap-materials.index'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_user_can_fetch_sap_materials(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('sap-materials.index'));

        $response->assertOk();
        $response->assertJsonStructure([
            'success',
            'is_live',
            'status',
            'source',
            'endpoint',
            'count',
            'items',
            'message',
        ]);
        $data = $response->json();
        $this->assertNotEmpty($data['items']);
        $this->assertArrayHasKey('Product', $data['items'][0]);
        $this->assertArrayHasKey('ProductName', $data['items'][0]);
        $this->assertArrayHasKey('BaseUnit', $data['items'][0]);
    }

    public function test_authenticated_user_can_search_sap_materials(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('sap-materials.index', ['query' => 'Chair']));

        $response->assertOk();
        $data = $response->json();
        $this->assertNotEmpty($data['items']);
        foreach ($data['items'] as $item) {
            $matched = str_contains(strtolower($item['Product']), 'chair') || str_contains(strtolower($item['ProductName']), 'chair');
            $this->assertTrue($matched);
        }
    }

    public function test_guest_cannot_access_sap_account_assignment_categories(): void
    {
        $response = $this->get(route('sap-account-assignment-categories.index'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_user_can_fetch_sap_account_assignment_categories(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('sap-account-assignment-categories.index'));

        $response->assertOk();
        $response->assertJsonStructure([
            'success',
            'is_live',
            'status',
            'source',
            'endpoint',
            'count',
            'items',
            'message',
        ]);
        $data = $response->json();
        $this->assertNotEmpty($data['items']);
        $this->assertArrayHasKey('code', $data['items'][0]);
        $this->assertArrayHasKey('name', $data['items'][0]);
        $this->assertArrayHasKey('AccountAssignmentCategory', $data['items'][0]);
        $this->assertArrayHasKey('AcctAssignmentCategoryName', $data['items'][0]);
    }

    public function test_authenticated_user_can_search_sap_account_assignment_categories(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('sap-account-assignment-categories.index', ['query' => 'Cost center']));

        $response->assertOk();
        $data = $response->json();
        $this->assertNotEmpty($data['items']);
        foreach ($data['items'] as $item) {
            $matched = str_contains(strtolower($item['code']), 'cost center')
                || str_contains(strtolower($item['name']), 'cost center')
                || str_contains(strtolower($item['extra'] ?? ''), 'cost center');
            $this->assertTrue($matched);
        }
    }

    public function test_guest_cannot_access_sap_plants(): void
    {
        $response = $this->get(route('sap-plants.index'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_user_can_fetch_sap_plants(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('sap-plants.index'));

        $response->assertOk();
        $response->assertJsonStructure([
            'success',
            'is_live',
            'status',
            'source',
            'endpoint',
            'count',
            'items',
            'message',
        ]);
        $data = $response->json();
        $this->assertNotEmpty($data['items']);
        $this->assertArrayHasKey('code', $data['items'][0]);
        $this->assertArrayHasKey('name', $data['items'][0]);
        $this->assertArrayHasKey('Plant', $data['items'][0]);
        $this->assertArrayHasKey('PlantName', $data['items'][0]);
    }

    public function test_authenticated_user_can_search_sap_plants(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('sap-plants.index', ['query' => 'Namrup']));

        $response->assertOk();
        $data = $response->json();
        $this->assertNotEmpty($data['items']);
        foreach ($data['items'] as $item) {
            $matched = str_contains(strtolower($item['code']), 'namrup')
                || str_contains(strtolower($item['name']), 'namrup')
                || str_contains(strtolower($item['PlantName'] ?? ''), 'namrup');
            $this->assertTrue($matched);
        }
    }
}


