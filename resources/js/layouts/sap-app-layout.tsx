import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import SapShellBar from '@/components/sap/SapShellBar';
import {
    Home,
    FileSpreadsheet,
    Server,
    Layers,
    Info,
    ExternalLink,
    CheckCircle2,
    Database,
    Network,
    X,
    Users,
    SlidersHorizontal,
    Settings2,
    ChevronDown,
    FileText,
    Building2,
    ShieldCheck,
    ArrowRight,
} from 'lucide-react';
import type { User } from '@/types';

interface SapAppLayoutProps {
    children: React.ReactNode;
    title?: string;
    activeTab?: string;
    onTabChange?: (tab: string, subTab?: string) => void;
    onOpenCreatePr?: () => void;
    onSearch?: (term: string) => void;
}

export default function SapAppLayout({
    children,
    title = 'Purchase Requisitions - SAP S/4HANA Cloud',
    activeTab = 'overview',
    onTabChange,
    onOpenCreatePr = () => router.visit('/purchase-requisitions/create'),
    onSearch,
}: SapAppLayoutProps) {
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [isPrConfigHovered, setIsPrConfigHovered] = useState(false);
    const hoverTimeoutRef = React.useRef<any>(null);

    const { auth } = usePage().props as { auth?: { user?: User } };
    const user = auth?.user;

    const isSuperAdmin = user?.is_superadmin || user?.role?.name === 'superadmin';
    const isEmployee = user?.is_employee || user?.role?.name === 'employee';

    // PR Configuration sub-tabs for hover dropdown
    const prConfigSubTabs = [
        {
            id: 'header-options',
            label: 'PR Header Options',
            description: 'Custom header classification options for requisitions',
            icon: SlidersHorizontal,
            badge: 'Active',
            badgeColor: 'bg-blue-100 text-[#0070f2] border-blue-200',
        },
        {
            id: 'document-types',
            label: 'Document Types',
            description: 'SAP PR Types (ZCOM, NB, NBS, RV, etc.)',
            icon: FileText,
            badge: '9 Types',
            badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
        },
        {
            id: 'plants-sourcing',
            label: 'Plants & Purchasing Groups',
            description: 'Plants 1200, 1000, 1010 and Buyer Groups',
            icon: Building2,
            badge: '3 Plants',
            badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
        },
        {
            id: 'account-assignment',
            label: 'Account Assignment',
            description: 'Cost Centers, GL Accounts & WBS Elements',
            icon: Layers,
            badge: '5 Categories',
            badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
        },
        {
            id: 'workflows',
            label: 'Approval & Thresholds',
            description: 'Financial approval matrix & routing rules',
            icon: ShieldCheck,
            badge: 'Multi-Tier',
            badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
        },
        {
            id: 'sap-settings',
            label: 'SAP Cloud Integration',
            description: 'OData V4 Scenario SAP_COM_0053 specs',
            icon: Server,
            badge: 'Connected',
            badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        },
    ];

    const handlePrConfigMouseEnter = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        setIsPrConfigHovered(true);
    };

    const handlePrConfigMouseLeave = () => {
        hoverTimeoutRef.current = setTimeout(() => {
            setIsPrConfigHovered(false);
        }, 180);
    };

    const handleSubTabClick = (tabId: string, subTabId: string) => {
        setIsPrConfigHovered(false);

        const isDashboard =
            typeof window !== 'undefined' &&
            window.location.pathname.startsWith('/dashboard');

        if (!isDashboard) {
            router.visit(`/dashboard?tab=${tabId}&subtab=${subTabId}`);
            return;
        }

        if (onTabChange) {
            onTabChange(tabId, subTabId);
        } else {
            router.visit(`/dashboard?tab=${tabId}&subtab=${subTabId}`, {
                preserveScroll: true,
            });
        }
    };

    // Role-dependent spaces / tabs
    const tabs = isEmployee
        ? [
              { id: 'overview', label: 'My Home & Overview', icon: Home, href: '/dashboard' },
              { id: 'requisitions', label: 'My Requisitions', icon: FileSpreadsheet, href: '/dashboard' },
          ]
        : [
              { id: 'overview', label: 'Overview (My Home)', icon: Home, href: '/dashboard' },
              { id: 'requisitions', label: 'Purchase Requisitions', icon: FileSpreadsheet, href: '/dashboard' },
              { id: 'sync-monitor', label: 'SAP OData V4 Monitor', icon: Server, href: '/dashboard' },
              { id: 'architecture', label: 'Architecture & Dual-Posting', icon: Layers, href: '/dashboard' },
              ...(isSuperAdmin
                  ? [
                        { id: 'users', label: 'User Management', icon: Users, href: '/users' },
                        { id: 'pr-configuration', label: 'PR Configuration', icon: Settings2, href: '/dashboard' },
                    ]
                  : []),
          ];

    const handleTabClick = (tab: { id: string; href?: string }) => {
        setIsPrConfigHovered(false);

        if (tab.id === 'users') {
            router.visit('/users');
            return;
        }

        // If currently on another page (e.g. /users or /purchase-requisitions/create), visit /dashboard
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/dashboard')) {
            if (tab.id === 'pr-configuration') {
                router.visit('/dashboard?tab=pr-configuration');
            } else {
                router.visit('/dashboard');
            }
            return;
        }

        if (onTabChange) {
            onTabChange(tab.id);
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-[#f5f6f8] text-[#1c2d42] font-sans antialiased selection:bg-[#0070f2] selection:text-white">
            <Head title={title} />

            {/* Global SAP Fiori ShellBar */}
            <SapShellBar
                onSearch={onSearch}
                onOpenCreatePr={onOpenCreatePr}
                onOpenSapConfig={() => setIsConfigOpen(true)}
            />

            {/* SAP Spaces & Pages Navigation Bar */}
            <div className="sticky top-13 z-30 border-b border-[#d9e2ec] bg-white px-4 sm:px-6 shadow-xs">
                <div className="flex items-center justify-between">
                    {/* Navigation Tabs */}
                    <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto sm:overflow-visible no-scrollbar py-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            const isPrConfig = tab.id === 'pr-configuration';

                            if (isPrConfig) {
                                return (
                                    <div
                                        key={tab.id}
                                        className="relative"
                                        onMouseEnter={handlePrConfigMouseEnter}
                                        onMouseLeave={handlePrConfigMouseLeave}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => handleTabClick(tab)}
                                            className={`group flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
                                                isActive
                                                    ? 'border-[#0070f2] text-[#0070f2]'
                                                    : 'border-transparent text-[#556b82] hover:border-slate-300 hover:text-[#1c2d42]'
                                            }`}
                                        >
                                            <Icon className={`h-4 w-4 transition-colors ${isActive ? 'text-[#0070f2]' : 'text-[#8c9ba5] group-hover:text-[#1c2d42]'}`} />
                                            <span>{tab.label}</span>
                                            <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isPrConfigHovered ? 'rotate-180 text-[#0070f2]' : 'text-slate-400 group-hover:text-[#1c2d42]'}`} />
                                        </button>

                                        {/* Hover Dropdown Menu */}
                                        {isPrConfigHovered && (
                                            <div className="absolute left-0 sm:left-auto sm:right-0 md:left-0 top-full pt-1.5 z-50 w-80 sm:w-88 animate-in fade-in slide-in-from-top-1 duration-150">
                                                <div className="rounded-xl border border-[#d9e2ec] bg-white shadow-xl ring-1 ring-black/5 overflow-hidden">
                                                    {/* Dropdown Header */}
                                                    <div className="border-b border-[#d9e2ec] bg-[#f8fafc] px-4 py-2.5 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Settings2 className="h-3.5 w-3.5 text-[#0070f2]" />
                                                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#556b82]">
                                                                PR Configuration Modules
                                                            </span>
                                                        </div>
                                                        <span className="rounded bg-blue-50 border border-blue-200 px-1.5 py-0.2 text-[10px] font-semibold text-[#0070f2]">
                                                            {prConfigSubTabs.length} Modules
                                                        </span>
                                                    </div>

                                                    {/* Sub-Tabs List */}
                                                    <div className="p-1.5 space-y-0.5 max-h-[75vh] overflow-y-auto">
                                                        {prConfigSubTabs.map((subTab) => {
                                                            const SubIcon = subTab.icon;
                                                            return (
                                                                <button
                                                                    key={subTab.id}
                                                                    type="button"
                                                                    onClick={() => handleSubTabClick('pr-configuration', subTab.id)}
                                                                    className="group/item flex w-full items-start gap-2.5 rounded-lg p-2 text-left hover:bg-blue-50/70 transition-colors"
                                                                >
                                                                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 group-hover/item:bg-[#0070f2] group-hover/item:text-white transition-colors">
                                                                        <SubIcon className="h-3.5 w-3.5" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center justify-between gap-1">
                                                                            <span className="text-xs font-semibold text-[#1c2d42] group-hover/item:text-[#0070f2] transition-colors">
                                                                                {subTab.label}
                                                                            </span>
                                                                            {subTab.badge && (
                                                                                <span className={`shrink-0 rounded px-1.5 py-0.2 text-[9px] font-bold border ${subTab.badgeColor}`}>
                                                                                    {subTab.badge}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-[10px] text-[#556b82] line-clamp-1 mt-0.5">
                                                                            {subTab.description}
                                                                        </p>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Dropdown Footer */}
                                                    <div className="border-t border-[#d9e2ec] bg-[#f8fafc] px-4 py-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSubTabClick('pr-configuration', 'header-options')}
                                                            className="flex w-full items-center justify-between text-[11px] font-semibold text-[#0070f2] hover:text-[#0057c2]"
                                                        >
                                                            <span>Open Configuration Dashboard</span>
                                                            <ArrowRight className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => handleTabClick(tab)}
                                    className={`group flex items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
                                        isActive
                                            ? 'border-[#0070f2] text-[#0070f2]'
                                            : 'border-transparent text-[#556b82] hover:border-slate-300 hover:text-[#1c2d42]'
                                    }`}
                                >
                                    <Icon className={`h-4 w-4 transition-colors ${isActive ? 'text-[#0070f2]' : 'text-[#8c9ba5] group-hover:text-[#1c2d42]'}`} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </nav>

                    {/* Quick System Environment Tag */}
                    <div className="hidden lg:flex items-center gap-3 text-xs text-[#556b82]">
                        {!isEmployee ? (
                            <>
                                <div className="flex items-center gap-1.5">
                                    <Database className="h-3.5 w-3.5 text-emerald-600" />
                                    <span>DB: <strong className="text-[#1c2d42]">MySQL apl_pr_db</strong></span>
                                </div>
                                <span className="text-slate-300">|</span>
                                <div className="flex items-center gap-1.5">
                                    <Network className="h-3.5 w-3.5 text-[#0070f2]" />
                                    <span>OData: <strong className="text-[#1c2d42]">V4 JSON API</strong></span>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-1.5 text-slate-600">
                                <span>Plant: <strong className="text-[#1c2d42]">{user?.plant || 'Namrup, Assam (Plant 1000)'}</strong></span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Application Canvas */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
                {children}
            </main>

            {/* Enterprise Footer */}
            <footer className="mt-auto border-t border-[#d9e2ec] bg-white py-3.5 px-6 text-center text-xs text-[#556b82]">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 sm:flex-row">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#1c2d42]">Assam Petro-Chemicals Ltd.</span>
                        <span>•</span>
                        <span>Purchase Requisition Portal</span>
                        <span>•</span>
                        <span className="text-slate-500">Connected to SAP S/4HANA Cloud</span>
                    </div>
                    {!isEmployee && (
                        <div className="flex items-center gap-4 text-[11px]">
                            <button
                                type="button"
                                onClick={() => setIsConfigOpen(true)}
                                className="font-medium text-[#0070f2] hover:underline"
                            >
                                View Connection Details
                            </button>
                        </div>
                    )}
                </div>
            </footer>

            {/* SAP Cloud Configuration Drawer / Modal */}
            {isConfigOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                    <div className="relative w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#0070f2]">
                                    <Server className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-[#1c2d42]">SAP Public Cloud Integration Settings</h3>
                                    <p className="text-xs text-[#556b82]">Configuration for OData V4 and dual-posting architecture</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsConfigOpen(false)}
                                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="mt-4 space-y-4 text-xs text-[#1c2d42]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                                    <div className="text-[11px] font-semibold text-[#556b82]">Target Cloud System</div>
                                    <div className="mt-1 font-semibold text-[#1c2d42]">SAP S/4HANA Cloud (Public Edition)</div>
                                    <div className="text-[11px] text-slate-500">Release 2408.3 Enterprise</div>
                                </div>
                                <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                                    <div className="text-[11px] font-semibold text-[#556b82]">OData V4 Standard Service</div>
                                    <div className="mt-1 font-semibold text-[#0070f2]">API_PURCHASEREQUISITION_PROCESS_SRV</div>
                                    <div className="text-[11px] text-slate-500">Root Entity: PurchaseRequisition</div>
                                </div>
                                <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                                    <div className="text-[11px] font-semibold text-[#556b82]">Communication Arrangement</div>
                                    <div className="mt-1 font-semibold text-[#1c2d42]">SAP_COM_0053 / SAP_COM_0108</div>
                                    <div className="text-[11px] text-slate-500">Inbound Service User Authentication</div>
                                </div>
                                <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                                    <div className="text-[11px] font-semibold text-[#556b82]">Local Database (Dual Posting)</div>
                                    <div className="mt-1 font-semibold text-emerald-700 flex items-center gap-1.5">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                        MySQL apl_pr_db (Connected)
                                    </div>
                                    <div className="text-[11px] text-slate-500">Stores internal PR & SAP sync responses</div>
                                </div>
                            </div>

                            <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3.5">
                                <div className="font-semibold text-[#0057c2] mb-1">Dual-Posting Architecture Workflow:</div>
                                <ol className="list-decimal list-inside space-y-1 text-[#1c2d42] text-[11px]">
                                    <li><strong>Local Creation:</strong> PR is submitted in this React portal and saved to MySQL table <code className="bg-white px-1 py-0.5 rounded border border-blue-200">purchase_requisitions</code>.</li>
                                    <li><strong>OData V4 Generation:</strong> Laravel converts Header & Items into SAP standard JSON payload with entity <code className="bg-white px-1 py-0.5 rounded border border-blue-200">_PurchaseRequisitionItem</code>.</li>
                                    <li><strong>SAP POST Request:</strong> Laravel executes HTTP POST with CSRF protection to the SAP Public Cloud endpoint.</li>
                                    <li><strong>Sync Confirmation:</strong> SAP returns HTTP 201 Created and assigns an official SAP PR Number (e.g. <code className="bg-white px-1 py-0.5 rounded border border-blue-200">10004829</code>).</li>
                                </ol>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-5 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsConfigOpen(false)}
                                className="rounded-md bg-[#0070f2] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2]"
                            >
                                Close Information
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
