<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Services\SapMasterDataService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class StorageLocationEndpointTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RoleAndDepartmentSeeder::class);
        $employeeRole = Role::where('name', 'employee')->first();

        $this->user = User::factory()->create([
            'role_id' => $employeeRole->id,
            'is_active' => true,
        ]);
    }

    public function test_storage_location_endpoint_resolves_to_zui_tms_02(): void
    {
        $service = new SapMasterDataService('https://my443658.s4hana.cloud.sap');
        $endpoint = $service->getEndpoint(
            'storage_locations',
            'https://my443658-api.s4hana.cloud.sap/sap/opu/odata/sap/ZUI_TMS_02/StorageLocationVH?format=json'
        );

        $this->assertStringContainsString('my443658-api.s4hana.cloud.sap', $endpoint);
        $this->assertStringContainsString('/sap/opu/odata/sap/ZUI_TMS_02/StorageLocationVH', $endpoint);
    }

    public function test_get_storage_locations_route_returns_success_with_mocked_data(): void
    {
        Http::fake([
            '*ZUI_TMS_02/StorageLocationVH*' => Http::response([
                'd' => [
                    'results' => [
                        [
                            'Plant' => '1200',
                            'StorageLocation' => 'F125',
                            'StorageLocationName' => '125 TPD Formalin',
                        ],
                        [
                            'Plant' => '1100',
                            'StorageLocation' => 'SL01',
                            'StorageLocationName' => 'Store',
                        ],
                    ],
                ],
            ], 200),
        ]);

        $response = $this->actingAs($this->user)->get('/sap-storage-locations');

        $response->assertOk();
        $data = $response->json();
        $this->assertTrue($data['success']);
        $this->assertEquals(2, $data['count']);
        $this->assertStringContainsString('ZUI_TMS_02 / StorageLocationVH', $data['source']);
        $this->assertEquals('F125', $data['items'][0]['StorageLocation']);
        $this->assertEquals('1200', $data['items'][0]['Plant']);
    }

    public function test_get_storage_locations_fallback_provides_realistic_items(): void
    {
        $service = new SapMasterDataService();
        $fallbacksAll = $service->getFormattedFallbackStorageLocations();
        $this->assertNotEmpty($fallbacksAll);

        $fallbacks1200 = $service->getFormattedFallbackStorageLocations('1200');
        $this->assertNotEmpty($fallbacks1200);
        foreach ($fallbacks1200 as $item) {
            $this->assertEquals('1200', $item['Plant']);
        }
    }
}
