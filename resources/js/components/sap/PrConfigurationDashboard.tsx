import React, { useState, useMemo } from 'react';
import {
    Settings2,
    SlidersHorizontal,
    Tag,
    FileText,
    Building2,
    Layers,
    ShieldCheck,
    Server,
    CheckCircle2,
    Search,
    ChevronRight,
    Plus,
    Sparkles,
    ExternalLink,
    Database,
    Hash,
    HelpCircle,
    Boxes,
    FileCheck,
    Briefcase,
    Globe,
    Lock,
} from 'lucide-react';
import type { HeaderOption, PrDocumentType } from '@/types';
import HeaderOptionsManager from './HeaderOptionsManager';
import DocumentTypesManager from './DocumentTypesManager';

export interface PrConfigSubTab {
    id: string;
    label: string;
    description: string;
    icon: React.ElementType;
    badge?: string;
    badgeColor?: string;
    category?: 'PR Classification' | 'Master Data' | 'Governance & Integration';
    isReady?: boolean;
}

interface PrConfigurationDashboardProps {
    headerOptions?: HeaderOption[];
    prDocumentTypes?: PrDocumentType[];
    isSuperAdmin?: boolean;
    activeSubTab?: string;
    onSubTabChange?: (subTab: string) => void;
}

export default function PrConfigurationDashboard({
    headerOptions = [],
    prDocumentTypes = [],
    isSuperAdmin = true,
    activeSubTab: controlledSubTab,
    onSubTabChange,
}: PrConfigurationDashboardProps) {
    // Read subtab from URL query param if present, default to 'header-options'
    const [internalSubTab, setInternalSubTab] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const subtabParam = params.get('subtab');
            if (subtabParam) return subtabParam;
        }
        return 'header-options';
    });

    const activeSubTab = controlledSubTab || internalSubTab;

    const setActiveSubTab = (subTab: string) => {
        setInternalSubTab(subTab);
        if (onSubTabChange) {
            onSubTabChange(subTab);
        }
    };

    const [sidebarSearch, setSidebarSearch] = useState('');

    // Extensible list of PR Configuration sub-tabs
    const subTabs: PrConfigSubTab[] = useMemo(
        () => [
            {
                id: 'header-options',
                label: 'PR Header Options',
                description: 'Manage dropdown options in PR Header: General Information',
                icon: SlidersHorizontal,
                badge: `${headerOptions.length} Options`,
                badgeColor: 'bg-blue-100 text-[#0070f2] border-blue-200',
                category: 'PR Classification',
                isReady: true,
            },
            {
                id: 'document-types',
                label: 'Document Types',
                description: 'SAP S/4HANA PR Document Types (CDS: I_PurchaseRequisitionType)',
                icon: FileText,
                badge: `${prDocumentTypes.length > 0 ? prDocumentTypes.length : 9} Types`,
                badgeColor: 'bg-blue-100 text-[#0070f2] border-blue-200',
                category: 'PR Classification',
                isReady: true,
            },
            {
                id: 'plants-sourcing',
                label: 'Plants & Purchasing Groups',
                description: 'Assam Petro-Chemicals manufacturing plants and buyer groups',
                icon: Building2,
                badge: '3 Plants',
                badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
                category: 'Master Data',
                isReady: true,
            },
            {
                id: 'account-assignment',
                label: 'Account Assignment',
                description: 'Cost centers, GL accounts, and asset posting rules',
                icon: Layers,
                badge: '5 Categories',
                badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
                category: 'Master Data',
                isReady: true,
            },
            {
                id: 'workflows',
                label: 'Approval & Thresholds',
                description: 'Financial approval matrices and routing rules',
                icon: ShieldCheck,
                badge: 'Multi-Tier',
                badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
                category: 'Governance & Integration',
                isReady: true,
            },
            {
                id: 'sap-settings',
                label: 'SAP Cloud Integration',
                description: 'OData V4 endpoint mapping and communication scenario',
                icon: Server,
                badge: 'SAP_COM_0053',
                badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                category: 'Governance & Integration',
                isReady: true,
            },
        ],
        [headerOptions.length]
    );

    // Filter sub-tabs based on sidebar search
    const filteredSubTabs = useMemo(() => {
        if (!sidebarSearch.trim()) return subTabs;
        const q = sidebarSearch.toLowerCase();
        return subTabs.filter(
            (tab) =>
                tab.label.toLowerCase().includes(q) ||
                tab.description.toLowerCase().includes(q) ||
                tab.category?.toLowerCase().includes(q)
        );
    }, [subTabs, sidebarSearch]);

    // Active sub-tab object
    const currentTab = subTabs.find((t) => t.id === activeSubTab) || subTabs[0];

    return (
        <div className="space-y-6">
            {/* Top Overview Banner for PR Configuration */}
            <div className="rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-xs">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0070f2] to-[#0057c2] text-white shadow-xs">
                            <Settings2 className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold tracking-tight text-[#1c2d42]">
                                    PR Configuration Center
                                </h1>
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-[#0070f2]">
                                    Superadmin Dashboard
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-[#556b82]">
                                Centralized configuration hub for all Purchase Requisition modules, classification fields, master data catalogs, and SAP S/4HANA Public Cloud settings.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-[#d9e2ec] bg-[#f8fafc] px-3 py-1.5 text-xs font-semibold text-[#1c2d42]">
                            <Boxes className="h-3.5 w-3.5 text-[#0070f2]" />
                            <span>{subTabs.length} Modules Configured</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Sidebar + Main Content Layout */}
            <div className="flex flex-col lg:flex-row items-start gap-6">
                {/* SIDEBAR */}
                <aside className="w-full lg:w-72 shrink-0 rounded-xl border border-[#d9e2ec] bg-white shadow-xs overflow-hidden">
                    {/* Sidebar Header */}
                    <div className="border-b border-[#d9e2ec] bg-[#f8fafc] p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#556b82]">
                                <Settings2 className="h-4 w-4 text-[#0070f2]" />
                                <span>Configuration Modules</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                                v2408.3
                            </span>
                        </div>

                        {/* Search Filter for Sub-Tabs */}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#8c9ba5]" />
                            <input
                                type="text"
                                value={sidebarSearch}
                                onChange={(e) => setSidebarSearch(e.target.value)}
                                placeholder="Search modules..."
                                className="h-8 w-full rounded-md border border-[#d9e2ec] bg-white pl-8 pr-3 text-xs text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Sub-Tabs Navigation List */}
                    <nav className="p-2 space-y-1">
                        {filteredSubTabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeSubTab === tab.id;

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveSubTab(tab.id)}
                                    className={`group flex w-full items-start gap-3 rounded-lg p-3 text-left transition-all ${
                                        isActive
                                            ? 'bg-blue-50/80 border border-[#0070f2]/40 text-[#0070f2] shadow-xs'
                                            : 'hover:bg-slate-50 border border-transparent text-[#1c2d42]'
                                    }`}
                                >
                                    <div
                                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                                            isActive
                                                ? 'bg-[#0070f2] text-white'
                                                : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <span
                                                className={`text-xs font-semibold truncate ${
                                                    isActive ? 'text-[#0070f2]' : 'text-[#1c2d42]'
                                                }`}
                                            >
                                                {tab.label}
                                            </span>
                                            {tab.badge && (
                                                <span
                                                    className={`shrink-0 rounded px-1.5 py-0.2 text-[10px] font-semibold border ${tab.badgeColor}`}
                                                >
                                                    {tab.badge}
                                                </span>
                                            )}
                                        </div>
                                        <p
                                            className={`mt-0.5 text-[11px] line-clamp-1 ${
                                                isActive ? 'text-[#0057c2]' : 'text-[#556b82]'
                                            }`}
                                        >
                                            {tab.description}
                                        </p>
                                    </div>

                                    <ChevronRight
                                        className={`mt-1 h-3.5 w-3.5 shrink-0 transition-transform ${
                                            isActive
                                                ? 'text-[#0070f2] translate-x-0.5'
                                                : 'text-slate-300 opacity-0 group-hover:opacity-100'
                                        }`}
                                    />
                                </button>
                            );
                        })}

                        {filteredSubTabs.length === 0 && (
                            <div className="py-6 text-center text-xs text-slate-400">
                                No modules match "{sidebarSearch}"
                            </div>
                        )}
                    </nav>

                    {/* Sidebar Footer Widget */}
                    <div className="border-t border-[#d9e2ec] bg-[#f8fafc] p-3 text-[11px] text-[#556b82]">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#1c2d42]">Extensible Architecture</span>
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                Active
                            </span>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500">
                            New modules added here automatically integrate into the PR creation pipeline.
                        </p>
                    </div>
                </aside>

                {/* MAIN CONTENT AREA */}
                <main className="flex-1 min-w-0 w-full">
                    {/* SUB-TAB 1: PR HEADER OPTIONS */}
                    {activeSubTab === 'header-options' && (
                        <HeaderOptionsManager
                            headerOptions={headerOptions}
                            isSuperAdmin={isSuperAdmin}
                        />
                    )}

                    {/* SUB-TAB 2: DOCUMENT TYPES */}
                    {activeSubTab === 'document-types' && (
                        <DocumentTypesManager
                            documentTypes={prDocumentTypes}
                            isSuperAdmin={isSuperAdmin}
                        />
                    )}

                    {/* SUB-TAB 3: PLANTS & PURCHASING GROUPS */}
                    {activeSubTab === 'plants-sourcing' && (
                        <div className="space-y-6">
                            <div className="rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0070f2] text-white">
                                            <Building2 className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-base font-bold text-[#1c2d42]">
                                                Plants & Purchasing Organizations
                                            </h2>
                                            <p className="text-xs text-[#556b82]">
                                                Operational plant codes, storage locations, and procurement buyer groups
                                            </p>
                                        </div>
                                    </div>
                                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                                        SAP Organizational Hierarchy
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="rounded-xl border border-[#d9e2ec] bg-white p-4 shadow-xs">
                                    <div className="flex items-center justify-between text-xs font-bold text-[#0070f2] mb-2">
                                        <span>Plant 1200</span>
                                        <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[10px]">Active Primary</span>
                                    </div>
                                    <h3 className="text-xs font-bold text-[#1c2d42]">Dibrugarh Manufacturing Plant</h3>
                                    <p className="text-[11px] text-[#556b82] mt-1">
                                        Parbatpur, Dibrugarh, Assam 786623 (India)
                                    </p>
                                    <div className="mt-3 border-t border-slate-100 pt-2 text-[10px] text-slate-500 font-mono">
                                        Storage Bays: 101A (Raw), 101B (FG), 102A (Spares)
                                    </div>
                                </div>

                                <div className="rounded-xl border border-[#d9e2ec] bg-white p-4 shadow-xs">
                                    <div className="flex items-center justify-between text-xs font-bold text-[#0070f2] mb-2">
                                        <span>Plant 1000</span>
                                        <span className="rounded bg-slate-100 text-slate-700 px-1.5 py-0.5 text-[10px]">Methanol Unit</span>
                                    </div>
                                    <h3 className="text-xs font-bold text-[#1c2d42]">Namrup Main Synthesis Unit</h3>
                                    <p className="text-[11px] text-[#556b82] mt-1">
                                        Namrup Industrial Area, Dibrugarh District, Assam
                                    </p>
                                    <div className="mt-3 border-t border-slate-100 pt-2 text-[10px] text-slate-500 font-mono">
                                        Storage Bays: 100A, 100B Bulk Tank Farms
                                    </div>
                                </div>

                                <div className="rounded-xl border border-[#d9e2ec] bg-white p-4 shadow-xs">
                                    <div className="flex items-center justify-between text-xs font-bold text-[#0070f2] mb-2">
                                        <span>Plant 1010</span>
                                        <span className="rounded bg-slate-100 text-slate-700 px-1.5 py-0.5 text-[10px]">Global Tech</span>
                                    </div>
                                    <h3 className="text-xs font-bold text-[#1c2d42]">Corporate Procurement Global</h3>
                                    <p className="text-[11px] text-[#556b82] mt-1">
                                        Dietmar-Hopp-Allee 16, Walldorf, Germany (DE)
                                    </p>
                                    <div className="mt-3 border-t border-slate-100 pt-2 text-[10px] text-slate-500 font-mono">
                                        Storage Bays: Central Logistics Hub
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SUB-TAB 4: ACCOUNT ASSIGNMENT */}
                    {activeSubTab === 'account-assignment' && (
                        <div className="space-y-6">
                            <div className="rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0070f2] text-white">
                                            <Layers className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-base font-bold text-[#1c2d42]">
                                                Account Assignment & General Ledger
                                            </h2>
                                            <p className="text-xs text-[#556b82]">
                                                Account assignment categories, cost center mappings, and GL balance accounts
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-[#d9e2ec] bg-white p-4 shadow-xs">
                                <h3 className="text-xs font-bold text-[#1c2d42] mb-3">
                                    Configured Account Assignment Categories (SAP KNTTP)
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                                    <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                                        <span className="font-mono font-bold text-[#0070f2]">K - Cost Center</span>
                                        <p className="mt-1 text-[11px] text-[#556b82]">General expense allocation to operating plant cost centers (e.g. 12001101 Chemical Processing).</p>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                                        <span className="font-mono font-bold text-[#0070f2]">P - Project (WBS)</span>
                                        <p className="mt-1 text-[11px] text-[#556b82]">Capital project expenditure tied to Work Breakdown Structure element.</p>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                                        <span className="font-mono font-bold text-[#0070f2]">A - Fixed Asset</span>
                                        <p className="mt-1 text-[11px] text-[#556b82]">Capital asset procurement capitalization (plant machinery, storage tanks).</p>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                                        <span className="font-mono font-bold text-[#0070f2]">F - Production Order</span>
                                        <p className="mt-1 text-[11px] text-[#556b82]">Direct charges to active synthesis production batch order.</p>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                                        <span className="font-mono font-bold text-[#0070f2]">U - Unknown</span>
                                        <p className="mt-1 text-[11px] text-[#556b82]">Pending final accounting distribution upon PO issuance.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SUB-TAB 5: APPROVAL & WORKFLOWS */}
                    {activeSubTab === 'workflows' && (
                        <div className="space-y-6">
                            <div className="rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0070f2] text-white">
                                            <ShieldCheck className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-base font-bold text-[#1c2d42]">
                                                Approval Matrix & Financial Thresholds
                                            </h2>
                                            <p className="text-xs text-[#556b82]">
                                                Configured authorization levels for requisition approval and SAP sync routing
                                            </p>
                                        </div>
                                    </div>
                                    <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                                        Policy: APL-FIN-2026
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-xs text-xs space-y-4">
                                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-[#1c2d42]">Tier 1: Up to ₹1,00,000 (Routine Consumables)</div>
                                        <p className="text-[11px] text-[#556b82]">Department Head approval; auto-cleared for SAP OData V4 synchronization.</p>
                                    </div>
                                    <span className="font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                        Automated Release
                                    </span>
                                </div>

                                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-[#1c2d42]">Tier 2: ₹1,00,000 to ₹10,00,000 (Major Spares & Services)</div>
                                        <p className="text-[11px] text-[#556b82]">Plant GM & Finance Controller sign-off required prior to SAP posting.</p>
                                    </div>
                                    <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                        Dual Approval
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-[#1c2d42]">Tier 3: Above ₹10,00,000 (CAPEX & Plant Outages)</div>
                                        <p className="text-[11px] text-[#556b82]">Super Administrator & Managing Director approval recorded in audit logs.</p>
                                    </div>
                                    <span className="font-mono font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                        Board / MD Release
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SUB-TAB 6: SAP CLOUD INTEGRATION */}
                    {activeSubTab === 'sap-settings' && (
                        <div className="space-y-6">
                            <div className="rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0070f2] text-white">
                                            <Server className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-base font-bold text-[#1c2d42]">
                                                SAP S/4HANA Cloud OData V4 Integration
                                            </h2>
                                            <p className="text-xs text-[#556b82]">
                                                Communication Scenario SAP_COM_0053 and Dual-Posting configuration
                                            </p>
                                        </div>
                                    </div>
                                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                                        Connected & Active
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-xs text-xs space-y-3 font-mono">
                                <div className="flex justify-between border-b border-slate-100 pb-2">
                                    <span className="text-[#556b82]">API Service Name:</span>
                                    <span className="font-bold text-[#1c2d42]">API_PURCHASEREQUISITION_PROCESS_SRV</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 pb-2">
                                    <span className="text-[#556b82]">Communication Scenario:</span>
                                    <span className="font-bold text-[#0070f2]">SAP_COM_0053</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 pb-2">
                                    <span className="text-[#556b82]">Payload Protocol:</span>
                                    <span className="font-bold text-[#1c2d42]">OData V4 (JSON Payload)</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 pb-2">
                                    <span className="text-[#556b82]">Local Database:</span>
                                    <span className="font-bold text-emerald-700">MySQL (apl_pr_db)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#556b82]">Cloud Tenant:</span>
                                    <span className="font-bold text-[#1c2d42]">https://my300123-api.s4hana.cloud.sap</span>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
