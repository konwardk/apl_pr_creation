<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class RoleAndDepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Roles
        $superadminRole = Role::firstOrCreate(
            ['name' => 'superadmin'],
            [
                'display_name' => 'Super Administrator',
                'description' => 'Complete authority across all modules including User Management, system configuration, and audits.',
            ]
        );

        $adminRole = Role::firstOrCreate(
            ['name' => 'admin'],
            [
                'display_name' => 'Administrator',
                'description' => 'Procurement management, PR processing, SAP S/4HANA Cloud synchronization, and system monitoring.',
            ]
        );

        $employeeRole = Role::firstOrCreate(
            ['name' => 'employee'],
            [
                'display_name' => 'Employee / Requester',
                'description' => 'Authorized plant employee with access to create and check purchase requisitions.',
            ]
        );

        // 2. Pre-seeded Users with Distinct Roles

        $itDeptId = Department::where('code', 'IT')->value('id');
        $procDeptId = Department::where('code', 'PROC')->value('id');
        $chemDeptId = Department::where('code', 'CHEM')->value('id');

        // Superadmin: test@example.com (current demo user) & superadmin@example.com
        User::updateOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Dipankar Paul (Superadmin)',
                'password' => Hash::make('password'),
                'role_id' => $superadminRole->id,
                'department_id' => $itDeptId,
                'employee_id' => 'APL-DIR-001',
                'designation' => 'Chief Technology Officer / Superadmin',
                'phone' => '+91 98640 12345',
                'plant' => '1200 - Dibrugarh Manufacturing Plant',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );

        User::updateOrCreate(
            ['email' => 'superadmin@example.com'],
            [
                'name' => 'APL Super Administrator',
                'password' => Hash::make('password'),
                'role_id' => $superadminRole->id,
                'department_id' => $itDeptId,
                'employee_id' => 'APL-SA-001',
                'designation' => 'Head of Corporate Systems & Superadmin',
                'phone' => '+91 98640 99999',
                'plant' => '1200 - Dibrugarh Manufacturing Plant',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );

        // Admin: admin@example.com
        User::updateOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Rajesh Sharma (Admin)',
                'password' => Hash::make('password'),
                'role_id' => $adminRole->id,
                'department_id' => $procDeptId,
                'employee_id' => 'APL-ADM-101',
                'designation' => 'Senior Procurement Manager & SAP Dispatcher',
                'phone' => '+91 94350 23456',
                'plant' => '1200 - Dibrugarh Manufacturing Plant',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );

        // Employee: employee@example.com
        User::updateOrCreate(
            ['email' => 'employee@example.com'],
            [
                'name' => 'Ananya Baruah (Employee)',
                'password' => Hash::make('password'),
                'role_id' => $employeeRole->id,
                'department_id' => $chemDeptId,
                'employee_id' => 'APL-EMP-504',
                'designation' => 'Process Engineer - Methanol Plant II',
                'phone' => '+91 94351 34567',
                'plant' => '1200 - Dibrugarh Manufacturing Plant',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );
    }
}
