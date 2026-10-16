import React, { useState, useMemo } from 'react';
import {
    Building2,
    RefreshCw,
    Search,
    CheckCircle2,
    Server,
    ExternalLink,
    Copy,
    Check,
    Database,
    Sparkles,
    Clock,
    FileCode,
    Layers,
    ShieldCheck,
    Eye,
    Globe,
    Boxes,
    LayoutGrid,
    Table as TableIcon,
    AlertCircle,
    X,
    Plus,
    Edit2,
    Trash2,
    CheckSquare,
    Square,
    Filter,
} from 'lucide-react';
import type {
    PurchasingOrganization,
    StagedSapPurchasingOrganization,
    SapPurchasingOrgFetchResponse,
} from '@/types';

interface PurchasingOrganizationsManagerProps {
    initialPurchasingOrganizations?: PurchasingOrganization[];
    isSuperAdmin?: boolean;
}

export default function PurchasingOrganizationsManager({
    initialPurchasingOrganizations = [],
    isSuperAdmin = true,
}: PurchasingOrganizationsManagerProps) {
    const [organizations, setOrganizations] = useState<PurchasingOrganization[]>(initialPurchasingOrganizations);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [inspectOrg, setInspectOrg] = useState<PurchasingOrganization | null>(null);

    // Sync / Loading states
    const [isSyncing, setIsSyncing] = useState(false);
    const [isFetchingSap, setIsFetchingSap] = useState(false);
    const [isSavingStaged, setIsSavingStaged] = useState(false);
    const [feedbackAlert, setFeedbackAlert] = useState<{
        type: 'success' | 'error' | 'info';
        message: string;
    } | null>(null);

    // Staging Modal for "Fetch & Stage"
    const [stagedResponse, setStagedResponse] = useState<SapPurchasingOrgFetchResponse | null>(null);
    const [selectedStagedCodes, setSelectedStagedCodes] = useState<Set<string>>(new Set());
    const [isStageModalOpen, setIsStageModalOpen] = useState(false);
    const [sapEndpoint, setSapEndpoint] = useState(
        'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_PURCHASEORGANIZATION_CDS/YY1_PURCHASEORGANIZATION'
    );

    // Add / Edit Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState<PurchasingOrganization | null>(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        company_code: '1000',
        plants: '1100, 1200, 1300, 1400',
        description: '',
        is_active: true,
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // Refresh database items
    const reloadFromDb = async () => {
        try {
            const res = await fetch('/purchasing-organizations', {
                headers: { Accept: 'application/json' },
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setOrganizations(data.data);
            }
        } catch (err) {
            console.error('Failed to reload purchasing organizations:', err);
        }
    };

    // Quick direct SAP sync
    const handleDirectSapSync = async () => {
        setIsSyncing(true);
        setFeedbackAlert(null);
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch('/purchasing-organizations/sync-sap', {
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
                    message: data.message || 'Successfully synchronized Purchasing Organizations from SAP S/4HANA Cloud!',
                });
                if (data.data) {
                    setOrganizations(data.data);
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

    // Stage preview fetch
    const handleFetchStaged = async () => {
        setIsFetchingSap(true);
        setFeedbackAlert(null);
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch('/purchasing-organizations/fetch-sap', {
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
            const data: SapPurchasingOrgFetchResponse = await res.json();

            if (data.success && data.items && data.items.length > 0) {
                setStagedResponse(data);
                setSelectedStagedCodes(new Set(data.items.map((i) => i.code)));
                setIsStageModalOpen(true);
            } else {
                setFeedbackAlert({
                    type: 'error',
                    message: data.message || 'No purchasing organizations returned from CDS view.',
                });
            }
        } catch (err: any) {
            setFeedbackAlert({
                type: 'error',
                message: 'Failed to fetch from SAP: ' + (err?.message || err),
            });
        } finally {
            setIsFetchingSap(false);
        }
    };

    // Save selected staged items
    const handleSaveSelectedStaged = async () => {
        if (!stagedResponse?.items || selectedStagedCodes.size === 0) return;
        setIsSavingStaged(true);
        try {
            const itemsToSave = stagedResponse.items.filter((item) => selectedStagedCodes.has(item.code));
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch('/purchasing-organizations/save-sap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({ items: itemsToSave }),
            });
            const data = await res.json();

            if (data.success) {
                setFeedbackAlert({
                    type: 'success',
                    message: data.message || `Saved ${itemsToSave.length} Purchasing Organizations to database.`,
                });
                setIsStageModalOpen(false);
                if (data.data) {
                    setOrganizations(data.data);
                } else {
                    reloadFromDb();
                }
            } else {
                setFeedbackAlert({
                    type: 'error',
                    message: data.message || 'Failed to save purchasing organizations.',
                });
            }
        } catch (err: any) {
            setFeedbackAlert({
                type: 'error',
                message: 'Error saving staged items: ' + (err?.message || err),
            });
        } finally {
            setIsSavingStaged(false);
        }
    };

    // Toggle active status
    const handleToggleStatus = async (org: PurchasingOrganization) => {
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch(`/purchasing-organizations/${org.id}/toggle-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
            });
            const data = await res.json();
            if (data.success) {
                setOrganizations((prev) =>
                    prev.map((item) => (item.id === org.id ? { ...item, is_active: !item.is_active } : item))
                );
            }
        } catch (err) {
            console.error('Failed to toggle status:', err);
        }
    };

    // Delete record
    const handleDelete = async (org: PurchasingOrganization) => {
        if (!confirm(`Are you sure you want to remove Purchasing Organization ${org.code} (${org.name}) from local database?`)) {
            return;
        }
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch(`/purchasing-organizations/${org.id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
            });
            const data = await res.json();
            if (data.success) {
                setOrganizations((prev) => prev.filter((item) => item.id !== org.id));
                setFeedbackAlert({
                    type: 'success',
                    message: `Purchasing Organization ${org.code} removed from database.`,
                });
            }
        } catch (err) {
            console.error('Failed to delete org:', err);
        }
    };

    // Save manual form
    const handleSaveManualForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormErrors({});

        const plantsArr = formData.plants
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean);

        const payload = {
            code: formData.code.trim(),
            name: formData.name.trim(),
            company_code: formData.company_code.trim(),
            plants: plantsArr,
            description: formData.description.trim() || null,
            is_active: formData.is_active,
        };

        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

        try {
            const url = editingOrg ? `/purchasing-organizations/${editingOrg.id}` : '/purchasing-organizations';
            const method = editingOrg ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setFeedbackAlert({
                    type: 'success',
                    message: editingOrg
                        ? `Purchasing Organization ${payload.code} updated.`
                        : `Purchasing Organization ${payload.code} created.`,
                });
                setIsAddModalOpen(false);
                setEditingOrg(null);
                reloadFromDb();
            } else if (data.errors) {
                setFormErrors(data.errors);
            } else {
                setFeedbackAlert({
                    type: 'error',
                    message: data.message || 'Failed to save record.',
                });
            }
        } catch (err: any) {
            setFeedbackAlert({
                type: 'error',
                message: 'Error saving record: ' + (err?.message || err),
            });
        }
    };

    // Copy helper
    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    // Filter organizations
    const filteredOrgs = useMemo(() => {
        return organizations.filter((org) => {
            if (statusFilter === 'active' && !org.is_active) return false;
            if (statusFilter === 'inactive' && org.is_active) return false;

            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase().trim();
            const code = (org.code || '').toLowerCase();
            const name = (org.name || '').toLowerCase();
            const desc = (org.description || '').toLowerCase();
            const plants = Array.isArray(org.plants) ? org.plants.join(' ').toLowerCase() : '';

            return code.includes(q) || name.includes(q) || desc.includes(q) || plants.includes(q);
        });
    }, [organizations, searchQuery, statusFilter]);

    return (
        <div className="space-y-6">
            {/* Alert / Feedback Notification */}
            {feedbackAlert && (
                <div
                    className={`flex items-start justify-between rounded-xl border p-4 text-xs shadow-xs transition-all ${
                        feedbackAlert.type === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                            : feedbackAlert.type === 'info'
                            ? 'border-blue-200 bg-blue-50 text-blue-900'
                            : 'border-rose-200 bg-rose-50 text-rose-900'
                    }`}
                >
                    <div className="flex items-center gap-2.5">
                        {feedbackAlert.type === 'success' ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        ) : feedbackAlert.type === 'info' ? (
                            <Sparkles className="h-4 w-4 shrink-0 text-[#0070f2]" />
                        ) : (
                            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                        )}
                        <span className="font-medium leading-relaxed">{feedbackAlert.message}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFeedbackAlert(null)}
                        className="rounded p-1 hover:bg-black/5 text-slate-500 hover:text-slate-700"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            {/* Overview & Quick Stats */}
            <div className="rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-xs">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                                <Building2 className="h-4 w-4" />
                            </span>
                            <h2 className="text-base font-bold text-[#1c2d42]">
                                Purchasing Organizations (SAP S/4HANA Cloud CDS)
                            </h2>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                                CDS: YY1_PURCHASEORGANIZATION_CDS
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-[#556b82]">
                            Synchronized buyer organizations mapped to operational manufacturing plants. Stored in local MySQL database for fast offline availability, F4 Search Help, and PR creation.
                        </p>
                    </div>

                    {/* Actions: Sync from SAP & Add Org */}
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={handleDirectSapSync}
                            disabled={isSyncing}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0070f2] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2] disabled:opacity-60 transition-all"
                            title="Synchronize live from SAP S/4HANA Cloud CDS View into MySQL"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                            <span>{isSyncing ? 'Syncing with SAP...' : 'Sync with SAP Cloud'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleFetchStaged}
                            disabled={isFetchingSap}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#d9e2ec] bg-white px-3 py-2 text-xs font-semibold text-[#1c2d42] hover:bg-slate-50 disabled:opacity-60 transition-all"
                            title="Preview SAP CDS View response before saving"
                        >
                            <Server className={`h-3.5 w-3.5 text-slate-600 ${isFetchingSap ? 'animate-pulse' : ''}`} />
                            <span>{isFetchingSap ? 'Fetching...' : 'Stage / Review CDS'}</span>
                        </button>

                        {isSuperAdmin && (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingOrg(null);
                                    setFormData({
                                        code: '',
                                        name: '',
                                        company_code: '1000',
                                        plants: '1100, 1200, 1300, 1400',
                                        description: '',
                                        is_active: true,
                                    });
                                    setIsAddModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Add Org</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* KPI Metrics Strip */}
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-4 border-t border-slate-100">
                    <div className="rounded-lg bg-slate-50/70 p-3 border border-slate-200/60">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            Stored in MySQL
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-bold text-[#1c2d42]">{organizations.length}</span>
                            <span className="text-[11px] text-slate-400">organizations</span>
                        </div>
                    </div>

                    <div className="rounded-lg bg-emerald-50/60 p-3 border border-emerald-200/60">
                        <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                            Active in PR Form
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-bold text-emerald-800">
                                {organizations.filter((o) => o.is_active).length}
                            </span>
                            <span className="text-[11px] text-emerald-600">available</span>
                        </div>
                    </div>

                    <div className="rounded-lg bg-blue-50/60 p-3 border border-blue-200/60">
                        <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
                            SAP Cloud Synced
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-bold text-blue-800">
                                {organizations.filter((o) => o.is_synced).length}
                            </span>
                            <span className="text-[11px] text-blue-600">verified</span>
                        </div>
                    </div>

                    <div className="rounded-lg bg-purple-50/60 p-3 border border-purple-200/60">
                        <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">
                            Company Code
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-bold text-purple-800">1000</span>
                            <span className="text-[11px] text-purple-600">APL Corporate</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls Bar: Filter, Search & View Toggle */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[#d9e2ec] bg-white p-3.5 shadow-xs">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8c9ba5]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter by code, name, plant..."
                            className="h-8.5 w-full rounded-md border border-[#d9e2ec] bg-white pl-8 pr-3 text-xs text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                        />
                    </div>

                    {/* Status Pill Filters */}
                    <div className="flex items-center rounded-lg border border-[#d9e2ec] p-0.5 bg-[#f8fafc]">
                        <button
                            type="button"
                            onClick={() => setStatusFilter('all')}
                            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                                statusFilter === 'all'
                                    ? 'bg-white text-[#0070f2] shadow-xs'
                                    : 'text-[#556b82] hover:text-[#1c2d42]'
                            }`}
                        >
                            All ({organizations.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('active')}
                            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                                statusFilter === 'active'
                                    ? 'bg-white text-emerald-700 shadow-xs'
                                    : 'text-[#556b82] hover:text-[#1c2d42]'
                            }`}
                        >
                            Active ({organizations.filter((o) => o.is_active).length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('inactive')}
                            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                                statusFilter === 'inactive'
                                    ? 'bg-white text-slate-700 shadow-xs'
                                    : 'text-[#556b82] hover:text-[#1c2d42]'
                            }`}
                        >
                            Inactive ({organizations.filter((o) => !o.is_active).length})
                        </button>
                    </div>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 rounded-lg border border-[#d9e2ec] p-0.5 bg-[#f8fafc]">
                    <button
                        type="button"
                        onClick={() => setViewMode('cards')}
                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                            viewMode === 'cards'
                                ? 'bg-white text-[#0070f2] shadow-xs'
                                : 'text-[#556b82] hover:text-[#1c2d42]'
                        }`}
                    >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Cards</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                            viewMode === 'table'
                                ? 'bg-white text-[#0070f2] shadow-xs'
                                : 'text-[#556b82] hover:text-[#1c2d42]'
                        }`}
                    >
                        <TableIcon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Table</span>
                    </button>
                </div>
            </div>

            {/* Empty State */}
            {filteredOrgs.length === 0 && (
                <div className="rounded-xl border border-dashed border-[#d9e2ec] bg-white p-12 text-center shadow-xs">
                    <Building2 className="mx-auto h-10 w-10 text-slate-300" />
                    <h3 className="mt-3 text-sm font-bold text-[#1c2d42]">No Purchasing Organizations Found</h3>
                    <p className="mt-1 text-xs text-[#556b82]">
                        {searchQuery
                            ? `No records match "${searchQuery}". Try clearing search.`
                            : 'No Purchasing Organizations currently stored in the local database.'}
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={handleDirectSapSync}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0070f2] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2]"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>Sync from SAP Cloud</span>
                        </button>
                    </div>
                </div>
            )}

            {/* CARD VIEW */}
            {viewMode === 'cards' && filteredOrgs.length > 0 && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredOrgs.map((org) => {
                        const plants = Array.isArray(org.plants) ? org.plants : [];
                        return (
                            <div
                                key={org.id || org.code}
                                className={`group flex flex-col justify-between rounded-xl border bg-white p-5 shadow-xs transition-all hover:shadow-md ${
                                    org.is_active ? 'border-[#d9e2ec]' : 'border-slate-200 bg-slate-50/50 opacity-80'
                                }`}
                            >
                                <div>
                                    {/* Card Top Row: Code Badge + Active Status */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-1 font-mono text-xs font-bold text-emerald-900 border border-emerald-200">
                                                <Building2 className="h-3 w-3" />
                                                <span>{org.code}</span>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(org.code)}
                                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                                title="Copy code"
                                            >
                                                {copiedCode === org.code ? (
                                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                ) : (
                                                    <Copy className="h-3.5 w-3.5" />
                                                )}
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {org.is_synced && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#0070f2] border border-blue-200">
                                                    <Sparkles className="h-2.5 w-2.5" />
                                                    <span>SAP Synced</span>
                                                </span>
                                            )}
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                                                    org.is_active
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                                }`}
                                            >
                                                {org.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Title & Name */}
                                    <h3 className="mt-3 text-sm font-bold text-[#1c2d42]">{org.name}</h3>

                                    {org.description && (
                                        <p className="mt-1 text-xs text-[#556b82] line-clamp-2">{org.description}</p>
                                    )}

                                    {/* Mapped Plants Section */}
                                    <div className="mt-4 pt-3 border-t border-slate-100">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Mapped Plants ({plants.length})
                                        </span>
                                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                                            {plants.length > 0 ? (
                                                plants.map((plantCode) => (
                                                    <span
                                                        key={plantCode}
                                                        className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-700 border border-slate-200/70"
                                                    >
                                                        <Boxes className="h-2.5 w-2.5 text-slate-500" />
                                                        <span>Plant {plantCode}</span>
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-slate-400">All Enterprise Plants</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Company Code & Metadata */}
                                    <div className="mt-3 text-[11px] text-[#556b82] flex items-center justify-between">
                                        <span>Company Code: <strong>{org.company_code || '1000'}</strong></span>
                                        {org.synced_at && (
                                            <span className="text-[10px] text-slate-400">
                                                Synced {new Date(org.synced_at).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Card Footer Actions */}
                                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setInspectOrg(org)}
                                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0070f2] hover:underline"
                                    >
                                        <Eye className="h-3 w-3" />
                                        <span>Inspect SAP Data</span>
                                    </button>

                                    {isSuperAdmin && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleStatus(org)}
                                                className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                                                    org.is_active
                                                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                        : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                                }`}
                                            >
                                                {org.is_active ? 'Deactivate' : 'Activate'}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingOrg(org);
                                                    setFormData({
                                                        code: org.code,
                                                        name: org.name,
                                                        company_code: org.company_code || '1000',
                                                        plants: Array.isArray(org.plants) ? org.plants.join(', ') : '',
                                                        description: org.description || '',
                                                        is_active: org.is_active,
                                                    });
                                                    setIsAddModalOpen(true);
                                                }}
                                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                                title="Edit details"
                                            >
                                                <Edit2 className="h-3.5 w-3.5" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleDelete(org)}
                                                className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                                title="Remove from database"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* TABLE VIEW */}
            {viewMode === 'table' && filteredOrgs.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-[#d9e2ec] bg-white shadow-xs">
                    <table className="w-full text-left text-xs text-[#1c2d42]">
                        <thead className="bg-[#f8fafc] text-[11px] font-semibold text-[#556b82] border-b border-[#d9e2ec]">
                            <tr>
                                <th className="py-3 px-4">Org Code</th>
                                <th className="py-3 px-4">Organization Name</th>
                                <th className="py-3 px-4">Company Code</th>
                                <th className="py-3 px-4">Mapped Plants</th>
                                <th className="py-3 px-4 text-center">SAP Synced</th>
                                <th className="py-3 px-4 text-center">Status</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredOrgs.map((org) => {
                                const plants = Array.isArray(org.plants) ? org.plants : [];
                                return (
                                    <tr key={org.id || org.code} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-3 px-4 font-mono font-bold text-emerald-950">
                                            <div className="flex items-center gap-1.5">
                                                <span className="rounded bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                                                    {org.code}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(org.code)}
                                                    className="text-slate-400 hover:text-slate-600"
                                                >
                                                    {copiedCode === org.code ? (
                                                        <Check className="h-3 w-3 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="h-3 w-3" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 font-semibold text-[#1c2d42]">
                                            {org.name}
                                            {org.description && (
                                                <span className="block text-[11px] font-normal text-slate-500">
                                                    {org.description}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 font-mono text-slate-600">{org.company_code || '1000'}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex flex-wrap gap-1">
                                                {plants.map((p) => (
                                                    <span
                                                        key={p}
                                                        className="rounded bg-slate-100 px-1.5 py-0.2 font-mono text-[10px] text-slate-700 border border-slate-200"
                                                    >
                                                        {p}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {org.is_synced ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#0070f2] border border-blue-200">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    <span>Synced</span>
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-slate-400">Manual</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                                                    org.is_active
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                                }`}
                                            >
                                                {org.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setInspectOrg(org)}
                                                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-[#0070f2]"
                                                    title="Inspect"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </button>
                                                {isSuperAdmin && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleStatus(org)}
                                                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                                                org.is_active
                                                                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                                    : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                                            }`}
                                                        >
                                                            {org.is_active ? 'Deactivate' : 'Activate'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingOrg(org);
                                                                setFormData({
                                                                    code: org.code,
                                                                    name: org.name,
                                                                    company_code: org.company_code || '1000',
                                                                    plants: Array.isArray(org.plants) ? org.plants.join(', ') : '',
                                                                    description: org.description || '',
                                                                    is_active: org.is_active,
                                                                });
                                                                setIsAddModalOpen(true);
                                                            }}
                                                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(org)}
                                                            className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* MODAL 1: STAGING PREVIEW & SELECTION */}
            {isStageModalOpen && stagedResponse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
                    <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-[#d9e2ec] bg-white shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-[#d9e2ec] bg-[#f8fafc] px-5 py-4">
                            <div className="flex items-center gap-2.5">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                                    <Server className="h-4 w-4" />
                                </span>
                                <div>
                                    <h3 className="text-sm font-bold text-[#1c2d42]">
                                        SAP CDS View Staging: YY1_PURCHASEORGANIZATION_CDS
                                    </h3>
                                    <p className="text-[11px] text-[#556b82]">
                                        {stagedResponse.items.length} items retrieved from SAP Cloud. Select items to persist to MySQL database.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsStageModalOpen(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Staged Items List */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-3">
                            <div className="flex items-center justify-between mb-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (selectedStagedCodes.size === stagedResponse.items.length) {
                                            setSelectedStagedCodes(new Set());
                                        } else {
                                            setSelectedStagedCodes(new Set(stagedResponse.items.map((i) => i.code)));
                                        }
                                    }}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0070f2] hover:underline"
                                >
                                    {selectedStagedCodes.size === stagedResponse.items.length ? (
                                        <CheckSquare className="h-4 w-4" />
                                    ) : (
                                        <Square className="h-4 w-4" />
                                    )}
                                    <span>
                                        {selectedStagedCodes.size === stagedResponse.items.length
                                            ? 'Deselect All'
                                            : 'Select All Items'}
                                    </span>
                                </button>
                                <span className="text-xs text-slate-500">
                                    {selectedStagedCodes.size} of {stagedResponse.items.length} selected
                                </span>
                            </div>

                            <div className="space-y-2">
                                {stagedResponse.items.map((item) => {
                                    const isSelected = selectedStagedCodes.has(item.code);
                                    return (
                                        <div
                                            key={item.code}
                                            onClick={() => {
                                                setSelectedStagedCodes((prev) => {
                                                    const next = new Set(prev);
                                                    if (next.has(item.code)) next.delete(item.code);
                                                    else next.add(item.code);
                                                    return next;
                                                });
                                            }}
                                            className={`flex items-start gap-3 rounded-lg border p-3.5 transition-all cursor-pointer ${
                                                isSelected
                                                    ? 'border-[#0070f2] bg-blue-50/40'
                                                    : 'border-[#d9e2ec] bg-white hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="mt-0.5">
                                                {isSelected ? (
                                                    <CheckSquare className="h-4 w-4 text-[#0070f2]" />
                                                ) : (
                                                    <Square className="h-4 w-4 text-slate-300" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                                                            {item.code}
                                                        </span>
                                                        <span className="text-xs font-bold text-[#1c2d42]">
                                                            {item.name}
                                                        </span>
                                                    </div>
                                                    <span
                                                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${
                                                            item.is_in_database
                                                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                        }`}
                                                    >
                                                        {item.is_in_database ? 'Already in Database' : 'New from SAP'}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-xs text-[#556b82]">{item.description}</p>
                                                {item.plants && item.plants.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        {item.plants.map((p) => (
                                                            <span
                                                                key={p}
                                                                className="rounded bg-slate-100 px-1.5 py-0.2 font-mono text-[10px] text-slate-700 border border-slate-200"
                                                            >
                                                                Plant {p}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-between border-t border-[#d9e2ec] bg-[#f8fafc] px-5 py-3.5">
                            <button
                                type="button"
                                onClick={() => setIsStageModalOpen(false)}
                                className="rounded-lg border border-[#d9e2ec] bg-white px-3.5 py-2 text-xs font-semibold text-[#1c2d42] hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveSelectedStaged}
                                disabled={isSavingStaged || selectedStagedCodes.size === 0}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0070f2] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2] disabled:opacity-50"
                            >
                                <Database className="h-3.5 w-3.5" />
                                <span>
                                    {isSavingStaged
                                        ? 'Saving to Database...'
                                        : `Save ${selectedStagedCodes.size} Selected to MySQL`}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: INSPECT SAP RAW DETAILS */}
            {inspectOrg && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
                    <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-[#d9e2ec] bg-white shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-[#d9e2ec] bg-[#f8fafc] px-5 py-4">
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-[#0070f2]" />
                                <h3 className="text-sm font-bold text-[#1c2d42]">
                                    Inspect Purchasing Organization: {inspectOrg.code} - {inspectOrg.name}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setInspectOrg(null)}
                                className="rounded p-1 text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                                    <span className="font-semibold text-slate-500 block mb-1">Code & Name</span>
                                    <span className="font-bold text-[#1c2d42]">{inspectOrg.code} - {inspectOrg.name}</span>
                                </div>
                                <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                                    <span className="font-semibold text-slate-500 block mb-1">Company Code</span>
                                    <span className="font-mono text-[#1c2d42]">{inspectOrg.company_code || '1000'}</span>
                                </div>
                                <div className="col-span-2 rounded-lg bg-slate-50 p-3 border border-slate-200">
                                    <span className="font-semibold text-slate-500 block mb-1">Mapped Plants</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {(inspectOrg.plants || []).map((p) => (
                                            <span
                                                key={p}
                                                className="rounded bg-white px-2 py-0.5 font-mono text-[11px] text-slate-800 border border-slate-200"
                                            >
                                                Plant {p}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <span className="text-xs font-bold text-[#1c2d42] block mb-1.5">
                                    Raw SAP OData Attributes
                                </span>
                                <pre className="max-h-60 overflow-y-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] text-emerald-400">
                                    {JSON.stringify(inspectOrg.raw_data || inspectOrg, null, 2)}
                                </pre>
                            </div>
                        </div>
                        <div className="flex justify-end border-t border-[#d9e2ec] bg-[#f8fafc] px-5 py-3">
                            <button
                                type="button"
                                onClick={() => setInspectOrg(null)}
                                className="rounded-lg bg-[#0070f2] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#0057c2]"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3: ADD / EDIT PURCHASING ORGANIZATION */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
                    <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-xl border border-[#d9e2ec] bg-white shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-[#d9e2ec] bg-[#f8fafc] px-5 py-4">
                            <h3 className="text-sm font-bold text-[#1c2d42]">
                                {editingOrg ? 'Edit Purchasing Organization' : 'Add Purchasing Organization'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAddModalOpen(false);
                                    setEditingOrg(null);
                                }}
                                className="rounded p-1 text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveManualForm} className="p-5 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                    Purchasing Organization Code *
                                </label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    disabled={!!editingOrg}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    placeholder="e.g. 1100"
                                    required
                                    className="h-8.5 w-full rounded-md border border-[#d9e2ec] px-3 text-xs uppercase disabled:bg-slate-100 focus:border-[#0070f2] focus:outline-none"
                                />
                                {formErrors.code && (
                                    <p className="mt-1 text-[11px] text-rose-600">{formErrors.code}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                    Organization Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Central Purchase Org"
                                    required
                                    className="h-8.5 w-full rounded-md border border-[#d9e2ec] px-3 text-xs focus:border-[#0070f2] focus:outline-none"
                                />
                                {formErrors.name && (
                                    <p className="mt-1 text-[11px] text-rose-600">{formErrors.name}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">Company Code</label>
                                <input
                                    type="text"
                                    value={formData.company_code}
                                    onChange={(e) => setFormData({ ...formData, company_code: e.target.value })}
                                    placeholder="e.g. 1000"
                                    className="h-8.5 w-full rounded-md border border-[#d9e2ec] px-3 text-xs focus:border-[#0070f2] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                    Mapped Plants (Comma separated)
                                </label>
                                <input
                                    type="text"
                                    value={formData.plants}
                                    onChange={(e) => setFormData({ ...formData, plants: e.target.value })}
                                    placeholder="e.g. 1100, 1200, 1300, 1400"
                                    className="h-8.5 w-full rounded-md border border-[#d9e2ec] px-3 text-xs focus:border-[#0070f2] focus:outline-none"
                                />
                                <span className="mt-1 block text-[10px] text-slate-400">
                                    Used to link purchasing org to plants in PR creation.
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">Description / Notes</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Optional description"
                                    rows={2}
                                    className="w-full rounded-md border border-[#d9e2ec] p-2 text-xs focus:border-[#0070f2] focus:outline-none"
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="form_is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="h-4 w-4 rounded border-slate-300 text-[#0070f2] focus:ring-[#0070f2]"
                                />
                                <label htmlFor="form_is_active" className="text-xs font-semibold text-[#1c2d42]">
                                    Active (Enable in PR creation F4 help)
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAddModalOpen(false);
                                        setEditingOrg(null);
                                    }}
                                    className="rounded-lg border border-[#d9e2ec] bg-white px-3.5 py-2 text-xs font-semibold text-[#1c2d42] hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-[#0070f2] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2]"
                                >
                                    {editingOrg ? 'Save Changes' : 'Create Organization'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
