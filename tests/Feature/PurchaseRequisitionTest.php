<?php

namespace Tests\Feature;

use App\Models\Attachment;
use App\Models\Attachement;
use App\Models\PurchaseRequisition;
use App\Models\PurchaseRequisitionItem;
use App\Models\Role;
use App\Models\User;
use App\Services\SapMasterDataService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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

    public function test_user_can_save_purchase_requisition_as_draft_without_syncing_to_sap(): void
    {
        $user = User::factory()->create();

        // Ensure SAP postPurchaseRequisition is NEVER called for draft
        $this->mock(SapMasterDataService::class, function ($mock) {
            $mock->shouldReceive('postPurchaseRequisition')->never();
        });

        $payload = [
            'is_draft' => 1,
            'description' => 'Draft PR for Spare Parts',
            'pr_type' => 'ZMAT',
            'company_code' => '1000',
            'plant' => '1200',
            'currency' => 'INR',
            'items' => [
                [
                    'material_code' => '1300000002',
                    'description' => 'Gasket Kit',
                    'material_group' => 'YBPM01',
                    'quantity' => 5,
                    'unit_of_measure' => 'EA',
                    'unit_price' => 200.00,
                    'plant' => '1200',
                    'purchasing_organization' => '1100',
                    'purchasing_group' => '103',
                ],
            ],
        ];

        $response = $this->actingAs($user)->post(route('purchase-requisitions.store'), $payload);

        $response->assertRedirect(route('dashboard'));
        $this->assertDatabaseHas('purchase_requisitions', [
            'description' => 'Draft PR for Spare Parts',
            'is_draft' => 1,
            'approval_status' => 'draft',
            'sap_sync_status' => 'pending',
            'sap_pr_number' => null,
        ]);
    }

    public function test_draft_purchase_requisition_cannot_be_synced_to_sap(): void
    {
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'Administrator']);
        $user = User::factory()->create(['role_id' => $adminRole->id]);

        $this->mock(SapMasterDataService::class, function ($mock) {
            $mock->shouldReceive('postPurchaseRequisition')->never();
        });

        $pr = PurchaseRequisition::create([
            'pr_number' => 'PR-2026-DRAFT1',
            'user_id' => $user->id,
            'description' => 'Unfinalized Draft PR',
            'pr_type' => 'ZMAT',
            'company_code' => '1000',
            'plant' => '1200',
            'total_amount' => 500.00,
            'currency' => 'INR',
            'approval_status' => 'draft',
            'is_draft' => 1,
            'sap_sync_status' => 'pending',
        ]);

        $response = $this->actingAs($user)->post(route('purchase-requisitions.sync', $pr));

        $response->assertSessionHas('error', "Draft Purchase Requisition ({$pr->pr_number}) cannot be synced to SAP server until Draft status is 0.");
        $pr->refresh();
        $this->assertEquals(1, $pr->is_draft);
        $this->assertEquals('pending', $pr->sap_sync_status);
        $this->assertNull($pr->sap_pr_number);
    }

    public function test_user_can_finalize_draft_purchase_requisition(): void
    {
        $user = User::factory()->create();

        $pr = PurchaseRequisition::create([
            'pr_number' => 'PR-2026-DRAFT2',
            'user_id' => $user->id,
            'description' => 'Draft To Finalize',
            'pr_type' => 'ZMAT',
            'company_code' => '1000',
            'plant' => '1200',
            'total_amount' => 800.00,
            'currency' => 'INR',
            'approval_status' => 'draft',
            'is_draft' => 1,
            'sap_sync_status' => 'pending',
        ]);

        $response = $this->actingAs($user)->post(route('purchase-requisitions.finalize', $pr));

        $response->assertRedirect();
        $pr->refresh();
        $this->assertEquals(0, $pr->is_draft);
        $this->assertEquals('approved', $pr->approval_status);
    }

    public function test_user_can_create_purchase_requisition_with_file_attachment(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();

        $this->mock(SapMasterDataService::class, function ($mock) {
            $mock->shouldReceive('postPurchaseRequisition')
                ->once()
                ->andReturn([
                    'success' => true,
                    'sap_pr_number' => '1100000025',
                    'status' => 201,
                    'message' => 'Successfully posted to SAP',
                    'response' => [],
                    'payload' => [],
                ]);
            $mock->shouldReceive('uploadAttachmentToSap')
                ->once()
                ->andReturn([
                    'success' => true,
                    'status' => 201,
                    'sap_document_id' => 'DOC-9988',
                    'message' => 'Attachment uploaded to SAP',
                ]);
        });

        $fakeFile = UploadedFile::fake()->create('impeller_technical_drawing.pdf', 150, 'application/pdf');

        $payload = [
            'description' => 'PR with Drawing Attachment',
            'pr_type' => 'ZMAT',
            'company_code' => '1000',
            'plant' => '1200',
            'currency' => 'INR',
            'items' => [
                [
                    'material_code' => '1300000001',
                    'description' => 'Centrifugal Impeller',
                    'material_group' => 'YBPM01',
                    'quantity' => 1,
                    'unit_of_measure' => 'EA',
                    'unit_price' => 1250.00,
                    'plant' => '1200',
                    'attachment_doc_type' => 'YP1',
                    'attachment_file' => $fakeFile,
                ],
            ],
        ];

        $response = $this->actingAs($user)->post(route('purchase-requisitions.store'), $payload);

        $response->assertRedirect(route('dashboard'));

        $this->assertDatabaseHas('purchase_requisitions', [
            'description' => 'PR with Drawing Attachment',
            'sap_pr_number' => '1100000025',
        ]);

        $this->assertDatabaseHas('attachments', [
            'file_name' => 'impeller_technical_drawing.pdf',
            'attachment_doc_type' => 'YP1',
            'mime_type' => 'application/pdf',
        ]);

        $attachment = Attachment::where('file_name', 'impeller_technical_drawing.pdf')->first();
        $this->assertNotNull($attachment);
        $this->assertTrue(Storage::disk('public')->exists($attachment->file_path));

        // Test Attachement alias model works identically
        $aliasRecord = Attachement::find($attachment->id);
        $this->assertNotNull($aliasRecord);
        $this->assertEquals('impeller_technical_drawing.pdf', $aliasRecord->file_name);
        $this->assertNotNull($aliasRecord->url);
    }

    public function test_user_can_download_pr_attachment(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $pr = PurchaseRequisition::create([
            'pr_number' => 'PR-2026-ATT01',
            'user_id' => $user->id,
            'description' => 'Download Attachment Test PR',
            'pr_type' => 'ZMAT',
            'company_code' => '1000',
            'plant' => '1200',
            'total_amount' => 500.00,
            'currency' => 'INR',
            'approval_status' => 'approved',
            'sap_sync_status' => 'synced',
        ]);

        $fakeFile = UploadedFile::fake()->create('spec_sheet.pdf', 80, 'application/pdf');
        $storedPath = $fakeFile->store("attachments/{$pr->pr_number}", 'public');

        $attachment = Attachment::create([
            'purchase_requisition_id' => $pr->id,
            'item_number' => '00010',
            'file_name' => 'spec_sheet.pdf',
            'file_path' => $storedPath,
            'file_size' => $fakeFile->getSize(),
            'mime_type' => 'application/pdf',
            'attachment_doc_type' => 'SL1',
            'sap_sync_status' => 'pending',
            'user_id' => $user->id,
        ]);

        $response = $this->actingAs($user)->get(route('attachments.download', $attachment));

        $response->assertOk();
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

    public function test_account_assignment_category_n_is_rejected_with_validation_error(): void
    {
        $user = User::factory()->create();

        $payload = [
            'pr_type' => 'ZMAT',
            'description' => 'Invalid Network Category PR',
            'items' => [
                [
                    'item_number' => '00010',
                    'description' => 'Test Item with Category N',
                    'material_group' => 'YBPM01',
                    'quantity' => 10,
                    'unit_of_measure' => 'EA',
                    'unit_price' => 100,
                    'plant' => '1100',
                    'account_assignment_category' => 'N',
                ],
            ],
        ];

        $response = $this->actingAs($user)->post(route('purchase-requisitions.store'), $payload);

        $response->assertSessionHasErrors(['items.0.account_assignment_category']);
    }

    public function test_payload_correctly_formats_blank_and_k_account_assignment_categories(): void
    {
        $user = User::factory()->create();

        // 1. Test Blank Account Assignment Category (Stock item)
        $prStock = PurchaseRequisition::create([
            'pr_number' => 'PR-TEST-STOCK',
            'user_id' => $user->id,
            'description' => 'Stock Material Item',
            'pr_type' => 'ZMAT',
            'plant' => '1100',
            'total_amount' => 500,
            'currency' => 'INR',
            'approval_status' => 'draft',
            'is_draft' => 1,
            'sap_sync_status' => 'pending',
        ]);

        $itemStock = PurchaseRequisitionItem::create([
            'purchase_requisition_id' => $prStock->id,
            'item_number' => '00010',
            'item_type' => 'material',
            'description' => 'Stock Bolt Item',
            'material_code' => '1000000003',
            'material_group' => 'YBPM01',
            'quantity' => 10,
            'unit_of_measure' => 'EA',
            'unit_price' => 50,
            'price_unit' => 1,
            'total_price' => 500,
            'currency' => 'INR',
            'plant' => '1100',
            'account_assignment_category' => '',
        ]);

        $stockPayload = $prStock->toSapODataV4Payload();
        $this->assertEquals('', $stockPayload['_PurchaseRequisitionItem'][0]['AccountAssignmentCategory']);
        $this->assertArrayNotHasKey('_PurchaseReqnAcctAssgmt', $stockPayload['_PurchaseRequisitionItem'][0]);

        // 2. Test Category K (Cost Center item)
        $itemStock->update([
            'account_assignment_category' => 'K',
            'cost_center' => '10101PCC01',
            'gl_account' => '65301000',
        ]);
        $prStock->refresh();
        $prStock->load('items');

        $costCenterPayload = $prStock->toSapODataV4Payload();
        $this->assertEquals('K', $costCenterPayload['_PurchaseRequisitionItem'][0]['AccountAssignmentCategory']);
        $this->assertArrayHasKey('_PurchaseReqnAcctAssgmt', $costCenterPayload['_PurchaseRequisitionItem'][0]);
        $this->assertEquals('10101PCC01', $costCenterPayload['_PurchaseRequisitionItem'][0]['_PurchaseReqnAcctAssgmt'][0]['CostCenter']);
        $this->assertEquals('65301000', $costCenterPayload['_PurchaseRequisitionItem'][0]['_PurchaseReqnAcctAssgmt'][0]['GLAccount']);
    }

    public function test_sap_account_assignment_categories_endpoint_includes_blank_stock_option(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('sap-account-assignment-categories.index'));

        $response->assertOk();
        $data = $response->json();
        $this->assertNotEmpty($data['items']);
        // Verify Blank stock option is present
        $blankOpt = collect($data['items'])->first(fn($item) => $item['code'] === '');
        $this->assertNotNull($blankOpt);
        $this->assertStringContainsString('Stock', $blankOpt['name']);
    }
}


