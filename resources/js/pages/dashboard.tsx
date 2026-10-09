import React, { useState, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import SapAppLayout from '@/layouts/sap-app-layout';
import CreatePurchaseRequisitionModal from '@/components/sap/CreatePurchaseRequisitionModal';
import SapPayloadModal from '@/components/sap/SapPayloadModal';
import {
    Plus,
    RefreshCw,
    Search,
    FileSpreadsheet,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Eye,
    FileCode,
    Send,
    Database,
    Cloud,
    ArrowRight,
    Server,
    ExternalLink,
    Filter,
    ShieldCheck,
    Layers,
    Package,
    SlidersHorizontal,
    Settings2,
} from 'lucide-react';
import PrConfigurationDashboard from '@/components/sap/PrConfigurationDashboard';
import type { User, HeaderOption, PrDocumentType } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface PrItem {
    id: number;
    item_number: string;
    material_code?: string;
    description: string;
    material_group: string;
    quantity: number | string;
    unit_of_measure: string;
    unit_price: number | string;
    total_price: number | string;
    currency: string;
    plant: string;
    cost_center?: string;
    gl_account?: string;
}

interface PurchaseRequisition {
    id: number;
    pr_number: string;
    sap_pr_number?: string | null;
    user_id?: number | null;
    header_option_id?: number | null;
    header_option?: HeaderOption | null;
    description: string;
    pr_type: string;
    company_code: string;
    plant: string;
    total_amount: number | string;
    currency: string;
    approval_status: 'draft' | 'in_approval' | 'approved' | 'rejected';
    sap_sync_status: 'pending' | 'synced' | 'failed';
    sap_sync_message?: string | null;
    sap_synced_at?: string | null;
    sap_payload?: any;
    sap_response?: any;
    created_at: string;
    user?: User | null;
    items?: PrItem[];
}

interface DashboardProps {
    purchaseRequisitions?: PurchaseRequisition[];
    headerOptions?: HeaderOption[];
    prDocumentTypes?: PrDocumentType[];
    stats?: {
        total_count: number;
        total_amount: number;
        synced_count: number;
        pending_sync_count: number;
        failed_sync_count: number;
        in_approval_count: number;
        approved_count: number;
    };
    sapConfig?: {
        system_name: string;
        edition: string;
        api_service: string;
        odata_version: string;
        entity_set: string;
        status: string;
        tenant_url: string;
        communication_scenario: string;
    };
}

export default function Dashboard({
    purchaseRequisitions = [],
    headerOptions = [],
    prDocumentTypes = [],
    stats = {
        total_count: 0,
        total_amount: 0,
        synced_count: 0,
        pending_sync_count: 0,
        failed_sync_count: 0,
        in_approval_count: 0,
        approved_count: 0,
    },
    sapConfig = {
        system_name: 'SAP S/4HANA Cloud (Public Edition)',
        edition: '2408.3 Enterprise Cloud',
        api_service: 'API_PURCHASEREQUISITION_PROCESS_SRV',
        odata_version: 'OData V4 (JSON format)',
        entity_set: 'PurchaseRequisition',
        status: 'Active & Connected',
        tenant_url: 'https://my300123-api.s4hana.cloud.sap',
        communication_scenario: 'SAP_COM_0053 (Purchase Requisition Integration)',
    },
}: DashboardProps) {
    const { auth } = usePage().props as { auth: { user: User } };
    const user = auth?.user;
    const isSuperAdmin = user?.is_superadmin || user?.role?.name === 'superadmin';
    const isEmployee = user?.is_employee || user?.role?.name === 'employee';

    const [activeTab, setActiveTab] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get('tab');
            if (tabParam) return tabParam;
        }
        return 'overview';
    });
    const [activeSubTab, setActiveSubTab] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const subtabParam = params.get('subtab');
            if (subtabParam) return subtabParam;
        }
        return 'header-options';
    });

    const handleTabChange = (tab: string, subTab?: string) => {
        setActiveTab(tab);
        if (subTab) {
            setActiveSubTab(subTab);
        }
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', tab);
            if (subTab) {
                url.searchParams.set('subtab', subTab);
            } else if (tab !== 'pr-configuration') {
                url.searchParams.delete('subtab');
            }
            window.history.replaceState({}, '', url.toString());
        }
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'synced' | 'pending' | 'failed'>('all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedPrForPayload, setSelectedPrForPayload] = useState<PurchaseRequisition | null>(null);
    const [syncingId, setSyncingId] = useState<number | null>(null);

    // Filter Purchase Requisitions
    const filteredPrs = useMemo(() => {
        return purchaseRequisitions.filter((pr) => {
            const matchesStatus =
                statusFilter === 'all' ? true : pr.sap_sync_status === statusFilter;

            const q = searchQuery.toLowerCase().trim();
            const matchesQuery =
                !q ||
                pr.pr_number.toLowerCase().includes(q) ||
                (pr.sap_pr_number && pr.sap_pr_number.toLowerCase().includes(q)) ||
                pr.description.toLowerCase().includes(q) ||
                pr.plant.toLowerCase().includes(q) ||
                (pr.items &&
                    pr.items.some(
                        (i) =>
                            i.description.toLowerCase().includes(q) ||
                            (i.material_code && i.material_code.toLowerCase().includes(q)) ||
                            (i.cost_center && i.cost_center.toLowerCase().includes(q))
                    ));

            return matchesStatus && matchesQuery;
        });
    }, [purchaseRequisitions, statusFilter, searchQuery]);

    // Aggregate currency totals dynamically based on currencies used in PRs
    const currencyTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        if (purchaseRequisitions && purchaseRequisitions.length > 0) {
            purchaseRequisitions.forEach((pr) => {
                const curr = (pr.currency || 'INR').toUpperCase();
                const amt = Number(pr.total_amount) || 0;
                totals[curr] = (totals[curr] || 0) + amt;
            });
        }
        return totals;
    }, [purchaseRequisitions]);

    // Single PR Sync

    const handleSyncPr = (pr: PurchaseRequisition) => {
        setSyncingId(pr.id);
        router.post(
            `/purchase-requisitions/${pr.id}/sync`,
            {},
            {
                onFinish: () => setSyncingId(null),
            }
        );
    };

    // Sync all pending PRs
    const handleSyncAllPending = () => {
        const pendingPr = purchaseRequisitions.find((p) => p.sap_sync_status === 'pending');
        if (pendingPr) {
            handleSyncPr(pendingPr);
        }
    };

    return (
        <SapAppLayout
            title="Dashboard - Assam Petro-Chemicals Ltd."
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onOpenCreatePr={() => router.visit('/purchase-requisitions/create')}
            onSearch={setSearchQuery}
        >
            <Head title="Dashboard - Assam Petro-Chemicals Ltd." />

            {/* TAB: OVERVIEW / REQUISITIONS */}
            {(activeTab === 'overview' || activeTab === 'requisitions') && (
                <div className="space-y-6">
                    {/* Welcome & Context Banner */}
                    <div className="rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-xs">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl font-bold tracking-tight text-[#1c2d42]">
                                        {isEmployee ? 'My Purchase Requisitions' : 'Procurement Overview & Purchase Requisitions'}
                                    </h1>
                                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-[#0070f2]">
                                        {isEmployee ? (user?.department?.name || 'Requester') : 'Public Cloud 2408'}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-[#556b82]">
                                    {isEmployee ? (
                                        <>
                                            Welcome, <strong className="text-[#1c2d42]">{user?.name}</strong>. Here you can create, view, and track the status of your purchase requisitions for Assam Petro-Chemicals Ltd.
                                        </>
                                    ) : (
                                        <>
                                            Hello, <strong className="text-[#1c2d42]">{user?.name || 'Requester'}</strong>. Dual-posting active: all requisitions are recorded in local database (<code className="font-mono text-xs">apl_pr_db</code>) and synced to SAP Public Cloud via OData V4.
                                        </>
                                    )}
                                </p>
                            </div>

                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => router.visit('/purchase-requisitions/create')}
                                    className="flex items-center gap-2 rounded-md bg-[#0070f2] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#0057c2] active:bg-[#003884]"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>Create Requisition</span>
                                </button>
                                {isSuperAdmin && (
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('pr-configuration')}
                                        className="flex items-center gap-1.5 rounded-md border border-[#d9e2ec] bg-white px-3.5 py-2 text-xs font-semibold text-[#1c2d42] shadow-xs hover:bg-slate-50 transition-colors"
                                    >
                                        <Settings2 className="h-4 w-4 text-[#0070f2]" />
                                        <span>PR Configuration</span>
                                    </button>
                                )}
                                {!isEmployee && stats.pending_sync_count > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleSyncAllPending}
                                        disabled={syncingId !== null}
                                        className="flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-50"
                                    >
                                        <RefreshCw className={`h-3.5 w-3.5 text-amber-700 ${syncingId !== null ? 'animate-spin' : ''}`} />
                                        <span>Sync Pending ({stats.pending_sync_count})</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SAP Fiori KPI Tiles */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Tile 1: Total Requisitions */}
                        <div className="group rounded-xl border border-[#d9e2ec] bg-white p-4.5 shadow-xs transition-all hover:border-[#0070f2]/40 hover:shadow-md">
                            <div className="flex items-center justify-between text-[#556b82]">
                                <span className="text-xs font-semibold uppercase tracking-wider">
                                    Total Requisitions
                                </span>
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                                    <FileSpreadsheet className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-bold tracking-tight text-[#1c2d42]">
                                {stats.total_count}
                            </div>
                            <div className="mt-1 flex items-start justify-between text-xs text-[#556b82]">
                                <span className="pt-0.5">Total Value:</span>
                                <div className="text-right space-y-0.5">
                                    {Object.keys(currencyTotals).length > 0 ? (
                                        Object.entries(currencyTotals).map(([curr, total]) => (
                                            <div key={curr} className="font-semibold text-[#1c2d42]">
                                                {formatCurrency(total, curr)}{' '}
                                                <span className="text-[10px] font-normal text-[#556b82]">{curr}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="font-semibold text-[#1c2d42]">
                                            {formatCurrency(stats.total_amount || 0, 'INR')}{' '}
                                            <span className="text-[10px] font-normal text-[#556b82]">INR</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-[#556b82]">
                                Recorded in MySQL <strong className="text-[#1c2d42]">apl_pr_db</strong>
                            </div>
                        </div>

                        {/* Tile 2: Synced to SAP Public Cloud */}
                        <div className="group rounded-xl border border-emerald-200/80 bg-white p-4.5 shadow-xs transition-all hover:border-emerald-500/50 hover:shadow-md">
                            <div className="flex items-center justify-between text-emerald-800">
                                <span className="text-xs font-semibold uppercase tracking-wider">
                                    Synced to SAP Cloud
                                </span>
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                                    <CheckCircle2 className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-700">
                                {stats.synced_count}
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs text-[#556b82]">
                                <span>OData V4 Status:</span>
                                <span className="inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                                    201 Created
                                </span>
                            </div>
                            <div className="mt-3 border-t border-emerald-100/60 pt-2 text-[11px] text-emerald-700">
                                Verified in SAP S/4HANA Cloud
                            </div>
                        </div>

                        {/* Tile 3: Pending SAP OData Sync */}
                        <div className="group rounded-xl border border-amber-200/80 bg-white p-4.5 shadow-xs transition-all hover:border-amber-500/50 hover:shadow-md">
                            <div className="flex items-center justify-between text-amber-800">
                                <span className="text-xs font-semibold uppercase tracking-wider">
                                    Pending Cloud Sync
                                </span>
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                                    <Clock className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-bold tracking-tight text-amber-700">
                                {stats.pending_sync_count}
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs text-[#556b82]">
                                <span>Queue State:</span>
                                <span className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                                    Ready to POST
                                </span>
                            </div>
                            <div className="mt-3 border-t border-amber-100/60 pt-2 text-[11px] text-amber-800">
                                Payload prepared in local DB
                            </div>
                        </div>

                        {/* Tile 4: Sync Attention / Issues */}
                        <div className="group rounded-xl border border-slate-200 bg-white p-4.5 shadow-xs transition-all hover:border-rose-400 hover:shadow-md">
                            <div className="flex items-center justify-between text-[#556b82]">
                                <span className="text-xs font-semibold uppercase tracking-wider">
                                    Review & Attention
                                </span>
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                                    <AlertTriangle className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-bold tracking-tight text-[#1c2d42]">
                                {stats.failed_sync_count}
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs text-[#556b82]">
                                <span>In Approval:</span>
                                <span className="font-semibold text-[#1c2d42]">{stats.in_approval_count} PRs</span>
                            </div>
                            <div className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-[#556b82]">
                                Master Data / Cost Center check
                            </div>
                        </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="rounded-xl border border-[#d9e2ec] bg-white p-4 shadow-xs">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            {/* Filter Status Tabs */}
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('all')}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                                        statusFilter === 'all'
                                            ? 'bg-[#0070f2] text-white shadow-xs'
                                            : 'bg-slate-100 text-[#556b82] hover:bg-slate-200/70 hover:text-[#1c2d42]'
                                    }`}
                                >
                                    All ({purchaseRequisitions.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('synced')}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                                        statusFilter === 'synced'
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                    }`}
                                >
                                    Synced to SAP ({stats.synced_count})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('pending')}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                                        statusFilter === 'pending'
                                            ? 'bg-amber-600 text-white shadow-xs'
                                            : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                                    }`}
                                >
                                    Pending Sync ({stats.pending_sync_count})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('failed')}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                                        statusFilter === 'failed'
                                            ? 'bg-rose-600 text-white shadow-xs'
                                            : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                                    }`}
                                >
                                    Failed ({stats.failed_sync_count})
                                </button>
                            </div>

                            {/* Table Search Input */}
                            <div className="relative w-full md:w-72">
                                <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#8c9ba5]" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Filter requisitions..."
                                    className="h-8.5 w-full rounded-md border border-[#d9e2ec] pr-3 pl-8 text-xs text-[#1c2d42] placeholder:text-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* SAP Responsive Data Table */}
                        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                            <table className="w-full text-left text-xs text-[#1c2d42]">
                                <thead className="bg-[#f8fafc] text-[11px] font-semibold text-[#556b82] border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-3">PR Number (Internal / SAP)</th>
                                        <th className="py-3 px-3">Description & Line Items</th>
                                        <th className="py-3 px-3">Plant & CoCode</th>
                                        <th className="py-3 px-3 text-right">Total Amount</th>
                                        <th className="py-3 px-3 text-center">SAP OData V4 Status</th>
                                        <th className="py-3 px-3 text-center">Approval</th>
                                        <th className="py-3 px-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {filteredPrs.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-xs text-[#556b82]">
                                                <Package className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                                                <p className="font-semibold text-slate-700 text-sm">No Purchase Requisitions Found</p>
                                                <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                                                    Get started by creating your first purchase requisition for SAP S/4HANA Cloud with all required fields.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => router.visit('/purchase-requisitions/create')}
                                                    className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#0070f2] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2] transition-colors"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                    <span>Create Purchase Requisition</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredPrs.map((pr) => (
                                            <tr key={pr.id} className="hover:bg-slate-50/70 transition-colors">
                                                {/* PR Number */}
                                                <td className="py-3 px-3">
                                                    <div className="font-mono font-bold text-[#0070f2]">
                                                        {pr.pr_number}
                                                    </div>
                                                    {pr.sap_pr_number ? (
                                                        <div className="mt-0.5 inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[#0057c2] border border-blue-200">
                                                            <span>SAP #{pr.sap_pr_number}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="mt-0.5 text-[10px] text-slate-400">
                                                            SAP PR: Pending
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Description & Items */}
                                                <td className="py-3 px-3">
                                                    <div className="font-semibold text-[#1c2d42] max-w-sm truncate" title={pr.description}>
                                                        {pr.description}
                                                    </div>
                                                    <div className="text-[11px] text-[#556b82] mt-0.5">
                                                        {pr.items && pr.items.length > 0 ? (
                                                            <span>
                                                                {pr.items.length} item{pr.items.length > 1 ? 's' : ''} ({pr.items[0].description}{pr.items.length > 1 ? ', ...' : ''})
                                                            </span>
                                                        ) : (
                                                            <span>Standard PR (Type {pr.pr_type})</span>
                                                        )}
                                                        {pr.header_option && (
                                                            <span className="ml-1.5 inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-[#0057c2] border border-blue-200">
                                                                {pr.header_option.name}
                                                            </span>
                                                        )}
                                                        {pr.user && (
                                                            <span className="text-slate-400 ml-1.5 font-normal">
                                                                • By: <strong className="text-slate-600 font-medium">{pr.user.name}</strong> {pr.user.employee_id ? `(${pr.user.employee_id})` : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Plant / CoCode */}
                                                <td className="py-3 px-3">
                                                    <div className="font-mono text-xs font-medium text-[#1c2d42]">
                                                        Plant {pr.plant}
                                                    </div>
                                                    <div className="text-[10px] text-[#556b82]">
                                                        CoCode {pr.company_code}
                                                    </div>
                                                </td>

                                                {/* Total Amount */}
                                                <td className="py-3 px-3 text-right">
                                                    <div className="font-semibold text-xs text-[#1c2d42]">
                                                        {formatCurrency(pr.total_amount, pr.currency)}
                                                    </div>
                                                    <div className="text-[10px] text-[#556b82]">
                                                        {pr.currency}
                                                    </div>
                                                </td>

                                                {/* SAP OData Status */}
                                                <td className="py-3 px-3 text-center">
                                                    {pr.sap_sync_status === 'synced' ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            Synced (201)
                                                        </span>
                                                    ) : pr.sap_sync_status === 'failed' ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800" title={pr.sap_sync_message || 'Sync error'}>
                                                            <AlertTriangle className="h-3 w-3" />
                                                            Sync Failed
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                                                            <Clock className="h-3 w-3" />
                                                            Pending Sync
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Approval */}
                                                <td className="py-3 px-3 text-center">
                                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                                        pr.approval_status === 'approved'
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                            : pr.approval_status === 'in_approval'
                                                            ? 'bg-blue-50 text-[#0070f2] border border-blue-200'
                                                            : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {pr.approval_status.replace('_', ' ')}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                <td className="py-3 px-3 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedPrForPayload(pr)}
                                                            className="flex items-center gap-1 rounded border border-[#d9e2ec] bg-white px-2 py-1 text-[11px] font-semibold text-[#1c2d42] hover:bg-slate-50 transition-colors"
                                                            title="Inspect SAP OData V4 Payload & Items"
                                                        >
                                                            <FileCode className="h-3 w-3 text-[#0070f2]" />
                                                            <span>Payload</span>
                                                        </button>

                                                        {!isEmployee && pr.sap_sync_status !== 'synced' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSyncPr(pr)}
                                                                disabled={syncingId === pr.id}
                                                                className="flex items-center gap-1 rounded bg-[#0070f2] px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs hover:bg-[#0057c2] active:bg-[#003884] disabled:opacity-50 transition-colors"
                                                                title="Post / Sync to SAP S/4HANA Cloud OData V4"
                                                            >
                                                                <Send className={`h-3 w-3 ${syncingId === pr.id ? 'animate-spin' : ''}`} />
                                                                <span>{syncingId === pr.id ? 'Posting...' : 'Sync to SAP'}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: SAP ODATA V4 MONITOR */}
            {activeTab === 'sync-monitor' && (
                <div className="space-y-6">
                    <div className="rounded-xl border border-[#d9e2ec] bg-white p-6 shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h2 className="text-lg font-bold text-[#1c2d42]">SAP Public Cloud OData V4 Monitor</h2>
                                <p className="text-xs text-[#556b82]">
                                    Service: <code className="font-mono text-[#0070f2]">API_PURCHASEREQUISITION_PROCESS_SRV</code>
                                </p>
                            </div>
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Service Online & Available
                            </span>
                        </div>

                        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                <div className="text-xs font-semibold text-[#556b82]">Endpoint URL</div>
                                <div className="mt-1 font-mono text-xs text-[#1c2d42] break-all">
                                    {sapConfig.tenant_url}/sap/opu/odata4/sap/api_purchaserequisition_process_srv/srvd_a2x/sap/purchaserequisition/0001/
                                </div>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                <div className="text-xs font-semibold text-[#556b82]">Protocol & Method</div>
                                <div className="mt-1 text-xs font-semibold text-[#1c2d42]">
                                    OData V4 • HTTP POST (Entity: /PurchaseRequisition)
                                </div>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                <div className="text-xs font-semibold text-[#556b82]">CSRF Protection</div>
                                <div className="mt-1 text-xs font-semibold text-emerald-700">
                                    Token Fetch & Exchange Enabled (x-csrf-token)
                                </div>
                            </div>
                        </div>

                        {/* Live Activity Log */}
                        <div className="mt-6">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#556b82] mb-3">
                                Recent Sync Activity (Last 5 Transmissions)
                            </h3>
                            <div className="overflow-x-auto rounded-lg border border-slate-200">
                                <table className="w-full text-left text-xs text-[#1c2d42]">
                                    <thead className="bg-[#f8fafc] text-[11px] font-semibold text-[#556b82]">
                                        <tr>
                                            <th className="py-2.5 px-3">PR Number</th>
                                            <th className="py-2.5 px-3">SAP PR Assigned</th>
                                            <th className="py-2.5 px-3">Status</th>
                                            <th className="py-2.5 px-3">Message</th>
                                            <th className="py-2.5 px-3 text-right">Synced At</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {purchaseRequisitions.map((pr) => (
                                            <tr key={pr.id}>
                                                <td className="py-2.5 px-3 font-mono font-semibold text-[#0070f2]">
                                                    {pr.pr_number}
                                                </td>
                                                <td className="py-2.5 px-3 font-mono">
                                                    {pr.sap_pr_number || '-'}
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                        pr.sap_sync_status === 'synced'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : pr.sap_sync_status === 'failed'
                                                            ? 'bg-rose-100 text-rose-800'
                                                            : 'bg-amber-100 text-amber-800'
                                                    }`}>
                                                        {pr.sap_sync_status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 text-[11px] text-[#556b82]">
                                                    {pr.sap_sync_message || 'In queue'}
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-mono text-[11px] text-slate-500">
                                                    {pr.sap_synced_at ? new Date(pr.sap_synced_at).toLocaleTimeString() : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: ARCHITECTURE & DUAL POSTING */}
            {activeTab === 'architecture' && (
                <div className="space-y-6">
                    <div className="rounded-xl border border-[#d9e2ec] bg-white p-6 shadow-xs">
                        <div className="border-b border-slate-100 pb-4">
                            <h2 className="text-lg font-bold text-[#1c2d42]">
                                System Architecture: Dual-Posting & SAP Cloud Integration
                            </h2>
                            <p className="text-xs text-[#556b82]">
                                How Purchase Requisitions flow seamlessly from this Laravel React frontend to the local database and SAP Public Cloud Edition
                            </p>
                        </div>

                        {/* Interactive Workflow Diagram */}
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Step 1 */}
                            <div className="relative rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0070f2] text-white font-bold text-xs mb-3">
                                    1
                                </div>
                                <h3 className="text-xs font-bold text-[#1c2d42]">React Frontend</h3>
                                <p className="mt-1 text-[11px] text-[#556b82]">
                                    User enters Requisition Header & Line items in the SAP Fiori Horizon UI. Validates inputs, materials, plants, and cost centers.
                                </p>
                            </div>

                            {/* Step 2 */}
                            <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-white font-bold text-xs mb-3">
                                    2
                                </div>
                                <h3 className="text-xs font-bold text-[#1c2d42]">Laravel Backend</h3>
                                <p className="mt-1 text-[11px] text-[#556b82]">
                                    Atomic DB transaction: saves PR to MySQL table <code className="font-mono text-[10px]">purchase_requisitions</code> and child items to <code className="font-mono text-[10px]">purchase_requisition_items</code>.
                                </p>
                            </div>

                            {/* Step 3 */}
                            <div className="relative rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs mb-3">
                                    3
                                </div>
                                <h3 className="text-xs font-bold text-[#1c2d42]">OData V4 Payload Generator</h3>
                                <p className="mt-1 text-[11px] text-[#556b82]">
                                    Transforms relational database items into standard SAP S/4HANA Cloud JSON schema (<code className="font-mono text-[10px]">API_PURCHASEREQUISITION_PROCESS_SRV</code>).
                                </p>
                            </div>

                            {/* Step 4 */}
                            <div className="relative rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs mb-3">
                                    4
                                </div>
                                <h3 className="text-xs font-bold text-[#1c2d42]">SAP Public Cloud</h3>
                                <p className="mt-1 text-[11px] text-[#556b82]">
                                    SAP Gateway receives POST request, validates workflow, returns HTTP 201 Created and assigns official SAP PR Number.
                                </p>
                            </div>
                        </div>

                        {/* Database Info Box */}
                        <div className="mt-6 rounded-lg border border-slate-200 bg-[#f8fafc] p-4 text-xs">
                            <div className="font-semibold text-[#1c2d42] mb-1 flex items-center gap-2">
                                <Database className="h-4 w-4 text-[#0070f2]" />
                                <span>Configured Database: MySQL (apl_pr_db)</span>
                            </div>
                            <p className="text-[#556b82] text-[11px]">
                                Migrated tables: <code className="font-mono text-[#0070f2]">purchase_requisitions</code>, <code className="font-mono text-[#0070f2]">purchase_requisition_items</code>, <code className="font-mono text-[#0070f2]">users</code>. The dual-posting structure guarantees that no purchase requisition is ever lost even if SAP Public Cloud network experiences intermittent timeouts.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: PR CONFIGURATION (SUPERADMIN) */}
            {(activeTab === 'pr-configuration' || activeTab === 'header-options') && (
                <PrConfigurationDashboard
                    headerOptions={headerOptions}
                    prDocumentTypes={prDocumentTypes}
                    isSuperAdmin={isSuperAdmin}
                    activeSubTab={activeSubTab}
                    onSubTabChange={(sub) => handleTabChange('pr-configuration', sub)}
                />
            )}

            {/* Modal: Create Purchase Requisition */}
            <CreatePurchaseRequisitionModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                headerOptions={headerOptions}
                prDocumentTypes={prDocumentTypes}
            />

            {/* Modal: Inspect SAP OData V4 Payload */}
            <SapPayloadModal
                pr={selectedPrForPayload}
                isOpen={selectedPrForPayload !== null}
                onClose={() => setSelectedPrForPayload(null)}
            />
        </SapAppLayout>
    );
}
