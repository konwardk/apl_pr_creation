<?php

namespace Tests\Feature;

use App\Models\ItemCategory;
use App\Models\User;
use Database\Seeders\ItemCategorySeeder;
use Database\Seeders\RoleAndDepartmentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ItemCategoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleAndDepartmentSeeder::class);
        $this->seed(ItemCategorySeeder::class);
    }

    public function test_guests_cannot_access_item_categories(): void
    {
        $response = $this->get(route('item-categories.index'));
        $response->assertRedirect(route('login'));
    }

    public function test_employees_cannot_manage_item_categories(): void
    {
        $employee = User::where('email', 'employee@example.com')->first();

        $response = $this->actingAs($employee)->get(route('item-categories.index'));
        $response->assertForbidden();

        $responsePost = $this->actingAs($employee)->post(route('item-categories.store'), [
            'name' => 'Unauthorized Category',
            'code' => 'ZUNAUTH',
        ]);
        $responsePost->assertForbidden();
    }

    public function test_superadmin_can_list_item_categories(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();

        $response = $this->actingAs($superadmin)->get(route('item-categories.index'));
        $response->assertOk();
        $response->assertJsonStructure([
            'itemCategories' => [
                '*' => ['id', 'code', 'name', 'is_active'],
            ],
        ]);
    }

    public function test_superadmin_can_create_new_item_category(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();

        $response = $this->actingAs($superadmin)->post(route('item-categories.store'), [
            'code' => 'ZSPEC',
            'name' => 'ZSPEC - Special Project Category',
            'description' => 'Custom plant expansion line item procurement.',
            'is_active' => true,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('item_categories', [
            'code' => 'ZSPEC',
            'name' => 'ZSPEC - Special Project Category',
            'is_active' => true,
            'created_by' => $superadmin->id,
        ]);
    }

    public function test_superadmin_can_update_item_category(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();
        $category = ItemCategory::where('code', 'Standard')->first();

        $response = $this->actingAs($superadmin)->put(route('item-categories.update', $category), [
            'code' => 'Standard',
            'name' => 'Standard (Baseline Material & Services)',
            'description' => 'Updated operational description.',
            'is_active' => true,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('item_categories', [
            'id' => $category->id,
            'name' => 'Standard (Baseline Material & Services)',
            'description' => 'Updated operational description.',
        ]);
    }

    public function test_superadmin_can_toggle_item_category_status(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();
        $category = ItemCategory::where('code', 'T')->first();
        $initialStatus = $category->is_active;

        $response = $this->actingAs($superadmin)->post(route('item-categories.toggle-status', $category));
        $response->assertRedirect();

        $category->refresh();
        $this->assertEquals(!$initialStatus, $category->is_active);
    }

    public function test_superadmin_can_delete_item_category(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();
        $category = ItemCategory::create([
            'code' => 'ZTEMP',
            'name' => 'Temporary Category',
            'is_active' => true,
        ]);

        $response = $this->actingAs($superadmin)->delete(route('item-categories.destroy', $category));
        $response->assertRedirect();

        $this->assertDatabaseMissing('item_categories', [
            'id' => $category->id,
        ]);
    }

    public function test_pr_create_page_provides_item_categories_for_f4_search_help(): void
    {
        $employee = User::where('email', 'employee@example.com')->first();

        $response = $this->actingAs($employee)->get(route('purchase-requisitions.create'));
        $response->assertOk();
        $response->assertInertia(fn ($page) =>
            $page->component('purchase-requisitions/create')
                ->has('itemCategories')
                ->has('masterData.itemCategories')
                ->where('masterData.itemCategories.0.code', 'B') // Ordered by code alphabetically
        );
    }

    public function test_dashboard_provides_item_categories_to_superadmin(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();

        $response = $this->actingAs($superadmin)->get(route('dashboard'));
        $response->assertOk();
        $response->assertInertia(fn ($page) =>
            $page->component('dashboard')
                ->has('itemCategories')
        );
    }
}
