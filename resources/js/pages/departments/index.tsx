import React, { useState, useMemo } from 'react';
import { Head, router, usePage, Link } from '@inertiajs/react';
import SapAppLayout from '@/layouts/sap-app-layout';
import {
    Building2,
    Plus,
    Search,
    Filter,
    Edit2,
    Trash2,
    ToggleLeft,
    ToggleRight,
    CheckCircle2,
    AlertCircle,
    X,
    Users,
    Shield,
    FileText,
    ArrowRight,
    Briefcase,
    UserCheck,
} from 'lucide-react';
import type { User, Department } from '@/types';

interface PageProps {
    departments: Department[];
    stats: {
        total_departments: number;
        active_departments: number;
        inactive_departments: number;
        total_assigned_users: number;
    };
    filters: {
        search: string;
        status: string;
    };
    flash?: {
        success?: string | null;
        error?: string | null;
    };
}

export default function DepartmentsIndex({
    departments = [],
    stats = {
        total_departments: 0,
        active_departments: 0,
        inactive_departments: 0,
        total_assigned_users: 0,
    },
    filters,
}: PageProps) {
    const { flash } = usePage().props as { flash?: { success?: string; error?: string } };

    // Search and filter states
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>(
        (filters?.status as any) || 'all'
    );

    // Modal states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const [deletingDept, setDeletingDept] = useState<Department | null>(null);

    // Create form state
    const [createForm, setCreateForm] = useState({
        code: '',
        name: '',
        head_of_department: '',
        description: '',
        is_active: true,
    });
    const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
    const [isCreating, setIsCreating] = useState(false);

    // Edit form state
    const [editForm, setEditForm] = useState({
        code: '',
        name: '',
        head_of_department: '',
        description: '',
        is_active: true,
    });
    const [editErrors, setEditErrors] = useState<Record<string, string>>({});
    const [isEditing, setIsEditing] = useState(false);

    // Filtered departments list
    const filteredDepartments = useMemo(() => {
        return departments.filter((dept) => {
            if (statusFilter === 'active' && !dept.is_active) return false;
            if (statusFilter === 'inactive' && dept.is_active) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const codeMatch = dept.code.toLowerCase().includes(q);
                const nameMatch = dept.name.toLowerCase().includes(q);
                const hodMatch = dept.head_of_department?.toLowerCase().includes(q) ?? false;
                const descMatch = dept.description?.toLowerCase().includes(q) ?? false;
                if (!codeMatch && !nameMatch && !hodMatch && !descMatch) return false;
            }

            return true;
        });
    }, [departments, searchQuery, statusFilter]);

    // Handle Create Submit
    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        setCreateErrors({});

        router.post('/departments', createForm, {
            preserveScroll: true,
            onSuccess: () => {
                setIsCreateOpen(false);
                setCreateForm({
                    code: '',
                    name: '',
                    head_of_department: '',
                    description: '',
                    is_active: true,
                });
            },
            onError: (err) => {
                setCreateErrors(err as Record<string, string>);
            },
            onFinish: () => {
                setIsCreating(false);
            },
        });
    };

    // Open Edit Modal
    const handleOpenEdit = (dept: Department) => {
        setEditingDept(dept);
        setEditForm({
            code: dept.code,
            name: dept.name,
            head_of_department: dept.head_of_department || '',
            description: dept.description || '',
            is_active: dept.is_active,
        });
        setEditErrors({});
    };

    // Handle Edit Submit
    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDept) return;

        setIsEditing(true);
        setEditErrors({});

        router.put(`/departments/${editingDept.id}`, editForm, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingDept(null);
            },
            onError: (err) => {
                setEditErrors(err as Record<string, string>);
            },
            onFinish: () => {
                setIsEditing(false);
            },
        });
    };

    // Handle Toggle Status
    const handleToggleStatus = (dept: Department) => {
        router.post(`/departments/${dept.id}/toggle-status`, {}, {
            preserveScroll: true,
        });
    };

    // Handle Delete
    const handleDeleteSubmit = () => {
        if (!deletingDept) return;

        router.delete(`/departments/${deletingDept.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeletingDept(null);
            },
        });
    };

    return (
        <SapAppLayout title="Manage Departments - Assam Petro-Chemicals Ltd." activeTab="system-configuration">
            <Head title="Manage Departments - System Configuration" />

            <div className="space-y-6">
                {/* Flash Messages */}
                {flash?.success && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 shadow-xs animate-in fade-in">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800 shadow-xs animate-in fade-in">
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* Sub-Navigation Tabs: System Configuration Hub */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#d9e2ec] pb-3">
                    <div className="flex items-center gap-2">
                        <Link
                            href="/users"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#d9e2ec] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#556b82] transition-colors hover:border-slate-300 hover:text-[#1c2d42]"
                        >
                            <Users className="h-3.5 w-3.5 text-slate-500" />
                            <span>Manage Users</span>
                        </Link>
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#0070f2] bg-[#0070f2] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs">
                            <Building2 className="h-3.5 w-3.5 text-white" />
                            <span>Manage Departments</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsCreateOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-[#0070f2] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#0057c2] active:bg-[#003884]"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Create Department</span>
                        </button>
                    </div>
                </div>

                {/* Top Banner & Statistics */}
                <div className="rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-xs">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0070f2] to-[#0057c2] text-white shadow-xs">
                                <Building2 className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl font-bold tracking-tight text-[#1c2d42]">
                                        Department Management
                                    </h1>
                                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-[#0070f2]">
                                        Superadmin Control
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-[#556b82]">
                                    Configure enterprise departments, organizational codes, and Heads of Departments (HOD) for approval workflows and requisitions.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                            <div className="flex items-center justify-between text-xs text-[#556b82]">
                                <span>Total Departments</span>
                                <Building2 className="h-4 w-4 text-[#0070f2]" />
                            </div>
                            <div className="mt-1 text-xl font-bold text-[#1c2d42]">
                                {stats.total_departments}
                            </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                            <div className="flex items-center justify-between text-xs text-[#556b82]">
                                <span>Active Departments</span>
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div className="mt-1 text-xl font-bold text-emerald-700">
                                {stats.active_departments}
                            </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                            <div className="flex items-center justify-between text-xs text-[#556b82]">
                                <span>Inactive Departments</span>
                                <AlertCircle className="h-4 w-4 text-slate-400" />
                            </div>
                            <div className="mt-1 text-xl font-bold text-slate-600">
                                {stats.inactive_departments}
                            </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                            <div className="flex items-center justify-between text-xs text-[#556b82]">
                                <span>Assigned Employees</span>
                                <Users className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="mt-1 text-xl font-bold text-purple-700">
                                {stats.total_assigned_users}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters & Action Bar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[#d9e2ec] bg-white p-3 shadow-xs">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8c9ba5]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by code, department name, HOD..."
                            className="h-9 w-full rounded-md border border-[#d9e2ec] bg-[#f8fafc] pl-9 pr-3 text-xs text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0070f2]"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#556b82]">Status:</span>
                        <div className="inline-flex rounded-md border border-[#d9e2ec] bg-white p-0.5 text-xs">
                            <button
                                type="button"
                                onClick={() => setStatusFilter('all')}
                                className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                                    statusFilter === 'all'
                                        ? 'bg-[#0070f2] text-white shadow-2xs'
                                        : 'text-[#556b82] hover:text-[#1c2d42]'
                                }`}
                            >
                                All ({departments.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('active')}
                                className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                                    statusFilter === 'active'
                                        ? 'bg-[#0070f2] text-white shadow-2xs'
                                        : 'text-[#556b82] hover:text-[#1c2d42]'
                                }`}
                            >
                                Active
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('inactive')}
                                className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                                    statusFilter === 'inactive'
                                        ? 'bg-[#0070f2] text-white shadow-2xs'
                                        : 'text-[#556b82] hover:text-[#1c2d42]'
                                }`}
                            >
                                Inactive
                            </button>
                        </div>
                    </div>
                </div>

                {/* Departments Table */}
                <div className="overflow-hidden rounded-xl border border-[#d9e2ec] bg-white shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-[#1c2d42]">
                            <thead className="border-b border-[#d9e2ec] bg-[#f8fafc] text-[11px] font-semibold text-[#556b82]">
                                <tr>
                                    <th className="py-3 px-4">Code</th>
                                    <th className="py-3 px-4">Department Name</th>
                                    <th className="py-3 px-4">Head of Department (HOD)</th>
                                    <th className="py-3 px-4">Assigned Employees</th>
                                    <th className="py-3 px-4">Description / Scope</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredDepartments.map((dept) => (
                                    <tr key={dept.id} className="transition-colors hover:bg-slate-50/80">
                                        {/* Code Badge */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <span className="font-mono font-bold text-[#0070f2] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md text-xs">
                                                {dept.code}
                                            </span>
                                        </td>

                                        {/* Name */}
                                        <td className="py-3 px-4 font-semibold text-[#1c2d42]">
                                            {dept.name}
                                        </td>

                                        {/* Head of Department */}
                                        <td className="py-3 px-4">
                                            {dept.head_of_department ? (
                                                <div className="flex items-center gap-1.5 font-medium text-[#1c2d42]">
                                                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                                                        {dept.head_of_department[0]}
                                                    </div>
                                                    <span>{dept.head_of_department}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic">Not Assigned</span>
                                            )}
                                        </td>

                                        {/* Users Count */}
                                        <td className="py-3 px-4">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                                <Users className="h-3 w-3 text-slate-500" />
                                                <span>{dept.users_count ?? 0}</span>
                                            </span>
                                        </td>

                                        {/* Description */}
                                        <td className="py-3 px-4 max-w-xs truncate text-[11px] text-[#556b82]" title={dept.description || ''}>
                                            {dept.description || '-'}
                                        </td>

                                        {/* Status */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                    dept.is_active
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-slate-100 text-slate-600'
                                                }`}
                                            >
                                                {dept.is_active ? (
                                                    <>
                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                        Active
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                                        Inactive
                                                    </>
                                                )}
                                            </span>
                                        </td>

                                        {/* Actions */}
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1.5">
                                                {/* Toggle Status */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleStatus(dept)}
                                                    className="p-1 rounded text-slate-400 hover:text-[#0070f2] hover:bg-slate-100 transition-colors"
                                                    title={dept.is_active ? 'Deactivate Department' : 'Activate Department'}
                                                >
                                                    {dept.is_active ? (
                                                        <ToggleRight className="h-4 w-4 text-emerald-600" />
                                                    ) : (
                                                        <ToggleLeft className="h-4 w-4 text-slate-400" />
                                                    )}
                                                </button>

                                                {/* Edit */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEdit(dept)}
                                                    className="p-1 rounded text-slate-400 hover:text-[#0070f2] hover:bg-slate-100 transition-colors"
                                                    title="Edit Department"
                                                >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </button>

                                                {/* Delete */}
                                                <button
                                                    type="button"
                                                    onClick={() => setDeletingDept(dept)}
                                                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                    title="Delete Department"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {filteredDepartments.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                                            No departments match your filter criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* CREATE DEPARTMENT MODAL */}
                {isCreateOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                        <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#0070f2]">
                                        <Building2 className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-[#1c2d42]">Create New Department</h3>
                                        <p className="text-[11px] text-[#556b82]">Add an organizational department to Assam Petro-Chemicals Ltd.</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5 text-xs">
                                <div>
                                    <label className="block font-semibold text-[#1c2d42] mb-1">
                                        Department Code <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={20}
                                        value={createForm.code}
                                        onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                                        placeholder="e.g. PROC, CHEM, MECH, ELEC"
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] bg-[#f8fafc] px-3 font-mono font-semibold uppercase text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0070f2]"
                                    />
                                    {createErrors.code && (
                                        <p className="mt-1 text-[11px] text-rose-600">{createErrors.code}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block font-semibold text-[#1c2d42] mb-1">
                                        Department Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={createForm.name}
                                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                        placeholder="e.g. Procurement & Materials Management"
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] bg-[#f8fafc] px-3 text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0070f2]"
                                    />
                                    {createErrors.name && (
                                        <p className="mt-1 text-[11px] text-rose-600">{createErrors.name}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block font-semibold text-[#1c2d42] mb-1">
                                        Head of Department (HOD)
                                    </label>
                                    <input
                                        type="text"
                                        value={createForm.head_of_department}
                                        onChange={(e) => setCreateForm({ ...createForm, head_of_department: e.target.value })}
                                        placeholder="e.g. B. K. Gogoi"
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] bg-[#f8fafc] px-3 text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0070f2]"
                                    />
                                    {createErrors.head_of_department && (
                                        <p className="mt-1 text-[11px] text-rose-600">{createErrors.head_of_department}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block font-semibold text-[#1c2d42] mb-1">
                                        Description & Scope
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={createForm.description}
                                        onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                        placeholder="Detailed description of plant responsibilities, unit scope, and operational jurisdiction..."
                                        className="w-full rounded-md border border-[#d9e2ec] bg-[#f8fafc] p-2.5 text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0070f2]"
                                    />
                                    {createErrors.description && (
                                        <p className="mt-1 text-[11px] text-rose-600">{createErrors.description}</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    <input
                                        type="checkbox"
                                        id="create_is_active"
                                        checked={createForm.is_active}
                                        onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
                                        className="h-4 w-4 rounded border-slate-300 text-[#0070f2] focus:ring-[#0070f2]"
                                    />
                                    <label htmlFor="create_is_active" className="text-xs font-semibold text-[#1c2d42]">
                                        Department is Active (Available for employee assignment and PR approval)
                                    </label>
                                </div>

                                {/* Modal Actions */}
                                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateOpen(false)}
                                        className="rounded-md border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreating}
                                        className="rounded-md bg-[#0070f2] px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2] disabled:opacity-50"
                                    >
                                        {isCreating ? 'Creating...' : 'Create Department'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* EDIT DEPARTMENT MODAL */}
                {editingDept && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                        <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#0070f2]">
                                        <Edit2 className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-[#1c2d42]">Edit Department: {editingDept.code}</h3>
                                        <p className="text-[11px] text-[#556b82]">Update department details and parameters</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEditingDept(null)}
                                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5 text-xs">
                                <div>
                                    <label className="block font-semibold text-[#1c2d42] mb-1">
                                        Department Code <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={20}
                                        value={editForm.code}
                                        onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] bg-[#f8fafc] px-3 font-mono font-semibold uppercase text-[#1c2d42] focus:border-[#0070f2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0070f2]"
                                    />
                                    {editErrors.code && (
                                        <p className="mt-1 text-[11px] text-rose-600">{editErrors.code}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block font-semibold text-[#1c2d42] mb-1">
                                        Department Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] bg-[#f8fafc] px-3 text-[#1c2d42] focus:border-[#0070f2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0070f2]"
                                    />
                                    {editErrors.name && (
                                        <p className="mt-1 text-[11px] text-rose-600">{editErrors.name}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block font-semibold text-[#1c2d42] mb-1">
                                        Head of Department (HOD)
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.head_of_department}
                                        onChange={(e) => setEditForm({ ...editForm, head_of_department: e.target.value })}
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] bg-[#f8fafc] px-3 text-[#1c2d42] focus:border-[#0070f2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0070f2]"
                                    />
                                    {editErrors.head_of_department && (
                                        <p className="mt-1 text-[11px] text-rose-600">{editErrors.head_of_department}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block font-semibold text-[#1c2d42] mb-1">
                                        Description & Scope
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={editForm.description}
                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                        className="w-full rounded-md border border-[#d9e2ec] bg-[#f8fafc] p-2.5 text-[#1c2d42] focus:border-[#0070f2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0070f2]"
                                    />
                                    {editErrors.description && (
                                        <p className="mt-1 text-[11px] text-rose-600">{editErrors.description}</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    <input
                                        type="checkbox"
                                        id="edit_is_active"
                                        checked={editForm.is_active}
                                        onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                                        className="h-4 w-4 rounded border-slate-300 text-[#0070f2] focus:ring-[#0070f2]"
                                    />
                                    <label htmlFor="edit_is_active" className="text-xs font-semibold text-[#1c2d42]">
                                        Department is Active
                                    </label>
                                </div>

                                {/* Modal Actions */}
                                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setEditingDept(null)}
                                        className="rounded-md border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isEditing}
                                        className="rounded-md bg-[#0070f2] px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2] disabled:opacity-50"
                                    >
                                        {isEditing ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* DELETE CONFIRMATION MODAL */}
                {deletingDept && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                        <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                                    <Trash2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-[#1c2d42]">Delete Department</h3>
                                    <p className="text-xs text-[#556b82]">
                                        Are you sure you want to delete department <strong className="text-[#1c2d42]">{deletingDept.name} ({deletingDept.code})</strong>?
                                    </p>
                                </div>
                            </div>

                            {(deletingDept.users_count ?? 0) > 0 ? (
                                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                    <p className="font-semibold flex items-center gap-1.5">
                                        <AlertCircle className="h-4 w-4 text-amber-600" />
                                        Cannot Delete Active Department
                                    </p>
                                    <p className="mt-1 text-[11px]">
                                        This department currently has <strong>{deletingDept.users_count}</strong> assigned employee(s). You must reassign all employees to another department before deleting this department.
                                    </p>
                                </div>
                            ) : (
                                <p className="mt-3 text-xs text-slate-500">
                                    This action cannot be undone. All configuration associated with this department code will be permanently removed.
                                </p>
                            )}

                            <div className="mt-5 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setDeletingDept(null)}
                                    className="rounded-md border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={(deletingDept.users_count ?? 0) > 0}
                                    onClick={handleDeleteSubmit}
                                    className="rounded-md bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Delete Department
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </SapAppLayout>
    );
}

DepartmentsIndex.layout = (page: React.ReactNode) => page;
