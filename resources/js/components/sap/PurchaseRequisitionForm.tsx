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
    Wrench,
    Check,
    Eye,
} from 'lucide-react';
import SapSearchHelpModal, { SearchHelpOption } from './SapSearchHelpModal';
import { defaultSapMasterData, SapMasterDataConfig } from './sapMasterData';
import { HeaderOption, PrDocumentType, ItemCategory, ContractRequisitionData } from '@/types';

export interface PrItemData {
    id: string;
    item_id?: number;
    item_number: string;
    item_type: 'material' | 'service' | '';
    material_type: string;
    item_category: string;
    material_code: string;
    supplier_material_number: string;
    manufacturer_part_number?: string;
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

function convertAmountToWords(num: number): string {
    if (isNaN(num) || num <= 0) return '';
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const inWords = (n: number): string => {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
        if (n < 1000) return inWords(Math.floor(n / 100)) + ' Hundred' + (n % 100 !== 0 ? ' ' + inWords(n % 100) : '');
        if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
        if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '');
        return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '');
    };
    const whole = Math.floor(num);
    const fraction = Math.round((num - whole) * 100);
    let str = inWords(whole) + ' Rupees';
    if (fraction > 0) {
        str += ' and ' + inWords(fraction) + ' Paise';
    }
    return str + ' Only';
}

interface PurchaseRequisitionFormProps {
    masterData?: Partial<SapMasterDataConfig>;
    headerOptions?: HeaderOption[];
    prDocumentTypes?: PrDocumentType[];
    itemCategories?: ItemCategory[];
    isModal?: boolean;
    onCloseModal?: () => void;
    initialData?: any;
    defaultCrNo?: string;
}

