import React, { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { User } from '@/types';
import SapAppLayout from '@/layouts/sap-app-layout';
import SapPayloadModal from '@/components/sap/SapPayloadModal';
import PurchaseRequisitionPrintModal from '@/components/sap/PurchaseRequisitionPrintModal';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    AlertTriangle,
    FileSpreadsheet,
    FileText,
    Send,
    Edit3,
    Printer,
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
    ShieldCheck,
    Truck,
    Sparkles,
    Search,
    Wrench,
    Hash,
    MapPin,
    LayoutGrid,
    ListFilter,
    Check,
    Info,
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
    expected_value?: number | string;
    overall_limit?: number | string;
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
    start_date?: string;
    end_date?: string;
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
    supplier_name?: string;
    moving_average_price?: string | number;
    standard_price?: string | number;
    inventory_valuation_procedure?: string;
    price_control?: string;
}

interface ContractRequisition {
    id?: number;
    cr_no?: string;
    pr_number_sap?: string;
    contract_title?: string;
    scope_of_work?: string;
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
    header_option?: {
        id?: number;
        code?: string;
        name?: string;
        description?: string;
    } | null;
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
    { id: 'scope_of_work', label: 'Scope of Work', field: 'scope_of_work' },
    { id: 'payment_terms', label: 'Payment Terms', field: 'payment_terms' },
    { id: 'bidders_qualification_criteria', label: "Bidder's Qualification", field: 'bidders_qualification_criteria' },
    { id: 'special_terms_condition', label: 'Special Terms & Conditions', field: 'special_terms_condition' },
    { id: 'guarantee_warranty_period', label: 'Guarantee / Warranty', field: 'guarantee_warranty_period' },
    { id: 'defect_liability_period', label: 'Defect Liability Period', field: 'defect_liability_period' },
    { id: 'others', label: 'Other Terms & Specs', field: 'others' },
] as const;

const ITEM_DETAIL_TABS = [
    { id: 'general', label: 'General Information', icon: Package },
    { id: 'enhanced-limits', label: 'Enhanced Limits', icon: ShieldCheck },
    { id: 'quantity-date', label: 'Quantity and Date', icon: Calendar },
    { id: 'valuation', label: 'Valuation', icon: DollarSign },
    { id: 'account-assignment', label: 'Account Assignment', icon: Layers },
    { id: 'source-of-supply', label: 'Source of Supply', icon: Building2 },
    { id: 'contact-info', label: 'Contact Information', icon: UserIcon },
    { id: 'notes', label: 'Notes & Attachments', icon: Paperclip },
] as const;

