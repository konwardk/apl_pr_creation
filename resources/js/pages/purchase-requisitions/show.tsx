import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import SapAppLayout from '@/layouts/sap-app-layout';
import SapPayloadModal from '@/components/sap/SapPayloadModal';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    AlertTriangle,
    FileSpreadsheet,
    FileText,
    Send,
    Edit3,
    Package,
    Building2,
    Calendar,
    User as UserIcon,
    FileCode,
    Paperclip,
    DollarSign,
    Layers,
    Tag,
    ChevronDown,
    ChevronUp,
    Download,
    ExternalLink,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PrItem {
    id: number;
    item_number: string;
    item_type?: string;
    item_category?: string;
    material_code?: string;
    supplier_material_number?: string;
    manufacturer_part_number?: string;
    batch?: string;
    revision_level?: string;
    description: string;
    material_group: string;
    desired_supplier?: string;
    fixed_vendor?: string;
    quantity: number | string;
    unit_of_measure: string;
    unit_price: number | string;
    price_unit: number;
    total_price: number | string;
    currency: string;
    tax_code?: string;
    po_price_type?: string;
    plant: string;
    supplying_plant?: string;
    storage_location?: string;
    account_assignment_category?: string;
    requirement_tracking_number?: string;
    cost_center?: string;
    gl_account?: string;
    purchasing_organization?: string;
    purchasing_group?: string;
    agreement_number?: string;
    agreement_item?: string;
    info_record?: string;
    delivery_date?: string;
    requisition_date?: string;
    release_date?: string;
    planned_delivery_time?: number;
    gr_processing_time?: number;
    item_text?: string;
    item_note?: string;
    delivery_text?: string;
    material_po_text?: string;
    closure_comment?: string;
    attachment_doc_type?: string;
    attachment_name?: string;
    attachments?: any[];
}

interface ContractRequisition {
    id?: number;
    cr_no?: string;
    pr_number_sap?: string;
    contract_title?: string;
    payment_terms?: string;
    bidders_qualification_criteria?: string;
    special_terms_condition?: string;
    guarantee_warranty_period?: string;
    defect_liability_period?: string;
    others?: string;
    requisitioner_name?: string;
    req_designation?: string;
    req_department?: string;
    tender_type?: string;
    tender_estimate_value?: string;
    total_pr_value?: number | string;
    total_pr_value_in_word?: string;
    sap_sync_status?: string;
    sap_sync_message?: string;
    sap_synced_at?: string;
    sap_uuid?: string;
}

interface PurchaseRequisition {
    id: number;
    pr_number: string;
    sap_pr_number?: string | null;
    description: string;
    header_note?: string | null;
    header_option_id?: number | null;
    pr_type: string;
    auto_source_determination?: boolean;
    company_code: string;
    plant: string;
    total_amount: number | string;
    currency: string;
    requisitioner?: string | null;
    approval_status: string;
    is_draft: boolean | number;
    sap_sync_status: string;
    sap_sync_message?: string | null;
    sap_synced_at?: string | null;
    sap_payload?: any;
    sap_response?: any;
    created_at: string;
    updated_at: string;
    items?: PrItem[];
    attachments?: any[];
    header_option?: any;
    user?: any;
    contract_requisition?: ContractRequisition;
    contract_requisition_local?: ContractRequisition;
    resolved_contract_requisition?: ContractRequisition;
}

interface ShowPrPageProps {
    purchaseRequisition: PurchaseRequisition;
    contractRequisition?: ContractRequisition | null;
    documentType?: {
        code: string;
        name: string;
        extra?: string;
    } | null;
}

const CR_TABS = [
    { id: 'contract_title', label: 'Contract Title', field: 'contract_title' },
    { id: 'payment_terms', label: 'Payment Terms', field: 'payment_terms' },
    { id: 'bidders_qualification_criteria', label: "Bidder's Qualification", field: 'bidders_qualification_criteria' },
    { id: 'special_terms_condition', label: 'Special Terms & Conditions', field: 'special_terms_condition' },
    { id: 'guarantee_warranty_period', label: 'Guarantee / Warranty', field: 'guarantee_warranty_period' },
    { id: 'defect_liability_period', label: 'Defect Liability Period', field: 'defect_liability_period' },
    { id: 'others', label: 'Other Terms & Specs', field: 'others' },
] as const;

