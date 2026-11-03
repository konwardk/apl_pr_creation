import React, { useState, useMemo } from 'react';
import { Head, router, usePage, Link } from '@inertiajs/react';
import SapAppLayout from '@/layouts/sap-app-layout';
import {
    Users,
    UserPlus,
    Shield,
    ShieldCheck,
    UserCheck,
    Search,
    Filter,
    Edit2,
    Trash2,
    ToggleLeft,
    ToggleRight,
    Building2,
    CheckCircle2,
    AlertCircle,
    X,
    Lock,
    Mail,
    Phone,
    MapPin,
    Briefcase,
    BadgeAlert,
    RefreshCw,
    FileSpreadsheet,
    Download,
    UploadCloud,
    FileText,
    AlertTriangle,
} from 'lucide-react';
import type { User, Role, Department } from '@/types';

export interface PlantOption {
    code: string;
    name: string;
    value: string;
}

export interface PurchasingGroupOption {
    id: number;
    code: string;
    name: string;
    description?: string;
}

export interface ImportSummary {
    total_rows: number;
    imported_count: number;
    failed_count: number;
    errors: Array<{
        row: number;
        email?: string;
        message: string;
    }>;
    users?: string[];
}

interface PageProps {
    users: User[];
    roles: Role[];
    departments: Department[];
    purchasingGroups?: PurchasingGroupOption[];
    availablePlants?: PlantOption[];
    stats: {
        total_users: number;
        superadmin_count: number;
        admin_count: number;
        employee_count: number;
        active_count: number;
        inactive_count: number;
    };
    filters: {
        search: string;
        role_id: string;
        department_id: string;
        purchasing_group?: string;
    };
    flash?: {
        success?: string | null;
        error?: string | null;
        import_summary?: ImportSummary | null;
    };
}

