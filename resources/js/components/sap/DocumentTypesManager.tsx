import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    CloudDownload,
    Database,
    RefreshCw,
    Search,
    CheckCircle2,
    SlidersHorizontal,
    FileText,
    ExternalLink,
    AlertCircle,
    Server,
    ShieldCheck,
    Check,
    X,
    Key,
    Edit2,
    Trash2,
    Save,
    Sparkles,
    Eye,
    Globe,
    Layers,
    Clock,
} from 'lucide-react';
import type { PrDocumentType, StagedSapPrDocumentType, SapCdsFetchResponse } from '@/types';

interface DocumentTypesManagerProps {
    documentTypes?: PrDocumentType[];
    isSuperAdmin?: boolean;
}

export default function DocumentTypesManager({
    documentTypes: initialDocumentTypes = [],
    isSuperAdmin = true,
}: DocumentTypesManagerProps) {
    const [documentTypes, setDocumentTypes] = useState<PrDocumentType[]>(initialDocumentTypes);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    // SAP CDS View Fetch / Staging state
    const [isFetchingSap, setIsFetchingSap] = useState(false);
    const [stagedResponse, setStagedResponse] = useState<SapCdsFetchResponse | null>(null);
    const [selectedStagedCodes, setSelectedStagedCodes] = useState<Set<string>>(new Set());
    const [isSavingToDb, setIsSavingToDb] = useState(false);

    // SAP Credentials Modal State
    const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
    const [sapUsername, setSapUsername] = useState('');
    const [sapPassword, setSapPassword] = useState('');
    const [sapEndpoint, setSapEndpoint] = useState(
        'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_PURCHASEREQTYPE_CDS/YY1_PURCHASEREQTYPE?$format=json'
    );

    // Feedback message
    const [alertFeedback, setAlertFeedback] = useState<{
        type: 'success' | 'error' | 'info';
        message: string;
    } | null>(null);

    // Edit Modal State
    const [editingDocType, setEditingDocType] = useState<PrDocumentType | null>(null);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editCategory, setEditCategory] = useState('');

    // Trigger "Get PR Document Type" from SAP CDS View
    const handleGetPrDocumentTypes = async (customUser?: string, customPass?: string) => {
        setIsFetchingSap(true);
        setAlertFeedback(null);

        try {
            const csrfToken =
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

            const response = await fetch('/pr-document-types/fetch-sap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    username: customUser !== undefined ? customUser : sapUsername || undefined,
                    password: customPass !== undefined ? customPass : sapPassword || undefined,
                    endpoint: sapEndpoint || undefined,
                }),
            });

            const data: SapCdsFetchResponse = await response.json();

            if (data.items && data.items.length > 0) {
                setStagedResponse(data);
                // Pre-select all items by default for ease of saving
                setSelectedStagedCodes(new Set(data.items.map((i) => i.code)));
                setAlertFeedback({
                    type: data.is_live ? 'success' : 'info',
                    message: data.message,
                });
            } else {
                setAlertFeedback({
                    type: 'error',
                    message: data.message || 'No PR document types returned from the CDS view.',
                });
            }
        } catch (error: any) {
            setAlertFeedback({
                type: 'error',
                message: 'Failed to communicate with backend fetch endpoint: ' + (error?.message || error),
            });
        } finally {
            setIsFetchingSap(false);
        }
    };

    // Toggle individual checkbox in staging preview
    const toggleStagedSelection = (code: string) => {
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

    // Select or deselect all staged items
    const toggleSelectAllStaged = () => {
        if (!stagedResponse?.items) return;
        if (selectedStagedCodes.size === stagedResponse.items.length) {
            setSelectedStagedCodes(new Set());
        } else {
            setSelectedStagedCodes(new Set(stagedResponse.items.map((i) => i.code)));
        }
    };

    // Save selected staged items to MySQL database
    const handleSaveToDatabase = async () => {
        if (!stagedResponse?.items || selectedStagedCodes.size === 0) return;

        const itemsToSave = stagedResponse.items.filter((i) => selectedStagedCodes.has(i.code));
        setIsSavingToDb(true);

        try {
            const csrfToken =
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

            const response = await fetch('/pr-document-types/save-sap', {
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

            const result = await response.json();

            if (result.success) {
                setAlertFeedback({
                    type: 'success',
                    message: result.message,
                });
                if (result.data) {
                    setDocumentTypes(result.data);
                }
                // Close staging preview once saved
                setStagedResponse(null);
            } else {
                setAlertFeedback({
                    type: 'error',
                    message: result.message || 'Failed to save document types to database.',
                });
            }
        } catch (error: any) {
            setAlertFeedback({
                type: 'error',
                message: 'Error saving records: ' + (error?.message || error),
            });
        } finally {
            setIsSavingToDb(false);
        }
    };

    // Toggle status (active/inactive)
    const handleToggleStatus = (id: number) => {
        router.post(
            `/pr-document-types/${id}/toggle-status`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setDocumentTypes((prev) =>
                        prev.map((dt) => (dt.id === id ? { ...dt, is_active: !dt.is_active } : dt))
                    );
                },
            }
        );
    };

    // Open Edit Modal
    const openEditModal = (dt: PrDocumentType) => {
        setEditingDocType(dt);
        setEditName(dt.name);
        setEditDescription(dt.description || '');
        setEditCategory(dt.category || '');
    };

    // Save Edit
    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDocType) return;

        router.put(
            `/pr-document-types/${editingDocType.id}`,
            {
                name: editName,
                description: editDescription,
                category: editCategory,
                is_active: editingDocType.is_active,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setDocumentTypes((prev) =>
                        prev.map((dt) =>
                            dt.id === editingDocType.id
                                ? { ...dt, name: editName, description: editDescription, category: editCategory }
                                : dt
                        )
                    );
                    setEditingDocType(null);
                    setAlertFeedback({
                        type: 'success',
                        message: `Document Type '${editingDocType.code}' updated successfully.`,
                    });
                },
            }
        );
    };

    // Delete a document type
    const handleDelete = (dt: PrDocumentType) => {
        if (
            !confirm(
                `Are you sure you want to delete '${dt.code} - ${dt.name}' from your MySQL database?`
            )
        ) {
            return;
        }

        router.delete(`/pr-document-types/${dt.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDocumentTypes((prev) => prev.filter((item) => item.id !== dt.id));
                setAlertFeedback({
                    type: 'success',
                    message: `Document Type '${dt.code}' removed from local database.`,
                });
            },
        });
    };

    // Filter document types
    const filteredDocTypes = documentTypes.filter((dt) => {
        const matchesCategory =
            categoryFilter === 'all' ||
            (dt.category && dt.category.toLowerCase().includes(categoryFilter.toLowerCase()));

        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
            !q ||
            dt.code.toLowerCase().includes(q) ||
            dt.name.toLowerCase().includes(q) ||
            (dt.description && dt.description.toLowerCase().includes(q)) ||
            (dt.category && dt.category.toLowerCase().includes(q));

        return matchesCategory && matchesQuery;
    });

    const activeCount = documentTypes.filter((dt) => dt.is_active).length;

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className="rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-xs">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0070f2] text-white shadow-xs">
                                <FileText className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-[#1c2d42]">
                                    SAP PR Document Types
                                </h2>
                                <p className="text-xs text-[#556b82]">
                                    CDS View: <code className="font-mono text-[#0070f2] font-semibold">I_PurchaseRequisitionType</code> (Exposed via <code className="font-mono text-slate-700">YY1_PURCHASEREQTYPE_CDS</code>)
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Prominent Action Button: "Get PR Document Type" (Replaces manual Create button) */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => setIsCredentialsModalOpen(true)}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
                            title="Configure SAP Communication User and Endpoint"
                        >
                            <Key className="h-3.5 w-3.5 text-slate-500" />
                            <span>SAP Cloud Config</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleGetPrDocumentTypes()}
                            disabled={isFetchingSap}
                            className="flex items-center gap-2 rounded-lg bg-[#0070f2] px-4 py-2 text-xs font-bold text-white hover:bg-[#0057c2] transition-colors shadow-xs disabled:opacity-50"
                        >
                            {isFetchingSap ? (
                                <>
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    <span>Fetching from SAP CDS View...</span>
                                </>
                            ) : (
                                <>
                                    <CloudDownload className="h-4 w-4" />
                                    <span>Get PR Document Type</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Sub-bar: Integration Endpoint & Real-Time Stats */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-[#556b82]">
                        <Server className="h-3.5 w-3.5 text-[#0070f2]" />
                        <span className="font-medium">Target SAP Tenant:</span>
                        <code className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                            my443544-api.s4hana.cloud.sap
                        </code>
                        <span className="hidden sm:inline text-slate-300">•</span>
                        <span className="hidden sm:inline text-slate-500">Service: <strong className="text-slate-700">YY1_PURCHASEREQTYPE_CDS</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-semibold text-[#0070f2]">
                            {documentTypes.length} Stored in MySQL
                        </span>
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                            {activeCount} Active in PR Form
                        </span>
                    </div>
                </div>
            </div>

            {/* Alert Feedback Banner */}
            {alertFeedback && (
                <div
                    className={`flex items-start justify-between gap-3 rounded-xl border p-4 text-xs font-medium ${
                        alertFeedback.type === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                            : alertFeedback.type === 'error'
                            ? 'border-rose-200 bg-rose-50 text-rose-900'
                            : 'border-blue-200 bg-blue-50 text-blue-900'
                    }`}
                >
                    <div className="flex items-center gap-2.5">
                        {alertFeedback.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                        {alertFeedback.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />}
                        {alertFeedback.type === 'info' && <Sparkles className="h-4 w-4 text-[#0070f2] shrink-0" />}
                        <span>{alertFeedback.message}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setAlertFeedback(null)}
                        className="text-slate-400 hover:text-slate-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* LIVE STAGED PREVIEW PANEL (Appears when "Get PR Document Type" is triggered) */}
            {stagedResponse && stagedResponse.items && (
                <div className="rounded-xl border-2 border-[#0070f2] bg-white shadow-lg overflow-hidden animate-in fade-in duration-200">
                    {/* Staging Header */}
                    <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-[#0070f2]" />
                                    <h3 className="text-sm font-bold text-[#1c2d42]">
                                        Available PR Document Types from SAP S/4HANA Cloud
                                    </h3>
                                    <span className="rounded bg-blue-100 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-[#0070f2]">
                                        {stagedResponse.items.length} Retrieved
                                    </span>
                                </div>
                                <p className="text-xs text-[#556b82]">
                                    Source: <strong className="text-slate-700">{stagedResponse.source}</strong>. Inspect the document types below, select what you wish to commit, and save to your local database.
                                </p>
                            </div>

                            {/* Staging Actions */}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={toggleSelectAllStaged}
                                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    {selectedStagedCodes.size === stagedResponse.items.length
                                        ? 'Deselect All'
                                        : 'Select All'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStagedResponse(null)}
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveToDatabase}
                                    disabled={selectedStagedCodes.size === 0 || isSavingToDb}
                                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
                                >
                                    {isSavingToDb ? (
                                        <>
                                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                            <span>Saving to MySQL...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-3.5 w-3.5" />
                                            <span>Save to Database ({selectedStagedCodes.size})</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Staging Table */}
                    <div className="overflow-x-auto max-h-96 overflow-y-auto divide-y divide-slate-100">
                        <table className="w-full text-left text-xs">
                            <thead className="sticky top-0 bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-[#556b82] border-b border-slate-200 z-10">
                                <tr>
                                    <th className="py-2.5 px-4 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedStagedCodes.size === stagedResponse.items.length &&
                                                stagedResponse.items.length > 0
                                            }
                                            onChange={toggleSelectAllStaged}
                                            className="h-3.5 w-3.5 rounded border-slate-300 text-[#0070f2] focus:ring-[#0070f2]"
                                        />
                                    </th>
                                    <th className="py-2.5 px-4">SAP Type Code</th>
                                    <th className="py-2.5 px-4">Description (CDS View Name)</th>
                                    <th className="py-2.5 px-4">Category</th>
                                    <th className="py-2.5 px-4">Business Usage Guidance</th>
                                    <th className="py-2.5 px-4 text-center">Database Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {stagedResponse.items.map((item) => {
                                    const isSelected = selectedStagedCodes.has(item.code);
                                    return (
                                        <tr
                                            key={item.code}
                                            onClick={() => toggleStagedSelection(item.code)}
                                            className={`cursor-pointer transition-colors ${
                                                isSelected ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            <td
                                                className="py-3 px-4 text-center"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleStagedSelection(item.code)}
                                                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#0070f2] focus:ring-[#0070f2]"
                                                />
                                            </td>
                                            <td className="py-3 px-4 font-mono font-bold text-[#1c2d42]">
                                                <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs">
                                                    {item.code}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 font-semibold text-[#1c2d42]">
                                                {item.name}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                                                    {item.category || 'Standard SAP'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-[#556b82] max-w-xs truncate">
                                                {item.description || '—'}
                                            </td>
                                            <td className="py-3 px-4 text-center whitespace-nowrap">
                                                {item.is_in_database ? (
                                                    <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                                        <Check className="h-3 w-3 text-emerald-600" />
                                                        <span>Already in Database</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded bg-blue-100 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-[#0070f2]">
                                                        <Sparkles className="h-3 w-3 text-[#0070f2]" />
                                                        <span>New from SAP</span>
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Staging Footer Bar */}
                    <div className="border-t border-slate-200 bg-[#f8fafc] px-4 py-3 flex items-center justify-between text-xs text-[#556b82]">
                        <span>
                            {selectedStagedCodes.size} of {stagedResponse.items.length} document types selected for MySQL persistence.
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setStagedResponse(null)}
                                className="text-slate-500 hover:text-slate-700"
                            >
                                Dismiss
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveToDatabase}
                                disabled={selectedStagedCodes.size === 0 || isSavingToDb}
                                className="rounded-lg bg-emerald-600 px-3.5 py-1.5 font-bold text-white hover:bg-emerald-700 transition-colors shadow-2xs disabled:opacity-50"
                            >
                                Commit to Database
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SAVED MYSQL DATABASE TABLE (apl_pr_db) */}
            <div className="rounded-xl border border-[#d9e2ec] bg-white shadow-xs overflow-hidden">
                {/* Search & Filter Bar */}
                <div className="border-b border-[#d9e2ec] bg-[#f8fafc] p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-[#0070f2]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-[#1c2d42]">
                            Database Records (Table: <code className="font-mono text-[#0070f2]">pr_document_types</code>)
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search document types..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8 w-56 rounded-md border border-[#d9e2ec] bg-white pl-8 pr-3 text-xs text-[#1c2d42] placeholder:text-slate-400 focus:border-[#0070f2] focus:outline-none focus:ring-1 focus:ring-[#0070f2]"
                            />
                        </div>

                        {/* Category filter */}
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="h-8 rounded-md border border-[#d9e2ec] bg-white px-2.5 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:outline-none"
                        >
                            <option value="all">All Categories</option>
                            <option value="Domestic">Domestic</option>
                            <option value="Import">Import</option>
                            <option value="Standard">Standard SAP</option>
                            <option value="Special">Special Items</option>
                            <option value="Outline">Outline Agreement</option>
                        </select>
                    </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-[#556b82] border-b border-slate-200">
                            <tr>
                                <th className="py-3 px-4">Code (BSART)</th>
                                <th className="py-3 px-4">Display Name</th>
                                <th className="py-3 px-4">Category</th>
                                <th className="py-3 px-4">Description & Guidance</th>
                                <th className="py-3 px-4">SAP Source</th>
                                <th className="py-3 px-4 text-center">Form Visibility</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredDocTypes.map((dt) => (
                                <tr key={dt.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-3 px-4 font-mono font-bold text-[#1c2d42]">
                                        <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs">
                                            {dt.code}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 font-semibold text-[#1c2d42]">
                                        {dt.name}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                                            {dt.category || 'Standard SAP'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-[#556b82] max-w-sm">
                                        <p className="line-clamp-2">{dt.description || '—'}</p>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-mono text-[10px] text-[#0070f2]">
                                                {dt.sap_source}
                                            </span>
                                            {dt.synced_at && (
                                                <span className="text-[10px] text-slate-400">
                                                    Synced {new Date(dt.synced_at).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleStatus(dt.id)}
                                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition-colors ${
                                                dt.is_active
                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                                    : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                                            }`}
                                        >
                                            {dt.is_active ? 'Active' : 'Disabled'}
                                        </button>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(dt)}
                                                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#0070f2] transition-colors"
                                                title="Edit Description / Guidance"
                                            >
                                                <Edit2 className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(dt)}
                                                className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                                title="Delete from Database"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {filteredDocTypes.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-10 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <FileText className="h-8 w-8 text-slate-300" />
                                            <p className="text-xs font-medium">
                                                {documentTypes.length === 0
                                                    ? "No PR Document Types in MySQL database yet. Click 'Get PR Document Type' above to fetch from SAP S/4HANA Cloud."
                                                    : `No document types match "${searchQuery}".`}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Database Table Footer */}
                <div className="border-t border-[#d9e2ec] bg-[#f8fafc] px-4 py-3 flex items-center justify-between text-xs text-[#556b82]">
                    <span>
                        Showing {filteredDocTypes.length} of {documentTypes.length} configured PR Document Types
                    </span>
                    <span className="text-[11px] text-slate-400">
                        Active records immediately feed into the PR Creation Form dropdown.
                    </span>
                </div>
            </div>

            {/* EDIT MODAL */}
            {editingDocType && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                    <div className="w-full max-w-md rounded-xl border border-[#d9e2ec] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <div className="flex items-center gap-2">
                                <Edit2 className="h-4 w-4 text-[#0070f2]" />
                                <h3 className="text-sm font-bold text-[#1c2d42]">
                                    Edit Document Type: <code className="font-mono text-[#0070f2]">{editingDocType.code}</code>
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingDocType(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold text-[#1c2d42] mb-1">
                                    Display Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    required
                                    className="w-full rounded-md border border-[#d9e2ec] px-3 py-2 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-[#1c2d42] mb-1">
                                    Procurement Category
                                </label>
                                <input
                                    type="text"
                                    value={editCategory}
                                    onChange={(e) => setEditCategory(e.target.value)}
                                    placeholder="e.g. Domestic Composite, Standard SAP"
                                    className="w-full rounded-md border border-[#d9e2ec] px-3 py-2 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-[#1c2d42] mb-1">
                                    Guidance / Description for Requesters
                                </label>
                                <textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    rows={3}
                                    placeholder="Enter instructions for employees when selecting this document type..."
                                    className="w-full rounded-md border border-[#d9e2ec] px-3 py-2 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setEditingDocType(null)}
                                    className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-[#0070f2] px-4 py-1.5 font-bold text-white hover:bg-[#0057c2]"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* SAP CREDENTIALS & ENDPOINT MODAL */}
            {isCredentialsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                    <div className="w-full max-w-lg rounded-xl border border-[#d9e2ec] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <div className="flex items-center gap-2">
                                <Server className="h-4 w-4 text-[#0070f2]" />
                                <h3 className="text-sm font-bold text-[#1c2d42]">
                                    SAP S/4HANA Cloud Connection Settings
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCredentialsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-blue-900 text-[11px]">
                                <strong>Live SAP Endpoint:</strong> Querying released CDS View <code className="font-mono">YY1_PURCHASEREQTYPE_CDS</code> via OData V2 JSON format.
                            </div>

                            <div>
                                <label className="block font-semibold text-[#1c2d42] mb-1">
                                    SAP CDS View Endpoint URL
                                </label>
                                <input
                                    type="text"
                                    value={sapEndpoint}
                                    onChange={(e) => setSapEndpoint(e.target.value)}
                                    className="w-full rounded-md border border-[#d9e2ec] px-3 py-2 font-mono text-[11px] text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-[#1c2d42] mb-1">
                                        Communication User
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. CC0000000001"
                                        value={sapUsername}
                                        onChange={(e) => setSapUsername(e.target.value)}
                                        className="w-full rounded-md border border-[#d9e2ec] px-3 py-2 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-[#1c2d42] mb-1">
                                        Communication Password
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="••••••••••••"
                                        value={sapPassword}
                                        onChange={(e) => setSapPassword(e.target.value)}
                                        className="w-full rounded-md border border-[#d9e2ec] px-3 py-2 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]"
                                    />
                                </div>
                            </div>

                            <p className="text-[11px] text-[#556b82]">
                                Credentials entered here will be used immediately for live testing and fetching from your SAP S/4HANA Cloud tenant. You can also persist them permanently in your <code className="font-mono text-xs">.env</code> file.
                            </p>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsCredentialsModalOpen(false)}
                                    className="rounded-lg border border-slate-300 px-3.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCredentialsModalOpen(false);
                                        handleGetPrDocumentTypes(sapUsername, sapPassword);
                                    }}
                                    className="flex items-center gap-1.5 rounded-lg bg-[#0070f2] px-4 py-1.5 font-bold text-white hover:bg-[#0057c2]"
                                >
                                    <CloudDownload className="h-3.5 w-3.5" />
                                    <span>Fetch Live from SAP Now</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
