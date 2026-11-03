<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\PurchasingGroup;
use App\Models\PurchasingOrganization;
use App\Models\Role;
use App\Models\User;
use App\Services\UserExcelService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UserManagementController extends Controller
{
    /**
     * Display the User Management panel for Super Administrator.
     */
    public function index(Request $request): Response
    {
        $query = User::with(['role', 'department', 'purchasingGroupDetail'])->latest();

        // Search filter
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('employee_id', 'like', "%{$search}%")
                    ->orWhere('designation', 'like', "%{$search}%")
                    ->orWhere('plant', 'like', "%{$search}%")
                    ->orWhere('purchasing_group', 'like', "%{$search}%");
            });
        }

        // Role filter
        if ($roleId = $request->query('role_id')) {
            $query->where('role_id', $roleId);
        }

        // Department filter
        if ($deptId = $request->query('department_id')) {
            $query->where('department_id', $deptId);
        }

        // Purchasing Group filter
        if ($pg = $request->query('purchasing_group')) {
            $query->where('purchasing_group', $pg);
        }

        $users = $query->get();

        $allUsers = User::with('role')->get();
        $stats = [
            'total_users' => $allUsers->count(),
            'superadmin_count' => $allUsers->where('role.name', 'superadmin')->count(),
            'admin_count' => $allUsers->where('role.name', 'admin')->count(),
            'employee_count' => $allUsers->where('role.name', 'employee')->count(),
            'active_count' => $allUsers->where('is_active', true)->count(),
            'inactive_count' => $allUsers->where('is_active', false)->count(),
        ];

        // Retrieve available plants from PurchasingOrganization model (plants JSON array)
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

        $availablePlants = array_map(function ($code) use ($plantDescriptions) {
            $name = $plantDescriptions[$code] ?? "{$code} - Plant Facility {$code}";

            return [
                'code' => $code,
                'name' => $name,
                'value' => $name,
            ];
        }, $orgPlants);

        // Retrieve active purchasing groups from database
        $purchasingGroups = PurchasingGroup::active()
            ->orderBy('code')
            ->get(['id', 'code', 'name', 'description'])
            ->map(function ($pg) {
                $desc = $pg->description ?: $pg->name;

                return [
                    'id' => $pg->id,
                    'code' => $pg->code,
                    'name' => "{$pg->code} - {$desc}",
                    'description' => $desc,
                ];
            });

        return Inertia::render('users/index', [
            'users' => $users,
            'roles' => Role::all(),
            'departments' => Department::where('is_active', true)->orderBy('name')->get(),
            'purchasingGroups' => $purchasingGroups,
            'availablePlants' => $availablePlants,
            'stats' => $stats,
            'filters' => [
                'search' => $request->query('search', ''),
                'role_id' => $request->query('role_id', ''),
                'department_id' => $request->query('department_id', ''),
                'purchasing_group' => $request->query('purchasing_group', ''),
            ],
        ]);
    }

    /**
     * Download pre-formatted Excel template for bulk user imports.
     */
    public function downloadTemplate(UserExcelService $excelService): StreamedResponse
    {
        return $excelService->downloadTemplateResponse();
    }

    /**
     * Import users and credentials from an uploaded Excel or CSV file.
     */
    public function importExcel(Request $request, UserExcelService $excelService): RedirectResponse
    {
        $request->validate([
            'excel_file' => [
                'required',
                'file',
                'mimes:xlsx,xls,csv',
                'max:10240', // 10MB limit
            ],
        ], [
            'excel_file.required' => 'Please select an Excel or CSV spreadsheet file to upload.',
            'excel_file.file' => 'The uploaded file is invalid.',
            'excel_file.mimes' => 'The uploaded file must be in Excel (.xlsx, .xls) or CSV (.csv) format.',
            'excel_file.max' => 'The uploaded spreadsheet must not exceed 10 MB.',
        ]);

        try {
            $file = $request->file('excel_file');
            $result = $excelService->import($file->getRealPath());

            if ($result['imported_count'] > 0 && $result['failed_count'] === 0) {
                return back()
                    ->with('success', "Batch import completed: {$result['imported_count']} user accounts created and activated successfully.")
                    ->with('import_summary', $result);
            }

            if ($result['imported_count'] > 0 && $result['failed_count'] > 0) {
                return back()
                    ->with('success', "Batch import partial success: {$result['imported_count']} users imported successfully. {$result['failed_count']} rows had validation errors and were skipped.")
                    ->with('import_summary', $result);
            }

            return back()
                ->with('error', "No user accounts were imported. All {$result['failed_count']} rows had validation errors.")
                ->with('import_summary', $result);
        } catch (\Throwable $e) {
            return back()->with('error', 'Import error: '.$e->getMessage());
        }
    }

    /**
     * Store a newly created user (Admin or Employee).
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'role_id' => ['required', 'exists:roles,id'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'employee_id' => ['nullable', 'string', 'max:50', 'unique:users,employee_id'],
            'designation' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'plant' => ['nullable', 'string', 'max:255'],
            'purchasing_group' => ['nullable', 'string', 'max:20'],
            'is_active' => ['boolean'],
        ]);

        $role = Role::findOrFail($validated['role_id']);

        // Auto-generate employee_id if empty
        if (empty($validated['employee_id'])) {
            $prefix = match ($role->name) {
                'superadmin' => 'APL-SA-',
                'admin' => 'APL-ADM-',
                default => 'APL-EMP-',
            };
            $validated['employee_id'] = $prefix.rand(1000, 9999);
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role_id' => $validated['role_id'],
            'department_id' => $validated['department_id'] ?? null,
            'employee_id' => $validated['employee_id'],
            'designation' => $validated['designation'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'plant' => ! empty($validated['plant']) ? $validated['plant'] : '1200 - Dibrugarh Manufacturing Plant',
            'purchasing_group' => ! empty($validated['purchasing_group']) ? $validated['purchasing_group'] : null,
            'is_active' => $request->boolean('is_active', true),
            'email_verified_at' => now(), // Auto-verified: user can directly log in without email verification
        ]);

        return back()->with('success', "{$role->display_name} '{$user->name}' was created successfully.");
    }

    /**
     * Update an existing user.
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:6'],
            'role_id' => ['required', 'exists:roles,id'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'employee_id' => ['nullable', 'string', 'max:50', Rule::unique('users')->ignore($user->id)],
            'designation' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'plant' => ['nullable', 'string', 'max:255'],
            'purchasing_group' => ['nullable', 'string', 'max:20'],
            'is_active' => ['boolean'],
        ]);

        $updateData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role_id' => $validated['role_id'],
            'department_id' => $validated['department_id'] ?? null,
            'employee_id' => $validated['employee_id'] ?? $user->employee_id,
            'designation' => $validated['designation'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'plant' => ! empty($validated['plant']) ? $validated['plant'] : $user->plant,
            'purchasing_group' => ! empty($validated['purchasing_group']) ? $validated['purchasing_group'] : null,
            'is_active' => $request->boolean('is_active', true),
        ];

        if (! empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

        return back()->with('success', "User '{$user->name}' updated successfully.");
    }

    /**
     * Toggle active/inactive status of a user.
     */
    public function toggleStatus(Request $request, User $user): RedirectResponse
    {
        if ($request->user()->id === $user->id) {
            return back()->with('error', 'You cannot deactivate your own account.');
        }

        $user->update([
            'is_active' => ! $user->is_active,
        ]);

        $statusText = $user->is_active ? 'activated' : 'deactivated';

        return back()->with('success', "User '{$user->name}' has been {$statusText}.");
    }

    /**
     * Delete a user.
     */
    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($request->user()->id === $user->id) {
            return back()->with('error', 'You cannot delete your own account.');
        }

        $name = $user->name;
        $user->delete();

        return back()->with('success', "User '{$name}' has been deleted.");
    }
}
