import React, { useState, useId } from 'react';
import { router } from '@inertiajs/react';
import {
    Save,
    Send,
    ArrowLeft,
    Plus,
    Trash2,
    Copy,
    Calendar,
    Search,
    FileSpreadsheet,
    FileText,
    CheckCircle2,
    AlertCircle,
    Building2,
    DollarSign,
    Package,
    Layers,
    UserCheck,
    Paperclip,
    ExternalLink,
    ChevronDown,
    UploadCloud,
    FileUp,
    Sparkles,
} from 'lucide-react';
import SapSearchHelpModal, { SearchHelpOption } from './SapSearchHelpModal';
import { defaultSapMasterData, SapMasterDataConfig } from './sapMasterData';
import { HeaderOption, PrDocumentType } from '@/types';

export interface PrItemData {
    id: string;
    item_number: string;
    item_type: 'material' | 'service';
    material_type: string;
    item_category: string;
    material_code: string;
    supplier_material_number: string;
    batch: string;
    revision_level: string;
    description: string;
    material_group: string;
    desired_supplier: string;
    quantity: number | string;
    unit_of_measure: string;
    unit_price: number | string;
    price_unit: number;
    currency: string;
    tax_code: string;
    po_price_type: string;
    plant: string;
    storage_location: string;
    account_assignment_category: string;
    requirement_tracking_number: string;
    cost_center: string;
    gl_account: string;
    purchasing_organization: string;
    purchasing_group: string;
    delivery_date: string;
    requisition_date: string;
    release_date: string;
    planned_delivery_time: number;
    gr_processing_time: number;
    item_text: string;
    item_note: string;
    delivery_text: string;
    material_po_text: string;
    closure_comment: string;
    attachment_doc_type: string;
    attachment_name: string;
    source_assigned: boolean;
}

interface PurchaseRequisitionFormProps {
    masterData?: Partial<SapMasterDataConfig>;
    headerOptions?: HeaderOption[];
    prDocumentTypes?: PrDocumentType[];
    isModal?: boolean;
    onCloseModal?: () => void;
}

