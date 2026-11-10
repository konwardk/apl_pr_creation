import React, { useState, useMemo } from 'react';
import { Head, router, usePage, Link } from '@inertiajs/react';
import SapAppLayout from '@/layouts/sap-app-layout';
import {
    Globe,
    Plus,
    Search,
    Edit2,
    Trash2,
    CheckCircle2,
    AlertCircle,
    X,
    Users,
    Building2,
    Server,
    ExternalLink,
    Copy,
    Check,
    Radio,
    Activity,
    Shield,
    Clock,
    Layers,
    RefreshCw,
    SlidersHorizontal,
    Info,
} from 'lucide-react';
import type { SapUrl, User } from '@/types';

interface PageProps {
    sapUrls: SapUrl[];
    activeRecord?: SapUrl | null;
    stats: {
        total_urls: number;
        active_url: string;
        active_environment: string;
        inactive_count: number;
    };
    filters: {
        search: string;
    };
    flash?: {
        success?: string | null;
        error?: string | null;
    };
}

export default function ChangeUrlIndex({
    sapUrls = [],
    activeRecord = null,
    stats = {
        total_urls: 0,
        active_url: '',
        active_environment: '',
        inactive_count: 0,
    },
    filters,
}: PageProps) {
    const { flash, auth } = usePage().props as {
        flash?: { success?: string; error?: string };
        auth?: { user?: User };
    };

    const isSuperAdmin = Boolean(auth?.user?.is_superadmin || auth?.user?.role?.name === 'superadmin');

    // Search query state
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [copiedUrlId, setCopiedUrlId] = useState<number | null>(null);

    // Modal states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingUrl, setEditingUrl] = useState<SapUrl | null>(null);
    const [deletingUrl, setDeletingUrl] = useState<SapUrl | null>(null);
    const [activatingUrl, setActivatingUrl] = useState<SapUrl | null>(null);

    // Ping / Test connection states
    const [testingUrlId, setTestingUrlId] = useState<number | 'active' | null>(null);
    const [testResult, setTestResult] = useState<{
        id: number | 'active';
        success: boolean;
        status: number;
        latency_ms: number;
        message: string;
    } | null>(null);

    // Create form state
    const [createForm, setCreateForm] = useState({
        environment_name: '',
        url: '',
        username: '',
        password: '',
        description: '',
        is_active: false,
    });
    const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
    const [isCreating, setIsCreating] = useState(false);

    // Edit form state
    const [editForm, setEditForm] = useState({
        environment_name: '',
        url: '',
        username: '',
        password: '',
        description: '',
        is_active: false,
    });
    const [editErrors, setEditErrors] = useState<Record<string, string>>({});
    const [isUpdating, setIsUpdating] = useState(false);

    // Filtered URLs list
    const filteredUrls = useMemo(() => {
        if (!searchQuery.trim()) return sapUrls;
        const q = searchQuery.toLowerCase().trim();
        return sapUrls.filter(
            (u) =>
                u.environment_name.toLowerCase().includes(q) ||
                u.url.toLowerCase().includes(q) ||
                (u.description && u.description.toLowerCase().includes(q))
        );
    }, [sapUrls, searchQuery]);

    // Copy URL to clipboard
    const handleCopyUrl = (url: string, id: number) => {
        navigator.clipboard.writeText(url);
        setCopiedUrlId(id);
        setTimeout(() => setCopiedUrlId(null), 2000);
    };

    // Test connection handler
    const handleTestConnection = async (targetUrl: string, id: number | 'active') => {
        setTestingUrlId(id);
        setTestResult(null);

        try {
            const csrfToken =
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

            const res = await fetch('/change-url/test-connection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({ url: targetUrl }),
            });

            const data = await res.json();
            setTestResult({
                id,
                success: data.success,
                status: data.status,
                latency_ms: data.latency_ms ?? 0,
                message: data.message || (data.success ? 'Connection reachable' : 'Connection failed'),
            });
        } catch (err: any) {
            setTestResult({
                id,
                success: false,
                status: 0,
                latency_ms: 0,
                message: err?.message || 'Network request failed',
            });
        } finally {
            setTestingUrlId(null);
        }
    };

    // Create submit
    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        setCreateErrors({});

        router.post('/change-url', createForm, {
            preserveScroll: true,
            onSuccess: () => {
                setIsCreateOpen(false);
                setCreateForm({
                    environment_name: '',
                    url: '',
                    username: '',
                    password: '',
                    description: '',
                    is_active: false,
                });
            },
            onError: (errs) => {
                setCreateErrors(errs as Record<string, string>);
            },
            onFinish: () => {
                setIsCreating(false);
            },
        });
    };

    // Open Edit modal
    const handleOpenEdit = (item: SapUrl) => {
        setEditingUrl(item);
        setEditForm({
            environment_name: item.environment_name,
            url: item.url,
            username: item.username || '',
            password: item.password || '',
            description: item.description || '',
            is_active: Boolean(item.is_active),
        });
        setEditErrors({});
    };

    // Edit submit
    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUrl) return;

        setIsUpdating(true);
        setEditErrors({});

        router.put(`/change-url/${editingUrl.id}`, editForm, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingUrl(null);
            },
            onError: (errs) => {
                setEditErrors(errs as Record<string, string>);
            },
            onFinish: () => {
                setIsUpdating(false);
            },
        });
    };

    // Activate submit
    const handleConfirmActivate = () => {
        if (!activatingUrl) return;

        router.post(`/change-url/${activatingUrl.id}/activate`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                setActivatingUrl(null);
            },
        });
    };

    // Delete submit
    const handleConfirmDelete = () => {
        if (!deletingUrl) return;

        router.delete(`/change-url/${deletingUrl.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeletingUrl(null);
            },
        });
    };

    return (
        <SapAppLayout title="Change URL - SAP System Configuration" activeTab="system-configuration">
            <Head title="Change URL - Superadmin Portal" />

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
                    <div className="flex items-center gap-2 flex-wrap">
                        <Link
                            href="/users"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#d9e2ec] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#556b82] transition-colors hover:border-slate-300 hover:text-[#1c2d42]"
                        >
                            <Users className="h-3.5 w-3.5 text-slate-500" />
                            <span>Manage Users</span>
                        </Link>
                        <Link
                            href="/departments"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#d9e2ec] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#556b82] transition-colors hover:border-slate-300 hover:text-[#1c2d42]"
                        >
                            <Building2 className="h-3.5 w-3.5 text-slate-500" />
                            <span>Manage Departments</span>
                        </Link>
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#0070f2] bg-[#0070f2] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs">
                            <Globe className="h-3.5 w-3.5 text-white" />
                            <span>Change URL</span>
                        </span>
                    </div>
                </div>

                {/* Header Banner */}
                <div className="rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-xs">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold tracking-tight text-[#1c2d42]">
                                    SAP S/4HANA Cloud Environment URL Management
                                </h1>
                                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                                    <Shield className="h-3 w-3" />
                                    Superadmin Module
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-[#556b82]">
                                Switch and manage the target SAP S/4HANA Public Cloud endpoint URL for Assam Petro-Chemicals Ltd.
                                Only one URL is active at once; all PR modules, CDS views, and line item valuations will immediately use the active URL.
                            </p>
                        </div>

                        {isSuperAdmin && (
                            <button
                                type="button"
                                onClick={() => setIsCreateOpen(true)}
                                className="inline-flex items-center gap-2 rounded-lg bg-[#0070f2] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2] transition-colors self-start sm:self-auto"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Add New SAP URL</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Active URL Spotlight Card */}
                <div className="rounded-xl border-2 border-emerald-500/30 bg-gradient-to-r from-emerald-50/60 via-white to-blue-50/40 p-5 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </span>
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                                    Currently Working SAP URL
                                </span>
                                <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                    {activeRecord?.environment_name || stats.active_environment || 'Quality / Test'}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <code className="font-mono text-sm sm:text-base font-bold text-slate-800 bg-white border border-slate-300 px-3 py-1.5 rounded-lg shadow-2xs break-all">
                                    {activeRecord?.url || stats.active_url || 'https://my443658.s4hana.cloud.sap/'}
                                </code>

                                <button
                                    type="button"
                                    onClick={() => handleCopyUrl(activeRecord?.url || stats.active_url, 0)}
                                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                                    title="Copy URL to clipboard"
                                >
                                    {copiedUrlId === 0 ? (
                                        <Check className="h-4 w-4 text-emerald-600" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </button>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap pt-0.5">
                                <span className="font-semibold text-slate-700">Communication User:</span>
                                <code className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                                    {activeRecord?.username || 'Communication_user'}
                                </code>
                            </div>

                            <p className="text-xs text-[#556b82]">
                                {activeRecord?.description ||
                                    'This URL is active and powering all SAP S/4HANA Cloud CDS views, OData V4 PR creation, and Plant/Master data APIs.'}
                            </p>
                        </div>

                        {/* Test Connection Button */}
                        <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => handleTestConnection(activeRecord?.url || stats.active_url, 'active')}
                                disabled={testingUrlId === 'active'}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 shadow-2xs transition-colors disabled:opacity-50"
                            >
                                <Activity className={`h-3.5 w-3.5 ${testingUrlId === 'active' ? 'animate-spin' : ''}`} />
                                <span>{testingUrlId === 'active' ? 'Pinging Host...' : 'Test Connection'}</span>
                            </button>

                            {testResult && testResult.id === 'active' && (
                                <div
                                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border flex items-center gap-1.5 ${
                                        testResult.success
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}
                                >
                                    {testResult.success ? (
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                    ) : (
                                        <AlertCircle className="h-3.5 w-3.5" />
                                    )}
                                    <span>
                                        {testResult.message} ({testResult.latency_ms}ms)
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* System Statistics Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-[#d9e2ec] bg-white p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#556b82]">Configured URLs</span>
                            <div className="rounded-lg bg-blue-50 p-2 text-[#0070f2]">
                                <Server className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-2 text-2xl font-bold text-[#1c2d42]">{stats.total_urls}</div>
                        <p className="mt-1 text-[11px] text-[#556b82]">Registered SAP tenant destinations</p>
                    </div>

                    <div className="rounded-xl border border-[#d9e2ec] bg-white p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#556b82]">Active Environment</span>
                            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                                <Radio className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-2 text-xl font-bold text-emerald-700 truncate">
                            {activeRecord?.environment_name || stats.active_environment}
                        </div>
                        <p className="mt-1 text-[11px] text-emerald-600 font-medium">Currently serving all live requests</p>
                    </div>

                    <div className="rounded-xl border border-[#d9e2ec] bg-white p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#556b82]">Standby Environments</span>
                            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                                <Layers className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-2 text-2xl font-bold text-[#1c2d42]">{stats.inactive_count}</div>
                        <p className="mt-1 text-[11px] text-[#556b82]">Ready for single-click activation</p>
                    </div>
                </div>

                {/* Search & URL Directory Card */}
                <div className="rounded-xl border border-[#d9e2ec] bg-white shadow-xs overflow-hidden">
                    <div className="border-b border-[#d9e2ec] bg-[#f8fafc] px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-[#0070f2]" />
                            <h2 className="text-sm font-bold text-[#1c2d42]">SAP S/4HANA Environment Directory</h2>
                            <span className="rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-[#0070f2]">
                                {filteredUrls.length} Environments
                            </span>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name, URL or notes..."
                                className="w-full rounded-lg border border-[#d9e2ec] bg-white pl-9 pr-3 py-1.5 text-xs text-[#1c2d42] placeholder-slate-400 focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] outline-none"
                            />
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-[#d9e2ec] bg-[#f8fafc]/50 text-[#556b82]">
                                    <th className="py-3 px-4 font-semibold w-24">Status</th>
                                    <th className="py-3 px-4 font-semibold w-40">Environment Name</th>
                                    <th className="py-3 px-4 font-semibold">Base / Tenant URL</th>
                                    <th className="py-3 px-4 font-semibold hidden md:table-cell">Description</th>
                                    <th className="py-3 px-4 font-semibold hidden lg:table-cell w-36">Last Updated</th>
                                    <th className="py-3 px-4 font-semibold text-right w-48">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#d9e2ec]">
                                {filteredUrls.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-xs text-[#556b82]">
                                            No SAP URLs found matching your search.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUrls.map((item) => {
                                        const isActive = Boolean(item.is_active);
                                        const isTestingThis = testingUrlId === item.id;
                                        const thisResult = testResult && testResult.id === item.id ? testResult : null;

                                        return (
                                            <tr
                                                key={item.id}
                                                className={`transition-colors ${
                                                    isActive ? 'bg-emerald-50/30 hover:bg-emerald-50/50' : 'hover:bg-slate-50'
                                                }`}
                                            >
                                                {/* Status Column */}
                                                <td className="py-3 px-4 align-top">
                                                    {isActive ? (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Environment Name */}
                                                <td className="py-3 px-4 align-top font-semibold text-[#1c2d42]">
                                                    <div className="flex items-center gap-1.5">
                                                        <span>{item.environment_name}</span>
                                                    </div>
                                                    <div className="mt-0.5 text-[10px] text-slate-500 font-mono">
                                                        User: {item.username || '—'}
                                                    </div>
                                                </td>

                                                {/* URL */}
                                                <td className="py-3 px-4 align-top">
                                                    <div className="flex items-center gap-2">
                                                        <code className="font-mono text-xs text-[#1c2d42] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 break-all select-all">
                                                            {item.url}
                                                        </code>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyUrl(item.url, item.id)}
                                                            className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                                                            title="Copy URL"
                                                        >
                                                            {copiedUrlId === item.id ? (
                                                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                            ) : (
                                                                <Copy className="h-3.5 w-3.5" />
                                                            )}
                                                        </button>
                                                    </div>

                                                    {/* Test Result under URL */}
                                                    {thisResult && (
                                                        <div
                                                            className={`mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded inline-flex items-center gap-1 ${
                                                                thisResult.success
                                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                            }`}
                                                        >
                                                            {thisResult.success ? (
                                                                <CheckCircle2 className="h-3 w-3" />
                                                            ) : (
                                                                <AlertCircle className="h-3 w-3" />
                                                            )}
                                                            <span>
                                                                {thisResult.message} ({thisResult.latency_ms}ms)
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Description */}
                                                <td className="py-3 px-4 align-top text-[#556b82] hidden md:table-cell max-w-xs">
                                                    <p className="line-clamp-2">{item.description || '—'}</p>
                                                </td>

                                                {/* Last Updated */}
                                                <td className="py-3 px-4 align-top text-[11px] text-[#556b82] hidden lg:table-cell">
                                                    <div>{new Date(item.updated_at).toLocaleDateString()}</div>
                                                    {item.updater?.name && (
                                                        <div className="text-[10px] text-slate-400">by {item.updater.name}</div>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="py-3 px-4 align-top text-right">
                                                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                                        {/* Test Ping */}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTestConnection(item.url, item.id)}
                                                            disabled={isTestingThis}
                                                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                                                            title="Ping host to test connectivity"
                                                        >
                                                            <Activity className={`h-3 w-3 ${isTestingThis ? 'animate-spin' : ''}`} />
                                                            <span className="hidden sm:inline">Test</span>
                                                        </button>

                                                        {/* Activate button */}
                                                        {!isActive ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setActivatingUrl(item)}
                                                                className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                                                                title="Set this URL as the active SAP environment"
                                                            >
                                                                <Radio className="h-3 w-3" />
                                                                <span>Activate</span>
                                                            </button>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-800 border border-emerald-300">
                                                                <Check className="h-3 w-3" />
                                                                <span>Working</span>
                                                            </span>
                                                        )}

                                                        {/* Edit button */}
                                                        {isSuperAdmin && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEdit(item)}
                                                                className="rounded p-1 text-slate-500 hover:text-[#0070f2] hover:bg-blue-50 transition-colors"
                                                                title="Edit SAP URL"
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        )}

                                                        {/* Delete button (disabled if active) */}
                                                        {isSuperAdmin && !isActive && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setDeletingUrl(item)}
                                                                className="rounded p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                                title="Delete SAP URL"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
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

                {/* Information Card */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-xs text-[#556b82] space-y-2">
                    <div className="flex items-center gap-2 text-[#0070f2] font-bold">
                        <Info className="h-4 w-4" />
                        <span>How Single Active URL Works</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-slate-600">
                        <li>
                            Assam Petro-Chemicals Ltd. PR system maintains strict single-active URL routing.
                            At any point in time, exactly <strong>one</strong> SAP S/4HANA Cloud environment is active.
                        </li>
                        <li>
                            When you activate a URL, all existing endpoints (Purchase Requisition creation, CDS Views for Document Types,
                            Materials valuation, Plants, Purchasing Groups, and Purchasing Organizations) dynamically re-point to that URL without application restart.
                        </li>
                        <li>
                            You cannot delete the currently active URL. To delete an environment, first activate a different URL.
                        </li>
                    </ul>
                </div>
            </div>

            {/* CREATE MODAL */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs">
                    <div className="w-full max-w-lg rounded-2xl border border-[#d9e2ec] bg-white shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-[#d9e2ec] px-6 py-4">
                            <div className="flex items-center gap-2.5">
                                <div className="rounded-lg bg-blue-50 p-2 text-[#0070f2]">
                                    <Globe className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-[#1c2d42]">Add New SAP Environment URL</h3>
                                    <p className="text-[11px] text-[#556b82]">
                                        Define an SAP S/4HANA Cloud host destination
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCreateOpen(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
                            {/* Environment Name */}
                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                    Environment Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={createForm.environment_name}
                                    onChange={(e) =>
                                        setCreateForm({ ...createForm, environment_name: e.target.value })
                                    }
                                    placeholder="e.g. Quality / Test, Production, or Sandbox"
                                    className="w-full rounded-lg border border-[#d9e2ec] bg-white px-3 py-2 text-xs text-[#1c2d42] placeholder-slate-400 focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] outline-none"
                                />
                                {createErrors.environment_name && (
                                    <p className="mt-1 text-[11px] text-rose-600">{createErrors.environment_name}</p>
                                )}
                            </div>

                            {/* Base / Tenant URL */}
                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                    Base / Tenant URL <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="url"
                                    required
                                    value={createForm.url}
                                    onChange={(e) => setCreateForm({ ...createForm, url: e.target.value })}
                                    placeholder="https://my443658.s4hana.cloud.sap/"
                                    className="w-full rounded-lg border border-[#d9e2ec] bg-white px-3 py-2 text-xs font-mono text-[#1c2d42] placeholder-slate-400 focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] outline-none"
                                />
                                <p className="mt-1 text-[10px] text-slate-500">
                                    Full protocol and host (e.g. https://my443658.s4hana.cloud.sap/)
                                </p>
                                {createErrors.url && (
                                    <p className="mt-1 text-[11px] text-rose-600">{createErrors.url}</p>
                                )}
                            </div>

                            {/* Credentials Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                        Communication User
                                    </label>
                                    <input
                                        type="text"
                                        value={createForm.username}
                                        onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                                        placeholder="e.g. Communication_user"
                                        className="w-full rounded-lg border border-[#d9e2ec] bg-white px-3 py-2 text-xs font-mono text-[#1c2d42] placeholder-slate-400 focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] outline-none"
                                    />
                                    {createErrors.username && (
                                        <p className="mt-1 text-[11px] text-rose-600">{createErrors.username}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        value={createForm.password}
                                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                        placeholder="Communication user password"
                                        className="w-full rounded-lg border border-[#d9e2ec] bg-white px-3 py-2 text-xs font-mono text-[#1c2d42] placeholder-slate-400 focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] outline-none"
                                    />
                                    {createErrors.password && (
                                        <p className="mt-1 text-[11px] text-rose-600">{createErrors.password}</p>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">Description / Notes</label>
                                <textarea
                                    rows={2}
                                    value={createForm.description}
                                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                    placeholder="Optional notes regarding this SAP environment, communication scenario, or purpose..."
                                    className="w-full rounded-lg border border-[#d9e2ec] bg-white px-3 py-2 text-xs text-[#1c2d42] placeholder-slate-400 focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] outline-none"
                                />
                                {createErrors.description && (
                                    <p className="mt-1 text-[11px] text-rose-600">{createErrors.description}</p>
                                )}
                            </div>

                            {/* Set as Active immediately */}
                            <label className="flex items-center gap-2 cursor-pointer pt-1">
                                <input
                                    type="checkbox"
                                    checked={createForm.is_active}
                                    onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
                                    className="h-4 w-4 rounded border-slate-300 text-[#0070f2] focus:ring-[#0070f2]"
                                />
                                <span className="text-xs font-medium text-[#1c2d42]">
                                    Set as active SAP URL immediately (will switch working URL)
                                </span>
                            </label>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#d9e2ec]">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="rounded-lg border border-[#d9e2ec] bg-white px-4 py-2 text-xs font-semibold text-[#556b82] hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="rounded-lg bg-[#0070f2] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0057c2] transition-colors disabled:opacity-50"
                                >
                                    {isCreating ? 'Saving...' : 'Save SAP URL'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {editingUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs">
                    <div className="w-full max-w-lg rounded-2xl border border-[#d9e2ec] bg-white shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-[#d9e2ec] px-6 py-4">
                            <div className="flex items-center gap-2.5">
                                <div className="rounded-lg bg-blue-50 p-2 text-[#0070f2]">
                                    <Edit2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-[#1c2d42]">Edit SAP Environment URL</h3>
                                    <p className="text-[11px] text-[#556b82]">
                                        Modify details for {editingUrl.environment_name}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingUrl(null)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                            {/* Environment Name */}
                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                    Environment Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.environment_name}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, environment_name: e.target.value })
                                    }
                                    className="w-full rounded-lg border border-[#d9e2ec] bg-white px-3 py-2 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] outline-none"
                                />
                                {editErrors.environment_name && (
                                    <p className="mt-1 text-[11px] text-rose-600">{editErrors.environment_name}</p>
                                )}
                            </div>

                            {/* Base / Tenant URL */}
                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                    Base / Tenant URL <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="url"
                                    required
                                    value={editForm.url}
                                    onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                                    className="w-full rounded-lg border border-[#d9e2ec] bg-white px-3 py-2 text-xs font-mono text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] outline-none"
                                />
                                {editErrors.url && <p className="mt-1 text-[11px] text-rose-600">{editErrors.url}</p>}
                            </div>

                            {/* Credentials Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                        Communication User
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.username}
                                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                        placeholder="e.g. Communication_user"
                                        className="w-full rounded-lg border border-[#d9e2ec] bg-white px-3 py-2 text-xs font-mono text-[#1c2d42] placeholder-slate-400 focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] outline-none"
                                    />
                                    {editErrors.username && (
                                        <p className="mt-1 text-[11px] text-rose-600">{editErrors.username}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        value={editForm.password}
                                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                        placeholder="Leave blank to keep current"
                                        className="w-full rounded-lg border border-[#d9e2ec] bg-white px-3 py-2 text-xs font-mono text-[#1c2d42] placeholder-slate-400 focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] outline-none"
                                    />
                                    <p className="mt-1 text-[10px] text-slate-500">Leave blank to keep existing password</p>
                                    {editErrors.password && (
                                        <p className="mt-1 text-[11px] text-rose-600">{editErrors.password}</p>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">Description / Notes</label>
                                <textarea
                                    rows={2}
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    className="w-full rounded-lg border border-[#d9e2ec] bg-white px-3 py-2 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] outline-none"
                                />
                                {editErrors.description && (
                                    <p className="mt-1 text-[11px] text-rose-600">{editErrors.description}</p>
                                )}
                            </div>

                            {/* Active Toggle */}
                            <label className="flex items-center gap-2 cursor-pointer pt-1">
                                <input
                                    type="checkbox"
                                    checked={editForm.is_active}
                                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                                    className="h-4 w-4 rounded border-slate-300 text-[#0070f2] focus:ring-[#0070f2]"
                                />
                                <span className="text-xs font-medium text-[#1c2d42]">
                                    Active SAP URL (working destination for the application)
                                </span>
                            </label>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#d9e2ec]">
                                <button
                                    type="button"
                                    onClick={() => setEditingUrl(null)}
                                    className="rounded-lg border border-[#d9e2ec] bg-white px-4 py-2 text-xs font-semibold text-[#556b82] hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdating}
                                    className="rounded-lg bg-[#0070f2] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0057c2] transition-colors disabled:opacity-50"
                                >
                                    {isUpdating ? 'Updating...' : 'Update SAP URL'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ACTIVATE CONFIRMATION MODAL */}
            {activatingUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs">
                    <div className="w-full max-w-md rounded-2xl border border-[#d9e2ec] bg-white shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="p-6 text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                <Radio className="h-6 w-6" />
                            </div>
                            <h3 className="text-base font-bold text-[#1c2d42]">
                                Switch Active SAP URL?
                            </h3>
                            <p className="mt-2 text-xs text-[#556b82] leading-relaxed">
                                You are about to switch the live working SAP URL to:
                            </p>
                            <div className="mt-3 bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-left">
                                <div className="text-xs font-bold text-slate-800">{activatingUrl.environment_name}</div>
                                <code className="text-xs font-mono text-[#0070f2] break-all">{activatingUrl.url}</code>
                            </div>
                            <p className="mt-3 text-[11px] text-slate-500">
                                This will deactivate the current active URL. All Purchase Requisitions, line item CDS valuation,
                                and master data synchronizations will immediately point to this new destination.
                            </p>
                            <div className="mt-6 flex items-center justify-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setActivatingUrl(null)}
                                    className="rounded-lg border border-[#d9e2ec] bg-white px-4 py-2 text-xs font-semibold text-[#556b82] hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmActivate}
                                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                                >
                                    Yes, Activate URL Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {deletingUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs">
                    <div className="w-full max-w-md rounded-2xl border border-[#d9e2ec] bg-white shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="p-6 text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                                <Trash2 className="h-6 w-6" />
                            </div>
                            <h3 className="text-base font-bold text-[#1c2d42]">Delete SAP URL?</h3>
                            <p className="mt-2 text-xs text-[#556b82]">
                                Are you sure you want to remove <strong>{deletingUrl.environment_name}</strong> ({deletingUrl.url})?
                                This action cannot be undone.
                            </p>
                            <div className="mt-6 flex items-center justify-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setDeletingUrl(null)}
                                    className="rounded-lg border border-[#d9e2ec] bg-white px-4 py-2 text-xs font-semibold text-[#556b82] hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmDelete}
                                    className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-xs"
                                >
                                    Yes, Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </SapAppLayout>
    );
}
