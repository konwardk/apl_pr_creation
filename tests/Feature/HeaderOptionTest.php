<?php

namespace Tests\Feature;

use App\Models\HeaderOption;
use App\Models\PurchaseRequisition;
use App\Models\User;
use Database\Seeders\HeaderOptionSeeder;
use Database\Seeders\RoleAndDepartmentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HeaderOptionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleAndDepartmentSeeder::class);
        $this->seed(HeaderOptionSeeder::class);
    }

    public function test_guests_cannot_access_header_options(): void
    {
        $response = $this->get(route('header-options.index'));
        $response->assertRedirect(route('login'));
    }

    public function test_employees_cannot_manage_header_options(): void
    {
        $employee = User::where('email', 'employee@example.com')->first();

        $response = $this->actingAs($employee)->get(route('header-options.index'));
        $response->assertForbidden();

        $responsePost = $this->actingAs($employee)->post(route('header-options.store'), [
            'name' => 'Unauthorized Option',
            'code' => 'UNAUTH',
        ]);
        $responsePost->assertForbidden();
    }

    public function test_superadmin_can_list_header_options(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();

        $response = $this->actingAs($superadmin)->get(route('header-options.index'));
        $response->assertOk();
        $response->assertJsonStructure([
            'headerOptions' => [
                '*' => ['id', 'code', 'name', 'is_active'],
            ],
        ]);
    }

    public function test_superadmin_can_create_new_header_option(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();

        $response = $this->actingAs($superadmin)->post(route('header-options.store'), [
            'name' => 'Strategic R&D Expansion',
            'code' => 'STRAT-RD',
            'description' => 'Dedicated capital project for research expansion.',
            'is_active' => true,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('header_options', [
            'code' => 'STRAT-RD',
            'name' => 'Strategic R&D Expansion',
            'is_active' => true,
            'created_by' => $superadmin->id,
        ]);
    }

    public function test_superadmin_can_create_header_option_with_auto_generated_code(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();

        $response = $this->actingAs($superadmin)->post(route('header-options.store'), [
            'name' => 'Factory Boiler Overhaul',
            'code' => '',
            'description' => 'Overhaul service requirement.',
        ]);

        $response->assertRedirect();
        $created = HeaderOption::where('name', 'Factory Boiler Overhaul')->first();
        $this->assertNotNull($created);
        $this->assertStringStartsWith('HO-', $created->code);
    }

    public function test_superadmin_can_update_header_option(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();
        $option = HeaderOption::first();

        $response = $this->actingAs($superadmin)->put(route('header-options.update', $option), [
            'name' => 'Updated OPEX Name',
            'code' => $option->code,
            'description' => 'Updated description text.',
            'is_active' => true,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('header_options', [
            'id' => $option->id,
            'name' => 'Updated OPEX Name',
            'description' => 'Updated description text.',
        ]);
    }

    public function test_superadmin_can_toggle_header_option_status(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();
        $option = HeaderOption::first();
        $initialStatus = $option->is_active;

        $response = $this->actingAs($superadmin)->post(route('header-options.toggle-status', $option));
        $response->assertRedirect();

        $option->refresh();
        $this->assertEquals(!$initialStatus, $option->is_active);
    }

    public function test_superadmin_can_delete_header_option(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();
        $option = HeaderOption::create([
            'name' => 'Temporary Option',
            'code' => 'TEMP-DEL',
            'is_active' => true,
        ]);

        $response = $this->actingAs($superadmin)->delete(route('header-options.destroy', $option));
        $response->assertRedirect();

        $this->assertDatabaseMissing('header_options', [
            'id' => $option->id,
        ]);
    }

    public function test_pr_create_page_provides_header_options_to_user(): void
    {
        $employee = User::where('email', 'employee@example.com')->first();

        $response = $this->actingAs($employee)->get(route('purchase-requisitions.create'));
        $response->assertOk();
        $response->assertInertia(fn ($page) =>
            $page->component('purchase-requisitions/create')
                ->has('headerOptions')
                ->has('masterData.headerOptions')
        );
    }

    public function test_user_can_create_purchase_requisition_with_header_option(): void
    {
        $user = User::where('email', 'employee@example.com')->first();
        $headerOption = HeaderOption::where('code', 'OPEX')->first();

        $payload = [
            'description' => 'Chemical Solvent Procurement',
            'header_note' => 'Q4 Plant operations allocation',
            'header_option_id' => $headerOption->id,
            'pr_type' => 'ZCOM',
            'company_code' => '1010',
            'plant' => '1200',
            'currency' => 'INR',
            'items' => [
                [
                    'material_code' => '10000001',
                    'description' => 'HCL Acid 30-33% Conc.',
                    'material_group' => 'L002',
                    'quantity' => 10,
                    'unit_of_measure' => 'KG',
                    'unit_price' => 26.94,
                    'plant' => '1200',
                    'purchasing_group' => '103',
                ],
            ],
        ];

        $response = $this->actingAs($user)->post(route('purchase-requisitions.store'), $payload);
        $response->assertRedirect();

        $pr = PurchaseRequisition::where('description', 'Chemical Solvent Procurement')->first();
        $this->assertNotNull($pr);
        $this->assertEquals($headerOption->id, $pr->header_option_id);
        $this->assertEquals('Operational Expenditure (OPEX)', $pr->headerOption->name);
    }

    public function test_guests_cannot_access_pr_configuration_route(): void
    {
        $response = $this->get(route('pr-configuration.index'));
        $response->assertRedirect(route('login'));
    }

    public function test_employees_cannot_access_pr_configuration_route(): void
    {
        $employee = User::where('email', 'employee@example.com')->first();

        $response = $this->actingAs($employee)->get(route('pr-configuration.index'));
        $response->assertForbidden();
    }

    public function test_superadmin_can_access_pr_configuration_route(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();

        $response = $this->actingAs($superadmin)->get(route('pr-configuration.index'));
        $response->assertRedirect(route('dashboard', ['tab' => 'pr-configuration']));
    }
}