export default function PurchaseRequisitionForm({
    masterData = {},
    headerOptions = [],
    prDocumentTypes = [],
    isModal = false,
    onCloseModal,
}: PurchaseRequisitionFormProps) {
    const activePrDocTypes = prDocumentTypes && prDocumentTypes.length > 0
        ? prDocumentTypes.filter((dt) => dt.is_active).map((dt) => ({
            code: dt.code,
            name: dt.name,
            extra: dt.description || dt.category || '',
        }))
        : null;

    const dataCatalog: SapMasterDataConfig = {
        ...defaultSapMasterData,
        ...masterData,
        ...(activePrDocTypes ? { documentTypes: activePrDocTypes } : {}),
    };

    const getTodayString = (addDays = 0) => {
        const d = new Date();
        d.setDate(d.getDate() + addDays);
        return d.toISOString().split('T')[0];
    };

    // Header State
    const [description, setDescription] = useState('AMC material and Service Request');
    const [prType, setPrType] = useState('ZCOM');
    const [headerOptionId, setHeaderOptionId] = useState<string>('');
    const [autoSourceDetermination, setAutoSourceDetermination] = useState(false);
    const [headerNote, setHeaderNote] = useState('');
    const [companyCode, setCompanyCode] = useState('1010');
    const [currency, setCurrency] = useState('INR');
    const [requisitioner, setRequisitioner] = useState('Ashish Borgohain (CB9980000006)');

    // Combined header options from props or masterData
    const availableHeaderOptions = (
        headerOptions && headerOptions.length > 0
            ? headerOptions
            : ((masterData as any)?.headerOptions || [])
    ).map((opt: any) => ({
        id: String(opt.id || opt.code),
        name: opt.name || opt.code,
        code: opt.code || '',
        description: opt.description || opt.extra || '',
    }));

    const selectedHeaderOption = availableHeaderOptions.find(
        (opt: any) => String(opt.id) === String(headerOptionId)
    );

    // Active item selection & Item Level Tab
    const [activeItemIndex, setActiveItemIndex] = useState(0);
    const [activeItemTab, setActiveItemTab] = useState<
        | 'general'
        | 'quantity-date'
        | 'valuation'
        | 'account-assignment'
        | 'source-of-supply'
        | 'contact-info'
        | 'notes'
    >('general');
    const [activeNotesSubTab, setActiveNotesSubTab] = useState<
        'item-text' | 'item-note' | 'delivery-text' | 'material-po-text' | 'closure-comment'
    >('material-po-text');

    // Factory function to create an empty PR item line
    const createEmptyPrItem = (
        itemNumberStr: string = '00010',
        type: 'material' | 'service' = 'material'
    ): PrItemData => ({
        id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        item_number: itemNumberStr,
        item_type: type,
        material_type: '',
        item_category: 'Standard',
        material_code: '',
        supplier_material_number: '',
        batch: '',
        revision_level: '',
        description: '',
        material_group: '',
        desired_supplier: '',
        quantity: '',
        unit_of_measure: '',
        unit_price: '',
        price_unit: 1,
        currency: currency,
        tax_code: 'V1',
        po_price_type: 'Do not adopt',
        plant: '',
        storage_location: '',
        account_assignment_category: 'K',
        requirement_tracking_number: '',
        cost_center: '12001101',
        gl_account: type === 'material' ? '40000000' : '52000000',
        purchasing_organization: '1200',
        purchasing_group: '103',
        delivery_date: getTodayString(14),
        requisition_date: getTodayString(0),
        release_date: getTodayString(0),
        planned_delivery_time: 5,
        gr_processing_time: 1,
        item_text: '',
        item_note: '',
        delivery_text: '',
        material_po_text: '',
        closure_comment: '',
        attachment_doc_type: 'SL1',
        attachment_name: '',
        source_assigned: false,
    });

    // Items List - Initialized with an empty material item
    const [items, setItems] = useState<PrItemData[]>([
        createEmptyPrItem('00010', 'material'),
    ]);

    // Submission and UI Feedback
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Search Help Modal State
    const [searchHelpState, setSearchHelpState] = useState<{
        isOpen: boolean;
        title: string;
        options: SearchHelpOption[];
        selectedCode?: string;
        field: keyof PrItemData | 'documentType';
        targetIndex?: number;
        isLoading?: boolean;
    }>({
        isOpen: false,
        title: '',
        options: [],
        field: 'plant',
        targetIndex: 0,
        isLoading: false,
    });

    const [sapMaterialsCache, setSapMaterialsCache] = useState<SearchHelpOption[]>([]);

    const currentItem = items[activeItemIndex] || items[0];

    const openSearchHelp = (
        field: keyof PrItemData | 'documentType',
        title: string,
        options: SearchHelpOption[],
        currentCode?: string,
        targetIndex?: number
    ) => {
        setSearchHelpState({
            isOpen: true,
            title,
            options,
            selectedCode: currentCode || '',
            field,
            targetIndex: targetIndex !== undefined ? targetIndex : activeItemIndex,
            isLoading: false,
        });
    };

    /**
     * Hit SAP S/4HANA Cloud CDS View (YY1_MATERIALS_CDS) API for Materials F4 Search Help.
     * Shows Product (material number), ProductName (description), BaseUnit (UoM) and auto-fills fields.
     */
    const handleOpenMaterialSearchHelp = async (targetIndex: number, currentCode?: string) => {
        setActiveItemIndex(targetIndex);

        if (sapMaterialsCache.length > 0) {
            setSearchHelpState({
                isOpen: true,
                title: 'Select Material - SAP S/4HANA Cloud (CDS: YY1_MATERIALS_CDS)',
                options: sapMaterialsCache,
                selectedCode: currentCode || '',
                field: 'material_code',
                targetIndex,
                isLoading: false,
            });
            return;
        }

        // Open modal immediately with loading state and fallback catalog
        setSearchHelpState({
            isOpen: true,
            title: 'Select Material - SAP S/4HANA Cloud (CDS: YY1_MATERIALS_CDS)',
            options: dataCatalog.materials || [],
            selectedCode: currentCode || '',
            field: 'material_code',
            targetIndex,
            isLoading: true,
        });

        try {
            const res = await fetch('/sap-materials');
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                setSapMaterialsCache(data.items);
                setSearchHelpState((prev) => ({
                    ...prev,
                    options: data.items,
                    isLoading: false,
                }));
            } else {
                setSearchHelpState((prev) => ({
                    ...prev,
                    isLoading: false,
                }));
            }
        } catch (err) {
            console.error('Failed to fetch materials from SAP CDS view:', err);
            setSearchHelpState((prev) => ({
                ...prev,
                isLoading: false,
            }));
        }
    };

    const handleSelectSearchHelp = (opt: SearchHelpOption) => {
        const { field, targetIndex } = searchHelpState;
        const targetIdx = targetIndex !== undefined ? targetIndex : activeItemIndex;

        if (field === 'documentType') {
            setPrType(opt.code);
            return;
        }

        // Special handling when selecting Material: auto-populates Product, ProductName, and Unit of Measure (BaseUnit)!
        if (field === 'material_code') {
            const productCode = opt.Product || opt.code;
            const productName = opt.ProductName || opt.name;
            const uom = opt.BaseUnit || opt.UnitOfMeasure || opt.uom || 'PC';
            const matGroup = opt.ProductGroup || opt.materialGroup || opt.MaterialGroup || 'L001';
            const matType = opt.ProductType || opt.materialType || opt.MaterialType || 'ROH - Raw Materials';
            const unitPrice = (opt.UnitPrice !== undefined && opt.UnitPrice > 0)
                ? opt.UnitPrice
                : ((opt.unitPrice !== undefined && opt.unitPrice > 0) ? opt.unitPrice : undefined);
            const poText = opt.poText || opt.description || '';

            setItems((prev) =>
                prev.map((item, idx) => {
                    if (idx !== targetIdx) return item;
                    return {
                        ...item,
                        material_code: productCode,
                        description: productName,
                        unit_of_measure: uom,
                        material_group: matGroup,
                        material_type: matType,
                        unit_price: unitPrice !== undefined ? unitPrice : item.unit_price,
                        material_po_text: poText || item.material_po_text || '',
                    };
                })
            );
            return;
        }

        // Other fields: plant, item_category, account_assignment_category, material_type, material_group, unit_of_measure, storage_location, cost_center, gl_account, etc.
        setItems((prev) =>
            prev.map((item, idx) => (idx === targetIdx ? { ...item, [field]: opt.code } : item))
        );
    };

    const updateCurrentItem = (updates: Partial<PrItemData>) => {
        setItems((prev) =>
            prev.map((item, idx) => (idx === activeItemIndex ? { ...item, ...updates } : item))
        );
    };

    const updateItemById = (id: string, updates: Partial<PrItemData>) => {
        setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
        );
    };

    const handleAddItem = (type: 'material' | 'service') => {
        const nextNum = (items.length + 1) * 10;
        const itemNumberStr = String(nextNum).padStart(5, '0');
        const newItem = createEmptyPrItem(itemNumberStr, type);

        setItems((prev) => [...prev, newItem]);
        setActiveItemIndex(items.length);
    };

    const handleDuplicateItem = (index: number) => {
        const source = items[index];
        if (!source) return;
        const nextNum = (items.length + 1) * 10;
        const itemNumberStr = String(nextNum).padStart(5, '0');

        const duplicated: PrItemData = {
            ...source,
            id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
            item_number: itemNumberStr,
            description: source.description ? `${source.description} (Copy)` : '',
        };

        setItems([...items, duplicated]);
        setActiveItemIndex(items.length);
    };

    const handleDeleteItem = (index: number) => {
        if (items.length <= 1) {
            setErrorMessage('A Purchase Requisition must contain at least one line item.');
            return;
        }
        const updated = items.filter((_, idx) => idx !== index);
        setItems(updated);
        setActiveItemIndex(Math.max(0, index - 1));
    };

    // Calculate Total Value
    const calculateTotal = () => {
        return items.reduce((sum, item) => {
            const pu = item.price_unit > 0 ? item.price_unit : 1;
            const itemTotal = ((Number(item.quantity) || 0) / pu) * (Number(item.unit_price) || 0);
            return sum + itemTotal;
        }, 0);
    };

    const currentItemTotal = () => {
        if (!currentItem) return 0;
        const pu = currentItem.price_unit > 0 ? currentItem.price_unit : 1;
        return ((Number(currentItem.quantity) || 0) / pu) * (Number(currentItem.unit_price) || 0);
    };

    // Form Submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        // Validation
        if (!prType) {
            setErrorMessage('Document Type is mandatory. Please select an option.');
            return;
        }

        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            if (!it.description.trim()) {
                setErrorMessage(`Item ${it.item_number}: Item Description is mandatory.`);
                setActiveItemIndex(i);
                setActiveItemTab('general');
                return;
            }
            if (!it.plant) {
                setErrorMessage(`Item ${it.item_number}: Plant is mandatory.`);
                setActiveItemIndex(i);
                setActiveItemTab('general');
                return;
            }
            if (!it.material_group) {
                setErrorMessage(`Item ${it.item_number}: Material Group is mandatory.`);
                setActiveItemIndex(i);
                setActiveItemTab('general');
                return;
            }
            if (Number(it.quantity) <= 0) {
                setErrorMessage(`Item ${it.item_number}: Quantity must be greater than 0.`);
                setActiveItemIndex(i);
                setActiveItemTab('quantity-date');
                return;
            }
            if (!it.unit_of_measure) {
                setErrorMessage(`Item ${it.item_number}: Unit of Measure is mandatory.`);
                setActiveItemIndex(i);
                setActiveItemTab('valuation');
                return;
            }
            if (Number(it.unit_price) < 0) {
                setErrorMessage(`Item ${it.item_number}: Valuation Price cannot be negative.`);
                setActiveItemIndex(i);
                setActiveItemTab('valuation');
                return;
            }
            if (!it.purchasing_group) {
                setErrorMessage(`Item ${it.item_number}: Purchasing Group is mandatory.`);
                setActiveItemIndex(i);
                setActiveItemTab('contact-info');
                return;
            }
        }

        setSubmitting(true);

        router.post(
            '/purchase-requisitions',
            {
                description: description.trim() || currentItem.description,
                header_note: headerNote,
                header_option_id: headerOptionId || null,
                pr_type: prType,
                auto_source_determination: autoSourceDetermination,
                company_code: companyCode,
                plant: currentItem.plant,
                currency: currency,
                requisitioner: requisitioner,
                items: items.map((it) => ({
                    item_number: it.item_number,
                    item_type: it.item_type,
                    material_type: it.material_type,
                    item_category: it.item_category,
                    description: it.description,
                    material_code: it.material_code,
                    supplier_material_number: it.supplier_material_number,
                    batch: it.batch,
                    revision_level: it.revision_level,
                    material_group: it.material_group,
                    desired_supplier: it.desired_supplier,
                    quantity: it.quantity,
                    unit_of_measure: it.unit_of_measure,
                    unit_price: it.unit_price,
                    price_unit: it.price_unit,
                    currency: it.currency || currency,
                    tax_code: it.tax_code,
                    po_price_type: it.po_price_type,
                    plant: it.plant,
                    storage_location: it.storage_location,
                    account_assignment_category: it.account_assignment_category,
                    requirement_tracking_number: it.requirement_tracking_number,
                    cost_center: it.cost_center,
                    gl_account: it.gl_account,
                    purchasing_organization: it.purchasing_organization,
                    purchasing_group: it.purchasing_group,
                    delivery_date: it.delivery_date,
                    requisition_date: it.requisition_date,
                    release_date: it.release_date,
                    planned_delivery_time: it.planned_delivery_time,
                    gr_processing_time: it.gr_processing_time,
                    item_text: it.item_text,
                    item_note: it.item_note,
                    delivery_text: it.delivery_text,
                    material_po_text: it.material_po_text,
                    closure_comment: it.closure_comment,
                    attachment_doc_type: it.attachment_doc_type,
                    attachment_name: it.attachment_name,
                })),
            },
            {
                onSuccess: () => {
                    setSubmitting(false);
                    if (isModal && onCloseModal) {
                        onCloseModal();
                    }
                },
                onError: (errors) => {
                    setSubmitting(false);
                    const firstError = Object.values(errors)[0] as string;
                    setErrorMessage(firstError || 'Failed to create Purchase Requisition.');
                },
            }
        );
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Top Toolbar / Application Header */}
            <div className="rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-xs">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            {!isModal && (
                                <button
                                    type="button"
                                    onClick={() => router.visit('/dashboard')}
                                    className="mr-1 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                    title="Back to Dashboard"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </button>
                            )}
                            <h1 className="text-xl font-bold tracking-tight text-[#1c2d42]">
                                New Purchase Requisition
                            </h1>
                            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-[#0070f2]">
                                SAP S/4HANA Cloud (Public Edition)
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-[#556b82]">
                            {description || 'AMC material and Service Request'}
                        </p>
                    </div>

                    {/* Total Value & Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="rounded-lg border border-[#d9e2ec] bg-[#f8fafc] px-3.5 py-1.5 text-right">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#556b82]">
                                Total Value
                            </div>
                            <div className="text-sm font-bold text-[#1c2d42]">
                                {calculateTotal().toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}{' '}
                                <span className="text-xs text-[#0070f2]">{currency}</span>
                            </div>
                        </div>

                        {!isModal ? (
                            <button
                                type="button"
                                onClick={() => router.visit('/dashboard')}
                                className="rounded-md border border-[#d9e2ec] bg-white px-3.5 py-2 text-xs font-semibold text-[#1c2d42] hover:bg-slate-50 transition-colors"
                            >
                                Discard / Cancel
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={onCloseModal}
                                className="rounded-md border border-[#d9e2ec] bg-white px-3.5 py-2 text-xs font-semibold text-[#1c2d42] hover:bg-slate-50 transition-colors"
                            >
                                Close
                            </button>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex items-center gap-2 rounded-md bg-[#0070f2] px-5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#0057c2] active:bg-[#003884] disabled:opacity-50"
                        >
                            <Send className={`h-3.5 w-3.5 ${submitting ? 'animate-spin' : ''}`} />
                            <span>{submitting ? 'Creating Requisition...' : 'Create Purchase Requisition'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Notification Banner */}
            {errorMessage && (
                <div className="flex items-center gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 animate-in fade-in">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span className="font-medium">{errorMessage}</span>
                </div>
            )}

            {/* SECTION: PR HEADER - General Information */}
            <div className="rounded-xl border border-[#d9e2ec] bg-white shadow-xs overflow-hidden">
                <div className="border-b border-[#d9e2ec] bg-[#f8fafc] px-6 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-[#0070f2]">
                            <FileText className="h-3.5 w-3.5" />
                        </div>
                        <h2 className="text-sm font-bold text-[#1c2d42]">Header: General Information</h2>
                    </div>
                    <span className="text-[11px] text-[#556b82]">PR Header Level Properties</span>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Purchase Requisition Description */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-semibold text-[#1c2d42]">
                                    Purchase Requisition Description
                                </label>
                            </div>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="e.g. AMC material and Service Request"
                                className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                            />
                        </div>

                        {/* Document Type */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-semibold text-[#1c2d42]">
                                    Document Type <span className="text-rose-500">*</span>
                                </label>
                                <span className="text-[10px] text-rose-600 font-medium"></span>
                            </div>
                            <select
                                value={prType}
                                onChange={(e) => setPrType(e.target.value)}
                                className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none bg-white"
                                required
                            >
                                {dataCatalog.documentTypes.map((dt) => (
                                    <option key={dt.code} value={dt.code}>
                                        {dt.name}
                                    </option>
                                ))}
                            </select>
                            {(() => {
                                const activeDocType = dataCatalog.documentTypes.find((dt) => dt.code === prType);
                                return activeDocType?.extra ? (
                                    <span className="mt-1 block text-[10px] text-[#0070f2] font-medium line-clamp-1">
                                        {activeDocType.extra}
                                    </span>
                                ) : (
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        Have to select the appropriate dropdown
                                    </span>
                                );
                            })()}
                        </div>

                        {/* Header Option */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-semibold text-[#1c2d42]">
                                    Header Option
                                </label>
                                <span className="text-[10px] text-[#0070f2] font-semibold">
                                    Master Data
                                </span>
                            </div>
                            <select
                                value={headerOptionId}
                                onChange={(e) => setHeaderOptionId(e.target.value)}
                                className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none bg-white transition-colors"
                            >
                                <option value="">-- Select Header Option --</option>
                                {availableHeaderOptions.map((opt: any) => (
                                    <option key={opt.id} value={opt.id}>
                                        {opt.name} {opt.code ? `(${opt.code})` : ''}
                                    </option>
                                ))}
                            </select>
                            <span className="mt-1 block text-[10px] text-[#556b82]">
                                Configured by Superadmin
                            </span>
                        </div>
                    </div>

                    {selectedHeaderOption && (
                        <div className="mt-3 rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50/70 to-slate-50 p-2.5 text-xs text-[#1c2d42] flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <span className="rounded bg-[#0070f2] text-white px-1.5 py-0.5 text-[10px] font-bold">
                                    {selectedHeaderOption.code || 'OPTION'}
                                </span>
                                <span className="font-semibold text-xs text-[#1c2d42]">{selectedHeaderOption.name}</span>
                                {selectedHeaderOption.description && (
                                    <span className="text-[11px] text-[#556b82] hidden sm:inline">
                                        — {selectedHeaderOption.description}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] text-[#0070f2] font-medium whitespace-nowrap bg-white px-2 py-0.5 rounded border border-blue-200">
                                Active Header Option
                            </span>
                        </div>
                    )}

                    {/* Automatic Source Determination Checkbox */}
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoSourceDetermination}
                                onChange={(e) => setAutoSourceDetermination(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-[#0070f2] focus:ring-[#0070f2]"
                            />
                            <span className="text-xs font-medium text-[#1c2d42]">
                                Automatic Source Determination
                            </span>
                        </label>
                        <span className="text-[11px] text-[#556b82]">
                            
                        </span>
                    </div>
                </div>
            </div>

            {/* SECTION: PR HEADER - Notes */}
            <div className="rounded-xl border border-[#d9e2ec] bg-white shadow-xs overflow-hidden">
                <div className="border-b border-[#d9e2ec] bg-[#f8fafc] px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-800">
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                        </div>
                        <h2 className="text-sm font-bold text-[#1c2d42]">Header: Notes</h2>
                    </div>
                    <span className="text-[11px] text-[#556b82]">Header Note</span>
                </div>

                <div className="p-6">
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-[#1c2d42]">
                            Header Note
                        </label>
                        <span className="text-[10px] text-[#556b82]"></span>
                    </div>
                    <textarea
                        rows={3}
                        value={headerNote}
                        onChange={(e) => setHeaderNote(e.target.value)}
                        placeholder="Type any high-level approval justification, procurement instructions, or work-related notes here..."
                        className="w-full rounded-md border border-[#d9e2ec] p-3 text-xs text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                    />
                </div>
            </div>

            {/* SECTION: ITEMS (Header Text: "Items") */}
            <div className="rounded-xl border border-[#d9e2ec] bg-white shadow-xs overflow-hidden">
                {/* Items Toolbar */}
                <div className="border-b border-[#d9e2ec] bg-[#f8fafc] px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0070f2] text-white">
                            <Package className="h-3.5 w-3.5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-bold text-[#1c2d42]">Line Items</h2>
                                <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-[#0070f2]">
                                    F4 Search Help
                                </span>
                            </div>
                            <p className="text-[11px] text-[#556b82]">
                                Click [🔍] or press F4 in any field for SAP master data lookup
                            </p>
                        </div>
                    </div>

                    {/* Action buttons: Create Dropdown, Copy, Delete */}
                    <div className="flex items-center gap-2">
                        {/* Create Dropdown (Material / Service) */}
                        <div className="relative inline-block text-left">
                            <div className="inline-flex rounded-md shadow-xs">
                                <button
                                    type="button"
                                    onClick={() => handleAddItem('material')}
                                    className="flex items-center gap-1.5 rounded-l-md bg-[#0070f2] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0057c2] transition-colors"
                                    title="Add new empty material line item"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>Material</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAddItem('service')}
                                    className="flex items-center gap-1 rounded-r-md border-l border-blue-400 bg-[#0070f2] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0057c2] transition-colors"
                                    title="Add new empty service requisition item"
                                >
                                    <span>+ Service</span>
                                </button>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => handleDuplicateItem(activeItemIndex)}
                            className="flex items-center gap-1 rounded-md border border-[#d9e2ec] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1c2d42] hover:bg-slate-50 transition-colors"
                            title="Copy selected item"
                        >
                            <Copy className="h-3.5 w-3.5 text-[#556b82]" />
                            <span>Copy</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleDeleteItem(activeItemIndex)}
                            disabled={items.length <= 1}
                            className="flex items-center gap-1 rounded-md border border-[#d9e2ec] bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-40"
                            title="Delete selected item"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                        </button>
                    </div>
                </div>

                {/* Items Table with Vertical Scroll (shows up to 4 items, scrollable for more) */}
                <div className="overflow-x-auto overflow-y-auto max-h-[238px] divide-y divide-slate-100">
                    <table className="w-full text-left text-xs text-[#1c2d42] min-w-[1260px] border-collapse">
                        <thead className="sticky top-0 z-10 bg-[#f8fafc] text-[11px] font-semibold text-[#556b82] border-b border-slate-200 shadow-[0_1px_0_0_#e2e8f0]">
                            <tr>
                                <th className="py-2.5 px-3 w-20 bg-[#f8fafc]">Item</th>
                                <th className="py-2.5 px-2.5 w-36 bg-[#f8fafc]">
                                    <span className="flex items-center gap-1">
                                        Material No.
                                        <span className="text-[9px] font-bold text-[#0070f2] bg-blue-50 border border-blue-200 px-1 py-0.2 rounded">F4</span>
                                    </span>
                                </th>
                                <th className="py-2.5 px-2.5 min-w-[160px] bg-[#f8fafc]">Description</th>
                                <th className="py-2.5 px-2.5 w-28 bg-[#f8fafc]">
                                    <span className="flex items-center gap-1">
                                        Plant
                                        <span className="text-[9px] font-bold text-[#0070f2] bg-blue-50 border border-blue-200 px-1 py-0.2 rounded">F4</span>
                                    </span>
                                </th>
                                <th className="py-2.5 px-2.5 w-28 bg-[#f8fafc]">
                                    <span className="flex items-center gap-1">
                                        Item Cat.
                                        <span className="text-[9px] font-bold text-[#0070f2] bg-blue-50 border border-blue-200 px-1 py-0.2 rounded">F4</span>
                                    </span>
                                </th>
                                <th className="py-2.5 px-2.5 w-24 bg-[#f8fafc]">
                                    <span className="flex items-center gap-1">
                                        Acct. Assign.
                                        <span className="text-[9px] font-bold text-[#0070f2] bg-blue-50 border border-blue-200 px-1 py-0.2 rounded">F4</span>
                                    </span>
                                </th>
                                <th className="py-2.5 px-2.5 w-28 bg-[#f8fafc]">
                                    <span className="flex items-center gap-1">
                                        Mat. Type
                                        <span className="text-[9px] font-bold text-[#0070f2] bg-blue-50 border border-blue-200 px-1 py-0.2 rounded">F4</span>
                                    </span>
                                </th>
                                <th className="py-2.5 px-2.5 w-24 bg-[#f8fafc]">
                                    <span className="flex items-center gap-1">
                                        Mat. Group
                                        <span className="text-[9px] font-bold text-[#0070f2] bg-blue-50 border border-blue-200 px-1 py-0.2 rounded">F4</span>
                                    </span>
                                </th>
                                <th className="py-2.5 px-2.5 w-32 text-right bg-[#f8fafc]">
                                    <span className="flex items-center justify-end gap-1">
                                        Quantity & UoM
                                        <span className="text-[9px] font-bold text-[#0070f2] bg-blue-50 border border-blue-200 px-1 py-0.2 rounded">F4</span>
                                    </span>
                                </th>
                                <th className="py-2.5 px-2.5 w-28 text-right bg-[#f8fafc]">Valuation Price</th>
                                <th className="py-2.5 px-2.5 w-28 text-right bg-[#f8fafc]">Total Value</th>
                                <th className="py-2.5 px-2 w-12 text-center bg-[#f8fafc]">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((it, idx) => {
                                const isSelected = idx === activeItemIndex;
                                const pu = it.price_unit > 0 ? it.price_unit : 1;
                                const lineTotal = ((Number(it.quantity) || 0) / pu) * (Number(it.unit_price) || 0);

                                return (
                                    <tr
                                        key={it.id}
                                        onClick={() => setActiveItemIndex(idx)}
                                        className={`transition-colors cursor-pointer ${
                                            isSelected
                                                ? 'bg-blue-50/60 font-medium'
                                                : 'hover:bg-slate-50/70'
                                        }`}
                                    >
                                        <td className="py-2 px-3 font-mono font-bold text-[#0070f2]">
                                            <div className="flex items-center gap-1.5">
                                                {isSelected && (
                                                    <span className="h-2 w-2 rounded-full bg-[#0070f2] shrink-0" title="Selected item" />
                                                )}
                                                <span>{it.item_number}</span>
                                            </div>
                                        </td>
                                        {/* Material Number with F4 Search Help */}
                                        <td className="py-2 px-2.5">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="text"
                                                    value={it.material_code || ''}
                                                    onFocus={() => setActiveItemIndex(idx)}
                                                    onClick={() => handleOpenMaterialSearchHelp(idx, it.material_code)}
                                                    onChange={(e) => updateItemById(it.id, { material_code: e.target.value })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'F4') {
                                                            e.preventDefault();
                                                            handleOpenMaterialSearchHelp(idx, it.material_code);
                                                        }
                                                    }}
                                                    placeholder="Material # (F4)"
                                                    className="h-8 w-full rounded border border-[#d9e2ec] bg-white pr-7 pl-2 text-xs font-mono text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none cursor-pointer"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveItemIndex(idx);
                                                        handleOpenMaterialSearchHelp(idx, it.material_code);
                                                    }}
                                                    className="absolute right-1 text-[#0070f2] hover:bg-blue-100 p-0.5 rounded transition-colors"
                                                    title="Material Search Help (F4) - Hits SAP CDS View YY1_MATERIALS_CDS"
                                                >
                                                    <Search className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </td>
                                        {/* Description */}
                                        <td className="py-2 px-2.5">
                                            <input
                                                type="text"
                                                value={it.description || ''}
                                                onFocus={() => setActiveItemIndex(idx)}
                                                onChange={(e) => updateItemById(it.id, { description: e.target.value })}
                                                placeholder="Material or Service Description"
                                                className="h-8 w-full rounded border border-[#d9e2ec] bg-white px-2 text-xs text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                            />
                                        </td>
                                        {/* Plant with F4 */}
                                        <td className="py-2 px-2.5">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="text"
                                                    value={it.plant || ''}
                                                    onFocus={() => setActiveItemIndex(idx)}
                                                    onChange={(e) => updateItemById(it.id, { plant: e.target.value })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'F4') {
                                                            e.preventDefault();
                                                            openSearchHelp(
                                                                'plant',
                                                                'Select Plant (Search Help)',
                                                                dataCatalog.plants,
                                                                it.plant,
                                                                idx
                                                            );
                                                        }
                                                    }}
                                                    placeholder="Plant"
                                                    className="h-8 w-full rounded border border-[#d9e2ec] bg-white pr-7 pl-2 text-xs font-mono text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveItemIndex(idx);
                                                        openSearchHelp(
                                                            'plant',
                                                            'Select Plant (Search Help)',
                                                            dataCatalog.plants,
                                                            it.plant,
                                                            idx
                                                        );
                                                    }}
                                                    className="absolute right-1 text-[#0070f2] hover:bg-blue-100 p-0.5 rounded transition-colors"
                                                    title="Plant Search Help (F4)"
                                                >
                                                    <Search className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </td>
                                        {/* Item Category with F4 */}
                                        <td className="py-2 px-2.5">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="text"
                                                    value={it.item_category || ''}
                                                    onFocus={() => setActiveItemIndex(idx)}
                                                    onChange={(e) => updateItemById(it.id, { item_category: e.target.value })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'F4') {
                                                            e.preventDefault();
                                                            openSearchHelp(
                                                                'item_category',
                                                                'Select Item Category (Search Help)',
                                                                dataCatalog.itemCategories,
                                                                it.item_category,
                                                                idx
                                                            );
                                                        }
                                                    }}
                                                    placeholder="Standard"
                                                    className="h-8 w-full rounded border border-[#d9e2ec] bg-white pr-7 pl-2 text-xs font-mono text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveItemIndex(idx);
                                                        openSearchHelp(
                                                            'item_category',
                                                            'Select Item Category (Search Help)',
                                                            dataCatalog.itemCategories,
                                                            it.item_category,
                                                            idx
                                                        );
                                                    }}
                                                    className="absolute right-1 text-[#0070f2] hover:bg-blue-100 p-0.5 rounded transition-colors"
                                                    title="Item Category Search Help (F4)"
                                                >
                                                    <Search className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </td>
                                        {/* Account Assignment Category with F4 */}
                                        <td className="py-2 px-2.5">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="text"
                                                    value={it.account_assignment_category || ''}
                                                    onFocus={() => setActiveItemIndex(idx)}
                                                    onChange={(e) => updateItemById(it.id, { account_assignment_category: e.target.value })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'F4') {
                                                            e.preventDefault();
                                                            openSearchHelp(
                                                                'account_assignment_category',
                                                                'Select Account Assignment Category',
                                                                dataCatalog.accountAssignmentCategories,
                                                                it.account_assignment_category,
                                                                idx
                                                            );
                                                        }
                                                    }}
                                                    placeholder="K"
                                                    className="h-8 w-full rounded border border-[#d9e2ec] bg-white pr-7 pl-2 text-xs font-mono text-center text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveItemIndex(idx);
                                                        openSearchHelp(
                                                            'account_assignment_category',
                                                            'Select Account Assignment Category',
                                                            dataCatalog.accountAssignmentCategories,
                                                            it.account_assignment_category,
                                                            idx
                                                        );
                                                    }}
                                                    className="absolute right-1 text-[#0070f2] hover:bg-blue-100 p-0.5 rounded transition-colors"
                                                    title="Account Assignment Search Help (F4)"
                                                >
                                                    <Search className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </td>
                                        {/* Material Type with F4 */}
                                        <td className="py-2 px-2.5">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="text"
                                                    value={it.material_type || ''}
                                                    onFocus={() => setActiveItemIndex(idx)}
                                                    onChange={(e) => updateItemById(it.id, { material_type: e.target.value })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'F4') {
                                                            e.preventDefault();
                                                            openSearchHelp(
                                                                'material_type',
                                                                'Select Material Type (Search Help)',
                                                                dataCatalog.materialTypes,
                                                                it.material_type,
                                                                idx
                                                            );
                                                        }
                                                    }}
                                                    placeholder="ROH"
                                                    className="h-8 w-full rounded border border-[#d9e2ec] bg-white pr-7 pl-2 text-xs font-mono text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveItemIndex(idx);
                                                        openSearchHelp(
                                                            'material_type',
                                                            'Select Material Type (Search Help)',
                                                            dataCatalog.materialTypes,
                                                            it.material_type,
                                                            idx
                                                        );
                                                    }}
                                                    className="absolute right-1 text-[#0070f2] hover:bg-blue-100 p-0.5 rounded transition-colors"
                                                    title="Material Type Search Help (F4)"
                                                >
                                                    <Search className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </td>
                                        {/* Material Group with F4 */}
                                        <td className="py-2 px-2.5">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="text"
                                                    value={it.material_group || ''}
                                                    onFocus={() => setActiveItemIndex(idx)}
                                                    onChange={(e) => updateItemById(it.id, { material_group: e.target.value })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'F4') {
                                                            e.preventDefault();
                                                            openSearchHelp(
                                                                'material_group',
                                                                'Select Material Group (Search Help)',
                                                                dataCatalog.materialGroups,
                                                                it.material_group,
                                                                idx
                                                            );
                                                        }
                                                    }}
                                                    placeholder="L002"
                                                    className="h-8 w-full rounded border border-[#d9e2ec] bg-white pr-7 pl-2 text-xs font-mono text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveItemIndex(idx);
                                                        openSearchHelp(
                                                            'material_group',
                                                            'Select Material Group (Search Help)',
                                                            dataCatalog.materialGroups,
                                                            it.material_group,
                                                            idx
                                                        );
                                                    }}
                                                    className="absolute right-1 text-[#0070f2] hover:bg-blue-100 p-0.5 rounded transition-colors"
                                                    title="Material Group Search Help (F4)"
                                                >
                                                    <Search className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </td>
                                        {/* Quantity & Unit of Measure with F4 */}
                                        <td className="py-2 px-2.5">
                                            <div className="flex items-center gap-1 justify-end">
                                                <input
                                                    type="number"
                                                    value={it.quantity}
                                                    onFocus={() => setActiveItemIndex(idx)}
                                                    onChange={(e) => updateItemById(it.id, { quantity: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                                                    placeholder="Qty"
                                                    className="h-8 w-14 rounded border border-[#d9e2ec] bg-white px-1.5 text-xs text-right font-mono text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                                />
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="text"
                                                        value={it.unit_of_measure || ''}
                                                        onFocus={() => setActiveItemIndex(idx)}
                                                        onChange={(e) => updateItemById(it.id, { unit_of_measure: e.target.value })}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'F4') {
                                                                e.preventDefault();
                                                                openSearchHelp(
                                                                    'unit_of_measure',
                                                                    'Select Unit of Measure',
                                                                    dataCatalog.unitsOfMeasure,
                                                                    it.unit_of_measure,
                                                                    idx
                                                                );
                                                            }
                                                        }}
                                                        placeholder="UoM"
                                                        className="h-8 w-16 rounded border border-[#d9e2ec] bg-white pr-5 pl-1.5 text-xs font-mono uppercase text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveItemIndex(idx);
                                                            openSearchHelp(
                                                                'unit_of_measure',
                                                                'Select Unit of Measure',
                                                                dataCatalog.unitsOfMeasure,
                                                                it.unit_of_measure,
                                                                idx
                                                            );
                                                        }}
                                                        className="absolute right-0.5 text-[#0070f2] hover:bg-blue-100 p-0.5 rounded transition-colors"
                                                        title="UoM Search Help (F4)"
                                                    >
                                                        <Search className="h-2.5 w-2.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                        {/* Valuation Price */}
                                        <td className="py-2 px-2.5">
                                            <div className="flex items-center gap-1 justify-end">
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={it.unit_price}
                                                    onFocus={() => setActiveItemIndex(idx)}
                                                    onChange={(e) => updateItemById(it.id, { unit_price: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                                                    placeholder="0.00"
                                                    className="h-8 w-18 rounded border border-[#d9e2ec] bg-white px-1.5 text-xs text-right font-mono font-medium text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                                />
                                                <span className="text-[10px] font-semibold text-[#556b82]">{it.currency || currency}</span>
                                            </div>
                                        </td>
                                        {/* Total Value */}
                                        <td className="py-2 px-2.5 text-right font-bold font-mono text-[#1c2d42]">
                                            {lineTotal.toFixed(2)}
                                        </td>
                                        {/* Action / Delete */}
                                        <td className="py-2 px-2 text-center">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteItem(idx);
                                                }}
                                                disabled={items.length <= 1}
                                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors disabled:opacity-30 disabled:hover:text-slate-400"
                                                title="Delete this line item"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Line Items Summary Footer */}
                <div className="border-t border-[#d9e2ec] bg-[#f8fafc] px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#556b82]">
                    <div className="flex items-center gap-2">
                        <span>Line Items:</span>
                        <strong className="text-[#1c2d42] font-semibold">{items.length}</strong>
                        {items.length > 4 && (
                            <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-medium text-[#0070f2]">
                                4 visible &bull; scroll for more
                            </span>
                        )}
                        <span className="text-slate-300">|</span>
                        <span>Total PR Value:</span>
                        <strong className="text-[#0070f2] font-semibold">
                            {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                        </strong>
                    </div>
                    <span className="text-[11px] text-[#556b82]">
                        Use the Material Selector below to view and edit details for each item
                    </span>
                </div>
            </div>

            {/* SECTION: ITEM DETAILS - TABS ORGANIZED ACCORDING TO EXCEL HEADER TEXT */}
            <div className="rounded-xl border border-[#d9e2ec] bg-white shadow-xs overflow-hidden">
                {/* Material Dropdown Option for Item Details */}
                <div className="border-b border-[#d9e2ec] bg-gradient-to-r from-[#f8fafc] via-blue-50/40 to-[#f8fafc] px-6 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0070f2] text-white shadow-xs">
                            <Layers className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1c2d42]">
                                    Item Details & Specifications
                                </h3>
                                <span className="rounded-full bg-blue-100 text-[#0070f2] px-2 py-0.5 text-[10px] font-bold">
                                    Item {currentItem?.item_number}
                                </span>
                            </div>
                            <p className="text-[11px] text-[#556b82]">
                                View and edit General Information, Quantity and Date, Valuation, and Account Assignment
                            </p>
                        </div>
                    </div>

                    {/* Material Item Selector Dropdown */}
                    <div className="flex items-center gap-2.5 w-full md:w-auto">
                        <label htmlFor="material-item-select" className="text-xs font-bold text-[#1c2d42] whitespace-nowrap">
                            Select Item / Material:
                        </label>
                        <div className="relative min-w-[280px] sm:min-w-[340px] max-w-md w-full">
                            <select
                                id="material-item-select"
                                value={activeItemIndex}
                                onChange={(e) => setActiveItemIndex(Number(e.target.value))}
                                className="h-9 w-full appearance-none rounded-lg border border-[#0070f2]/40 bg-white pr-9 pl-3 text-xs font-semibold text-[#1c2d42] shadow-xs hover:border-[#0070f2] focus:border-[#0070f2] focus:ring-2 focus:ring-[#0070f2]/20 focus:outline-none transition-colors"
                            >
                                {items.map((it, idx) => {
                                    const codePart = it.material_code ? `[${it.material_code}] ` : '';
                                    const descPart = it.description || (it.item_type === 'material' ? '(New Empty Material)' : '(New Service Item)');
                                    const label = `Item ${it.item_number}: ${codePart}${descPart}`;
                                    return (
                                        <option key={it.id || idx} value={idx}>
                                            {label}
                                        </option>
                                    );
                                })}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0070f2]" />
                        </div>
                    </div>
                </div>
                {/* Item Tabs Navigation */}
                <div className="border-b border-[#d9e2ec] bg-[#f8fafc] px-4 overflow-x-auto no-scrollbar">
                    <nav className="flex space-x-2 py-1">
                        {[
                            { id: 'general', label: 'General Information' },
                            { id: 'quantity-date', label: 'Quantity and Date' },
                            { id: 'valuation', label: 'Valuation' },
                            { id: 'account-assignment', label: 'Account Assignment' },
                            { id: 'source-of-supply', label: 'Source of Supply' },
                            { id: 'contact-info', label: 'Contact Information' },
                            { id: 'notes', label: 'Notes & Attachments' },
                        ].map((tab) => {
                            const isActive = activeItemTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveItemTab(tab.id as any)}
                                    className={`border-b-2 px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                                        isActive
                                            ? 'border-[#0070f2] text-[#0070f2]'
                                            : 'border-transparent text-[#556b82] hover:border-slate-300 hover:text-[#1c2d42]'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="p-6">
                    {/* TAB 1: General Information (Item Level) */}
                    {activeItemTab === 'general' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#556b82]">
                                    General Information (Item {currentItem?.item_number})
                                </h3>
                                <span className="text-[11px] text-[#0070f2] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                                    SAP F4 Search Help Available
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {/* Product Type Group */}
                                <div>
                                    <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                        Product Type Group
                                    </label>
                                    <div className="h-9 w-full rounded-md border border-[#d9e2ec] bg-slate-50 px-3 flex items-center text-xs font-medium text-[#1c2d42]">
                                        {currentItem?.item_type === 'material' ? 'Material (1)' : 'Service (2)'}
                                    </div>
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        Product classification category
                                    </span>
                                </div>

                                {/* Material Number (Search help) - Auto-populates all Material info! */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Material Number (F4)
                                        </label>
                                        <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                            Auto-populates fields
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={currentItem?.material_code || ''}
                                            onClick={() => handleOpenMaterialSearchHelp(activeItemIndex, currentItem?.material_code)}
                                            onChange={(e) => updateCurrentItem({ material_code: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === 'F4') {
                                                    e.preventDefault();
                                                    handleOpenMaterialSearchHelp(activeItemIndex, currentItem?.material_code);
                                                }
                                            }}
                                            placeholder="10000001 (Click or press F4 for Search Help)"
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none cursor-pointer"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleOpenMaterialSearchHelp(activeItemIndex, currentItem?.material_code)}
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                            title="Select Material - F4 Search Help (Hits SAP CDS View YY1_MATERIALS_CDS)"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        Selecting a material auto-fills Type, Group, UoM & Price
                                    </span>
                                </div>

                                {/* Material Type (Search help) */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Material Type (F4)
                                        </label>
                                        <span className="text-[10px] text-[#556b82]">Optional</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={currentItem?.material_type || ''}
                                            onChange={(e) => updateCurrentItem({ material_type: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === 'F4') {
                                                    e.preventDefault();
                                                    openSearchHelp(
                                                        'material_type',
                                                        'Select Material Type (Search Help)',
                                                        dataCatalog.materialTypes,
                                                        currentItem?.material_type,
                                                        activeItemIndex
                                                    );
                                                }
                                            }}
                                            placeholder="ROH - Raw Materials"
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openSearchHelp(
                                                    'material_type',
                                                    'Select Material Type (Search Help)',
                                                    dataCatalog.materialTypes,
                                                    currentItem?.material_type,
                                                    activeItemIndex
                                                )
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                            title="Select Material Type (F4)"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        Material Type (ROH, ERSA, HIBE, etc.)
                                    </span>
                                </div>

                                {/* Plant * (Search help) */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Plant <span className="text-rose-500">*</span> (F4)
                                        </label>
                                        <span className="text-[10px] text-rose-600 font-medium"></span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={currentItem?.plant || ''}
                                            onChange={(e) => updateCurrentItem({ plant: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === 'F4') {
                                                    e.preventDefault();
                                                    openSearchHelp(
                                                        'plant',
                                                        'Select Plant (Search Help)',
                                                        dataCatalog.plants,
                                                        currentItem?.plant,
                                                        activeItemIndex
                                                    );
                                                }
                                            }}
                                            placeholder="1200"
                                            required
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openSearchHelp(
                                                    'plant',
                                                    'Select Plant (Search Help)',
                                                    dataCatalog.plants,
                                                    currentItem?.plant,
                                                    activeItemIndex
                                                )
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                            title="Plant information (Search Help - F4)"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        Receiving manufacturing or warehouse plant
                                    </span>
                                </div>

                                {/* Item Category (Search help) */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Item Category (F4)
                                        </label>
                                        <span className="text-[10px] text-[#556b82]">Standard / Consignment</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={currentItem?.item_category || ''}
                                            onChange={(e) => updateCurrentItem({ item_category: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === 'F4') {
                                                    e.preventDefault();
                                                    openSearchHelp(
                                                        'item_category',
                                                        'Select Item Category (Search Help)',
                                                        dataCatalog.itemCategories,
                                                        currentItem?.item_category,
                                                        activeItemIndex
                                                    );
                                                }
                                            }}
                                            placeholder="Standard"
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openSearchHelp(
                                                    'item_category',
                                                    'Select Item Category (Search Help)',
                                                    dataCatalog.itemCategories,
                                                    currentItem?.item_category,
                                                    activeItemIndex
                                                )
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                            title="Item Category (Search Help - F4)"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        Procurement mechanism (Standard, Consignment, Subcontracting...)
                                    </span>
                                </div>

                                {/* Account Assignment Category (Search help) */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Account Assignment Category (F4)
                                        </label>
                                        <span className="text-[10px] text-[#556b82]">Cost Center / Project</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={currentItem?.account_assignment_category || ''}
                                            onChange={(e) =>
                                                updateCurrentItem({ account_assignment_category: e.target.value })
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === 'F4') {
                                                    e.preventDefault();
                                                    openSearchHelp(
                                                        'account_assignment_category',
                                                        'Select Account Assignment Category',
                                                        dataCatalog.accountAssignmentCategories,
                                                        currentItem?.account_assignment_category,
                                                        activeItemIndex
                                                    );
                                                }
                                            }}
                                            placeholder="K"
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openSearchHelp(
                                                    'account_assignment_category',
                                                    'Select Account Assignment Category',
                                                    dataCatalog.accountAssignmentCategories,
                                                    currentItem?.account_assignment_category,
                                                    activeItemIndex
                                                )
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                            title="Account Assignment Category (Search Help - F4)"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        Accounting control (K - Cost Center, P - Project WBS...)
                                    </span>
                                </div>

                                {/* Item Description * (Input) */}
                                <div className="md:col-span-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Item Description <span className="text-rose-500">*</span>
                                        </label>
                                        <span className="text-[10px] text-rose-600 font-medium"></span>
                                    </div>
                                    <input
                                        type="text"
                                        value={currentItem?.description || ''}
                                        onChange={(e) => updateCurrentItem({ description: e.target.value })}
                                        placeholder="Material/ Service Detail description"
                                        required
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                    />
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        Material / Service Detail description
                                    </span>
                                </div>

                                {/* Material Group * (Search help) */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Material Group <span className="text-rose-500">*</span> (F4)
                                        </label>
                                        <span className="text-[10px] text-rose-600 font-medium"></span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={currentItem?.material_group || ''}
                                            onChange={(e) => updateCurrentItem({ material_group: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === 'F4') {
                                                    e.preventDefault();
                                                    openSearchHelp(
                                                        'material_group',
                                                        'Select Material Group (Search Help)',
                                                        dataCatalog.materialGroups,
                                                        currentItem?.material_group,
                                                        activeItemIndex
                                                    );
                                                }
                                            }}
                                            placeholder="L002"
                                            required
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openSearchHelp(
                                                    'material_group',
                                                    'Select Material Group (Search Help)',
                                                    dataCatalog.materialGroups,
                                                    currentItem?.material_group,
                                                    activeItemIndex
                                                )
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                            title="Material Group (Search Help - F4)"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        SAP Material Group code for purchasing spend analysis
                                    </span>
                                </div>

                                {/* Storage Location (Search help) */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Storage Location (F4)
                                        </label>
                                        <span className="text-[10px] text-[#556b82]">Plant dependent</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={currentItem?.storage_location || ''}
                                            onChange={(e) => updateCurrentItem({ storage_location: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === 'F4') {
                                                    e.preventDefault();
                                                    openSearchHelp(
                                                        'storage_location',
                                                        'Select Storage Location (Search Help)',
                                                        dataCatalog.storageLocations,
                                                        currentItem?.storage_location,
                                                        activeItemIndex
                                                    );
                                                }
                                            }}
                                            placeholder="101A"
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openSearchHelp(
                                                    'storage_location',
                                                    'Select Storage Location (Search Help)',
                                                    dataCatalog.storageLocations,
                                                    currentItem?.storage_location,
                                                    activeItemIndex
                                                )
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                            title="Storage Location (Search Help - F4)"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        Warehouse/bin location in plant
                                    </span>
                                </div>

                                {/* Desired Supplier (Search help) */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Desired Supplier (F4)
                                        </label>
                                        <span className="text-[10px] text-[#556b82]">Optional</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={currentItem?.desired_supplier || ''}
                                            onChange={(e) => updateCurrentItem({ desired_supplier: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === 'F4') {
                                                    e.preventDefault();
                                                    openSearchHelp(
                                                        'desired_supplier',
                                                        'Select Desired Supplier (Search Help)',
                                                        dataCatalog.desiredSuppliers,
                                                        currentItem?.desired_supplier,
                                                        activeItemIndex
                                                    );
                                                }
                                            }}
                                            placeholder="V-10029"
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openSearchHelp(
                                                    'desired_supplier',
                                                    'Select Desired Supplier (Search Help)',
                                                    dataCatalog.desiredSuppliers,
                                                    currentItem?.desired_supplier,
                                                    activeItemIndex
                                                )
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                            title="Desired Supplier (Search Help - F4)"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        Vendor suggestion from requesting user department
                                    </span>
                                </div>

                                {/* Supplier Material Number (Input) */}
                                <div>
                                    <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                        Supplier Material Number
                                    </label>
                                    <input
                                        type="text"
                                        value={currentItem?.supplier_material_number || ''}
                                        onChange={(e) =>
                                            updateCurrentItem({ supplier_material_number: e.target.value })
                                        }
                                        placeholder="Vendor part # or spec"
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                    />
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        Vendor internal product catalog code
                                    </span>
                                </div>

                                {/* Batch (Search help) */}
                                <div>
                                    <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                        Batch (F4)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={currentItem?.batch || ''}
                                            onChange={(e) => updateCurrentItem({ batch: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === 'F4') {
                                                    e.preventDefault();
                                                    openSearchHelp(
                                                        'batch',
                                                        'Select Batch (Search Help)',
                                                        dataCatalog.batches,
                                                        currentItem?.batch,
                                                        activeItemIndex
                                                    );
                                                }
                                            }}
                                            placeholder="BATCH-2026-A1"
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openSearchHelp(
                                                    'batch',
                                                    'Select Batch (Search Help)',
                                                    dataCatalog.batches,
                                                    currentItem?.batch,
                                                    activeItemIndex
                                                )
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                            title="Batch (Search Help - F4)"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        Batch identification number
                                    </span>
                                </div>

                                {/* Revision Level (Search help) */}
                                <div>
                                    <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                        Revision Level (F4)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={currentItem?.revision_level || ''}
                                            onChange={(e) => updateCurrentItem({ revision_level: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === 'F4') {
                                                    e.preventDefault();
                                                    openSearchHelp(
                                                        'revision_level',
                                                        'Select Revision Level (Search Help)',
                                                        dataCatalog.revisionLevels,
                                                        currentItem?.revision_level,
                                                        activeItemIndex
                                                    );
                                                }
                                            }}
                                            placeholder="01"
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openSearchHelp(
                                                    'revision_level',
                                                    'Select Revision Level (Search Help)',
                                                    dataCatalog.revisionLevels,
                                                    currentItem?.revision_level,
                                                    activeItemIndex
                                                )
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                            title="Revision Level (Search Help - F4)"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        Engineering drawings revision state
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: Quantity and Date */}
                    {activeItemTab === 'quantity-date' && (
                        <div className="space-y-6">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#556b82]">
                                Quantity and Date (Item {currentItem?.item_number})
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {/* Quantity * (Input) */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Quantity <span className="text-rose-500">*</span>
                                        </label>
                                        <span className="text-[10px] text-rose-600 font-medium"></span>
                                    </div>
                                    <input
                                        type="number"
                                        step="any"
                                        min="0.001"
                                        value={currentItem?.quantity || ''}
                                        onChange={(e) =>
                                            updateCurrentItem({ quantity: parseFloat(e.target.value) || 0 })
                                        }
                                        required
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                    />
                                </div>

                                {/* Delivery Date * (Search help / Date) */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Delivery Date <span className="text-rose-500">*</span>
                                        </label>
                                        <span className="text-[10px] text-rose-600 font-medium"></span>
                                    </div>
                                    <input
                                        type="date"
                                        value={currentItem?.delivery_date || ''}
                                        onChange={(e) => updateCurrentItem({ delivery_date: e.target.value })}
                                        required
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none bg-white"
                                    />
                                </div>

                                {/* Requisition Date * (Search help / Date) */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Requisition Date <span className="text-rose-500">*</span>
                                        </label>
                                        <span className="text-[10px] text-rose-600 font-medium"></span>
                                    </div>
                                    <input
                                        type="date"
                                        value={currentItem?.requisition_date || ''}
                                        onChange={(e) => updateCurrentItem({ requisition_date: e.target.value })}
                                        required
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none bg-white"
                                    />
                                </div>

                                {/* Release Date * (Search help / Date) */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Release Date <span className="text-rose-500">*</span>
                                        </label>
                                        <span className="text-[10px] text-rose-600 font-medium"></span>
                                    </div>
                                    <input
                                        type="date"
                                        value={currentItem?.release_date || ''}
                                        onChange={(e) => updateCurrentItem({ release_date: e.target.value })}
                                        required
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none bg-white"
                                    />
                                </div>

                                {/* Planned Delivery Time (in Days) (Input) */}
                                <div>
                                    <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                        Planned Delivery Time (in Days)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={currentItem?.planned_delivery_time ?? 0}
                                        onChange={(e) =>
                                            updateCurrentItem({ planned_delivery_time: parseInt(e.target.value) || 0 })
                                        }
                                        placeholder="0"
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                    />
                                </div>

                                {/* GR Processing Time (in Days) (Input) */}
                                <div>
                                    <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                        GR Processing Time (in Days)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={currentItem?.gr_processing_time ?? 0}
                                        onChange={(e) =>
                                            updateCurrentItem({ gr_processing_time: parseInt(e.target.value) || 0 })
                                        }
                                        placeholder="0"
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: Valuation */}
                    {activeItemTab === 'valuation' && (
                        <div className="space-y-6">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#556b82]">
                                Valuation (Item {currentItem?.item_number})
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {/* Valuation Price * (Input) */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Valuation Price <span className="text-rose-500">*</span>
                                        </label>
                                        <span className="text-[10px] text-rose-600 font-medium"></span>
                                    </div>
                                    <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        value={currentItem?.unit_price ?? ''}
                                        onChange={(e) =>
                                            updateCurrentItem({ unit_price: parseFloat(e.target.value) || 0 })
                                        }
                                        required
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] font-semibold focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                    />
                                </div>

                                {/* Currency (Search help) - Option beside Valuation Price */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Currency (F4)
                                        </label>
                                        <span className="text-[10px] text-[#556b82]">Option beside Valuation Price</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={currentItem?.currency || currency}
                                            onChange={(e) => updateCurrentItem({ currency: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === 'F4') {
                                                    e.preventDefault();
                                                    openSearchHelp(
                                                        'currency',
                                                        'Select Currency (Search Help)',
                                                        dataCatalog.currencies,
                                                        currentItem?.currency || currency,
                                                        activeItemIndex
                                                    );
                                                }
                                            }}
                                            placeholder="INR"
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openSearchHelp(
                                                    'currency',
                                                    'Select Currency (Search Help)',
                                                    dataCatalog.currencies,
                                                    currentItem?.currency || currency,
                                                    activeItemIndex
                                                )
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Unit of Measure * (Search help) */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Unit of Measure <span className="text-rose-500">*</span> (F4)
                                        </label>
                                        <span className="text-[10px] text-rose-600 font-medium"></span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={currentItem?.unit_of_measure || ''}
                                            onChange={(e) => updateCurrentItem({ unit_of_measure: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === 'F4') {
                                                    e.preventDefault();
                                                    openSearchHelp(
                                                        'unit_of_measure',
                                                        'Select Unit of Measure (Search Help)',
                                                        dataCatalog.unitsOfMeasure,
                                                        currentItem?.unit_of_measure,
                                                        activeItemIndex
                                                    );
                                                }
                                            }}
                                            placeholder="KG"
                                            required
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openSearchHelp(
                                                    'unit_of_measure',
                                                    'Select Unit of Measure (Search Help)',
                                                    dataCatalog.unitsOfMeasure,
                                                    currentItem?.unit_of_measure,
                                                    activeItemIndex
                                                )
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Price Unit * (Input) */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Price Unit <span className="text-rose-500">*</span>
                                        </label>
                                        <span className="text-[10px] text-rose-600 font-medium"></span>
                                    </div>
                                    <input
                                        type="number"
                                        min="1"
                                        value={currentItem?.price_unit || 1}
                                        onChange={(e) =>
                                            updateCurrentItem({ price_unit: parseInt(e.target.value) || 1 })
                                        }
                                        required
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                    />
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        Number of units the price applies to (default: 1)
                                    </span>
                                </div>

                                {/* Tax Code (Search help) */}
                                <div>
                                    <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                        Tax Code (F4)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={currentItem?.tax_code || ''}
                                            onChange={(e) => updateCurrentItem({ tax_code: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === 'F4') {
                                                    e.preventDefault();
                                                    openSearchHelp(
                                                        'tax_code',
                                                        'Select Tax Code (Search Help)',
                                                        dataCatalog.taxCodes,
                                                        currentItem?.tax_code,
                                                        activeItemIndex
                                                    );
                                                }
                                            }}
                                            placeholder="V1"
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openSearchHelp(
                                                    'tax_code',
                                                    'Select Tax Code (Search Help)',
                                                    dataCatalog.taxCodes,
                                                    currentItem?.tax_code,
                                                    activeItemIndex
                                                )
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* PO Price Type (Dropdown) */}
                                <div>
                                    <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                        PO Price Type
                                    </label>
                                    <select
                                        value={currentItem?.po_price_type || 'Do not adopt'}
                                        onChange={(e) => updateCurrentItem({ po_price_type: e.target.value })}
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none bg-white"
                                    >
                                        {dataCatalog.poPriceTypes.map((pt) => (
                                            <option key={pt.code} value={pt.code}>
                                                {pt.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Computed Item Total Card */}
                            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 flex items-center justify-between">
                                <div>
                                    <div className="text-xs font-bold text-[#1c2d42]">
                                        Calculated Net Item Value
                                    </div>
                                    <div className="text-[11px] text-[#556b82]">
                                        Formula: ({currentItem?.quantity} {currentItem?.unit_of_measure} / {currentItem?.price_unit || 1}) × {currentItem?.unit_price} {currentItem?.currency}
                                    </div>
                                </div>
                                <div className="text-lg font-bold text-[#0070f2]">
                                    {currentItemTotal().toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}{' '}
                                    <span className="text-xs">{currentItem?.currency}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: Account Assignment */}
                    {activeItemTab === 'account-assignment' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#556b82]">
                                    Account Assignment (Item {currentItem?.item_number})
                                </h3>
                                <span className="text-[11px] text-[#0070f2] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                                    SAP F4 Search Help Available
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {/* Account Assignment Category (Search help) */}
                                <div>
                                    <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                        Account Assignment Category (F4)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={currentItem?.account_assignment_category || ''}
                                            onChange={(e) =>
                                                updateCurrentItem({ account_assignment_category: e.target.value })
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === 'F4') {
                                                    e.preventDefault();
                                                    openSearchHelp(
                                                        'account_assignment_category',
                                                        'Select Account Assignment Category',
                                                        dataCatalog.accountAssignmentCategories,
                                                        currentItem?.account_assignment_category,
                                                        activeItemIndex
                                                    );
                                                }
                                            }}
                                            placeholder="K"
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openSearchHelp(
                                                    'account_assignment_category',
                                                    'Select Account Assignment Category',
                                                    dataCatalog.accountAssignmentCategories,
                                                    currentItem?.account_assignment_category,
                                                    activeItemIndex
                                                )
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                            title="Account Assignment Category (Search Help - F4)"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        Controlling mechanism (K - Cost Center, P - WBS...)
                                    </span>
                                </div>

                                {/* G/L Account (Search help) */}
                                <div>
                                    <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                        G/L Account (F4)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={currentItem?.gl_account || ''}
                                            onChange={(e) => updateCurrentItem({ gl_account: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === 'F4') {
                                                    e.preventDefault();
                                                    openSearchHelp(
                                                        'gl_account',
                                                        'Select G/L Account (Search Help)',
                                                        dataCatalog.glAccounts,
                                                        currentItem?.gl_account,
                                                        activeItemIndex
                                                    );
                                                }
                                            }}
                                            placeholder="40000000"
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openSearchHelp(
                                                    'gl_account',
                                                    'Select G/L Account (Search Help)',
                                                    dataCatalog.glAccounts,
                                                    currentItem?.gl_account,
                                                    activeItemIndex
                                                )
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                            title="G/L Account (Search Help - F4)"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        General Ledger account for expenditure or consumption posting
                                    </span>
                                </div>

                                {/* Cost Center (Search help) */}
                                <div>
                                    <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                        Cost Center (F4)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={currentItem?.cost_center || ''}
                                            onChange={(e) => updateCurrentItem({ cost_center: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === 'F4') {
                                                    e.preventDefault();
                                                    openSearchHelp(
                                                        'cost_center',
                                                        'Select Cost Center (Search Help)',
                                                        dataCatalog.costCenters,
                                                        currentItem?.cost_center,
                                                        activeItemIndex
                                                    );
                                                }
                                            }}
                                            placeholder="12001101"
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openSearchHelp(
                                                    'cost_center',
                                                    'Select Cost Center (Search Help)',
                                                    dataCatalog.costCenters,
                                                    currentItem?.cost_center,
                                                    activeItemIndex
                                                )
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                            title="Cost Center (Search Help - F4)"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        Controlling area cost center for cost allocation
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 5: Source of Supply */}
                    {activeItemTab === 'source-of-supply' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#556b82]">
                                    Source of Supply (Item {currentItem?.item_number})
                                </h3>

                                {/* Assign Source of Supply Button */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        updateCurrentItem({
                                            desired_supplier: currentItem.desired_supplier || 'V-10029',
                                            source_assigned: true,
                                        });
                                        setSuccessMessage(
                                            `Source of Supply determined: Vendor ${currentItem.desired_supplier || 'V-10029 (Tata Chemicals)'} assigned.`
                                        );
                                        setTimeout(() => setSuccessMessage(null), 4000);
                                    }}
                                    className="flex items-center gap-1.5 rounded-md bg-[#0070f2] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2] transition-colors"
                                >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    <span>Assign Source of Supply</span>
                                </button>
                            </div>

                            {successMessage && (
                                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <span>{successMessage}</span>
                                </div>
                            )}

                            <div className="rounded-lg border border-slate-200 p-4 space-y-3 bg-slate-50/60">
                                <div className="text-xs font-semibold text-[#1c2d42]">
                                    Determined Supplier Information
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                    <div>
                                        <span className="text-[#556b82] block text-[11px]">Assigned Vendor</span>
                                        <strong className="text-[#1c2d42]">
                                            {currentItem?.desired_supplier || 'No supplier assigned yet'}
                                        </strong>
                                    </div>
                                    <div>
                                        <span className="text-[#556b82] block text-[11px]">Plant Sourcing</span>
                                        <strong className="text-[#1c2d42]">Plant {currentItem?.plant}</strong>
                                    </div>
                                    <div>
                                        <span className="text-[#556b82] block text-[11px]">Purchasing Org</span>
                                        <strong className="text-[#1c2d42]">
                                            {currentItem?.purchasing_organization || '1200'}
                                        </strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 6: Contact Information */}
                    {activeItemTab === 'contact-info' && (
                        <div className="space-y-6">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#556b82]">
                                Contact Information (Item {currentItem?.item_number})
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Requisitioner (Input) */}
                                <div>
                                    <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                        Requisitioner
                                    </label>
                                    <input
                                        type="text"
                                        value={requisitioner}
                                        onChange={(e) => setRequisitioner(e.target.value)}
                                        placeholder="e.g. Ashish Borgohain (CB9980000006)"
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                    />
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        Name of individual or department requesting goods
                                    </span>
                                </div>

                                {/* Requirement Tracking Number (Input) */}
                                <div>
                                    <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                        Requirement Tracking Number
                                    </label>
                                    <input
                                        type="text"
                                        value={currentItem?.requirement_tracking_number || ''}
                                        onChange={(e) =>
                                            updateCurrentItem({ requirement_tracking_number: e.target.value })
                                        }
                                        placeholder="TRK-2026-004"
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                    />
                                </div>

                                {/* Purchasing Organization (Search help) */}
                                <div>
                                    <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                        Purchasing Organization
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={currentItem?.purchasing_organization || ''}
                                            onChange={(e) =>
                                                updateCurrentItem({ purchasing_organization: e.target.value })
                                            }
                                            placeholder="1200"
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openSearchHelp(
                                                    'purchasing_organization',
                                                    'Select Purchasing Organization (Search Help)',
                                                    dataCatalog.purchasingOrganizations,
                                                    currentItem?.purchasing_organization
                                                )
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Purchasing Group * (Search help) */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Purchasing Group <span className="text-rose-500">*</span>
                                        </label>
                                        <span className="text-[10px] text-rose-600 font-medium"></span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={currentItem?.purchasing_group || ''}
                                            onChange={(e) =>
                                                updateCurrentItem({ purchasing_group: e.target.value })
                                            }
                                            placeholder="103"
                                            required
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openSearchHelp(
                                                    'purchasing_group',
                                                    'Select Purchasing Group (Search Help)',
                                                    dataCatalog.purchasingGroups,
                                                    currentItem?.purchasing_group
                                                )
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 7: Notes & Attachments (Header Text: "Notes") */}
                    {activeItemTab === 'notes' && (
                        <div className="space-y-6">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#556b82]">
                                Notes & Attachments (Item {currentItem?.item_number})
                            </h3>

                            {/* Sub-tabs for Notes Types */}
                            <div className="border-b border-slate-200">
                                <div className="flex space-x-2">
                                    {[
                                        { id: 'item-text', label: 'Item Text' },
                                        { id: 'item-note', label: 'Item Note' },
                                        { id: 'delivery-text', label: 'Delivery Text' },
                                        { id: 'material-po-text', label: 'Material PO Text' },
                                        { id: 'closure-comment', label: 'Closure Comment' },
                                    ].map((subTab) => {
                                        const isSelected = activeNotesSubTab === subTab.id;
                                        return (
                                            <button
                                                key={subTab.id}
                                                type="button"
                                                onClick={() => setActiveNotesSubTab(subTab.id as any)}
                                                className={`border-b-2 px-3 py-1.5 text-xs font-semibold transition-colors ${
                                                    isSelected
                                                        ? 'border-[#0070f2] text-[#0070f2]'
                                                        : 'border-transparent text-[#556b82] hover:text-[#1c2d42]'
                                                }`}
                                            >
                                                {subTab.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Notes Text Area */}
                            <div>
                                {activeNotesSubTab === 'item-text' && (
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                            Item Text
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={currentItem?.item_text || ''}
                                            onChange={(e) => updateCurrentItem({ item_text: e.target.value })}
                                            placeholder="Item specifications and internal instructions..."
                                            className="w-full rounded-md border border-[#d9e2ec] p-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                    </div>
                                )}

                                {activeNotesSubTab === 'item-note' && (
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                            Item Note
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={currentItem?.item_note || ''}
                                            onChange={(e) => updateCurrentItem({ item_note: e.target.value })}
                                            placeholder="Handling precautions, storage conditions..."
                                            className="w-full rounded-md border border-[#d9e2ec] p-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                    </div>
                                )}

                                {activeNotesSubTab === 'delivery-text' && (
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                            Delivery Text
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={currentItem?.delivery_text || ''}
                                            onChange={(e) => updateCurrentItem({ delivery_text: e.target.value })}
                                            placeholder="Gate instructions, unloading bay, delivery contact person..."
                                            className="w-full rounded-md border border-[#d9e2ec] p-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                    </div>
                                )}

                                {activeNotesSubTab === 'material-po-text' && (
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-semibold text-[#1c2d42]">
                                                Material PO Text
                                            </label>
                                            <span className="text-[10px] text-[#556b82]">
                                                Material long description will be auto-populated / Service information can be maintained if required
                                            </span>
                                        </div>
                                        <textarea
                                            rows={4}
                                            value={currentItem?.material_po_text || ''}
                                            onChange={(e) => updateCurrentItem({ material_po_text: e.target.value })}
                                            placeholder="Material long description will be auto-populated / Service information can be maintained if required"
                                            className="w-full rounded-md border border-[#d9e2ec] p-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                    </div>
                                )}

                                {activeNotesSubTab === 'closure-comment' && (
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                            Closure Comment
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={currentItem?.closure_comment || ''}
                                            onChange={(e) => updateCurrentItem({ closure_comment: e.target.value })}
                                            placeholder="Reason for requisition closure or completion notes..."
                                            className="w-full rounded-md border border-[#d9e2ec] p-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Attachments Section (matching image5) */}
                            <div className="pt-4 border-t border-slate-200 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <Paperclip className="h-4 w-4 text-[#0070f2]" />
                                        <h4 className="text-xs font-bold text-[#1c2d42]">
                                            Attachments ({currentItem?.attachment_name ? '1' : '0'})
                                        </h4>
                                    </div>

                                    {/* Select Document Type to Upload */}
                                    <div className="flex items-center gap-2">
                                        <label className="text-[11px] font-semibold text-[#556b82] whitespace-nowrap">
                                            Select Document Type to Upload: <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            value={currentItem?.attachment_doc_type || 'SL1'}
                                            onChange={(e) =>
                                                updateCurrentItem({ attachment_doc_type: e.target.value })
                                            }
                                            className="h-8 rounded-md border border-[#d9e2ec] px-2 text-xs text-[#1c2d42] bg-white focus:border-[#0070f2] focus:outline-none"
                                        >
                                            {dataCatalog.attachmentDocTypes.map((dt) => (
                                                <option key={dt.code} value={dt.code}>
                                                    {dt.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Upload Button & Dropzone */}
                                <div className="rounded-lg border-2 border-dashed border-[#d9e2ec] bg-slate-50/50 p-6 text-center hover:bg-slate-50 transition-colors">
                                    {currentItem?.attachment_name ? (
                                        <div className="flex items-center justify-between max-w-md mx-auto rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
                                            <div className="flex items-center gap-2.5 text-left">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-[#0070f2]">
                                                    <Paperclip className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-[#1c2d42]">
                                                        {currentItem.attachment_name}
                                                    </div>
                                                    <div className="text-[10px] text-[#556b82]">
                                                        Type: {currentItem.attachment_doc_type} • Any material drawings can be uploaded
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => updateCurrentItem({ attachment_name: '' })}
                                                className="text-rose-600 hover:text-rose-800 text-xs font-semibold p-1"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <div>
                                            <UploadCloud className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                                            <p className="text-xs font-semibold text-[#1c2d42]">
                                                Any material drawings can be uploaded
                                            </p>
                                            <p className="text-[11px] text-[#556b82] mt-1">
                                                Drag files here or click Upload to attach engineering specifications or drawings
                                            </p>
                                            <label className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-[#0070f2] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs cursor-pointer hover:bg-[#0057c2] transition-colors">
                                                <FileUp className="h-3.5 w-3.5" />
                                                <span>Upload</span>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            updateCurrentItem({
                                                                attachment_name: file.name,
                                                            });
                                                        }
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="sticky bottom-0 z-20 rounded-xl border border-[#d9e2ec] bg-white p-4 shadow-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-xs text-[#556b82]">
                        Items in PR: <strong className="text-[#1c2d42]">{items.length}</strong>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-xs text-[#556b82]">
                        Total Requisition Amount:{' '}
                        <strong className="text-[#0070f2]">
                            {calculateTotal().toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}{' '}
                            {currency}
                        </strong>
                    </span>
                </div>

                <div className="flex items-center gap-2.5">
                    {!isModal ? (
                        <button
                            type="button"
                            onClick={() => router.visit('/dashboard')}
                            className="rounded-md border border-[#d9e2ec] bg-white px-4 py-2 text-xs font-semibold text-[#1c2d42] hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onCloseModal}
                            className="rounded-md border border-[#d9e2ec] bg-white px-4 py-2 text-xs font-semibold text-[#1c2d42] hover:bg-slate-50 transition-colors"
                        >
                            Close
                        </button>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center gap-2 rounded-md bg-[#0070f2] px-6 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#0057c2] active:bg-[#003884] disabled:opacity-50"
                    >
                        <Send className={`h-3.5 w-3.5 ${submitting ? 'animate-spin' : ''}`} />
                        <span>{submitting ? 'Saving to Database...' : 'Save & Create PR'}</span>
                    </button>
                </div>
            </div>

            {/* SAP Value Help / Search Help Modal */}
            <SapSearchHelpModal
                isOpen={searchHelpState.isOpen}
                title={searchHelpState.title}
                options={searchHelpState.options}
                selectedCode={searchHelpState.selectedCode}
                isLoading={searchHelpState.isLoading}
                onClose={() => setSearchHelpState((prev) => ({ ...prev, isOpen: false }))}
                onSelect={handleSelectSearchHelp}
            />
        </form>
    );
}
