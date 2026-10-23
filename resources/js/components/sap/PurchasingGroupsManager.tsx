import React, { useState, useMemo, useEffect } from 'react';
import { router } from '@inertiajs/react';
import {
    Users2,
    Plus,
    Search,
    Edit2,
    Trash2,
    AlertCircle,
    X,
    Tag,
    Info,
    RefreshCw,
    ToggleLeft,
    ToggleRight,
    CheckCircle2,
    CloudDownload,
    Database,
    Sparkles,
    Clock,
    FileCode,
    Check,
    CheckSquare,
    Square,
    ExternalLink,
    Eye,
    Server,
    Filter,
} from 'lucide-react';
import type {
    PurchasingGroup,
    StagedSapPurchasingGroup,
    SapPurchasingGroupFetchResponse,
} from '@/types';

interface PurchasingGroupsManagerProps {
    purchasingGroups?: PurchasingGroup[];
    initialPurchasingGroups?: PurchasingGroup[];
    isSuperAdmin?: boolean;
}

export default function PurchasingGroupsManager({
    purchasingGroups: propGroups = [],
    initialPurchasingGroups = [],
    isSuperAdmin = true,
}: PurchasingGroupsManagerProps) {
    const [groups, setGroups] = useState<PurchasingGroup[]>(() => {
        return propGroups.length > 0 ? propGroups : initialPurchasingGroups;
    });

    useEffect(() => {
        if (propGroups.length > 0) {
            setGroups(propGroups);
        } else if (initialPurchasingGroups.length > 0) {
            setGroups(initialPurchasingGroups);
        }
    }, [propGroups, initialPurchasingGroups]);

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'synced'>('all');

    // SAP Sync States
    const [isSyncing, setIsSyncing] = useState(false);
    const [isFetchingSap, setIsFetchingSap] = useState(false);
    const [isSavingStaged, setIsSavingStaged] = useState(false);
    const [feedbackAlert, setFeedbackAlert] = useState<{
        type: 'success' | 'error' | 'info';
        message: string;
    } | null>(null);

    // Staging Preview Modal
    const [isStageModalOpen, setIsStageModalOpen] = useState(false);
    const [stagedResponse, setStagedResponse] = useState<SapPurchasingGroupFetchResponse | null>(null);
    const [selectedStagedCodes, setSelectedStagedCodes] = useState<Set<string>>(new Set());
    const [stagedSearchQuery, setStagedSearchQuery] = useState('');
    const [sapEndpoint, setSapEndpoint] = useState(
        'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_PURCHASINGGROUPAPI_CDS/YY1_PurchasingGroupAPI'
    );

    // Manual Create Modal
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        code: '',
        description: '',
        is_active: true,
    });
    const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
    const [isCreating, setIsCreating] = useState(false);

    // Edit Modal
    const [editingGroup, setEditingGroup] = useState<PurchasingGroup | null>(null);
    const [editForm, setEditForm] = useState({
        code: '',
        description: '',
        is_active: true,
    });
    const [editErrors, setEditErrors] = useState<Record<string, string>>({});
    const [isUpdating, setIsUpdating] = useState(false);

    // Delete Modal
    const [deletingGroup, setDeletingGroup] = useState<PurchasingGroup | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Counts
    const activeCount = useMemo(() => groups.filter((g) => g.is_active).length, [groups]);
    const inactiveCount = useMemo(() => groups.filter((g) => !g.is_active).length, [groups]);
    const syncedCount = useMemo(() => groups.filter((g) => g.is_synced).length, [groups]);

    // Reload list from local database API
    const reloadFromDb = async () => {
        try {
            const res = await fetch('/purchasing-groups', {
                headers: { Accept: 'application/json' },
            });
            const data = await res.json();
            const loaded = data.purchasingGroups || data.data || [];
            if (Array.isArray(loaded)) {
                setGroups(loaded);
            }
        } catch (err) {
            console.error('Failed to reload purchasing groups:', err);
        }
    };

    // Filtered groups
    const filteredGroups = useMemo(() => {
        return groups.filter((group) => {
            const matchesStatus =
                statusFilter === 'all'
                    ? true
                    : statusFilter === 'active'
                    ? group.is_active
                    : statusFilter === 'inactive'
                    ? !group.is_active
                    : group.is_synced;

            const q = searchQuery.toLowerCase().trim();
            const desc = group.description || group.name || '';
            const matchesQuery =
                !q ||
                group.code.toLowerCase().includes(q) ||
                (group.name && group.name.toLowerCase().includes(q)) ||
                desc.toLowerCase().includes(q);

            return matchesStatus && matchesQuery;
        });
    }, [groups, searchQuery, statusFilter]);

    // 1-Click Direct Sync with SAP S/4HANA Cloud
    const handleDirectSapSync = async () => {
        setIsSyncing(true);
        setFeedbackAlert(null);
        try {
            const csrfToken =
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch('/purchasing-groups/sync-sap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
            });
            const data = await res.json();

            if (data.success) {
                setFeedbackAlert({
                    type: 'success',
                    message: data.message || 'Successfully synchronized Purchasing Groups from SAP S/4HANA Cloud!',
                });
                if (data.purchasingGroups || data.data) {
                    setGroups(data.purchasingGroups || data.data);
                } else {
                    reloadFromDb();
                }
            } else {
                setFeedbackAlert({
                    type: 'error',
                    message: data.message || 'Failed to sync with SAP CDS view.',
                });
            }
        } catch (err: any) {
            setFeedbackAlert({
                type: 'error',
                message: 'Network error during SAP sync: ' + (err?.message || err),
            });
        } finally {
            setIsSyncing(false);
        }
    };

    // Fetch live SAP items for preview staging
    const handleFetchStaged = async () => {
        setIsFetchingSap(true);
        setFeedbackAlert(null);
        try {
            const csrfToken =
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch('/purchasing-groups/fetch-sap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    endpoint: sapEndpoint || undefined,
                }),
            });
            const data: SapPurchasingGroupFetchResponse = await res.json();

            if (data.success && data.items && data.items.length > 0) {
                setStagedResponse(data);
                setSelectedStagedCodes(new Set(data.items.map((i) => i.code)));
                setIsStageModalOpen(true);
            } else {
                setFeedbackAlert({
                    type: 'error',
                    message: data.message || 'No Purchasing Groups returned from SAP CDS View.',
                });
            }
        } catch (err: any) {
            setFeedbackAlert({
                type: 'error',
                message: 'Failed to fetch staged preview: ' + (err?.message || err),
            });
        } finally {
            setIsFetchingSap(false);
        }
    };

    // Filter staged items by search term in modal
    const filteredStagedItems = useMemo(() => {
        if (!stagedResponse?.items) return [];
        if (!stagedSearchQuery.trim()) return stagedResponse.items;
        const q = stagedSearchQuery.toLowerCase();
        return stagedResponse.items.filter(
            (i) =>
                i.code.toLowerCase().includes(q) ||
                i.name.toLowerCase().includes(q) ||
                (i.description && i.description.toLowerCase().includes(q))
        );
    }, [stagedResponse, stagedSearchQuery]);

    // Save selected staged items into database
    const handleSaveSelectedStaged = async () => {
        if (!stagedResponse?.items || selectedStagedCodes.size === 0) return;
        const itemsToSave = stagedResponse.items.filter((i) => selectedStagedCodes.has(i.code));

        setIsSavingStaged(true);
        try {
            const csrfToken =
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch('/purchasing-groups/save-sap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    items: itemsToSave,
                }),
            });
            const data = await res.json();

            if (data.success) {
                setFeedbackAlert({
                    type: 'success',
                    message: data.message || `Saved ${itemsToSave.length} Purchasing Groups to MySQL.`,
                });
                setIsStageModalOpen(false);
                if (data.purchasingGroups || data.data) {
                    setGroups(data.purchasingGroups || data.data);
                } else {
                    reloadFromDb();
                }
            } else {
                setFeedbackAlert({
                    type: 'error',
                    message: data.message || 'Failed to save selected purchasing groups.',
                });
            }
        } catch (err: any) {
            setFeedbackAlert({
                type: 'error',
                message: 'Network error saving purchasing groups: ' + (err?.message || err),
            });
        } finally {
            setIsSavingStaged(false);
        }
    };

    // Select/Deselect all staged items
    const toggleSelectAllStaged = () => {
        if (!stagedResponse?.items) return;
        if (selectedStagedCodes.size === stagedResponse.items.length) {
            setSelectedStagedCodes(new Set());
        } else {
            setSelectedStagedCodes(new Set(stagedResponse.items.map((i) => i.code)));
        }
    };

    // Toggle individual staged item selection
    const toggleStagedItem = (code: string) => {
        setSelectedStagedCodes((prev) => {
            const next = new Set(prev);
            if (next.has(code)) {
                next.delete(code);
            } else {
                next.add(code);
            }
            return next;
        });
    };

    // Toggle active status
    const handleToggleStatus = async (group: PurchasingGroup) => {
        try {
            const csrfToken =
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch(`/purchasing-groups/${group.id}/toggle-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
            });
            const data = await res.json();
            if (data.success) {
                setGroups((prev) =>
                    prev.map((g) => (g.id === group.id ? { ...g, is_active: !g.is_active } : g))
                );
            }
        } catch (err) {
            console.error('Failed to toggle status:', err);
        }
    };

    // Handle Create Submit
    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateErrors({});
        setIsCreating(true);

        try {
            const csrfToken =
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch('/purchasing-groups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    code: createForm.code.trim(),
                    name: createForm.description.trim(),
                    description: createForm.description.trim(),
                    is_active: createForm.is_active,
                }),
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setIsCreateOpen(false);
                setCreateForm({ code: '', description: '', is_active: true });
                setFeedbackAlert({
                    type: 'success',
                    message: data.message || 'Purchasing Group created successfully.',
                });
                reloadFromDb();
            } else if (data.errors) {
                setCreateErrors(data.errors);
            } else {
                setCreateErrors({ code: data.message || 'Failed to create purchasing group.' });
            }
        } catch (err: any) {
            setCreateErrors({ code: err?.message || 'Network error' });
        } finally {
            setIsCreating(false);
        }
    };

    // Handle Edit Open
    const handleEditOpen = (group: PurchasingGroup) => {
        setEditingGroup(group);
        setEditForm({
            code: group.code,
            description: group.description || group.name || '',
            is_active: group.is_active ?? true,
        });
        setEditErrors({});
    };

    // Handle Edit Submit
    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingGroup) return;
        setEditErrors({});
        setIsUpdating(true);

        try {
            const csrfToken =
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch(`/purchasing-groups/${editingGroup.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    code: editForm.code.trim(),
                    name: editForm.description.trim(),
                    description: editForm.description.trim(),
                    is_active: editForm.is_active,
                }),
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setEditingGroup(null);
                setFeedbackAlert({
                    type: 'success',
                    message: data.message || 'Purchasing Group updated successfully.',
                });
                reloadFromDb();
            } else if (data.errors) {
                setEditErrors(data.errors);
            } else {
                setEditErrors({ code: data.message || 'Failed to update purchasing group.' });
            }
        } catch (err: any) {
            setEditErrors({ code: err?.message || 'Network error' });
        } finally {
            setIsUpdating(false);
        }
    };

    // Handle Delete Submit
    const handleDeleteSubmit = async () => {
        if (!deletingGroup) return;
        setIsDeleting(true);

        try {
            const csrfToken =
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch(`/purchasing-groups/${deletingGroup.id}`, {
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
            });
            const data = await res.json();

            if (data.success) {
                setFeedbackAlert({
                    type: 'success',
                    message: data.message || 'Purchasing Group deleted successfully.',
                });
                setDeletingGroup(null);
                reloadFromDb();
            } else {
                setFeedbackAlert({
                    type: 'error',
                    message: data.message || 'Failed to delete purchasing group.',
                });
            }
        } catch (err: any) {
            setFeedbackAlert({
                type: 'error',
                message: 'Network error deleting purchasing group: ' + (err?.message || err),
            });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Feedback Alert */}
            {feedbackAlert && (
                <div
                    className={`flex items-center justify-between rounded-xl border p-4 text-xs shadow-xs animate-in fade-in duration-200 ${
                        feedbackAlert.type === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : feedbackAlert.type === 'error'
                            ? 'border-rose-200 bg-rose-50 text-rose-800'
                            : 'border-blue-200 bg-blue-50 text-[#0070f2]'
                    }`}
                >
                    <div className="flex items-center gap-2.5">
                        {feedbackAlert.type === 'success' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        ) : feedbackAlert.type === 'error' ? (
                            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                        ) : (
                            <Info className="h-4 w-4 text-[#0070f2] shrink-0" />
                        )}
                        <span className="font-medium leading-relaxed">{feedbackAlert.message}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFeedbackAlert(null)}
                        className="rounded p-1 hover:bg-black/5 transition-colors"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            {/* Header Banner */}
            <div className="rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-xs">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-xs">
                            <Users2 className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-[#1c2d42]">
                                    Purchasing Groups (SAP EKGRP)
                                </h2>
                                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                                    <Server className="h-3 w-3 text-teal-600" />
                                    <span>CDS: YY1_PURCHASINGGROUPAPI_CDS</span>
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-[#556b82]">
                                Synchronize buyer teams and operational purchasing groups responsible for procurement activities, line item routing, and RFQ issuance in SAP S/4HANA Public Cloud.
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    {isSuperAdmin && (
                        <div className="flex flex-wrap items-center gap-2">
                            {/* 1-Click SAP Sync */}
                            <button
                                type="button"
                                onClick={handleDirectSapSync}
                                disabled={isSyncing || isFetchingSap}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 transition-colors"
                                title="Synchronize all 32 Purchasing Groups directly from SAP S/4HANA Cloud CDS View"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                                <span>{isSyncing ? 'Syncing with SAP...' : 'Sync with SAP'}</span>
                            </button>

                            {/* Fetch & Stage Preview */}
                            <button
                                type="button"
                                onClick={handleFetchStaged}
                                disabled={isSyncing || isFetchingSap}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100 disabled:opacity-50 transition-colors"
                                title="Inspect live SAP CDS payload and selectively import purchasing groups"
                            >
                                <Eye className={`h-3.5 w-3.5 text-teal-700 ${isFetchingSap ? 'animate-pulse' : ''}`} />
                                <span>{isFetchingSap ? 'Fetching...' : 'Stage Preview'}</span>
                            </button>

                            {/* Manual Add */}
                            <button
                                type="button"
                                onClick={() => setIsCreateOpen(true)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0070f2] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#0057c2] active:bg-[#003884]"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Add Group</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Stats Row */}
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
                    <div className="rounded-lg bg-slate-50 p-2.5">
                        <span className="text-[11px] font-medium text-slate-500">Total Configured</span>
                        <div className="mt-0.5 text-lg font-bold text-[#1c2d42]">
                            {groups.length} Groups
                        </div>
                    </div>
                    <div className="rounded-lg bg-teal-50/70 p-2.5">
                        <span className="text-[11px] font-medium text-teal-700">Synced from SAP</span>
                        <div className="mt-0.5 text-lg font-bold text-teal-800">
                            {syncedCount} Synced
                        </div>
                    </div>
                    <div className="rounded-lg bg-emerald-50/70 p-2.5">
                        <span className="text-[11px] font-medium text-emerald-700">Active Groups</span>
                        <div className="mt-0.5 text-lg font-bold text-emerald-800">
                            {activeCount} Active
                        </div>
                    </div>
                    <div className="rounded-lg bg-blue-50/70 p-2.5">
                        <span className="text-[11px] font-medium text-[#0070f2]">SAP S/4HANA Cloud</span>
                        <div className="mt-0.5 text-xs font-semibold text-[#0057c2] truncate" title={sapEndpoint}>
                            EKGRP CDS Live
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[#d9e2ec] bg-white p-3.5 shadow-xs">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8c9ba5]" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by code (e.g. 103, 101, 001) or description..."
                        className="h-9 w-full rounded-lg border border-[#d9e2ec] bg-[#f8fafc] pl-9 pr-3 text-xs text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0070f2]"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 rounded-lg border border-[#d9e2ec] bg-[#f8fafc] p-1 text-xs">
                        {(['all', 'active', 'inactive', 'synced'] as const).map((filter) => {
                            const count =
                                filter === 'all'
                                    ? groups.length
                                    : filter === 'active'
                                    ? activeCount
                                    : filter === 'inactive'
                                    ? inactiveCount
                                    : syncedCount;
                            const isSelected = statusFilter === filter;
                            return (
                                <button
                                    key={filter}
                                    type="button"
                                    onClick={() => setStatusFilter(filter)}
                                    className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
                                        isSelected
                                            ? 'bg-white text-[#0070f2] shadow-xs'
                                            : 'text-[#556b82] hover:text-[#1c2d42]'
                                    }`}
                                >
                                    {filter === 'synced' ? 'SAP Synced' : filter} ({count})
                                </button>
                            );
                        })}
                    </div>

                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="text-xs font-semibold text-[#0070f2] hover:underline"
                        >
                            Clear search
                        </button>
                    )}
                </div>
            </div>

            {/* Main Table */}
            <div className="overflow-hidden rounded-xl border border-[#d9e2ec] bg-white shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-[#d9e2ec] bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-[#556b82]">
                                <th className="py-3 px-4">Purchase Group (EKGRP)</th>
                                <th className="py-3 px-4">Group Name / Description</th>
                                <th className="py-3 px-4">Integration Source</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Last Synced / Created</th>
                                {isSuperAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#d9e2ec]">
                            {filteredGroups.map((group) => (
                                <tr
                                    key={group.id}
                                    className="hover:bg-teal-50/30 transition-colors"
                                >
                                    {/* Code */}
                                    <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                                        <div className="inline-flex items-center gap-1.5 rounded-md bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800 border border-teal-200">
                                            <Tag className="h-3 w-3 text-teal-600" />
                                            <span>{group.code}</span>
                                        </div>
                                    </td>

                                    {/* Description / Name */}
                                    <td className="py-3 px-4">
                                        <div className="font-semibold text-[#1c2d42]">
                                            {group.description || group.name}
                                        </div>
                                        {group.name && group.description && group.name !== group.description && (
                                            <div className="text-[11px] text-[#556b82]">
                                                {group.name}
                                            </div>
                                        )}
                                    </td>

                                    {/* Integration Source */}
                                    <td className="py-3 px-4 whitespace-nowrap">
                                        {group.is_synced ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                                                <Sparkles className="h-3 w-3 text-teal-600" />
                                                <span>SAP CDS Synced</span>
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                                <span>Manual Entry</span>
                                            </span>
                                        )}
                                    </td>

                                    {/* Status */}
                                    <td className="py-3 px-4 whitespace-nowrap">
                                        <span
                                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border ${
                                                group.is_active
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                            }`}
                                        >
                                            {group.is_active ? (
                                                <>
                                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                    <span>Active</span>
                                                </>
                                            ) : (
                                                <span>Inactive</span>
                                            )}
                                        </span>
                                    </td>

                                    {/* Creator / Synced timestamp */}
                                    <td className="py-3 px-4 text-[11px] text-slate-500 whitespace-nowrap">
                                        <div>{group.creator?.name || 'System / SAP Sync'}</div>
                                        <div className="text-[10px] text-slate-400">
                                            {group.synced_at
                                                ? `Synced: ${new Date(group.synced_at).toLocaleDateString()}`
                                                : group.created_at
                                                ? new Date(group.created_at).toLocaleDateString()
                                                : 'Active'}
                                        </div>
                                    </td>

                                    {/* Actions */}
                                    {isSuperAdmin && (
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1">
                                                {/* Toggle Status */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleStatus(group)}
                                                    className={`rounded p-1 transition-colors ${
                                                        group.is_active
                                                            ? 'text-emerald-600 hover:bg-emerald-50'
                                                            : 'text-slate-400 hover:bg-slate-100'
                                                    }`}
                                                    title={
                                                        group.is_active
                                                            ? 'Deactivate Purchasing Group'
                                                            : 'Activate Purchasing Group'
                                                    }
                                                >
                                                    {group.is_active ? (
                                                        <ToggleRight className="h-4 w-4" />
                                                    ) : (
                                                        <ToggleLeft className="h-4 w-4" />
                                                    )}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleEditOpen(group)}
                                                    className="rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                                    title="Edit Purchasing Group"
                                                >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setDeletingGroup(group)}
                                                    className="rounded p-1 text-rose-600 hover:bg-rose-50 transition-colors"
                                                    title="Delete Purchasing Group"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}

                            {filteredGroups.length === 0 && (
                                <tr>
                                    <td colSpan={isSuperAdmin ? 6 : 5} className="py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <Users2 className="h-9 w-9 mb-2 stroke-1 text-teal-600" />
                                            <p className="text-sm font-semibold text-slate-700">
                                                No purchasing groups found
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1 max-w-sm">
                                                {searchQuery
                                                    ? `No purchasing groups matched your query "${searchQuery}"`
                                                    : 'No purchasing groups synchronized or configured yet. Click "Sync with SAP" above to load all 32 purchasing groups directly from SAP S/4HANA Cloud.'}
                                            </p>
                                            {isSuperAdmin && !searchQuery && (
                                                <button
                                                    type="button"
                                                    onClick={handleDirectSapSync}
                                                    disabled={isSyncing}
                                                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-700"
                                                >
                                                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                                                    <span>Sync from SAP S/4HANA Cloud</span>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Guidance */}
                <div className="border-t border-[#d9e2ec] bg-[#f8fafc] px-4 py-3 text-[11px] text-[#556b82] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                        <span>
                            Purchasing groups synchronized here appear automatically in the PR line item F4 search help and auto-populate buyer routing in SAP S/4HANA Cloud.
                        </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                        SAP Field: EKGRP | CDS: YY1_PURCHASINGGROUPAPI_CDS
                    </span>
                </div>
            </div>

            {/* STAGING PREVIEW MODAL */}
            {isStageModalOpen && stagedResponse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="w-full max-w-3xl rounded-xl border border-[#d9e2ec] bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="border-b border-[#d9e2ec] bg-[#f8fafc] px-5 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white shadow-xs">
                                    <CloudDownload className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-[#1c2d42]">
                                            SAP CDS Staging Preview: Purchasing Groups
                                        </h3>
                                        <span className="rounded-full bg-teal-100 text-teal-800 border border-teal-200 px-2 py-0.5 text-[10px] font-bold">
                                            {stagedResponse.count} Live Records
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-[#556b82]">
                                        Inspect groups fetched from SAP CDS view: <span className="font-mono text-teal-700">YY1_PURCHASINGGROUPAPI_CDS</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsStageModalOpen(false)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Search & Selection Controls */}
                        <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8c9ba5]" />
                                <input
                                    type="text"
                                    value={stagedSearchQuery}
                                    onChange={(e) => setStagedSearchQuery(e.target.value)}
                                    placeholder="Search staged items..."
                                    className="h-8 w-full rounded-md border border-[#d9e2ec] bg-[#f8fafc] pl-8 pr-3 text-xs text-[#1c2d42] placeholder-[#8c9ba5] focus:border-teal-500 focus:bg-white focus:outline-none"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={toggleSelectAllStaged}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900"
                                >
                                    {selectedStagedCodes.size === stagedResponse.items.length ? (
                                        <>
                                            <CheckSquare className="h-4 w-4 text-teal-600" />
                                            <span>Deselect All</span>
                                        </>
                                    ) : (
                                        <>
                                            <Square className="h-4 w-4 text-slate-400" />
                                            <span>Select All ({stagedResponse.items.length})</span>
                                        </>
                                    )}
                                </button>
                                <span className="text-xs text-slate-400">|</span>
                                <span className="text-xs font-medium text-slate-600">
                                    Selected: <strong className="text-teal-700">{selectedStagedCodes.size}</strong> of {stagedResponse.items.length}
                                </span>
                            </div>
                        </div>

                        {/* Staged Items List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                                {filteredStagedItems.map((item) => {
                                    const isSelected = selectedStagedCodes.has(item.code);
                                    return (
                                        <div
                                            key={item.code}
                                            onClick={() => toggleStagedItem(item.code)}
                                            className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                                                isSelected ? 'bg-teal-50/60' : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {}} // handled by parent div onClick
                                                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                                />
                                                <div className="inline-flex items-center gap-1 rounded bg-teal-100 px-2 py-0.5 text-xs font-mono font-bold text-teal-900">
                                                    <Tag className="h-3 w-3 text-teal-700" />
                                                    <span>{item.code}</span>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-semibold text-[#1c2d42]">
                                                        {item.description || item.name}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-mono">
                                                        SAP Purchasing Group ID: {item.code}
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                                        item.is_in_database
                                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    }`}
                                                >
                                                    {item.sync_status}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="border-t border-[#d9e2ec] bg-[#f8fafc] px-5 py-3 flex items-center justify-between">
                            <div className="text-[11px] text-slate-500">
                                Latency: <span className="font-semibold text-slate-700">{stagedResponse.latency_ms ?? 0}ms</span> | Target: MySQL <span className="font-mono text-teal-700">apl_pr_db.purchasing_groups</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsStageModalOpen(false)}
                                    className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveSelectedStaged}
                                    disabled={selectedStagedCodes.size === 0 || isSavingStaged}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 disabled:opacity-50"
                                >
                                    {isSavingStaged && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                                    <span>Save {selectedStagedCodes.size} Groups to Database</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE MODAL */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="w-full max-w-md rounded-xl border border-[#d9e2ec] bg-white shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className="border-b border-[#d9e2ec] bg-[#f8fafc] px-5 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white shadow-xs">
                                    <Users2 className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-[#1c2d42]">
                                        Add New Purchasing Group
                                    </h3>
                                    <p className="text-[11px] text-[#556b82]">
                                        Define buyer group code and description
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCreateOpen(false)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
                            {/* Group Code */}
                            <div>
                                <label className="block text-xs font-bold text-[#1c2d42] mb-1">
                                    Purchase Group Code (EKGRP) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={createForm.code}
                                    onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                                    placeholder="e.g. 103, 001, 105"
                                    maxLength={20}
                                    required
                                    className={`h-9 w-full rounded-lg border bg-white px-3 font-mono text-xs text-[#1c2d42] placeholder-[#8c9ba5] focus:outline-none focus:ring-1 ${
                                        createErrors.code
                                            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                                            : 'border-[#d9e2ec] focus:border-[#0070f2] focus:ring-[#0070f2]'
                                    }`}
                                />
                                {createErrors.code && (
                                    <p className="mt-1 text-[11px] text-rose-500 font-medium">
                                        {createErrors.code}
                                    </p>
                                )}
                                <p className="mt-1 text-[10px] text-slate-400">
                                    SAP Purchasing Group ID (EKGRP, typically 3 characters). Must be unique.
                                </p>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-[#1c2d42] mb-1">
                                    Description <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={createForm.description}
                                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                    placeholder="e.g. Operational Plant Purchasing Team"
                                    maxLength={255}
                                    required
                                    className={`h-9 w-full rounded-lg border bg-white px-3 text-xs text-[#1c2d42] placeholder-[#8c9ba5] focus:outline-none focus:ring-1 ${
                                        createErrors.description || createErrors.name
                                            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                                            : 'border-[#d9e2ec] focus:border-[#0070f2] focus:ring-[#0070f2]'
                                    }`}
                                />
                                {(createErrors.description || createErrors.name) && (
                                    <p className="mt-1 text-[11px] text-rose-500 font-medium">
                                        {createErrors.description || createErrors.name}
                                    </p>
                                )}
                            </div>

                            {/* Active Status Checkbox */}
                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="create_is_active"
                                    checked={createForm.is_active}
                                    onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
                                    className="h-4 w-4 rounded border-[#d9e2ec] text-[#0070f2] focus:ring-[#0070f2]"
                                />
                                <label htmlFor="create_is_active" className="text-xs font-semibold text-[#1c2d42]">
                                    Enable Purchasing Group for PR Lines (Active)
                                </label>
                            </div>

                            {/* Buttons */}
                            <div className="border-t border-[#d9e2ec] pt-4 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0070f2] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2] disabled:opacity-50 transition-colors"
                                >
                                    {isCreating && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                                    <span>Create Group</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {editingGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="w-full max-w-md rounded-xl border border-[#d9e2ec] bg-white shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className="border-b border-[#d9e2ec] bg-[#f8fafc] px-5 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0070f2] text-white shadow-xs">
                                    <Edit2 className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-[#1c2d42]">
                                        Edit Purchasing Group: {editingGroup.code}
                                    </h3>
                                    <p className="text-[11px] text-[#556b82]">
                                        Update buyer group code and description
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingGroup(null)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
                            {/* Group Code */}
                            <div>
                                <label className="block text-xs font-bold text-[#1c2d42] mb-1">
                                    Purchase Group Code (EKGRP) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editForm.code}
                                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                                    maxLength={20}
                                    required
                                    className={`h-9 w-full rounded-lg border bg-white px-3 font-mono text-xs text-[#1c2d42] focus:outline-none focus:ring-1 ${
                                        editErrors.code
                                            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                                            : 'border-[#d9e2ec] focus:border-[#0070f2] focus:ring-[#0070f2]'
                                    }`}
                                />
                                {editErrors.code && (
                                    <p className="mt-1 text-[11px] text-rose-500 font-medium">
                                        {editErrors.code}
                                    </p>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-[#1c2d42] mb-1">
                                    Description <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    maxLength={255}
                                    required
                                    className={`h-9 w-full rounded-lg border bg-white px-3 text-xs text-[#1c2d42] focus:outline-none focus:ring-1 ${
                                        editErrors.description || editErrors.name
                                            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                                            : 'border-[#d9e2ec] focus:border-[#0070f2] focus:ring-[#0070f2]'
                                    }`}
                                />
                                {(editErrors.description || editErrors.name) && (
                                    <p className="mt-1 text-[11px] text-rose-500 font-medium">
                                        {editErrors.description || editErrors.name}
                                    </p>
                                )}
                            </div>

                            {/* Active Status Checkbox */}
                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="edit_is_active"
                                    checked={editForm.is_active}
                                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                                    className="h-4 w-4 rounded border-[#d9e2ec] text-[#0070f2] focus:ring-[#0070f2]"
                                />
                                <label htmlFor="edit_is_active" className="text-xs font-semibold text-[#1c2d42]">
                                    Enable Purchasing Group for PR Lines (Active)
                                </label>
                            </div>

                            {/* Buttons */}
                            <div className="border-t border-[#d9e2ec] pt-4 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingGroup(null)}
                                    className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdating}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0070f2] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2] disabled:opacity-50 transition-colors"
                                >
                                    {isUpdating && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                                    <span>Save Changes</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {deletingGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="w-full max-w-md rounded-xl border border-[#d9e2ec] bg-white shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className="border-b border-[#d9e2ec] bg-rose-50 px-5 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-rose-700">
                                <AlertCircle className="h-5 w-5 text-rose-600" />
                                <h3 className="text-sm font-bold">
                                    Confirm Delete Purchasing Group
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDeletingGroup(null)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="p-5 space-y-3">
                            <p className="text-xs text-[#556b82]">
                                Are you sure you want to permanently delete purchasing group{' '}
                                <strong className="text-[#1c2d42]">
                                    "{deletingGroup.code} - {deletingGroup.description || deletingGroup.name}"
                                </strong>
                                ?
                            </p>
                            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                                Warning: Requisitions that were previously created with this Purchasing Group will keep their historical record, but users will no longer be able to select it for new requisitions.
                            </p>

                            <div className="border-t border-[#d9e2ec] pt-4 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setDeletingGroup(null)}
                                    className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteSubmit}
                                    disabled={isDeleting}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 transition-colors"
                                >
                                    {isDeleting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                                    <span>Delete Purchasing Group</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
