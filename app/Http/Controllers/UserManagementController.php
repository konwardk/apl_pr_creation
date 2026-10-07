<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserManagementController extends Controller
{
    /**
     * Display the User Management panel for Super Administrator.
     */
    public function index(Request $request): Response
    {
        $query = User::with(['role', 'department'])->latest();

        // Search filter
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('employee_id', 'like', "%{$search}%")
                    ->orWhere('designation', 'like', "%{$search}%");
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

        return Inertia::render('users/index', [
            'users' => $users,
            'roles' => Role::all(),
            'departments' => Department::where('is_active', true)->orderBy('name')->get(),
            'stats' => $stats,
            'filters' => [
                'search' => $request->query('search', ''),
                'role_id' => $request->query('role_id', ''),
                'department_id' => $request->query('department_id', ''),
            ],
        ]);
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
            $validated['employee_id'] = $prefix . rand(1000, 9999);
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
            'plant' => $validated['plant'] ?? '1200 - Dibrugarh Manufacturing Plant',
            'is_active' => $request->boolean('is_active', true),
            'email_verified_at' => now(),
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
            'plant' => $validated['plant'] ?? $user->plant,
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
