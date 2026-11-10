<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\SapUrl;
use App\Models\User;
use App\Services\SapMasterDataService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SapUrlManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $employee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RoleAndDepartmentSeeder::class);

        $superAdminRole = Role::where('name', 'superadmin')->first();
        $employeeRole = Role::where('name', 'employee')->first();

        $this->superAdmin = User::factory()->create([
            'role_id' => $superAdminRole->id,
            'is_active' => true,
        ]);

        $this->employee = User::factory()->create([
            'role_id' => $employeeRole->id,
            'is_active' => true,
        ]);
    }

    public function test_superadmin_can_view_change_url_page(): void
    {
        $response = $this->actingAs($this->superAdmin)->get(route('change-url.index'));

        $response->assertOk();
    }

    public function test_non_superadmin_cannot_view_change_url_page(): void
    {
        $response = $this->actingAs($this->employee)->get(route('change-url.index'));

        $response->assertForbidden();
    }

    public function test_active_url_is_used_by_sap_master_data_service(): void
    {
        // Active URL should be quality URL seeded by migration
        $activeUrl = SapUrl::getActiveUrl();
        $this->assertEquals('https://my443658.s4hana.cloud.sap', $activeUrl);

        $service = app(SapMasterDataService::class);
        $this->assertEquals('https://my443658.s4hana.cloud.sap', $service->getBaseUrl());

        $endpoint = $service->getEndpoint('pr_document_types', '/sap/opu/odata/sap/YY1_PURCHASEREQTYPE_CDS/YY1_PURCHASEREQTYPE?$format=json');
        $this->assertStringStartsWith('https://my443658.s4hana.cloud.sap/', $endpoint);
    }

    public function test_superadmin_can_create_new_sap_url(): void
    {
        $response = $this->actingAs($this->superAdmin)->post(route('change-url.store'), [
            'environment_name' => 'Staging Sandbox',
            'url' => 'https://sandbox.s4hana.cloud.sap/',
            'description' => 'Sandbox test instance',
            'is_active' => false,
        ]);

        $response->assertRedirect(route('change-url.index'));
        $this->assertDatabaseHas('sap_urls', [
            'environment_name' => 'Staging Sandbox',
            'url' => 'https://sandbox.s4hana.cloud.sap/',
            'is_active' => false,
        ]);
    }

    public function test_activating_a_url_deactivates_all_others_and_service_updates(): void
    {
        $newUrl = SapUrl::create([
            'environment_name' => 'Production Live',
            'url' => 'https://prd.s4hana.cloud.sap/',
            'is_active' => false,
            'created_by' => $this->superAdmin->id,
        ]);

        // Activate the new URL
        $response = $this->actingAs($this->superAdmin)->post(route('change-url.activate', $newUrl));

        $response->assertRedirect(route('change-url.index'));

        // Only this URL should be active
        $this->assertTrue($newUrl->fresh()->is_active);
        $this->assertEquals(1, SapUrl::where('is_active', true)->count());

        // Master data service should immediately resolve the new active URL
        $service = app(SapMasterDataService::class);
        $this->assertEquals('https://prd.s4hana.cloud.sap', $service->getBaseUrl());
    }

    public function test_cannot_delete_active_url(): void
    {
        $active = SapUrl::where('is_active', true)->first();
        $this->assertNotNull($active);

        $response = $this->actingAs($this->superAdmin)->delete(route('change-url.destroy', $active));

        $response->assertSessionHas('error');
        $this->assertDatabaseHas('sap_urls', ['id' => $active->id]);
    }
}
