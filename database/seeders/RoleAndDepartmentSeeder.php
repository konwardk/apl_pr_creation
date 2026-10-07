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

        // 2. Departments
        $deptProc = Department::firstOrCreate(
            ['code' => 'PROC'],
            [
                'name' => 'Procurement & Materials Management',
                'description' => 'Sourcing, purchase requisitions, supplier management, and SAP PO coordination.',
                'head_of_department' => 'B. K. Gogoi',
                'is_active' => true,
            ]
        );

        $deptChem = Department::firstOrCreate(
            ['code' => 'CHEM'],
            [
                'name' => 'Chemical Processing & Synthesis',
                'description' => 'Operation and catalytic synthesis for Methanol and 500 TPD Formalin plants.',
                'head_of_department' => 'Dr. P. C. Hazarika',
                'is_active' => true,
            ]
        );

        $deptMech = Department::firstOrCreate(
            ['code' => 'MECH'],
            [
                'name' => 'Mechanical & Plant Maintenance',
                'description' => 'Rotating equipment, reactors, boilers, pipelines, and preventive overhauls.',
                'head_of_department' => 'N. Sonowal',
                'is_active' => true,
            ]
        );

        $deptElec = Department::firstOrCreate(
            ['code' => 'ELEC'],
            [
                'name' => 'Electrical & Instrumentation',
                'description' => 'DCS control systems, high voltage switchgear, and safety loop calibration.',
                'head_of_department' => 'S. Dutta',
                'is_active' => true,
            ]
        );

        $deptProd = Department::firstOrCreate(
            ['code' => 'PROD'],
            [
                'name' => 'Production Operations',
                'description' => 'Daily industrial plant operations and feedstock utility management.',
                'head_of_department' => 'K. Bordoloi',
                'is_active' => true,
            ]
        );

        $deptQc = Department::firstOrCreate(
            ['code' => 'QC'],
            [
                'name' => 'Quality Control & Analytical Lab',
                'description' => 'Chemical purity testing, chromatographic analysis, and ASTM quality conformance.',
                'head_of_department' => 'M. Saikia',
                'is_active' => true,
            ]
        );

        $deptFin = Department::firstOrCreate(
            ['code' => 'FIN'],
            [
                'name' => 'Finance & Accounts',
                'description' => 'Cost center accounting, GL budgets, and procurement financial audit.',
                'head_of_department' => 'R. Sarmah',
                'is_active' => true,
            ]
        );

        $deptIt = Department::firstOrCreate(
            ['code' => 'IT'],
            [
                'name' => 'Information Technology & SAP Systems',
                'description' => 'SAP Public Cloud S/4HANA architecture, OData services, and cyber infrastructure.',
                'head_of_department' => 'Dipankar Paul',
                'is_active' => true,
            ]
        );

        $deptHr = Department::firstOrCreate(
            ['code' => 'HR'],
            [
                'name' => 'Human Resources & General Admin',
                'description' => 'Personnel records, plant site safety policies, and organizational management.',
                'head_of_department' => 'J. Kalita',
                'is_active' => true,
            ]
        );

        // 3. Pre-seeded Users with Distinct Roles

        // Superadmin: test@example.com (current demo user) & superadmin@example.com
        User::updateOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Dipankar Paul (Superadmin)',
                'password' => Hash::make('password'),
                'role_id' => $superadminRole->id,
                'department_id' => $deptIt->id,
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
                'department_id' => $deptIt->id,
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
                'department_id' => $deptProc->id,
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
                'department_id' => $deptChem->id,
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
