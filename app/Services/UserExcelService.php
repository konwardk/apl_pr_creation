<?php

namespace App\Services;

use App\Models\Department;
use App\Models\PurchasingGroup;
use App\Models\PurchasingOrganization;
use App\Models\Role;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UserExcelService
{
    /**
     * Expected template columns definition
     */
    public const COLUMNS = [
        'name' => [
            'header' => 'Full Name *',
            'required' => true,
            'description' => 'User full name (e.g. Pranab Barua). Required.',
            'sample' => 'Pranab Barua',
        ],
        'email' => [
            'header' => 'Email Address *',
            'required' => true,
            'description' => 'Corporate email address. Must be unique. Required.',
            'sample' => 'p.barua@assampetrochemicals.co.in',
        ],
        'password' => [
            'header' => 'Initial Password *',
            'required' => true,
            'description' => 'Minimum 6 characters for initial login. Required.',
            'sample' => 'Password@123',
        ],
        'role' => [
            'header' => 'System Role *',
            'required' => true,
            'description' => 'System role: Employee, Admin, or Superadmin. Required (defaults to Employee if blank).',
            'sample' => 'Employee',
        ],
        'department' => [
            'header' => 'Department Code / Name',
            'required' => false,
            'description' => 'Assigned department code (e.g. IT, CHEM, PROC) or department name. See Reference Guide sheet.',
            'sample' => 'CHEM',
        ],
        'employee_id' => [
            'header' => 'Employee ID',
            'required' => false,
            'description' => 'Unique employee identifier (e.g. APL-EMP-1025). Leave blank to auto-generate.',
            'sample' => 'APL-EMP-1025',
        ],
        'designation' => [
            'header' => 'Job Designation',
            'required' => false,
            'description' => 'Job designation or post (e.g. Lead Process Engineer).',
            'sample' => 'Plant Process Lead',
        ],
        'phone' => [
            'header' => 'Contact Phone',
            'required' => false,
            'description' => 'Contact telephone or mobile number (e.g. +91 94350 12345).',
            'sample' => '+91 94350 11223',
        ],
        'plant' => [
            'header' => 'Plant Facility',
            'required' => false,
            'description' => 'Plant location code or name (e.g. 1200 or 1200 - Dibrugarh Manufacturing Plant). Defaults to Dibrugarh Plant.',
            'sample' => '1200 - Dibrugarh Manufacturing Plant',
        ],
        'purchasing_group' => [
            'header' => 'Purchasing Group (EKGRP)',
            'required' => false,
            'description' => 'SAP Purchasing Group 3-character code (e.g. 001, 002). Optional.',
            'sample' => '001',
        ],
        'is_active' => [
            'header' => 'Account Status',
            'required' => false,
            'description' => 'Account active status: Active / Inactive or Yes / No. Default is Active.',
            'sample' => 'Active',
        ],
    ];

    /**
     * Generate the PhpSpreadsheet instance with sample data and reference sheets.
     */
    public function generateTemplateSpreadsheet(): Spreadsheet
    {
        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()
            ->setCreator('Assam Petro-Chemicals Ltd.')
            ->setLastModifiedBy('APL Superadmin Portal')
            ->setTitle('APL User Import Template')
            ->setSubject('Bulk User and Credential Onboarding')
            ->setDescription('Excel template for batch importing user accounts, credentials, and SAP role assignments.');

        // ==========================================
        // SHEET 1: USER IMPORT TEMPLATE
        // ==========================================
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('User Import Template');

        $headers = array_values(array_map(fn ($col) => $col['header'], self::COLUMNS));
        $keys = array_keys(self::COLUMNS);

        // Header Styling
        $sheet->getRowDimension(1)->setRowHeight(32);

        $colIdx = 1;
        foreach ($headers as $headerText) {
            $colLetter = Coordinate::stringFromColumnIndex($colIdx);
            $cell = "{$colLetter}1";

            $sheet->setCellValue($cell, $headerText);

            // Add cell comment with instructions
            $colKey = $keys[$colIdx - 1];
            $sheet->getComment($cell)->getText()->createTextRun(self::COLUMNS[$colKey]['description']);
            $sheet->getComment($cell)->setWidth('250pt');
            $sheet->getComment($cell)->setHeight('60pt');

            $colIdx++;
        }

        $lastColLetter = Coordinate::stringFromColumnIndex(count($headers));

        // Apply corporate theme to header row
        $headerStyle = [
            'font' => [
                'bold' => true,
                'color' => ['argb' => 'FFFFFFFF'],
                'size' => 11,
                'name' => 'Calibri',
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['argb' => 'FF0070F2'], // SAP / APL Blue
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_LEFT,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => false,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['argb' => 'FF004EAA'],
                ],
            ],
        ];
        $sheet->getStyle("A1:{$lastColLetter}1")->applyFromArray($headerStyle);

        // Pre-populate sample rows
        $sampleRows = [
            [
                'name' => 'Pranab Barua',
                'email' => 'p.barua@assampetrochemicals.co.in',
                'password' => 'Password@123',
                'role' => 'Employee',
                'department' => 'CHEM',
                'employee_id' => 'APL-EMP-1025',
                'designation' => 'Plant Process Lead',
                'phone' => '+91 94350 11223',
                'plant' => '1200 - Dibrugarh Manufacturing Plant',
                'purchasing_group' => '001',
                'is_active' => 'Active',
            ],
            [
                'name' => 'Sunita Gogoi',
                'email' => 's.gogoi@assampetrochemicals.co.in',
                'password' => 'Password@123',
                'role' => 'Admin',
                'department' => 'PROC',
                'employee_id' => 'APL-ADM-1030',
                'designation' => 'Senior Procurement Specialist',
                'phone' => '+91 94350 44556',
                'plant' => '1200 - Dibrugarh Manufacturing Plant',
                'purchasing_group' => '002',
                'is_active' => 'Active',
            ],
            [
                'name' => 'Manoj Dutta',
                'email' => 'm.dutta@assampetrochemicals.co.in',
                'password' => 'Password@123',
                'role' => 'Employee',
                'department' => 'IT',
                'employee_id' => '', // Blank to test auto-generation
                'designation' => 'Systems Analyst',
                'phone' => '+91 94350 77889',
                'plant' => '1100 - Corporate Office',
                'purchasing_group' => '',
                'is_active' => 'Active',
            ],
        ];

        $rowNum = 2;
        foreach ($sampleRows as $sample) {
            $colIdx = 1;
            foreach ($keys as $key) {
                $colLetter = Coordinate::stringFromColumnIndex($colIdx);
                $cellCoordinate = "{$colLetter}{$rowNum}";
                $val = $sample[$key] ?? '';

                // Explicitly set as string to preserve phone formatting and leading zeros in purchasing groups
                $sheet->setCellValueExplicit($cellCoordinate, $val, DataType::TYPE_STRING);
                $colIdx++;
            }
            $sheet->getRowDimension($rowNum)->setRowHeight(22);
            $rowNum++;
        }

        // Sample data styling
        $dataRowsCount = count($sampleRows);
        $lastDataRow = 1 + $dataRowsCount;
        $dataStyle = [
            'font' => [
                'size' => 10,
                'name' => 'Calibri',
            ],
            'alignment' => [
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['argb' => 'FFE2E8F0'],
                ],
            ],
        ];
        $sheet->getStyle("A2:{$lastColLetter}{$lastDataRow}")->applyFromArray($dataStyle);

        // Auto-size columns for Sheet 1
        for ($i = 1; $i <= count($headers); $i++) {
            $colLetter = Coordinate::stringFromColumnIndex($i);
            $sheet->getColumnDimension($colLetter)->setAutoSize(true);
        }

        // Freeze top header row
        $sheet->freezePane('A2');

        // ==========================================
        // SHEET 2: REFERENCE GUIDE & MASTER DATA
        // ==========================================
        $refSheet = $spreadsheet->createSheet();
        $refSheet->setTitle('Reference Guide');

        // Fetch Master Data
        $roles = Role::all();
        $departments = Department::where('is_active', true)->orderBy('name')->get();
        $purchasingGroups = PurchasingGroup::active()->orderBy('code')->get();

        $orgPlants = PurchasingOrganization::whereNotNull('plants')
            ->get()
            ->pluck('plants')
            ->flatten()
            ->filter()
            ->map(fn ($p) => trim((string) $p))
            ->unique()
            ->sort()
            ->values()
            ->toArray();

        if (empty($orgPlants)) {
            $orgPlants = ['1100', '1200', '1300', '1400'];
        }

        $plantDescriptions = [
            '1100' => '1100 - Corporate Office',
            '1200' => '1200 - Dibrugarh Manufacturing Plant',
            '1300' => '1300 - Boitamari Plant Facility',
            '1400' => '1400 - Rani Nagar Plant Facility',
        ];

        // Reference Sheet Title Banner
        $refSheet->setCellValue('A1', 'ASSAM PETRO-CHEMICALS LTD. - BULK USER IMPORT REFERENCE GUIDE');
        $refSheet->mergeCells('A1:F1');
        $refSheet->getRowDimension(1)->setRowHeight(30);
        $refSheet->getStyle('A1:F1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF'], 'size' => 12],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF1C2D42']],
            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER, 'horizontal' => Alignment::HORIZONTAL_LEFT],
        ]);

        $currRow = 3;

        // SECTION 1: System Roles
        $refSheet->setCellValue("A{$currRow}", '1. ALLOWED SYSTEM ROLES');
        $refSheet->getStyle("A{$currRow}")->getFont()->setBold(true)->setSize(11)->getColor()->setARGB('FF0070F2');
        $currRow++;

        $refSheet->setCellValue("A{$currRow}", 'Role Key');
        $refSheet->setCellValue("B{$currRow}", 'Display Name (Acceptable in Excel)');
        $refSheet->setCellValue("C{$currRow}", 'Description & Access Scope');
        $refSheet->getStyle("A{$currRow}:C{$currRow}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF'], 'size' => 10],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF334155']],
        ]);
        $currRow++;

        foreach ($roles as $r) {
            $refSheet->setCellValue("A{$currRow}", $r->name);
            $refSheet->setCellValue("B{$currRow}", $r->display_name);
            $refSheet->setCellValue("C{$currRow}", $r->description ?: 'System access role');
            $currRow++;
        }
        $currRow += 2;

        // SECTION 2: Active Departments
        $refSheet->setCellValue("A{$currRow}", '2. ACTIVE DEPARTMENTS (Enter Code or Exact Name)');
        $refSheet->getStyle("A{$currRow}")->getFont()->setBold(true)->setSize(11)->getColor()->setARGB('FF0070F2');
        $currRow++;

        $refSheet->setCellValue("A{$currRow}", 'Department Code');
        $refSheet->setCellValue("B{$currRow}", 'Department Name');
        $refSheet->setCellValue("C{$currRow}", 'Head of Department');
        $refSheet->getStyle("A{$currRow}:C{$currRow}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF'], 'size' => 10],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF334155']],
        ]);
        $currRow++;

        foreach ($departments as $dept) {
            $refSheet->setCellValue("A{$currRow}", $dept->code);
            $refSheet->setCellValue("B{$currRow}", $dept->name);
            $refSheet->setCellValue("C{$currRow}", $dept->head_of_department ?: 'N/A');
            $currRow++;
        }
        $currRow += 2;

        // SECTION 3: Plant Facilities
        $refSheet->setCellValue("A{$currRow}", '3. ASSAM PETRO-CHEMICALS PLANT FACILITIES');
        $refSheet->getStyle("A{$currRow}")->getFont()->setBold(true)->setSize(11)->getColor()->setARGB('FF0070F2');
        $currRow++;

        $refSheet->setCellValue("A{$currRow}", 'Plant Code');
        $refSheet->setCellValue("B{$currRow}", 'Plant Full Facility Name');
        $refSheet->getStyle("A{$currRow}:B{$currRow}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF'], 'size' => 10],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF334155']],
        ]);
        $currRow++;

        foreach ($orgPlants as $pCode) {
            $pName = $plantDescriptions[$pCode] ?? "{$pCode} - Plant Facility {$pCode}";
            $refSheet->setCellValue("A{$currRow}", $pCode);
            $refSheet->setCellValue("B{$currRow}", $pName);
            $currRow++;
        }
        $currRow += 2;

        // SECTION 4: Purchasing Groups (EKGRP)
        $refSheet->setCellValue("A{$currRow}", '4. SAP PURCHASING GROUPS (EKGRP)');
        $refSheet->getStyle("A{$currRow}")->getFont()->setBold(true)->setSize(11)->getColor()->setARGB('FF0070F2');
        $currRow++;

        $refSheet->setCellValue("A{$currRow}", 'EKGRP Code');
        $refSheet->setCellValue("B{$currRow}", 'Purchasing Group Name / Description');
        $refSheet->getStyle("A{$currRow}:B{$currRow}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF'], 'size' => 10],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF334155']],
        ]);
        $currRow++;

        foreach ($purchasingGroups as $pg) {
            $refSheet->setCellValue("A{$currRow}", $pg->code);
            $refSheet->setCellValue("B{$currRow}", $pg->description ?: $pg->name);
            $currRow++;
        }
        $currRow += 2;

        // SECTION 5: Important Guidelines
        $refSheet->setCellValue("A{$currRow}", '5. IMPORTANT IMPORT GUIDELINES & SPECIFICATIONS');
        $refSheet->getStyle("A{$currRow}")->getFont()->setBold(true)->setSize(11)->getColor()->setARGB('FF0070F2');
        $currRow++;

        $guidelines = [
            'Required Columns' => 'Full Name, Email Address, Initial Password, and System Role are mandatory for each row.',
            'Unique Identifiers' => 'Email addresses and Employee IDs must be unique across the entire database and within the Excel file.',
            'Password Policy' => 'Initial passwords must be at least 6 characters in length. Passwords are securely hashed with Bcrypt.',
            'Auto Verification' => 'Imported accounts have email verification automatically confirmed so users can immediately log in.',
            'Auto Employee ID' => 'If Employee ID is left empty, the system automatically assigns APL-EMP-XXXX, APL-ADM-XXXX, or APL-SA-XXXX.',
            'Plant Default' => 'If Plant is left empty, it defaults automatically to 1200 - Dibrugarh Manufacturing Plant.',
            'Status Default' => 'Account Status defaults to Active unless specified as Inactive or No.',
        ];

        $refSheet->setCellValue("A{$currRow}", 'Rule Item');
        $refSheet->setCellValue("B{$currRow}", 'Specification & Behavior');
        $refSheet->getStyle("A{$currRow}:B{$currRow}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF'], 'size' => 10],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF334155']],
        ]);
        $currRow++;

        foreach ($guidelines as $title => $desc) {
            $refSheet->setCellValue("A{$currRow}", $title);
            $refSheet->setCellValue("B{$currRow}", $desc);
            $currRow++;
        }

        // Auto-size columns for Sheet 2
        for ($i = 1; $i <= 4; $i++) {
            $colLetter = Coordinate::stringFromColumnIndex($i);
            $refSheet->getColumnDimension($colLetter)->setAutoSize(true);
        }

        // Return back to Sheet 1 as the default active sheet
        $spreadsheet->setActiveSheetIndex(0);

        return $spreadsheet;
    }

    /**
     * Download the pre-built Excel template as a StreamedResponse.
     */
    public function downloadTemplateResponse(): StreamedResponse
    {
        $spreadsheet = $this->generateTemplateSpreadsheet();
        $fileName = 'APL_User_Import_Template.xlsx';

        $response = new StreamedResponse(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        });

        $response->headers->set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $response->headers->set('Content-Disposition', 'attachment; filename="'.$fileName.'"');
        $response->headers->set('Cache-Control', 'max-age=0');
        $response->headers->set('Pragma', 'public');

        return $response;
    }

    /**
     * Parse and import users from an uploaded Excel or CSV file.
     *
     * @param  string  $filePath  Absolute path to uploaded file
     * @return array{
     *     total_rows: int,
     *     imported_count: int,
     *     failed_count: int,
     *     errors: array<int, array{row: int, email?: string, message: string}>,
     *     users: array<int, string>
     * }
     */
    public function import(string $filePath): array
    {
        $spreadsheet = IOFactory::load($filePath);
        $sheet = $spreadsheet->getActiveSheet();
        $rawRows = $sheet->toArray(null, true, true, true);

        if (empty($rawRows)) {
            throw new Exception('The uploaded spreadsheet is empty.');
        }

        // Row 1 contains column headers
        $headerRow = array_shift($rawRows);
        $columnMapping = $this->mapHeaders($headerRow);

        // Verify required columns exist in headers
        if (! isset($columnMapping['name']) || ! isset($columnMapping['email']) || ! isset($columnMapping['password'])) {
            throw new Exception('Invalid Excel template. Missing required columns: "Full Name", "Email Address", or "Password". Please download the official APL template.');
        }

        // Preload Reference Dictionaries
        $rolesMap = $this->getRolesDictionary();
        $departmentsMap = $this->getDepartmentsDictionary();
        $purchasingGroupsMap = $this->getPurchasingGroupsDictionary();
        $plantsMap = $this->getPlantsDictionary();

        // Preload Existing Database Keys to check uniqueness fast
        $existingEmails = User::pluck('email')->map(fn ($e) => strtolower(trim($e)))->flip()->toArray();
        $existingEmpIds = User::whereNotNull('employee_id')->pluck('employee_id')->map(fn ($id) => strtoupper(trim($id)))->flip()->toArray();

        // Batch tracking to avoid duplicate rows within the uploaded file itself
        $batchEmails = [];
        $batchEmpIds = [];

        $validRowsToInsert = [];
        $rowErrors = [];
        $importedNames = [];

        $currentRowNum = 1; // Counter starts after header (Header is row 1)

        foreach ($rawRows as $row) {
            $currentRowNum++;

            // Extract values according to mapped headers
            $name = trim((string) ($row[$columnMapping['name']] ?? ''));
            $email = strtolower(trim((string) ($row[$columnMapping['email']] ?? '')));
            $password = trim((string) ($row[$columnMapping['password']] ?? ''));
            $roleRaw = trim((string) ($row[$columnMapping['role'] ?? ''] ?? ''));
            $deptRaw = trim((string) ($row[$columnMapping['department'] ?? ''] ?? ''));
            $empIdRaw = strtoupper(trim((string) ($row[$columnMapping['employee_id'] ?? ''] ?? '')));
            $designation = trim((string) ($row[$columnMapping['designation'] ?? ''] ?? ''));
            $phone = trim((string) ($row[$columnMapping['phone'] ?? ''] ?? ''));
            $plantRaw = trim((string) ($row[$columnMapping['plant'] ?? ''] ?? ''));
            $pgRaw = trim((string) ($row[$columnMapping['purchasing_group'] ?? ''] ?? ''));
            $statusRaw = strtolower(trim((string) ($row[$columnMapping['is_active'] ?? ''] ?? '')));

            // Check if entire row is empty
            if ($name === '' && $email === '' && $password === '' && $roleRaw === '' && $empIdRaw === '') {
                continue; // Skip blank line
            }

            // --- Field Validations ---
            $errors = [];

            // 1. Name validation
            if ($name === '') {
                $errors[] = 'Full Name is required.';
            } elseif (mb_strlen($name) > 255) {
                $errors[] = 'Full Name exceeds 255 characters.';
            }

            // 2. Email validation
            if ($email === '') {
                $errors[] = 'Email Address is required.';
            } elseif (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $errors[] = "Email Address '{$email}' is not a valid email format.";
            } elseif (isset($existingEmails[$email])) {
                $errors[] = "Email Address '{$email}' already exists in the system.";
            } elseif (isset($batchEmails[$email])) {
                $errors[] = "Duplicate email '{$email}' found multiple times in the uploaded file.";
            }

            // 3. Password validation
            if ($password === '') {
                $errors[] = 'Initial Password is required.';
            } elseif (strlen($password) < 6) {
                $errors[] = 'Initial Password must be at least 6 characters.';
            }

            // 4. Role resolution
            $resolvedRoleId = null;
            $resolvedRoleName = 'employee';
            if ($roleRaw === '') {
                // Default to employee
                $resolvedRoleId = $rolesMap['employee']->id ?? null;
            } else {
                $roleLookupKey = strtolower($roleRaw);
                if (isset($rolesMap[$roleLookupKey])) {
                    $resolvedRoleId = $rolesMap[$roleLookupKey]->id;
                    $resolvedRoleName = $rolesMap[$roleLookupKey]->name;
                } else {
                    $errors[] = "Role '{$roleRaw}' is invalid. Allowed: Superadmin, Admin, Employee.";
                }
            }

            // 5. Department resolution (optional)
            $resolvedDeptId = null;
            if ($deptRaw !== '') {
                $deptLookupKey = strtolower($deptRaw);
                if (isset($departmentsMap[$deptLookupKey])) {
                    $resolvedDeptId = $departmentsMap[$deptLookupKey]->id;
                }
            }

            // 6. Employee ID resolution
            $resolvedEmpId = $empIdRaw;
            if ($resolvedEmpId !== '') {
                if (isset($existingEmpIds[$resolvedEmpId])) {
                    $errors[] = "Employee ID '{$resolvedEmpId}' already exists in the system.";
                } elseif (isset($batchEmpIds[$resolvedEmpId])) {
                    $errors[] = "Duplicate Employee ID '{$resolvedEmpId}' found in the uploaded file.";
                }
            } else {
                // Generate auto Employee ID based on role
                $prefix = match ($resolvedRoleName) {
                    'superadmin' => 'APL-SA-',
                    'admin' => 'APL-ADM-',
                    default => 'APL-EMP-',
                };

                do {
                    $candidateId = $prefix.rand(1000, 9999);
                } while (isset($existingEmpIds[$candidateId]) || isset($batchEmpIds[$candidateId]));

                $resolvedEmpId = $candidateId;
            }

            // 7. Plant resolution
            $resolvedPlant = '1200 - Dibrugarh Manufacturing Plant';
            if ($plantRaw !== '') {
                $plantLookupKey = strtolower($plantRaw);
                if (isset($plantsMap[$plantLookupKey])) {
                    $resolvedPlant = $plantsMap[$plantLookupKey];
                } else {
                    $resolvedPlant = $plantRaw;
                }
            }

            // 8. Purchasing Group resolution
            $resolvedPg = null;
            if ($pgRaw !== '') {
                $pgLookupKey = strtolower($pgRaw);
                if (isset($purchasingGroupsMap[$pgLookupKey])) {
                    $resolvedPg = $purchasingGroupsMap[$pgLookupKey];
                } else {
                    $resolvedPg = $pgRaw;
                }
            }

            // 9. Status resolution (defaults to active true)
            $isActive = true;
            if ($statusRaw !== '') {
                if (in_array($statusRaw, ['inactive', 'no', 'false', '0', 'deactivated'], true)) {
                    $isActive = false;
                }
            }

            // If there are errors for this row, record and skip
            if (! empty($errors)) {
                $rowErrors[] = [
                    'row' => $currentRowNum,
                    'email' => $email ?: 'N/A',
                    'message' => implode(' ', $errors),
                ];

                continue;
            }

            // Mark email & employee ID in batch map to prevent duplicates later in file
            $batchEmails[$email] = true;
            $batchEmpIds[$resolvedEmpId] = true;

            $validRowsToInsert[] = [
                'name' => $name,
                'email' => $email,
                'password' => Hash::make($password),
                'role_id' => $resolvedRoleId,
                'department_id' => $resolvedDeptId,
                'employee_id' => $resolvedEmpId,
                'designation' => $designation ?: null,
                'phone' => $phone ?: null,
                'plant' => $resolvedPlant,
                'purchasing_group' => $resolvedPg,
                'is_active' => $isActive,
                'email_verified_at' => now(), // Auto-verified for immediate login
                'created_at' => now(),
                'updated_at' => now(),
            ];

            $importedNames[] = $name;
        }

        // Insert valid users inside a transaction
        if (! empty($validRowsToInsert)) {
            DB::transaction(function () use ($validRowsToInsert) {
                foreach ($validRowsToInsert as $userData) {
                    User::create($userData);
                }
            });
        }

        return [
            'total_rows' => count($validRowsToInsert) + count($rowErrors),
            'imported_count' => count($validRowsToInsert),
            'failed_count' => count($rowErrors),
            'errors' => $rowErrors,
            'users' => $importedNames,
        ];
    }

    /**
     * Map arbitrary header labels to internal model keys.
     *
     * @param  array<string, mixed>  $headerRow
     * @return array<string, string> Key => Column letter (e.g. 'name' => 'A')
     */
    protected function mapHeaders(array $headerRow): array
    {
        $mapping = [];

        foreach ($headerRow as $colLetter => $headerVal) {
            $clean = strtolower((string) $headerVal);
            $clean = str_replace(['*', '(', ')', '-', '_', '/', '\\'], ' ', $clean);
            $clean = trim(preg_replace('/\s+/', ' ', $clean));

            if (in_array($clean, ['full name', 'name', 'user name', 'employee name'], true)) {
                $mapping['name'] = $colLetter;
            } elseif (in_array($clean, ['email address', 'email', 'email id', 'mail'], true)) {
                $mapping['email'] = $colLetter;
            } elseif (in_array($clean, ['initial password', 'password', 'credential', 'pwd'], true)) {
                $mapping['password'] = $colLetter;
            } elseif (in_array($clean, ['system role', 'role', 'user role', 'access role'], true)) {
                $mapping['role'] = $colLetter;
            } elseif (in_array($clean, ['department code name', 'department code', 'department name', 'department', 'dept'], true)) {
                $mapping['department'] = $colLetter;
            } elseif (in_array($clean, ['employee id', 'empid', 'emp id', 'staff id'], true)) {
                $mapping['employee_id'] = $colLetter;
            } elseif (in_array($clean, ['job designation', 'designation', 'title', 'post', 'position'], true)) {
                $mapping['designation'] = $colLetter;
            } elseif (in_array($clean, ['contact phone', 'phone number', 'phone', 'mobile', 'contact'], true)) {
                $mapping['phone'] = $colLetter;
            } elseif (in_array($clean, ['plant facility', 'plant location', 'plant', 'facility'], true)) {
                $mapping['plant'] = $colLetter;
            } elseif (in_array($clean, ['purchasing group ekgrp', 'purchasing group', 'purchase group', 'ekgrp'], true)) {
                $mapping['purchasing_group'] = $colLetter;
            } elseif (in_array($clean, ['account status', 'status', 'is active', 'active'], true)) {
                $mapping['is_active'] = $colLetter;
            }
        }

        return $mapping;
    }

    /**
     * Dictionary of roles mapped by multiple lookup variants.
     */
    protected function getRolesDictionary(): array
    {
        $roles = Role::all();
        $dict = [];

        foreach ($roles as $r) {
            $dict[strtolower($r->name)] = $r;
            $dict[strtolower($r->display_name)] = $r;
            $dict[(string) $r->id] = $r;

            // Extra common aliases
            if ($r->name === 'superadmin') {
                $dict['super admin'] = $r;
                $dict['super-admin'] = $r;
            } elseif ($r->name === 'employee') {
                $dict['requester'] = $r;
                $dict['employee / requester'] = $r;
                $dict['staff'] = $r;
            } elseif ($r->name === 'admin') {
                $dict['administrator'] = $r;
            }
        }

        return $dict;
    }

    /**
     * Dictionary of departments mapped by code, name, and ID.
     */
    protected function getDepartmentsDictionary(): array
    {
        $departments = Department::all();
        $dict = [];

        foreach ($departments as $d) {
            $dict[strtolower(trim($d->code))] = $d;
            $dict[strtolower(trim($d->name))] = $d;
            $dict[(string) $d->id] = $d;
        }

        return $dict;
    }

    /**
     * Dictionary of purchasing groups mapped by code and description.
     */
    protected function getPurchasingGroupsDictionary(): array
    {
        $pgs = PurchasingGroup::all();
        $dict = [];

        foreach ($pgs as $pg) {
            $code = trim($pg->code);
            $dict[strtolower($code)] = $code;
            if ($pg->name) {
                $dict[strtolower(trim($pg->name))] = $code;
            }
            if ($pg->description) {
                $dict[strtolower(trim($pg->description))] = $code;
            }
        }

        return $dict;
    }

    /**
     * Dictionary of plants mapped by code and variations.
     */
    protected function getPlantsDictionary(): array
    {
        $plantDescriptions = [
            '1100' => '1100 - Corporate Office',
            '1200' => '1200 - Dibrugarh Manufacturing Plant',
            '1300' => '1300 - Boitamari Plant Facility',
            '1400' => '1400 - Rani Nagar Plant Facility',
        ];

        $dict = [];
        foreach ($plantDescriptions as $code => $name) {
            $dict[$code] = $name;
            $dict[strtolower($name)] = $name;
            $dict[strtolower($code)] = $name;
        }

        $dict['dibrugarh'] = $plantDescriptions['1200'];
        $dict['corporate'] = $plantDescriptions['1100'];
        $dict['boitamari'] = $plantDescriptions['1300'];
        $dict['rani nagar'] = $plantDescriptions['1400'];

        return $dict;
    }
}
