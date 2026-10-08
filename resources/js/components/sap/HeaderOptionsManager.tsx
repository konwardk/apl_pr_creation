import React, { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
import {
    SlidersHorizontal,
    Plus,
    Search,
    Edit2,
    Trash2,
    ToggleLeft,
    ToggleRight,
    CheckCircle2,
    AlertCircle,
    X,
    Tag,
    Layers,
    Info,
    RefreshCw,
} from 'lucide-react';
import type { HeaderOption } from '@/types';

interface HeaderOptionsManagerProps {
    headerOptions?: HeaderOption[];
    isSuperAdmin?: boolean;
}

export default function HeaderOptionsManager({
    headerOptions = [],
    isSuperAdmin = true,
}: HeaderOptionsManagerProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    // Modal states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingOption, setEditingOption] = useState<HeaderOption | null>(null);
    const [deletingOption, setDeletingOption] = useState<HeaderOption | null>(null);

    // Form states for Create
    const [createForm, setCreateForm] = useState({
        name: '',
        code: '',
        description: '',
        is_active: true,
    });
    const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
    const [isCreating, setIsCreating] = useState(false);

    // Form states for Edit
    const [editForm, setEditForm] = useState({
        name: '',
        code: '',
        description: '',
        is_active: true,
    });
    const [editErrors, setEditErrors] = useState<Record<string, string>>({});
    const [isUpdating, setIsUpdating] = useState(false);

    // Deleting state
    const [isDeleting, setIsDeleting] = useState(false);

    // Filtered options
    const filteredOptions = useMemo(() => {
        return headerOptions.filter((opt) => {
            const matchesStatus =
                statusFilter === 'all'
                    ? true
                    : statusFilter === 'active'
                    ? opt.is_active
                    : !opt.is_active;

            const q = searchQuery.toLowerCase().trim();
            const matchesQuery =
                !q ||
                opt.name.toLowerCase().includes(q) ||
                opt.code.toLowerCase().includes(q) ||
                (opt.description && opt.description.toLowerCase().includes(q));

            return matchesStatus && matchesQuery;
        });
    }, [headerOptions, searchQuery, statusFilter]);

    const activeCount = useMemo(() => headerOptions.filter((o) => o.is_active).length, [headerOptions]);
    const inactiveCount = useMemo(() => headerOptions.filter((o) => !o.is_active).length, [headerOptions]);

    // Handle Create Submit
    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setCreateErrors({});
        setIsCreating(true);

        router.post('/header-options', createForm, {
            preserveScroll: true,
            onSuccess: () => {
                setIsCreateOpen(false);
                setCreateForm({
                    name: '',
                    code: '',
                    description: '',
                    is_active: true,
                });
                setIsCreating(false);
            },
            onError: (errs) => {
                setCreateErrors(errs);
                setIsCreating(false);
            },
        });
    };

    // Open Edit Modal
    const handleOpenEdit = (opt: HeaderOption) => {
        setEditingOption(opt);
        setEditForm({
            name: opt.name,
            code: opt.code,
            description: opt.description || '',
            is_active: opt.is_active,
        });
        setEditErrors({});
    };

    // Handle Edit Submit
    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingOption) return;

        setEditErrors({});
        setIsUpdating(true);

        router.put(`/header-options/${editingOption.id}`, editForm, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingOption(null);
                setIsUpdating(false);
            },
            onError: (errs) => {
                setEditErrors(errs);
                setIsUpdating(false);
            },
        });
    };

    // Handle Delete Submit
    const handleDeleteSubmit = () => {
        if (!deletingOption) return;

        setIsDeleting(true);
        router.delete(`/header-options/${deletingOption.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeletingOption(null);
                setIsDeleting(false);
            },
            onError: () => {
                setIsDeleting(false);
            },
        });
    };

    // Handle Quick Toggle Status
    const handleToggleStatus = (opt: HeaderOption) => {
        router.post(`/header-options/${opt.id}/toggle-status`, {}, {
            preserveScroll: true,
        });
    };

    return (
        <div className="space-y-6">
            {/* Header & Description Card */}
            <div className="rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-xs">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0070f2] text-white shadow-xs">
                            <SlidersHorizontal className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold tracking-tight text-[#1c2d42]">
                                    PR Header Options Management
                                </h2>
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-[#0070f2]">
                                    Master Data (Model: HeaderOption)
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-[#556b82]">
                                Add and manage requisition classification options. Options created here immediately populate the <strong>Header Option</strong> dropdown on the PR creation page for all requesters.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isSuperAdmin && (
                            <button
                                type="button"
                                onClick={() => {
                                    setCreateErrors({});
                                    setCreateForm({
                                        name: '',
                                        code: '',
                                        description: '',
                                        is_active: true,
                                    });
                                    setIsCreateOpen(true);
                                }}
                                className="flex items-center gap-2 rounded-md bg-[#0070f2] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#0057c2] active:bg-[#003884]"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Add Header Option</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Total Options */}
                <div className="rounded-xl border border-[#d9e2ec] bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between text-[#556b82]">
                        <span className="text-xs font-semibold uppercase tracking-wider">
                            Total Header Options
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                            <Tag className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-bold tracking-tight text-[#1c2d42]">
                        {headerOptions.length}
                    </div>
                    <div className="mt-1 text-[11px] text-[#556b82]">
                        Table: <code className="font-mono text-[#0070f2]">header_options</code>
                    </div>
                </div>

                {/* Active Options */}
                <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between text-emerald-800">
                        <span className="text-xs font-semibold uppercase tracking-wider">
                            Active in PR Dropdown
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-700">
                        {activeCount}
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-700">
                        Visible on Requisition Create Page
                    </div>
                </div>

                {/* Inactive Options */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between text-[#556b82]">
                        <span className="text-xs font-semibold uppercase tracking-wider">
                            Inactive / Hidden
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                            <ToggleLeft className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-bold tracking-tight text-slate-600">
                        {inactiveCount}
                    </div>
                    <div className="mt-1 text-[11px] text-[#556b82]">
                        Excluded from requester selection
                    </div>
                </div>
            </div>

            {/* Filter and Table Section */}
            <div className="rounded-xl border border-[#d9e2ec] bg-white shadow-xs overflow-hidden">
                {/* Search & Status Filter Bar */}
                <div className="border-b border-[#d9e2ec] bg-[#f8fafc] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8c9ba5]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by option name, code or description..."
                            className="h-9 w-full rounded-md border border-[#d9e2ec] bg-white pl-9 pr-4 text-xs text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex rounded-md border border-[#d9e2ec] bg-white p-0.5 text-xs font-medium">
                            <button
                                type="button"
                                onClick={() => setStatusFilter('all')}
                                className={`px-2.5 py-1 rounded transition-colors ${
                                    statusFilter === 'all'
                                        ? 'bg-[#0070f2] text-white font-semibold'
                                        : 'text-[#556b82] hover:text-[#1c2d42]'
                                }`}
                            >
                                All ({headerOptions.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('active')}
                                className={`px-2.5 py-1 rounded transition-colors ${
                                    statusFilter === 'active'
                                        ? 'bg-emerald-600 text-white font-semibold'
                                        : 'text-[#556b82] hover:text-[#1c2d42]'
                                }`}
                            >
                                Active ({activeCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('inactive')}
                                className={`px-2.5 py-1 rounded transition-colors ${
                                    statusFilter === 'inactive'
                                        ? 'bg-slate-600 text-white font-semibold'
                                        : 'text-[#556b82] hover:text-[#1c2d42]'
                                }`}
                            >
                                Inactive ({inactiveCount})
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-[#d9e2ec] bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-[#556b82]">
                                <th className="py-3 px-4">Code</th>
                                <th className="py-3 px-4">Option Name</th>
                                <th className="py-3 px-4">Description</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Created By</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredOptions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-[#556b82]">
                                        <div className="flex flex-col items-center justify-center">
                                            <SlidersHorizontal className="h-10 w-10 text-slate-300 mb-2" />
                                            <p className="font-semibold text-sm text-[#1c2d42]">No Header Options Found</p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {searchQuery
                                                    ? 'No options matched your search query.'
                                                    : 'No options have been created yet. Click "Add Header Option" to create one.'}
                                            </p>
                                            {isSuperAdmin && !searchQuery && (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsCreateOpen(true)}
                                                    className="mt-3 flex items-center gap-1.5 rounded-md bg-[#0070f2] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0057c2]"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                    <span>Create First Option</span>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredOptions.map((opt) => (
                                    <tr key={opt.id} className="hover:bg-slate-50/70 transition-colors">
                                        {/* Code */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <span className="font-mono font-bold text-xs bg-blue-50 text-[#0057c2] border border-blue-200 px-2 py-0.5 rounded">
                                                {opt.code}
                                            </span>
                                        </td>

                                        {/* Name */}
                                        <td className="py-3 px-4">
                                            <div className="font-semibold text-[#1c2d42]">
                                                {opt.name}
                                            </div>
                                        </td>

                                        {/* Description */}
                                        <td className="py-3 px-4 max-w-xs truncate text-[#556b82]">
                                            {opt.description || (
                                                <span className="text-slate-400 italic">No description</span>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleStatus(opt)}
                                                title="Click to toggle status"
                                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                                                    opt.is_active
                                                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                            >
                                                {opt.is_active ? (
                                                    <>
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        <span>Active</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <AlertCircle className="h-3 w-3" />
                                                        <span>Inactive</span>
                                                    </>
                                                )}
                                            </button>
                                        </td>

                                        {/* Created By */}
                                        <td className="py-3 px-4 whitespace-nowrap text-[#556b82]">
                                            {opt.creator?.name || 'Superadmin'}
                                        </td>

                                        {/* Actions */}
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleStatus(opt)}
                                                    className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                                                    title={opt.is_active ? 'Deactivate option' : 'Activate option'}
                                                >
                                                    {opt.is_active ? (
                                                        <ToggleRight className="h-4 w-4 text-emerald-600" />
                                                    ) : (
                                                        <ToggleLeft className="h-4 w-4 text-slate-400" />
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEdit(opt)}
                                                    className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#0070f2] transition-colors"
                                                    title="Edit Option"
                                                >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeletingOption(opt)}
                                                    className="rounded p-1 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                                    title="Delete Option"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Count */}
                <div className="border-t border-[#d9e2ec] bg-[#f8fafc] px-4 py-2 text-[11px] text-[#556b82] flex items-center justify-between">
                    <span>
                        Showing {filteredOptions.length} of {headerOptions.length} header options
                    </span>
                    <span className="font-mono text-slate-400">
                        SAP Header Field Mapping: header_option_id
                    </span>
                </div>
            </div>

            {/* MODAL: CREATE HEADER OPTION */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
                    <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-[#d9e2ec] px-6 py-4 bg-[#f8fafc]">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0070f2] text-white">
                                    <Plus className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-[#1c2d42]">Add New Header Option</h3>
                                    <p className="text-[11px] text-[#556b82]">Configured option will display in PR creation dropdown</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCreateOpen(false)}
                                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
                            {/* Option Name */}
                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                    Option Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                    placeholder="e.g. Operational Expenditure (OPEX)"
                                    className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                    required
                                />
                                {createErrors.name && (
                                    <p className="mt-1 text-[11px] text-rose-600">{createErrors.name}</p>
                                )}
                            </div>

                            {/* Option Code */}
                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                    Option Code <span className="text-slate-400 font-normal">(Optional - auto-generated if left empty)</span>
                                </label>
                                <input
                                    type="text"
                                    value={createForm.code}
                                    onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                                    placeholder="e.g. OPEX, CAPEX-01"
                                    className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 font-mono text-xs text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none uppercase"
                                />
                                {createErrors.code && (
                                    <p className="mt-1 text-[11px] text-rose-600">{createErrors.code}</p>
                                )}
                                <span className="mt-1 block text-[10px] text-[#556b82]">
                                    Unique uppercase identifier code for SAP indexing
                                </span>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                    Description <span className="text-slate-400 font-normal">(Optional)</span>
                                </label>
                                <textarea
                                    rows={3}
                                    value={createForm.description}
                                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                    placeholder="Explain when this option should be selected by requesters..."
                                    className="w-full rounded-md border border-[#d9e2ec] p-2.5 text-xs text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                />
                                {createErrors.description && (
                                    <p className="mt-1 text-[11px] text-rose-600">{createErrors.description}</p>
                                )}
                            </div>

                            {/* Status */}
                            <div className="pt-2 border-t border-slate-100">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={createForm.is_active}
                                        onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
                                        className="h-4 w-4 rounded border-slate-300 text-[#0070f2] focus:ring-[#0070f2]"
                                    />
                                    <span className="text-xs font-medium text-[#1c2d42]">
                                        Active & Visible in Requisition Dropdown
                                    </span>
                                </label>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="rounded-md border border-[#d9e2ec] bg-white px-3.5 py-2 text-xs font-semibold text-[#1c2d42] hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="flex items-center gap-1.5 rounded-md bg-[#0070f2] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2] disabled:opacity-50 transition-colors"
                                >
                                    {isCreating && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                                    <span>{isCreating ? 'Saving...' : 'Save Option'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: EDIT HEADER OPTION */}
            {editingOption && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
                    <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-[#d9e2ec] px-6 py-4 bg-[#f8fafc]">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0070f2] text-white">
                                    <Edit2 className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-[#1c2d42]">Edit Header Option</h3>
                                    <p className="text-[11px] text-[#556b82]">Update option details and active status</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingOption(null)}
                                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                            {/* Option Name */}
                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                    Option Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                    required
                                />
                                {editErrors.name && (
                                    <p className="mt-1 text-[11px] text-rose-600">{editErrors.name}</p>
                                )}
                            </div>

                            {/* Option Code */}
                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                    Option Code <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editForm.code}
                                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                                    className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 font-mono text-xs text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none uppercase"
                                    required
                                />
                                {editErrors.code && (
                                    <p className="mt-1 text-[11px] text-rose-600">{editErrors.code}</p>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                    Description <span className="text-slate-400 font-normal">(Optional)</span>
                                </label>
                                <textarea
                                    rows={3}
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    className="w-full rounded-md border border-[#d9e2ec] p-2.5 text-xs text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                />
                                {editErrors.description && (
                                    <p className="mt-1 text-[11px] text-rose-600">{editErrors.description}</p>
                                )}
                            </div>

                            {/* Status */}
                            <div className="pt-2 border-t border-slate-100">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editForm.is_active}
                                        onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                                        className="h-4 w-4 rounded border-slate-300 text-[#0070f2] focus:ring-[#0070f2]"
                                    />
                                    <span className="text-xs font-medium text-[#1c2d42]">
                                        Active & Visible in Requisition Dropdown
                                    </span>
                                </label>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setEditingOption(null)}
                                    className="rounded-md border border-[#d9e2ec] bg-white px-3.5 py-2 text-xs font-semibold text-[#1c2d42] hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdating}
                                    className="flex items-center gap-1.5 rounded-md bg-[#0070f2] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2] disabled:opacity-50 transition-colors"
                                >
                                    {isUpdating && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                                    <span>{isUpdating ? 'Saving...' : 'Save Changes'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: DELETE HEADER OPTION */}
            {deletingOption && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
                    <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 shrink-0">
                                <Trash2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[#1c2d42]">Delete Header Option</h3>
                                <p className="text-xs text-[#556b82]">This action cannot be undone.</p>
                            </div>
                        </div>

                        <p className="text-xs text-[#556b82] mb-5">
                            Are you sure you want to permanently delete header option{' '}
                            <strong className="text-[#1c2d42]">"{deletingOption.name}"</strong> ({deletingOption.code})? Existing purchase requisitions will retain historical reference or have this field unassigned.
                        </p>

                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setDeletingOption(null)}
                                className="rounded-md border border-[#d9e2ec] bg-white px-3.5 py-2 text-xs font-semibold text-[#1c2d42] hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteSubmit}
                                disabled={isDeleting}
                                className="flex items-center gap-1.5 rounded-md bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 transition-colors"
                            >
                                {isDeleting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                                <span>{isDeleting ? 'Deleting...' : 'Delete Option'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
