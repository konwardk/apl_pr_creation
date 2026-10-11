import React, { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
import {
    Boxes,
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
import type { ItemCategory } from '@/types';

interface ItemCategoriesManagerProps {
    itemCategories?: ItemCategory[];
    isSuperAdmin?: boolean;
}

export default function ItemCategoriesManager({
    itemCategories = [],
    isSuperAdmin = true,
}: ItemCategoriesManagerProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    // Modal states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ItemCategory | null>(null);
    const [deletingCategory, setDeletingCategory] = useState<ItemCategory | null>(null);

    // Form states for Create
    const [createForm, setCreateForm] = useState({
        code: '',
        name: '',
        description: '',
        is_active: true,
    });
    const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
    const [isCreating, setIsCreating] = useState(false);

    // Form states for Edit
    const [editForm, setEditForm] = useState({
        code: '',
        name: '',
        description: '',
        is_active: true,
    });
    const [editErrors, setEditErrors] = useState<Record<string, string>>({});
    const [isUpdating, setIsUpdating] = useState(false);

    // Deleting state
    const [isDeleting, setIsDeleting] = useState(false);

    // Filtered categories
    const filteredCategories = useMemo(() => {
        return itemCategories.filter((cat) => {
            const matchesStatus =
                statusFilter === 'all'
                    ? true
                    : statusFilter === 'active'
                    ? cat.is_active
                    : !cat.is_active;

            const q = searchQuery.toLowerCase().trim();
            const matchesQuery =
                !q ||
                cat.code.toLowerCase().includes(q) ||
                cat.name.toLowerCase().includes(q) ||
                (cat.description && cat.description.toLowerCase().includes(q));

            return matchesStatus && matchesQuery;
        });
    }, [itemCategories, searchQuery, statusFilter]);

    const activeCount = useMemo(() => itemCategories.filter((c) => c.is_active).length, [itemCategories]);
    const inactiveCount = useMemo(() => itemCategories.filter((c) => !c.is_active).length, [itemCategories]);

    // Handle Create Submit
    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setCreateErrors({});
        setIsCreating(true);

        router.post('/item-categories', createForm, {
            preserveScroll: true,
            onSuccess: () => {
                setIsCreateOpen(false);
                setCreateForm({
                    code: '',
                    name: '',
                    description: '',
                    is_active: true,
                });
                setIsCreating(false);
            },
            onError: (errors: any) => {
                setCreateErrors(errors);
                setIsCreating(false);
            },
        });
    };

    // Handle Edit Open
    const handleEditOpen = (cat: ItemCategory) => {
        setEditingCategory(cat);
        setEditForm({
            code: cat.code,
            name: cat.name,
            description: cat.description || '',
            is_active: cat.is_active,
        });
        setEditErrors({});
    };

    // Handle Edit Submit
    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCategory) return;
        setEditErrors({});
        setIsUpdating(true);

        router.put(`/item-categories/${editingCategory.id}`, editForm, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingCategory(null);
                setIsUpdating(false);
            },
            onError: (errors: any) => {
                setEditErrors(errors);
                setIsUpdating(false);
            },
        });
    };

    // Handle Delete Submit
    const handleDeleteSubmit = () => {
        if (!deletingCategory) return;
        setIsDeleting(true);

        router.delete(`/item-categories/${deletingCategory.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeletingCategory(null);
                setIsDeleting(false);
            },
            onError: () => {
                setIsDeleting(false);
            },
        });
    };

    // Handle Quick Toggle Status
    const handleToggleStatus = (cat: ItemCategory) => {
        router.post(`/item-categories/${cat.id}/toggle-status`, {}, {
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
                            <Boxes className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold tracking-tight text-[#1c2d42]">
                                    Item Categories Management
                                </h2>
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-[#0070f2]">
                                    Master Data (Model: ItemCategory)
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-[#556b82]">
                                Manage SAP PR item categories (Standard, Consignment, Subcontracting, Service, etc.). Categories defined here immediately populate the <strong>Item Category (F4 Search Help)</strong> during line item creation.
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
                                        code: '',
                                        name: '',
                                        description: '',
                                        is_active: true,
                                    });
                                    setIsCreateOpen(true);
                                }}
                                className="flex items-center gap-2 rounded-md bg-[#0070f2] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#0057c2] active:bg-[#003884]"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Add Item Category</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Total Categories */}
                <div className="rounded-xl border border-[#d9e2ec] bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between text-[#556b82]">
                        <span className="text-xs font-semibold uppercase tracking-wider">
                            Total Item Categories
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                            <Boxes className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-bold tracking-tight text-[#1c2d42]">
                        {itemCategories.length}
                    </div>
                    <div className="mt-1 text-[11px] text-[#556b82]">
                        Table: <code className="font-mono text-[#0070f2]">item_categories</code>
                    </div>
                </div>

                {/* Active Categories */}
                <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between text-emerald-800">
                        <span className="text-xs font-semibold uppercase tracking-wider">
                            Active in F4 Search Help
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-700">
                        {activeCount}
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-700">
                        Visible on PR Line Items F4 Search Help
                    </div>
                </div>

                {/* Inactive Categories */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between text-slate-600">
                        <span className="text-xs font-semibold uppercase tracking-wider">
                            Disabled Categories
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                            <AlertCircle className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-bold tracking-tight text-slate-700">
                        {inactiveCount}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                        Hidden from search help modal
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col gap-3 rounded-xl border border-[#d9e2ec] bg-white p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search item categories by code, name, or description..."
                        className="h-8 w-full rounded-md border border-[#d9e2ec] bg-white pl-8 pr-3 text-xs text-[#1c2d42] placeholder-slate-400 focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                    />
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                            statusFilter === 'all'
                                ? 'bg-[#0070f2] text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        All ({itemCategories.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('active')}
                        className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                            statusFilter === 'active'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Active ({activeCount})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('inactive')}
                        className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                            statusFilter === 'inactive'
                                ? 'bg-slate-700 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Inactive ({inactiveCount})
                    </button>
                </div>
            </div>

            {/* Item Categories Data Table */}
            <div className="overflow-hidden rounded-xl border border-[#d9e2ec] bg-white shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#1c2d42]">
                        <thead className="border-b border-[#d9e2ec] bg-[#f8fafc] text-[11px] font-semibold uppercase tracking-wider text-[#556b82]">
                            <tr>
                                <th scope="col" className="px-4 py-3">Code</th>
                                <th scope="col" className="px-4 py-3">Category Name</th>
                                <th scope="col" className="px-4 py-3">Description</th>
                                <th scope="col" className="px-4 py-3 text-center">Status</th>
                                <th scope="col" className="px-4 py-3">Created By</th>
                                <th scope="col" className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredCategories.length > 0 ? (
                                filteredCategories.map((cat) => (
                                    <tr
                                        key={cat.id}
                                        className="transition-colors hover:bg-slate-50/80"
                                    >
                                        {/* Code */}
                                        <td className="whitespace-nowrap px-4 py-3 font-medium">
                                            <span className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50/80 px-2.5 py-1 font-mono text-[11px] font-bold text-indigo-700">
                                                <Boxes className="h-3 w-3" />
                                                {cat.code}
                                            </span>
                                        </td>

                                        {/* Name */}
                                        <td className="px-4 py-3 font-semibold text-[#1c2d42]">
                                            {cat.name}
                                        </td>

                                        {/* Description */}
                                        <td className="max-w-md px-4 py-3 text-slate-600">
                                            {cat.description || (
                                                <span className="text-slate-400 italic">
                                                    No operational description specified
                                                </span>
                                            )}
                                        </td>

                                        {/* Status Toggle */}
                                        <td className="whitespace-nowrap px-4 py-3 text-center">
                                            {isSuperAdmin ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleStatus(cat)}
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                                                        cat.is_active
                                                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                            : 'border border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                    }`}
                                                    title="Click to toggle active status"
                                                >
                                                    {cat.is_active ? (
                                                        <>
                                                            <ToggleRight className="h-3.5 w-3.5 text-emerald-600" />
                                                            <span>Active</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ToggleLeft className="h-3.5 w-3.5 text-slate-400" />
                                                            <span>Inactive</span>
                                                        </>
                                                    )}
                                                </button>
                                            ) : (
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                        cat.is_active
                                                            ? 'bg-emerald-50 text-emerald-700'
                                                            : 'bg-slate-100 text-slate-500'
                                                    }`}
                                                >
                                                    {cat.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            )}
                                        </td>

                                        {/* Created By */}
                                        <td className="whitespace-nowrap px-4 py-3 text-[11px] text-[#556b82]">
                                            {cat.creator?.name || 'System Initial'}
                                        </td>

                                        {/* Actions */}
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {isSuperAdmin && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditOpen(cat)}
                                                            className="rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                                            title="Edit item category"
                                                        >
                                                            <Edit2 className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeletingCategory(cat)}
                                                            className="rounded p-1 text-rose-600 hover:bg-rose-50 transition-colors"
                                                            title="Delete item category"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="py-12 text-center text-slate-400"
                                    >
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Boxes className="h-8 w-8 text-slate-300" />
                                            <p className="text-xs font-medium text-slate-500">
                                                No item categories found.
                                            </p>
                                            {searchQuery && (
                                                <p className="text-[11px] text-slate-400">
                                                    Try adjusting your search query or clear the filter.
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CREATE MODAL */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                    <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[#d9e2ec] pb-3 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0070f2] text-white">
                                    <Plus className="h-4 w-4" />
                                </div>
                                <h3 className="text-sm font-bold text-[#1c2d42]">
                                    Add New Item Category
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCreateOpen(false)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                    Category Code <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={createForm.code}
                                    onChange={(e) =>
                                        setCreateForm({ ...createForm, code: e.target.value })
                                    }
                                    placeholder="e.g. Standard, K, L, S, Z..."
                                    required
                                    className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 font-mono text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                />
                                <p className="mt-1 text-[11px] text-[#556b82]">
                                    Unique SAP Item Category code used in PR line items (e.g., Standard, K, L, S, U, D, B, T).
                                </p>
                                {createErrors.code && (
                                    <p className="mt-1 text-xs text-rose-600 font-medium">{createErrors.code}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                    Category Name / Label <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={createForm.name}
                                    onChange={(e) =>
                                        setCreateForm({ ...createForm, name: e.target.value })
                                    }
                                    placeholder="e.g. Standard (0 / Blank), Consignment..."
                                    required
                                    className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                />
                                {createErrors.name && (
                                    <p className="mt-1 text-xs text-rose-600 font-medium">{createErrors.name}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                    Operational Description
                                </label>
                                <textarea
                                    value={createForm.description}
                                    onChange={(e) =>
                                        setCreateForm({ ...createForm, description: e.target.value })
                                    }
                                    rows={3}
                                    placeholder="Explain the business and procurement purpose of this item category..."
                                    className="w-full rounded-md border border-[#d9e2ec] p-2.5 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                />
                                {createErrors.description && (
                                    <p className="mt-1 text-xs text-rose-600 font-medium">{createErrors.description}</p>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="create_is_active"
                                    checked={createForm.is_active}
                                    onChange={(e) =>
                                        setCreateForm({ ...createForm, is_active: e.target.checked })
                                    }
                                    className="h-4 w-4 rounded border-[#d9e2ec] text-[#0070f2] focus:ring-[#0070f2]"
                                />
                                <label
                                    htmlFor="create_is_active"
                                    className="text-xs font-semibold text-[#1c2d42] cursor-pointer"
                                >
                                    Enable immediately in PR Line Items F4 Search Help
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t border-[#d9e2ec] pt-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="rounded-md border border-[#d9e2ec] bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="flex items-center gap-1.5 rounded-md bg-[#0070f2] px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2] transition-colors disabled:opacity-50"
                                >
                                    {isCreating && <RefreshCw className="h-3 w-3 animate-spin" />}
                                    <span>Save Item Category</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {editingCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                    <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[#d9e2ec] pb-3 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0070f2] text-white">
                                    <Edit2 className="h-4 w-4" />
                                </div>
                                <h3 className="text-sm font-bold text-[#1c2d42]">
                                    Edit Item Category: {editingCategory.code}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingCategory(null)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                    Category Code <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editForm.code}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, code: e.target.value })
                                    }
                                    required
                                    className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 font-mono text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                />
                                {editErrors.code && (
                                    <p className="mt-1 text-xs text-rose-600 font-medium">{editErrors.code}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                    Category Name / Label <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, name: e.target.value })
                                    }
                                    required
                                    className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                />
                                {editErrors.name && (
                                    <p className="mt-1 text-xs text-rose-600 font-medium">{editErrors.name}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                    Operational Description
                                </label>
                                <textarea
                                    value={editForm.description}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, description: e.target.value })
                                    }
                                    rows={3}
                                    className="w-full rounded-md border border-[#d9e2ec] p-2.5 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                />
                                {editErrors.description && (
                                    <p className="mt-1 text-xs text-rose-600 font-medium">{editErrors.description}</p>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="edit_is_active"
                                    checked={editForm.is_active}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, is_active: e.target.checked })
                                    }
                                    className="h-4 w-4 rounded border-[#d9e2ec] text-[#0070f2] focus:ring-[#0070f2]"
                                />
                                <label
                                    htmlFor="edit_is_active"
                                    className="text-xs font-semibold text-[#1c2d42] cursor-pointer"
                                >
                                    Active in PR Line Items F4 Search Help
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t border-[#d9e2ec] pt-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setEditingCategory(null)}
                                    className="rounded-md border border-[#d9e2ec] bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdating}
                                    className="flex items-center gap-1.5 rounded-md bg-[#0070f2] px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2] transition-colors disabled:opacity-50"
                                >
                                    {isUpdating && <RefreshCw className="h-3 w-3 animate-spin" />}
                                    <span>Update Item Category</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {deletingCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                    <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
                        <div className="flex items-center gap-3 text-rose-600 mb-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50">
                                <Trash2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Delete Item Category
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Confirm category removal
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                            Are you sure you want to delete item category{' '}
                            <strong className="text-slate-900 font-mono">
                                {deletingCategory.code} - {deletingCategory.name}
                            </strong>
                            ? This action cannot be undone. Requisitions currently created with this category will retain their saved value.
                        </p>

                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                            <button
                                type="button"
                                onClick={() => setDeletingCategory(null)}
                                className="rounded-md border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteSubmit}
                                disabled={isDeleting}
                                className="flex items-center gap-1.5 rounded-md bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
                            >
                                {isDeleting && <RefreshCw className="h-3 w-3 animate-spin" />}
                                <span>Delete Category</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
