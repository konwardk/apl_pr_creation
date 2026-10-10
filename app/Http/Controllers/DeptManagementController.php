<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DeptManagementController extends Controller
{
    /**
     * Display a listing of departments for the Super Administrator.
     */
    public function index(Request $request): Response
    {
        $query = Department::withCount('users')->latest();

        // Search query filter
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('head_of_department', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Status filter
        if ($request->filled('status') && $request->query('status') !== 'all') {
            $isActive = $request->query('status') === 'active';
            $query->where('is_active', $isActive);
        }

        $departments = $query->orderBy('name')->get();

        $allDepartments = Department::all();
        $stats = [
            'total_departments' => $allDepartments->count(),
            'active_departments' => $allDepartments->where('is_active', true)->count(),
            'inactive_departments' => $allDepartments->where('is_active', false)->count(),
            'total_assigned_users' => User::whereNotNull('department_id')->count(),
        ];

        return Inertia::render('departments/index', [
            'departments' => $departments,
            'stats' => $stats,
            'filters' => [
                'search' => $request->query('search', ''),
                'status' => $request->query('status', 'all'),
            ],
        ]);
    }

    /**
     * Store a newly created department in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:20', 'unique:departments,code'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'head_of_department' => ['nullable', 'string', 'max:255'],
            'is_active' => ['boolean'],
        ]);

        $validated['code'] = strtoupper(trim($validated['code']));
        $validated['is_active'] = $request->boolean('is_active', true);

        $department = Department::create($validated);

        return back()->with('success', "Department '{$department->name}' ({$department->code}) created successfully.");
    }

    /**
     * Update the specified department in storage.
     */
    public function update(Request $request, Department $department): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:20', Rule::unique('departments')->ignore($department->id)],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'head_of_department' => ['nullable', 'string', 'max:255'],
            'is_active' => ['boolean'],
        ]);

        $validated['code'] = strtoupper(trim($validated['code']));
        $validated['is_active'] = $request->boolean('is_active', true);

        $department->update($validated);

        return back()->with('success', "Department '{$department->name}' updated successfully.");
    }

    /**
     * Toggle the active/inactive status of a department.
     */
    public function toggleStatus(Department $department): RedirectResponse
    {
        $department->update([
            'is_active' => ! $department->is_active,
        ]);

        $statusText = $department->is_active ? 'activated' : 'deactivated';

        return back()->with('success', "Department '{$department->name}' has been {$statusText}.");
    }

    /**
     * Remove the specified department from storage.
     */
    public function destroy(Department $department): RedirectResponse
    {
        $assignedUsersCount = $department->users()->count();

        if ($assignedUsersCount > 0) {
            return back()->with('error', "Cannot delete department '{$department->name}' because {$assignedUsersCount} employee(s) are currently assigned to it. Please reassign the employees first.");
        }

        $name = $department->name;
        $department->delete();

        return back()->with('success', "Department '{$name}' has been deleted.");
    }
}
