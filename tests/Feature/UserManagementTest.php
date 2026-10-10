<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\PurchaseRequisition;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleAndDepartmentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleAndDepartmentSeeder::class);
    }

    public function test_guests_cannot_access_user_management(): void
    {
        $response = $this->get(route('users.index'));
        $response->assertRedirect(route('login'));
    }

    public function test_employees_cannot_access_user_management(): void
    {
        $employee = User::where('email', 'employee@example.com')->first();

        $response = $this->actingAs($employee)->get(route('users.index'));
        $response->assertForbidden();
    }

    public function test_admins_cannot_access_user_management(): void
    {
        $admin = User::where('email', 'admin@example.com')->first();

        $response = $this->actingAs($admin)->get(route('users.index'));
        $response->assertForbidden();
    }

    public function test_superadmin_can_access_user_management(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();

        $response = $this->actingAs($superadmin)->get(route('users.index'));
        $response->assertOk();
    }

    public function test_superadmin_can_create_new_employee_user(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();
        $employeeRole = Role::where('name', 'employee')->first();
        $department = Department::firstOrCreate(
            ['code' => 'D-MNT'],
            ['name' => 'Maintenance', 'description' => 'Plant Maintenance', 'is_active' => true]
        );

        $response = $this->actingAs($superadmin)->post(route('users.store'), [
            'name' => 'Pranab Barua',
            'email' => 'pranab.barua@assampetrochemicals.co.in',
            'password' => 'secret123',
            'role_id' => $employeeRole->id,
            'department_id' => $department->id,
            'employee_id' => 'APL-EMP-8888',
            'designation' => 'Plant Maintenance Engineer',
            'phone' => '+91 94350 99999',
            'plant' => '1200 - Dibrugarh Manufacturing Plant',
            'is_active' => true,
        ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('users', [
            'email' => 'pranab.barua@assampetrochemicals.co.in',
            'role_id' => $employeeRole->id,
            'employee_id' => 'APL-EMP-8888',
            'designation' => 'Plant Maintenance Engineer',
        ]);
    }

    public function test_superadmin_can_update_existing_user(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();
        $employee = User::where('email', 'employee@example.com')->first();
        $adminRole = Role::where('name', 'admin')->first();

        $response = $this->actingAs($superadmin)->put(route('users.update', $employee), [
            'name' => 'Promoted Employee',
            'email' => 'employee.promoted@example.com',
            'role_id' => $adminRole->id,
            'department_id' => $employee->department_id,
            'employee_id' => $employee->employee_id,
            'designation' => 'Lead Procurement Specialist',
            'is_active' => true,
        ]);

        $response->assertSessionHas('success');
        $employee->refresh();

        $this->assertEquals('Promoted Employee', $employee->name);
        $this->assertEquals('employee.promoted@example.com', $employee->email);
        $this->assertEquals($adminRole->id, $employee->role_id);
    }

    public function test_superadmin_can_toggle_user_active_status(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();
        $employee = User::where('email', 'employee@example.com')->first();
        $this->assertTrue($employee->is_active);

        $response = $this->actingAs($superadmin)->post(route('users.toggle-status', $employee));
        $response->assertSessionHas('success');

        $employee->refresh();
        $this->assertFalse($employee->is_active);

        // Deactivated user cannot log in or access protected routes
        $response = $this->actingAs($employee)->get(route('dashboard'));
        $response->assertForbidden();
    }

    public function test_superadmin_cannot_deactivate_own_account(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();

        $response = $this->actingAs($superadmin)->post(route('users.toggle-status', $superadmin));
        $response->assertSessionHas('error');

        $superadmin->refresh();
        $this->assertTrue($superadmin->is_active);
    }

    public function test_superadmin_can_delete_user(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();
        $employee = User::where('email', 'employee@example.com')->first();

        $response = $this->actingAs($superadmin)->delete(route('users.destroy', $employee));
        $response->assertSessionHas('success');

        $this->assertDatabaseMissing('users', [
            'id' => $employee->id,
        ]);
    }

    public function test_employee_cannot_trigger_direct_sap_sync(): void
    {
        $employee = User::where('email', 'employee@example.com')->first();

        $pr = PurchaseRequisition::create([
            'pr_number' => 'PR-2026-00001',
            'user_id' => $employee->id,
            'description' => 'Employee Test PR',
            'pr_type' => 'ZCOM',
            'plant' => '1200',
            'company_code' => '1010',
            'total_amount' => 500.00,
            'currency' => 'INR',
            'sap_sync_status' => 'pending',
            'approval_status' => 'approved',
        ]);

        $response = $this->actingAs($employee)->post(route('purchase-requisitions.sync', $pr));
        $response->assertSessionHas('error');

        $pr->refresh();
        $this->assertEquals('pending', $pr->sap_sync_status);
    }

    public function test_employee_only_sees_their_own_purchase_requisitions(): void
    {
        $employee1 = User::where('email', 'employee@example.com')->first();
        $admin = User::where('email', 'admin@example.com')->first();

        // PR by employee 1
        $pr1 = PurchaseRequisition::create([
            'pr_number' => 'PR-2026-00010',
            'user_id' => $employee1->id,
            'description' => 'Employee 1 PR',
            'pr_type' => 'ZCOM',
            'plant' => '1200',
            'company_code' => '1010',
            'total_amount' => 300.00,
            'currency' => 'INR',
            'sap_sync_status' => 'pending',
            'approval_status' => 'approved',
        ]);

        // PR by Admin
        $pr2 = PurchaseRequisition::create([
            'pr_number' => 'PR-2026-00020',
            'user_id' => $admin->id,
            'description' => 'Admin Plant PR',
            'pr_type' => 'ZCOM',
            'plant' => '1200',
            'company_code' => '1010',
            'total_amount' => 9000.00,
            'currency' => 'INR',
            'sap_sync_status' => 'pending',
            'approval_status' => 'approved',
        ]);

        // Employee dashboard request
        $response = $this->actingAs($employee1)->get(route('dashboard'));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->has('purchaseRequisitions', 1)
            ->where('purchaseRequisitions.0.pr_number', 'PR-2026-00010')
        );

        // Admin dashboard request (sees all PRs)
        $adminResponse = $this->actingAs($admin)->get(route('dashboard'));
        $adminResponse->assertOk();
        $adminResponse->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->has('purchaseRequisitions', 2)
        );
    }
}
