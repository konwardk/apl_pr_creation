<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;

class SapMaterialsSearchApiTest extends TestCase
{
    public function test_sap_materials_endpoint_with_search_query()
    {
        $user = User::factory()->make(['id' => 1]);
        $response = $this->actingAs($user)->getJson('/sap-materials?search=BOLT');

        $response->assertStatus(200);
        $data = $response->json();
        dump($data);
        $this->assertTrue($data['success'] ?? false);
        $this->assertNotEmpty($data['items'] ?? []);
        $this->assertStringContainsString('BOLT', $data['items'][0]['ProductName'] ?? '');
    }

    public function test_sap_materials_endpoint_with_material_code()
    {
        $user = User::factory()->make(['id' => 1]);
        $response = $this->actingAs($user)->getJson('/sap-materials?search=1000000003');

        $response->assertStatus(200);
        $data = $response->json();
        dump($data);
        $this->assertTrue($data['success'] ?? false);
        $this->assertNotEmpty($data['items'] ?? []);
        $this->assertEquals('1000000003', $data['items'][0]['Product'] ?? '');
    }
}
