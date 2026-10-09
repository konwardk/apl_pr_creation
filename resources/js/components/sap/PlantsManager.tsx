import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';

export interface SapPlantItem {
    code: string;
    name: string;
    plantName: string;
    extra?: string;
    Plant?: string;
    PlantName?: string;
    raw_data?: {
        __metadata?: {
            id?: string;
            uri?: string;
            type?: string;
        };
        Plant?: string;
        PlantName?: string;
        [key: string]: any;
    };
}

export interface SapPlantApiResponse {
    success: boolean;
    is_live: boolean;
    status: number;
    latency_ms?: number;
    source: string;
    endpoint: string;
    count: number;
    items: SapPlantItem[];
    message?: string;
}

interface PlantsManagerProps {
    isSuperAdmin?: boolean;
}

export default function PlantsManager({ isSuperAdmin = true }: PlantsManagerProps) {
    const [plants, setPlants] = useState<SapPlantItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [apiMeta, setApiMeta] = useState<Partial<SapPlantApiResponse>>({
        is_live: true,
        status: 200,
        source: 'SAP S/4HANA Cloud (Live Service: ZUI_TMS_DESPATCH_04 / PlantVH)',
        endpoint: 'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/ZUI_TMS_DESPATCH_04/PlantVH?format=json',
        latency_ms: 0,
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [inspectPlant, setInspectPlant] = useState<SapPlantItem | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Call the Get Plant API (/sap-plants)
    const fetchPlantsFromApi = async () => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            const res = await fetch('/sap-plants', {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const data: SapPlantApiResponse = await res.json();

            if (data && data.items) {
                setPlants(data.items);
                setApiMeta({
                    is_live: data.is_live ?? true,
                    status: data.status ?? 200,
                    source: data.source ?? 'SAP S/4HANA Cloud (ZUI_TMS_DESPATCH_04 / PlantVH)',
                    endpoint: data.endpoint ?? 'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/ZUI_TMS_DESPATCH_04/PlantVH?format=json',
                    latency_ms: data.latency_ms ?? 0,
                    count: data.count ?? data.items.length,
                    message: data.message,
                });
            } else {
                setErrorMessage('No plants received from SAP Plant API.');
            }
        } catch (err: any) {
            console.error('Failed to load plants from SAP API:', err);
            setErrorMessage('Unable to communicate with SAP Plant API. Please check network connection.');
        } finally {
            setIsLoading(false);
        }
    };

    // Automatically load plants when clicking into this tab
    useEffect(() => {
        fetchPlantsFromApi();
    }, []);

    // Filter plants by code or name
    const filteredPlants = useMemo(() => {
        if (!searchQuery.trim()) return plants;
        const q = searchQuery.toLowerCase().trim();
        return plants.filter((p) => {
            const code = (p.code || p.Plant || '').toLowerCase();
            const name = (p.name || p.plantName || p.PlantName || '').toLowerCase();
            return code.includes(q) || name.includes(q);
        });
    }, [plants, searchQuery]);

    // Copy plant code to clipboard
    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    // Metadata helpers
    const getPlantBadge = (code: string) => {
        switch (code) {
            case '1100':
                return {
                    label: 'Corporate HQ',
                    color: 'bg-purple-100 text-purple-800 border-purple-200',
                    purchasingOrg: '1100 - Purchasing Org 1100',
                    location: 'Assam Petro-Chemicals Ltd, Corporate Office, Guwahati / Dibrugarh',
                    storageBays: 'HQ Logistics & Records Center',
                };
            case '1200':
                return {
                    label: 'Primary Synthesis Plant',
                    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                    purchasingOrg: '1200 - APL Domestic Sourcing Org',
                    location: 'Parbatpur, Namrup, Dibrugarh District, Assam 786623',
                    storageBays: 'M100 (Main RM), SSM2 (Safety Store 2), SSM3 (Spares Store 3)',
                };
            case '1300':
                return {
                    label: 'Methanol & Resin Unit',
                    color: 'bg-blue-100 text-blue-800 border-blue-200',
                    purchasingOrg: '1200 - APL Domestic Sourcing Org',
                    location: 'Boitamari Complex, Bongaigaon / Goalpara, Assam',
                    storageBays: 'SL01 (General Warehouse 1), Tank Farm 100A',
                };
            case '1400':
                return {
                    label: 'Bulk Sourcing Terminal',
                    color: 'bg-amber-100 text-amber-800 border-amber-200',
                    purchasingOrg: '1100 - Purchasing Org 1100',
                    location: 'Rani Nagar Industrial Sector, Assam',
                    storageBays: 'Terminal Bay 401, Bulk Storage Silo',
                };
            default:
                return {
                    label: 'Operational Unit',
                    color: 'bg-slate-100 text-slate-800 border-slate-200',
                    purchasingOrg: '1100 / 1200',
                    location: 'Assam Industrial Zone, India',
                    storageBays: 'General Plant Inventory Store',
                };
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Overview & Action Header */}
            <div className="rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-xs">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0070f2] to-[#0057c2] text-white shadow-xs">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-[#1c2d42]">
                                    Plants & Purchasing Organizations
                                </h2>
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-[#0070f2]">
                                    SAP Master Data
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-[#556b82]">
                                Operational manufacturing plants, corporate facilities, and purchasing organizations retrieved dynamically from SAP S/4HANA Cloud OData service.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Live Status Indicator */}
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-xs text-emerald-800">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600"></span>
                            </span>
                            <span className="font-semibold">
                                {apiMeta.is_live ? 'SAP S/4HANA Cloud Connected' : 'Local Fallback Active'}
                            </span>
                            {apiMeta.latency_ms ? (
                                <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-mono font-bold text-emerald-900">
                                    {apiMeta.latency_ms}ms
                                </span>
                            ) : null}
                        </div>

                        {/* Trigger Get Plant API Button */}
                        <button
                            type="button"
                            onClick={fetchPlantsFromApi}
                            disabled={isLoading}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#0070f2] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#0057c2] active:scale-[0.98] disabled:opacity-60"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                            <span>{isLoading ? 'Fetching Plants...' : 'Get Plants from SAP API'}</span>
                        </button>
                    </div>
                </div>

                {/* API Telemetry Sub-bar */}
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[#d9e2ec] pt-3 text-[11px] text-[#556b82]">
                    <div className="flex items-center gap-1.5">
                        <Server className="h-3.5 w-3.5 text-[#0070f2]" />
                        <span className="font-medium text-[#1c2d42]">Service:</span>
                        <code className="font-mono text-[10px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                            ZUI_TMS_DESPATCH_04 / PlantVH
                        </code>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <FileCode className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-medium text-[#1c2d42]">Format:</span>
                        <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            application/json
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-medium text-[#1c2d42]">Endpoint:</span>
                        <span className="font-mono text-[10px] text-[#0070f2] truncate max-w-xs md:max-w-md">
                            {apiMeta.endpoint}
                        </span>
                    </div>

                    <div className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-[#1c2d42]">
                        <Boxes className="h-3.5 w-3.5 text-[#0070f2]" />
                        <span>{plants.length} Plants Loaded</span>
                    </div>
                </div>
            </div>

            {/* Error banner if API failure */}
            {errorMessage && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                    <p className="flex-1">{errorMessage}</p>
                    <button
                        type="button"
                        onClick={fetchPlantsFromApi}
                        className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-900 hover:bg-red-200"
                    >
                        Retry API
                    </button>
                </div>
            )}

            {/* KPI Summary Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-[#d9e2ec] bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between text-xs text-[#556b82]">
                        <span>Total SAP Plants</span>
                        <Building2 className="h-4 w-4 text-[#0070f2]" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold tracking-tight text-[#1c2d42]">
                            {isLoading ? '...' : plants.length}
                        </span>
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            Active
                        </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#556b82]">
                        Retrieved via live SAP OData PlantVH
                    </p>
                </div>

                <div className="rounded-xl border border-[#d9e2ec] bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between text-xs text-[#556b82]">
                        <span>HQ Administration</span>
                        <span className="rounded bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.5">
                            1100
                        </span>
                    </div>
                    <div className="mt-2">
                        <span className="text-sm font-bold text-[#1c2d42]">Corporate Office</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#556b82]">
                        APL Corporate Governance & Admin Hub
                    </p>
                </div>

                <div className="rounded-xl border border-[#d9e2ec] bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between text-xs text-[#556b82]">
                        <span>Synthesis Unit</span>
                        <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5">
                            1200
                        </span>
                    </div>
                    <div className="mt-2">
                        <span className="text-sm font-bold text-[#1c2d42]">Namrup Plant</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#556b82]">
                        Primary Chemical Synthesis & Production
                    </p>
                </div>

                <div className="rounded-xl border border-[#d9e2ec] bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between text-xs text-[#556b82]">
                        <span>Regional Facilities</span>
                        <span className="rounded bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5">
                            1300 & 1400
                        </span>
                    </div>
                    <div className="mt-2">
                        <span className="text-sm font-bold text-[#1c2d42]">Boitamari & Rani Nagar</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#556b82]">
                        Storage, Terminals & Blending Divisions
                    </p>
                </div>
            </div>

            {/* Filter Toolbar & View Toggle */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-[#d9e2ec] bg-white p-3 shadow-xs">
                {/* Search Bar */}
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8c9ba5]" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by plant code (e.g. 1100, 1200) or name..."
                        className="h-8.5 w-full rounded-lg border border-[#d9e2ec] bg-white pl-9 pr-3 text-xs text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* View Switcher */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-[#556b82]">
                        Showing <strong className="text-[#1c2d42]">{filteredPlants.length}</strong> of {plants.length} plants
                    </span>
                    <div className="flex items-center rounded-lg border border-[#d9e2ec] bg-slate-50 p-0.5">
                        <button
                            type="button"
                            onClick={() => setViewMode('cards')}
                            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                                viewMode === 'cards'
                                    ? 'bg-white text-[#0070f2] shadow-xs'
                                    : 'text-[#556b82] hover:text-[#1c2d42]'
                            }`}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            <span>Cards</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                                viewMode === 'table'
                                    ? 'bg-white text-[#0070f2] shadow-xs'
                                    : 'text-[#556b82] hover:text-[#1c2d42]'
                            }`}
                        >
                            <TableIcon className="h-3.5 w-3.5" />
                            <span>Table</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((n) => (
                        <div
                            key={n}
                            className="animate-pulse rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-xs"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="h-5 w-24 bg-slate-200 rounded"></div>
                                <div className="h-5 w-28 bg-slate-200 rounded"></div>
                            </div>
                            <div className="h-4 w-48 bg-slate-200 rounded mb-2"></div>
                            <div className="h-3 w-64 bg-slate-100 rounded mb-4"></div>
                            <div className="h-10 w-full bg-slate-50 rounded"></div>
                        </div>
                    ))}
                </div>
            )}

            {/* Plants Display: CARDS VIEW */}
            {!isLoading && viewMode === 'cards' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredPlants.map((plant) => {
                        const code = plant.code || plant.Plant || '';
                        const plantName = plant.plantName || plant.PlantName || plant.name;
                        const meta = getPlantBadge(code);
                        const isCopied = copiedCode === code;

                        return (
                            <div
                                key={code}
                                className="group relative rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-xs hover:border-[#0070f2]/50 hover:shadow-sm transition-all"
                            >
                                {/* Card Header */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#0070f2] font-mono font-bold text-xs border border-blue-100">
                                            {code}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold text-[#1c2d42]">
                                                    Plant {code}
                                                </h3>
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${meta.color}`}
                                                >
                                                    {meta.label}
                                                </span>
                                            </div>
                                            <p className="text-xs font-semibold text-[#0070f2]">
                                                {plantName}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(code)}
                                            title="Copy Plant Code"
                                            className="flex h-7 w-7 items-center justify-center rounded-md border border-[#d9e2ec] bg-slate-50 text-[#556b82] hover:bg-slate-100 hover:text-[#1c2d42] transition-colors"
                                        >
                                            {isCopied ? (
                                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                            ) : (
                                                <Copy className="h-3.5 w-3.5" />
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setInspectPlant(plant)}
                                            title="Inspect SAP OData JSON"
                                            className="flex h-7 w-7 items-center justify-center rounded-md border border-[#d9e2ec] bg-slate-50 text-[#556b82] hover:bg-slate-100 hover:text-[#0070f2] transition-colors"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Location Details */}
                                <div className="mt-3 text-[11px] text-[#556b82]">
                                    <span className="font-semibold text-[#1c2d42]">Location: </span>
                                    <span>{meta.location}</span>
                                </div>

                                {/* Organizational Mapping Box */}
                                <div className="mt-3.5 rounded-lg border border-slate-100 bg-[#f8fafc] p-3 text-xs space-y-2">
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-[#556b82]">Purchasing Org:</span>
                                        <span className="font-mono font-semibold text-[#1c2d42]">
                                            {meta.purchasingOrg}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] border-t border-slate-200/60 pt-1.5">
                                        <span className="text-[#556b82]">Storage Locations:</span>
                                        <span className="text-[11px] text-[#1c2d42] truncate max-w-[220px]">
                                            {meta.storageBays}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] border-t border-slate-200/60 pt-1.5">
                                        <span className="text-[#556b82]">SAP Entity Type:</span>
                                        <span className="font-mono text-[10px] text-[#0070f2]">
                                            cds_zui_tms_despatch_o4.PlantVHType
                                        </span>
                                    </div>
                                </div>

                                {/* Footer bar */}
                                <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#d9e2ec] text-[10px] text-slate-500 font-mono">
                                    <span>SAP Cloud OData V2</span>
                                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Available for PR Creation
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Plants Display: TABLE VIEW */}
            {!isLoading && viewMode === 'table' && (
                <div className="rounded-xl border border-[#d9e2ec] bg-white shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-[#f8fafc] border-b border-[#d9e2ec] text-[11px] font-bold text-[#556b82] uppercase tracking-wider">
                                <tr>
                                    <th className="py-3 px-4">Plant Code</th>
                                    <th className="py-3 px-4">Plant Name / Description</th>
                                    <th className="py-3 px-4">Role / Classification</th>
                                    <th className="py-3 px-4">Purchasing Org</th>
                                    <th className="py-3 px-4">SAP OData Type</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#d9e2ec] text-[#1c2d42]">
                                {filteredPlants.map((plant) => {
                                    const code = plant.code || plant.Plant || '';
                                    const plantName = plant.plantName || plant.PlantName || plant.name;
                                    const meta = getPlantBadge(code);
                                    const isCopied = copiedCode === code;

                                    return (
                                        <tr key={code} className="hover:bg-blue-50/40 transition-colors">
                                            <td className="py-3 px-4 font-mono font-bold text-[#0070f2]">
                                                {code}
                                            </td>
                                            <td className="py-3 px-4 font-semibold">
                                                {plantName}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${meta.color}`}>
                                                    {meta.label}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-[#556b82] font-mono text-[11px]">
                                                {meta.purchasingOrg}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                                                PlantVHType
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[10px] font-bold">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Active
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(code)}
                                                        className="rounded p-1 text-[#556b82] hover:bg-slate-100 hover:text-[#1c2d42]"
                                                        title="Copy Code"
                                                    >
                                                        {isCopied ? (
                                                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                        ) : (
                                                            <Copy className="h-3.5 w-3.5" />
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setInspectPlant(plant)}
                                                        className="rounded p-1 text-[#556b82] hover:bg-slate-100 hover:text-[#0070f2]"
                                                        title="Inspect SAP Payload"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Zero State */}
            {!isLoading && filteredPlants.length === 0 && (
                <div className="rounded-xl border border-[#d9e2ec] bg-white p-12 text-center shadow-xs">
                    <Building2 className="mx-auto h-9 w-9 text-slate-300 mb-2" />
                    <h3 className="text-sm font-bold text-[#1c2d42]">No Plants Found</h3>
                    <p className="mt-1 text-xs text-[#556b82]">
                        No SAP plant matches "{searchQuery}". Try a different search term.
                    </p>
                    <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="mt-3 rounded-lg border border-[#d9e2ec] bg-slate-50 px-3 py-1.5 text-xs font-semibold text-[#1c2d42] hover:bg-slate-100"
                    >
                        Clear Search
                    </button>
                </div>
            )}

            {/* Section: Associated Purchasing Organizations & Buyer Groups */}
            <div className="rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#d9e2ec] pb-3">
                    <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-[#0070f2]" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#1c2d42]">
                            Purchasing Organizations & Sourcing Governance (APL Procurement Hierarchy)
                        </h3>
                    </div>
                    <span className="text-[11px] text-[#556b82]">
                        Standard SAP S/4HANA Assignment Matrix
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Purchasing Org 1100 */}
                    <div className="rounded-lg border border-slate-200 bg-[#f8fafc] p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-sm text-[#0070f2]">
                                Org 1100 - Purchasing Org 1100
                            </span>
                            <span className="rounded bg-blue-100 text-[#0070f2] text-[10px] font-bold px-1.5 py-0.5">
                                S/4HANA Cloud Default
                            </span>
                        </div>
                        <p className="text-[11px] text-[#556b82]">
                            Central Corporate Purchasing Organization governing enterprise purchase requisitions, framework contracts, and capital equipment contracts across all APL units.
                        </p>
                        <div className="mt-2 text-[11px] text-slate-600">
                            <strong>Associated Buyer Groups:</strong> 101 (Central Sourcing), 104 (Capital Projects), 119 (Services)
                        </div>
                    </div>

                    {/* Purchasing Org 1200 */}
                    <div className="rounded-lg border border-slate-200 bg-[#f8fafc] p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-sm text-[#0070f2]">
                                Org 1200 - APL Domestic Sourcing Org
                            </span>
                            <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5">
                                Plant Dedicated
                            </span>
                        </div>
                        <p className="text-[11px] text-[#556b82]">
                            Operational Purchasing Organization dedicated to Namrup Manufacturing Plant and Boitamari Complex for direct chemical raw materials, natural gas feedstocks, and urgent mechanical/instrument spares.
                        </p>
                        <div className="mt-2 text-[11px] text-slate-600">
                            <strong>Associated Buyer Groups:</strong> 103 (Operational Spares), 102 (Technical & Valves), 112 (Bulk Chemicals), 114 (Reagents)
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal: View Raw SAP OData Entity JSON */}
            {inspectPlant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="w-full max-w-2xl rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-[#d9e2ec] pb-3">
                            <div className="flex items-center gap-2">
                                <FileCode className="h-4 w-4 text-[#0070f2]" />
                                <h3 className="text-sm font-bold text-[#1c2d42]">
                                    SAP OData Entity Details: Plant {inspectPlant.code || inspectPlant.Plant}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setInspectPlant(null)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between text-[#556b82]">
                                <span>Entity Set:</span>
                                <code className="font-mono text-slate-800">
                                    PlantVH('{inspectPlant.code || inspectPlant.Plant}')
                                </code>
                            </div>
                            <div className="flex items-center justify-between text-[#556b82]">
                                <span>OData URI:</span>
                                <span className="font-mono text-[11px] text-[#0070f2] truncate max-w-md">
                                    {inspectPlant.raw_data?.__metadata?.uri || `${apiMeta.endpoint}('${inspectPlant.code}')`}
                                </span>
                            </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-slate-900 p-3.5 overflow-x-auto max-h-72">
                            <pre className="font-mono text-[11px] text-emerald-400 leading-relaxed">
                                {JSON.stringify(inspectPlant.raw_data || inspectPlant, null, 2)}
                            </pre>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#d9e2ec]">
                            <button
                                type="button"
                                onClick={() => handleCopy(JSON.stringify(inspectPlant.raw_data || inspectPlant, null, 2))}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#d9e2ec] bg-slate-50 px-3 py-1.5 text-xs font-semibold text-[#1c2d42] hover:bg-slate-100"
                            >
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copy JSON</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setInspectPlant(null)}
                                className="rounded-lg bg-[#0070f2] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#0057c2]"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