export default function PurchaseRequisitionForm({
    masterData = {},
    headerOptions = [],
    prDocumentTypes = [],
    itemCategories = [],
    isModal = false,
    onCloseModal,
    initialData,
    defaultCrNo,
}: PurchaseRequisitionFormProps) {
    const { auth } = usePage<any>().props;
    const defaultRequisitioner = auth?.user?.name
        ? (auth.user.employee_id ? `${auth.user.name}` : auth.user.name)
        : '';
    const defaultDesignation = auth?.user?.designation || '';
    const defaultDepartment = auth?.user?.department?.name || auth?.user?.department?.code || '';
    const defaultPurchasingGroup = auth?.user?.purchasing_group || '103';

    const activePrDocTypes = prDocumentTypes && prDocumentTypes.length > 0
        ? prDocumentTypes.filter((dt) => dt.is_active).map((dt) => ({
            code: dt.code,
            name: dt.name,
            extra: dt.description || dt.category || '',
        }))
        : null;

    const activeItemCategories = itemCategories && itemCategories.length > 0
        ? itemCategories.filter((ic) => ic.is_active).map((ic) => ({
            code: ic.code,
            name: ic.name,
            extra: ic.description || '',
        }))
        : null;

    const dataCatalog: SapMasterDataConfig = {
        ...defaultSapMasterData,
        ...masterData,
        ...(activePrDocTypes ? { documentTypes: activePrDocTypes } : {}),
        ...(activeItemCategories ? { itemCategories: activeItemCategories } : {}),
    };

    const defaultPlant = dataCatalog.plants && dataCatalog.plants.length > 0 ? dataCatalog.plants[0].code : '1200';
    const defaultDocType = dataCatalog.documentTypes?.find((dt) => dt.code === 'ZMAT')?.code
        || (dataCatalog.documentTypes && dataCatalog.documentTypes.length > 0 ? dataCatalog.documentTypes[0].code : 'ZMAT');

    const getTodayString = (addDays = 0) => {
        const d = new Date();
        d.setDate(d.getDate() + addDays);
        return d.toISOString().split('T')[0];
    };

    const isEdit = Boolean(initialData && initialData.id);

    // Header State
    const [description, setDescription] = useState(initialData?.description || '');
    const [prType, setPrType] = useState(initialData?.pr_type || defaultDocType);
    const [headerOptionId, setHeaderOptionId] = useState<string>(
        initialData?.header_option_id ? String(initialData.header_option_id) : ''
    );
    const [autoSourceDetermination, setAutoSourceDetermination] = useState(
        Boolean(initialData?.auto_source_determination)
    );
    const [headerNote, setHeaderNote] = useState(initialData?.header_note || '');
    const [companyCode, setCompanyCode] = useState(initialData?.company_code || '1000');
    const [currency, setCurrency] = useState(initialData?.currency || 'INR');
    const [requisitioner, setRequisitioner] = useState(initialData?.requisitioner || defaultRequisitioner);

    // Contract Requisition (SAP CBO: YY1_CONTRACTREQUISITION) State
    const initialCr =
        initialData?.resolved_contract_requisition ||
        initialData?.contract_requisition_local ||
        initialData?.contract_requisition ||
        initialData?.resolvedContractRequisition ||
        initialData?.contractRequisitionLocal ||
        initialData?.contractRequisition ||
        {};
    const [contractRequisition, setContractRequisition] = useState<ContractRequisitionData>({
        id: initialCr.id,
        cr_no: initialCr.cr_no || defaultCrNo || '',
        pr_number_sap: initialCr.pr_number_sap || initialData?.sap_pr_number || '',
        contract_title: initialCr.contract_title || '',
        scope_of_work: initialCr.scope_of_work || '',
        payment_terms: initialCr.payment_terms || '',
        bidders_qualification_criteria: initialCr.bidders_qualification_criteria || '',
        special_terms_condition: initialCr.special_terms_condition || '',
        guarantee_warranty_period: initialCr.guarantee_warranty_period || '',
        defect_liability_period: initialCr.defect_liability_period || '',
        others: initialCr.others || '',
        requisitioner_name: initialCr.requisitioner_name || initialData?.requisitioner || defaultRequisitioner || '',
        req_designation: initialCr.req_designation || defaultDesignation || '',
        req_department: initialCr.req_department || defaultDepartment || '',
        tender_type: initialCr.tender_type || 'Single',
        tender_estimate_value: initialCr.tender_estimate_value || 'Excluding GST',
        total_pr_value: initialCr.total_pr_value !== undefined && initialCr.total_pr_value !== null ? initialCr.total_pr_value : '',
        total_pr_value_in_word: initialCr.total_pr_value_in_word || '',
        custom_field_1: initialCr.custom_field_1 || '',
        custom_field_2: initialCr.custom_field_2 || '',
        custom_field_3: initialCr.custom_field_3 || '',
        custom_field_4: initialCr.custom_field_4 || '',
        custom_field_5: initialCr.custom_field_5 || '',
        custom_field_6: initialCr.custom_field_6 || '',
        custom_field_7: initialCr.custom_field_7 || '',
        custom_field_8: initialCr.custom_field_8 || '',
        sap_description: initialCr.sap_description || '',
    });
    const CR_NOTE_TABS = [
        {
            id: 'contract_title',
            label: 'Contract Title',
            field: 'contract_title',
            title: 'Contract Title (ContractTitle)',
            placeholder: 'Enter official title or subject matter of the contract requisition...',
            maxLength: 500,
            helpText: 'Official title / subject matter of the contract requisition (SAP: ContractTitle, max 500 chars).',
            rows: 3,
        },
        {
            id: 'scope_of_work',
            label: 'Scope of Work',
            field: 'scope_of_work',
            title: 'Scope of Work (ScopeOfWork)',
            placeholder: 'Enter detailed scope of work, technical specifications, project boundaries, or deliverables...',
            maxLength: 500,
            helpText: 'Detailed description of work to be performed, deliverables, or services (SAP: ScopeOfWork, max 500 chars).',
            rows: 4,
        },
        {
            id: 'payment_terms',
            label: 'Payment Terms',
            field: 'payment_terms',
            title: 'Payment Terms (PaymentTerms)',
            placeholder: 'e.g. 0001 (Immediate Payment) or Net 30 days upon submission of verified invoice...',
            maxLength: 500,
            helpText: 'Standard payment term key or description (SAP: PaymentTerms, max 500 chars).',
            rows: 3,
        },
        {
            id: 'bidders_qualification_criteria',
            label: "Bidder's Qualification",
            field: 'bidders_qualification_criteria',
            title: "Bidder's Qualification Criteria (BiddersQualificationCriteria)",
            placeholder: 'Detail technical capabilities, prior experience with similar works, financial turnover, ISO certificates, or statutory registrations...',
            maxLength: 500,
            helpText: 'Technical, financial, and regulatory qualifications for vendor selection (SAP: BiddersQualificationCriteria, max 500 chars).',
            rows: 4,
        },
        {
            id: 'special_terms_condition',
            label: 'Special Terms & Conditions',
            field: 'special_terms_condition',
            title: 'Special Terms & Conditions (SpecialTermsCondition)',
            placeholder: 'Specify liquidated damages, inspection criteria, delivery milestones, penalty clauses, or escalation terms...',
            maxLength: 500,
            helpText: 'Special contract terms, milestones, or liquidated damages clauses (SAP: SpecialTermsCondition).',
            rows: 4,
        },
        {
            id: 'guarantee_warranty_period',
            label: 'Guarantee / Warranty',
            field: 'guarantee_warranty_period',
            title: 'Guarantee / Warranty Period (GuaranteeWarrantyPeriod)',
            placeholder: 'e.g. 18 months from supply or 12 months from commissioning, whichever is earlier...',
            maxLength: 500,
            helpText: 'Standard warranty and guarantee coverage terms (SAP: GuaranteeWarrantyPeriod, max 500 chars).',
            rows: 3,
        },
        {
            id: 'defect_liability_period',
            label: 'Defect Liability Period',
            field: 'defect_liability_period',
            title: 'Defect Liability Period (DefectLiabilityPeriod)',
            placeholder: 'e.g. 12 months from final handover and acceptance of works...',
            maxLength: 50,
            helpText: 'Contractual defect liability duration (SAP: DefectLiabilityPeriod, max 50 chars).',
            rows: 3,
        },
        {
            id: 'others',
            label: 'Other Terms & Specs',
            field: 'others',
            title: 'Other Terms & Specifications (Others)',
            placeholder: 'Specify any safety protocols, environmental compliance, packing instructions, or insurance requirements...',
            maxLength: 500,
            helpText: 'Additional terms, safety and statutory requirements, or packing standards (SAP: Others).',
            rows: 4,
        },
    ] as const;

    const [activeCrNoteTab, setActiveCrNoteTab] = useState<string>('contract_title');

    const updateContractRequisition = (updates: Partial<ContractRequisitionData>) => {
        setContractRequisition((prev) => ({
            ...prev,
            ...updates,
        }));
    };

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
        type: 'material' | 'service' | '' = ''
    ): PrItemData => ({
        id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        item_number: itemNumberStr,
        item_type: type,
        material_type: '',
        item_category: '',
        material_code: '',
        supplier_material_number: '',
        manufacturer_part_number: '',
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
        unit_of_measure: '',
        unit_price: '',

        price_unit: 1,
        currency: currency,
        tax_code: '',
        po_price_type: 'Do not adopt',
        plant: '',
        storage_location: '',
        account_assignment_category: type === 'service' ? 'K' : '',
        requirement_tracking_number: '',
        cost_center: '',
        gl_account: '',
        purchasing_organization: '',
        purchasing_group: defaultPurchasingGroup,
        delivery_date: getTodayString(14),
        requisition_date: getTodayString(0),
        release_date: getTodayString(0),
        planned_delivery_time: 0,
        gr_processing_time: 0,
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
        valuation_area: '',
        valuation_price_source: '',
    });

    const buildInitialItems = (data?: any): PrItemData[] => {
        if (data?.items && data.items.length > 0) {
            return data.items.map((it: any, index: number) => {
                const rawDelDate = it.delivery_date ? String(it.delivery_date).substring(0, 10) : getTodayString(14);
                const rawReqDate = it.requisition_date ? String(it.requisition_date).substring(0, 10) : getTodayString(0);
                const rawRelDate = it.release_date ? String(it.release_date).substring(0, 10) : getTodayString(0);

                return {
                    id: it.id ? `item-db-${it.id}` : `item-${index}`,
                    item_id: it.id || undefined,
                    item_number: it.item_number || String((index + 1) * 10).padStart(5, '0'),
                    item_type: (it.item_type || (it.material_code ? 'material' : (it.account_assignment_category === 'K' ? 'service' : ''))) as any,
                    material_type: it.material_type || '',
                    item_category: it.item_category || '',
                    material_code: it.material_code || '',
                    supplier_material_number: it.supplier_material_number || '',
                    manufacturer_part_number: it.manufacturer_part_number || it.supplier_material_number || '',
                    batch: it.batch || '',
                    revision_level: it.revision_level || '',
                    description: it.description || '',
                    material_group: it.material_group || 'YBPM01',
                    desired_supplier: it.desired_supplier || '',
                    fixed_vendor: it.fixed_vendor || it.desired_supplier || '',
                    supplier_name: it.desired_supplier || it.fixed_vendor || '',
                    info_record: it.info_record || '',
                    agreement_number: it.agreement_number || '',
                    agreement_item: it.agreement_item || '',
                    supplying_plant: it.supplying_plant || '',
                    issuing_storage_location: it.issuing_storage_location || '',
                    quantity: it.quantity !== null && it.quantity !== undefined ? it.quantity : '',
                    unit_of_measure: it.unit_of_measure || 'PC',
                    unit_price: it.unit_price !== null && it.unit_price !== undefined ? it.unit_price : '',
                    price_unit: it.price_unit ? Number(it.price_unit) : 1,
                    currency: it.currency || data?.currency || currency,
                    tax_code: it.tax_code || '',
                    po_price_type: it.po_price_type || 'Do not adopt',
                    plant: it.plant || data?.plant || defaultPlant,
                    storage_location: it.storage_location || '',
                    account_assignment_category: it.account_assignment_category || '',
                    requirement_tracking_number: it.requirement_tracking_number || '',
                    cost_center: it.cost_center || '',
                    gl_account: it.gl_account || '',
                    purchasing_organization: it.purchasing_organization || '1100',
                    purchasing_group: it.purchasing_group || defaultPurchasingGroup,
                    delivery_date: rawDelDate,
                    requisition_date: rawReqDate,
                    release_date: rawRelDate,
                    planned_delivery_time: it.planned_delivery_time ? Number(it.planned_delivery_time) : 0,
                    gr_processing_time: it.gr_processing_time ? Number(it.gr_processing_time) : 0,
                    item_text: it.item_text || '',
                    item_note: it.item_note || '',
                    delivery_text: it.delivery_text || '',
                    material_po_text: it.material_po_text || '',
                    closure_comment: it.closure_comment || '',
                    attachment_doc_type: it.attachment_doc_type || 'SL1',
                    attachment_name: it.attachment_name || '',
                    attachment_file: null,
                    source_assigned: Boolean(it.desired_supplier || it.fixed_vendor || it.info_record || it.agreement_number),
                    moving_average_price: '0.00',
                    standard_price: '0.00',
                    inventory_valuation_procedure: '',
                    price_control: '',
                    valuation_area: it.plant || '',
                    valuation_price_source: '',
                };
            });
        }
        return [createEmptyPrItem('00010', '')];
    };

    // Items List - Initialized with line items from initialData or empty item
    const [items, setItems] = useState<PrItemData[]>(() => buildInitialItems(initialData));

    // Synchronize initialData when it changes
    React.useEffect(() => {
        if (initialData && initialData.id) {
            setDescription(initialData.description || '');
            setPrType(initialData.pr_type || defaultDocType);
            setHeaderOptionId(initialData.header_option_id ? String(initialData.header_option_id) : '');
            setAutoSourceDetermination(Boolean(initialData.auto_source_determination));
            setHeaderNote(initialData.header_note || '');
            setCompanyCode(initialData.company_code || '1000');
            setCurrency(initialData.currency || 'INR');
            setRequisitioner(initialData.requisitioner || defaultRequisitioner);
            setItems(buildInitialItems(initialData));

            const icr =
                initialData.resolved_contract_requisition ||
                initialData.contract_requisition_local ||
                initialData.contract_requisition ||
                initialData.resolvedContractRequisition ||
                initialData.contractRequisitionLocal ||
                initialData.contractRequisition;
            if (icr) {
                setContractRequisition({
                    id: icr.id,
                    cr_no: icr.cr_no || defaultCrNo || '',
                    pr_number_sap: icr.pr_number_sap || initialData.sap_pr_number || '',
                    contract_title: icr.contract_title || '',
                    scope_of_work: icr.scope_of_work || '',
                    payment_terms: icr.payment_terms || '',
                    bidders_qualification_criteria: icr.bidders_qualification_criteria || '',
                    special_terms_condition: icr.special_terms_condition || '',
                    guarantee_warranty_period: icr.guarantee_warranty_period || '',
                    defect_liability_period: icr.defect_liability_period || '',
                    others: icr.others || '',
                    requisitioner_name: icr.requisitioner_name || initialData.requisitioner || defaultRequisitioner || '',
                    req_designation: icr.req_designation || defaultDesignation || '',
                    req_department: icr.req_department || defaultDepartment || '',
                    tender_type: icr.tender_type || 'Single',
                    tender_estimate_value: icr.tender_estimate_value || 'Excluding GST',
                    total_pr_value: icr.total_pr_value !== undefined && icr.total_pr_value !== null ? icr.total_pr_value : '',
                    total_pr_value_in_word: icr.total_pr_value_in_word || '',
                    custom_field_1: icr.custom_field_1 || '',
                    custom_field_2: icr.custom_field_2 || '',
                    custom_field_3: icr.custom_field_3 || '',
                    custom_field_4: icr.custom_field_4 || '',
                    custom_field_5: icr.custom_field_5 || '',
                    custom_field_6: icr.custom_field_6 || '',
                    custom_field_7: icr.custom_field_7 || '',
                    custom_field_8: icr.custom_field_8 || '',
                    sap_description: icr.sap_description || '',
                });
            }
        }
    }, [initialData]);

    // Submission and UI Feedback
    const [submitting, setSubmitting] = useState(false);
    const [isDrafting, setIsDrafting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Field-level validation errors
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Confirmation & Success Dialog States
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        isDraft: boolean;
    } | null>(null);

    const [successModal, setSuccessModal] = useState<{
        isOpen: boolean;
        prNumber: string;
        sapPrNumber?: string;
        isDraft: boolean;
        message: string;
        prId: number | string;
        totalAmount: number;
        currency: string;
    } | null>(null);

    const [copiedPrNumber, setCopiedPrNumber] = useState(false);
    const [copiedSapPrNumber, setCopiedSapPrNumber] = useState(false);

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
        targetPlant?: string;
    }>({
        isOpen: false,
        title: '',
        subtitle: undefined,
        options: [],
        field: 'plant',
        targetIndex: 0,
        isLoading: false,
        targetPlant: undefined,
    });

    const [sapMaterialsCache, setSapMaterialsCache] = useState<SearchHelpOption[]>([]);
    const [sapAccountAssignmentCategoriesCache, setSapAccountAssignmentCategoriesCache] = useState<SearchHelpOption[]>([]);
    const [sapPlantsCache, setSapPlantsCache] = useState<SearchHelpOption[]>([]);
    const [sapStorageLocationsCache, setSapStorageLocationsCache] = useState<SearchHelpOption[]>([]);
    const [sapMaterialGroupsCache, setSapMaterialGroupsCache] = useState<SearchHelpOption[]>([]);
    const [sapGlAccountsCache, setSapGlAccountsCache] = useState<SearchHelpOption[]>([]);
    const [sapCostCentersCache, setSapCostCentersCache] = useState<SearchHelpOption[]>([]);
    const [sapSuppliersCache, setSapSuppliersCache] = useState<SearchHelpOption[]>([]);
    const [sapPurchasingOrgsCache, setSapPurchasingOrgsCache] = useState<SearchHelpOption[]>([]);
    const [sapPurchasingGroupsCache, setSapPurchasingGroupsCache] = useState<SearchHelpOption[]>([]);
    const [sapUnitsOfMeasureCache, setSapUnitsOfMeasureCache] = useState<SearchHelpOption[]>([]);

    // Silently pre-fetch plants, purchasing groups, AACs, and units of measure to enhance validation & F4 responsiveness
    React.useEffect(() => {
        fetch('/sap-plants', { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then((d) => {
                if (d?.items?.length) setSapPlantsCache(d.items);
            })
            .catch(() => {});

        fetch('/sap-purchasing-groups', { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then((d) => {
                if (d?.items?.length) setSapPurchasingGroupsCache(d.items);
            })
            .catch(() => {});

        fetch('/sap-purchasing-organizations', { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then((d) => {
                if (d?.items?.length) setSapPurchasingOrgsCache(d.items);
            })
            .catch(() => {});

        fetch('/sap-account-assignment-categories', { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then((d) => {
                if (d?.items?.length) setSapAccountAssignmentCategoriesCache(d.items);
            })
            .catch(() => {});

        fetch('/sap-units-of-measure', { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then((d) => {
                if (d?.items?.length) setSapUnitsOfMeasureCache(d.items);
            })
            .catch(() => {});
    }, []);


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
        const productName = matData.ProductName || matData.name || matData.ProductDescription || matData.Product || '';
        const plantFromApi = matData.Plant || matData.plant || matData.ValuationArea || targetPlant || '';
        const uom = matData.BaseUnit || matData.UnitOfMeasure || matData.uom || 'EA';
        
        // Auto-select Material Group for Material items from SAP CDS View
        let matGroup = matData.ProductGroup || matData.materialGroup || matData.MaterialGroup || (matData.raw_data && (matData.raw_data.ProductGroup || matData.raw_data.MaterialGroup)) || '';
        if (!matGroup) {
            if (matData.ProductType === 'ROH') {
                matGroup = '100005'; // Raw Materials
            } else if (dataCatalog.materialGroups && dataCatalog.materialGroups.length > 0) {
                const rawMat = dataCatalog.materialGroups.find((g) => g.code === '100005' || g.name?.toLowerCase().includes('raw'));
                matGroup = rawMat ? rawMat.code : dataCatalog.materialGroups[0].code;
            } else if (sapMaterialGroupsCache.length > 0) {
                const rawMat = sapMaterialGroupsCache.find((g) => g.code === '100005' || g.name?.toLowerCase().includes('raw'));
                matGroup = rawMat ? rawMat.code : sapMaterialGroupsCache[0].code;
            } else {
                matGroup = '100005';
            }
        }

        const matType = matData.ProductType || matData.materialType || 'ROH';
        const poText = matData.poText || matData.ProductDescription || productName || '';
        const movingAvg = matData.MovingAveragePrice ?? valCalc.movingAveragePrice;
        const standard = matData.StandardPrice ?? valCalc.standardPrice;
        const procedure = valCalc.procedure || matData.InventoryValuationProcedure || matData.priceControl || '';
        const valuationArea = plantFromApi;

        setItems((prev) =>
            prev.map((item, idx) => {
                if (idx !== targetIdx) return item;
                return {
                    ...item,
                    material_code: productCode || item.material_code,
                    plant: plantFromApi || item.plant,
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
     * Hit SAP CDS View API (/sap-materials) passing material number and plant
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
                plant: targetPlant,
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
                        (it.Plant && String(it.Plant).trim() === targetPlant) ||
                        (it.ValuationArea && String(it.ValuationArea).trim() === targetPlant)
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
                ((m.Product && String(m.Product).trim().toLowerCase() === trimmedMat.toLowerCase()) ||
                (m.code && String(m.code).trim().toLowerCase() === trimmedMat.toLowerCase())) &&
                (!targetPlant || !m.Plant || String(m.Plant).trim() === targetPlant)
        );
        if (localMatch) {
            applyMaterialToItem(targetIdx, localMatch, targetPlant);
        }

        // 2. Fetch live from SAP API passing material number and plant
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
     * Hit SAP S/4HANA Cloud CDS View (YY1_PRODUCTPLANTVALUATION_CDS) API for Materials & Plant Valuation F4 Search Help.
     * Shows Product, Plant, ProductType, BaseUnit, Price Control (V/S), and Valuation Price.
     */
    const handleOpenMaterialSearchHelp = async (targetIndex: number, currentCode?: string, plantCode?: string) => {
        setActiveItemIndex(targetIndex);
        const targetPlant = (plantCode || items[targetIndex]?.plant || defaultPlant).trim();

        if (sapMaterialsCache.length > 0) {
            setSearchHelpState({
                isOpen: true,
                title: 'Select Material & Plant Valuation - SAP S/4HANA Cloud (CDS: YY1_PRODUCTPLANTVALUATION_CDS)',
                subtitle: `SAP S/4HANA Cloud (CDS: YY1_PRODUCTPLANTVALUATION_CDS • ${sapMaterialsCache.length} items)`,
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
            title: 'Select Material & Plant Valuation - SAP S/4HANA Cloud (CDS: YY1_PRODUCTPLANTVALUATION_CDS)',
            subtitle: `Connecting to SAP S/4HANA Cloud (CDS: YY1_PRODUCTPLANTVALUATION_CDS)...`,
            options: dataCatalog.materials || [],
            selectedCode: currentCode || '',
            field: 'material_code',
            targetIndex,
            isLoading: true,
        });

        try {
            const res = await fetch('/sap-materials', {
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
                    subtitle: `SAP S/4HANA Cloud (CDS: YY1_PRODUCTPLANTVALUATION_CDS • ${data.items.length} items)`,
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

    /**
     * Hit SAP S/4HANA Cloud Value Help Service (ZUI_TMS_DESPATCH_04 / StorageLocationVH)
     * API for Storage Location F4 Search Help.
     * Shows StorageLocation (code), StorageLocationName (description), and Plant.
     */
    const handleOpenStorageLocationSearchHelp = async (
        targetIndex: number,
        currentCode?: string,
        plantCode?: string
    ) => {
        setActiveItemIndex(targetIndex);
        const targetPlant = (plantCode || items[targetIndex]?.plant || defaultPlant || '').trim();

        if (sapStorageLocationsCache.length > 0) {
            setSearchHelpState({
                isOpen: true,
                title: 'Select Storage Location - SAP S/4HANA Cloud (ZUI_TMS_DESPATCH_04 / StorageLocationVH)',
                subtitle: targetPlant
                    ? `SAP S/4HANA Cloud (StorageLocationVH • Plant ${targetPlant} • ${sapStorageLocationsCache.length} locations)`
                    : `SAP S/4HANA Cloud (StorageLocationVH • ${sapStorageLocationsCache.length} locations)`,
                options: sapStorageLocationsCache,
                selectedCode: currentCode || '',
                field: 'storage_location',
                targetIndex,
                isLoading: false,
                targetPlant,
            });
            return;
        }

        // Open modal immediately with loading state and fallback catalog
        setSearchHelpState({
            isOpen: true,
            title: 'Select Storage Location - SAP S/4HANA Cloud (ZUI_TMS_DESPATCH_04 / StorageLocationVH)',
            subtitle: targetPlant
                ? `Connecting to SAP S/4HANA Cloud (ZUI_TMS_DESPATCH_04 / StorageLocationVH for Plant ${targetPlant})...`
                : 'Connecting to SAP S/4HANA Cloud (ZUI_TMS_DESPATCH_04 / StorageLocationVH)...',
            options: (dataCatalog.storageLocations && dataCatalog.storageLocations.length > 0)
                ? dataCatalog.storageLocations
                : [],
            selectedCode: currentCode || '',
            field: 'storage_location',
            targetIndex,
            isLoading: true,
            targetPlant,
        });

        try {
            const res = await fetch('/sap-storage-locations', {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                setSapStorageLocationsCache(data.items);
                setSearchHelpState((prev) => ({
                    ...prev,
                    options: data.items,
                    subtitle: targetPlant
                        ? `SAP S/4HANA Cloud (StorageLocationVH • Plant ${targetPlant} • ${data.items.length} locations)`
                        : `SAP S/4HANA Cloud (StorageLocationVH • ${data.items.length} locations)`,
                    isLoading: false,
                    targetPlant,
                }));
            } else {
                setSearchHelpState((prev) => ({
                    ...prev,
                    subtitle: 'No storage locations returned from SAP StorageLocationVH',
                    isLoading: false,
                }));
            }
        } catch (err) {
            console.error('Failed to fetch storage locations from SAP StorageLocationVH service:', err);
            setSearchHelpState((prev) => ({
                ...prev,
                subtitle: 'Failed to connect to SAP Cloud StorageLocationVH Service',
                isLoading: false,
            }));
        }
    };

    /**
     * Hit SAP S/4HANA Cloud CDS View (YY1_MATERIALGROUP_CDS) API for Material Group F4 Search Help.
     * Shows MaterialGroup (Code) and MaterialGroupName (Description).
     * Used for Service line items (for Material items, the group is auto-selected).
     */
    const handleOpenMaterialGroupSearchHelp = async (targetIndex: number, currentCode?: string) => {
        setActiveItemIndex(targetIndex);

        if (sapMaterialGroupsCache.length > 0) {
            setSearchHelpState({
                isOpen: true,
                title: 'Select Material Group - SAP S/4HANA Cloud (CDS: YY1_MATERIALGROUP_CDS)',
                subtitle: `SAP S/4HANA Cloud (CDS: YY1_MATERIALGROUP_CDS • ${sapMaterialGroupsCache.length} groups)`,
                options: sapMaterialGroupsCache,
                selectedCode: currentCode || '',
                field: 'material_group',
                targetIndex,
                isLoading: false,
            });
            return;
        }

        // Open modal immediately with loading state and initial catalog
        setSearchHelpState({
            isOpen: true,
            title: 'Select Material Group - SAP S/4HANA Cloud (CDS: YY1_MATERIALGROUP_CDS)',
            subtitle: 'Connecting to SAP S/4HANA Cloud (CDS: YY1_MATERIALGROUP_CDS)...',
            options: (dataCatalog.materialGroups && dataCatalog.materialGroups.length > 0) ? dataCatalog.materialGroups : [],
            selectedCode: currentCode || '',
            field: 'material_group',
            targetIndex,
            isLoading: true,
        });

        try {
            const res = await fetch('/sap-material-groups', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                setSapMaterialGroupsCache(data.items);
                setSearchHelpState((prev) => ({
                    ...prev,
                    options: data.items,
                    subtitle: `SAP S/4HANA Cloud (CDS: YY1_MATERIALGROUP_CDS • ${data.items.length} groups)`,
                    isLoading: false,
                }));
            } else {
                setSearchHelpState((prev) => ({
                    ...prev,
                    subtitle: 'No material groups returned from SAP CDS View',
                    isLoading: false,
                }));
            }
        } catch (err) {
            console.error('Failed to fetch material groups from SAP CDS view:', err);
            setSearchHelpState((prev) => ({
                ...prev,
                subtitle: 'Failed to connect to SAP Cloud Material Group CDS View',
                isLoading: false,
            }));
        }
    };

    /**
     * Hit SAP S/4HANA Cloud CDS View (YY1_I_GLACCOUNTINCOMPANYCO_CDS) API for G/L Account F4 Search Help.
     * Uses GLAccount, CompanyCode, and GLAccountName.
     */
    const handleOpenGlAccountSearchHelp = async (targetIndex: number, currentCode?: string) => {
        setActiveItemIndex(targetIndex);
        const targetCompanyCode = companyCode || '1000';

        if (sapGlAccountsCache.length > 0) {
            setSearchHelpState({
                isOpen: true,
                title: 'Select G/L Account - SAP S/4HANA Cloud (CDS: YY1_I_GLACCOUNTINCOMPANYCO_CDS)',
                subtitle: `SAP S/4HANA Cloud (CDS: YY1_I_GLACCOUNTINCOMPANYCO_CDS • ${sapGlAccountsCache.length} accounts)`,
                options: sapGlAccountsCache,
                selectedCode: currentCode || '',
                field: 'gl_account',
                targetIndex,
                isLoading: false,
            });
            return;
        }

        // Open modal immediately with loading state and fallback catalog
        setSearchHelpState({
            isOpen: true,
            title: 'Select G/L Account - SAP S/4HANA Cloud (CDS: YY1_I_GLACCOUNTINCOMPANYCO_CDS)',
            subtitle: 'Connecting to SAP S/4HANA Cloud (CDS: YY1_I_GLACCOUNTINCOMPANYCO_CDS)...',
            options: dataCatalog.glAccounts || [],
            selectedCode: currentCode || '',
            field: 'gl_account',
            targetIndex,
            isLoading: true,
        });

        try {
            const res = await fetch(`/sap-gl-accounts?companyCode=${encodeURIComponent(targetCompanyCode)}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                setSapGlAccountsCache(data.items);
                setSearchHelpState((prev) => ({
                    ...prev,
                    options: data.items,
                    subtitle: `SAP S/4HANA Cloud (CDS: YY1_I_GLACCOUNTINCOMPANYCO_CDS • ${data.items.length} accounts)`,
                    isLoading: false,
                }));
            } else {
                setSearchHelpState((prev) => ({
                    ...prev,
                    subtitle: 'No G/L accounts returned from SAP CDS View',
                    isLoading: false,
                }));
            }
        } catch (err) {
            console.error('Failed to fetch G/L accounts from SAP CDS view:', err);
            setSearchHelpState((prev) => ({
                ...prev,
                subtitle: 'Failed to connect to SAP Cloud G/L Account CDS View',
                isLoading: false,
            }));
        }
    };

    /**
     * Hit SAP S/4HANA Cloud CDS View (YY1_COSTCENTER_CDS) API for Cost Center F4 Search Help.
     * Uses CostCenter, ControllingArea, CompanyCode, ProfitCenter, and Plant.
     */
    const handleOpenCostCenterSearchHelp = async (targetIndex: number, currentCode?: string) => {
        setActiveItemIndex(targetIndex);
        const targetCompanyCode = companyCode || '1000';

        if (sapCostCentersCache.length > 0) {
            setSearchHelpState({
                isOpen: true,
                title: 'Select Cost Center - SAP S/4HANA Cloud (CDS: YY1_COSTCENTER_CDS)',
                subtitle: `SAP S/4HANA Cloud (CDS: YY1_COSTCENTER_CDS • ${sapCostCentersCache.length} cost centers)`,
                options: sapCostCentersCache,
                selectedCode: currentCode || '',
                field: 'cost_center',
                targetIndex,
                isLoading: false,
            });
            return;
        }

        // Open modal immediately with loading state and fallback catalog
        setSearchHelpState({
            isOpen: true,
            title: 'Select Cost Center - SAP S/4HANA Cloud (CDS: YY1_COSTCENTER_CDS)',
            subtitle: 'Connecting to SAP S/4HANA Cloud (CDS: YY1_COSTCENTER_CDS)...',
            options: dataCatalog.costCenters || [],
            selectedCode: currentCode || '',
            field: 'cost_center',
            targetIndex,
            isLoading: true,
        });

        try {
            const res = await fetch(`/sap-cost-centers?companyCode=${encodeURIComponent(targetCompanyCode)}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                setSapCostCentersCache(data.items);
                setSearchHelpState((prev) => ({
                    ...prev,
                    options: data.items,
                    subtitle: `SAP S/4HANA Cloud (CDS: YY1_COSTCENTER_CDS • ${data.items.length} cost centers)`,
                    isLoading: false,
                }));
            } else {
                setSearchHelpState((prev) => ({
                    ...prev,
                    subtitle: 'No cost centers returned from SAP CDS View',
                    isLoading: false,
                }));
            }
        } catch (err) {
            console.error('Failed to fetch cost centers from SAP CDS view:', err);
            setSearchHelpState((prev) => ({
                ...prev,
                subtitle: 'Failed to connect to SAP Cloud Cost Center CDS View',
                isLoading: false,
            }));
        }
    };

    /**
     * Hit SAP S/4HANA Cloud CDS View (YY1_SUPPLIER_CDS) API for Supplier / Vendor F4 Search Help.
     * Uses Supplier (code), SupplierName (name), SupplierFullName, and BPSupplierName.
     * Applicable for Desired Vendor (desired_supplier) and Fixed Vendor (fixed_vendor).
     */
    const handleOpenSupplierSearchHelp = async (
        field: 'desired_supplier' | 'fixed_vendor',
        targetIndex: number,
        currentCode?: string
    ) => {
        setActiveItemIndex(targetIndex);
        const fieldLabel = field === 'desired_supplier' ? 'Desired Vendor' : 'Fixed Vendor';

        if (sapSuppliersCache.length > 0) {
            setSearchHelpState({
                isOpen: true,
                title: `Select ${fieldLabel} - SAP S/4HANA Cloud (CDS: YY1_SUPPLIER_CDS)`,
                subtitle: `SAP S/4HANA Cloud (CDS: YY1_SUPPLIER_CDS • ${sapSuppliersCache.length} suppliers)`,
                options: sapSuppliersCache,
                selectedCode: currentCode || '',
                field,
                targetIndex,
                isLoading: false,
            });
            return;
        }

        // Open modal immediately with loading state and fallback catalog
        setSearchHelpState({
            isOpen: true,
            title: `Select ${fieldLabel} - SAP S/4HANA Cloud (CDS: YY1_SUPPLIER_CDS)`,
            subtitle: 'Connecting to SAP S/4HANA Cloud (CDS: YY1_SUPPLIER_CDS)...',
            options: dataCatalog.desiredSuppliers || [],
            selectedCode: currentCode || '',
            field,
            targetIndex,
            isLoading: true,
        });

        try {
            const res = await fetch('/sap-suppliers', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                setSapSuppliersCache(data.items);
                setSearchHelpState((prev) => ({
                    ...prev,
                    options: data.items,
                    subtitle: `SAP S/4HANA Cloud (CDS: YY1_SUPPLIER_CDS • ${data.items.length} suppliers)`,
                    isLoading: false,
                }));
            } else {
                setSearchHelpState((prev) => ({
                    ...prev,
                    subtitle: 'No suppliers returned from SAP CDS View',
                    isLoading: false,
                }));
            }
        } catch (err) {
            console.error('Failed to fetch suppliers from SAP CDS view:', err);
            setSearchHelpState((prev) => ({
                ...prev,
                subtitle: 'Failed to connect to SAP Cloud Supplier CDS View',
                isLoading: false,
            }));
        }
    };

    /**
     * Hit SAP S/4HANA Cloud CDS View (YY1_PURCHASEORGANIZATION_CDS) API for Purchase Organisation F4 Search Help.
     * Uses PurchasingOrganization (code), PurchasingOrganizationName (name), and mapped plants.
     */
    const handleOpenPurchasingOrgSearchHelp = async (targetIndex: number, currentCode?: string) => {
        setActiveItemIndex(targetIndex);

        if (sapPurchasingOrgsCache.length > 0) {
            setSearchHelpState({
                isOpen: true,
                title: 'Select Purchase Organisation - SAP S/4HANA Cloud (CDS: YY1_PURCHASEORGANIZATION_CDS)',
                subtitle: `SAP Purchasing Organizations (${sapPurchasingOrgsCache.length} organizations)`,
                options: sapPurchasingOrgsCache,
                selectedCode: currentCode || '',
                field: 'purchasing_organization',
                targetIndex,
                isLoading: false,
            });
            return;
        }

        // Open modal immediately with loading state and fallback from dataCatalog
        setSearchHelpState({
            isOpen: true,
            title: 'Select Purchase Organisation - SAP S/4HANA Cloud (CDS: YY1_PURCHASEORGANIZATION_CDS)',
            subtitle: 'Loading Purchasing Organizations from Database / SAP Cloud...',
            options: dataCatalog.purchasingOrganizations || [],
            selectedCode: currentCode || '',
            field: 'purchasing_organization',
            targetIndex,
            isLoading: true,
        });

        try {
            const res = await fetch('/sap-purchasing-organizations', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                setSapPurchasingOrgsCache(data.items);
                setSearchHelpState((prev) => ({
                    ...prev,
                    options: data.items,
                    subtitle: `SAP Purchasing Organizations (${data.items.length} organizations)`,
                    isLoading: false,
                }));
            } else {
                setSearchHelpState((prev) => ({
                    ...prev,
                    options: dataCatalog.purchasingOrganizations || [],
                    subtitle: 'Loaded Purchasing Organizations',
                    isLoading: false,
                }));
            }
        } catch (err) {
            console.error('Failed to fetch purchasing organizations:', err);
            setSearchHelpState((prev) => ({
                ...prev,
                options: dataCatalog.purchasingOrganizations || [],
                subtitle: 'Loaded Cached Purchasing Organizations',
                isLoading: false,
            }));
        }
    };

    const getPurchasingOrgLabel = (code?: string) => {
        if (!code) return '';
        const allOrgs = sapPurchasingOrgsCache.length > 0 ? sapPurchasingOrgsCache : (dataCatalog.purchasingOrganizations || []);
        const found = allOrgs.find((o) => (o.PurchasingOrganization || o.code) === code);
        return found ? (found.PurchasingOrganizationName || found.purchasingOrgName || found.name || '') : '';
    };

    /**
     * Hit /sap-purchasing-groups API (or fallback to master data) for Purchasing Group F4 Search Help.
     * Shows PurchasingGroup (code) and PurchasingGroupName/description from App\Models\PurchasingGroup.
     */
    const handleOpenPurchasingGroupSearchHelp = async (targetIndex: number, currentCode?: string) => {
        setActiveItemIndex(targetIndex);

        if (sapPurchasingGroupsCache.length > 0) {
            setSearchHelpState({
                isOpen: true,
                title: 'Select Purchasing Group - SAP S/4HANA (EKGRP)',
                subtitle: `Purchasing Groups (${sapPurchasingGroupsCache.length} groups)`,
                options: sapPurchasingGroupsCache,
                selectedCode: currentCode || '',
                field: 'purchasing_group',
                targetIndex,
                isLoading: false,
            });
            return;
        }

        const fallback = dataCatalog.purchasingGroups || [];

        // Open modal immediately with loading state and fallback from dataCatalog
        setSearchHelpState({
            isOpen: true,
            title: 'Select Purchasing Group - SAP S/4HANA (EKGRP)',
            subtitle: 'Loading Purchasing Groups from Database...',
            options: fallback,
            selectedCode: currentCode || '',
            field: 'purchasing_group',
            targetIndex,
            isLoading: true,
        });

        try {
            const res = await fetch('/sap-purchasing-groups', {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const data = await res.json();
            const groups = data.purchasingGroups || data.items || [];
            if (groups && groups.length > 0) {
                const formatted = groups.map((g: any) => {
                    const desc = g.description || g.PurchasingGroupName || g.name || '';
                    return {
                        code: g.code,
                        name: desc,
                        PurchasingGroup: g.code,
                        PurchasingGroupName: desc,
                        description: desc,
                        extra: desc,
                    };
                });
                setSapPurchasingGroupsCache(formatted);
                setSearchHelpState((prev) => ({
                    ...prev,
                    options: formatted,
                    subtitle: `Purchasing Groups (${formatted.length} groups)`,
                    isLoading: false,
                }));
            } else {
                setSearchHelpState((prev) => ({
                    ...prev,
                    options: fallback,
                    subtitle: 'Loaded Purchasing Groups',
                    isLoading: false,
                }));
            }
        } catch (err) {
            console.error('Failed to fetch purchasing groups:', err);
            setSearchHelpState((prev) => ({
                ...prev,
                options: fallback,
                subtitle: 'Loaded Cached Purchasing Groups',
                isLoading: false,
            }));
        }
    };

    const getPurchasingGroupLabel = (code?: string) => {
        if (!code) return '';
        const allGroups = sapPurchasingGroupsCache.length > 0 ? sapPurchasingGroupsCache : (dataCatalog.purchasingGroups || []);
        const found = allGroups.find((g) => (g.PurchasingGroup || g.code) === code);
        return found ? (found.description || found.PurchasingGroupName || found.name || '') : '';
    };

    /**
     * Hit SAP S/4HANA Cloud CDS View (YY1_UNITOFMEASUREMENT_CDS) API for Unit of Measure F4 Search Help.
     * Uses UnitOfMeasure, UnitOfMeasureCommercialName, and UnitOfMeasureLongName with search functionality.
     */
    const handleOpenUnitOfMeasureSearchHelp = async (targetIndex: number, currentCode?: string) => {
        setActiveItemIndex(targetIndex);

        if (sapUnitsOfMeasureCache.length > 0) {
            setSearchHelpState({
                isOpen: true,
                title: 'Select Unit of Measure - SAP S/4HANA Cloud (CDS: YY1_UNITOFMEASUREMENT_CDS)',
                subtitle: `SAP Units of Measure (${sapUnitsOfMeasureCache.length} units)`,
                options: sapUnitsOfMeasureCache,
                selectedCode: currentCode || '',
                field: 'unit_of_measure',
                targetIndex,
                isLoading: false,
            });
            return;
        }

        // Open modal immediately with loading state and fallback catalog
        setSearchHelpState({
            isOpen: true,
            title: 'Select Unit of Measure - SAP S/4HANA Cloud (CDS: YY1_UNITOFMEASUREMENT_CDS)',
            subtitle: 'Connecting to SAP S/4HANA Cloud (CDS: YY1_UNITOFMEASUREMENT_CDS)...',
            options: dataCatalog.unitsOfMeasure || [],
            selectedCode: currentCode || '',
            field: 'unit_of_measure',
            targetIndex,
            isLoading: true,
        });

        try {
            const res = await fetch('/sap-units-of-measure', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                setSapUnitsOfMeasureCache(data.items);
                setSearchHelpState((prev) => ({
                    ...prev,
                    options: data.items,
                    subtitle: `SAP Units of Measure (${data.items.length} units)`,
                    isLoading: false,
                }));
            } else {
                setSearchHelpState((prev) => ({
                    ...prev,
                    subtitle: 'No units returned from SAP CDS View',
                    isLoading: false,
                }));
            }
        } catch (err) {
            console.error('Failed to fetch units of measure from SAP CDS view:', err);
            setSearchHelpState((prev) => ({
                ...prev,
                subtitle: 'Failed to connect to SAP Cloud CDS View',
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

        // Special handling when selecting Unit of Measure:
        if (field === 'unit_of_measure') {
            const uomCode = opt.UnitOfMeasure || opt.UnitOfMeasureCommercialName || opt.code;
            setItems((prev) =>
                prev.map((item, idx) => {
                    if (idx !== targetIdx) return item;
                    return {
                        ...item,
                        unit_of_measure: uomCode,
                    };
                })
            );
            if (targetIdx !== undefined && targetIdx >= 0) {
                setFieldErrors((prev) => {
                    const key = `item_${targetIdx}_unit_of_measure`;
                    if (!prev[key]) return prev;
                    const next = { ...prev };
                    delete next[key];
                    return next;
                });
            }
            return;
        }


        // Special handling when selecting Material Group:
        if (field === 'material_group') {
            const groupCode = opt.MaterialGroup || opt.code;
            setItems((prev) =>
                prev.map((item, idx) => {
                    if (idx !== targetIdx) return item;
                    return {
                        ...item,
                        material_group: groupCode,
                    };
                })
            );
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

        // Special handling when selecting Storage Location:
        if (field === 'storage_location') {
            const storLocCode = opt.StorageLocation || opt.code;
            const storLocPlant = opt.Plant || opt.plant;
            setItems((prev) =>
                prev.map((item, idx) => {
                    if (idx !== targetIdx) return item;
                    return {
                        ...item,
                        storage_location: storLocCode,
                        plant: item.plant || storLocPlant || item.plant,
                    };
                })
            );
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

        // Special handling when selecting G/L Account:
        if (field === 'gl_account') {
            const glCode = opt.GLAccount || opt.code;
            setItems((prev) =>
                prev.map((item, idx) => {
                    if (idx !== targetIdx) return item;
                    return {
                        ...item,
                        gl_account: glCode,
                    };
                })
            );
            return;
        }

        // Special handling when selecting Cost Center:
        if (field === 'cost_center') {
            const ccCode = opt.CostCenter || opt.code;
            setItems((prev) =>
                prev.map((item, idx) => {
                    if (idx !== targetIdx) return item;
                    return {
                        ...item,
                        cost_center: ccCode,
                    };
                })
            );
            return;
        }

        // Special handling when selecting Material: auto-populates Product, Plant, Description, UoM, and Valuation Price based on Price Control!
        if (field === 'material_code') {
            const productCode = opt.Product || opt.ProductExternalID || opt.code;
            const targetPlant = opt.Plant || opt.plant || items[targetIdx]?.plant || defaultPlant;

            // Immediately apply material attributes (including Plant from API) and calculate valuation price based on V / S Price Control
            applyMaterialToItem(targetIdx, opt, targetPlant);

            // Also query API passing selected material number and plant to verify live SAP valuation
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

        // Special handling when selecting Purchasing Organization:
        if (field === 'purchasing_organization') {
            const orgCode = opt.PurchasingOrganization || opt.code;
            setItems((prev) =>
                prev.map((item, idx) => {
                    if (idx !== targetIdx) return item;
                    return {
                        ...item,
                        purchasing_organization: orgCode,
                    };
                })
            );
            return;
        }

        // Special handling when selecting Purchasing Group:
        if (field === 'purchasing_group') {
            const pgCode = opt.PurchasingGroup || opt.code;
            setItems((prev) =>
                prev.map((item, idx) => {
                    if (idx !== targetIdx) return item;
                    return {
                        ...item,
                        purchasing_group: pgCode,
                    };
                })
            );
            return;
        }

        // Other fields: plant, item_category, account_assignment_category, material_type, material_group, unit_of_measure, storage_location, cost_center, gl_account, etc.
        setItems((prev) =>
            prev.map((item, idx) => (idx === targetIdx ? { ...item, [field]: opt.code } : item))
        );
        if (targetIdx !== undefined && targetIdx >= 0) {
            setFieldErrors((prev) => {
                const key = `item_${targetIdx}_${field}`;
                if (!prev[key]) return prev;
                const next = { ...prev };
                delete next[key];
                return next;
            });
        }
    };

    const clearFieldError = (key: string) => {
        setFieldErrors((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const updateCurrentItem = (updates: Partial<PrItemData>) => {
        setItems((prev) =>
            prev.map((item, idx) => (idx === activeItemIndex ? { ...item, ...updates } : item))
        );
        Object.keys(updates).forEach((k) => {
            clearFieldError(`item_${activeItemIndex}_${k}`);
        });
    };

    const updateItemById = (id: string, updates: Partial<PrItemData>) => {
        const itemIdx = items.findIndex((it) => it.id === id);
        setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
        );
        if (itemIdx >= 0) {
            Object.keys(updates).forEach((k) => {
                clearFieldError(`item_${itemIdx}_${k}`);
            });
        }
    };

    const handleAddItem = (type: 'material' | 'service' | '' = '') => {
        const nextNum = (items.length + 1) * 10;
        const itemNumberStr = String(nextNum).padStart(5, '0');
        const newItem = createEmptyPrItem(itemNumberStr, type);

        setItems((prev) => [...prev, newItem]);
        setActiveItemIndex(items.length);
    };

    const setItemType = (index: number, newType: 'material' | 'service') => {
        setItems((prev) =>
            prev.map((item, idx) => {
                if (idx !== index) return item;
                if (item.item_type === newType) return item;

                if (newType === 'service') {
                    return {
                        ...item,
                        item_type: 'service',
                        material_code: '',
                        account_assignment_category: item.account_assignment_category || 'K',
                        unit_of_measure: item.unit_of_measure === 'EA' ? '' : (item.unit_of_measure || ''),
                        moving_average_price: item.moving_average_price || '0.00',
                        standard_price: item.standard_price || '0.00',
                        inventory_valuation_procedure: item.inventory_valuation_procedure || '',
                        price_control: item.price_control || '',
                    };
                }


                // Material
                return {
                    ...item,
                    item_type: 'material',
                    account_assignment_category: item.account_assignment_category === 'K' ? '' : item.account_assignment_category,
                };
            })
        );
    };

    const handleClearItem = (index: number) => {
        setItems((prev) =>
            prev.map((item, idx) => {
                if (idx !== index) return item;
                return {
                    ...item,
                    item_type: '', // Clear type selection so user can re-select Material or Service
                    material_type: '',
                    item_category: '',
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
                    unit_of_measure: '',
                    unit_price: '',
                    price_unit: 1,
                    currency: currency,
                    tax_code: '',
                    po_price_type: 'Do not adopt',
                    plant: '',
                    storage_location: '',
                    account_assignment_category: '',
                    requirement_tracking_number: '',
                    cost_center: '',
                    gl_account: '',
                    purchasing_organization: '',
                    purchasing_group: defaultPurchasingGroup,
                    planned_delivery_time: 0,
                    gr_processing_time: 0,
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
                    valuation_area: '',
                    valuation_price_source: '',
                };
            })
        );
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
    const calculateTotal = React.useCallback(() => {
        return items.reduce((sum, item) => {
            const pu = Number(item.price_unit) > 0 ? Number(item.price_unit) : 1;
            const itemTotal = ((Number(item.quantity) || 0) / pu) * (Number(item.unit_price) || 0);
            return sum + itemTotal;
        }, 0);
    }, [items]);

    // Automatically recalculate Total PR Value and in Words whenever line items change
    React.useEffect(() => {
        const total = calculateTotal();
        const words = total > 0 ? convertAmountToWords(total) : '';

        setContractRequisition((prev) => {
            const prevTotal = Number(prev.total_pr_value) || 0;
            if (prevTotal === total && prev.total_pr_value_in_word === words && prev.total_pr_value !== '') {
                return prev;
            }
            return {
                ...prev,
                total_pr_value: total,
                total_pr_value_in_word: words,
            };
        });
    }, [calculateTotal]);

    const currentItemTotal = () => {
        if (!currentItem) return 0;
        const pu = currentItem.price_unit > 0 ? currentItem.price_unit : 1;
        return ((Number(currentItem.quantity) || 0) / pu) * (Number(currentItem.unit_price) || 0);
    };

    // CSRF Token Helper
    const getCsrfToken = (): string => {
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) {
            const val = metaTag.getAttribute('content');
            if (val) return val;
        }
        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        if (match) {
            return decodeURIComponent(match[1]);
        }
        return '';
    };

    // Tab Error Indicator Helper
    const getItemTabHasError = (tabId: string, itemIdx: number) => {
        const prefix = `item_${itemIdx}_`;
        if (tabId === 'general') {
            return Boolean(
                fieldErrors[prefix + 'item_type'] ||
                fieldErrors[prefix + 'material_code'] ||
                fieldErrors[prefix + 'description'] ||
                fieldErrors[prefix + 'plant'] ||
                fieldErrors[prefix + 'material_group'] ||
                fieldErrors[prefix + 'item_category']
            );
        }
        if (tabId === 'quantity-date') {
            return Boolean(fieldErrors[prefix + 'quantity']);
        }
        if (tabId === 'valuation') {
            return Boolean(
                fieldErrors[prefix + 'unit_price'] ||
                fieldErrors[prefix + 'unit_of_measure'] ||
                fieldErrors[prefix + 'currency']
            );
        }
        if (tabId === 'account-assignment') {
            return Boolean(
                fieldErrors[prefix + 'account_assignment_category'] ||
                fieldErrors[prefix + 'cost_center'] ||
                fieldErrors[prefix + 'gl_account']
            );
        }
        if (tabId === 'contact-info') {
            return Boolean(
                fieldErrors[prefix + 'purchasing_group'] ||
                fieldErrors[prefix + 'purchasing_organization']
            );
        }
        return false;
    };

    // Comprehensive Field-Level Validation Function
    const validateForm = (isDraft: boolean): Record<string, string> => {
        const errs: Record<string, string> = {};

        // 1. Header Validation
        if (!isDraft && !description.trim()) {
            errs['header_description'] = 'Requisition Header Description is mandatory to sync with SAP.';
        }

        const validDocTypes = (dataCatalog.documentTypes || []).map((dt) => dt.code.toUpperCase());
        if (!prType) {
            errs['header_pr_type'] = 'Document Type is mandatory. Please select a Document Type.';
        } else if (validDocTypes.length > 0 && !validDocTypes.includes(prType.toUpperCase())) {
            errs['header_pr_type'] = `Invalid Document Type '${prType}'. Please select a valid document type from the list.`;
        }

        // 2. Line Items Validation
        if (!items || items.length === 0) {
            errs['general'] = 'At least one line item is required to create a Purchase Requisition.';
            return errs;
        }

        const validPlants = Array.from(new Set([
            ...(dataCatalog.plants || []).map((p) => p.code.toUpperCase()),
            ...sapPlantsCache.map((p) => p.code.toUpperCase()),
            '1100', '1200', '1300', '1400',
        ]));

        const validPurchasingGroups = Array.from(new Set([
            ...(dataCatalog.purchasingGroups || []).map((pg) => pg.code.toUpperCase()),
            ...sapPurchasingGroupsCache.map((pg) => pg.code.toUpperCase()),
            ...(defaultPurchasingGroup ? [defaultPurchasingGroup.toUpperCase()] : []),
            '101', '102', '103', '104', '105', '106', '107', '108', '109', '110',
        ]));

        const validPurchasingOrgs = Array.from(new Set([
            ...(dataCatalog.purchasingOrganizations || []).map((po) => po.code.toUpperCase()),
            ...sapPurchasingOrgsCache.map((po) => po.code.toUpperCase()),
            '1100', '1000',
        ]));

        const validItemCats = Array.from(new Set([
            '',
            ...(dataCatalog.itemCategories || []).map((ic) => ic.code.toUpperCase()),
            'B', 'D', 'L', 'S', 'U',
        ]));

        const validAacs = Array.from(new Set([
            '',
            ...(dataCatalog.accountAssignmentCategories || []).map((aac) => aac.code.toUpperCase()),
            ...sapAccountAssignmentCategoriesCache.map((aac) => aac.code.toUpperCase()),
            'K', 'P', 'U', 'A', 'C', 'F',
        ]));

        const validUoms = Array.from(new Set([
            ...(dataCatalog.unitsOfMeasure || []).map((u) => u.code.toUpperCase()),
            ...sapUnitsOfMeasureCache.map((u) => (u.UnitOfMeasure || u.UnitOfMeasureCommercialName || u.code || '').toUpperCase()),
            'NO', 'EA', 'PC', 'KG', 'M', 'L', 'HR', 'DAY', 'SET', 'AU', 'LE', 'M3', 'TO', 'MON', 'JOB', 'LOT', '%',
        ]));


        items.forEach((it, idx) => {
            const prefix = `item_${idx}_`;

            // Item Type
            if (!it.item_type) {
                errs[prefix + 'item_type'] = 'Line item type must be selected (Material or Service).';
            }

            // Description
            if (!it.description || !it.description.trim()) {
                errs[prefix + 'description'] = 'Item Description is mandatory.';
            }

            // Material Number
            if (it.item_type === 'material') {
                if (!it.material_code || !it.material_code.trim()) {
                    errs[prefix + 'material_code'] = 'Material Number is mandatory for Material line items.';
                } else if (it.material_code.trim().toUpperCase() === 'NUTS') {
                    errs[prefix + 'material_code'] = "Material 'NUTS' is not maintained by Purchasing in Plant 1200 in SAP (ME/046). Please choose another material.";
                }
            }

            // Plant
            const plantUpper = (it.plant || '').trim().toUpperCase();
            if (!plantUpper) {
                errs[prefix + 'plant'] = 'Plant is mandatory. Please select a receiving plant.';
            } else if (validPlants.length > 0 && !validPlants.includes(plantUpper)) {
                errs[prefix + 'plant'] = `Invalid Plant '${it.plant}'. Must be a valid SAP plant (e.g. 1100, 1200, 1300, 1400).`;
            }

            // Purchasing Group
            const pgUpper = (it.purchasing_group || '').trim().toUpperCase();
            if (!pgUpper) {
                errs[prefix + 'purchasing_group'] = 'Purchasing Group is mandatory.';
            } else if (validPurchasingGroups.length > 0 && !validPurchasingGroups.includes(pgUpper)) {
                errs[prefix + 'purchasing_group'] = `Invalid Purchasing Group '${it.purchasing_group}'. Press F4 to select a valid group.`;
            }

            // Purchasing Organization
            const poUpper = (it.purchasing_organization || '').trim().toUpperCase();
            if (!poUpper) {
                errs[prefix + 'purchasing_organization'] = 'Purchasing Organization is mandatory.';
            } else if (validPurchasingOrgs.length > 0 && !validPurchasingOrgs.includes(poUpper)) {
                errs[prefix + 'purchasing_organization'] = `Invalid Purchasing Org '${it.purchasing_organization}'. Must match a valid Org (e.g. 1100).`;
            }

            // Item Category
            const icUpper = (it.item_category || '').trim().toUpperCase();
            if (icUpper && !validItemCats.includes(icUpper)) {
                errs[prefix + 'item_category'] = `Invalid Item Category '${it.item_category}'. Press F4 to select a valid category.`;
            }

            // Account Assignment Category (AAC)
            const aacUpper = (it.account_assignment_category || '').trim().toUpperCase();
            if (aacUpper === 'N') {
                errs[prefix + 'account_assignment_category'] = "Category 'N' (Network) is not supported in SAP S/4HANA Cloud (ME/066). Leave blank for Stock or select 'K' for Cost Center.";
            } else if (aacUpper && !validAacs.includes(aacUpper)) {
                errs[prefix + 'account_assignment_category'] = `Invalid Account Assignment Category '${it.account_assignment_category}'. Press F4 for help.`;
            }

            // Cost Center & G/L Account (Mandatory when AAC is K, especially on Sync)
            if (aacUpper === 'K' && !isDraft) {
                if (!it.gl_account || !it.gl_account.trim()) {
                    errs[prefix + 'gl_account'] = "G/L Account is mandatory when Account Assignment is 'K'.";
                }
                if (!it.cost_center || !it.cost_center.trim()) {
                    errs[prefix + 'cost_center'] = "Cost Center is mandatory when Account Assignment is 'K'.";
                }
            }

            // Quantity
            const qtyNum = Number(it.quantity);
            if (it.quantity === '' || isNaN(qtyNum) || qtyNum <= 0) {
                errs[prefix + 'quantity'] = 'Quantity must be a numeric value greater than 0.';
            }

            // Unit of Measure
            const uomUpper = (it.unit_of_measure || '').trim().toUpperCase();
            if (!uomUpper) {
                errs[prefix + 'unit_of_measure'] = 'Unit of Measure is mandatory.';
            } else if (validUoms.length > 0 && !validUoms.includes(uomUpper)) {
                errs[prefix + 'unit_of_measure'] = `Invalid Unit of Measure '${it.unit_of_measure}'. Press F4 to select a valid UoM.`;
            }

            // Valuation Price
            const priceNum = Number(it.unit_price);
            if (it.unit_price === '' || isNaN(priceNum) || priceNum < 0) {
                errs[prefix + 'unit_price'] = 'Valuation Price cannot be negative.';
            }

            // Material Group
            if (!it.material_group || !it.material_group.trim()) {
                errs[prefix + 'material_group'] = 'Material Group is mandatory.';
            }
        });

        return errs;
    };

    // User triggers submission via "Save as Draft" or "Sync with SAP"
    const handleInitiateSubmit = (isDraft: boolean) => {
        const errs = validateForm(isDraft);
        if (Object.keys(errs).length > 0) {
            setFieldErrors(errs);
            setErrorMessage('Validation errors found: Please fix all highlighted fields with red borders below.');

            // Automatically navigate to the first invalid line item and tab
            for (let i = 0; i < items.length; i++) {
                const prefix = `item_${i}_`;
                const itemErrKeys = Object.keys(errs).filter((k) => k.startsWith(prefix));
                if (itemErrKeys.length > 0) {
                    setActiveItemIndex(i);
                    const firstKey = itemErrKeys[0];
                    if (firstKey.includes('quantity')) {
                        setActiveItemTab('quantity-date');
                    } else if (firstKey.includes('unit_price') || firstKey.includes('unit_of_measure') || firstKey.includes('currency')) {
                        setActiveItemTab('valuation');
                    } else if (firstKey.includes('account_assignment') || firstKey.includes('cost_center') || firstKey.includes('gl_account')) {
                        setActiveItemTab('account-assignment');
                    } else if (firstKey.includes('purchasing_group') || firstKey.includes('purchasing_organization')) {
                        setActiveItemTab('contact-info');
                    } else {
                        setActiveItemTab('general');
                    }
                    break;
                }
            }
            return;
        }

        setFieldErrors({});
        setErrorMessage(null);
        // All validated -> open confirmation popup!
        setConfirmModal({ isOpen: true, isDraft });
    };

    // Actual submission to backend via AJAX (called when confirmed in popup)
    const submitForm = async (isDraft: boolean) => {
        setErrorMessage(null);

        if (isDraft) {
            setIsDrafting(true);
        } else {
            setSubmitting(true);
        }

        const endpoint = isEdit ? `/purchase-requisitions/${initialData.id}` : '/purchase-requisitions';
        const formData = new FormData();
        if (isEdit) {
            formData.append('_method', 'PUT');
        }
        formData.append('is_draft', isDraft ? '1' : '0');
        formData.append('description', description.trim() || currentItem?.description || (isDraft ? 'Draft Purchase Requisition' : 'Purchase Requisition'));
        formData.append('header_note', headerNote || '');
        if (headerOptionId) formData.append('header_option_id', headerOptionId);
        formData.append('pr_type', prType);
        formData.append('auto_source_determination', autoSourceDetermination ? '1' : '0');
        formData.append('company_code', companyCode || '1000');
        formData.append('plant', currentItem?.plant || '1000');
        formData.append('currency', currency);
        formData.append('requisitioner', requisitioner || defaultRequisitioner);

        // Contract Requisition
        formData.append('contract_requisition[cr_no]', contractRequisition.cr_no || '');
        formData.append('contract_requisition[contract_title]', contractRequisition.contract_title || '');
        formData.append('contract_requisition[scope_of_work]', contractRequisition.scope_of_work || '');
        formData.append('contract_requisition[payment_terms]', contractRequisition.payment_terms || '');
        formData.append('contract_requisition[bidders_qualification_criteria]', contractRequisition.bidders_qualification_criteria || '');
        formData.append('contract_requisition[special_terms_condition]', contractRequisition.special_terms_condition || '');
        formData.append('contract_requisition[guarantee_warranty_period]', contractRequisition.guarantee_warranty_period || '');
        formData.append('contract_requisition[defect_liability_period]', contractRequisition.defect_liability_period || '');
        formData.append('contract_requisition[others]', contractRequisition.others || '');
        formData.append('contract_requisition[requisitioner_name]', contractRequisition.requisitioner_name || requisitioner || defaultRequisitioner);
        formData.append('contract_requisition[req_designation]', contractRequisition.req_designation || defaultDesignation);
        formData.append('contract_requisition[req_department]', contractRequisition.req_department || defaultDepartment);
        formData.append('contract_requisition[tender_type]', contractRequisition.tender_type || 'Single');
        formData.append('contract_requisition[tender_estimate_value]', contractRequisition.tender_estimate_value || 'Excluding GST');
        formData.append('contract_requisition[total_pr_value]', String(Number(contractRequisition.total_pr_value) || calculateTotal()));
        formData.append('contract_requisition[total_pr_value_in_word]', contractRequisition.total_pr_value_in_word || (calculateTotal() > 0 ? convertAmountToWords(calculateTotal()) : ''));

        // Items
        items.forEach((it, index) => {
            if ((it as any).item_id) {
                formData.append(`items[${index}][id]`, String((it as any).item_id));
            }
            formData.append(`items[${index}][item_number]`, it.item_number);
            formData.append(`items[${index}][item_type]`, it.item_type || 'material');
            if (it.material_type) formData.append(`items[${index}][material_type]`, it.material_type);
            if (it.item_category) formData.append(`items[${index}][item_category]`, it.item_category);
            formData.append(`items[${index}][description]`, it.description || 'Draft Item');
            if (it.material_code) formData.append(`items[${index}][material_code]`, it.material_code);
            if (it.supplier_material_number || it.manufacturer_part_number) {
                formData.append(`items[${index}][supplier_material_number]`, it.manufacturer_part_number || it.supplier_material_number || '');
                formData.append(`items[${index}][manufacturer_part_number]`, it.manufacturer_part_number || it.supplier_material_number || '');
            }
            if (it.batch) formData.append(`items[${index}][batch]`, it.batch);
            if (it.revision_level) formData.append(`items[${index}][revision_level]`, it.revision_level);
            formData.append(`items[${index}][material_group]`, it.material_group || 'YBPM01');
            if (it.desired_supplier || it.fixed_vendor) {
                formData.append(`items[${index}][desired_supplier]`, it.desired_supplier || it.fixed_vendor || '');
                formData.append(`items[${index}][fixed_vendor]`, it.fixed_vendor || '');
            }
            if (it.supplying_plant) formData.append(`items[${index}][supplying_plant]`, it.supplying_plant);
            if (it.agreement_number) formData.append(`items[${index}][agreement_number]`, it.agreement_number);
            if (it.agreement_item) formData.append(`items[${index}][agreement_item]`, it.agreement_item);
            if (it.info_record) formData.append(`items[${index}][info_record]`, it.info_record);
            formData.append(`items[${index}][quantity]`, String(Number(it.quantity) > 0 ? it.quantity : 1));
            formData.append(`items[${index}][unit_of_measure]`, it.unit_of_measure || 'PC');
            formData.append(`items[${index}][unit_price]`, String(Number(it.unit_price) >= 0 ? it.unit_price : 0));
            formData.append(`items[${index}][price_unit]`, String(it.price_unit || 1));
            formData.append(`items[${index}][currency]`, it.currency || currency);
            if (it.tax_code) formData.append(`items[${index}][tax_code]`, it.tax_code);
            if (it.po_price_type) formData.append(`items[${index}][po_price_type]`, it.po_price_type);
            formData.append(`items[${index}][plant]`, it.plant || currentItem?.plant || '1000');
            if (it.storage_location) formData.append(`items[${index}][storage_location]`, it.storage_location);
            if (it.account_assignment_category) formData.append(`items[${index}][account_assignment_category]`, it.account_assignment_category);
            if (it.requirement_tracking_number) formData.append(`items[${index}][requirement_tracking_number]`, it.requirement_tracking_number);
            if (it.cost_center) formData.append(`items[${index}][cost_center]`, it.cost_center);
            if (it.gl_account) formData.append(`items[${index}][gl_account]`, it.gl_account);
            formData.append(`items[${index}][purchasing_organization]`, it.purchasing_organization || '1100');
            formData.append(`items[${index}][purchasing_group]`, it.purchasing_group || defaultPurchasingGroup);
            if (it.delivery_date) formData.append(`items[${index}][delivery_date]`, it.delivery_date);
            if (it.requisition_date) formData.append(`items[${index}][requisition_date]`, it.requisition_date);
            if (it.release_date) formData.append(`items[${index}][release_date]`, it.release_date);
            if (it.planned_delivery_time !== undefined) formData.append(`items[${index}][planned_delivery_time]`, String(it.planned_delivery_time));
            if (it.gr_processing_time !== undefined) formData.append(`items[${index}][gr_processing_time]`, String(it.gr_processing_time));
            if (it.item_text) formData.append(`items[${index}][item_text]`, it.item_text);
            if (it.item_note) formData.append(`items[${index}][item_note]`, it.item_note);
            if (it.delivery_text) formData.append(`items[${index}][delivery_text]`, it.delivery_text);
            if (it.material_po_text) formData.append(`items[${index}][material_po_text]`, it.material_po_text);
            if (it.closure_comment) formData.append(`items[${index}][closure_comment]`, it.closure_comment);
            if (it.attachment_doc_type) formData.append(`items[${index}][attachment_doc_type]`, it.attachment_doc_type);
            if (it.attachment_name) formData.append(`items[${index}][attachment_name]`, it.attachment_name);
            if (it.attachment_file) formData.append(`items[${index}][attachment_file]`, it.attachment_file);
        });

        try {
            const csrfToken = getCsrfToken();
            const res = await fetch(endpoint, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
                },
            });

            const data = await res.json().catch(() => null);

            setSubmitting(false);
            setIsDrafting(false);

            if (res.status === 422 && data?.errors) {
                const newFieldErrors: Record<string, string> = {};
                Object.keys(data.errors).forEach((errKey) => {
                    const normalized = errKey.replace(/^items\.(\d+)\./, 'item_$1_');
                    newFieldErrors[normalized] = Array.isArray(data.errors[errKey])
                        ? data.errors[errKey][0]
                        : data.errors[errKey];
                });
                setFieldErrors(newFieldErrors);
                const firstMsg = Object.values(newFieldErrors)[0];
                setErrorMessage(firstMsg || 'Please correct the highlighted validation errors.');
                setConfirmModal(null);
                return;
            }

            if (!res.ok || (data && data.success === false)) {
                setErrorMessage(data?.message || 'Failed to save Purchase Requisition.');
                setConfirmModal(null);
                return;
            }

            // Success! Open Success Modal
            setConfirmModal(null);
            setSuccessModal({
                isOpen: true,
                prNumber: data?.pr_number || (initialData?.pr_number ?? 'PR-SUCCESS'),
                sapPrNumber: data?.sap_pr_number || undefined,
                isDraft: Boolean(data?.is_draft),
                message: data?.message || (isDraft ? 'Purchase Requisition saved as Draft in local database.' : 'Purchase Requisition created and synced with SAP S/4HANA Cloud!'),
                prId: data?.pr_id || (initialData?.id ?? ''),
                totalAmount: data?.total_amount || calculateTotal(),
                currency: data?.currency || currency,
            });
        } catch (err: any) {
            setSubmitting(false);
            setIsDrafting(false);
            setConfirmModal(null);
            setErrorMessage(err?.message || 'Network error occurred while connecting to server.');
        }
    };

    const handleCreateAnotherPr = () => {
        setDescription('');
        setHeaderNote('');
        setPrType(defaultDocType);
        setHeaderOptionId('');
        const initialItem = createEmptyPrItem('00010');
        setItems([initialItem]);
        setActiveItemIndex(0);
        setActiveItemTab('general');
        setFieldErrors({});
        setErrorMessage(null);
        setSuccessModal(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleInitiateSubmit(false);
    };

    const handleSaveDraft = (e: React.MouseEvent) => {
        e.preventDefault();
        handleInitiateSubmit(true);
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
                                {isEdit ? `Edit PR: ${initialData.pr_number}` : 'New Purchase Requisition'}
                            </h1>
                            {isEdit ? (
                                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-300">
                                    Draft Mode (Editable)
                                </span>
                            ) : (
                                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-[#0070f2]">
                                    SAP S/4HANA Cloud (Public Edition)
                                </span>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-[#556b82]">
                            {isEdit
                                ? `Editing draft PR in local database (is_draft = 1) • Modify fields or sync directly to SAP Cloud`
                                : (description || 'New Requisition')}
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
                            title={isEdit ? "Update changes as Draft in local database (is_draft = 1)" : "Save as Draft in local database (is_draft = 1) without syncing to SAP"}
                        >
                            <Save className={`h-3.5 w-3.5 ${isDrafting ? 'animate-spin' : ''}`} />
                            <span>
                                {isDrafting
                                    ? (isEdit ? 'Updating Draft...' : 'Saving Draft...')
                                    : (isEdit ? 'Update Draft' : 'Save as Draft')}
                            </span>
                        </button>

                        <button
                            type="submit"
                            disabled={submitting || isDrafting}
                            className="flex items-center gap-2 rounded-md bg-[#0070f2] px-5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#0057c2] active:bg-[#003884] disabled:opacity-50"
                            title="Finalize draft and sync with SAP S/4HANA Cloud"
                        >
                            <Send className={`h-3.5 w-3.5 ${submitting ? 'animate-spin' : ''}`} />
                            <span>
                                {submitting
                                    ? 'Syncing with SAP Cloud...'
                                    : (isEdit ? 'Save & Sync to SAP' : 'Sync with SAP')}
                            </span>
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

                <div className="p-6 space-y-5">
                    {/* Top Row: Description & Document Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Purchase Requisition Description */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-semibold text-[#1c2d42]">
                                    Purchase Requisition Description <span className="text-slate-400 font-normal">(Header)</span>
                                </label>
                            </div>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => {
                                    setDescription(e.target.value);
                                    clearFieldError('header_description');
                                }}
                                placeholder="Enter purchase requisition description..."
                                className={`h-9 w-full rounded-md border px-3 text-xs text-[#1c2d42] placeholder-[#8c9ba5] focus:outline-none transition-colors ${
                                    fieldErrors['header_description']
                                        ? 'border-rose-500 bg-rose-50/20 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-rose-900'
                                        : 'border-[#d9e2ec] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                }`}
                            />
                            {fieldErrors['header_description'] && (
                                <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                    <span>{fieldErrors['header_description']}</span>
                                </p>
                            )}
                        </div>

                        {/* Document Type */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-semibold text-[#1c2d42]">
                                    Document Type <span className="text-rose-500">*</span>
                                </label>
                            </div>
                            <select
                                value={prType}
                                onChange={(e) => {
                                    setPrType(e.target.value);
                                    clearFieldError('header_pr_type');
                                }}
                                className={`h-9 w-full rounded-md border px-3 text-xs text-[#1c2d42] focus:outline-none bg-white transition-colors ${
                                    fieldErrors['header_pr_type']
                                        ? 'border-rose-500 bg-rose-50/20 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-rose-900'
                                        : 'border-[#d9e2ec] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                }`}
                                required
                            >
                                {dataCatalog.documentTypes.map((dt) => (
                                    <option key={dt.code} value={dt.code}>
                                        {dt.name}
                                    </option>
                                ))}
                            </select>
                            {fieldErrors['header_pr_type'] ? (
                                <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                    <span>{fieldErrors['header_pr_type']}</span>
                                </p>
                            ) : (() => {
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
                    </div>

                    {/* Requisitioner Details: 1. Requisitioner Name, 2. Req. Designation, 3. Req. Department */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-3 border-t border-slate-100">
                        {/* 1. Requisitioner Name */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-semibold text-[#1c2d42]">
                                    Requisitioner Name
                                </label>
                                <span className="text-[10px] text-slate-400 font-medium">Auto (User Model)</span>
                            </div>
                            <input
                                type="text"
                                value={contractRequisition.requisitioner_name || requisitioner || defaultRequisitioner || ''}
                                disabled
                                readOnly
                                placeholder="Requisitioner Name"
                                title="Auto-filled from User profile (read-only)"
                                className="h-9 w-full rounded-md border border-[#d9e2ec] bg-slate-100 px-3 text-xs font-medium text-[#556b82] placeholder-[#8c9ba5] cursor-not-allowed select-none focus:outline-none"
                            />
                        </div>

                        {/* 2. Req. Designation */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-semibold text-[#1c2d42]">
                                    Req. Designation
                                </label>
                                <span className="text-[10px] text-slate-400 font-medium">Auto (User Model)</span>
                            </div>
                            <input
                                type="text"
                                value={contractRequisition.req_designation || defaultDesignation || ''}
                                disabled
                                readOnly
                                placeholder="Req. Designation"
                                title="Auto-filled from User profile designation (read-only)"
                                className="h-9 w-full rounded-md border border-[#d9e2ec] bg-slate-100 px-3 text-xs font-medium text-[#556b82] placeholder-[#8c9ba5] cursor-not-allowed select-none focus:outline-none"
                            />
                        </div>

                        {/* 3. Req. Department */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-semibold text-[#1c2d42]">
                                    Req. Department
                                </label>
                                <span className="text-[10px] text-slate-400 font-medium">Auto (User Model)</span>
                            </div>
                            <input
                                type="text"
                                value={contractRequisition.req_department || defaultDepartment || ''}
                                disabled
                                readOnly
                                placeholder="Req. Department"
                                title="Auto-filled from User profile department (read-only)"
                                className="h-9 w-full rounded-md border border-[#d9e2ec] bg-slate-100 px-3 text-xs font-medium text-[#556b82] placeholder-[#8c9ba5] cursor-not-allowed select-none focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Tender Details: 4. Tender Type, 5. Tender Estimated Value */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-3 border-t border-slate-100">
                        {/* 4. Tender Type */}
                        <div className="rounded-lg border border-[#d9e2ec] bg-slate-50/50 p-3">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-bold text-[#1c2d42]">
                                    Tender Type
                                </label>
                                <span className="text-[10px] font-semibold text-[#0070f2] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                    Single Select
                                </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {(['Single', 'Open', 'Openlimited', 'Limited'] as const).map((opt) => {
                                    const isSelected = (contractRequisition.tender_type || 'Single') === opt;
                                    return (
                                        <label
                                            key={opt}
                                            className={`flex items-center gap-2 p-2 rounded-md border text-xs font-semibold cursor-pointer transition-all ${
                                                isSelected
                                                    ? 'border-[#0070f2] bg-blue-50/90 text-[#0070f2] ring-1 ring-[#0070f2]'
                                                    : 'border-[#d9e2ec] bg-white text-[#1c2d42] hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="header_tender_type"
                                                value={opt}
                                                checked={isSelected}
                                                onChange={() => updateContractRequisition({ tender_type: opt })}
                                                className="h-3.5 w-3.5 text-[#0070f2] border-slate-300 focus:ring-[#0070f2]"
                                            />
                                            <span className="truncate">{opt}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 5. Tender Estimated Value */}
                        <div className="rounded-lg border border-[#d9e2ec] bg-slate-50/50 p-3">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-bold text-[#1c2d42]">
                                    Tender Estimated Value
                                </label>
                                <span className="text-[10px] font-semibold text-[#0070f2] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                    Tax Basis
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(['Excluding GST', 'Including GST'] as const).map((opt) => {
                                    const isSelected = (contractRequisition.tender_estimate_value || 'Excluding GST') === opt;
                                    return (
                                        <label
                                            key={opt}
                                            className={`flex items-center gap-2 p-2 rounded-md border text-xs font-semibold cursor-pointer transition-all ${
                                                isSelected
                                                    ? 'border-[#0070f2] bg-blue-50/90 text-[#0070f2] ring-1 ring-[#0070f2]'
                                                    : 'border-[#d9e2ec] bg-white text-[#1c2d42] hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="header_tender_estimate_value"
                                                value={opt}
                                                checked={isSelected}
                                                onChange={() => updateContractRequisition({ tender_estimate_value: opt })}
                                                className="h-3.5 w-3.5 text-[#0070f2] border-slate-300 focus:ring-[#0070f2]"
                                            />
                                            <span className="truncate">{opt}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Valuation: 6. Total PR Value, 7. Total PR Value in Words */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-slate-100">
                        {/* 6. Total PR Value */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-semibold text-[#1c2d42]">
                                    Total PR Value ({currency})
                                </label>
                                <span className="text-[10px] text-slate-400 font-medium">
                                    Auto-calculated from items
                                </span>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    disabled
                                    readOnly
                                    value={
                                        contractRequisition.total_pr_value !== undefined && contractRequisition.total_pr_value !== ''
                                            ? Number(contractRequisition.total_pr_value).toLocaleString(undefined, {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                              })
                                            : calculateTotal().toLocaleString(undefined, {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                              })
                                    }
                                    placeholder="0.00"
                                    className="h-9 w-full rounded-md border border-[#d9e2ec] bg-slate-100 px-3 text-xs font-bold font-mono text-[#1c2d42] cursor-not-allowed select-none focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* 7. Total PR Value In Words */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-semibold text-[#1c2d42]">
                                    Total PR Value in Words
                                </label>
                                <span className="text-[10px] text-slate-400 font-medium">
                                    Auto-generated in words
                                </span>
                            </div>
                            <input
                                type="text"
                                disabled
                                readOnly
                                value={
                                    contractRequisition.total_pr_value_in_word ||
                                    (calculateTotal() > 0 ? convertAmountToWords(calculateTotal()) : '')
                                }
                                placeholder="Auto-generated in words..."
                                className="h-9 w-full rounded-md border border-[#d9e2ec] bg-slate-100 px-3 text-xs text-[#1c2d42] cursor-not-allowed select-none focus:outline-none font-medium"
                            />
                        </div>
                    </div>

                    {/* Automatic Source Determination Checkbox */}
                    {/* <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
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
                    </div> */}
                </div>
            </div>

            {/* SECTION: PR HEADER - Notes & Contract Requisition Tabs */}
            <div className="rounded-xl border border-[#d9e2ec] bg-white shadow-xs overflow-hidden">
                <div className="border-b border-[#d9e2ec] bg-[#f8fafc] px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-800">
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                        </div>
                        <h2 className="text-sm font-bold text-[#1c2d42]">Header: Notes & Contract Requisition Details</h2>
                    </div>
                    <span className="text-[11px] text-[#556b82]">PR Header & Contract Specifications</span>
                </div>

                <div className="p-6 space-y-6">
                    {/* Header Note Field */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-semibold text-[#1c2d42]">
                                Header Note
                            </label>
                            <span className="text-[10px] text-[#556b82]">PR Header Note</span>
                        </div>
                        <textarea
                            rows={3}
                            value={headerNote}
                            onChange={(e) => setHeaderNote(e.target.value)}
                            placeholder="Type any high-level approval justification, procurement instructions, or work-related notes here..."
                            className="w-full rounded-md border border-[#d9e2ec] p-3 text-xs text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                        />
                    </div>

                    {/* Contract Requisition Specifications Tabbed Section */}
                    <div className="rounded-lg border border-[#d9e2ec] bg-white shadow-2xs overflow-hidden">
                        {/* Subheader banner */}
                        <div className="border-b border-[#d9e2ec] bg-gradient-to-r from-[#f8fafc] via-blue-50/30 to-[#f8fafc] px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#1c2d42] uppercase tracking-wider">
                                    Contract Requisition Specifications
                                </span>
                                <span className="rounded-full bg-blue-100 text-[#0070f2] px-2 py-0.5 text-[10px] font-bold">
                                    SAP CBO
                                </span>
                            </div>
                            <span className="text-[11px] text-[#556b82]">
                                Select a tab to view and edit detailed contract notes and terms
                            </span>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="border-b border-[#d9e2ec] bg-[#f8fafc] px-3 overflow-x-auto no-scrollbar">
                            <nav className="flex space-x-1 py-1.5">
                                {CR_NOTE_TABS.map((tab) => {
                                    const isActive = activeCrNoteTab === tab.id;
                                    const val = String(contractRequisition[tab.field as keyof ContractRequisitionData] || '');
                                    const hasContent = val.trim().length > 0;
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setActiveCrNoteTab(tab.id)}
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

                        {/* Tab Content Panel with Textarea */}
                        <div className="p-5 bg-white">
                            {(() => {
                                const currentTab = CR_NOTE_TABS.find((t) => t.id === activeCrNoteTab) || CR_NOTE_TABS[0];
                                const currentVal = String(contractRequisition[currentTab.field as keyof ContractRequisitionData] || '');
                                return (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="block text-xs font-semibold text-[#1c2d42]">
                                                    {currentTab.title}
                                                </label>
                                                <p className="text-[11px] text-[#556b82]">
                                                    {currentTab.helpText}
                                                </p>
                                            </div>
                                            <span className="text-[10px] text-[#556b82] font-mono">
                                                {currentVal.length} / {currentTab.maxLength} chars
                                            </span>
                                        </div>
                                        <textarea
                                            rows={currentTab.rows}
                                            maxLength={currentTab.maxLength}
                                            value={currentVal}
                                            onChange={(e) => updateContractRequisition({ [currentTab.field]: e.target.value })}
                                            placeholder={currentTab.placeholder}
                                            className="w-full rounded-md border border-[#d9e2ec] p-3 text-xs text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none bg-white transition-colors"
                                        />
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
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

                    {/* Action buttons: Create Dropdown, Copy, Clear, Delete */}
                    <div className="flex items-center gap-2">
                        {/* Create Dropdown (Material / Service) */}
                        <div className="relative inline-block text-left">
                            <div className="inline-flex rounded-md shadow-xs">
                                <button
                                    type="button"
                                    onClick={() => handleAddItem('material')}
                                    className="flex items-center gap-1.5 rounded-l-md bg-[#0070f2] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0057c2] transition-colors"
                                    title="Add new material line item"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>Material</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAddItem('service')}
                                    className="flex items-center gap-1 rounded-r-md border-l border-blue-400 bg-[#0070f2] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0057c2] transition-colors"
                                    title="Add new service line item"
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
                            onClick={() => handleClearItem(activeItemIndex)}
                            className="flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors shadow-xs"
                            title="Clear wrongly input data in the selected line item"
                        >
                            <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
                            <span>Clear Item</span>
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
                    <table className="w-full text-left text-xs text-[#1c2d42] min-w-[1300px] border-collapse">
                        <thead className="sticky top-0 z-10 bg-[#f8fafc] text-[11px] font-semibold text-[#556b82] border-b border-slate-200 shadow-[0_1px_0_0_#e2e8f0]">
                            <tr>
                                <th className="py-2.5 px-3 w-16 bg-[#f8fafc]">Item</th>
                                <th className="py-2.5 px-2.5 w-32 bg-[#f8fafc]">Type</th>
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
                                        Purch. Group
                                    </span>
                                </th>
                                <th className="py-2.5 px-2.5 w-24 bg-[#f8fafc]">
                                    <span className="flex items-center gap-1">
                                        Mat. Group
                                        <span className="text-[9px] font-bold text-[#0070f2] bg-blue-50 border border-blue-200 px-1 py-0.2 rounded">F4</span>
                                    </span>
                                </th>
                               
                                <th className="py-2.5 px-2.5 w-32 text-right bg-[#f8fafc]">Valuation Price</th>
                                <th className="py-2.5 px-2.5 w-28 text-right bg-[#f8fafc]">Total Value</th>
                                <th className="py-2.5 px-2 w-16 text-center bg-[#f8fafc]">Action</th>
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
                                        {/* Item Type Badge / Selector: Material vs Service */}
                                        <td className="py-2 px-2.5">
                                            {!it.item_type ? (
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveItemIndex(idx);
                                                                setItemType(idx, 'material');
                                                            }}
                                                            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold transition-all shadow-xs ${
                                                                fieldErrors[`item_${idx}_item_type`]
                                                                    ? 'bg-rose-50 border border-rose-400 text-rose-700 hover:bg-rose-100'
                                                                    : 'bg-blue-50 border border-blue-300 text-[#0070f2] hover:bg-[#0070f2] hover:text-white'
                                                            }`}
                                                            title="Select Material type (Auto-collects from SAP)"
                                                        >
                                                            <Package className="h-3 w-3" /> Mat.
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveItemIndex(idx);
                                                                setItemType(idx, 'service');
                                                            }}
                                                            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold transition-all shadow-xs ${
                                                                fieldErrors[`item_${idx}_item_type`]
                                                                    ? 'bg-rose-50 border border-rose-400 text-rose-700 hover:bg-rose-100'
                                                                    : 'bg-purple-50 border border-purple-300 text-purple-700 hover:bg-purple-700 hover:text-white'
                                                            }`}
                                                            title="Select Service type"
                                                        >
                                                            <Wrench className="h-3 w-3" /> Serv.
                                                        </button>
                                                    </div>
                                                    {fieldErrors[`item_${idx}_item_type`] && (
                                                        <p className="text-[10px] text-rose-600 font-semibold leading-tight flex items-center gap-0.5">
                                                            <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                                                            <span>Select Type</span>
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="relative flex flex-col">
                                                    <select
                                                        value={it.item_type}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => {
                                                            setActiveItemIndex(idx);
                                                            setItemType(idx, e.target.value as 'material' | 'service');
                                                        }}
                                                        className={`h-7 rounded border text-[10px] font-bold pl-1.5 pr-5 py-0.5 focus:outline-none cursor-pointer transition-colors ${
                                                            fieldErrors[`item_${idx}_item_type`]
                                                                ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500'
                                                                : it.item_type === 'material'
                                                                ? 'border-blue-300 bg-blue-50 text-[#0070f2] focus:border-[#0070f2]'
                                                                : 'border-purple-300 bg-purple-50 text-purple-700 focus:border-purple-500'
                                                        }`}
                                                    >
                                                        <option value="material">📦 Material</option>
                                                        <option value="service">🔧 Service</option>
                                                    </select>
                                                </div>
                                            )}
                                        </td>
                                         {/* Item Category with F4 */}
                                        <td className="py-2 px-2.5">
                                            <div className="relative flex flex-col">
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
                                                        className={`h-8 w-full rounded border pr-7 pl-2 text-xs font-mono placeholder-[#8c9ba5] focus:outline-none transition-colors ${
                                                            fieldErrors[`item_${idx}_item_category`]
                                                                ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                                : 'border-[#d9e2ec] bg-white text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                                        }`}
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
                                                {fieldErrors[`item_${idx}_item_category`] && (
                                                    <p className="mt-1 text-[10px] text-rose-600 font-semibold leading-tight flex items-start gap-0.5">
                                                        <AlertCircle className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                                                        <span>{fieldErrors[`item_${idx}_item_category`]}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        {/* Account Assignment Category with F4 */}
                                        <td className="py-2 px-2.5">
                                            <div className="relative flex flex-col">
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
                                                        placeholder={it.item_type === 'service' ? 'K' : 'Blank'}
                                                        title={it.item_type === 'service' ? "Account Assignment: 'K' (Cost Center) typically required for Service line items" : "Account Assignment: Blank for Stock/Inventory materials, K for Cost Center"}
                                                        className={`h-8 w-full rounded border pr-7 pl-2 text-xs font-mono text-center placeholder-[#8c9ba5] focus:outline-none transition-colors ${
                                                            fieldErrors[`item_${idx}_account_assignment_category`]
                                                                ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                                : 'border-[#d9e2ec] bg-white text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                                        }`}
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
                                                {fieldErrors[`item_${idx}_account_assignment_category`] && (
                                                    <p className="mt-1 text-[10px] text-rose-600 font-semibold leading-tight flex items-start gap-0.5">
                                                        <AlertCircle className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                                                        <span>{fieldErrors[`item_${idx}_account_assignment_category`]}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        {/* Material Number with F4 Search Help (Optional for Service) */}
                                        <td className="py-2 px-2.5">
                                            {!it.item_type ? (
                                                <div className={`h-8 w-full rounded border border-dashed px-2 flex items-center justify-center text-[10px] font-semibold select-none ${
                                                    fieldErrors[`item_${idx}_material_code`]
                                                        ? 'border-rose-400 bg-rose-50/50 text-rose-700'
                                                        : 'border-amber-300 bg-amber-50/50 text-amber-700'
                                                }`}>
                                                    <span>Select Type first</span>
                                                </div>
                                            ) : (
                                                <div className="relative flex flex-col">
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
                                                                if (e.target.value.trim()) {
                                                                    triggerMaterialValuationLookup(idx, e.target.value, it.plant);
                                                                }
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'F4') {
                                                                    e.preventDefault();
                                                                    handleOpenMaterialSearchHelp(idx, it.material_code, it.plant);
                                                                } else if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    if (it.material_code?.trim()) {
                                                                        triggerMaterialValuationLookup(idx, it.material_code, it.plant);
                                                                    }
                                                                }
                                                            }}
                                                            placeholder={it.item_type === 'service' ? "Optional (F4)" : "DINING CHAIR (F4)"}
                                                            title={it.item_type === 'service' ? "Material Number (Optional for Service - Enter or select with F4)" : "Material Search Help (F4) - Hits SAP CDS View YY1_PRODUCTPLANTVALUATION_CDS"}
                                                            className={`h-8 w-full rounded border pr-7 pl-2 text-xs font-mono placeholder-[#8c9ba5] focus:outline-none transition-colors ${
                                                                fieldErrors[`item_${idx}_material_code`]
                                                                    ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                                    : 'border-[#d9e2ec] bg-white text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                                            } ${it.item_type === 'service' && !it.material_code ? 'placeholder:italic' : ''}`}
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
                                                                title={it.item_type === 'service' ? "Material Search Help (F4) - Optional for Service" : "Material Search Help (F4) - Hits SAP CDS View YY1_PRODUCTPLANTVALUATION_CDS"}
                                                            >
                                                                <Search className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {fieldErrors[`item_${idx}_material_code`] && (
                                                        <p className="mt-1 text-[10px] text-rose-600 font-semibold leading-tight flex items-start gap-0.5">
                                                            <AlertCircle className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                                                            <span>{fieldErrors[`item_${idx}_material_code`]}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        {/* Description */}
                                        <td className="py-2 px-2.5">
                                            <div className="relative flex flex-col">
                                                <input
                                                    type="text"
                                                    value={it.description || ''}
                                                    onFocus={() => setActiveItemIndex(idx)}
                                                    onChange={(e) => updateItemById(it.id, { description: e.target.value })}
                                                    placeholder={!it.item_type ? "Select Material or Service first" : it.item_type === 'material' ? "Material Description (Auto-collected)" : "Service Description (Required)"}
                                                    className={`h-8 w-full rounded border px-2 text-xs placeholder-[#8c9ba5] focus:outline-none transition-colors ${
                                                        fieldErrors[`item_${idx}_description`]
                                                            ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                            : 'border-[#d9e2ec] bg-white text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                                    }`}
                                                />
                                                {fieldErrors[`item_${idx}_description`] && (
                                                    <p className="mt-1 text-[10px] text-rose-600 font-semibold leading-tight flex items-start gap-0.5">
                                                        <AlertCircle className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                                                        <span>{fieldErrors[`item_${idx}_description`]}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                         {/* Quantity & Unit of Measure with F4 */}
                                        <td className="py-2 px-2.5">
                                            <div className="relative flex flex-col">
                                                <div className="flex items-center gap-1 justify-end">
                                                    <input
                                                        type="number"
                                                        value={it.quantity}
                                                        onFocus={() => setActiveItemIndex(idx)}
                                                        onChange={(e) => updateItemById(it.id, { quantity: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                                                        placeholder="Qty"
                                                        className={`h-8 w-14 rounded border px-1.5 text-xs text-right font-mono focus:outline-none transition-colors ${
                                                            fieldErrors[`item_${idx}_quantity`]
                                                                ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                                : 'border-[#d9e2ec] bg-white text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                                        }`}
                                                    />
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="text"
                                                            value={it.unit_of_measure || ''}
                                                            readOnly={Boolean(it.item_type === 'material' && it.material_code)}
                                                            onFocus={() => setActiveItemIndex(idx)}
                                                            onChange={(e) => updateItemById(it.id, { unit_of_measure: e.target.value })}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'F4') {
                                                                    e.preventDefault();
                                                                    if (!(it.item_type === 'material' && it.material_code)) {
                                                                        handleOpenUnitOfMeasureSearchHelp(idx, it.unit_of_measure);
                                                                    }
                                                                }
                                                            }}
                                                            placeholder="UoM"
                                                            title={it.item_type === 'material' && it.material_code ? "Auto-filled from Material Master" : "Unit of Measure (F4) - SAP CDS View YY1_UNITOFMEASUREMENT_CDS"}
                                                            className={`h-8 w-16 rounded border text-xs font-mono uppercase focus:outline-none transition-colors ${
                                                                it.item_type === 'material' && it.material_code
                                                                    ? 'bg-slate-100/80 text-slate-700 border-[#d9e2ec] cursor-not-allowed px-1.5 font-bold'
                                                                    : 'pr-5 pl-1.5 ' + (fieldErrors[`item_${idx}_unit_of_measure`]
                                                                        ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                                        : 'border-[#d9e2ec] bg-white text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]')
                                                            }`}
                                                        />
                                                        {(!(it.item_type === 'material' && it.material_code)) && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveItemIndex(idx);
                                                                    handleOpenUnitOfMeasureSearchHelp(idx, it.unit_of_measure);
                                                                }}
                                                                className="absolute right-0.5 text-[#0070f2] hover:bg-blue-100 p-0.5 rounded transition-colors"
                                                                title="UoM Search Help (F4) - SAP CDS View YY1_UNITOFMEASUREMENT_CDS"
                                                            >
                                                                <Search className="h-2.5 w-2.5" />
                                                            </button>
                                                        )}
                                                    </div>

                                                </div>
                                                {(fieldErrors[`item_${idx}_quantity`] || fieldErrors[`item_${idx}_unit_of_measure`]) && (
                                                    <p className="mt-1 text-[10px] text-rose-600 font-semibold leading-tight flex items-start gap-0.5 justify-end">
                                                        <AlertCircle className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                                                        <span>{fieldErrors[`item_${idx}_quantity`] || fieldErrors[`item_${idx}_unit_of_measure`]}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        {/* Plant with F4 (Populated from API for materials) */}
                                        <td className="py-2 px-2.5">
                                            <div className="relative flex flex-col">
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
                                                        title={it.item_type === 'material' ? "Plant: auto-collected from SAP CDS View YY1_PRODUCTPLANTVALUATION_CDS, or select with F4" : "Plant (F4)"}
                                                        className={`h-8 w-full rounded border pr-7 pl-2 text-xs font-mono placeholder-[#8c9ba5] focus:outline-none transition-colors ${
                                                            fieldErrors[`item_${idx}_plant`]
                                                                ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                                : 'border-[#d9e2ec] bg-white text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                                        }`}
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
                                                {fieldErrors[`item_${idx}_plant`] && (
                                                    <p className="mt-1 text-[10px] text-rose-600 font-semibold leading-tight flex items-start gap-0.5">
                                                        <AlertCircle className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                                                        <span>{fieldErrors[`item_${idx}_plant`]}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        
                                        {/* Purchasing Group */}
                                        <td className="py-2 px-2.5">
                                            <div className="relative flex flex-col">
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="text"
                                                        value={it.purchasing_group || ''}
                                                        onFocus={() => setActiveItemIndex(idx)}
                                                        onChange={(e) => updateItemById(it.id, { purchasing_group: e.target.value })}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'F4') {
                                                                e.preventDefault();
                                                                handleOpenPurchasingGroupSearchHelp(idx, it.purchasing_group);
                                                            }
                                                        }}
                                                        placeholder={defaultPurchasingGroup || '103'}
                                                        title="Purchasing Group (Press F4 for Help)"
                                                        className={`h-8 w-full rounded border pr-7 pl-2 text-xs font-mono placeholder-[#8c9ba5] focus:outline-none transition-colors ${
                                                            fieldErrors[`item_${idx}_purchasing_group`]
                                                                ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                                : 'border-[#d9e2ec] bg-white text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                                        }`}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveItemIndex(idx);
                                                            handleOpenPurchasingGroupSearchHelp(idx, it.purchasing_group);
                                                        }}
                                                        className="absolute right-1 text-[#0070f2] hover:bg-blue-100 p-0.5 rounded transition-colors"
                                                        title="Purchasing Group Search Help (F4)"
                                                    >
                                                        <Search className="h-3 w-3" />
                                                    </button>
                                                </div>
                                                {fieldErrors[`item_${idx}_purchasing_group`] && (
                                                    <p className="mt-1 text-[10px] text-rose-600 font-semibold leading-tight flex items-start gap-0.5">
                                                        <AlertCircle className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                                                        <span>{fieldErrors[`item_${idx}_purchasing_group`]}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        {/* Material Group */}
                                        <td className="py-2 px-2.5">
                                            <div className="relative flex flex-col">
                                                {it.item_type === 'material' ? (
                                                    /* Material: Auto-selected from SAP CDS View */
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="text"
                                                            value={it.material_group || ''}
                                                            readOnly
                                                            placeholder="Auto"
                                                            title="Material Group: Auto-selected for Material from SAP CDS View YY1_MATERIALGROUP_CDS"
                                                            className={`h-8 w-full rounded border pr-12 pl-2 text-xs font-mono font-medium text-slate-700 cursor-not-allowed focus:outline-none ${
                                                                fieldErrors[`item_${idx}_material_group`]
                                                                    ? 'border-rose-500 bg-rose-50/20 text-rose-900'
                                                                    : 'border-slate-200 bg-slate-50/80'
                                                            }`}
                                                        />
                                                        <span className="absolute right-1.5 inline-flex items-center rounded bg-blue-50 border border-blue-200 px-1 py-0.2 text-[9px] font-bold text-blue-700" title="Auto-selected for Material from SAP CDS View">
                                                            Auto
                                                        </span>
                                                    </div>
                                                ) : (
                                                    /* Service or unselected: Selected by F4 Search Help */
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="text"
                                                            value={it.material_group || ''}
                                                            onFocus={() => setActiveItemIndex(idx)}
                                                            onChange={(e) => updateItemById(it.id, { material_group: e.target.value })}
                                                            onClick={() => handleOpenMaterialGroupSearchHelp(idx, it.material_group)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'F4') {
                                                                    e.preventDefault();
                                                                    handleOpenMaterialGroupSearchHelp(idx, it.material_group);
                                                                }
                                                            }}
                                                            placeholder={it.item_type === 'service' ? "F4 Search" : "Group (F4)"}
                                                            title={it.item_type === 'service' ? "Material Group (F4) - Select from SAP CDS View YY1_MATERIALGROUP_CDS" : "Material Group (F4)"}
                                                            className={`h-8 w-full rounded border pr-7 pl-2 text-xs font-mono placeholder-[#8c9ba5] focus:outline-none transition-colors ${
                                                                fieldErrors[`item_${idx}_material_group`]
                                                                    ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                                    : 'border-[#d9e2ec] bg-white text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                                            }`}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenMaterialGroupSearchHelp(idx, it.material_group);
                                                            }}
                                                            className="absolute right-1 text-[#0070f2] hover:bg-blue-100 p-0.5 rounded transition-colors"
                                                            title="Material Group Search Help (F4) - Hits SAP CDS View YY1_MATERIALGROUP_CDS"
                                                        >
                                                            <Search className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                )}
                                                {fieldErrors[`item_${idx}_material_group`] && (
                                                    <p className="mt-1 text-[10px] text-rose-600 font-semibold leading-tight flex items-start gap-0.5">
                                                        <AlertCircle className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                                                        <span>{fieldErrors[`item_${idx}_material_group`]}</span>
                                                    </p>
                                                )}
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
                                                        className={`h-8 w-20 rounded border px-1.5 text-xs text-right font-mono font-medium focus:outline-none transition-colors ${
                                                            fieldErrors[`item_${idx}_unit_price`]
                                                                ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                                : it.item_type === 'material'
                                                                ? 'border-[#d9e2ec] bg-slate-50/70 font-semibold text-[#0070f2] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                                                : 'border-[#d9e2ec] bg-white text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                                        }`}
                                                        title={it.item_type === 'material' ? 'Auto-collected valuation price from SAP CDS View YY1_PRODUCTPLANTVALUATION_CDS' : 'Service Valuation / Rate'}
                                                    />
                                                    <span className="text-[10px] font-semibold text-[#556b82]">{it.currency || currency}</span>
                                                </div>
                                                {fieldErrors[`item_${idx}_unit_price`] && (
                                                    <p className="mt-1 text-[10px] text-rose-600 font-semibold leading-tight flex items-start gap-0.5 justify-end">
                                                        <AlertCircle className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                                                        <span>{fieldErrors[`item_${idx}_unit_price`]}</span>
                                                    </p>
                                                )}
                                                {it.item_type === 'material' && it.inventory_valuation_procedure === 'V' && (
                                                    <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200" title={`Price Control V: Moving Average Price = ${it.moving_average_price || it.unit_price} ${it.currency || currency}`}>
                                                        V (MAP)
                                                    </span>
                                                )}
                                                {it.item_type === 'material' && it.inventory_valuation_procedure === 'S' && (
                                                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200" title={`Price Control S: Standard Price = ${it.standard_price || it.unit_price} ${it.currency || currency}`}>
                                                        S (Std)
                                                    </span>
                                                )}
                                                {it.item_type === 'service' && (
                                                    <span className="text-[9px] font-medium text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-200">
                                                        Service Rate
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        {/* Total Value */}
                                        <td className="py-2 px-2.5 text-right font-bold font-mono text-[#1c2d42]">
                                            {lineTotal.toFixed(2)}
                                        </td>
                                        {/* Action / Clear & Delete */}
                                        <td className="py-2 px-2 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleClearItem(idx);
                                                    }}
                                                    className="text-slate-400 hover:text-amber-600 hover:bg-amber-50 p-1 rounded transition-colors"
                                                    title="Clear wrongly input data in this line item"
                                                >
                                                    <RotateCcw className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteItem(idx);
                                                    }}
                                                    disabled={items.length <= 1}
                                                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded transition-colors disabled:opacity-30 disabled:hover:text-slate-400"
                                                    title="Delete this line item"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
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
                                    const typeIcon = it.item_type === 'material' ? '📦 ' : it.item_type === 'service' ? '🔧 ' : '❓ ';
                                    const codePart = it.material_code ? `[${it.material_code}] ` : '';
                                    const descPart = it.description || (!it.item_type ? '(Select Material or Service)' : it.item_type === 'material' ? '(Empty Material)' : '(Empty Service)');
                                    const label = `Item ${it.item_number}: ${typeIcon}${codePart}${descPart}`;
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
                            const hasError = getItemTabHasError(tab.id, activeItemIndex);
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveItemTab(tab.id as any)}
                                    className={`relative border-b-2 px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                                        isActive
                                            ? 'border-[#0070f2] text-[#0070f2]'
                                            : hasError
                                            ? 'border-transparent text-rose-600 hover:text-rose-700'
                                            : 'border-transparent text-[#556b82] hover:border-slate-300 hover:text-[#1c2d42]'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    {hasError && (
                                        <span className="h-2 w-2 rounded-full bg-rose-500 ring-2 ring-rose-200 animate-pulse" />
                                    )}
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
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#556b82]">
                                        General Information (Item {currentItem?.item_number})
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => handleClearItem(activeItemIndex)}
                                        className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 hover:bg-amber-100 transition-colors shadow-xs"
                                        title="Clear all wrongly input data in this line item"
                                    >
                                        <RotateCcw className="h-3 w-3 text-amber-600" />
                                        <span>Clear Item Fields</span>
                                    </button>
                                </div>
                                <span className="text-[11px] text-[#0070f2] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                                    SAP F4 Search Help Available
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {/* Product Type Group */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Product Type Group (Select Type)
                                        </label>
                                        {!currentItem?.item_type && (
                                            <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                                Select type
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 h-9">
                                        <button
                                            type="button"
                                            onClick={() => setItemType(activeItemIndex, 'material')}
                                            className={`flex items-center justify-center gap-1.5 rounded-md border text-xs font-bold transition-all ${
                                                currentItem?.item_type === 'material'
                                                    ? 'border-[#0070f2] bg-blue-50 text-[#0070f2] shadow-xs ring-1 ring-[#0070f2]'
                                                    : fieldErrors[`item_${activeItemIndex}_item_type`]
                                                    ? 'border-rose-400 bg-rose-50/20 text-[#556b82] hover:bg-slate-50'
                                                    : 'border-[#d9e2ec] bg-white text-[#556b82] hover:bg-slate-50'
                                            }`}
                                        >
                                            <Package className="h-3.5 w-3.5" />
                                            <span>Material (1)</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setItemType(activeItemIndex, 'service')}
                                            className={`flex items-center justify-center gap-1.5 rounded-md border text-xs font-bold transition-all ${
                                                currentItem?.item_type === 'service'
                                                    ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-xs ring-1 ring-purple-600'
                                                    : fieldErrors[`item_${activeItemIndex}_item_type`]
                                                    ? 'border-rose-400 bg-rose-50/20 text-[#556b82] hover:bg-slate-50'
                                                    : 'border-[#d9e2ec] bg-white text-[#556b82] hover:bg-slate-50'
                                            }`}
                                        >
                                            <Wrench className="h-3.5 w-3.5" />
                                            <span>Service (2)</span>
                                        </button>
                                    </div>
                                    {fieldErrors[`item_${activeItemIndex}_item_type`] && (
                                        <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3 shrink-0" />
                                            <span>{fieldErrors[`item_${activeItemIndex}_item_type`]}</span>
                                        </p>
                                    )}
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        Choose Material (stock items) or Service (labor / contract)
                                    </span>
                                </div>

                                {/* Material Number (Search help) - Auto-populates all Material info & Valuation Price! */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Material Number (F4)
                                            {currentItem?.item_type === 'material' ? (
                                                <span className="text-rose-500 ml-0.5">*</span>
                                            ) : currentItem?.item_type === 'service' ? (
                                                <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-normal text-slate-600">
                                                    Optional for Service
                                                </span>
                                            ) : null}
                                        </label>
                                        {!currentItem?.item_type ? (
                                            <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                                Select Type above
                                            </span>
                                        ) : currentItem?.item_type === 'material' ? (
                                            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                                Auto-populates fields & Valuation Price
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                                Optional (F4 Search available)
                                            </span>
                                        )}
                                    </div>
                                    {!currentItem?.item_type ? (
                                        <div className={`h-9 w-full rounded-md border border-dashed px-3 flex items-center text-xs font-medium ${
                                            fieldErrors[`item_${activeItemIndex}_material_code`]
                                                ? 'border-rose-400 bg-rose-50/50 text-rose-800'
                                                : 'border-amber-300 bg-amber-50/50 text-amber-800'
                                        }`}>
                                            <span>Select Material or Service above to enable fields</span>
                                        </div>
                                    ) : (
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
                                                    if (e.target.value.trim()) {
                                                        triggerMaterialValuationLookup(activeItemIndex, e.target.value, currentItem?.plant);
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'F4') {
                                                        e.preventDefault();
                                                        handleOpenMaterialSearchHelp(activeItemIndex, currentItem?.material_code, currentItem?.plant);
                                                    } else if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        if (currentItem?.material_code?.trim()) {
                                                            triggerMaterialValuationLookup(activeItemIndex, currentItem?.material_code, currentItem?.plant);
                                                        }
                                                    }
                                                }}
                                                placeholder={currentItem?.item_type === 'service' ? "Optional: Service Material # or leave blank (F4)" : "DINING CHAIR (Type or press F4 for Search Help)"}
                                                className={`h-9 w-full rounded-md border pr-9 pl-3 text-xs font-mono focus:outline-none transition-colors ${
                                                    fieldErrors[`item_${activeItemIndex}_material_code`]
                                                        ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                        : 'border-[#d9e2ec] text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                                }`}
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
                                                    title={currentItem?.item_type === 'service' ? "Select Material (Optional) - F4 Search Help" : "Select Material - F4 Search Help (Hits SAP CDS View YY1_PRODUCTPLANTVALUATION_CDS)"}
                                                >
                                                    <Search className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    {fieldErrors[`item_${activeItemIndex}_material_code`] && (
                                        <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3 shrink-0" />
                                            <span>{fieldErrors[`item_${activeItemIndex}_material_code`]}</span>
                                        </p>
                                    )}
                                    <div className="mt-1 flex items-center justify-between text-[10px]">
                                        <span className="text-[#556b82]">
                                            {currentItem?.item_type === 'service'
                                                ? 'Optional for service line items. You can select a service material code or leave blank for a text service line.'
                                                : <>Plant / Valuation Area: <span className="font-semibold text-slate-700">{currentItem?.plant || 'Not selected'}</span></>}
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

                                {/* Purchasing Group */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Purchasing Group <span className="text-rose-500">*</span> (F4)
                                        </label>
                                        <span className="text-[10px] text-[#556b82]">Buyer / Org Code</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={currentItem?.purchasing_group || ''}
                                            onChange={(e) => updateCurrentItem({ purchasing_group: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === 'F4') {
                                                    e.preventDefault();
                                                    handleOpenPurchasingGroupSearchHelp(activeItemIndex, currentItem?.purchasing_group);
                                                }
                                            }}
                                            placeholder={`e.g. ${defaultPurchasingGroup || '103'}`}
                                            title="Purchasing Group (Press F4 for Help)"
                                            className={`h-9 w-full rounded-md border pr-9 pl-3 text-xs font-mono focus:outline-none transition-colors ${
                                                fieldErrors[`item_${activeItemIndex}_purchasing_group`]
                                                    ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                    : 'border-[#d9e2ec] text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                            }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleOpenPurchasingGroupSearchHelp(activeItemIndex, currentItem?.purchasing_group)}
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                            title="Select Purchasing Group (F4 Help)"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    {fieldErrors[`item_${activeItemIndex}_purchasing_group`] && (
                                        <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3 shrink-0" />
                                            <span>{fieldErrors[`item_${activeItemIndex}_purchasing_group`]}</span>
                                        </p>
                                    )}
                                    {getPurchasingGroupLabel(currentItem?.purchasing_group) ? (
                                        <span className="mt-1 block text-[11px] font-medium text-teal-700">
                                            {getPurchasingGroupLabel(currentItem?.purchasing_group)}
                                        </span>
                                    ) : (
                                        <span className="mt-1 block text-[10px] text-[#556b82]">
                                            Purchasing Group (Key for a buyer or group of buyers responsible for procurement activities)
                                        </span>
                                    )}
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
                                            className={`h-9 w-full rounded-md border pr-9 pl-3 text-xs font-mono focus:outline-none transition-colors ${
                                                fieldErrors[`item_${activeItemIndex}_plant`]
                                                    ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                    : 'border-[#d9e2ec] text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                            }`}
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
                                    {fieldErrors[`item_${activeItemIndex}_plant`] && (
                                        <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3 shrink-0" />
                                            <span>{fieldErrors[`item_${activeItemIndex}_plant`]}</span>
                                        </p>
                                    )}
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
                                            className={`h-9 w-full rounded-md border pr-9 pl-3 text-xs font-mono focus:outline-none transition-colors ${
                                                fieldErrors[`item_${activeItemIndex}_item_category`]
                                                    ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                    : 'border-[#d9e2ec] text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                            }`}
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
                                    {fieldErrors[`item_${activeItemIndex}_item_category`] && (
                                        <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3 shrink-0" />
                                            <span>{fieldErrors[`item_${activeItemIndex}_item_category`]}</span>
                                        </p>
                                    )}
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
                                            className={`h-9 w-full rounded-md border pr-9 pl-3 text-xs font-mono focus:outline-none transition-colors ${
                                                fieldErrors[`item_${activeItemIndex}_account_assignment_category`]
                                                    ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                    : 'border-[#d9e2ec] text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                            }`}
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
                                    {fieldErrors[`item_${activeItemIndex}_account_assignment_category`] && (
                                        <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3 shrink-0" />
                                            <span>{fieldErrors[`item_${activeItemIndex}_account_assignment_category`]}</span>
                                        </p>
                                    )}
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
                                        className={`h-9 w-full rounded-md border px-3 text-xs focus:outline-none transition-colors ${
                                            fieldErrors[`item_${activeItemIndex}_description`]
                                                ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                : 'border-[#d9e2ec] text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                        }`}
                                    />
                                    {fieldErrors[`item_${activeItemIndex}_description`] && (
                                        <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3 shrink-0" />
                                            <span>{fieldErrors[`item_${activeItemIndex}_description`]}</span>
                                        </p>
                                    )}
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        Material / Service Detail description
                                    </span>
                                </div>

                                {/* Material Group * */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Material Group <span className="text-rose-500">*</span>
                                            {currentItem?.item_type === 'material' ? (
                                                <span className="ml-2 inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                                                    Auto-Selected (Material)
                                                </span>
                                            ) : (
                                                <span className="ml-2 inline-flex items-center rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                                                    F4 Search Help (Service)
                                                </span>
                                            )}
                                        </label>
                                        <span className="text-[10px] text-[#556b82]">
                                            {currentItem?.item_type === 'material'
                                                ? 'Auto from Material Master'
                                                : 'SAP CDS: YY1_MATERIALGROUP_CDS'}
                                        </span>
                                    </div>
                                    <div className="relative">
                                        {currentItem?.item_type === 'material' ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={currentItem?.material_group || ''}
                                                    readOnly
                                                    placeholder="Auto-selected on Material selection"
                                                    title="Material Group: Auto-selected for Material from SAP CDS View YY1_MATERIALGROUP_CDS"
                                                    className={`h-9 w-full rounded-md border pr-24 pl-3 text-xs font-mono font-medium cursor-not-allowed focus:outline-none ${
                                                        fieldErrors[`item_${activeItemIndex}_material_group`]
                                                            ? 'border-rose-500 bg-rose-50/20 text-rose-900'
                                                            : 'border-slate-200 bg-slate-50 text-[#1c2d42]'
                                                    }`}
                                                />
                                                <div className="absolute top-1/2 right-2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-bold text-[#0070f2] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                                                    <span>Auto-Selected</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <input
                                                    type="text"
                                                    value={currentItem?.material_group || ''}
                                                    onClick={() =>
                                                        handleOpenMaterialGroupSearchHelp(
                                                            activeItemIndex,
                                                            currentItem?.material_group
                                                        )
                                                    }
                                                    onChange={(e) => updateCurrentItem({ material_group: e.target.value })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'F4') {
                                                            e.preventDefault();
                                                            handleOpenMaterialGroupSearchHelp(
                                                                activeItemIndex,
                                                                currentItem?.material_group
                                                            );
                                                        }
                                                    }}
                                                    placeholder="Click or press F4 to search Material Group..."
                                                    required
                                                    className={`h-9 w-full rounded-md border pr-9 pl-3 text-xs font-mono focus:outline-none transition-colors ${
                                                        fieldErrors[`item_${activeItemIndex}_material_group`]
                                                            ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                            : 'border-[#d9e2ec] text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                                    }`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleOpenMaterialGroupSearchHelp(
                                                            activeItemIndex,
                                                            currentItem?.material_group
                                                        )
                                                    }
                                                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                                    title="Material Group (Search Help - F4) - Hits SAP CDS View YY1_MATERIALGROUP_CDS"
                                                >
                                                    <Search className="h-3.5 w-3.5" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    {fieldErrors[`item_${activeItemIndex}_material_group`] && (
                                        <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3 shrink-0" />
                                            <span>{fieldErrors[`item_${activeItemIndex}_material_group`]}</span>
                                        </p>
                                    )}
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        {currentItem?.item_type === 'material'
                                            ? 'Auto-populated from SAP CDS View YY1_MATERIALGROUP_CDS when Material is selected.'
                                            : 'Click or press F4 to search & select Material Group from SAP CDS View YY1_MATERIALGROUP_CDS.'}
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
                                                    handleOpenStorageLocationSearchHelp(
                                                        activeItemIndex,
                                                        currentItem?.storage_location,
                                                        currentItem?.plant
                                                    );
                                                }
                                            }}
                                            placeholder="e.g. SL01, M100"
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleOpenStorageLocationSearchHelp(
                                                    activeItemIndex,
                                                    currentItem?.storage_location,
                                                    currentItem?.plant
                                                )
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                            title="Storage Location Search Help (F4) - Hits SAP Service ZUI_TMS_DESPATCH_04 / StorageLocationVH"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        Warehouse/bin location in plant (SAP Service: StorageLocationVH)
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
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const matched = (sapSuppliersCache.length > 0 ? sapSuppliersCache : (dataCatalog.desiredSuppliers || [])).find(
                                                    (s: any) => (s.Supplier || s.code) === val
                                                );
                                                updateCurrentItem({
                                                    desired_supplier: val,
                                                    ...(matched ? { supplier_name: matched.SupplierName || matched.name || matched.supplierName } : {}),
                                                    source_assigned: Boolean(val),
                                                });
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'F4') {
                                                    e.preventDefault();
                                                    handleOpenSupplierSearchHelp(
                                                        'desired_supplier',
                                                        activeItemIndex,
                                                        currentItem?.desired_supplier
                                                    );
                                                }
                                            }}
                                            placeholder="e.g. 1000011"
                                            className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleOpenSupplierSearchHelp(
                                                    'desired_supplier',
                                                    activeItemIndex,
                                                    currentItem?.desired_supplier
                                                )
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                            title="Desired Supplier (Search Help - F4)"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        {(() => {
                                            const selectedSupplier = (sapSuppliersCache.length > 0 ? sapSuppliersCache : (dataCatalog.desiredSuppliers || [])).find(
                                                (s: any) => (s.Supplier || s.code) === currentItem?.desired_supplier
                                            );
                                            if (selectedSupplier) {
                                                return (
                                                    <span className="font-semibold text-blue-700">
                                                        {selectedSupplier.SupplierName || selectedSupplier.name}
                                                    </span>
                                                );
                                            }
                                            return 'Vendor suggestion from requesting user department';
                                        })()}
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
                                        className={`h-9 w-full rounded-md border px-3 text-xs text-[#1c2d42] focus:outline-none transition-colors ${
                                            fieldErrors[`item_${activeItemIndex}_quantity`]
                                                ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                : 'border-[#d9e2ec] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                        }`}
                                    />
                                    {fieldErrors[`item_${activeItemIndex}_quantity`] && (
                                        <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3 shrink-0" />
                                            <span>{fieldErrors[`item_${activeItemIndex}_quantity`]}</span>
                                        </p>
                                    )}
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
                            {!currentItem?.item_type ? (
                                <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-4 text-center">
                                    <p className="text-xs font-semibold text-amber-800">
                                        Please select Item Type (Material or Service) in the General Information tab to configure valuation parameters.
                                    </p>
                                </div>
                            ) : currentItem?.item_type === 'material' ? (
                                <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="h-4 w-4 text-[#0070f2]" />
                                            <span className="text-xs font-bold text-slate-800">
                                                SAP Inventory Valuation & Price Control (YY1_ProductPlantValuation)
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-500">
                                            Plant / Valuation Area: <strong className="text-slate-800 font-mono">{currentItem?.plant || 'Not selected'}</strong>
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                        <div className="rounded bg-white p-2.5 border border-slate-200">
                                            <span className="text-[10px] text-[#556b82] block mb-0.5">Price Control (Procedure):</span>
                                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                                <span className="font-mono text-xs">{currentItem?.inventory_valuation_procedure || currentItem?.price_control || '-'}</span>
                                                {currentItem?.inventory_valuation_procedure === 'V' && (
                                                    <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1 py-0.5 rounded border border-blue-200">V (MAP)</span>
                                                )}
                                                {currentItem?.inventory_valuation_procedure === 'S' && (
                                                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">S (Standard)</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="rounded bg-white p-2.5 border border-slate-200">
                                            <span className="text-[10px] text-[#556b82] block mb-0.5">Moving Average Price:</span>
                                            <span className={`font-bold font-mono ${currentItem?.inventory_valuation_procedure === 'V' ? 'text-blue-700' : 'text-slate-800'}`}>
                                                {Number(currentItem?.moving_average_price || 0).toFixed(2)} {currentItem?.currency || currency}
                                                {currentItem?.inventory_valuation_procedure === 'V' && ' ✓'}
                                            </span>
                                        </div>
                                        <div className="rounded bg-white p-2.5 border border-slate-200">
                                            <span className="text-[10px] text-[#556b82] block mb-0.5">Standard Price:</span>
                                            <span className={`font-bold font-mono ${currentItem?.inventory_valuation_procedure === 'S' ? 'text-emerald-700' : 'text-slate-800'}`}>
                                                {Number(currentItem?.standard_price || 0).toFixed(2)} {currentItem?.currency || currency}
                                                {currentItem?.inventory_valuation_procedure === 'S' && ' ✓'}
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
                            ) : (
                                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Wrench className="h-4 w-4 text-amber-600" />
                                        <span className="text-xs font-bold text-slate-800">
                                            Service Line Item Valuation
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600">
                                        Service items do not reference SAP Material Master stock valuation. Please enter the estimated service rate or cost per service unit below.
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {/* Valuation Price * (Input) */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Valuation Price <span className="text-rose-500">*</span>
                                        </label>
                                        {currentItem?.item_type === 'material' ? (
                                            <>
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
                                            </>
                                        ) : (
                                            <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                                Estimated Service Rate
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
                                            className={`h-9 w-full rounded-md border px-3 text-xs font-semibold focus:outline-none transition-colors ${
                                                fieldErrors[`item_${activeItemIndex}_unit_price`]
                                                    ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                    : 'border-[#d9e2ec] text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                            }`}
                                        />
                                        {fetchingValuation[currentItem?.id || ''] && (
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[#0070f2]">
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                    {fieldErrors[`item_${activeItemIndex}_unit_price`] && (
                                        <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3 shrink-0" />
                                            <span>{fieldErrors[`item_${activeItemIndex}_unit_price`]}</span>
                                        </p>
                                    )}
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
                                            className={`h-9 w-full rounded-md border pr-9 pl-3 text-xs font-mono focus:outline-none transition-colors ${
                                                fieldErrors[`item_${activeItemIndex}_currency`]
                                                    ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                    : 'border-[#d9e2ec] text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                            }`}
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
                                    {fieldErrors[`item_${activeItemIndex}_currency`] && (
                                        <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3 shrink-0" />
                                            <span>{fieldErrors[`item_${activeItemIndex}_currency`]}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Unit of Measure * (Search help) */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Unit of Measure <span className="text-rose-500">*</span> (F4)
                                        </label>
                                        {currentItem?.item_type === 'material' && currentItem?.material_code ? (
                                            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                                Auto-filled from Material Master
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-[#556b82]">F4 Search Help (CDS: YY1_UNITOFMEASUREMENT_CDS)</span>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={currentItem?.unit_of_measure || ''}
                                            readOnly={Boolean(currentItem?.item_type === 'material' && currentItem?.material_code)}
                                            onChange={(e) => updateCurrentItem({ unit_of_measure: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === 'F4') {
                                                    e.preventDefault();
                                                    if (!(currentItem?.item_type === 'material' && currentItem?.material_code)) {
                                                        handleOpenUnitOfMeasureSearchHelp(activeItemIndex, currentItem?.unit_of_measure);
                                                    }
                                                }
                                            }}
                                            placeholder={currentItem?.item_type === 'material' && currentItem?.material_code ? "Auto-filled" : "Select UoM (F4)"}
                                            required
                                            className={`h-9 w-full rounded-md border text-xs font-mono uppercase focus:outline-none transition-colors ${
                                                currentItem?.item_type === 'material' && currentItem?.material_code
                                                    ? 'bg-slate-100/80 text-slate-700 border-[#d9e2ec] cursor-not-allowed px-3 font-bold'
                                                    : 'pr-9 pl-3 ' + (fieldErrors[`item_${activeItemIndex}_unit_of_measure`]
                                                        ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                        : 'border-[#d9e2ec] text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]')
                                            }`}
                                        />
                                        {(!(currentItem?.item_type === 'material' && currentItem?.material_code)) && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleOpenUnitOfMeasureSearchHelp(
                                                        activeItemIndex,
                                                        currentItem?.unit_of_measure
                                                    )
                                                }
                                                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                                title="Unit of Measure Search Help (F4) - SAP CDS View YY1_UNITOFMEASUREMENT_CDS"
                                            >
                                                <Search className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    {fieldErrors[`item_${activeItemIndex}_unit_of_measure`] && (
                                        <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3 shrink-0" />
                                            <span>{fieldErrors[`item_${activeItemIndex}_unit_of_measure`]}</span>
                                        </p>
                                    )}
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
                                            className={`h-9 w-full rounded-md border pr-9 pl-3 text-xs font-mono focus:outline-none transition-colors ${
                                                fieldErrors[`item_${activeItemIndex}_account_assignment_category`]
                                                    ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                    : 'border-[#d9e2ec] text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                            }`}
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
                                    {fieldErrors[`item_${activeItemIndex}_account_assignment_category`] && (
                                        <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3 shrink-0" />
                                            <span>{fieldErrors[`item_${activeItemIndex}_account_assignment_category`]}</span>
                                        </p>
                                    )}
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
                                                    handleOpenGlAccountSearchHelp(activeItemIndex, currentItem?.gl_account);
                                                }
                                            }}
                                            placeholder="12545200"
                                            className={`h-9 w-full rounded-md border pr-9 pl-3 text-xs font-mono focus:outline-none transition-colors ${
                                                fieldErrors[`item_${activeItemIndex}_gl_account`]
                                                    ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                    : 'border-[#d9e2ec] text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                            }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleOpenGlAccountSearchHelp(activeItemIndex, currentItem?.gl_account)}
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                            title="G/L Account (Search Help - F4)"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    {fieldErrors[`item_${activeItemIndex}_gl_account`] && (
                                        <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3 shrink-0" />
                                            <span>{fieldErrors[`item_${activeItemIndex}_gl_account`]}</span>
                                        </p>
                                    )}
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        {(() => {
                                            const selectedGl = (sapGlAccountsCache.length > 0 ? sapGlAccountsCache : (dataCatalog.glAccounts || [])).find(
                                                (g: any) => (g.GLAccount || g.code) === currentItem?.gl_account
                                            );
                                            if (selectedGl) {
                                                return (
                                                    <span className="font-semibold text-blue-700">
                                                        {selectedGl.GLAccountName || selectedGl.name} {selectedGl.CompanyCode ? `(${selectedGl.CompanyCode})` : ''}
                                                    </span>
                                                );
                                            }
                                            // return 'General Ledger account (YY1_I_GLACCOUNTINCOMPANYCO_CDS)';
                                        })()}
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
                                                    handleOpenCostCenterSearchHelp(activeItemIndex, currentItem?.cost_center);
                                                }
                                            }}
                                            placeholder="10101PCC01"
                                            className={`h-9 w-full rounded-md border pr-9 pl-3 text-xs font-mono focus:outline-none transition-colors ${
                                                fieldErrors[`item_${activeItemIndex}_cost_center`]
                                                    ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                    : 'border-[#d9e2ec] text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                            }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleOpenCostCenterSearchHelp(activeItemIndex, currentItem?.cost_center)}
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                            title="F4 Search Help - Cost Center (SAP CDS: YY1_COSTCENTER_CDS)"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    {fieldErrors[`item_${activeItemIndex}_cost_center`] && (
                                        <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3 shrink-0" />
                                            <span>{fieldErrors[`item_${activeItemIndex}_cost_center`]}</span>
                                        </p>
                                    )}
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        {(() => {
                                            const selectedCc = (sapCostCentersCache.length > 0 ? sapCostCentersCache : (dataCatalog.costCenters || [])).find(
                                                (c: any) => (c.CostCenter || c.code) === currentItem?.cost_center
                                            );
                                            if (selectedCc) {
                                                return (
                                                    <span className="text-[#0070f2] font-medium">
                                                        ✓ CoCode: {selectedCc.CompanyCode || '1000'} • Area: {selectedCc.ControllingArea || 'A000'} {selectedCc.ProfitCenter ? `• PC: ${selectedCc.ProfitCenter}` : ''}
                                                    </span>
                                                );
                                            }
                                            // return 'Controlling area cost center for cost allocation (YY1_COSTCENTER_CDS)';
                                        })()}
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
                                                onClick={() => {
                                            updateCurrentItem({
                                                desired_supplier: '',
                                                fixed_vendor: '',
                                                supplier_name: '',
                                                info_record: '',
                                                agreement_number: '',
                                                agreement_item: '',
                                                supplying_plant: '',
                                                purchasing_organization: '',
                                                manufacturer_part_number: '',
                                                supplier_material_number: '',
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
                                            const vendorCode = currentItem.fixed_vendor || currentItem.desired_supplier || '1000011';
                                            const matched = (sapSuppliersCache.length > 0 ? sapSuppliersCache : (dataCatalog.desiredSuppliers || [])).find(
                                                (s: any) => (s.Supplier || s.code) === vendorCode
                                            );
                                            const vendorName = currentItem.supplier_name || (matched ? (matched.SupplierName || matched.name || matched.supplierName) : 'Aarbee Enterprises');
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

                            {/* Source of Supply Parameters: Exactly 8 Fields */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-xs font-semibold text-[#1c2d42]">
                                    <Building2 className="h-4 w-4 text-[#0070f2]" />
                                    <span>Source of Supply Parameters</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
                                    {/* 1. Desired Vendor (F4) */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-semibold text-[#1c2d42]">
                                                Desired Vendor (F4)
                                            </label>
                                            <span className="text-[10px] text-[#556b82]">Manual / F4</span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={currentItem?.desired_supplier || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value.toUpperCase();
                                                    const matched = (sapSuppliersCache.length > 0 ? sapSuppliersCache : (dataCatalog.desiredSuppliers || [])).find(
                                                        (s: any) => (s.Supplier || s.code) === val
                                                    );
                                                    updateCurrentItem({
                                                        desired_supplier: val,
                                                        ...(matched ? { supplier_name: matched.SupplierName || matched.name || matched.supplierName } : {}),
                                                        source_assigned: Boolean(val),
                                                    });
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'F4') {
                                                        e.preventDefault();
                                                        handleOpenSupplierSearchHelp(
                                                            'desired_supplier',
                                                            activeItemIndex,
                                                            currentItem?.desired_supplier
                                                        );
                                                    }
                                                }}
                                                placeholder="e.g. 1000011"
                                                className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleOpenSupplierSearchHelp(
                                                        'desired_supplier',
                                                        activeItemIndex,
                                                        currentItem?.desired_supplier
                                                    )
                                                }
                                                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                                title="Desired Vendor (Search Help - F4)"
                                            >
                                                <Search className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        <span className="mt-1 block text-[10px] text-[#556b82]">
                                            {(() => {
                                                const selectedSupplier = (sapSuppliersCache.length > 0 ? sapSuppliersCache : (dataCatalog.desiredSuppliers || [])).find(
                                                    (s: any) => (s.Supplier || s.code) === currentItem?.desired_supplier
                                                );
                                                if (selectedSupplier) {
                                                    return (
                                                        <span className="font-semibold text-blue-700">
                                                            {selectedSupplier.SupplierName || selectedSupplier.name}
                                                        </span>
                                                    );
                                                }
                                                return 'Suggested vendor proposed by requesting department (LIFNR)';
                                            })()}
                                        </span>
                                    </div>

                                    {/* 2. Fixed Vendor (F4) */}
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
                                                    const matched = (sapSuppliersCache.length > 0 ? sapSuppliersCache : (dataCatalog.desiredSuppliers || [])).find(
                                                        (s: any) => (s.Supplier || s.code) === val
                                                    );
                                                    updateCurrentItem({
                                                        fixed_vendor: val,
                                                        ...(matched ? { supplier_name: matched.SupplierName || matched.name || matched.supplierName } : {}),
                                                        source_assigned: Boolean(val),
                                                    });
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'F4') {
                                                        e.preventDefault();
                                                        handleOpenSupplierSearchHelp(
                                                            'fixed_vendor',
                                                            activeItemIndex,
                                                            currentItem?.fixed_vendor
                                                        );
                                                    }
                                                }}
                                                placeholder="e.g. 1000011"
                                                className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleOpenSupplierSearchHelp(
                                                        'fixed_vendor',
                                                        activeItemIndex,
                                                        currentItem?.fixed_vendor
                                                    )
                                                }
                                                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                                title="Fixed Vendor (Search Help - F4)"
                                            >
                                                <Search className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        <span className="mt-1 block text-[10px] text-[#556b82]">
                                            {(() => {
                                                const selectedSupplier = (sapSuppliersCache.length > 0 ? sapSuppliersCache : (dataCatalog.desiredSuppliers || [])).find(
                                                    (s: any) => (s.Supplier || s.code) === currentItem?.fixed_vendor
                                                );
                                                if (selectedSupplier) {
                                                    return (
                                                        <span className="font-semibold text-blue-700">
                                                            {selectedSupplier.SupplierName || selectedSupplier.name}
                                                        </span>
                                                    );
                                                }
                                                return 'Fixed vendor assigned for automatic PO creation (FLIEF)';
                                            })()}
                                        </span>
                                    </div>

                                    {/* 3. Supplying Plant (F4) */}
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
                                            Issuing plant for stock transport / internal supply (RESWK)
                                        </span>
                                    </div>

                                    {/* 4. Purchase Organisation (F4) */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-semibold text-[#1c2d42]">
                                                Purchase Organisation (F4)
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
                                                        handleOpenPurchasingOrgSearchHelp(activeItemIndex, currentItem?.purchasing_organization);
                                                    }
                                                }}
                                                placeholder="e.g. 1100"
                                                className="h-9 w-full rounded-md border border-[#d9e2ec] pr-9 pl-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleOpenPurchasingOrgSearchHelp(activeItemIndex, currentItem?.purchasing_organization)
                                                }
                                                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                                title="Purchase Organisation (Search Help - F4)"
                                            >
                                                <Search className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        {getPurchasingOrgLabel(currentItem?.purchasing_organization) ? (
                                            <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                                {getPurchasingOrgLabel(currentItem?.purchasing_organization)}
                                            </span>
                                        ) : (
                                            <span className="mt-1 block text-[10px] text-[#556b82]">
                                                Procuring organizational unit (EKORG)
                                            </span>
                                        )}
                                    </div>


                                    {/* 5. Outline Agreement (F4) */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-semibold text-[#1c2d42]">
                                                Outline Agreement (F4)
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
                                            Long-term framework agreement or contract (KONNR)
                                        </span>
                                    </div>

                                    {/* 6. Agreement Item (F4) */}
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

                                    {/* 7. Info Record (F4) */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-semibold text-[#1c2d42]">
                                                Info Record (F4)
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

                                    {/* 8. Manufacture Part Number */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-semibold text-[#1c2d42]">
                                                Manufacture Part Number
                                            </label>
                                            <span className="text-[10px] text-[#556b82]">Catalog / MFR</span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={currentItem?.manufacturer_part_number || currentItem?.supplier_material_number || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    updateCurrentItem({
                                                        manufacturer_part_number: val,
                                                        supplier_material_number: val,
                                                    });
                                                }}
                                                placeholder="e.g. MFRPN-9842A"
                                                className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] font-mono focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                            />
                                        </div>
                                        <span className="mt-1 block text-[10px] text-[#556b82]">
                                            Manufacturer or vendor part catalog designation (MFRPN)
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Live Determined Source Summary Card */}
                            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs font-semibold text-[#1c2d42] flex items-center gap-1.5">
                                        <Sparkles className="h-3.5 w-3.5 text-[#0070f2]" />
                                        <span>Determined Source of Supply Overview</span>
                                    </div>
                                    <span className="text-[10px] text-[#556b82]">
                                        SAP S/4HANA Cloud Sourcing Specification
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
                                        <span className="text-[#556b82] block text-[11px] mb-0.5">Agreement & Item</span>
                                        <strong className="text-[#1c2d42] block font-mono">
                                            {currentItem?.agreement_number || 'No agreement'}
                                        </strong>
                                        <span className="text-[11px] text-slate-500 block">
                                            {currentItem?.agreement_item ? `Agreement Item: ${currentItem.agreement_item}` : 'Standard conditions'}
                                        </span>
                                    </div>

                                    <div className="rounded-md border border-slate-200/80 bg-white p-2.5 shadow-2xs">
                                        <span className="text-[#556b82] block text-[11px] mb-0.5">Info Record & Part No</span>
                                        <strong className="text-[#1c2d42] block font-mono">
                                            {currentItem?.info_record || 'No info record'}
                                        </strong>
                                        <span className="text-[11px] text-slate-500 truncate block font-mono">
                                            {currentItem?.manufacturer_part_number || currentItem?.supplier_material_number ? `MFR: ${currentItem?.manufacturer_part_number || currentItem?.supplier_material_number}` : 'No MFR part number'}
                                        </span>
                                    </div>

                                    <div className="rounded-md border border-slate-200/80 bg-white p-2.5 shadow-2xs">
                                        <span className="text-[#556b82] block text-[11px] mb-0.5">Plant & Purchasing Org</span>
                                        <strong className="text-[#1c2d42] block font-mono">
                                            Org: {currentItem?.purchasing_organization || '1100'}
                                        </strong>
                                        <span className="text-[11px] text-slate-500 block">
                                            Supplying Plant: {currentItem?.supplying_plant || 'None (Direct Vendor)'}
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
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Requisitioner
                                        </label>
                                        <span className="text-[10px] text-slate-400 font-medium">Auto (User Model)</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={requisitioner || defaultRequisitioner || ''}
                                        disabled
                                        readOnly
                                        placeholder="e.g. Requester Name / Employee ID"
                                        title="Auto-filled from User profile (read-only)"
                                        className="h-9 w-full rounded-md border border-[#d9e2ec] bg-slate-100 px-3 text-xs font-medium text-[#556b82] cursor-not-allowed select-none focus:outline-none"
                                    />
                                    <span className="mt-1 block text-[10px] text-[#556b82]">
                                        Name of individual or department requesting goods (from user profile)
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
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Purchasing Organization (F4)
                                        </label>
                                        <span className="text-[10px] text-[#556b82]">Manual / F4</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={currentItem?.purchasing_organization || ''}
                                            onChange={(e) =>
                                                updateCurrentItem({ purchasing_organization: e.target.value })
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === 'F4') {
                                                    e.preventDefault();
                                                    handleOpenPurchasingOrgSearchHelp(activeItemIndex, currentItem?.purchasing_organization);
                                                }
                                            }}
                                            placeholder="1200"
                                            className={`h-9 w-full rounded-md border pr-9 pl-3 text-xs font-mono focus:outline-none transition-colors ${
                                                fieldErrors[`item_${activeItemIndex}_purchasing_organization`]
                                                    ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                    : 'border-[#d9e2ec] text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                            }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleOpenPurchasingOrgSearchHelp(activeItemIndex, currentItem?.purchasing_organization)
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                            title="Purchasing Organization (Search Help - F4)"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    {fieldErrors[`item_${activeItemIndex}_purchasing_organization`] && (
                                        <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3 shrink-0" />
                                            <span>{fieldErrors[`item_${activeItemIndex}_purchasing_organization`]}</span>
                                        </p>
                                    )}
                                    {getPurchasingOrgLabel(currentItem?.purchasing_organization) && (
                                        <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                            {getPurchasingOrgLabel(currentItem?.purchasing_organization)}
                                        </span>
                                    )}
                                </div>


                                {/* Purchasing Group * (Search help) */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-[#1c2d42]">
                                            Purchasing Group <span className="text-rose-500">*</span> (F4)
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
                                            onKeyDown={(e) => {
                                                if (e.key === 'F4') {
                                                    e.preventDefault();
                                                    handleOpenPurchasingGroupSearchHelp(activeItemIndex, currentItem?.purchasing_group);
                                                }
                                            }}
                                            placeholder={defaultPurchasingGroup || '103'}
                                            title="Purchasing Group (Press F4 for Help)"
                                            required
                                            className={`h-9 w-full rounded-md border pr-9 pl-3 text-xs font-mono focus:outline-none transition-colors ${
                                                fieldErrors[`item_${activeItemIndex}_purchasing_group`]
                                                    ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                                    : 'border-[#d9e2ec] text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]'
                                            }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleOpenPurchasingGroupSearchHelp(
                                                    activeItemIndex,
                                                    currentItem?.purchasing_group
                                                )
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[#0070f2] hover:bg-blue-50 transition-colors"
                                            title="Select Purchasing Group (F4 Help)"
                                        >
                                            <Search className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    {fieldErrors[`item_${activeItemIndex}_purchasing_group`] && (
                                        <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3 shrink-0" />
                                            <span>{fieldErrors[`item_${activeItemIndex}_purchasing_group`]}</span>
                                        </p>
                                    )}
                                    {getPurchasingGroupLabel(currentItem?.purchasing_group) && (
                                        <span className="mt-1 block text-[11px] font-medium text-teal-700">
                                            {getPurchasingGroupLabel(currentItem?.purchasing_group)}
                                        </span>
                                    )}
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
                        title={isEdit ? "Update draft changes in local database (is_draft = 1)" : "Save as Draft in local database (is_draft = 1) without syncing to SAP"}
                    >
                        <Save className={`h-3.5 w-3.5 ${isDrafting ? 'animate-spin' : ''}`} />
                        <span>
                            {isDrafting
                                ? (isEdit ? 'Updating Draft...' : 'Saving Draft...')
                                : (isEdit ? 'Update Draft' : 'Save as Draft')}
                        </span>
                    </button>

                    <button
                        type="submit"
                        disabled={submitting || isDrafting}
                        className="flex items-center gap-2 rounded-md bg-[#0070f2] px-6 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#0057c2] active:bg-[#003884] disabled:opacity-50"
                        title="Finalize draft and sync with SAP S/4HANA Cloud"
                    >
                        <Send className={`h-3.5 w-3.5 ${submitting ? 'animate-spin' : ''}`} />
                        <span>
                            {submitting
                                ? 'Syncing with SAP Cloud...'
                                : (isEdit ? 'Save & Sync to SAP' : 'Sync with SAP')}
                        </span>
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
                initialPlant={searchHelpState.targetPlant || currentItem?.plant}
            />

            {/* Confirmation Modal before Creation / Sync */}
            {confirmModal?.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
                        {/* Header Banner */}
                        <div className={`px-6 py-5 border-b ${
                            confirmModal.isDraft 
                                ? 'bg-amber-50/70 border-amber-200' 
                                : 'bg-blue-50/70 border-blue-200'
                        }`}>
                            <div className="flex items-center gap-3">
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                    confirmModal.isDraft
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-blue-100 text-[#0070f2]'
                                }`}>
                                    {confirmModal.isDraft ? (
                                        <Save className="h-5 w-5" />
                                    ) : (
                                        <Send className="h-5 w-5" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-[#1c2d42]">
                                        {confirmModal.isDraft
                                            ? (isEdit ? 'Confirm Update Draft PR' : 'Confirm Save PR as Draft')
                                            : (isEdit ? 'Confirm Save & Sync to SAP S/4HANA' : 'Confirm Create & Sync to SAP S/4HANA')}
                                    </h3>
                                    <p className="text-xs text-[#556b82] mt-0.5">
                                        {confirmModal.isDraft
                                            ? 'Save locally in database without sending to SAP Cloud'
                                            : 'Synchronize and post requisition directly into SAP S/4HANA Cloud'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Body: PR Summary */}
                        <div className="p-6 space-y-4">
                            <p className="text-xs text-slate-600 leading-relaxed">
                                {confirmModal.isDraft
                                    ? 'You are about to save this purchase requisition as a draft in the local database. You can continue editing, add line items, and sync it to SAP S/4HANA at any time.'
                                    : 'Please review the requisition summary below before submitting. Once confirmed, this will call the SAP OData APIs to create the official Purchase Requisition in SAP S/4HANA Cloud.'}
                            </p>

                            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2.5 text-xs">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                                    <span className="text-[#556b82]">Description:</span>
                                    <span className="font-semibold text-[#1c2d42] max-w-[260px] truncate text-right" title={description || 'Draft Requisition'}>
                                        {description || 'Draft Requisition'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[#556b82]">Document Type:</span>
                                    <span className="font-mono font-semibold text-[#1c2d42]">{prType}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[#556b82]">Requisitioner:</span>
                                    <span className="font-semibold text-[#1c2d42]">{requisitioner || defaultRequisitioner}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[#556b82]">Line Items:</span>
                                    <span className="font-semibold text-[#1c2d42]">{items.length} item(s)</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[#556b82]">Receiving Plant(s):</span>
                                    <span className="font-mono font-semibold text-[#1c2d42]">
                                        {[...new Set(items.map((i) => i.plant).filter(Boolean))].join(', ') || defaultPlant}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                                    <span className="font-semibold text-[#1c2d42]">Total Estimated Value:</span>
                                    <span className="font-bold text-sm text-[#0070f2]">
                                        {calculateTotal().toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}{' '}
                                        <span className="text-xs">{currency}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmModal(null)}
                                disabled={submitting || isDrafting}
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#1c2d42] hover:bg-slate-100 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => submitForm(confirmModal.isDraft)}
                                disabled={submitting || isDrafting}
                                className={`flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50 ${
                                    confirmModal.isDraft
                                        ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                                        : 'bg-[#0070f2] hover:bg-[#0057c2] active:bg-[#003884]'
                                }`}
                            >
                                {(submitting || isDrafting) ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        <span>{confirmModal.isDraft ? 'Saving Draft...' : 'Syncing with SAP Cloud...'}</span>
                                    </>
                                ) : (
                                    <>
                                        {confirmModal.isDraft ? <Save className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                                        <span>
                                            {confirmModal.isDraft
                                                ? (isEdit ? 'Confirm & Update Draft' : 'Confirm & Save as Draft')
                                                : (isEdit ? 'Confirm & Sync to SAP' : 'Confirm & Create in SAP')}
                                        </span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Popup Modal */}
            {successModal?.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
                        {/* Green Top Highlight Bar */}
                        <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />

                        <div className="p-6 text-center space-y-5">
                            {/* Success Icon */}
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50 shadow-inner">
                                <Check className="h-7 w-7 stroke-[2.5]" />
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-[#1c2d42]">
                                    {successModal.isDraft
                                        ? 'Purchase Requisition Saved as Draft!'
                                        : 'Purchase Requisition Created Successfully!'}
                                </h3>
                                <p className="text-xs text-[#556b82] mt-1 max-w-sm mx-auto">
                                    {successModal.message}
                                </p>
                            </div>

                            {/* Reference Numbers Card */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-left space-y-3">
                                {/* Local PR Number */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#556b82] block">
                                            Application PR Number
                                        </span>
                                        <span className="font-mono font-bold text-sm text-[#1c2d42]">
                                            {successModal.prNumber}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard?.writeText(successModal.prNumber);
                                            setCopiedPrNumber(true);
                                            setTimeout(() => setCopiedPrNumber(false), 2000);
                                        }}
                                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                                        title="Copy PR Number"
                                    >
                                        {copiedPrNumber ? (
                                            <>
                                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                <span className="text-emerald-700 font-bold">Copied!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-3.5 w-3.5 text-slate-500" />
                                                <span>Copy</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* SAP S/4HANA Cloud PR Number (if available) */}
                                {successModal.sapPrNumber && (
                                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-200">
                                        <div>
                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0070f2] block flex items-center gap-1">
                                                <span>SAP Cloud PR Number</span>
                                                <span className="rounded bg-blue-100 text-[#0070f2] px-1 py-0.2 text-[9px] font-bold">Live SAP</span>
                                            </span>
                                            <span className="font-mono font-bold text-sm text-[#0070f2]">
                                                {successModal.sapPrNumber}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (successModal.sapPrNumber) {
                                                    navigator.clipboard?.writeText(successModal.sapPrNumber);
                                                    setCopiedSapPrNumber(true);
                                                    setTimeout(() => setCopiedSapPrNumber(false), 2000);
                                                }
                                            }}
                                            className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors shadow-2xs"
                                            title="Copy SAP PR Number"
                                        >
                                            {copiedSapPrNumber ? (
                                                <>
                                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                    <span className="text-emerald-700 font-bold">Copied!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-3.5 w-3.5 text-blue-600" />
                                                    <span>Copy</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}

                                {/* Total Amount & Status */}
                                <div className="flex items-center justify-between pt-2.5 border-t border-slate-200 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[#556b82]">Status:</span>
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                            successModal.isDraft
                                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        }`}>
                                            {successModal.isDraft ? 'Draft' : 'Synced with SAP'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[#556b82] mr-1">Total:</span>
                                        <strong className="text-[#1c2d42]">
                                            {Number(successModal.totalAmount).toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}{' '}
                                            {successModal.currency}
                                        </strong>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={handleCreateAnotherPr}
                                    className="w-full sm:flex-1 rounded-lg border border-slate-300 bg-white py-2.5 text-xs font-semibold text-[#1c2d42] hover:bg-slate-50 transition-colors"
                                >
                                    Create Another PR
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.visit('/dashboard')}
                                    className="w-full sm:flex-1 rounded-lg border border-[#0070f2] bg-blue-50 py-2.5 text-xs font-semibold text-[#0070f2] hover:bg-blue-100 transition-colors"
                                >
                                    Go to Dashboard
                                </button>
                                {successModal.prId && (
                                    <button
                                        type="button"
                                        onClick={() => router.visit(`/purchase-requisitions/${successModal.prId}`)}
                                        className="w-full sm:flex-1 rounded-lg bg-[#0070f2] py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2] transition-colors"
                                    >
                                        View PR Details
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
}