export default function ShowPurchaseRequisitionPage({
    purchaseRequisition,
    contractRequisition: crProp,
    documentType,
}: ShowPrPageProps) {
    const pr = purchaseRequisition;
    const cr =
        crProp ||
        pr.contract_requisition ||
        pr.contract_requisition_local ||
        pr.resolved_contract_requisition;

    const [activeCrTab, setActiveCrTab] = useState<string>('contract_title');
    const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);
    const [showPayloadModal, setShowPayloadModal] = useState<boolean>(false);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [expandedItemDetails, setExpandedItemDetails] = useState<boolean>(true);

    const isDraft = Boolean(pr.is_draft);
    const isSynced = pr.sap_sync_status === 'synced';

    const handleSyncToSap = () => {
        if (confirm(`Post and sync Purchase Requisition ${pr.pr_number} to SAP S/4HANA Cloud via OData V4 API?`)) {
            setIsSyncing(true);
            router.post(
                `/purchase-requisitions/${pr.id}/sync`,
                {},
                {
                    onFinish: () => setIsSyncing(false),
                }
            );
        }
    };

    const currentItem = pr.items && pr.items.length > 0 ? pr.items[selectedItemIndex] : null;

    return (
        <SapAppLayout
            title={`View PR ${pr.pr_number} - Assam Petro-Chemicals Ltd.`}
            activeTab="requisitions"
            onTabChange={(tab) => {
                if (tab === 'overview' || tab === 'requisitions') {
                    router.visit('/dashboard');
                }
            }}
            onOpenCreatePr={() => router.visit('/purchase-requisitions/create')}
        >
            <Head title={`PR ${pr.pr_number} - View Details`} />

            <div className="space-y-6">
                {/* TOP ACTION & STATUS BAR */}
                <div className="rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-xs">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => router.visit('/dashboard')}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e2ec] bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
                                title="Back to Dashboard"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </button>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-xl font-bold font-mono tracking-tight text-[#1c2d42]">
                                        {pr.pr_number}
                                    </h1>
                                    {isDraft ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-300">
                                            <FileSpreadsheet className="h-3 w-3 text-slate-500" />
                                            Draft (Local DB)
                                        </span>
                                    ) : isSynced ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-300">
                                            <CheckCircle2 className="h-3 w-3" />
                                            SAP Synced (201 Created)
                                        </span>
                                    ) : pr.sap_sync_status === 'failed' ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800 border border-rose-300">
                                            <AlertTriangle className="h-3 w-3" />
                                            Sync Failed
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-300">
                                            <Clock className="h-3 w-3" />
                                            Pending SAP Sync
                                        </span>
                                    )}

                                    {pr.sap_pr_number && (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-mono font-bold text-[#0057c2] border border-blue-200">
                                            SAP PR #{pr.sap_pr_number}
                                        </span>
                                    )}

                                    {cr?.cr_no && (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-mono font-semibold text-purple-700 border border-purple-200">
                                            CR #{cr.cr_no}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1 text-xs text-[#556b82]">
                                    Created on {new Date(pr.created_at).toLocaleString('en-IN')}
                                    {pr.user && (
                                        <span>
                                            {' '}• Created by <strong className="text-[#1c2d42]">{pr.user.name}</strong> ({pr.user.department?.name || 'Assam Petro-Chemicals Ltd.'})
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Inspect Payload Button */}
                            <button
                                type="button"
                                onClick={() => setShowPayloadModal(true)}
                                className="flex items-center gap-1.5 rounded-md border border-[#d9e2ec] bg-white px-3 py-2 text-xs font-semibold text-[#1c2d42] shadow-2xs hover:bg-slate-50 transition-colors"
                                title="Inspect SAP OData V4 Payload & Responses"
                            >
                                <FileCode className="h-4 w-4 text-[#0070f2]" />
                                <span>SAP Payload</span>
                            </button>

                            {/* Conditional Actions: If in draft, provide Edit and Sync with SAP */}
                            {isDraft ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => router.visit(`/purchase-requisitions/${pr.id}/edit`)}
                                        className="flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-[#0070f2] shadow-2xs hover:bg-blue-100 transition-colors"
                                        title="Edit this Draft Purchase Requisition"
                                    >
                                        <Edit3 className="h-4 w-4" />
                                        <span>Edit PR</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleSyncToSap}
                                        disabled={isSyncing}
                                        className="flex items-center gap-1.5 rounded-md bg-[#0070f2] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2] active:bg-[#003884] disabled:opacity-50 transition-colors"
                                        title="Finalize Draft and Post/Sync directly to SAP S/4HANA Cloud"
                                    >
                                        <Send className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                        <span>{isSyncing ? 'Syncing to SAP Cloud...' : 'Sync with SAP'}</span>
                                    </button>
                                </>
                            ) : (
                                !isSynced && (
                                    <button
                                        type="button"
                                        onClick={handleSyncToSap}
                                        disabled={isSyncing}
                                        className="flex items-center gap-1.5 rounded-md bg-[#0070f2] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2] active:bg-[#003884] disabled:opacity-50 transition-colors"
                                        title="Sync this PR to SAP S/4HANA Cloud"
                                    >
                                        <Send className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                        <span>{isSyncing ? 'Syncing to SAP Cloud...' : 'Sync with SAP'}</span>
                                    </button>
                                )
                            )}
                        </div>
                    </div>

                    {/* Sync Message Alert if Failed */}
                    {pr.sap_sync_status === 'failed' && pr.sap_sync_message && (
                        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                            <div>
                                <strong className="font-semibold">SAP S/4HANA Cloud Sync Notice:</strong>
                                <p className="mt-0.5">{pr.sap_sync_message}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* SECTION 1: HEADER GENERAL INFORMATION */}
                <div className="rounded-xl border border-[#d9e2ec] bg-white shadow-xs overflow-hidden">
                    <div className="border-b border-[#d9e2ec] bg-[#f8fafc] px-6 py-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-[#0070f2]">
                                <FileText className="h-3.5 w-3.5" />
                            </div>
                            <h2 className="text-sm font-bold text-[#1c2d42]">Header: General Information</h2>
                        </div>
                        <span className="text-[11px] text-[#556b82]">PR Header Level Details</span>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Row 1: Description & Document Type */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3.5">
                                <span className="block text-[11px] font-semibold text-[#556b82] uppercase tracking-wider">
                                    Purchase Requisition Description
                                </span>
                                <div className="mt-1 text-sm font-semibold text-[#1c2d42]">
                                    {pr.description || '—'}
                                </div>
                            </div>

                            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3.5">
                                <span className="block text-[11px] font-semibold text-[#556b82] uppercase tracking-wider">
                                    Document Type
                                </span>
                                <div className="mt-1 flex items-center gap-2">
                                    <span className="font-mono font-bold text-xs bg-blue-50 text-[#0070f2] px-2 py-0.5 rounded border border-blue-200">
                                        {pr.pr_type}
                                    </span>
                                    <span className="text-sm font-semibold text-[#1c2d42]">
                                        {documentType?.name || (pr.pr_type === 'ZMAT' ? 'Domestic Material PR' : pr.pr_type)}
                                    </span>
                                </div>
                                {documentType?.extra && (
                                    <p className="mt-1 text-[11px] text-[#556b82]">{documentType.extra}</p>
                                )}
                            </div>
                        </div>

                        {/* Row 2: Requisitioner Details (1. Name, 2. Designation, 3. Department) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-3 border-t border-slate-100">
                            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3.5">
                                <span className="block text-[11px] font-semibold text-[#556b82] uppercase tracking-wider">
                                    1. Requisitioner Name
                                </span>
                                <div className="mt-1 text-xs font-semibold text-[#1c2d42]">
                                    {cr?.requisitioner_name || pr.requisitioner || '—'}
                                </div>
                            </div>

                            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3.5">
                                <span className="block text-[11px] font-semibold text-[#556b82] uppercase tracking-wider">
                                    2. Req. Designation
                                </span>
                                <div className="mt-1 text-xs font-semibold text-[#1c2d42]">
                                    {cr?.req_designation || '—'}
                                </div>
                            </div>

                            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3.5">
                                <span className="block text-[11px] font-semibold text-[#556b82] uppercase tracking-wider">
                                    3. Req. Department
                                </span>
                                <div className="mt-1 text-xs font-semibold text-[#1c2d42]">
                                    {cr?.req_department || '—'}
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Tender Details (4. Tender Type, 5. Tender Estimated Value) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3 border-t border-slate-100">
                            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3.5">
                                <span className="block text-[11px] font-semibold text-[#556b82] uppercase tracking-wider mb-1.5">
                                    4. Tender Type
                                </span>
                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#0070f2] border border-blue-200">
                                    {cr?.tender_type || 'Single'}
                                </span>
                            </div>

                            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3.5">
                                <span className="block text-[11px] font-semibold text-[#556b82] uppercase tracking-wider mb-1.5">
                                    5. Tender Estimated Value (Tax Basis)
                                </span>
                                <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 border border-slate-200">
                                    {cr?.tender_estimate_value || 'Excluding GST'}
                                </span>
                            </div>
                        </div>

                        {/* Row 4: Valuation (6. Total PR Value, 7. Total PR Value in Words) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3 border-t border-slate-100">
                            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3.5">
                                <span className="block text-[11px] font-semibold text-[#556b82] uppercase tracking-wider">
                                    6. Total PR Value
                                </span>
                                <div className="mt-1 text-base font-bold font-mono text-[#0070f2]">
                                    {formatCurrency(Number(cr?.total_pr_value || pr.total_amount || 0), pr.currency)}
                                    <span className="text-xs text-[#556b82] font-normal ml-1">({pr.currency})</span>
                                </div>
                            </div>

                            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3.5">
                                <span className="block text-[11px] font-semibold text-[#556b82] uppercase tracking-wider">
                                    7. Total PR Value in Words
                                </span>
                                <div className="mt-1 text-xs font-semibold text-[#1c2d42] italic">
                                    {cr?.total_pr_value_in_word || '—'}
                                </div>
                            </div>
                        </div>

                        {/* Row 5: Master Data Info */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100 text-xs">
                            <div>
                                <span className="text-[#556b82] block text-[11px]">Company Code</span>
                                <span className="font-semibold text-[#1c2d42]">{pr.company_code} (APCL)</span>
                            </div>
                            <div>
                                <span className="text-[#556b82] block text-[11px]">Plant</span>
                                <span className="font-semibold text-[#1c2d42]">{pr.plant}</span>
                            </div>
                            <div>
                                <span className="text-[#556b82] block text-[11px]">Currency</span>
                                <span className="font-semibold text-[#1c2d42]">{pr.currency}</span>
                            </div>
                            <div>
                                <span className="text-[#556b82] block text-[11px]">Source Determination</span>
                                <span className="font-semibold text-[#1c2d42]">
                                    {pr.auto_source_determination ? 'Automatic (Enabled)' : 'Manual'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 2: HEADER NOTES & CONTRACT REQUISITION SPECIFICATIONS */}
                <div className="rounded-xl border border-[#d9e2ec] bg-white shadow-xs overflow-hidden">
                    <div className="border-b border-[#d9e2ec] bg-[#f8fafc] px-6 py-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-800">
                                <FileSpreadsheet className="h-3.5 w-3.5" />
                            </div>
                            <h2 className="text-sm font-bold text-[#1c2d42]">Header: Notes & Contract Requisition Details</h2>
                        </div>
                        <span className="text-[11px] text-[#556b82]">PR Header & Contract Specifications</span>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Header Note */}
                        <div>
                            <span className="block text-xs font-semibold text-[#1c2d42] mb-1.5">
                                Header Note
                            </span>
                            <div className="rounded-lg border border-[#d9e2ec] bg-slate-50/50 p-4 text-xs text-[#1c2d42] whitespace-pre-wrap min-h-[70px]">
                                {pr.header_note ? (
                                    pr.header_note
                                ) : (
                                    <span className="text-slate-400 italic">No header note maintained for this PR.</span>
                                )}
                            </div>
                        </div>

                        {/* Contract Requisition Specifications Tabbed Section */}
                        <div className="rounded-lg border border-[#d9e2ec] bg-white shadow-2xs overflow-hidden">
                            <div className="border-b border-[#d9e2ec] bg-gradient-to-r from-[#f8fafc] via-blue-50/30 to-[#f8fafc] px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-[#1c2d42] uppercase tracking-wider">
                                        Contract Requisition Specifications
                                    </span>
                                    <span className="rounded-full bg-blue-100 text-[#0070f2] px-2 py-0.5 text-[10px] font-bold">
                                        SAP CBO: YY1_CONTRACTREQUISITION
                                    </span>
                                </div>
                                {cr?.cr_no && (
                                    <span className="text-[11px] font-mono font-semibold text-[#0070f2]">
                                        CR Number: {cr.cr_no}
                                    </span>
                                )}
                            </div>

                            {/* Tabs Navigation */}
                            <div className="border-b border-[#d9e2ec] bg-[#f8fafc] px-3 overflow-x-auto no-scrollbar">
                                <nav className="flex space-x-1 py-1.5">
                                    {CR_TABS.map((tab) => {
                                        const isActive = activeCrTab === tab.id;
                                        const val = String((cr && (cr as any)[tab.field]) || '').trim();
                                        const hasContent = val.length > 0;
                                        return (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setActiveCrTab(tab.id)}
                                                className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                                                    isActive
                                                        ? 'border-[#0070f2] text-[#0070f2] bg-white shadow-2xs rounded-t-md'
                                                        : 'border-transparent text-[#556b82] hover:border-slate-300 hover:text-[#1c2d42]'
                                                }`}
                                            >
                                                <span>{tab.label}</span>
                                                {hasContent && (
                                                    <span className="h-1.5 w-1.5 rounded-full bg-[#0070f2]" title="Has content" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </nav>
                            </div>

                            {/* Tab Content Display */}
                            <div className="p-5 bg-white">
                                {(() => {
                                    const currentTab = CR_TABS.find((t) => t.id === activeCrTab) || CR_TABS[0];
                                    const content = String((cr && (cr as any)[currentTab.field]) || '').trim();

                                    return (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-[#1c2d42]">
                                                    {currentTab.label}
                                                </span>
                                                <span className="text-[10px] text-[#556b82] font-mono">
                                                    {content.length} characters
                                                </span>
                                            </div>
                                            <div className="rounded-md border border-[#d9e2ec] bg-slate-50/40 p-4 text-xs text-[#1c2d42] whitespace-pre-wrap min-h-[90px]">
                                                {content ? (
                                                    content
                                                ) : (
                                                    <span className="text-slate-400 italic">
                                                        No details maintained under {currentTab.label}.
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 3: LINE ITEMS */}
                <div className="rounded-xl border border-[#d9e2ec] bg-white shadow-xs overflow-hidden">
                    <div className="border-b border-[#d9e2ec] bg-[#f8fafc] px-6 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0070f2] text-white">
                                <Package className="h-3.5 w-3.5" />
                            </div>
                            <h2 className="text-sm font-bold text-[#1c2d42]">Line Items</h2>
                            <span className="rounded-full bg-blue-100 text-[#0070f2] px-2 py-0.5 text-xs font-semibold">
                                {pr.items?.length || 0} Item{pr.items && pr.items.length > 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="text-xs font-semibold text-[#1c2d42]">
                            Total Items Amount:{' '}
                            <strong className="text-[#0070f2] font-mono text-sm">
                                {formatCurrency(Number(pr.total_amount), pr.currency)}
                            </strong>
                        </div>
                    </div>

                    {/* Line Items Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-[#1c2d42]">
                            <thead className="bg-[#f8fafc] text-[11px] font-semibold text-[#556b82] border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">Item #</th>
                                    <th className="py-3 px-4">Type</th>
                                    <th className="py-3 px-4">Material / Service</th>
                                    <th className="py-3 px-4">Description</th>
                                    <th className="py-3 px-4">Material Group</th>
                                    <th className="py-3 px-4 text-right">Quantity</th>
                                    <th className="py-3 px-4 text-right">Unit Price</th>
                                    <th className="py-3 px-4 text-right">Total Price</th>
                                    <th className="py-3 px-4">Plant</th>
                                    <th className="py-3 px-4">Delivery Date</th>
                                    <th className="py-3 px-4 text-center">Attachment</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {!pr.items || pr.items.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="py-8 text-center text-xs text-[#556b82]">
                                            No line items found for this purchase requisition.
                                        </td>
                                    </tr>
                                ) : (
                                    pr.items.map((item, idx) => {
                                        const isSelected = selectedItemIndex === idx;
                                        return (
                                            <tr
                                                key={item.id || idx}
                                                onClick={() => setSelectedItemIndex(idx)}
                                                className={`cursor-pointer transition-colors ${
                                                    isSelected ? 'bg-blue-50/60 font-medium' : 'hover:bg-slate-50'
                                                }`}
                                            >
                                                <td className="py-3 px-4 font-mono font-bold text-[#0070f2]">
                                                    {item.item_number}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                                                        item.item_type === 'service'
                                                            ? 'bg-purple-100 text-purple-800'
                                                            : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                        {item.item_type || 'material'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 font-mono font-semibold text-[#1c2d42]">
                                                    {item.material_code || '—'}
                                                </td>
                                                <td className="py-3 px-4 max-w-xs truncate" title={item.description}>
                                                    {item.description}
                                                </td>
                                                <td className="py-3 px-4 font-mono text-[11px] text-[#556b82]">
                                                    {item.material_group}
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono font-semibold text-[#1c2d42]">
                                                    {Number(item.quantity).toLocaleString()} {item.unit_of_measure}
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono text-slate-700">
                                                    {formatCurrency(Number(item.unit_price), item.currency || pr.currency)}
                                                    {item.price_unit > 1 && (
                                                        <span className="text-[10px] text-slate-400 block">
                                                            per {item.price_unit} {item.unit_of_measure}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono font-bold text-[#0070f2]">
                                                    {formatCurrency(Number(item.total_price), item.currency || pr.currency)}
                                                </td>
                                                <td className="py-3 px-4 font-mono text-[11px]">
                                                    {item.plant}
                                                </td>
                                                <td className="py-3 px-4 text-[11px] text-slate-600">
                                                    {item.delivery_date ? new Date(item.delivery_date).toLocaleDateString('en-IN') : '—'}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {item.attachment_name ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] text-[#0070f2] font-semibold">
                                                            <Paperclip className="h-3 w-3" />
                                                            <span>1 file</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Selected Item Full Detail View Card */}
                    {currentItem && (
                        <div className="border-t border-slate-200 bg-[#fbfcfd] p-6 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                                <div className="flex items-center gap-2">
                                    <span className="rounded-md bg-blue-100 text-[#0070f2] px-2 py-0.5 text-xs font-mono font-bold">
                                        Item #{currentItem.item_number}
                                    </span>
                                    <h3 className="text-xs font-bold text-[#1c2d42]">
                                        Detailed Specification: {currentItem.description}
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setExpandedItemDetails(!expandedItemDetails)}
                                    className="text-[11px] font-semibold text-[#0070f2] flex items-center gap-1"
                                >
                                    <span>{expandedItemDetails ? 'Collapse Details' : 'Expand Details'}</span>
                                    {expandedItemDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </button>
                            </div>

                            {expandedItemDetails && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                                    {/* Column 1: Material & Supply Details */}
                                    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                                        <h4 className="font-bold text-[#1c2d42] uppercase text-[10px] tracking-wider text-slate-500 border-b border-slate-100 pb-1.5">
                                            Material & Vendor Information
                                        </h4>
                                        <div>
                                            <span className="text-[#556b82] text-[11px] block">Material Code / Product</span>
                                            <span className="font-mono font-semibold text-[#1c2d42]">
                                                {currentItem.material_code || '— (Direct description item)'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[#556b82] text-[11px] block">Supplier Part Number</span>
                                            <span className="font-mono text-[#1c2d42]">
                                                {currentItem.supplier_material_number || currentItem.manufacturer_part_number || '—'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[#556b82] text-[11px] block">Material Group</span>
                                            <span className="font-mono text-[#1c2d42]">{currentItem.material_group}</span>
                                        </div>
                                        <div>
                                            <span className="text-[#556b82] text-[11px] block">Desired / Fixed Vendor</span>
                                            <span className="font-semibold text-[#1c2d42]">
                                                {currentItem.desired_supplier || currentItem.fixed_vendor || '—'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Column 2: Account Assignment & Logistics */}
                                    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                                        <h4 className="font-bold text-[#1c2d42] uppercase text-[10px] tracking-wider text-slate-500 border-b border-slate-100 pb-1.5">
                                            Account Assignment & Organization
                                        </h4>
                                        <div>
                                            <span className="text-[#556b82] text-[11px] block">Account Assignment Cat (AAC)</span>
                                            <span className="font-mono font-semibold text-[#1c2d42]">
                                                {currentItem.account_assignment_category ? `${currentItem.account_assignment_category} (Cost Center)` : '— (Standard Inventory)'}
                                            </span>
                                        </div>
                                        {currentItem.cost_center && (
                                            <div>
                                                <span className="text-[#556b82] text-[11px] block">Cost Center</span>
                                                <span className="font-mono text-[#0070f2] font-semibold">{currentItem.cost_center}</span>
                                            </div>
                                        )}
                                        {currentItem.gl_account && (
                                            <div>
                                                <span className="text-[#556b82] text-[11px] block">G/L Account</span>
                                                <span className="font-mono text-[#1c2d42]">{currentItem.gl_account}</span>
                                            </div>
                                        )}
                                        <div>
                                            <span className="text-[#556b82] text-[11px] block">Purchasing Org / Group</span>
                                            <span className="font-mono text-[#1c2d42]">
                                                {currentItem.purchasing_organization || '1100'} / {currentItem.purchasing_group || '103'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[#556b82] text-[11px] block">Storage Location</span>
                                            <span className="font-mono text-[#1c2d42]">{currentItem.storage_location || '—'}</span>
                                        </div>
                                    </div>

                                    {/* Column 3: Texts & Attachments */}
                                    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                                        <h4 className="font-bold text-[#1c2d42] uppercase text-[10px] tracking-wider text-slate-500 border-b border-slate-100 pb-1.5">
                                            Item Texts & Attached Documents
                                        </h4>
                                        {currentItem.item_text && (
                                            <div>
                                                <span className="text-[#556b82] text-[11px] block">Item Text</span>
                                                <p className="text-slate-700 italic">{currentItem.item_text}</p>
                                            </div>
                                        )}
                                        {currentItem.item_note && (
                                            <div>
                                                <span className="text-[#556b82] text-[11px] block">Item Note</span>
                                                <p className="text-slate-700 italic">{currentItem.item_note}</p>
                                            </div>
                                        )}
                                        {currentItem.delivery_text && (
                                            <div>
                                                <span className="text-[#556b82] text-[11px] block">Delivery Instructions</span>
                                                <p className="text-slate-700 italic">{currentItem.delivery_text}</p>
                                            </div>
                                        )}
                                        {currentItem.attachment_name && (
                                            <div>
                                                <span className="text-[#556b82] text-[11px] block mb-1">Attached Document</span>
                                                <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs text-[#0070f2]">
                                                    <Paperclip className="h-3.5 w-3.5" />
                                                    <span className="font-medium truncate max-w-[180px]">{currentItem.attachment_name}</span>
                                                    <span className="text-[10px] text-slate-400">({currentItem.attachment_doc_type || 'SL1'})</span>
                                                </div>
                                            </div>
                                        )}
                                        {!currentItem.item_text && !currentItem.item_note && !currentItem.delivery_text && !currentItem.attachment_name && (
                                            <p className="text-slate-400 italic text-xs">No extra item texts or documents attached.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* SECTION 4: GENERAL ATTACHMENTS (IF ANY) */}
                {pr.attachments && pr.attachments.length > 0 && (
                    <div className="rounded-xl border border-[#d9e2ec] bg-white shadow-xs overflow-hidden">
                        <div className="border-b border-[#d9e2ec] bg-[#f8fafc] px-6 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Paperclip className="h-4 w-4 text-[#0070f2]" />
                                <h3 className="text-xs font-bold text-[#1c2d42]">PR Attachments</h3>
                                <span className="rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-[10px] font-semibold">
                                    {pr.attachments.length} file{pr.attachments.length > 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {pr.attachments.map((att) => (
                                    <div
                                        key={att.id}
                                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-3 hover:bg-blue-50/40 transition-colors"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <Paperclip className="h-4 w-4 text-[#0070f2] shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-[#1c2d42] truncate" title={att.file_name}>
                                                    {att.file_name}
                                                </p>
                                                <span className="text-[10px] text-slate-400">
                                                    Doc Type: {att.attachment_doc_type} • SAP: {att.sap_sync_status}
                                                </span>
                                            </div>
                                        </div>
                                        <a
                                            href={`/attachments/${att.id}/download`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="shrink-0 ml-2 rounded p-1.5 text-slate-500 hover:text-[#0070f2] hover:bg-white transition-colors"
                                            title="Download Attachment"
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SAP Payload / OData V4 Inspector Modal */}
            <SapPayloadModal
                pr={pr as any}
                isOpen={showPayloadModal}
                onClose={() => setShowPayloadModal(false)}
            />
        </SapAppLayout>
    );
}