export default function UsersIndex({
    users = [],
    roles = [],
    departments = [],
    purchasingGroups = [],
    availablePlants = [],
    stats = {
        total_users: 0,
        superadmin_count: 0,
        admin_count: 0,
        employee_count: 0,
        active_count: 0,
        inactive_count: 0,
    },
    filters,
}: PageProps) {
    const { auth, flash } = usePage().props as {
        auth?: { user?: User };
        flash?: {
            success?: string;
            error?: string;
            import_summary?: ImportSummary;
        };
    };
    const currentUser = auth?.user;

    // Filter states
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [selectedRole, setSelectedRole] = useState(filters?.role_id || '');
    const [selectedDept, setSelectedDept] = useState(filters?.department_id || '');
    const [selectedPg, setSelectedPg] = useState(filters?.purchasing_group || '');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');

    // Default plant from availablePlants or fallback
    const defaultPlant = availablePlants.find((p) => p.code === '1200')?.value || availablePlants[0]?.value || '1200 - Dibrugarh Manufacturing Plant';

    // Modal states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);

    // Form & state for Excel Import
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dismissSummary, setDismissSummary] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    // Form states for Create
    const [createForm, setCreateForm] = useState({
        name: '',
        email: '',
        password: '',
        role_id: roles[2]?.id ? String(roles[2].id) : '', // Default to employee
        department_id: '',
        employee_id: '',
        designation: '',
        phone: '',
        plant: defaultPlant,
        purchasing_group: '',
        is_active: true,
    });
    const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
    const [isCreating, setIsCreating] = useState(false);

    // Form states for Edit
    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        password: '',
        role_id: '',
        department_id: '',
        employee_id: '',
        designation: '',
        phone: '',
        plant: defaultPlant,
        purchasing_group: '',
        is_active: true,
    });
    const [editErrors, setEditErrors] = useState<Record<string, string>>({});
    const [isUpdating, setIsUpdating] = useState(false);

    // Client-side filtering
    const filteredUsers = useMemo(() => {
        return users.filter((u) => {
            const matchesSearch =
                !searchQuery ||
                u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (u.employee_id && u.employee_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (u.designation && u.designation.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (u.plant && u.plant.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (u.purchasing_group && u.purchasing_group.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (u.purchasing_group_detail?.description && u.purchasing_group_detail.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (u.purchasing_group_detail?.name && u.purchasing_group_detail.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (u.department?.name && u.department.name.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesRole = !selectedRole || String(u.role_id) === String(selectedRole);
            const matchesDept = !selectedDept || String(u.department_id) === String(selectedDept);
            const matchesPg = !selectedPg || u.purchasing_group === selectedPg;
            const matchesStatus =
                selectedStatus === 'all'
                    ? true
                    : selectedStatus === 'active'
                    ? Boolean(u.is_active)
                    : !u.is_active;

            return matchesSearch && matchesRole && matchesDept && matchesPg && matchesStatus;
        });
    }, [users, searchQuery, selectedRole, selectedDept, selectedPg, selectedStatus]);

    // Handle file selection from drag-and-drop or file picker
    const handleFileSelect = (file: File) => {
        const validExtensions = ['.xlsx', '.xls', '.csv'];
        const fileName = file.name.toLowerCase();
        const isValid = validExtensions.some((ext) => fileName.endsWith(ext));
        if (!isValid) {
            setImportError('Please select an Excel (.xlsx, .xls) or CSV (.csv) file.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setImportError('The selected file size exceeds the 10 MB limit.');
            return;
        }
        setImportError(null);
        setSelectedFile(file);
    };

    // Handle Excel Import Submit
    const handleImportSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            setImportError('Please choose an Excel or CSV file to upload.');
            return;
        }
        setIsImporting(true);
        setImportError(null);

        const formData = new FormData();
        formData.append('excel_file', selectedFile);

        router.post('/users/import-excel', formData, {
            forceFormData: true,
            onSuccess: () => {
                setIsImportOpen(false);
                setSelectedFile(null);
                setDismissSummary(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
            onError: (errs) => {
                const msg = errs.excel_file || Object.values(errs)[0] || 'An error occurred during import.';
                setImportError(msg);
            },
            onFinish: () => {
                setIsImporting(false);
            },
        });
    };

    // Handle Create User
    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        setCreateErrors({});

        router.post('/users', createForm, {
            onSuccess: () => {
                setIsCreateOpen(false);
                setCreateForm({
                    name: '',
                    email: '',
                    password: '',
                    role_id: roles[2]?.id ? String(roles[2].id) : '',
                    department_id: '',
                    employee_id: '',
                    designation: '',
                    phone: '',
                    plant: defaultPlant,
                    purchasing_group: '',
                    is_active: true,
                });
            },
            onError: (errs) => {
                setCreateErrors(errs);
            },
            onFinish: () => {
                setIsCreating(false);
            },
        });
    };

    // Open Edit modal
    const handleOpenEdit = (userToEdit: User) => {
        setEditingUser(userToEdit);

        // Match plant to availablePlants or fallback
        const matchedPlant = availablePlants.find(
            (p) => p.value === userToEdit.plant || p.code === userToEdit.plant
        );
        const resolvedPlant = matchedPlant ? matchedPlant.value : (userToEdit.plant || defaultPlant);

        setEditForm({
            name: userToEdit.name,
            email: userToEdit.email,
            password: '',
            role_id: String(userToEdit.role_id || ''),
            department_id: String(userToEdit.department_id || ''),
            employee_id: userToEdit.employee_id || '',
            designation: userToEdit.designation || '',
            phone: userToEdit.phone || '',
            plant: resolvedPlant,
            purchasing_group: userToEdit.purchasing_group || '',
            is_active: Boolean(userToEdit.is_active),
        });
        setEditErrors({});
    };

    // Handle Edit Submit
    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setIsUpdating(true);
        setEditErrors({});

        router.put(`/users/${editingUser.id}`, editForm, {
            onSuccess: () => {
                setEditingUser(null);
            },
            onError: (errs) => {
                setEditErrors(errs);
            },
            onFinish: () => {
                setIsUpdating(false);
            },
        });
    };

    // Handle Toggle Status
    const handleToggleStatus = (u: User) => {
        if (currentUser?.id === u.id) {
            alert('You cannot deactivate your own logged-in account.');
            return;
        }
        router.post(`/users/${u.id}/toggle-status`, {}, { preserveScroll: true });
    };

    // Handle Delete User
    const handleConfirmDelete = () => {
        if (!deletingUser) return;
        router.delete(`/users/${deletingUser.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeletingUser(null),
        });
    };

    // Helper for initials
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <SapAppLayout title="User Management - Assam Petro-Chemicals Ltd." activeTab="system-configuration">
            <Head title="User Management - Assam Petro-Chemicals Ltd." />

            <div className="space-y-6">
                {/* Flash Messages */}
                {flash?.success && (
                    <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-2xs">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="flex items-center gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 shadow-2xs">
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* Excel Import Execution Report */}
                {flash?.import_summary && !dismissSummary && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-2.5">
                                <div
                                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                                        flash.import_summary.failed_count === 0
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-amber-100 text-amber-700'
                                    }`}
                                >
                                    <FileSpreadsheet className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-[#1c2d42]">Excel Import Execution Report</h3>
                                    <p className="text-xs text-[#556b82]">
                                        Processed {flash.import_summary.total_rows} rows from the uploaded spreadsheet.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDismissSummary(true)}
                                className="text-slate-400 hover:text-slate-600 rounded p-1 transition-colors"
                                title="Dismiss report"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                <span>{flash.import_summary.imported_count} Created & Activated</span>
                            </span>
                            {flash.import_summary.failed_count > 0 && (
                                <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
                                    <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                                    <span>{flash.import_summary.failed_count} Rows Skipped / Failed</span>
                                </span>
                            )}
                        </div>

                        {flash.import_summary.errors && flash.import_summary.errors.length > 0 && (
                            <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50/50 p-3">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-800 mb-2">
                                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                                    <span>Validation Details for Skipped Rows:</span>
                                </div>
                                <div className="max-h-48 overflow-y-auto divide-y divide-rose-100 text-[11px]">
                                    {flash.import_summary.errors.map((err, idx) => (
                                        <div key={idx} className="py-1.5 flex items-start gap-2">
                                            <span className="font-semibold text-rose-700 shrink-0 font-mono">Row {err.row}:</span>
                                            {err.email && err.email !== 'N/A' && (
                                                <span className="text-slate-600 shrink-0">({err.email})</span>
                                            )}
                                            <span className="text-rose-900">{err.message}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Sub-Navigation Tabs: System Configuration Hub */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#d9e2ec] pb-3">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#0070f2] bg-[#0070f2] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs">
                            <Users className="h-3.5 w-3.5 text-white" />
                            <span>Manage Users</span>
                        </span>
                        <Link
                            href="/departments"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#d9e2ec] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#556b82] transition-colors hover:border-slate-300 hover:text-[#1c2d42]"
                        >
                            <Building2 className="h-3.5 w-3.5 text-slate-500" />
                            <span>Manage Departments</span>
                        </Link>
                    </div>
                </div>

                {/* Header Banner */}
                <div className="rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-xs">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold tracking-tight text-[#1c2d42]">
                                    User Management & Role-Based Access Control
                                </h1>
                                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                                    Superadmin Portal
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-[#556b82]">
                                Manage administrators and plant employees across Assam Petro-Chemicals Ltd. departments, plant facilities, and system access levels.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Download Template Button */}
                            <a
                                href="/users/template-excel"
                                download="APL_User_Import_Template.xlsx"
                                className="inline-flex items-center gap-1.5 rounded-md border border-[#d9e2ec] bg-white px-3 py-2 text-xs font-semibold text-[#1c2d42] shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-colors"
                                title="Download pre-configured Excel spreadsheet template with required columns and reference data"
                            >
                                <Download className="h-3.5 w-3.5 text-[#0070f2]" />
                                <span>Download Template</span>
                            </a>

                            {/* Import Excel Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsImportOpen(true);
                                    setImportError(null);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-md border border-[#0070f2] bg-blue-50/70 px-3.5 py-2 text-xs font-semibold text-[#0070f2] shadow-2xs hover:bg-blue-100 transition-colors"
                                title="Batch import users and credentials from Excel"
                            >
                                <FileSpreadsheet className="h-4 w-4 text-[#0070f2]" />
                                <span>Import from Excel</span>
                            </button>

                            {/* Add User Button */}
                            <button
                                type="button"
                                onClick={() => setIsCreateOpen(true)}
                                className="flex items-center gap-2 rounded-md bg-[#0070f2] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#0057c2] active:bg-[#003884]"
                            >
                                <UserPlus className="h-4 w-4" />
                                <span>+ Add New User</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {/* Total Users */}
                    <div className="rounded-xl border border-[#d9e2ec] bg-white p-4 shadow-xs">
                        <div className="flex items-center justify-between text-[#556b82]">
                            <span className="text-xs font-semibold uppercase tracking-wider">Total Users</span>
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                                <Users className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="mt-2 text-2xl font-bold text-[#1c2d42]">{stats.total_users}</div>
                        <div className="mt-1 text-[11px] text-[#556b82]">All registered accounts</div>
                    </div>

                    {/* Superadmins */}
                    <div className="rounded-xl border border-purple-200/80 bg-white p-4 shadow-xs">
                        <div className="flex items-center justify-between text-purple-800">
                            <span className="text-xs font-semibold uppercase tracking-wider">Superadmins</span>
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                                <Shield className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="mt-2 text-2xl font-bold text-purple-700">{stats.superadmin_count}</div>
                        <div className="mt-1 text-[11px] text-purple-600">Full system control</div>
                    </div>

                    {/* Admins */}
                    <div className="rounded-xl border border-blue-200/80 bg-white p-4 shadow-xs">
                        <div className="flex items-center justify-between text-blue-800">
                            <span className="text-xs font-semibold uppercase tracking-wider">Administrators</span>
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[#0070f2]">
                                <ShieldCheck className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="mt-2 text-2xl font-bold text-[#0070f2]">{stats.admin_count}</div>
                        <div className="mt-1 text-[11px] text-[#556b82]">Procurement & SAP sync</div>
                    </div>

                    {/* Employees */}
                    <div className="rounded-xl border border-teal-200/80 bg-white p-4 shadow-xs">
                        <div className="flex items-center justify-between text-teal-800">
                            <span className="text-xs font-semibold uppercase tracking-wider">Employees</span>
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                                <UserCheck className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="mt-2 text-2xl font-bold text-teal-700">{stats.employee_count}</div>
                        <div className="mt-1 text-[11px] text-teal-600">PR Requesters only</div>
                    </div>

                    {/* Active Accounts */}
                    <div className="rounded-xl border border-emerald-200/80 bg-white p-4 shadow-xs">
                        <div className="flex items-center justify-between text-emerald-800">
                            <span className="text-xs font-semibold uppercase tracking-wider">Active</span>
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="mt-2 text-2xl font-bold text-emerald-700">{stats.active_count}</div>
                        <div className="mt-1 text-[11px] text-[#556b82]">
                            {stats.inactive_count > 0 ? `${stats.inactive_count} inactive` : 'All accounts operational'}
                        </div>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="rounded-xl border border-[#d9e2ec] bg-white p-4 shadow-xs">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        {/* Search Input */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#8c9ba5]" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name, email, employee ID, designation..."
                                className="h-9 w-full rounded-md border border-[#d9e2ec] pr-3 pl-8 text-xs text-[#1c2d42] placeholder:text-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                            />
                        </div>

                        {/* Dropdown Filters */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Role Filter */}
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="h-9 rounded-md border border-[#d9e2ec] bg-white px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:outline-none"
                            >
                                <option value="">All Roles</option>
                                {roles.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.display_name}
                                    </option>
                                ))}
                            </select>

                            {/* Department Filter */}
                            <select
                                value={selectedDept}
                                onChange={(e) => setSelectedDept(e.target.value)}
                                className="h-9 rounded-md border border-[#d9e2ec] bg-white px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:outline-none max-w-[200px]"
                            >
                                <option value="">All Departments</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name} ({d.code})
                                    </option>
                                ))}
                            </select>

                            {/* Purchasing Group Filter */}
                            <select
                                value={selectedPg}
                                onChange={(e) => setSelectedPg(e.target.value)}
                                className="h-9 rounded-md border border-[#d9e2ec] bg-white px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:outline-none max-w-[200px]"
                            >
                                <option value="">All Purchase Groups</option>
                                {purchasingGroups.map((pg) => (
                                    <option key={pg.id || pg.code} value={pg.code}>
                                        {pg.name}
                                    </option>
                                ))}
                            </select>

                            {/* Status Filter */}
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'active' | 'inactive')}
                                className="h-9 rounded-md border border-[#d9e2ec] bg-white px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:outline-none"
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active Only</option>
                                <option value="inactive">Inactive Only</option>
                            </select>

                            {(searchQuery || selectedRole || selectedDept || selectedPg || selectedStatus !== 'all') && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSelectedRole('');
                                        setSelectedDept('');
                                        setSelectedPg('');
                                        setSelectedStatus('all');
                                    }}
                                    className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
                                >
                                    Reset Filters
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-left text-xs text-[#1c2d42]">
                            <thead className="bg-[#f8fafc] text-[11px] font-semibold text-[#556b82] border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-3">User & Employee ID</th>
                                    <th className="py-3 px-3">System Role</th>
                                    <th className="py-3 px-3">Department & Designation</th>
                                    <th className="py-3 px-3">Plant & Purchase Group</th>
                                    <th className="py-3 px-3">Contact</th>
                                    <th className="py-3 px-3 text-center">Status</th>
                                    <th className="py-3 px-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-slate-400">
                                            <Users className="mx-auto h-9 w-9 text-slate-300 mb-2" />
                                            <p className="font-semibold text-slate-600">No users found</p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                Try adjusting search keywords or filters.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((u) => {
                                        const roleName = u.role?.name || (u.is_superadmin ? 'superadmin' : u.is_employee ? 'employee' : 'admin');
                                        const isSA = roleName === 'superadmin';
                                        const isEmp = roleName === 'employee';
                                        const isAdm = roleName === 'admin';
                                        const isCurrent = currentUser?.id === u.id;

                                        return (
                                            <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                                                {/* User Info */}
                                                <td className="py-3 px-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div
                                                            className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-2xs ${
                                                                isSA
                                                                    ? 'bg-gradient-to-br from-purple-600 to-indigo-800'
                                                                    : isEmp
                                                                    ? 'bg-gradient-to-br from-teal-600 to-emerald-800'
                                                                    : 'bg-gradient-to-br from-[#0070f2] to-[#003884]'
                                                            }`}
                                                        >
                                                            {getInitials(u.name)}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-[#1c2d42] flex items-center gap-1.5">
                                                                <span>{u.name}</span>
                                                                {isCurrent && (
                                                                    <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-medium text-slate-600 border border-slate-200">
                                                                        You
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-[11px] text-slate-500 font-mono">
                                                                {u.employee_id || 'APL-EMP-NA'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Role Badge */}
                                                <td className="py-3 px-3">
                                                    {isSA ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200">
                                                            <Shield className="h-3 w-3 text-purple-600" />
                                                            Superadmin
                                                        </span>
                                                    ) : isAdm ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#0070f2] border border-blue-200">
                                                            <ShieldCheck className="h-3 w-3 text-[#0070f2]" />
                                                            Admin (Full Ops)
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700 border border-teal-200">
                                                            <UserCheck className="h-3 w-3 text-teal-600" />
                                                            Employee (PR Requester)
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Department & Designation */}
                                                <td className="py-3 px-3">
                                                    <div className="font-medium text-[#1c2d42]">
                                                        {u.department?.name || 'General Operations'}
                                                    </div>
                                                    <div className="text-[11px] text-[#556b82]">
                                                        {u.designation || 'Staff Member'}
                                                    </div>
                                                </td>

                                                {/* Plant Facility & Purchasing Group */}
                                                <td className="py-3 px-3">
                                                    <div className="text-xs font-medium text-[#1c2d42] max-w-[200px] truncate" title={u.plant || 'Plant Facility'}>
                                                        {u.plant || '1200 - Dibrugarh Manufacturing Plant'}
                                                    </div>
                                                    {u.purchasing_group ? (
                                                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                                            <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200">
                                                                PG: {u.purchasing_group}
                                                            </span>
                                                            <span className="text-[11px] text-[#556b82] truncate max-w-[130px]" title={u.purchasing_group_detail?.description || u.purchasing_group_detail?.name || ''}>
                                                                {u.purchasing_group_detail?.description || u.purchasing_group_detail?.name || ''}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="mt-0.5 text-[10px] text-slate-400 italic">
                                                            No Purchase Group
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Contact */}
                                                <td className="py-3 px-3">
                                                    <div className="text-xs text-[#1c2d42] truncate max-w-[170px]" title={u.email}>
                                                        {u.email}
                                                    </div>
                                                    {u.phone && (
                                                        <div className="text-[11px] text-slate-500 font-mono">
                                                            {u.phone}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Active Status */}
                                                <td className="py-3 px-3 text-center">
                                                    {u.is_active ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                                            Inactive
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="py-3 px-3 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {/* Edit Button */}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEdit(u)}
                                                            className="flex items-center gap-1 rounded border border-[#d9e2ec] bg-white px-2 py-1 text-[11px] font-semibold text-[#1c2d42] hover:bg-slate-50 transition-colors"
                                                            title="Edit User Details"
                                                        >
                                                            <Edit2 className="h-3 w-3 text-[#0070f2]" />
                                                            <span>Edit</span>
                                                        </button>

                                                        {/* Status Toggle Button */}
                                                        {!isCurrent && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleStatus(u)}
                                                                className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold border transition-colors ${
                                                                    u.is_active
                                                                        ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                                                        : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                                                }`}
                                                                title={u.is_active ? 'Deactivate user access' : 'Activate user access'}
                                                            >
                                                                {u.is_active ? (
                                                                    <>
                                                                        <ToggleRight className="h-3 w-3 text-amber-700" />
                                                                        <span>Deactivate</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <ToggleLeft className="h-3 w-3 text-emerald-700" />
                                                                        <span>Activate</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        )}

                                                        {/* Delete Button */}
                                                        {!isCurrent && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setDeletingUser(u)}
                                                                className="flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                                                                title="Delete User"
                                                            >
                                                                <Trash2 className="h-3 w-3 text-rose-600" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* CREATE USER MODAL */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
                    <div className="relative w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-[#d9e2ec] px-6 py-4 bg-[#f8fafc]">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0070f2] text-white">
                                    <UserPlus className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-[#1c2d42]">Create New User Account</h2>
                                    <p className="text-xs text-[#556b82]">
                                        Define user role, department, credentials, and plant details
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCreateOpen(false)}
                                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Name */}
                                <div className="space-y-1">
                                    <label className="font-semibold text-[#1c2d42]">
                                        Full Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={createForm.name}
                                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                        placeholder="e.g. Pranab Barua"
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                    />
                                    {createErrors.name && (
                                        <p className="text-[11px] text-rose-600">{createErrors.name}</p>
                                    )}
                                </div>

                                {/* Email */}
                                <div className="space-y-1">
                                    <label className="font-semibold text-[#1c2d42]">
                                        Email Address <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={createForm.email}
                                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                        placeholder="user@assampetrochemicals.co.in"
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                    />
                                    {createErrors.email && (
                                        <p className="text-[11px] text-rose-600">{createErrors.email}</p>
                                    )}
                                </div>

                                {/* Password */}
                                <div className="space-y-1">
                                    <label className="font-semibold text-[#1c2d42]">
                                        Password <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={createForm.password}
                                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                        placeholder="Minimum 6 characters"
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                    />
                                    {createErrors.password && (
                                        <p className="text-[11px] text-rose-600">{createErrors.password}</p>
                                    )}
                                </div>

                                {/* System Role */}
                                <div className="space-y-1">
                                    <label className="font-semibold text-[#1c2d42]">
                                        System Role <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={createForm.role_id}
                                        onChange={(e) => setCreateForm({ ...createForm, role_id: e.target.value })}
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] bg-white px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:outline-none"
                                    >
                                        <option value="">Select Role</option>
                                        {roles.map((r) => (
                                            <option key={r.id} value={r.id}>
                                                {r.display_name} ({r.name === 'employee' ? 'PR Requester Only' : r.name === 'admin' ? 'Procurement & SAP' : 'Full Admin'})
                                            </option>
                                        ))}
                                    </select>
                                    {createErrors.role_id && (
                                        <p className="text-[11px] text-rose-600">{createErrors.role_id}</p>
                                    )}
                                </div>

                                {/* Department */}
                                <div className="space-y-1">
                                    <label className="font-semibold text-[#1c2d42]">Department</label>
                                    <select
                                        value={createForm.department_id}
                                        onChange={(e) => setCreateForm({ ...createForm, department_id: e.target.value })}
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] bg-white px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:outline-none"
                                    >
                                        <option value="">Select Department (Optional)</option>
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.name} ({d.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Employee ID */}
                                <div className="space-y-1">
                                    <label className="font-semibold text-[#1c2d42]">
                                        Employee ID (Auto if empty)
                                    </label>
                                    <input
                                        type="text"
                                        value={createForm.employee_id}
                                        onChange={(e) => setCreateForm({ ...createForm, employee_id: e.target.value })}
                                        placeholder="e.g. APL-EMP-1025"
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:outline-none"
                                    />
                                    {createErrors.employee_id && (
                                        <p className="text-[11px] text-rose-600">{createErrors.employee_id}</p>
                                    )}
                                </div>

                                {/* Designation */}
                                <div className="space-y-1">
                                    <label className="font-semibold text-[#1c2d42]">Job Designation</label>
                                    <input
                                        type="text"
                                        value={createForm.designation}
                                        onChange={(e) => setCreateForm({ ...createForm, designation: e.target.value })}
                                        placeholder="e.g. Maintenance Engineer / Plant Lead"
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:outline-none"
                                    />
                                </div>

                                {/* Phone */}
                                <div className="space-y-1">
                                    <label className="font-semibold text-[#1c2d42]">Contact Phone</label>
                                    <input
                                        type="text"
                                        value={createForm.phone}
                                        onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                                        placeholder="e.g. +91 94350 12345"
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Plant Location & Purchasing Group Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Plant Location Dropdown */}
                                <div className="space-y-1">
                                    <label className="font-semibold text-[#1c2d42]">
                                        Assam Petro-Chemicals Plant Facility <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={createForm.plant}
                                        onChange={(e) => setCreateForm({ ...createForm, plant: e.target.value })}
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] bg-white px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:outline-none"
                                    >
                                        <option value="">Select Plant Facility</option>
                                        {availablePlants.map((plant) => (
                                            <option key={plant.code} value={plant.value}>
                                                {plant.name}
                                            </option>
                                        ))}
                                    </select>
                                    {createErrors.plant && (
                                        <p className="text-[11px] text-rose-600">{createErrors.plant}</p>
                                    )}
                                    <p className="text-[10px] text-slate-500">
                                        Source: Purchasing Organization plant list.
                                    </p>
                                </div>

                                {/* Purchasing Group Dropdown */}
                                <div className="space-y-1">
                                    <label className="font-semibold text-[#1c2d42]">
                                        Purchase Group (SAP EKGRP)
                                    </label>
                                    <select
                                        value={createForm.purchasing_group}
                                        onChange={(e) => setCreateForm({ ...createForm, purchasing_group: e.target.value })}
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] bg-white px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:outline-none"
                                    >
                                        <option value="">Select Purchase Group (Optional)</option>
                                        {purchasingGroups.map((pg) => (
                                            <option key={pg.id || pg.code} value={pg.code}>
                                                {pg.name}
                                            </option>
                                        ))}
                                    </select>
                                    {createErrors.purchasing_group && (
                                        <p className="text-[11px] text-rose-600">{createErrors.purchasing_group}</p>
                                    )}
                                    <p className="text-[10px] text-slate-500">
                                        Assigned SAP EKGRP for purchase requisition tracking.
                                    </p>
                                </div>
                            </div>

                            {/* Active Switch */}
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="create_is_active"
                                    checked={createForm.is_active}
                                    onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
                                    className="h-4 w-4 rounded border-[#d9e2ec] text-[#0070f2] focus:ring-[#0070f2]"
                                />
                                <label htmlFor="create_is_active" className="font-semibold text-[#1c2d42] cursor-pointer">
                                    Account is Active & Allowed to Sign In
                                </label>
                            </div>

                            {/* Modal Actions */}
                            <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="flex items-center gap-1.5 rounded-md bg-[#0070f2] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2] active:bg-[#003884] disabled:opacity-50 transition-colors"
                                >
                                    {isCreating && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                                    <span>{isCreating ? 'Creating User...' : 'Create User Account'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT USER MODAL */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
                    <div className="relative w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-[#d9e2ec] px-6 py-4 bg-[#f8fafc]">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0070f2] text-white">
                                    <Edit2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-[#1c2d42]">Edit User: {editingUser.name}</h2>
                                    <p className="text-xs text-[#556b82]">
                                        Update role permissions, department assignment, or credentials
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingUser(null)}
                                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleEditSubmit} className="p-6 space-y-4 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Name */}
                                <div className="space-y-1">
                                    <label className="font-semibold text-[#1c2d42]">
                                        Full Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:outline-none"
                                    />
                                    {editErrors.name && (
                                        <p className="text-[11px] text-rose-600">{editErrors.name}</p>
                                    )}
                                </div>

                                {/* Email */}
                                <div className="space-y-1">
                                    <label className="font-semibold text-[#1c2d42]">
                                        Email Address <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:outline-none"
                                    />
                                    {editErrors.email && (
                                        <p className="text-[11px] text-rose-600">{editErrors.email}</p>
                                    )}
                                </div>

                                {/* Password (optional) */}
                                <div className="space-y-1">
                                    <label className="font-semibold text-[#1c2d42]">
                                        Reset Password (Optional)
                                    </label>
                                    <input
                                        type="password"
                                        minLength={6}
                                        value={editForm.password}
                                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                        placeholder="Leave blank to keep unchanged"
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:outline-none"
                                    />
                                    {editErrors.password && (
                                        <p className="text-[11px] text-rose-600">{editErrors.password}</p>
                                    )}
                                </div>

                                {/* System Role */}
                                <div className="space-y-1">
                                    <label className="font-semibold text-[#1c2d42]">
                                        System Role <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={editForm.role_id}
                                        onChange={(e) => setEditForm({ ...editForm, role_id: e.target.value })}
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] bg-white px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:outline-none"
                                    >
                                        <option value="">Select Role</option>
                                        {roles.map((r) => (
                                            <option key={r.id} value={r.id}>
                                                {r.display_name} ({r.name === 'employee' ? 'PR Requester Only' : r.name === 'admin' ? 'Procurement & SAP' : 'Full Admin'})
                                            </option>
                                        ))}
                                    </select>
                                    {editErrors.role_id && (
                                        <p className="text-[11px] text-rose-600">{editErrors.role_id}</p>
                                    )}
                                </div>

                                {/* Department */}
                                <div className="space-y-1">
                                    <label className="font-semibold text-[#1c2d42]">Department</label>
                                    <select
                                        value={editForm.department_id}
                                        onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })}
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] bg-white px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:outline-none"
                                    >
                                        <option value="">Select Department (Optional)</option>
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.name} ({d.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Employee ID */}
                                <div className="space-y-1">
                                    <label className="font-semibold text-[#1c2d42]">Employee ID</label>
                                    <input
                                        type="text"
                                        value={editForm.employee_id}
                                        onChange={(e) => setEditForm({ ...editForm, employee_id: e.target.value })}
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:outline-none"
                                    />
                                    {editErrors.employee_id && (
                                        <p className="text-[11px] text-rose-600">{editErrors.employee_id}</p>
                                    )}
                                </div>

                                {/* Designation */}
                                <div className="space-y-1">
                                    <label className="font-semibold text-[#1c2d42]">Job Designation</label>
                                    <input
                                        type="text"
                                        value={editForm.designation}
                                        onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:outline-none"
                                    />
                                </div>

                                {/* Phone */}
                                <div className="space-y-1">
                                    <label className="font-semibold text-[#1c2d42]">Contact Phone</label>
                                    <input
                                        type="text"
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Plant Location & Purchasing Group Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Plant Location Dropdown */}
                                <div className="space-y-1">
                                    <label className="font-semibold text-[#1c2d42]">
                                        Assam Petro-Chemicals Plant Facility <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={editForm.plant}
                                        onChange={(e) => setEditForm({ ...editForm, plant: e.target.value })}
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] bg-white px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:outline-none"
                                    >
                                        <option value="">Select Plant Facility</option>
                                        {availablePlants.map((plant) => (
                                            <option key={plant.code} value={plant.value}>
                                                {plant.name}
                                            </option>
                                        ))}
                                        {editForm.plant && !availablePlants.some((p) => p.value === editForm.plant || p.code === editForm.plant) && (
                                            <option value={editForm.plant}>{editForm.plant}</option>
                                        )}
                                    </select>
                                    {editErrors.plant && (
                                        <p className="text-[11px] text-rose-600">{editErrors.plant}</p>
                                    )}
                                    <p className="text-[10px] text-slate-500">
                                        Source: Purchasing Organization plant list.
                                    </p>
                                </div>

                                {/* Purchasing Group Dropdown */}
                                <div className="space-y-1">
                                    <label className="font-semibold text-[#1c2d42]">
                                        Purchase Group (SAP EKGRP)
                                    </label>
                                    <select
                                        value={editForm.purchasing_group}
                                        onChange={(e) => setEditForm({ ...editForm, purchasing_group: e.target.value })}
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] bg-white px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:outline-none"
                                    >
                                        <option value="">Select Purchase Group (Optional)</option>
                                        {purchasingGroups.map((pg) => (
                                            <option key={pg.id || pg.code} value={pg.code}>
                                                {pg.name}
                                            </option>
                                        ))}
                                        {editForm.purchasing_group && !purchasingGroups.some((pg) => pg.code === editForm.purchasing_group) && (
                                            <option value={editForm.purchasing_group}>{editForm.purchasing_group}</option>
                                        )}
                                    </select>
                                    {editErrors.purchasing_group && (
                                        <p className="text-[11px] text-rose-600">{editErrors.purchasing_group}</p>
                                    )}
                                    <p className="text-[10px] text-slate-500">
                                        Assigned SAP EKGRP for purchase requisition tracking.
                                    </p>
                                </div>
                            </div>

                            {/* Active Switch */}
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="edit_is_active"
                                    checked={editForm.is_active}
                                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                                    className="h-4 w-4 rounded border-[#d9e2ec] text-[#0070f2] focus:ring-[#0070f2]"
                                />
                                <label htmlFor="edit_is_active" className="font-semibold text-[#1c2d42] cursor-pointer">
                                    Account is Active & Allowed to Sign In
                                </label>
                            </div>

                            {/* Modal Actions */}
                            <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdating}
                                    className="flex items-center gap-1.5 rounded-md bg-[#0070f2] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2] active:bg-[#003884] disabled:opacity-50 transition-colors"
                                >
                                    {isUpdating && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                                    <span>{isUpdating ? 'Saving Changes...' : 'Save Changes'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CONFIRM DELETE MODAL */}
            {deletingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                    <div className="relative w-full max-w-md rounded-xl border border-rose-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-3 text-rose-600">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100">
                                <Trash2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-[#1c2d42]">Delete User Account</h3>
                                <p className="text-xs text-slate-500">This action cannot be undone.</p>
                            </div>
                        </div>

                        <p className="mt-4 text-xs text-slate-600">
                            Are you sure you want to delete user <strong className="text-[#1c2d42]">{deletingUser.name}</strong> ({deletingUser.email})?
                        </p>

                        <div className="mt-6 flex items-center justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setDeletingUser(null)}
                                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                className="rounded-md bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition-colors"
                            >
                                Delete User
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* IMPORT USERS FROM EXCEL MODAL */}
            {isImportOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="import-dialog-title"
                >
                    <div className="relative w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-[#d9e2ec] px-6 py-4 bg-[#f8fafc]">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0070f2] text-white shadow-2xs">
                                    <FileSpreadsheet className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 id="import-dialog-title" className="text-base font-bold text-[#1c2d42]">
                                        Batch Import Users from Excel
                                    </h2>
                                    <p className="text-xs text-[#556b82]">
                                        Upload a populated Excel or CSV spreadsheet to create users and credentials
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsImportOpen(false);
                                    setSelectedFile(null);
                                    setImportError(null);
                                }}
                                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                aria-label="Close dialog"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body / Form */}
                        <form onSubmit={handleImportSubmit} className="p-6 space-y-5 text-xs">
                            {/* Template Download & Instructions Card */}
                            <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div>
                                        <h4 className="font-bold text-[#0070f2] flex items-center gap-1.5">
                                            <FileText className="h-4 w-4" />
                                            Required Template Structure
                                        </h4>
                                        <p className="mt-1 text-[11px] text-[#556b82] leading-relaxed">
                                            Use the official APL template with pre-configured headers and validation reference data.
                                        </p>
                                    </div>
                                    <a
                                        href="/users/template-excel"
                                        download="APL_User_Import_Template.xlsx"
                                        className="inline-flex items-center gap-1.5 rounded-md border border-[#0070f2] bg-white px-3 py-1.5 text-xs font-semibold text-[#0070f2] shadow-2xs hover:bg-[#0070f2] hover:text-white transition-colors shrink-0"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        <span>Download Template (.xlsx)</span>
                                    </a>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] border-t border-blue-100 pt-3 text-slate-600">
                                    <div>
                                        <strong className="text-[#1c2d42]">Mandatory Columns:</strong>
                                        <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-slate-600">
                                            <li>Full Name</li>
                                            <li>Email Address (Unique)</li>
                                            <li>Initial Password (Min 6 chars)</li>
                                            <li>System Role (Employee / Admin / Superadmin)</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <strong className="text-[#1c2d42]">Optional Columns:</strong>
                                        <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-slate-600">
                                            <li>Department Code / Name</li>
                                            <li>Employee ID (Auto-generated if empty)</li>
                                            <li>Plant Facility (Defaults to 1200)</li>
                                            <li>Purchasing Group, Designation, Phone</li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="text-[10px] text-slate-500 bg-white/70 rounded p-2 border border-blue-100">
                                    * Note: Initial passwords will be securely encrypted. Email verification is automatically granted so users can log in immediately upon upload.
                                </div>
                            </div>

                            {/* Drag and Drop File Upload Area */}
                            <div>
                                <label htmlFor="excel_file" className="block font-semibold text-[#1c2d42] mb-1.5">
                                    Select Excel Spreadsheet File <span className="text-rose-500">*</span>
                                </label>

                                <div
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsDragging(true);
                                    }}
                                    onDragLeave={(e) => {
                                        e.preventDefault();
                                        setIsDragging(false);
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsDragging(false);
                                        if (e.dataTransfer.files?.[0]) {
                                            handleFileSelect(e.dataTransfer.files[0]);
                                        }
                                    }}
                                    className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
                                        isDragging
                                            ? 'border-[#0070f2] bg-blue-50/50'
                                            : selectedFile
                                            ? 'border-emerald-300 bg-emerald-50/30'
                                            : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400'
                                    }`}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        id="excel_file"
                                        name="excel_file"
                                        type="file"
                                        accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                                        className="sr-only"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                                handleFileSelect(e.target.files[0]);
                                            }
                                        }}
                                    />

                                    {selectedFile ? (
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                                                <FileSpreadsheet className="h-6 w-6" />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-bold text-[#1c2d42]">{selectedFile.name}</div>
                                                <div className="text-[11px] text-slate-500">
                                                    {(selectedFile.size / 1024).toFixed(1)} KB &bull; Ready to process
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedFile(null);
                                                    if (fileInputRef.current) {
                                                        fileInputRef.current.value = '';
                                                    }
                                                }}
                                                className="ml-4 rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                                                title="Remove file"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-blue-50 text-[#0070f2]">
                                                <UploadCloud className="h-6 w-6" />
                                            </div>
                                            <div className="text-xs text-slate-600">
                                                <span className="font-semibold text-[#0070f2]">Click to choose a file</span> or drag and drop here
                                            </div>
                                            <div className="text-[11px] text-slate-400">
                                                Supports .xlsx, .xls, and .csv (Max 10 MB)
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {importError && (
                                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                                        <span>{importError}</span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsImportOpen(false);
                                        setSelectedFile(null);
                                        setImportError(null);
                                    }}
                                    className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!selectedFile || isImporting}
                                    className="flex items-center gap-1.5 rounded-md bg-[#0070f2] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2] active:bg-[#003884] disabled:opacity-50 transition-colors"
                                >
                                    {isImporting ? (
                                        <>
                                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                            <span>Processing Spreadsheet...</span>
                                        </>
                                    ) : (
                                        <>
                                            <UploadCloud className="h-3.5 w-3.5" />
                                            <span>Upload & Import Users</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </SapAppLayout>
    );
}

UsersIndex.layout = (page: React.ReactNode) => page;
