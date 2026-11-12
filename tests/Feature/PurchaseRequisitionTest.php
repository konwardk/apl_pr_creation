<?php

namespace Tests\Feature;

use App\Models\Attachment;
use App\Models\Attachement;
use App\Models\ContractRequisition;
use App\Models\PurchaseRequisition;
use App\Models\PurchaseRequisitionItem;
use App\Models\Role;
use App\Models\User;
use App\Services\SapMasterDataService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
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

        Http::fake([
            '*YY1_PRODUCTPLANTVALUATION_CDS*' => Http::response([
                'd' => [
                    'results' => [
                        [
                            'Product' => 'CHAIR-001',
                            'ProductName' => 'Office Revolving Chair',
                            'BaseUnit' => 'EA',
                            'ProductGroup' => 'FURN',
                            'ProductType' => 'ZROH',
                        ],
                    ],
                ],
            ], 200),
        ]);

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

        Http::fake([
            '*YY1_PRODUCTPLANTVALUATION_CDS*' => Http::response([
                'd' => [
                    'results' => [
                        [
                            'Product' => 'CHAIR-001',
                            'ProductName' => 'Office Revolving Chair',
                            'BaseUnit' => 'EA',
                            'ProductGroup' => 'FURN',
                            'ProductType' => 'ZROH',
                        ],
                    ],
                ],
            ], 200),
        ]);

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

    public function test_sap_material_groups_endpoint_returns_data(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('sap-material-groups.index'));

        $response->assertOk();
        $data = $response->json();
        $this->assertTrue($data['success']);
        $this->assertNotEmpty($data['items']);
        $this->assertArrayHasKey('code', $data['items'][0]);
        $this->assertArrayHasKey('name', $data['items'][0]);
        $this->assertArrayHasKey('MaterialGroup', $data['items'][0]);
    }

    public function test_create_pr_page_provides_material_groups_master_data(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('purchase-requisitions.create'));

        $response->assertOk();
        $response->assertInertia(fn($page) =>
            $page->component('purchase-requisitions/create')
                ->has('masterData.materialGroups')
        );
    }

    public function test_failed_sync_purchase_requisition_is_editable(): void
    {
        $user = User::factory()->create();

        $pr = PurchaseRequisition::create([
            'pr_number' => 'PR-2026-FAIL1',
            'user_id' => $user->id,
            'description' => 'Failed PR Edit Test',
            'pr_type' => 'ZMAT',
            'company_code' => '1000',
            'plant' => '1200',
            'total_amount' => 1250.00,
            'currency' => 'INR',
            'approval_status' => 'approved',
            'is_draft' => 0,
            'sap_sync_status' => 'failed',
            'sap_sync_message' => 'Material NUTS not maintained in Plant 1200',
        ]);

        $this->assertTrue($pr->isEditable());
        $this->assertTrue($pr->is_editable);

        $response = $this->actingAs($user)->get(route('purchase-requisitions.edit', $pr));

        $response->assertOk();
        $response->assertInertia(fn($page) =>
            $page->component('purchase-requisitions/edit')
                ->has('purchaseRequisition')
                ->where('purchaseRequisition.id', $pr->id)
                ->where('purchaseRequisition.sap_sync_status', 'failed')
        );
    }

    public function test_synced_purchase_requisition_cannot_be_edited(): void
    {
        $user = User::factory()->create();

        $pr = PurchaseRequisition::create([
            'pr_number' => 'PR-2026-SYNC1',
            'user_id' => $user->id,
            'description' => 'Synced PR Test',
            'pr_type' => 'ZMAT',
            'company_code' => '1000',
            'plant' => '1200',
            'total_amount' => 500.00,
            'currency' => 'INR',
            'approval_status' => 'approved',
            'is_draft' => 0,
            'sap_sync_status' => 'synced',
            'sap_pr_number' => '0010009999',
        ]);

        $this->assertFalse($pr->isEditable());
        $this->assertFalse($pr->is_editable);

        $response = $this->actingAs($user)->get(route('purchase-requisitions.edit', $pr));

        $response->assertRedirect(route('dashboard'));
        $response->assertSessionHas('error');
    }

    public function test_next_sequence_endpoint_returns_json_sequence(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('purchase-requisitions.next-sequence'));

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'current_year',
                'next_pr_number',
                'next_cr_no',
            ]);

        $year = date('Y');
        $this->assertStringStartsWith("PR/{$user->id}/{$year}/", $response->json('next_pr_number'));
        $this->assertStringStartsWith("CR/{$user->id}/{$year}/", $response->json('next_cr_no'));
    }

    public function test_generate_next_pr_and_cr_number_format_includes_user_id_and_slashes(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $year = date('Y');

        $controller = app(\App\Http\Controllers\PurchaseRequisitionController::class);

        // Check format for user 1
        $pr1 = $controller->generateNextPrNumber(false, $user1->id);
        $cr1 = $controller->generateNextCrNumber(false, $user1->id);
        $this->assertEquals("PR/{$user1->id}/{$year}/00001", $pr1);
        $this->assertEquals("CR/{$user1->id}/{$year}/00001", $cr1);

        // Save PR and CR with these numbers
        $req1 = PurchaseRequisition::create([
            'pr_number' => $pr1,
            'user_id' => $user1->id,
            'description' => 'User 1 PR',
            'pr_type' => 'ZMAT',
            'company_code' => '1000',
            'plant' => '1200',
            'total_amount' => 100.00,
            'currency' => 'INR',
        ]);
        ContractRequisition::create([
            'purchase_requisition_id' => $req1->id,
            'cr_no' => $cr1,
            'contract_title' => 'User 1 CR',
        ]);

        // Next number for user 1 should increment sequence
        $pr1Next = $controller->generateNextPrNumber(false, $user1->id);
        $cr1Next = $controller->generateNextCrNumber(false, $user1->id);
        $this->assertEquals("PR/{$user1->id}/{$year}/00002", $pr1Next);
        $this->assertEquals("CR/{$user1->id}/{$year}/00002", $cr1Next);

        // User 2 should have independent sequence starting at 00001
        $pr2 = $controller->generateNextPrNumber(false, $user2->id);
        $cr2 = $controller->generateNextCrNumber(false, $user2->id);
        $this->assertEquals("PR/{$user2->id}/{$year}/00001", $pr2);
        $this->assertEquals("CR/{$user2->id}/{$year}/00001", $cr2);
    }

    public function test_check_cr_number_endpoint_validates_uniqueness(): void
    {
        $user = User::factory()->create();
        $year = date('Y');
        $testCrNo = "CR-{$year}-99991";

        // Check availability when it doesn't exist
        $response = $this->actingAs($user)->get("/purchase-requisitions/check-cr-number?cr_no={$testCrNo}");
        $response->assertOk()
            ->assertJson([
                'is_available' => true,
                'cr_no' => $testCrNo,
            ]);

        // Create a ContractRequisition with this number
        $pr = PurchaseRequisition::create([
            'pr_number' => "PR-{$year}-99991",
            'user_id' => $user->id,
            'description' => 'Test PR for CR validation',
            'pr_type' => 'ZMAT',
            'company_code' => '1000',
            'plant' => '1200',
            'total_amount' => 100.00,
            'currency' => 'INR',
            'is_draft' => 1,
        ]);

        $cr = ContractRequisition::create([
            'purchase_requisition_id' => $pr->id,
            'cr_no' => $testCrNo,
            'contract_title' => 'Test Title',
        ]);

        // Now check should report unavailable
        $response = $this->actingAs($user)->get("/purchase-requisitions/check-cr-number?cr_no={$testCrNo}");
        $response->assertOk()
            ->assertJson([
                'is_available' => false,
                'cr_no' => $testCrNo,
            ]);
        $this->assertStringContainsString('already exists', $response->json('message'));

        // If ignoring current CR ID, it should be available
        $response = $this->actingAs($user)->get("/purchase-requisitions/check-cr-number?cr_no={$testCrNo}&ignore_id={$cr->id}");
        $response->assertOk()
            ->assertJson([
                'is_available' => true,
                'cr_no' => $testCrNo,
            ]);
    }

    public function test_duplicate_cr_number_returns_validation_error_instead_of_sql_crash(): void
    {
        $user = User::factory()->create();
        $year = date('Y');
        $existingCrNo = "CR-{$year}-00088";

        // Pre-create existing PR and CR
        $pr = PurchaseRequisition::create([
            'pr_number' => "PR-{$year}-00088",
            'user_id' => $user->id,
            'description' => 'Initial PR',
            'pr_type' => 'ZMAT',
            'company_code' => '1000',
            'plant' => '1200',
            'total_amount' => 100.00,
            'currency' => 'INR',
            'is_draft' => 1,
        ]);

        ContractRequisition::create([
            'purchase_requisition_id' => $pr->id,
            'cr_no' => $existingCrNo,
            'contract_title' => 'Existing Title',
        ]);

        // Submitting another PR with the identical cr_no should return HTTP 422 with a clear error message
        $payload = [
            'description' => 'Duplicate CR Requisition Attempt',
            'pr_type' => 'ZMAT',
            'company_code' => '1000',
            'plant' => '1200',
            'currency' => 'INR',
            'is_draft' => true,
            'contract_requisition' => [
                'cr_no' => $existingCrNo,
                'contract_title' => 'Duplicate Requisition Title',
            ],
            'items' => [
                [
                    'material_code' => '1300000001',
                    'description' => 'Test Item',
                    'material_group' => 'YBPM01',
                    'quantity' => 1,
                    'unit_of_measure' => 'EA',
                    'unit_price' => 100.00,
                    'plant' => '1200',
                    'purchasing_organization' => '1100',
                    'purchasing_group' => '103',
                ],
            ],
        ];

        $response = $this->actingAs($user)
            ->withHeaders(['Accept' => 'application/json'])
            ->postJson(route('purchase-requisitions.store'), $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['contract_requisition.cr_no']);

        $errors = $response->json('errors');
        $errorMsg = $errors['contract_requisition.cr_no'][0] ?? '';
        $this->assertStringContainsString("Contract Requisition number '{$existingCrNo}' already exists in the local database", $errorMsg);
    }

    public function test_purchase_requisition_item_can_persist_expected_value_overall_limit_and_dates(): void
    {
        $pr = PurchaseRequisition::create([
            'pr_number' => 'PR-LIMIT-TEST-001',
            'description' => 'Test PR with Limits and Period',
            'company_code' => '1000',
            'plant' => '1200',
            'currency' => 'INR',
            'approval_status' => 'draft',
        ]);

        $item = PurchaseRequisitionItem::create([
            'purchase_requisition_id' => $pr->id,
            'item_number' => '00010',
            'description' => 'Service Item with Limits',
            'quantity' => 1,
            'unit_of_measure' => 'AU',
            'unit_price' => 0,
            'expected_value' => 50000.00,
            'overall_limit' => 75000.00,
            'start_date' => '2026-11-01',
            'end_date' => '2026-12-31',
            'material_group' => 'YBPM01',
            'plant' => '1200',
        ]);

        $item->refresh();

        $this->assertEquals(50000.00, (float) $item->expected_value);
        $this->assertEquals(75000.00, (float) $item->overall_limit);
        $this->assertEquals('2026-11-01', $item->start_date->format('Y-m-d'));
        $this->assertEquals('2026-12-31', $item->end_date->format('Y-m-d'));
    }

    public function test_purchase_requisition_store_validates_category_e_mandatory_fields(): void
    {
        $user = User::factory()->create();

        $payload = [
            'description' => 'Enhanced Limits Test PR',
            'pr_type' => 'NB',
            'company_code' => '1000',
            'plant' => '1200',
            'currency' => 'INR',
            'is_draft' => false,
            'items' => [
                [
                    'item_category' => 'E',
                    'description' => 'Enhanced Limit Item Missing Fields',
                    'material_group' => 'YBPM01',
                    'quantity' => 1,
                    'unit_of_measure' => 'AU',
                    'unit_price' => 100.00,
                    'plant' => '1200',
                    'purchasing_organization' => '1100',
                    'purchasing_group' => '103',
                ],
            ],
        ];

        $response = $this->actingAs($user)
            ->withHeaders(['Accept' => 'application/json'])
            ->postJson(route('purchase-requisitions.store'), $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'items.0.expected_value',
                'items.0.overall_limit',
                'items.0.start_date',
                'items.0.end_date',
            ]);
    }

    public function test_purchase_requisition_store_succeeds_with_category_e_and_valid_limits(): void
    {
        $user = User::factory()->create();

        $payload = [
            'description' => 'Valid Enhanced Limits PR',
            'pr_type' => 'NB',
            'company_code' => '1000',
            'plant' => '1200',
            'currency' => 'INR',
            'is_draft' => false,
            'items' => [
                [
                    'item_category' => 'E',
                    'description' => 'Valid Enhanced Limit Item',
                    'material_group' => 'YBPM01',
                    'quantity' => 1,
                    'unit_of_measure' => 'AU',
                    'unit_price' => 0.00,
                    'expected_value' => 25000.00,
                    'overall_limit' => 30000.00,
                    'start_date' => '2026-11-01',
                    'end_date' => '2026-11-30',
                    'plant' => '1200',
                    'purchasing_organization' => '1100',
                    'purchasing_group' => '103',
                ],
            ],
        ];

        $response = $this->actingAs($user)
            ->withHeaders(['Accept' => 'application/json'])
            ->postJson(route('purchase-requisitions.store'), $payload);

        $response->assertStatus(200);

        $savedItem = PurchaseRequisitionItem::where('item_category', 'E')->first();
        $this->assertNotNull($savedItem);
        $this->assertEquals(25000.00, (float) $savedItem->expected_value);
        $this->assertEquals(30000.00, (float) $savedItem->overall_limit);
        $this->assertEquals('2026-11-01', $savedItem->start_date->format('Y-m-d'));
        $this->assertEquals('2026-11-30', $savedItem->end_date->format('Y-m-d'));
    }
}


