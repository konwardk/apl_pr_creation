<?php

namespace Tests\Feature;

use App\Models\PrDocumentType;
use App\Models\User;
use Database\Seeders\PrDocumentTypeSeeder;
use Database\Seeders\RoleAndDepartmentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PrDocumentTypeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleAndDepartmentSeeder::class);
        $this->seed(PrDocumentTypeSeeder::class);
    }

    public function test_guests_cannot_access_pr_document_types(): void
    {
        $response = $this->get(route('pr-document-types.index'));
        $response->assertRedirect(route('login'));
    }

    public function test_employees_cannot_manage_pr_document_types(): void
    {
        $employee = User::where('email', 'employee@example.com')->first();

        $response = $this->actingAs($employee)->get(route('pr-document-types.index'));
        $response->assertForbidden();

        $responseFetch = $this->actingAs($employee)->post(route('pr-document-types.fetch-sap'));
        $responseFetch->assertForbidden();

        $responseSave = $this->actingAs($employee)->post(route('pr-document-types.save-sap'), [
            'items' => [
                ['code' => 'ZTEST', 'name' => 'Unauthorized Document Type'],
            ],
        ]);
        $responseSave->assertForbidden();
    }

    public function test_superadmin_can_list_pr_document_types(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();

        $response = $this->actingAs($superadmin)->get(route('pr-document-types.index'));
        $response->assertOk();
        $response->assertJsonStructure([
            'success',
            'data' => [
                '*' => ['id', 'code', 'name', 'is_active', 'sap_source'],
            ],
            'total',
        ]);
        $this->assertGreaterThanOrEqual(9, $response->json('total'));
    }

    public function test_superadmin_can_fetch_from_sap_cds_view(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();

        $response = $this->actingAs($superadmin)->post(route('pr-document-types.fetch-sap'), [
            'endpoint' => 'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_PURCHASEREQTYPE_CDS/YY1_PURCHASEREQTYPE?$format=json',
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'success',
            'source',
            'endpoint',
            'count',
            'items' => [
                '*' => ['code', 'name', 'category', 'description', 'sap_source', 'is_in_database', 'sync_status'],
            ],
        ]);
        $this->assertNotEmpty($response->json('items'));
    }

    public function test_superadmin_can_save_staged_document_types_to_mysql(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();

        $payload = [
            'items' => [
                [
                    'code' => 'ZNEW',
                    'name' => 'Custom S/4HANA Special Requisition (ZNEW)',
                    'category' => 'Custom APL Type',
                    'description' => 'Test special requisition imported directly from CDS View.',
                    'sap_source' => 'YY1_PURCHASEREQTYPE_CDS / I_PurchaseRequisitionType',
                ],
                [
                    'code' => 'ZCOM',
                    'name' => 'Domestic Cmpste PR (ZCOM) - Updated',
                    'category' => 'Domestic Composite',
                    'description' => 'Updated via live CDS view synchronization.',
                    'sap_source' => 'YY1_PURCHASEREQTYPE_CDS / I_PurchaseRequisitionType',
                ],
            ],
        ];

        $response = $this->actingAs($superadmin)->postJson(route('pr-document-types.save-sap'), $payload);

        $response->assertOk();
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('summary.created', 1);
        $response->assertJsonPath('summary.updated', 1);

        $this->assertDatabaseHas('pr_document_types', [
            'code' => 'ZNEW',
            'name' => 'Custom S/4HANA Special Requisition (ZNEW)',
        ]);

        $this->assertDatabaseHas('pr_document_types', [
            'code' => 'ZCOM',
            'name' => 'Domestic Cmpste PR (ZCOM) - Updated',
        ]);
    }

    public function test_superadmin_can_toggle_document_type_status(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();
        $docType = PrDocumentType::where('code', 'NB')->first();
        $this->assertTrue($docType->is_active);

        $response = $this->actingAs($superadmin)->postJson(route('pr-document-types.toggle-status', $docType));

        $response->assertOk();
        $this->assertFalse($docType->fresh()->is_active);

        // Toggle back to true
        $this->actingAs($superadmin)->postJson(route('pr-document-types.toggle-status', $docType));
        $this->assertTrue($docType->fresh()->is_active);
    }

    public function test_superadmin_can_update_document_type_metadata(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();
        $docType = PrDocumentType::where('code', 'NB')->first();

        $response = $this->actingAs($superadmin)->putJson(route('pr-document-types.update', $docType), [
            'name' => 'Standard Purchase Requisition (NB) Global',
            'description' => 'Updated business instructions for chemical plant purchasing.',
            'category' => 'Standard SAP Core',
            'is_active' => true,
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('pr_document_types', [
            'id' => $docType->id,
            'name' => 'Standard Purchase Requisition (NB) Global',
            'category' => 'Standard SAP Core',
        ]);
    }

    public function test_superadmin_can_delete_document_type(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();
        $docType = PrDocumentType::create([
            'code' => 'ZDEL',
            'name' => 'To be deleted type',
            'is_active' => true,
        ]);

        $response = $this->actingAs($superadmin)->deleteJson(route('pr-document-types.destroy', $docType));

        $response->assertOk();
        $this->assertDatabaseMissing('pr_document_types', [
            'id' => $docType->id,
        ]);
    }

    public function test_pr_creation_page_loads_active_document_types_from_mysql(): void
    {
        $employee = User::where('email', 'employee@example.com')->first();

        $response = $this->actingAs($employee)->get(route('purchase-requisitions.create'));

        $response->assertOk();
        $response->assertInertia(fn($page) =>
            $page->component('purchase-requisitions/create')
                ->has('prDocumentTypes')
                ->has('masterData.documentTypes')
        );
    }
}