function formatDate(dateStr?: string | null): string {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return String(dateStr);
        return d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return String(dateStr);
    }
}

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

    const { auth } = usePage().props as { auth?: { user?: User } };
    const user = auth?.user;
    const isSuperAdmin = Boolean(user?.is_superadmin || user?.role?.name?.toLowerCase() === 'superadmin');

    const [activeCrTab, setActiveCrTab] = useState<string>('contract_title');
    const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);
    const [activeItemDetailTab, setActiveItemDetailTab] = useState<string>('general');
    const [itemDetailViewMode, setItemDetailViewMode] = useState<'tabs' | 'all'>('tabs');
    const [showPayloadModal, setShowPayloadModal] = useState<boolean>(false);
    const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
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
    const isCurrentItemMaterial = currentItem?.item_type === 'material';

    const isCurrentItemEnhancedLimits = !isCurrentItemMaterial && Boolean(
        currentItem?.item_category === 'E' ||
        (currentItem?.expected_value !== undefined && currentItem?.expected_value !== null && Number(currentItem.expected_value) > 0) ||
        (currentItem?.overall_limit !== undefined && currentItem?.overall_limit !== null && Number(currentItem.overall_limit) > 0) ||
        currentItem?.start_date ||
        currentItem?.end_date
    );

    useEffect(() => {
        if (activeItemDetailTab === 'enhanced-limits' && !isCurrentItemEnhancedLimits) {
            setActiveItemDetailTab('general');
        }
    }, [isCurrentItemEnhancedLimits, activeItemDetailTab]);

    // Filter matching attachments for current item
    const currentItemAttachments = (pr.attachments || []).filter(
        (att) =>
            (currentItem && att.item_number === currentItem.item_number) ||
            (currentItem && att.purchase_requisition_item_id === currentItem.id)
    );

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
                                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-mono font-bold text-[#0070f2] border border-blue-200">
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
                            {/* Print Indent Form (F-2) Button */}
                            <button
                                type="button"
                                onClick={() => setShowPrintModal(true)}
                                className="flex items-center gap-1.5 rounded-md border border-[#d9e2ec] bg-white px-3 py-2 text-xs font-semibold text-[#1c2d42] shadow-2xs hover:border-slate-400 hover:bg-slate-50 transition-colors"
                                title="Print APL Materials Indent Form (F-2)"
                            >
                                <Printer className="h-4 w-4 text-slate-600" />
                                <span>Print PR</span>
                            </button>

                            {/* Inspect Payload Button */}
                            {isSuperAdmin && (
                                <button
                                    type="button"
                                    onClick={() => setShowPayloadModal(true)}
                                    className="flex items-center gap-1.5 rounded-md border border-[#d9e2ec] bg-white px-3 py-2 text-xs font-semibold text-[#1c2d42] shadow-2xs hover:bg-slate-50 transition-colors"
                                    title="Inspect SAP OData V4 Payload & Responses"
                                >
                                    <FileCode className="h-4 w-4 text-[#0070f2]" />
                                    <span>SAP Payload</span>
                                </button>
                            )}

                            {/* Conditional Actions: If in draft or sync failed, provide Edit and Sync with SAP */}
                            {(isDraft || pr.sap_sync_status === 'failed') && (
                                <button
                                    type="button"
                                    onClick={() => router.visit(`/purchase-requisitions/${pr.id}/edit`)}
                                    className={`flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-xs font-semibold shadow-2xs transition-colors ${
                                        pr.sap_sync_status === 'failed'
                                            ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                            : 'border-blue-200 bg-blue-50 text-[#0070f2] hover:bg-blue-100'
                                    }`}
                                    title={pr.sap_sync_status === 'failed' ? "Edit Failed Purchase Requisition" : "Edit Draft Purchase Requisition"}
                                >
                                    <Edit3 className="h-4 w-4" />
                                    <span>Edit PR</span>
                                </button>
                            )}

                            {!isSynced && (
                                <button
                                    type="button"
                                    onClick={handleSyncToSap}
                                    disabled={isSyncing}
                                    className="flex items-center gap-1.5 rounded-md bg-[#0070f2] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2] active:bg-[#003884] disabled:opacity-50 transition-colors"
                                    title={isDraft ? "Finalize Draft and Post/Sync directly to SAP S/4HANA Cloud" : "Post / Sync this PR to SAP S/4HANA Cloud"}
                                >
                                    <Send className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                    <span>{isSyncing ? 'Syncing to SAP Cloud...' : 'Sync with SAP'}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Sync Message Alert if Failed */}
                    {pr.sap_sync_status === 'failed' && pr.sap_sync_message && (
                        <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 animate-in fade-in">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <strong className="font-semibold text-rose-900">SAP S/4HANA Cloud Sync Notice:</strong>
                                        <span className="rounded bg-rose-200/70 px-1.5 py-0.2 text-[10px] font-semibold text-rose-800">
                                            Handshake Failed
                                        </span>
                                    </div>
                                    <p className="mt-1 text-rose-800 leading-relaxed font-medium">
                                        {pr.sap_sync_message.includes('CSRF token') && pr.sap_sync_message.includes('401')
                                            ? 'SAP S/4HANA Cloud Authentication Failed (HTTP 401): Communication User credentials were not accepted by SAP S/4HANA Cloud. Please verify SAP_ODATA_USER and SAP_ODATA_PASSWORD in your environment configuration, then click Retry Sync.'
                                            : pr.sap_sync_message}
                                    </p>
                                    <p className="mt-1 text-[11px] text-rose-600">
                                        This requisition is safely preserved in the local database. You can retry syncing whenever SAP connectivity is restored.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                                <button
                                    type="button"
                                    onClick={handleSyncToSap}
                                    disabled={isSyncing}
                                    className="inline-flex items-center gap-1.5 rounded-md bg-[#0070f2] px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#0057c2] active:bg-[#003884] disabled:opacity-50 transition-colors"
                                >
                                    <Send className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                                    <span>{isSyncing ? 'Retrying...' : 'Retry Sync to SAP'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.visit(`/purchase-requisitions/${pr.id}/edit`)}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-2xs hover:bg-rose-100 transition-colors"
                                >
                                    <Edit3 className="h-3.5 w-3.5" />
                                    <span>Edit</span>
                                </button>
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
                        {/* Row 1: Description, Document Type & Header Option */}
                        <div className={`grid grid-cols-1 ${pr.header_option ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>
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

                            {pr.header_option && (
                                <div className="rounded-lg border border-purple-100 bg-purple-50/40 p-3.5">
                                    <span className="block text-[11px] font-semibold text-purple-700 uppercase tracking-wider">
                                        Header Option
                                    </span>
                                    <div className="mt-1 flex items-center gap-2">
                                        {pr.header_option.code && (
                                            <span className="font-mono font-bold text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded border border-purple-200">
                                                {pr.header_option.code}
                                            </span>
                                        )}
                                        <span className="text-sm font-semibold text-[#1c2d42]">
                                            {pr.header_option.name}
                                        </span>
                                    </div>
                                    {pr.header_option.description && (
                                        <p className="mt-1 text-[11px] text-[#556b82]">{pr.header_option.description}</p>
                                    )}
                                </div>
                            )}
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
                                    <th className="py-3 px-3">Item #</th>
                                    <th className="py-3 px-2.5">Type</th>
                                    <th className="py-3 px-2.5">Item Cat.</th>
                                    <th className="py-3 px-2.5">Acct. Assign.</th>
                                    <th className="py-3 px-3">Material / Service</th>
                                    <th className="py-3 px-3">Description</th>
                                    <th className="py-3 px-2.5">Material Group</th>
                                    <th className="py-3 px-3 text-right">Quantity & UoM</th>
                                    <th className="py-3 px-3 text-right">Valuation Price</th>
                                    <th className="py-3 px-3 text-right">Total Price</th>
                                    <th className="py-3 px-2.5">Plant</th>
                                    <th className="py-3 px-2.5">Delivery Date</th>
                                    <th className="py-3 px-2 text-center">Attachment</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {!pr.items || pr.items.length === 0 ? (
                                    <tr>
                                        <td colSpan={13} className="py-8 text-center text-xs text-[#556b82]">
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
                                                    isSelected ? 'bg-blue-50/70 font-medium' : 'hover:bg-slate-50'
                                                }`}
                                            >
                                                <td className="py-3 px-3 font-mono font-bold text-[#0070f2]">
                                                    <div className="flex items-center gap-1.5">
                                                        {isSelected && (
                                                            <span className="h-1.5 w-1.5 rounded-full bg-[#0070f2] shrink-0" />
                                                        )}
                                                        <span>{item.item_number}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-2.5">
                                                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                                                        item.item_type === 'service'
                                                            ? 'bg-purple-100 text-purple-800'
                                                            : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                        {item.item_type || 'material'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2.5 font-mono text-[11px]">
                                                    {item.item_category ? (
                                                        <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                                                            {item.item_category}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">Standard</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-2.5 font-mono text-[11px]">
                                                    {item.account_assignment_category ? (
                                                        <span className="inline-flex items-center rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                                            {item.account_assignment_category}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-[10px]">Stock</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 font-mono font-semibold text-[#1c2d42]">
                                                    {item.material_code || '—'}
                                                </td>
                                                <td className="py-3 px-3 max-w-xs truncate" title={item.description}>
                                                    {item.description}
                                                </td>
                                                <td className="py-3 px-2.5 font-mono text-[11px] text-[#556b82]">
                                                    {item.material_group}
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono font-semibold text-[#1c2d42]">
                                                    {Number(item.quantity).toLocaleString()} {item.unit_of_measure}
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono text-slate-700">
                                                    {formatCurrency(Number(item.unit_price), item.currency || pr.currency)}
                                                    {item.price_unit > 1 && (
                                                        <span className="text-[10px] text-slate-400 block">
                                                            per {item.price_unit} {item.unit_of_measure}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono font-bold text-[#0070f2]">
                                                    {formatCurrency(Number(item.total_price), item.currency || pr.currency)}
                                                </td>
                                                <td className="py-3 px-2.5 font-mono text-[11px]">
                                                    {item.plant}
                                                </td>
                                                <td className="py-3 px-2.5 text-[11px] text-slate-600">
                                                    {formatDate(item.delivery_date)}
                                                </td>
                                                <td className="py-3 px-2 text-center">
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

                    {/* Selected Item Full Comprehensive Detail View Card */}
                    {currentItem && (
                        <div className="border-t border-slate-200 bg-[#fbfcfd] p-6 space-y-5">
                            {/* Detail Card Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <span className="rounded-md bg-blue-100 text-[#0070f2] px-2.5 py-1 text-xs font-mono font-bold">
                                        Item #{currentItem.item_number}
                                    </span>
                                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                                        currentItem.item_type === 'service'
                                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                                    }`}>
                                        {currentItem.item_type === 'service' ? 'Service (2)' : 'Material (1)'}
                                    </span>
                                    {currentItem.item_category && (
                                        <span className="inline-flex items-center rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                            Cat: {currentItem.item_category === 'E' ? 'E (Enhanced Limits)' : currentItem.item_category}
                                        </span>
                                    )}
                                    <h3 className="text-sm font-bold text-[#1c2d42] truncate max-w-md" title={currentItem.description}>
                                        {currentItem.description}
                                    </h3>
                                </div>

                                <div className="flex items-center gap-3 self-end sm:self-auto">
                                    {/* View Mode Toggle: Tabbed View vs All Sections */}
                                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs shadow-2xs">
                                        <button
                                            type="button"
                                            onClick={() => setItemDetailViewMode('tabs')}
                                            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-semibold transition-colors ${
                                                itemDetailViewMode === 'tabs'
                                                    ? 'bg-blue-50 text-[#0070f2]'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            <ListFilter className="h-3.5 w-3.5" />
                                            <span>Tabbed View</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setItemDetailViewMode('all')}
                                            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-semibold transition-colors ${
                                                itemDetailViewMode === 'all'
                                                    ? 'bg-blue-50 text-[#0070f2]'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            <LayoutGrid className="h-3.5 w-3.5" />
                                            <span>Show All Sections</span>
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setExpandedItemDetails(!expandedItemDetails)}
                                        className="text-xs font-semibold text-[#0070f2] flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-2xs hover:bg-slate-50 transition-colors"
                                    >
                                        <span>{expandedItemDetails ? 'Collapse' : 'Expand'}</span>
                                        {expandedItemDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                    </button>
                                </div>
                            </div>

                            {expandedItemDetails && (
                                <div className="space-y-6">
                                    {/* In Tabbed View: Navigation Bar */}
                                    {itemDetailViewMode === 'tabs' && (
                                        <div className="border-b border-[#d9e2ec] bg-white rounded-lg border p-1 shadow-2xs overflow-x-auto no-scrollbar">
                                            <nav className="flex space-x-1">
                                                {ITEM_DETAIL_TABS.filter((tab) => tab.id !== 'enhanced-limits' || isCurrentItemEnhancedLimits).map((tab) => {
                                                    const isActive = activeItemDetailTab === tab.id;
                                                    const isLimitsTab = tab.id === 'enhanced-limits';
                                                    const IconComponent = tab.icon;

                                                    return (
                                                        <button
                                                            key={tab.id}
                                                            type="button"
                                                            onClick={() => setActiveItemDetailTab(tab.id)}
                                                            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md whitespace-nowrap transition-all ${
                                                                isActive
                                                                    ? 'bg-[#0070f2] text-white shadow-xs'
                                                                    : 'text-[#556b82] hover:bg-slate-100 hover:text-[#1c2d42]'
                                                            }`}
                                                        >
                                                            <IconComponent className="h-3.5 w-3.5" />
                                                            <span>{tab.label}</span>
                                                            {isLimitsTab && isCurrentItemEnhancedLimits && (
                                                                <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                                                                    isActive ? 'bg-amber-300 text-amber-950' : 'bg-amber-100 text-amber-800'
                                                                }`}>
                                                                    E
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </nav>
                                        </div>
                                    )}

                                    {/* SECTION 1: General Information */}
                                    {(itemDetailViewMode === 'all' || activeItemDetailTab === 'general') && (
                                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-[#0070f2]">
                                                        <Package className="h-3.5 w-3.5" />
                                                    </div>
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#1c2d42]">
                                                        General Information
                                                    </h4>
                                                </div>
                                                <span className="text-[11px] text-[#556b82]">
                                                    Material, Item Category, Batch & Storage Specs
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Product Type Group</span>
                                                    <span className="font-semibold text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.item_type === 'service' ? 'Service (2)' : 'Material (1)'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Material Number / Code</span>
                                                    <span className="font-mono font-bold text-[#0070f2] mt-0.5 block">
                                                        {currentItem.material_code || '— (Direct description item)'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Item Category</span>
                                                    <span className="font-semibold text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.item_category ? (
                                                            currentItem.item_category === 'E' ? 'E (Enhanced Limits)' : currentItem.item_category
                                                        ) : (
                                                            'Standard'
                                                        )}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Account Assignment Cat (AAC)</span>
                                                    <span className="font-semibold text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.account_assignment_category
                                                            ? `${currentItem.account_assignment_category} (Cost Center)`
                                                            : 'Standard Stock / Inventory'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Material Group</span>
                                                    <span className="font-mono font-semibold text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.material_group || '—'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Plant (Valuation Area)</span>
                                                    <span className="font-mono font-semibold text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.plant || pr.plant}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Storage Location</span>
                                                    <span className="font-mono font-semibold text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.storage_location || '—'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Purchasing Group</span>
                                                    <span className="font-mono font-semibold text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.purchasing_group || '103'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Supplier Material Number</span>
                                                    <span className="font-mono text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.supplier_material_number || '—'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Manufacturer Part Number (MPN)</span>
                                                    <span className="font-mono text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.manufacturer_part_number || currentItem.supplier_material_number || '—'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Batch Number</span>
                                                    <span className="font-mono text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.batch || '—'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Revision Level</span>
                                                    <span className="font-mono text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.revision_level || '—'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* SECTION 2: Enhanced Limits */}
                                    {isCurrentItemEnhancedLimits && (itemDetailViewMode === 'all' || activeItemDetailTab === 'enhanced-limits') && (
                                        <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-2xs space-y-4">
                                            <div className="flex items-center justify-between border-b border-amber-100 pb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-800">
                                                        <ShieldCheck className="h-3.5 w-3.5" />
                                                    </div>
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                                                        Enhanced Limits (Item Category E)
                                                    </h4>
                                                </div>
                                                <span className="text-[11px] text-amber-800 font-semibold bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                                                    SAP Limit Order Procurement
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                                <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-3.5">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Expected Value</span>
                                                    <div className="mt-1 text-base font-bold font-mono text-[#0070f2]">
                                                        {currentItem.expected_value !== undefined && currentItem.expected_value !== null && Number(currentItem.expected_value) > 0
                                                            ? formatCurrency(Number(currentItem.expected_value), currentItem.currency || pr.currency)
                                                            : '—'}
                                                    </div>
                                                    <span className="text-[10px] text-[#556b82] mt-1 block">Expected overall expenditure</span>
                                                </div>

                                                <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-3.5">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Overall Limit</span>
                                                    <div className="mt-1 text-base font-bold font-mono text-amber-900">
                                                        {currentItem.overall_limit !== undefined && currentItem.overall_limit !== null && Number(currentItem.overall_limit) > 0
                                                            ? formatCurrency(Number(currentItem.overall_limit), currentItem.currency || pr.currency)
                                                            : '—'}
                                                    </div>
                                                    <span className="text-[10px] text-[#556b82] mt-1 block">Maximum allowable upper ceiling</span>
                                                </div>

                                                <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-3.5">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Validity Start Date</span>
                                                    <div className="mt-1 font-semibold text-[#1c2d42]">
                                                        {formatDate(currentItem.start_date)}
                                                    </div>
                                                    <span className="text-[10px] text-[#556b82] mt-1 block">Limit validity commencement</span>
                                                </div>

                                                <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-3.5">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Validity End Date</span>
                                                    <div className="mt-1 font-semibold text-[#1c2d42]">
                                                        {formatDate(currentItem.end_date)}
                                                    </div>
                                                    <span className="text-[10px] text-[#556b82] mt-1 block">Limit expiration cutoff</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* SECTION 3: Quantity and Date */}
                                    {(itemDetailViewMode === 'all' || activeItemDetailTab === 'quantity-date') && (
                                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-[#0070f2]">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                    </div>
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#1c2d42]">
                                                        Quantity and Date
                                                    </h4>
                                                </div>
                                                <span className="text-[11px] text-[#556b82]">
                                                    Requisition, Delivery, Lead Time & Processing Days
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Quantity & UoM</span>
                                                    <span className="font-mono font-bold text-sm text-[#0070f2] mt-0.5 block">
                                                        {Number(currentItem.quantity).toLocaleString()} {currentItem.unit_of_measure}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Delivery Date</span>
                                                    <span className="font-semibold text-[#1c2d42] mt-0.5 block">
                                                        {formatDate(currentItem.delivery_date)}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Requisition Date</span>
                                                    <span className="font-semibold text-[#1c2d42] mt-0.5 block">
                                                        {formatDate(currentItem.requisition_date)}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Release Date</span>
                                                    <span className="font-semibold text-[#1c2d42] mt-0.5 block">
                                                        {formatDate(currentItem.release_date)}
                                                    </span>
                                                </div>

                                                {!isCurrentItemMaterial && (
                                                    <>
                                                        <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                            <span className="text-[#556b82] text-[11px] block font-medium">Validity Start Date</span>
                                                            <span className="font-semibold text-[#1c2d42] mt-0.5 block">
                                                                {formatDate(currentItem.start_date)}
                                                            </span>
                                                        </div>

                                                        <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                            <span className="text-[#556b82] text-[11px] block font-medium">Validity End Date</span>
                                                            <span className="font-semibold text-[#1c2d42] mt-0.5 block">
                                                                {formatDate(currentItem.end_date)}
                                                            </span>
                                                        </div>
                                                    </>
                                                )}

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Planned Delivery Time</span>
                                                    <span className="font-mono font-semibold text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.planned_delivery_time !== undefined && currentItem.planned_delivery_time !== null
                                                            ? `${currentItem.planned_delivery_time} Days`
                                                            : '0 Days'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">GR Processing Time</span>
                                                    <span className="font-mono font-semibold text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.gr_processing_time !== undefined && currentItem.gr_processing_time !== null
                                                            ? `${currentItem.gr_processing_time} Days`
                                                            : '0 Days'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* SECTION 4: Valuation */}
                                    {(itemDetailViewMode === 'all' || activeItemDetailTab === 'valuation') && (
                                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-[#0070f2]">
                                                        <DollarSign className="h-3.5 w-3.5" />
                                                    </div>
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#1c2d42]">
                                                        Valuation & Pricing
                                                    </h4>
                                                </div>
                                                <span className="text-[11px] text-[#556b82]">
                                                    Unit Price, Currency, Tax Code, Price Control & Net Value
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Valuation Price</span>
                                                    <span className="font-mono font-bold text-sm text-[#1c2d42] mt-0.5 block">
                                                        {formatCurrency(Number(currentItem.unit_price), currentItem.currency || pr.currency)}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Price Unit</span>
                                                    <span className="font-semibold text-[#1c2d42] mt-0.5 block">
                                                        per {currentItem.price_unit || 1} {currentItem.unit_of_measure}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Currency</span>
                                                    <span className="font-mono font-semibold text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.currency || pr.currency}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Calculated Total Price</span>
                                                    <span className="font-mono font-bold text-sm text-[#0070f2] mt-0.5 block">
                                                        {formatCurrency(Number(currentItem.total_price), currentItem.currency || pr.currency)}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Tax Code</span>
                                                    <span className="font-mono font-semibold text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.tax_code ? `${currentItem.tax_code} (Applied)` : '— (No Tax Code)'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">PO Price Type</span>
                                                    <span className="font-semibold text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.po_price_type || 'Do not adopt'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Price Control Procedure</span>
                                                    <span className="font-semibold text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.inventory_valuation_procedure
                                                            ? currentItem.inventory_valuation_procedure === 'V'
                                                                ? 'V (Moving Average Price)'
                                                                : 'S (Standard Price)'
                                                            : (currentItem.item_type === 'service' ? 'Service Rate' : 'Standard Inventory')}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Valuation Basis Formula</span>
                                                    <span className="font-mono text-[11px] text-[#556b82] mt-0.5 block">
                                                        ({currentItem.quantity} / {currentItem.price_unit || 1}) × {currentItem.unit_price}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* SECTION 5: Account Assignment */}
                                    {(itemDetailViewMode === 'all' || activeItemDetailTab === 'account-assignment') && (
                                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-[#0070f2]">
                                                        <Layers className="h-3.5 w-3.5" />
                                                    </div>
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#1c2d42]">
                                                        Account Assignment
                                                    </h4>
                                                </div>
                                                <span className="text-[11px] text-[#556b82]">
                                                    Cost Center, G/L Account & Tracking Identifier
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Account Assignment Cat (AAC)</span>
                                                    <span className="font-mono font-bold text-[#0070f2] mt-0.5 block">
                                                        {currentItem.account_assignment_category
                                                            ? `${currentItem.account_assignment_category} (Cost Center Expense)`
                                                            : 'Blank (Standard Inventory)'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Cost Center</span>
                                                    <span className="font-mono font-bold text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.cost_center || '—'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">G/L Account</span>
                                                    <span className="font-mono font-bold text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.gl_account || '—'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Requirement Tracking Number</span>
                                                    <span className="font-mono text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.requirement_tracking_number || '—'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* SECTION 6: Source of Supply */}
                                    {(itemDetailViewMode === 'all' || activeItemDetailTab === 'source-of-supply') && (
                                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-[#0070f2]">
                                                        <Building2 className="h-3.5 w-3.5" />
                                                    </div>
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#1c2d42]">
                                                        Source of Supply
                                                    </h4>
                                                </div>
                                                <span className="text-[11px] text-[#556b82]">
                                                    Vendor, Supplying Plant, Outline Agreement & PIR
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Desired Vendor</span>
                                                    <span className="font-mono font-bold text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.desired_supplier || '—'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Fixed Vendor</span>
                                                    <span className="font-mono font-bold text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.fixed_vendor || '—'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Supplying Plant</span>
                                                    <span className="font-mono text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.supplying_plant || '— (Direct Vendor)'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Purchase Organisation</span>
                                                    <span className="font-mono text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.purchasing_organization || '1100'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Outline Agreement</span>
                                                    <span className="font-mono font-semibold text-[#0070f2] mt-0.5 block">
                                                        {currentItem.agreement_number || '—'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Agreement Item</span>
                                                    <span className="font-mono text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.agreement_item || '—'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Purchasing Info Record (PIR)</span>
                                                    <span className="font-mono font-semibold text-purple-700 mt-0.5 block">
                                                        {currentItem.info_record || '—'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Manufacturer Part Number</span>
                                                    <span className="font-mono text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.manufacturer_part_number || currentItem.supplier_material_number || '—'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* SECTION 7: Contact Information */}
                                    {(itemDetailViewMode === 'all' || activeItemDetailTab === 'contact-info') && (
                                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-[#0070f2]">
                                                        <UserIcon className="h-3.5 w-3.5" />
                                                    </div>
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#1c2d42]">
                                                        Contact Information
                                                    </h4>
                                                </div>
                                                <span className="text-[11px] text-[#556b82]">
                                                    Requisitioner, Department, Designation & Buyer Groups
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3.5">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Requisitioner</span>
                                                    <span className="font-bold text-[#1c2d42] text-sm mt-0.5 block">
                                                        {cr?.requisitioner_name || pr.requisitioner || pr.user?.name || '—'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3.5">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Requesting Department</span>
                                                    <span className="font-semibold text-[#1c2d42] mt-0.5 block">
                                                        {cr?.req_department || pr.user?.department?.name || 'Assam Petro-Chemicals Ltd.'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3.5">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Requesting Designation</span>
                                                    <span className="font-semibold text-[#1c2d42] mt-0.5 block">
                                                        {cr?.req_designation || pr.user?.designation || '—'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3.5">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Requirement Tracking Number</span>
                                                    <span className="font-mono text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.requirement_tracking_number || '—'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3.5">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Purchasing Organization</span>
                                                    <span className="font-mono text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.purchasing_organization || '1100'}
                                                    </span>
                                                </div>

                                                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3.5">
                                                    <span className="text-[#556b82] text-[11px] block font-medium">Purchasing Group</span>
                                                    <span className="font-mono text-[#1c2d42] mt-0.5 block">
                                                        {currentItem.purchasing_group || '103'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* SECTION 8: Notes & Attachments */}
                                    {(itemDetailViewMode === 'all' || activeItemDetailTab === 'notes') && (
                                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-[#0070f2]">
                                                        <Paperclip className="h-3.5 w-3.5" />
                                                    </div>
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#1c2d42]">
                                                        Notes & Attachments
                                                    </h4>
                                                </div>
                                                <span className="text-[11px] text-[#556b82]">
                                                    Item Texts, PO Notes, Delivery Instructions & Documents
                                                </span>
                                            </div>

                                            {/* Notes Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 space-y-1.5">
                                                    <span className="font-bold text-[#1c2d42] uppercase text-[10px] tracking-wider text-slate-600 block">
                                                        Item Text
                                                    </span>
                                                    <p className="text-slate-700 italic whitespace-pre-wrap min-h-[40px]">
                                                        {currentItem.item_text || <span className="text-slate-400 font-normal">No item text maintained.</span>}
                                                    </p>
                                                </div>

                                                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 space-y-1.5">
                                                    <span className="font-bold text-[#1c2d42] uppercase text-[10px] tracking-wider text-slate-600 block">
                                                        Item Note
                                                    </span>
                                                    <p className="text-slate-700 italic whitespace-pre-wrap min-h-[40px]">
                                                        {currentItem.item_note || <span className="text-slate-400 font-normal">No item note maintained.</span>}
                                                    </p>
                                                </div>

                                                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 space-y-1.5">
                                                    <span className="font-bold text-[#1c2d42] uppercase text-[10px] tracking-wider text-slate-600 block">
                                                        Delivery Instructions
                                                    </span>
                                                    <p className="text-slate-700 italic whitespace-pre-wrap min-h-[40px]">
                                                        {currentItem.delivery_text || <span className="text-slate-400 font-normal">No delivery instructions maintained.</span>}
                                                    </p>
                                                </div>

                                                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 space-y-1.5">
                                                    <span className="font-bold text-[#1c2d42] uppercase text-[10px] tracking-wider text-slate-600 block">
                                                        Material PO Text
                                                    </span>
                                                    <p className="text-slate-700 italic whitespace-pre-wrap min-h-[40px]">
                                                        {currentItem.material_po_text || <span className="text-slate-400 font-normal">No PO text maintained.</span>}
                                                    </p>
                                                </div>

                                                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 space-y-1.5 md:col-span-2">
                                                    <span className="font-bold text-[#1c2d42] uppercase text-[10px] tracking-wider text-slate-600 block">
                                                        Closure Comment
                                                    </span>
                                                    <p className="text-slate-700 italic whitespace-pre-wrap min-h-[40px]">
                                                        {currentItem.closure_comment || <span className="text-slate-400 font-normal">No closure comment maintained.</span>}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Item Attached Document */}
                                            <div className="border-t border-slate-100 pt-3">
                                                <span className="font-bold text-[#1c2d42] uppercase text-[10px] tracking-wider text-slate-600 block mb-2">
                                                    Line Item Attached Documents
                                                </span>

                                                {currentItemAttachments.length > 0 ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                        {currentItemAttachments.map((att) => (
                                                            <div
                                                                key={att.id}
                                                                className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/60 p-2.5 text-xs text-blue-900"
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <Paperclip className="h-3.5 w-3.5 text-[#0070f2] shrink-0" />
                                                                    <div className="min-w-0">
                                                                        <p className="font-semibold truncate max-w-[170px]" title={att.file_name}>
                                                                            {att.file_name}
                                                                        </p>
                                                                        <span className="text-[10px] text-blue-600">
                                                                            Type: {att.attachment_doc_type || 'SL1'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <a
                                                                    href={`/attachments/${att.id}/download`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="shrink-0 ml-2 rounded p-1 text-[#0070f2] hover:bg-white transition-colors"
                                                                    title="Download Attachment"
                                                                >
                                                                    <Download className="h-3.5 w-3.5" />
                                                                </a>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : currentItem.attachment_name ? (
                                                    <div className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2 text-xs text-[#0070f2]">
                                                        <Paperclip className="h-3.5 w-3.5" />
                                                        <span className="font-semibold">{currentItem.attachment_name}</span>
                                                        <span className="text-[10px] text-slate-500">
                                                            ({currentItem.attachment_doc_type || 'SL1'})
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <p className="text-slate-400 italic text-xs">
                                                        No documents attached directly to Item #{currentItem.item_number}.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
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
                                                    {att.item_number && ` • Item: ${att.item_number}`}
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
            {isSuperAdmin && (
                <SapPayloadModal
                    pr={pr as any}
                    isOpen={showPayloadModal}
                    onClose={() => setShowPayloadModal(false)}
                />
            )}

            {/* APL Materials Indent Form (F-2) Print Modal */}
            <PurchaseRequisitionPrintModal
                pr={pr as any}
                isOpen={showPrintModal}
                onClose={() => setShowPrintModal(false)}
            />
        </SapAppLayout>
    );
}
