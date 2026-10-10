import React, { useState, useId } from 'react';
import { router, usePage } from '@inertiajs/react';
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
    Loader2,
    RotateCcw,
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
    fixed_vendor?: string;
    supplier_name?: string;
    info_record?: string;
    agreement_number?: string;
    agreement_item?: string;
    supplying_plant?: string;
    issuing_storage_location?: string;
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
    attachment_file?: File | null;
    source_assigned: boolean;
    moving_average_price?: string | number;
    standard_price?: string | number;
    inventory_valuation_procedure?: string;
    price_control?: string;
    valuation_area?: string;
    valuation_price_source?: string;
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
    const { auth } = usePage<any>().props;
    const defaultRequisitioner = auth?.user?.name
        ? (auth.user.employee_id ? `${auth.user.name} (${auth.user.employee_id})` : auth.user.name)
        : '';

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

    const defaultPlant = dataCatalog.plants && dataCatalog.plants.length > 0 ? dataCatalog.plants[0].code : '1200';
    const defaultDocType = dataCatalog.documentTypes?.find((dt) => dt.code === 'ZMAT')?.code
        || (dataCatalog.documentTypes && dataCatalog.documentTypes.length > 0 ? dataCatalog.documentTypes[0].code : 'ZMAT');

    const getTodayString = (addDays = 0) => {
        const d = new Date();
        d.setDate(d.getDate() + addDays);
        return d.toISOString().split('T')[0];
    };

    // Header State
    const [description, setDescription] = useState('');
    const [prType, setPrType] = useState(defaultDocType);
    const [headerOptionId, setHeaderOptionId] = useState<string>('');
    const [autoSourceDetermination, setAutoSourceDetermination] = useState(false);
    const [headerNote, setHeaderNote] = useState('');
    const [companyCode, setCompanyCode] = useState('1000');
    const [currency, setCurrency] = useState('INR');
    const [requisitioner, setRequisitioner] = useState(defaultRequisitioner);

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
        fixed_vendor: '',
        supplier_name: '',
        info_record: '',
        agreement_number: '',
        agreement_item: '',
        supplying_plant: '',
        issuing_storage_location: '',
        quantity: '',
        unit_of_measure: type === 'service' ? 'LE' : 'EA',
        unit_price: '',
        price_unit: 1,
        currency: currency,
        tax_code: '',
        po_price_type: 'Do not adopt',
        plant: defaultPlant,
        storage_location: '',
        account_assignment_category: type === 'service' ? 'K' : '',
        requirement_tracking_number: '',
        cost_center: '10101PCC01',
        gl_account: '65301000',
        purchasing_organization: '1100',
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
        attachment_file: null,
        source_assigned: false,
        moving_average_price: '0.00',
        standard_price: '0.00',
        inventory_valuation_procedure: '',
        price_control: '',
        valuation_area: defaultPlant,
        valuation_price_source: '',
    });

    // Items List - Initialized with an empty material item
    const [items, setItems] = useState<PrItemData[]>([
        createEmptyPrItem('00010', 'material'),
    ]);

    // Submission and UI Feedback
    const [submitting, setSubmitting] = useState(false);
    const [isDrafting, setIsDrafting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Search Help Modal State
    const [searchHelpState, setSearchHelpState] = useState<{
        isOpen: boolean;
        title: string;
        subtitle?: string;
        options: SearchHelpOption[];
        selectedCode?: string;
        field: keyof PrItemData | 'documentType';
        targetIndex?: number;
        isLoading?: boolean;
    }>({
        isOpen: false,
        title: '',
        subtitle: undefined,
        options: [],
        field: 'plant',
        targetIndex: 0,
        isLoading: false,
    });

    const [sapMaterialsCache, setSapMaterialsCache] = useState<SearchHelpOption[]>([]);
    const [sapAccountAssignmentCategoriesCache, setSapAccountAssignmentCategoriesCache] = useState<SearchHelpOption[]>([]);
    const [sapPlantsCache, setSapPlantsCache] = useState<SearchHelpOption[]>([]);

    // Valuation lookup tracking & debouncing
    const [fetchingValuation, setFetchingValuation] = useState<Record<string, boolean>>({});
    const lookupTimeoutRef = React.useRef<Record<string, any>>({});

    /**
     * Calculates valuation price from SAP material response based on Price Control rule:
     * - Pass material number and Plant (as valuation Area)
     * - Check priceControl (InventoryValuationProcedure in response):
     *   * If InventoryValuationProcedure = 'V' -> pick MovingAveragePrice
     *   * If InventoryValuationProcedure = 'S' -> pick StandardPrice
     *   * Else fallback to MovingAveragePrice > 0 ? MovingAveragePrice : (StandardPrice > 0 ? StandardPrice : unitPrice)
     */
    const calculateValuationPriceFromItem = (matData: any): {
        valuationPrice: number | string;
        procedure: string;
        movingAveragePrice: number;
        standardPrice: number;
        currency?: string;
        priceControlLabel: string;
    } => {
        if (!matData) {
            return {
                valuationPrice: '0.00',
                procedure: '',
                movingAveragePrice: 0,
                standardPrice: 0,
                priceControlLabel: '',
            };
        }

        const raw = matData.raw_data || {};
        const procedure = String(
            matData.InventoryValuationProcedure ??
            raw.InventoryValuationProcedure ??
            matData.priceControl ??
            raw.priceControl ??
            ''
        ).trim().toUpperCase();

        const movingAvgStr = matData.MovingAveragePrice ?? raw.MovingAveragePrice ?? '0.00';
        const standardStr = matData.StandardPrice ?? raw.StandardPrice ?? '0.00';
        const movingAvg = parseFloat(String(movingAvgStr)) || 0;
        const standard = parseFloat(String(standardStr)) || 0;
        const fallbackUnitPrice = parseFloat(String(matData.valuationPrice ?? matData.unitPrice ?? matData.UnitPrice ?? raw.UnitPrice ?? 0)) || 0;
        const currency = matData.Currency || raw.Currency || '';

        let price: number | string = '0.00';
        let label = '';

        if (procedure === 'V') {
            // Price Control V -> Pick MovingAveragePrice
            price = movingAvg > 0 ? movingAvg : (movingAvgStr !== undefined && movingAvgStr !== '' ? movingAvgStr : '0.00');
            label = `V (Moving Avg: ${Number(movingAvg).toFixed(2)})`;
        } else if (procedure === 'S') {
            // Price Control S -> Pick StandardPrice
            price = standard > 0 ? standard : (standardStr !== undefined && standardStr !== '' ? standardStr : '0.00');
            label = `S (Standard Price: ${Number(standard).toFixed(2)})`;
        } else {
            // Procedure blank or other: pick MovingAveragePrice if > 0, else StandardPrice if > 0, else fallback unitPrice
            if (movingAvg > 0) {
                price = movingAvg;
                label = `Moving Avg: ${Number(movingAvg).toFixed(2)}`;
            } else if (standard > 0) {
                price = standard;
                label = `Standard Price: ${Number(standard).toFixed(2)}`;
            } else if (fallbackUnitPrice > 0) {
                price = fallbackUnitPrice;
                label = `Unit Price: ${Number(fallbackUnitPrice).toFixed(2)}`;
            } else {
                price = '0.00';
                label = '';
            }
        }

        return {
            valuationPrice: price,
            procedure,
            movingAveragePrice: movingAvg,
            standardPrice: standard,
            currency: currency || undefined,
            priceControlLabel: label,
        };
    };

    /**
     * Applies material master data and calculated valuation price to a PR line item
     */
    const applyMaterialToItem = (
        targetIdx: number,
        matData: any,
        targetPlant?: string
    ) => {
        if (!matData) return;

        const valCalc = calculateValuationPriceFromItem(matData);
        const productCode = matData.Product || matData.ProductExternalID || matData.code || '';
        const productName = matData.ProductName || matData.name || matData.ProductDescription || '';
        const uom = matData.UnitOfMeasure || matData.BaseUnit || matData.uom || 'EA';
        const matGroup = matData.ProductGroup || matData.materialGroup || 'L001';
        const matType = matData.ProductType || matData.materialType || 'ROH';
        const poText = matData.poText || matData.ProductDescription || productName || '';
        const movingAvg = matData.MovingAveragePrice ?? valCalc.movingAveragePrice;
        const standard = matData.StandardPrice ?? valCalc.standardPrice;
        const procedure = valCalc.procedure || matData.InventoryValuationProcedure || matData.priceControl || '';
        const valuationArea = matData.ValuationArea || targetPlant || '';

        setItems((prev) =>
            prev.map((item, idx) => {
                if (idx !== targetIdx) return item;
                return {
                    ...item,
                    material_code: productCode || item.material_code,
                    description: productName || item.description,
                    unit_of_measure: uom || item.unit_of_measure,
                    material_group: matGroup || item.material_group,
                    material_type: matType || item.material_type,
                    unit_price: valCalc.valuationPrice !== undefined && valCalc.valuationPrice !== '' ? valCalc.valuationPrice : item.unit_price,
                    currency: valCalc.currency || matData.Currency || item.currency,
                    material_po_text: poText || item.material_po_text || '',
                    moving_average_price: movingAvg,
                    standard_price: standard,
                    inventory_valuation_procedure: procedure,
                    price_control: procedure,
                    valuation_area: valuationArea,
                    valuation_price_source: valCalc.priceControlLabel,
                };
            })
        );
    };

    /**
     * Hit SAP CDS View API (/sap-materials) passing material number and plant (as valuation Area)
     */
    const fetchMaterialDetailsFromApi = async (
        materialCode: string,
        plantCode: string
    ): Promise<any | null> => {
        const trimmedMat = (materialCode || '').trim();
        if (!trimmedMat) return null;
        const targetPlant = (plantCode || defaultPlant).trim();

        try {
            const queryParams = new URLSearchParams({
                material: trimmedMat,
                valuationArea: targetPlant,
            });
            const res = await fetch(`/sap-materials?${queryParams.toString()}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            if (!res.ok) return null;
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                const plantMatch = data.items.find(
                    (it: any) =>
                        (it.ValuationArea && String(it.ValuationArea).trim() === targetPlant) ||
                        (it.Plant && String(it.Plant).trim() === targetPlant)
                );
                return plantMatch || data.items[0];
            }
            return null;
        } catch (err) {
            console.error('Failed to fetch material valuation from API:', err);
            return null;
        }
    };

    /**
     * Triggers valuation price lookup from API or cache passing selected material & plant
     */
    const triggerMaterialValuationLookup = async (
        targetIdx: number,
        materialCode: string,
        plantCode?: string
    ) => {
        const trimmedMat = (materialCode || '').trim();
        if (!trimmedMat) return;

        const currentLine = items[targetIdx];
        const targetPlant = (plantCode || currentLine?.plant || defaultPlant).trim();
        const itemId = currentLine?.id || String(targetIdx);

        // 1. Instant check in cached master data / options
        const localMatch = (sapMaterialsCache.length > 0 ? sapMaterialsCache : (dataCatalog.materials || [])).find(
            (m: any) =>
                (m.Product && String(m.Product).trim().toLowerCase() === trimmedMat.toLowerCase()) ||
                (m.code && String(m.code).trim().toLowerCase() === trimmedMat.toLowerCase())
        );
        if (localMatch) {
            applyMaterialToItem(targetIdx, localMatch, targetPlant);
        }

        // 2. Fetch live from SAP API passing material number and plant (valuation Area)
        setFetchingValuation((prev) => ({ ...prev, [itemId]: true }));
        try {
            const apiItem = await fetchMaterialDetailsFromApi(trimmedMat, targetPlant);
            if (apiItem) {
                applyMaterialToItem(targetIdx, apiItem, targetPlant);
            }
        } finally {
            setFetchingValuation((prev) => ({ ...prev, [itemId]: false }));
        }
    };

    /**
     * Debounced lookup while user is typing material number into input
     */
    const handleMaterialCodeInputChange = (
        targetIdx: number,
        newMaterialCode: string,
        plantCode?: string
    ) => {
        const currentLine = items[targetIdx];
        const itemId = currentLine?.id || String(targetIdx);

        if (lookupTimeoutRef.current[itemId]) {
            clearTimeout(lookupTimeoutRef.current[itemId]);
        }

        if (newMaterialCode.trim().length >= 2) {
            lookupTimeoutRef.current[itemId] = setTimeout(() => {
                triggerMaterialValuationLookup(targetIdx, newMaterialCode, plantCode);
            }, 600);
        }
    };

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
            subtitle: undefined,
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
    const handleOpenMaterialSearchHelp = async (targetIndex: number, currentCode?: string, plantCode?: string) => {
        setActiveItemIndex(targetIndex);
        const targetPlant = (plantCode || items[targetIndex]?.plant || defaultPlant).trim();

        if (sapMaterialsCache.length > 0) {
            setSearchHelpState({
                isOpen: true,
                title: 'Select Material - SAP S/4HANA Cloud (CDS: YY1_MATERIALS_CDS)',
                subtitle: `SAP S/4HANA Cloud (CDS: YY1_MATERIALS_CDS • ${sapMaterialsCache.length} items • Plant: ${targetPlant})`,
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
            subtitle: `Connecting to SAP S/4HANA Cloud (CDS: YY1_MATERIALS_CDS • Plant: ${targetPlant})...`,
            options: dataCatalog.materials || [],
            selectedCode: currentCode || '',
            field: 'material_code',
            targetIndex,
            isLoading: true,
        });

        try {
            const queryParam = targetPlant ? `?valuationArea=${encodeURIComponent(targetPlant)}` : '';
            const res = await fetch(`/sap-materials${queryParam}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                setSapMaterialsCache(data.items);
                setSearchHelpState((prev) => ({
                    ...prev,
                    options: data.items,
                    subtitle: `SAP S/4HANA Cloud (CDS: YY1_MATERIALS_CDS • ${data.items.length} items • Plant: ${targetPlant})`,
                    isLoading: false,
                }));
            } else {
                setSearchHelpState((prev) => ({
                    ...prev,
                    subtitle: 'No materials returned from SAP CDS View',
                    isLoading: false,
                }));
            }
        } catch (err) {
            console.error('Failed to fetch materials from SAP CDS view:', err);
            setSearchHelpState((prev) => ({
                ...prev,
                subtitle: 'Failed to connect to SAP Cloud CDS View',
                isLoading: false,
            }));
        }
    };

    /**
     * Hit SAP S/4HANA Cloud CDS View (YY1_ACCOUNTASSIGNMENTCAT_CDS) API for Account Assignment Category F4 Search Help.
     * Shows AccountAssignmentCategory (Code) and AcctAssignmentCategoryName (Description).
     */
    const handleOpenAccountAssignmentCategorySearchHelp = async (targetIndex: number, currentCode?: string) => {
        setActiveItemIndex(targetIndex);

        if (sapAccountAssignmentCategoriesCache.length > 0) {
            setSearchHelpState({
                isOpen: true,
                title: 'Select Account Assignment Category - SAP S/4HANA Cloud (CDS: YY1_AccountAssignmentCat)',
                subtitle: `SAP S/4HANA Cloud (CDS: YY1_AccountAssignmentCat • ${sapAccountAssignmentCategoriesCache.length} categories)`,
                options: sapAccountAssignmentCategoriesCache,
                selectedCode: currentCode || '',
                field: 'account_assignment_category',
                targetIndex,
                isLoading: false,
            });
            return;
        }

        // Open modal immediately with loading state
        setSearchHelpState({
            isOpen: true,
            title: 'Select Account Assignment Category - SAP S/4HANA Cloud (CDS: YY1_AccountAssignmentCat)',
            subtitle: 'Connecting to SAP S/4HANA Cloud (CDS: YY1_AccountAssignmentCat)...',
            options: dataCatalog.accountAssignmentCategories || [],
            selectedCode: currentCode || '',
            field: 'account_assignment_category',
            targetIndex,
            isLoading: true,
        });

        try {
            const res = await fetch('/sap-account-assignment-categories', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                setSapAccountAssignmentCategoriesCache(data.items);
                setSearchHelpState((prev) => ({
                    ...prev,
                    options: data.items,
                    subtitle: `SAP S/4HANA Cloud (CDS: YY1_AccountAssignmentCat • ${data.items.length} categories)`,
                    isLoading: false,
                }));
            } else {
                setSearchHelpState((prev) => ({
                    ...prev,
                    subtitle: 'No categories returned from SAP CDS View',
                    isLoading: false,
                }));
            }
        } catch (err) {
            console.error('Failed to fetch account assignment categories from SAP CDS view:', err);
            setSearchHelpState((prev) => ({
                ...prev,
                subtitle: 'Failed to connect to SAP Cloud CDS View',
                isLoading: false,
            }));
        }
    };

    /**
     * Hit SAP S/4HANA Cloud Service (ZUI_TMS_DESPATCH_04 / PlantVH) API for Plant F4 Search Help.
     * Shows Plant (code) and PlantName (description).
     */
    const handleOpenPlantSearchHelp = async (targetIndex: number, currentCode?: string) => {
        setActiveItemIndex(targetIndex);

        if (sapPlantsCache.length > 0) {
            setSearchHelpState({
                isOpen: true,
                title: 'Select Plant - SAP S/4HANA Cloud (ZUI_TMS_DESPATCH_04 / PlantVH)',
                subtitle: `SAP S/4HANA Cloud (ZUI_TMS_DESPATCH_04 / PlantVH • ${sapPlantsCache.length} plants)`,
                options: sapPlantsCache,
                selectedCode: currentCode || '',
                field: 'plant',
                targetIndex,
                isLoading: false,
            });
            return;
        }

        // Open modal immediately with loading state and fallback catalog
        setSearchHelpState({
            isOpen: true,
            title: 'Select Plant - SAP S/4HANA Cloud (ZUI_TMS_DESPATCH_04 / PlantVH)',
            subtitle: 'Connecting to SAP S/4HANA Cloud (ZUI_TMS_DESPATCH_04 / PlantVH)...',
            options: dataCatalog.plants || [],
            selectedCode: currentCode || '',
            field: 'plant',
            targetIndex,
            isLoading: true,
        });

        try {
            const res = await fetch('/sap-plants', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                setSapPlantsCache(data.items);
                setSearchHelpState((prev) => ({
                    ...prev,
                    options: data.items,
                    subtitle: `SAP S/4HANA Cloud (ZUI_TMS_DESPATCH_04 / PlantVH • ${data.items.length} plants)`,
                    isLoading: false,
                }));
            } else {
                setSearchHelpState((prev) => ({
                    ...prev,
                    subtitle: 'No plants returned from SAP PlantVH',
                    isLoading: false,
                }));
            }
        } catch (err) {
            console.error('Failed to fetch plants from SAP PlantVH service:', err);
            setSearchHelpState((prev) => ({
                ...prev,
                subtitle: 'Failed to connect to SAP Cloud PlantVH Service',
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

        // Special handling when selecting Plant:
        if (field === 'plant') {
            const plantCode = opt.Plant || opt.code;
            setItems((prev) =>
                prev.map((item, idx) => {
                    if (idx !== targetIdx) return item;
                    return {
                        ...item,
                        plant: plantCode,
                    };
                })
            );
            // If item already has a material number, re-query valuation price for new plant (valuation area)
            const currentLine = items[targetIdx];
            if (currentLine && currentLine.material_code) {
                triggerMaterialValuationLookup(targetIdx, currentLine.material_code, plantCode);
            }
            return;
        }

        // Special handling when selecting Account Assignment Category:
        if (field === 'account_assignment_category') {
            const catCode = opt.code !== undefined ? opt.code : (opt.AccountAssignmentCategory ?? '');
            setItems((prev) =>
                prev.map((item, idx) => {
                    if (idx !== targetIdx) return item;
                    return {
                        ...item,
                        account_assignment_category: catCode,
                    };
                })
            );
            return;
        }

        // Special handling when selecting Material: auto-populates Product, Description, UoM, and Valuation Price based on Price Control!
        if (field === 'material_code') {
            const productCode = opt.Product || opt.ProductExternalID || opt.code;
            const targetPlant = items[targetIdx]?.plant || defaultPlant;

            // Immediately apply material attributes and calculate valuation price based on V / S Price Control
            applyMaterialToItem(targetIdx, opt, targetPlant);

            // Also query API passing selected material number and plant (as valuation Area) to verify live SAP valuation
            triggerMaterialValuationLookup(targetIdx, productCode, targetPlant);
            return;
        }

        // Special handling when selecting Desired Supplier or Fixed Vendor:
        if (field === 'desired_supplier' || field === 'fixed_vendor') {
            const supplierCode = opt.Supplier || opt.code;
            const supplierName = opt.SupplierName || opt.supplierName || opt.name || '';
            setItems((prev) =>
                prev.map((item, idx) => {
                    if (idx !== targetIdx) return item;
                    return {
                        ...item,
                        [field]: supplierCode,
                        ...(field === 'desired_supplier' && !item.fixed_vendor ? { fixed_vendor: supplierCode } : {}),
                        ...(field === 'fixed_vendor' && !item.desired_supplier ? { desired_supplier: supplierCode } : {}),
                        supplier_name: supplierName || item.supplier_name,
                        source_assigned: true,
                    };
                })
            );
            return;
        }

        // Special handling when selecting Purchasing Info Record:
        if (field === 'info_record') {
            setItems((prev) =>
                prev.map((item, idx) => {
                    if (idx !== targetIdx) return item;
                    return {
                        ...item,
                        info_record: opt.code,
                        source_assigned: true,
                    };
                })
            );
            return;
        }

        // Special handling when selecting Outline Agreement:
        if (field === 'agreement_number') {
            setItems((prev) =>
                prev.map((item, idx) => {
                    if (idx !== targetIdx) return item;
                    return {
                        ...item,
                        agreement_number: opt.code,
                        agreement_item: item.agreement_item || '00010',
                        source_assigned: true,
                    };
                })
            );
            return;
        }

        // Special handling when selecting Agreement Item:
        if (field === 'agreement_item') {
            setItems((prev) =>
                prev.map((item, idx) => {
                    if (idx !== targetIdx) return item;
                    return {
                        ...item,
                        agreement_item: opt.code,
                    };
                })
            );
            return;
        }

        // Special handling when selecting Supplying Plant:
        if (field === 'supplying_plant') {
            const plantCode = opt.Plant || opt.code;
            setItems((prev) =>
                prev.map((item, idx) => {
                    if (idx !== targetIdx) return item;
                    return {
                        ...item,
                        supplying_plant: plantCode,
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

    // Form Submission (Direct Sync or Draft)
    const submitForm = (isDraft: boolean) => {
        setErrorMessage(null);

        // Validation: Document Type is mandatory
        if (!prType) {
            setErrorMessage('Document Type is mandatory. Please select an option.');
            return;
        }

        // When saving as non-draft, validate all items strictly
        if (!isDraft) {
            for (let i = 0; i < items.length; i++) {
                const it = items[i];
                const aac = it.account_assignment_category?.trim().toUpperCase();
                if (aac === 'N') {
                    setErrorMessage(`Item ${it.item_number}: Account Assignment Category 'N' (Network) is not supported for standard items in SAP S/4HANA Cloud (SAP error ME/066). Leave blank for Stock/Inventory materials or select 'K' for Cost Center.`);
                    setActiveItemIndex(i);
                    setActiveItemTab('account-assignment');
                    return;
                }
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
        } else {
            // For draft, only check item description if present
            for (let i = 0; i < items.length; i++) {
                const it = items[i];
                if (!it.description.trim()) {
                    setErrorMessage(`Item ${it.item_number}: Item Description is mandatory to save draft.`);
                    setActiveItemIndex(i);
                    setActiveItemTab('general');
                    return;
                }
            }
        }

        if (isDraft) {
            setIsDrafting(true);
        } else {
            setSubmitting(true);
        }

        router.post(
            '/purchase-requisitions',
            {
                is_draft: isDraft ? 1 : 0,
                description: description.trim() || currentItem.description || 'Draft Purchase Requisition',
                header_note: headerNote,
                header_option_id: headerOptionId || null,
                pr_type: prType,
                auto_source_determination: autoSourceDetermination,
                company_code: companyCode || '1000',
                plant: currentItem.plant || '1000',
                currency: currency,
                requisitioner: requisitioner,
                items: items.map((it) => ({
                    item_number: it.item_number,
                    item_type: it.item_type || 'material',
                    material_type: it.material_type,
                    item_category: it.item_category,
                    description: it.description || 'Draft Item',
                    material_code: it.material_code,
                    supplier_material_number: it.supplier_material_number,
                    batch: it.batch,
                    revision_level: it.revision_level,
                    material_group: it.material_group || 'YBPM01',
                    desired_supplier: it.desired_supplier || it.fixed_vendor || '',
                    quantity: Number(it.quantity) > 0 ? it.quantity : 1,
                    unit_of_measure: it.unit_of_measure || 'PC',
                    unit_price: Number(it.unit_price) >= 0 ? it.unit_price : 0,
                    price_unit: it.price_unit || 1,
                    currency: it.currency || currency,
                    tax_code: it.tax_code,
                    po_price_type: it.po_price_type,
                    plant: it.plant || currentItem.plant || '1000',
                    storage_location: it.storage_location,
                    account_assignment_category: it.account_assignment_category,
                    requirement_tracking_number: it.requirement_tracking_number,
                    cost_center: it.cost_center,
                    gl_account: it.gl_account,
                    purchasing_organization: it.purchasing_organization || '1100',
                    purchasing_group: it.purchasing_group || '103',
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
                    attachment_file: it.attachment_file || null,
                })),
            },
            {
                forceFormData: true,
                onSuccess: () => {
                    setSubmitting(false);
                    setIsDrafting(false);
                    if (isModal && onCloseModal) {
                        onCloseModal();
                    }
                },
                onError: (errors) => {
                    setSubmitting(false);
                    setIsDrafting(false);
                    const firstError = Object.values(errors)[0] as string;
                    setErrorMessage(firstError || 'Failed to save Purchase Requisition.');
                },
            }
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submitForm(false);
    };

    const handleSaveDraft = (e: React.MouseEvent) => {
        e.preventDefault();
        submitForm(true);
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
                            {description || 'New Requisition'}
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

                        {/* Draft Button (Stores in local database only) */}
                        <button
                            type="button"
                            onClick={handleSaveDraft}
                            disabled={submitting || isDrafting}
                            className="flex items-center gap-1.5 rounded-md border border-[#0070f2] bg-white px-4 py-2 text-xs font-semibold text-[#0070f2] shadow-2xs transition-colors hover:bg-blue-50 active:bg-blue-100 disabled:opacity-50"
                            title="Save as Draft in local database (is_draft = 1) without syncing to SAP"
                        >
                            <Save className={`h-3.5 w-3.5 ${isDrafting ? 'animate-spin' : ''}`} />
                            <span>{isDrafting ? 'Saving Draft...' : 'Save as Draft'}</span>
                        </button>

                        <button
                            type="submit"
                            disabled={submitting || isDrafting}
                            className="flex items-center gap-2 rounded-md bg-[#0070f2] px-5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#0057c2] active:bg-[#003884] disabled:opacity-50"
                        >
                            <Send className={`h-3.5 w-3.5 ${submitting ? 'animate-spin' : ''}`} />
                            <span>{submitting ? 'Creating & Syncing with SAP Cloud...' : 'Create & Sync with SAP'}</span>
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
                                placeholder="Enter purchase requisition description..."
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
                            {/* <span className="mt-1 block text-[10px] text-[#556b82]">
                                Configured by Superadmin
                            </span> */}
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
                                <th className="py-2.5 px-2.5 w-36 bg-[#f8fafc]">
                                    <span className="flex items-center gap-1">
                                        Material No.
                                        <span className="text-[9px] font-bold text-[#0070f2] bg-blue-50 border border-blue-200 px-1 py-0.2 rounded">F4</span>
                                    </span>
                                </th>
                                <th className="py-2.5 px-2.5 min-w-[160px] bg-[#f8fafc]">Description</th>
                                 <th className="py-2.5 px-2.5 w-32 text-right bg-[#f8fafc]">
                                    <span className="flex items-center justify-end gap-1">
                                        Quantity & UoM
                                        <span className="text-[9px] font-bold text-[#0070f2] bg-blue-50 border border-blue-200 px-1 py-0.2 rounded">F4</span>
                                    </span>
                                </th>
                                <th className="py-2.5 px-2.5 w-28 bg-[#f8fafc]">
                                    <span className="flex items-center gap-1">
                                        Plant
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
                                                    onClick={() => handleOpenAccountAssignmentCategorySearchHelp(idx, it.account_assignment_category)}
                                                    onChange={(e) => updateItemById(it.id, { account_assignment_category: e.target.value })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'F4') {
                                                            e.preventDefault();
                                                            handleOpenAccountAssignmentCategorySearchHelp(idx, it.account_assignment_category);
                                                        }
                                                    }}
                                                    placeholder="Blank"
                                                    title="Account Assignment Category: Blank for Stock/Inventory materials, K for Cost Center"
                                                    className="h-8 w-full rounded border border-[#d9e2ec] bg-white pr-7 pl-2 text-xs font-mono text-center text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveItemIndex(idx);
                                                        handleOpenAccountAssignmentCategorySearchHelp(idx, it.account_assignment_category);
                                                    }}
                                                    className="absolute right-1 text-[#0070f2] hover:bg-blue-100 p-0.5 rounded transition-colors"
                                                    title="Account Assignment Search Help (F4) - Hits SAP CDS View YY1_AccountAssignmentCat"
                                                >
                                                    <Search className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </td>
                                        {/* Material Number with F4 Search Help */}
                                        <td className="py-2 px-2.5">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="text"
                                                    value={it.material_code || ''}
                                                    onFocus={() => setActiveItemIndex(idx)}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        updateItemById(it.id, { material_code: val });
                                                        handleMaterialCodeInputChange(idx, val, it.plant);
                                                    }}
                                                    onBlur={(e) => {
                                                        triggerMaterialValuationLookup(idx, e.target.value, it.plant);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'F4') {
                                                            e.preventDefault();
                                                            handleOpenMaterialSearchHelp(idx, it.material_code, it.plant);
                                                        } else if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            triggerMaterialValuationLookup(idx, it.material_code, it.plant);
                                                        }
                                                    }}
                                                    placeholder="Material # (F4)"
                                                    className="h-8 w-full rounded border border-[#d9e2ec] bg-white pr-7 pl-2 text-xs font-mono text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                                />
                                                {fetchingValuation[it.id] ? (
                                                    <div className="absolute right-1.5 text-[#0070f2]" title="Fetching Valuation Price from SAP...">
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveItemIndex(idx);
                                                            handleOpenMaterialSearchHelp(idx, it.material_code, it.plant);
                                                        }}
                                                        className="absolute right-1 text-[#0070f2] hover:bg-blue-100 p-0.5 rounded transition-colors"
                                                        title="Material Search Help (F4) - Hits SAP CDS View YY1_MATERIALS_CDS"
                                                    >
                                                        <Search className="h-3 w-3" />
                                                    </button>
                                                )}
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
                                        {/* Plant with F4 */}
                                        <td className="py-2 px-2.5">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="text"
                                                    value={it.plant || ''}
                                                    onFocus={() => setActiveItemIndex(idx)}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        updateItemById(it.id, { plant: val });
                                                        if (it.material_code) {
                                                            triggerMaterialValuationLookup(idx, it.material_code, val);
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        if (it.material_code) {
                                                            triggerMaterialValuationLookup(idx, it.material_code, e.target.value);
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'F4') {
                                                            e.preventDefault();
                                                            handleOpenPlantSearchHelp(idx, it.plant);
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
                                                        handleOpenPlantSearchHelp(idx, it.plant);
                                                    }}
                                                    className="absolute right-1 text-[#0070f2] hover:bg-blue-100 p-0.5 rounded transition-colors"
                                                    title="Plant Search Help (F4) - Hits SAP Service ZUI_TMS_DESPATCH_04 / PlantVH"
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
                                       
                                        {/* Valuation Price */}
                                        <td className="py-2 px-2.5">
                                            <div className="flex flex-col items-end gap-0.5">
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
                                                {it.inventory_valuation_procedure === 'V' && (
                                                    <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200" title={`Moving Average Price: ${it.moving_average_price || it.unit_price}`}>
                                                        V (MAP)
                                                    </span>
                                                )}
                                                {it.inventory_valuation_procedure === 'S' && (
                                                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200" title={`Standard Price: ${it.standard_price || it.unit_price}`}>
                                                        S (Std)
                                                    </span>
                                                )}
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

                                {/* Material Number (Search help) - Auto-populates all Material info & Valuation Price! */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Material Number (F4)
                                        </label>
                                        <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                            Auto-populates fields & Valuation Price
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={currentItem?.material_code || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                updateCurrentItem({ material_code: val });
                                                handleMaterialCodeInputChange(activeItemIndex, val, currentItem?.plant);
                                            }}
                                            onBlur={(e) => {
                                                triggerMaterialValuationLookup(activeItemIndex, e.target.value, currentItem?.plant);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'F4') {
                                                    e.preventDefault();
                                                    handleOpenMaterialSearchHelp(activeItemIndex, currentItem?.material_code, currentItem?.plant);
                                                } else if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    triggerMaterialValuationLookup(activeItemIndex, currentItem?.material_code, currentItem?.plant);
                                                }
                                            }}
                                            placeholder="1000000002 (Type or press F4 for Search Help)"
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                        {fetchingValuation[currentItem?.id || ''] ? (
                                            <div className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2]" title="Fetching Valuation Price from SAP...">
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleOpenMaterialSearchHelp(activeItemIndex, currentItem?.material_code, currentItem?.plant)}
                                                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                                title="Select Material - F4 Search Help (Hits SAP CDS View YY1_MATERIALS_CDS)"
                                            >
                                                <Search className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="mt-1 flex items-center justify-between text-[10px]">
                                        <span className="text-[#556b82]">
                                            Valuation Area: <span className="font-semibold text-slate-700">{currentItem?.plant || defaultPlant}</span>
                                        </span>
                                        {currentItem?.inventory_valuation_procedure === 'V' && (
                                            <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200" title={`Moving Average Price: ${currentItem?.moving_average_price || currentItem?.unit_price}`}>
                                                Price Control: V (Moving Avg: {currentItem?.currency || currency} {Number(currentItem?.moving_average_price || currentItem?.unit_price).toFixed(2)})
                                            </span>
                                        )}
                                        {currentItem?.inventory_valuation_procedure === 'S' && (
                                            <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200" title={`Standard Price: ${currentItem?.standard_price || currentItem?.unit_price}`}>
                                                Price Control: S (Standard Price: {currentItem?.currency || currency} {Number(currentItem?.standard_price || currentItem?.unit_price).toFixed(2)})
                                            </span>
                                        )}
                                    </div>
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
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                updateCurrentItem({ plant: val });
                                                if (currentItem?.material_code) {
                                                    triggerMaterialValuationLookup(activeItemIndex, currentItem.material_code, val);
                                                }
                                            }}
                                            onBlur={(e) => {
                                                if (currentItem?.material_code) {
                                                    triggerMaterialValuationLookup(activeItemIndex, currentItem.material_code, e.target.value);
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'F4') {
                                                    e.preventDefault();
                                                    handleOpenPlantSearchHelp(activeItemIndex, currentItem?.plant);
                                                }
                                            }}
                                            placeholder="1200"
                                            required
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleOpenPlantSearchHelp(activeItemIndex, currentItem?.plant)}
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                            title="Plant Search Help (F4) - Hits SAP Service ZUI_TMS_DESPATCH_04 / PlantVH"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        Receiving manufacturing or warehouse plant (SAP PlantVH)
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
                                        <div className="flex items-center gap-1.5">
                                            {currentItem?.account_assignment_category && (
                                                <button
                                                    type="button"
                                                    onClick={() => updateCurrentItem({ account_assignment_category: '' })}
                                                    className="text-[10px] text-blue-600 hover:underline"
                                                    title="Clear to standard Stock / Inventory (blank)"
                                                >
                                                    Clear (Stock)
                                                </button>
                                            )}
                                            <span className="text-[10px] text-[#556b82]">
                                                {currentItem?.account_assignment_category ? `Category ${currentItem.account_assignment_category}` : 'Stock / Inventory'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={currentItem?.account_assignment_category || ''}
                                            onClick={() =>
                                                handleOpenAccountAssignmentCategorySearchHelp(
                                                    activeItemIndex,
                                                    currentItem?.account_assignment_category
                                                )
                                            }
                                            onChange={(e) =>
                                                updateCurrentItem({ account_assignment_category: e.target.value })
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === 'F4') {
                                                    e.preventDefault();
                                                    handleOpenAccountAssignmentCategorySearchHelp(
                                                        activeItemIndex,
                                                        currentItem?.account_assignment_category
                                                    );
                                                }
                                            }}
                                            placeholder="Leave blank for Stock/Inventory, or 'K' for Cost Center"
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleOpenAccountAssignmentCategorySearchHelp(
                                                    activeItemIndex,
                                                    currentItem?.account_assignment_category
                                                )
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                            title="Account Assignment Category (Search Help - F4) - Hits SAP CDS View YY1_AccountAssignmentCat"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        {!currentItem?.account_assignment_category
                                            ? 'Standard Stock / Inventory procurement (no cost center required)'
                                            : currentItem.account_assignment_category === 'K'
                                            ? 'Cost Center expense (K) • requires Cost Center & G/L Account'
                                            : `Controlling assignment category ${currentItem.account_assignment_category}`}
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
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#556b82]">
                                    Valuation (Item {currentItem?.item_number})
                                </h3>
                                <span className="text-[11px] text-[#0070f2] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                                    SAP Automatic Valuation
                                </span>
                            </div>

                            {/* Valuation & Price Control Parameters Card */}
                            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-[#0070f2]" />
                                        <span className="text-xs font-bold text-slate-800">
                                            SAP Inventory Valuation & Price Control
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-slate-500">
                                        Valuation Area: <strong className="text-slate-800 font-mono">{currentItem?.plant || defaultPlant}</strong>
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                    <div className="rounded bg-white p-2.5 border border-slate-200">
                                        <span className="text-[10px] text-[#556b82] block mb-0.5">Price Control (Procedure):</span>
                                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                            <span className="font-mono text-xs">{currentItem?.inventory_valuation_procedure || currentItem?.price_control || '-'}</span>
                                            {currentItem?.inventory_valuation_procedure === 'V' && (
                                                <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">V (MAP)</span>
                                            )}
                                            {currentItem?.inventory_valuation_procedure === 'S' && (
                                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">S (Standard)</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="rounded bg-white p-2.5 border border-slate-200">
                                        <span className="text-[10px] text-[#556b82] block mb-0.5">Moving Average Price:</span>
                                        <span className="font-bold font-mono text-slate-800">
                                            {Number(currentItem?.moving_average_price || 0).toFixed(2)} {currentItem?.currency || currency}
                                        </span>
                                    </div>
                                    <div className="rounded bg-white p-2.5 border border-slate-200">
                                        <span className="text-[10px] text-[#556b82] block mb-0.5">Standard Price:</span>
                                        <span className="font-bold font-mono text-slate-800">
                                            {Number(currentItem?.standard_price || 0).toFixed(2)} {currentItem?.currency || currency}
                                        </span>
                                    </div>
                                    <div className="rounded bg-white p-2.5 border border-slate-200">
                                        <span className="text-[10px] text-[#556b82] block mb-0.5">Active Valuation Price:</span>
                                        <span className="font-bold font-mono text-[#0070f2]">
                                            {Number(currentItem?.unit_price || 0).toFixed(2)} {currentItem?.currency || currency}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {/* Valuation Price * (Input) */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Valuation Price <span className="text-rose-500">*</span>
                                        </label>
                                        {currentItem?.inventory_valuation_procedure === 'V' && (
                                            <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                                Picked from Moving Avg (V)
                                            </span>
                                        )}
                                        {currentItem?.inventory_valuation_procedure === 'S' && (
                                            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                                Picked from Standard Price (S)
                                            </span>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="any"
                                            min="0"
                                            value={currentItem?.unit_price ?? ''}
                                            onChange={(e) =>
                                                updateCurrentItem({ unit_price: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })
                                            }
                                            required
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] font-semibold focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                        {fetchingValuation[currentItem?.id || ''] && (
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[#0070f2]">
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            </div>
                                        )}
                                    </div>
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
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Account Assignment Category (F4)
                                        </label>
                                        {currentItem?.account_assignment_category && (
                                            <button
                                                type="button"
                                                onClick={() => updateCurrentItem({ account_assignment_category: '' })}
                                                className="text-[10px] text-blue-600 hover:underline font-medium"
                                                title="Clear to standard Stock / Inventory (blank)"
                                            >
                                                Clear (Set to Stock)
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={currentItem?.account_assignment_category || ''}
                                            onClick={() =>
                                                handleOpenAccountAssignmentCategorySearchHelp(
                                                    activeItemIndex,
                                                    currentItem?.account_assignment_category
                                                )
                                            }
                                            onChange={(e) =>
                                                updateCurrentItem({ account_assignment_category: e.target.value })
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === 'F4') {
                                                    e.preventDefault();
                                                    handleOpenAccountAssignmentCategorySearchHelp(
                                                        activeItemIndex,
                                                        currentItem?.account_assignment_category
                                                    );
                                                }
                                            }}
                                            placeholder="Leave blank for Stock, or 'K' for Cost Center"
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleOpenAccountAssignmentCategorySearchHelp(
                                                    activeItemIndex,
                                                    currentItem?.account_assignment_category
                                                )
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                            title="Account Assignment Category (Search Help - F4) - Hits SAP CDS View YY1_AccountAssignmentCat"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        {!currentItem?.account_assignment_category
                                            ? 'Standard Stock / Inventory procurement (automatic inventory valuation)'
                                            : currentItem.account_assignment_category === 'K'
                                            ? 'Cost Center expense (K) • requires Cost Center & G/L Account'
                                            : `Controlling assignment category ${currentItem.account_assignment_category}`}
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
                            {/* Section Header & Actions */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#556b82]">
                                        Source of Supply (Item {currentItem?.item_number})
                                    </h3>
                                    {currentItem?.source_assigned || currentItem?.desired_supplier || currentItem?.fixed_vendor || currentItem?.info_record ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                            Source Assigned
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                            <AlertCircle className="h-3 w-3 text-amber-600" />
                                            Manual / Unassigned
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            updateCurrentItem({
                                                desired_supplier: '',
                                                fixed_vendor: '',
                                                supplier_name: '',
                                                info_record: '',
                                                agreement_number: '',
                                                agreement_item: '',
                                                supplying_plant: '',
                                                issuing_storage_location: '',
                                                source_assigned: false,
                                            });
                                            setSuccessMessage(`Source of Supply cleared for Item ${currentItem?.item_number}.`);
                                            setTimeout(() => setSuccessMessage(null), 3000);
                                        }}
                                        className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                        title="Clear all source of supply fields for this item"
                                    >
                                        <RotateCcw className="h-3 w-3" />
                                        <span>Clear Source</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            const vendorCode = currentItem.fixed_vendor || currentItem.desired_supplier || 'V-10029';
                                            const matched = (dataCatalog.desiredSuppliers || []).find((s) => s.code === vendorCode);
                                            const vendorName = currentItem.supplier_name || (matched ? (matched.name || matched.supplierName) : 'Tata Chemicals Ltd');
                                            updateCurrentItem({
                                                desired_supplier: vendorCode,
                                                fixed_vendor: vendorCode,
                                                supplier_name: vendorName,
                                                source_assigned: true,
                                            });
                                            setSuccessMessage(
                                                `Source of Supply determined: Vendor ${vendorCode} (${vendorName}) assigned to Item ${currentItem?.item_number}.`
                                            );
                                            setTimeout(() => setSuccessMessage(null), 4500);
                                        }}
                                        className="flex items-center gap-1.5 rounded-md bg-[#0070f2] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2] transition-colors"
                                    >
                                        <Sparkles className="h-3.5 w-3.5" />
                                        <span>Assign / Confirm Source</span>
                                    </button>
                                </div>
                            </div>

                            {successMessage && (
                                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 animate-in fade-in">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <span>{successMessage}</span>
                                </div>
                            )}

                            {/* Section 1: Vendor & Supplier Specification */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-semibold text-[#1c2d42]">
                                    <Building2 className="h-4 w-4 text-[#0070f2]" />
                                    <span>Vendor & Supplier Determination</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Desired Supplier (F4) */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-semibold text-[#1c2d42]">
                                                Desired Supplier (F4)
                                            </label>
                                            <span className="text-[10px] text-[#556b82]">Manual / F4</span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={currentItem?.desired_supplier || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value.toUpperCase();
                                                    const matched = (dataCatalog.desiredSuppliers || []).find((s) => s.code === val);
                                                    updateCurrentItem({
                                                        desired_supplier: val,
                                                        ...(matched ? { supplier_name: matched.name || matched.supplierName } : {}),
                                                        ...(!currentItem.fixed_vendor ? { fixed_vendor: val } : {}),
                                                        source_assigned: Boolean(val),
                                                    });
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'F4') {
                                                        e.preventDefault();
                                                        openSearchHelp(
                                                            'desired_supplier',
                                                            'Select Desired Supplier (Search Help - F4)',
                                                            dataCatalog.desiredSuppliers || [],
                                                            currentItem?.desired_supplier,
                                                            activeItemIndex
                                                        );
                                                    }
                                                }}
                                                placeholder="e.g. V-10029"
                                                className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openSearchHelp(
                                                        'desired_supplier',
                                                        'Select Desired Supplier (Search Help - F4)',
                                                        dataCatalog.desiredSuppliers || [],
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
                                            Suggested vendor proposed by requesting department (LIFNR)
                                        </span>
                                    </div>

                                    {/* Fixed Vendor (F4) */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-semibold text-[#1c2d42]">
                                                Fixed Vendor (F4)
                                            </label>
                                            <span className="text-[10px] text-[#556b82]">Manual / F4</span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={currentItem?.fixed_vendor || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value.toUpperCase();
                                                    const matched = (dataCatalog.desiredSuppliers || []).find((s) => s.code === val);
                                                    updateCurrentItem({
                                                        fixed_vendor: val,
                                                        ...(!currentItem.desired_supplier ? { desired_supplier: val } : {}),
                                                        ...(matched ? { supplier_name: matched.name || matched.supplierName } : {}),
                                                        source_assigned: Boolean(val),
                                                    });
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'F4') {
                                                        e.preventDefault();
                                                        openSearchHelp(
                                                            'fixed_vendor',
                                                            'Select Fixed Vendor (Search Help - F4)',
                                                            dataCatalog.desiredSuppliers || [],
                                                            currentItem?.fixed_vendor,
                                                            activeItemIndex
                                                        );
                                                    }
                                                }}
                                                placeholder="e.g. V-10029"
                                                className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openSearchHelp(
                                                        'fixed_vendor',
                                                        'Select Fixed Vendor (Search Help - F4)',
                                                        dataCatalog.desiredSuppliers || [],
                                                        currentItem?.fixed_vendor,
                                                        activeItemIndex
                                                    )
                                                }
                                                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                                title="Fixed Vendor (Search Help - F4)"
                                            >
                                                <Search className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        <span className="mt-1 block text-[10px] text-[#556b82]">
                                            Fixed vendor locked for automated Purchase Order creation (FLIEF)
                                        </span>
                                    </div>

                                    {/* Supplier Name */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-semibold text-[#1c2d42]">
                                                Supplier Name / Business Entity
                                            </label>
                                            <span className="text-[10px] text-[#556b82]">Manual</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={currentItem?.supplier_name || ''}
                                            onChange={(e) => updateCurrentItem({ supplier_name: e.target.value })}
                                            placeholder="e.g. Tata Chemicals Ltd"
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                        <span className="mt-1 block text-[10px] text-[#556b82]">
                                            Trading partner or legal corporate designation
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Purchasing Info Records & Outline Agreements */}
                            <div className="space-y-3 pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-2 text-xs font-semibold text-[#1c2d42]">
                                    <FileText className="h-4 w-4 text-[#0070f2]" />
                                    <span>Purchasing Agreements & Info Records</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Purchasing Info Record (F4) */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-semibold text-[#1c2d42]">
                                                Purchasing Info Record (F4)
                                            </label>
                                            <span className="text-[10px] text-[#556b82]">Manual / F4</span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={currentItem?.info_record || ''}
                                                onChange={(e) =>
                                                    updateCurrentItem({
                                                        info_record: e.target.value,
                                                        source_assigned: Boolean(
                                                            e.target.value || currentItem.desired_supplier || currentItem.fixed_vendor
                                                        ),
                                                    })
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === 'F4') {
                                                        e.preventDefault();
                                                        openSearchHelp(
                                                            'info_record',
                                                            'Select Purchasing Info Record (Search Help - F4)',
                                                            (dataCatalog as any).infoRecords || [],
                                                            currentItem?.info_record,
                                                            activeItemIndex
                                                        );
                                                    }
                                                }}
                                                placeholder="e.g. 5300001201"
                                                className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openSearchHelp(
                                                        'info_record',
                                                        'Select Purchasing Info Record (Search Help - F4)',
                                                        (dataCatalog as any).infoRecords || [],
                                                        currentItem?.info_record,
                                                        activeItemIndex
                                                    )
                                                }
                                                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                                title="Purchasing Info Record (Search Help - F4)"
                                            >
                                                <Search className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        <span className="mt-1 block text-[10px] text-[#556b82]">
                                            SAP Purchasing Info Record linking vendor and material (INFNR)
                                        </span>
                                    </div>

                                    {/* Outline Agreement / Contract (F4) */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-semibold text-[#1c2d42]">
                                                Outline Agreement / Contract (F4)
                                            </label>
                                            <span className="text-[10px] text-[#556b82]">Manual / F4</span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={currentItem?.agreement_number || ''}
                                                onChange={(e) =>
                                                    updateCurrentItem({
                                                        agreement_number: e.target.value,
                                                        source_assigned: Boolean(
                                                            e.target.value || currentItem.desired_supplier || currentItem.fixed_vendor
                                                        ),
                                                    })
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === 'F4') {
                                                        e.preventDefault();
                                                        openSearchHelp(
                                                            'agreement_number',
                                                            'Select Outline Agreement (Search Help - F4)',
                                                            (dataCatalog as any).outlineAgreements || [],
                                                            currentItem?.agreement_number,
                                                            activeItemIndex
                                                        );
                                                    }
                                                }}
                                                placeholder="e.g. 4600000110"
                                                className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openSearchHelp(
                                                        'agreement_number',
                                                        'Select Outline Agreement (Search Help - F4)',
                                                        (dataCatalog as any).outlineAgreements || [],
                                                        currentItem?.agreement_number,
                                                        activeItemIndex
                                                    )
                                                }
                                                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                                title="Outline Agreement / Contract (Search Help - F4)"
                                            >
                                                <Search className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        <span className="mt-1 block text-[10px] text-[#556b82]">
                                            Long-term framework agreement or rate contract (KONNR)
                                        </span>
                                    </div>

                                    {/* Agreement Item (F4) */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-semibold text-[#1c2d42]">
                                                Agreement Item (F4)
                                            </label>
                                            <span className="text-[10px] text-[#556b82]">Manual / F4</span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={currentItem?.agreement_item || ''}
                                                onChange={(e) => updateCurrentItem({ agreement_item: e.target.value })}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'F4') {
                                                        e.preventDefault();
                                                        openSearchHelp(
                                                            'agreement_item',
                                                            'Select Agreement Item (Search Help - F4)',
                                                            (dataCatalog as any).agreementItems || [],
                                                            currentItem?.agreement_item,
                                                            activeItemIndex
                                                        );
                                                    }
                                                }}
                                                placeholder="e.g. 00010"
                                                className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openSearchHelp(
                                                        'agreement_item',
                                                        'Select Agreement Item (Search Help - F4)',
                                                        (dataCatalog as any).agreementItems || [],
                                                        currentItem?.agreement_item,
                                                        activeItemIndex
                                                    )
                                                }
                                                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                                title="Agreement Item (Search Help - F4)"
                                            >
                                                <Search className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        <span className="mt-1 block text-[10px] text-[#556b82]">
                                            Line position number within outline agreement (KTPNR)
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Organizational Sourcing & Internal Supply */}
                            <div className="space-y-3 pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-2 text-xs font-semibold text-[#1c2d42]">
                                    <Layers className="h-4 w-4 text-[#0070f2]" />
                                    <span>Organizational Assignment & Internal Supply</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {/* Purchasing Organization (F4) */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-semibold text-[#1c2d42]">
                                                Purchasing Org (F4)
                                            </label>
                                            <span className="text-[10px] text-[#556b82]">Manual / F4</span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={currentItem?.purchasing_organization || ''}
                                                onChange={(e) => updateCurrentItem({ purchasing_organization: e.target.value })}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'F4') {
                                                        e.preventDefault();
                                                        openSearchHelp(
                                                            'purchasing_organization',
                                                            'Select Purchasing Organization (Search Help - F4)',
                                                            dataCatalog.purchasingOrganizations || [],
                                                            currentItem?.purchasing_organization,
                                                            activeItemIndex
                                                        );
                                                    }
                                                }}
                                                placeholder="e.g. 1100"
                                                className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openSearchHelp(
                                                        'purchasing_organization',
                                                        'Select Purchasing Organization (Search Help - F4)',
                                                        dataCatalog.purchasingOrganizations || [],
                                                        currentItem?.purchasing_organization,
                                                        activeItemIndex
                                                    )
                                                }
                                                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                                title="Purchasing Organization (Search Help - F4)"
                                            >
                                                <Search className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        <span className="mt-1 block text-[10px] text-[#556b82]">
                                            Procuring unit (EKORG)
                                        </span>
                                    </div>

                                    {/* Purchasing Group (F4) */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-semibold text-[#1c2d42]">
                                                Purchasing Group (F4)
                                            </label>
                                            <span className="text-[10px] text-[#556b82]">Manual / F4</span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={currentItem?.purchasing_group || ''}
                                                onChange={(e) => updateCurrentItem({ purchasing_group: e.target.value })}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'F4') {
                                                        e.preventDefault();
                                                        openSearchHelp(
                                                            'purchasing_group',
                                                            'Select Purchasing Group (Search Help - F4)',
                                                            dataCatalog.purchasingGroups || [],
                                                            currentItem?.purchasing_group,
                                                            activeItemIndex
                                                        );
                                                    }
                                                }}
                                                placeholder="e.g. 103"
                                                className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openSearchHelp(
                                                        'purchasing_group',
                                                        'Select Purchasing Group (Search Help - F4)',
                                                        dataCatalog.purchasingGroups || [],
                                                        currentItem?.purchasing_group,
                                                        activeItemIndex
                                                    )
                                                }
                                                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                                title="Purchasing Group (Search Help - F4)"
                                            >
                                                <Search className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        <span className="mt-1 block text-[10px] text-[#556b82]">
                                            Buyer group (EKGRP)
                                        </span>
                                    </div>

                                    {/* Supplying Plant (F4) */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-semibold text-[#1c2d42]">
                                                Supplying Plant (F4)
                                            </label>
                                            <span className="text-[10px] text-[#556b82]">Internal / STO</span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={currentItem?.supplying_plant || ''}
                                                onChange={(e) => updateCurrentItem({ supplying_plant: e.target.value })}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'F4') {
                                                        e.preventDefault();
                                                        openSearchHelp(
                                                            'supplying_plant',
                                                            'Select Supplying Plant (Search Help - F4)',
                                                            dataCatalog.plants || [],
                                                            currentItem?.supplying_plant,
                                                            activeItemIndex
                                                        );
                                                    }
                                                }}
                                                placeholder="e.g. 1200"
                                                className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openSearchHelp(
                                                        'supplying_plant',
                                                        'Select Supplying Plant (Search Help - F4)',
                                                        dataCatalog.plants || [],
                                                        currentItem?.supplying_plant,
                                                        activeItemIndex
                                                    )
                                                }
                                                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                                title="Supplying Plant (Search Help - F4)"
                                            >
                                                <Search className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        <span className="mt-1 block text-[10px] text-[#556b82]">
                                            Issuing plant for stock transport (RESWK)
                                        </span>
                                    </div>

                                    {/* Issuing Storage Location (F4) */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-semibold text-[#1c2d42]">
                                                Issuing S.Loc (F4)
                                            </label>
                                            <span className="text-[10px] text-[#556b82]">Manual / F4</span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={currentItem?.issuing_storage_location || ''}
                                                onChange={(e) => updateCurrentItem({ issuing_storage_location: e.target.value })}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'F4') {
                                                        e.preventDefault();
                                                        openSearchHelp(
                                                            'issuing_storage_location',
                                                            'Select Issuing Storage Location (Search Help - F4)',
                                                            dataCatalog.storageLocations || [],
                                                            currentItem?.issuing_storage_location,
                                                            activeItemIndex
                                                        );
                                                    }
                                                }}
                                                placeholder="e.g. SL01"
                                                className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openSearchHelp(
                                                        'issuing_storage_location',
                                                        'Select Issuing Storage Location (Search Help - F4)',
                                                        dataCatalog.storageLocations || [],
                                                        currentItem?.issuing_storage_location,
                                                        activeItemIndex
                                                    )
                                                }
                                                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                                title="Issuing Storage Location (Search Help - F4)"
                                            >
                                                <Search className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        <span className="mt-1 block text-[10px] text-[#556b82]">
                                            Issuing storage location (RESLO)
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Dynamic Live Determined Source Summary Card */}
                            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs font-semibold text-[#1c2d42] flex items-center gap-1.5">
                                        <Sparkles className="h-3.5 w-3.5 text-[#0070f2]" />
                                        <span>Determined Source of Supply Overview</span>
                                    </div>
                                    <span className="text-[10px] text-[#556b82]">
                                        SAP ME51N / S/4HANA Sourcing Specification
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                    <div className="rounded-md border border-slate-200/80 bg-white p-2.5 shadow-2xs">
                                        <span className="text-[#556b82] block text-[11px] mb-0.5">Assigned Vendor</span>
                                        <strong className="text-[#1c2d42] block font-mono">
                                            {currentItem?.fixed_vendor || currentItem?.desired_supplier || 'No vendor assigned'}
                                        </strong>
                                        <span className="text-[11px] text-slate-500 truncate block">
                                            {currentItem?.supplier_name || 'Manual entry / F4 lookup ready'}
                                        </span>
                                    </div>

                                    <div className="rounded-md border border-slate-200/80 bg-white p-2.5 shadow-2xs">
                                        <span className="text-[#556b82] block text-[11px] mb-0.5">Info Record / Contract</span>
                                        <strong className="text-[#1c2d42] block font-mono">
                                            {currentItem?.info_record || currentItem?.agreement_number || 'None'}
                                        </strong>
                                        <span className="text-[11px] text-slate-500 block">
                                            {currentItem?.agreement_item ? `Contract Item: ${currentItem.agreement_item}` : 'Standard conditions'}
                                        </span>
                                    </div>

                                    <div className="rounded-md border border-slate-200/80 bg-white p-2.5 shadow-2xs">
                                        <span className="text-[#556b82] block text-[11px] mb-0.5">Plant & Sourcing</span>
                                        <strong className="text-[#1c2d42] block">
                                            Plant {currentItem?.plant || defaultPlant}
                                        </strong>
                                        <span className="text-[11px] text-slate-500 block">
                                            {currentItem?.supplying_plant
                                                ? `Supplying Plant: ${currentItem.supplying_plant}`
                                                : `Storage Loc: ${currentItem?.storage_location || 'Not set'}`}
                                        </span>
                                    </div>

                                    <div className="rounded-md border border-slate-200/80 bg-white p-2.5 shadow-2xs">
                                        <span className="text-[#556b82] block text-[11px] mb-0.5">Purchasing Units</span>
                                        <strong className="text-[#1c2d42] block font-mono">
                                            Org: {currentItem?.purchasing_organization || '1100'}
                                        </strong>
                                        <span className="text-[11px] text-slate-500 block font-mono">
                                            Group: {currentItem?.purchasing_group || '103'}
                                        </span>
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
                                        placeholder="e.g. Requester Name / Employee ID"
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
                                                    <div className="text-xs font-bold text-[#1c2d42] truncate max-w-[220px]" title={currentItem.attachment_name}>
                                                        {currentItem.attachment_name}
                                                    </div>
                                                    <div className="text-[10px] text-[#556b82]">
                                                        Type: {currentItem.attachment_doc_type}
                                                        {currentItem.attachment_file && (
                                                            <span> • {(currentItem.attachment_file.size / 1024).toFixed(1)} KB</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => updateCurrentItem({ attachment_name: '', attachment_file: null })}
                                                className="text-rose-600 hover:text-rose-800 text-xs font-semibold p-1"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <div>
                                            <UploadCloud className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                                            <p className="text-xs font-semibold text-[#1c2d42]">
                                                Upload drawings, datasheets, or engineering specs for this item
                                            </p>
                                            <p className="text-[11px] text-[#556b82] mt-1">
                                                Accepted formats: PDF, DWG, PNG, JPG, DOCX, XLSX (Stored locally and synced with SAP S/4HANA Cloud)
                                            </p>
                                            <label className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-[#0070f2] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs cursor-pointer hover:bg-[#0057c2] transition-colors">
                                                <FileUp className="h-3.5 w-3.5" />
                                                <span>Upload Attachment</span>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            updateCurrentItem({
                                                                attachment_name: file.name,
                                                                attachment_file: file,
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

                    {/* Draft Button (Stores in local database only) */}
                    <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={submitting || isDrafting}
                        className="flex items-center gap-1.5 rounded-md border border-[#0070f2] bg-white px-5 py-2 text-xs font-semibold text-[#0070f2] shadow-2xs transition-colors hover:bg-blue-50 active:bg-blue-100 disabled:opacity-50"
                        title="Save as Draft in local database (is_draft = 1) without syncing to SAP"
                    >
                        <Save className={`h-3.5 w-3.5 ${isDrafting ? 'animate-spin' : ''}`} />
                        <span>{isDrafting ? 'Saving Draft...' : 'Save as Draft'}</span>
                    </button>

                    <button
                        type="submit"
                        disabled={submitting || isDrafting}
                        className="flex items-center gap-2 rounded-md bg-[#0070f2] px-6 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#0057c2] active:bg-[#003884] disabled:opacity-50"
                    >
                        <Send className={`h-3.5 w-3.5 ${submitting ? 'animate-spin' : ''}`} />
                        <span>{submitting ? 'Creating & Syncing with SAP Cloud...' : 'Save & Sync with SAP'}</span>
                    </button>
                </div>
            </div>

            {/* SAP Value Help / Search Help Modal */}
            <SapSearchHelpModal
                isOpen={searchHelpState.isOpen}
                title={searchHelpState.title}
                subtitle={searchHelpState.subtitle}
                options={searchHelpState.options}
                selectedCode={searchHelpState.selectedCode}
                isLoading={searchHelpState.isLoading}
                onClose={() => setSearchHelpState((prev) => ({ ...prev, isOpen: false }))}
                onSelect={handleSelectSearchHelp}
            />
        </form>
    );
}
