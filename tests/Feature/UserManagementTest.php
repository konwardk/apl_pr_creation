<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\PurchaseRequisition;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleAndDepartmentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
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
        $admin = User::where('email', 'admin@example.com')->first();

        $pr = PurchaseRequisition::create([
            'pr_number' => 'PR-2026-00001',
            'user_id' => $admin->id,
            'description' => 'Admin Test PR',
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

    public function test_superadmin_can_create_user_who_can_directly_login_without_email_verification(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();
        $employeeRole = Role::where('name', 'employee')->first();
        $department = Department::firstOrCreate(
            ['code' => 'D-OPER'],
            ['name' => 'Operations', 'description' => 'Operations Team', 'is_active' => true]
        );

        // 1. Superadmin creates user
        $response = $this->actingAs($superadmin)->post(route('users.store'), [
            'name' => 'Direct Access User',
            'email' => 'direct.access@example.com',
            'password' => 'secret123',
            'role_id' => $employeeRole->id,
            'department_id' => $department->id,
            'employee_id' => 'APL-EMP-7777',
            'designation' => 'Plant Operator',
            'is_active' => true,
        ]);

        $response->assertSessionHas('success');

        $newUser = User::where('email', 'direct.access@example.com')->first();
        $this->assertNotNull($newUser);

        // 2. User logs in directly
        auth()->logout();
        $loginResponse = $this->post(route('login.store'), [
            'email' => 'direct.access@example.com',
            'password' => 'secret123',
        ]);

        $loginResponse->assertRedirect(route('dashboard', absolute: false));
        $this->assertAuthenticatedAs($newUser);

        // 3. User accesses protected dashboard directly without email verification prompt
        $dashboardResponse = $this->actingAs($newUser)->get(route('dashboard'));
        $dashboardResponse->assertOk();
    }

    public function test_superadmin_can_download_user_import_excel_template(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();

        $response = $this->actingAs($superadmin)->get(route('users.template-excel'));

        $response->assertOk();
        $this->assertStringContainsString('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', (string)$response->headers->get('content-type'));
        $this->assertStringContainsString('attachment; filename="APL_User_Import_Template.xlsx"', (string)$response->headers->get('content-disposition'));
    }

    public function test_non_superadmin_cannot_download_template_or_import_excel(): void
    {
        $employee = User::where('email', 'employee@example.com')->first();
        $admin = User::where('email', 'admin@example.com')->first();

        // Guest
        $this->get(route('users.template-excel'))->assertRedirect(route('login'));
        $this->post(route('users.import-excel'))->assertRedirect(route('login'));

        // Employee
        $this->actingAs($employee)->get(route('users.template-excel'))->assertForbidden();
        $this->actingAs($employee)->post(route('users.import-excel'))->assertForbidden();

        // Admin
        $this->actingAs($admin)->get(route('users.template-excel'))->assertForbidden();
        $this->actingAs($admin)->post(route('users.import-excel'))->assertForbidden();
    }

    public function test_superadmin_can_import_users_and_credentials_from_excel(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();

        // Build a test spreadsheet
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setCellValue('A1', 'Full Name *');
        $sheet->setCellValue('B1', 'Email Address *');
        $sheet->setCellValue('C1', 'Initial Password *');
        $sheet->setCellValue('D1', 'System Role *');
        $sheet->setCellValue('E1', 'Department Code / Name');
        $sheet->setCellValue('F1', 'Employee ID');
        $sheet->setCellValue('G1', 'Job Designation');
        $sheet->setCellValue('H1', 'Contact Phone');
        $sheet->setCellValue('I1', 'Plant Facility');
        $sheet->setCellValue('J1', 'Purchasing Group (EKGRP)');
        $sheet->setCellValue('K1', 'Account Status');

        // Row 2: Complete employee record
        $sheet->setCellValue('A2', 'Rupjyoti Gogoi');
        $sheet->setCellValue('B2', 'rupjyoti.gogoi@assampetrochemicals.co.in');
        $sheet->setCellValue('C2', 'PassWord@456');
        $sheet->setCellValue('D2', 'Employee');
        $sheet->setCellValue('E2', 'CHEM');
        $sheet->setCellValue('F2', 'APL-EMP-9901');
        $sheet->setCellValue('G2', 'Chemical Plant Engineer');
        $sheet->setCellValue('H2', '9864011223');
        $sheet->setCellValue('I2', '1200 - Dibrugarh Manufacturing Plant');
        $sheet->setCellValue('J2', '001');
        $sheet->setCellValue('K2', 'Active');

        // Row 3: Admin record with auto employee ID
        $sheet->setCellValue('A3', 'Binita Saikia');
        $sheet->setCellValue('B3', 'binita.saikia@assampetrochemicals.co.in');
        $sheet->setCellValue('C3', 'AdminSecure@1');
        $sheet->setCellValue('D3', 'Admin');
        $sheet->setCellValue('E3', 'IT');
        $sheet->setCellValue('F3', ''); // Empty for auto-generation
        $sheet->setCellValue('G3', 'IT System Administrator');
        $sheet->setCellValue('H3', '9864022334');
        $sheet->setCellValue('I3', '1100 - Corporate Office');
        $sheet->setCellValue('J3', '');
        $sheet->setCellValue('K3', 'Active');

        $tempPath = tempnam(sys_get_temp_dir(), 'test_import_') . '.xlsx';
        $writer = new Xlsx($spreadsheet);
        $writer->save($tempPath);

        $uploadedFile = new UploadedFile(
            $tempPath,
            'test_users.xlsx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            null,
            true
        );

        $response = $this->actingAs($superadmin)->post(route('users.import-excel'), [
            'excel_file' => $uploadedFile,
        ]);

        $response->assertSessionHas('success');
        $response->assertSessionHas('import_summary');

        // Verify users in database
        $this->assertDatabaseHas('users', [
            'name' => 'Rupjyoti Gogoi',
            'email' => 'rupjyoti.gogoi@assampetrochemicals.co.in',
            'employee_id' => 'APL-EMP-9901',
            'designation' => 'Chemical Plant Engineer',
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('users', [
            'name' => 'Binita Saikia',
            'email' => 'binita.saikia@assampetrochemicals.co.in',
            'designation' => 'IT System Administrator',
            'is_active' => true,
        ]);

        $user1 = User::where('email', 'rupjyoti.gogoi@assampetrochemicals.co.in')->first();
        $this->assertNotNull($user1);
        $this->assertTrue(Hash::check('PassWord@456', $user1->password));
        $this->assertNotNull($user1->email_verified_at);

        $user2 = User::where('email', 'binita.saikia@assampetrochemicals.co.in')->first();
        $this->assertNotNull($user2);
        $this->assertStringStartsWith('APL-ADM-', $user2->employee_id);
        $this->assertTrue(Hash::check('AdminSecure@1', $user2->password));

        // Test immediate login with imported credentials
        auth()->logout();
        $loginResponse = $this->post(route('login.store'), [
            'email' => 'rupjyoti.gogoi@assampetrochemicals.co.in',
            'password' => 'PassWord@456',
        ]);
        $loginResponse->assertRedirect(route('dashboard', absolute: false));
        $this->assertAuthenticatedAs($user1);

        @unlink($tempPath);
    }

    public function test_excel_import_reports_row_validation_errors(): void
    {
        $superadmin = User::where('email', 'superadmin@example.com')->first();

        // Build a spreadsheet with validation issues
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setCellValue('A1', 'Full Name *');
        $sheet->setCellValue('B1', 'Email Address *');
        $sheet->setCellValue('C1', 'Initial Password *');
        $sheet->setCellValue('D1', 'System Role *');

        // Row 2: Duplicate email of existing superadmin
        $sheet->setCellValue('A2', 'Duplicate Superadmin');
        $sheet->setCellValue('B2', 'superadmin@example.com');
        $sheet->setCellValue('C2', 'validpass123');
        $sheet->setCellValue('D2', 'Superadmin');

        // Row 3: Short password
        $sheet->setCellValue('A3', 'Short Password User');
        $sheet->setCellValue('B3', 'short.pwd@example.com');
        $sheet->setCellValue('C3', '123');
        $sheet->setCellValue('D3', 'Employee');

        // Row 4: Valid user
        $sheet->setCellValue('A4', 'Valid Imported Employee');
        $sheet->setCellValue('B4', 'valid.emp@example.com');
        $sheet->setCellValue('C4', 'validpass123');
        $sheet->setCellValue('D4', 'Employee');

        $tempPath = tempnam(sys_get_temp_dir(), 'test_err_') . '.xlsx';
        $writer = new Xlsx($spreadsheet);
        $writer->save($tempPath);

        $uploadedFile = new UploadedFile(
            $tempPath,
            'test_errors.xlsx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            null,
            true
        );

        $response = $this->actingAs($superadmin)->post(route('users.import-excel'), [
            'excel_file' => $uploadedFile,
        ]);

        $response->assertSessionHas('success');
        $summary = session('import_summary');
        $this->assertNotNull($summary);
        $this->assertEquals(1, $summary['imported_count']);
        $this->assertEquals(2, $summary['failed_count']);
        $this->assertCount(2, $summary['errors']);

        // Check error messages
        $this->assertEquals(2, $summary['errors'][0]['row']);
        $this->assertStringContainsString('already exists', $summary['errors'][0]['message']);
        $this->assertEquals(3, $summary['errors'][1]['row']);
        $this->assertStringContainsString('at least 6 characters', $summary['errors'][1]['message']);

        // Check database
        $this->assertDatabaseHas('users', ['email' => 'valid.emp@example.com']);
        $this->assertDatabaseMissing('users', ['email' => 'short.pwd@example.com']);

        @unlink($tempPath);
    }
}
