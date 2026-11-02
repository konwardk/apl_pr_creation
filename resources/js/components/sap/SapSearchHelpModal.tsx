import React, { useState, useMemo } from 'react';
import { Search, X, Check, Database } from 'lucide-react';

export interface SearchHelpOption {
    code: string;
    name: string;
    extra?: string;
    [key: string]: any;
}

interface SapSearchHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    options: SearchHelpOption[];
    selectedCode?: string;
    onSelect: (option: SearchHelpOption) => void;
    isLoading?: boolean;
    initialPlant?: string;
    onSearch?: (query: string) => void | Promise<void>;
}

export default function SapSearchHelpModal({
    isOpen,
    onClose,
    title,
    subtitle = 'Select an entry from the SAP Master Data Catalog',
    options = [],
    selectedCode = '',
    onSelect,
    isLoading = false,
    initialPlant,
    onSearch,
}: SapSearchHelpModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [lastSearchedQuery, setLastSearchedQuery] = useState('');
    const [isSearchingServer, setIsSearchingServer] = useState(false);
    const [selectedPlantFilter, setSelectedPlantFilter] = useState<string>('ALL');

    const isStorageLocationSearch = useMemo(() => {
        return (
            title.toLowerCase().includes('storage location') ||
            options.some((o) => o.StorageLocation || o.StorageLocationName)
        );
    }, [title, options]);

    const availablePlants = useMemo(() => {
        if (!isStorageLocationSearch) return [];
        const plantsSet = new Set<string>();
        options.forEach((o) => {
            const p = o.Plant || o.plant;
            if (p) plantsSet.add(String(p).trim());
        });
        return Array.from(plantsSet).sort();
    }, [options, isStorageLocationSearch]);

    // When modal opens, initialize plant filter to initialPlant if available
    React.useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setLastSearchedQuery('');
            setIsSearchingServer(false);
            if (initialPlant && initialPlant.trim() && availablePlants.includes(initialPlant.trim())) {
                setSelectedPlantFilter(initialPlant.trim());
            } else {
                setSelectedPlantFilter('ALL');
            }
        }
    }, [isOpen, initialPlant, availablePlants]);

    const handleExecuteSearch = async () => {
        const query = searchQuery.trim();
        setLastSearchedQuery(query);
        if (onSearch) {
            setIsSearchingServer(true);
            try {
                await onSearch(query);
            } finally {
                setIsSearchingServer(false);
            }
        }
    };

    const handleClearSearch = async () => {
        setSearchQuery('');
        setLastSearchedQuery('');
        if (onSearch && lastSearchedQuery) {
            setIsSearchingServer(true);
            try {
                await onSearch('');
            } finally {
                setIsSearchingServer(false);
            }
        }
    };

    // Identify search category stably based on title and options
    const isMaterialSearch = useMemo(() => {
        return (
            (title.toLowerCase().includes('material') && !title.toLowerCase().includes('material group')) ||
            options.some((o) => (o.Product && !o.MaterialGroup) || o.materialType || o.BaseUnit || o.StandardPrice !== undefined || o.MovingAveragePrice !== undefined)
        );
    }, [title, options]);

    const isMaterialGroupSearch = useMemo(() => {
        if (isMaterialSearch) return false;
        return (
            title.toLowerCase().includes('material group') ||
            options.some((o) => o.MaterialGroup || o.MaterialGroupName)
        );
    }, [isMaterialSearch, title, options]);

    const isGlAccountSearch = useMemo(() => {
        if (isMaterialSearch || isMaterialGroupSearch) return false;
        return (
            title.toLowerCase().includes('g/l account') ||
            title.toLowerCase().includes('gl account') ||
            options.some((o) => o.GLAccount || o.GLAccountName)
        );
    }, [isMaterialSearch, isMaterialGroupSearch, title, options]);

    const isCostCenterSearch = useMemo(() => {
        if (isMaterialSearch || isMaterialGroupSearch || isGlAccountSearch) return false;
        return (
            title.toLowerCase().includes('cost center') ||
            options.some((o) => o.CostCenter || o.ControllingArea)
        );
    }, [isMaterialSearch, isMaterialGroupSearch, isGlAccountSearch, title, options]);

    const isInfoRecordSearch = useMemo(() => {
        if (isMaterialSearch || isMaterialGroupSearch || isGlAccountSearch || isCostCenterSearch) return false;
        return (
            title.toLowerCase().includes('info record') ||
            title.toLowerCase().includes('inforecord') ||
            options.some((o) => o.PurchasingInfoRecord)
        );
    }, [isMaterialSearch, isMaterialGroupSearch, isGlAccountSearch, isCostCenterSearch, title, options]);

    const isSupplierSearch = useMemo(() => {
        if (isMaterialSearch || isMaterialGroupSearch || isGlAccountSearch || isCostCenterSearch || isInfoRecordSearch) return false;
        return (
            title.toLowerCase().includes('supplier') ||
            title.toLowerCase().includes('vendor') ||
            options.some((o) => (o.Supplier || o.SupplierName || o.supplierName || o.SupplierFullName) && !o.PurchasingInfoRecord)
        );
    }, [isMaterialSearch, isMaterialGroupSearch, isGlAccountSearch, isCostCenterSearch, isInfoRecordSearch, title, options]);

    const isPurchasingOrgSearch = useMemo(() => {
        if (isMaterialSearch || isMaterialGroupSearch || isGlAccountSearch || isCostCenterSearch || isSupplierSearch || isInfoRecordSearch) return false;
        return (
            title.toLowerCase().includes('purchasing organization') ||
            title.toLowerCase().includes('purchase organisation') ||
            title.toLowerCase().includes('purchasing org') ||
            options.some((o) => o.PurchasingOrganization || o.purchasingOrgName || o.PurchasingOrganizationName)
        );
    }, [isMaterialSearch, isMaterialGroupSearch, isGlAccountSearch, isCostCenterSearch, isSupplierSearch, isInfoRecordSearch, title, options]);

    const isPurchasingGroupSearch = useMemo(() => {
        if (isMaterialSearch || isMaterialGroupSearch || isGlAccountSearch || isCostCenterSearch || isSupplierSearch || isPurchasingOrgSearch || isInfoRecordSearch) return false;
        return (
            title.toLowerCase().includes('purchasing group') ||
            title.toLowerCase().includes('purchase group') ||
            options.some((o) => o.PurchasingGroup || o.PurchasingGroupName)
        );
    }, [isMaterialSearch, isMaterialGroupSearch, isGlAccountSearch, isCostCenterSearch, isSupplierSearch, isPurchasingOrgSearch, isInfoRecordSearch, title, options]);

    const isUnitOfMeasureSearch = useMemo(() => {
        if (isMaterialSearch || isMaterialGroupSearch || isGlAccountSearch || isCostCenterSearch || isSupplierSearch || isPurchasingOrgSearch || isPurchasingGroupSearch || isInfoRecordSearch) return false;
        return (
            title.toLowerCase().includes('unit of measure') ||
            title.toLowerCase().includes('uom') ||
            options.some((o) => o.UnitOfMeasure || o.UnitOfMeasureCommercialName || o.UnitOfMeasureLongName)
        );
    }, [isMaterialSearch, isMaterialGroupSearch, isGlAccountSearch, isCostCenterSearch, isSupplierSearch, isPurchasingOrgSearch, isPurchasingGroupSearch, isInfoRecordSearch, title, options]);

    const isTaxCodeSearch = useMemo(() => {
        if (isMaterialSearch || isMaterialGroupSearch || isGlAccountSearch || isCostCenterSearch || isSupplierSearch || isPurchasingOrgSearch || isPurchasingGroupSearch || isInfoRecordSearch || isUnitOfMeasureSearch) return false;
        return (
            title.toLowerCase().includes('tax code') ||
            options.some((o) => o.TaxCode || o.TaxCodeName || o.VATConditionType || o.TaxCalculationProcedure)
        );
    }, [isMaterialSearch, isMaterialGroupSearch, isGlAccountSearch, isCostCenterSearch, isSupplierSearch, isPurchasingOrgSearch, isPurchasingGroupSearch, isInfoRecordSearch, isUnitOfMeasureSearch, title, options]);

    const isOutlineContractSearch = useMemo(() => {
        if (isMaterialSearch || isMaterialGroupSearch || isGlAccountSearch || isCostCenterSearch || isSupplierSearch || isPurchasingOrgSearch || isPurchasingGroupSearch || isInfoRecordSearch || isUnitOfMeasureSearch || isTaxCodeSearch) return false;
        return (
            title.toLowerCase().includes('outline contract') ||
            title.toLowerCase().includes('agreement item') ||
            title.toLowerCase().includes('outline agreement') ||
            options.some((o) => o.PurchaseContractType || o.PurchasingDocumentTypeName || o.PurchasingDocumentCategory)
        );
    }, [isMaterialSearch, isMaterialGroupSearch, isGlAccountSearch, isCostCenterSearch, isSupplierSearch, isPurchasingOrgSearch, isPurchasingGroupSearch, isInfoRecordSearch, isUnitOfMeasureSearch, isTaxCodeSearch, title, options]);

    const hasExtendedColumns = isMaterialSearch || isMaterialGroupSearch || isGlAccountSearch || isCostCenterSearch || isSupplierSearch || isPurchasingOrgSearch || isPurchasingGroupSearch || isStorageLocationSearch || isUnitOfMeasureSearch || isInfoRecordSearch || isTaxCodeSearch || isOutlineContractSearch || options.some((o) => o.materialType);

    const filteredOptions = useMemo(() => {
        let base = options;
        if (isStorageLocationSearch && selectedPlantFilter !== 'ALL') {
            const matchingPlant = base.filter((o) => String(o.Plant || o.plant).trim() === selectedPlantFilter);
            if (matchingPlant.length > 0) {
                base = matchingPlant;
            }
        }

        // If onSearch is provided (e.g. material search), filtering is handled externally.
        // The `options` prop already reflects the filtered result, so skip client-side text filtering.
        if (onSearch) return base;

        const q = searchQuery.toLowerCase().trim();
        if (!q) return base;
        const searchTerms = q.split(/\s+/).filter(Boolean);

        return base.filter((opt) => {
            const raw = opt.raw_data || {};
            const product = String(opt.Product || opt.ProductExternalID || opt.Material || opt.material || opt.MaterialGroup || opt.GLAccount || opt.CostCenter || opt.code || '').toLowerCase();
            const productName = String(opt.ProductName || opt.MaterialGroupName || opt.PlantName || opt.AcctAssignmentCategoryName || opt.GLAccountName || opt.name || '').toLowerCase();
            const productDesc = String(
                opt.ProductDescription ||
                opt.ProductDescription_1 ||
                opt.ProductDescription_2 ||
                opt.ProductDescription_3 ||
                opt.description ||
                opt.poText ||
                raw.ProductDescription ||
                raw.ProductDescription_1 ||
                raw.MaterialDescription ||
                raw.ProductName ||
                raw.poText ||
                ''
            ).toLowerCase();
            const storLoc = String(opt.StorageLocation || '').toLowerCase();
            const storLocName = String(opt.StorageLocationName || '').toLowerCase();
            const companyCode = String(opt.CompanyCode || opt.companyCode || '').toLowerCase();
            const controllingArea = String(opt.ControllingArea || opt.controllingArea || '').toLowerCase();
            const profitCenter = String(opt.ProfitCenter || opt.profitCenter || '').toLowerCase();
            const longName = String(opt.GLAccountLongName || '').toLowerCase();
            const plant = String(opt.Plant || opt.plant || opt.ValuationArea || '').toLowerCase();
            const extra = String(opt.extra || '').toLowerCase();
            const uom = String(opt.BaseUnit || opt.UnitOfMeasure || opt.uom || '').toLowerCase();
            const uomCommercial = String(opt.UnitOfMeasureCommercialName || '').toLowerCase();
            const uomLong = String(opt.UnitOfMeasureLongName || '').toLowerCase();
            const group = String(opt.ProductGroup || opt.materialGroup || opt.MaterialGroup || '').toLowerCase();
            const extId = String(opt.ProductExternalID || '').toLowerCase();
            const type = String(opt.ProductType || opt.materialType || '').toLowerCase();
            const supplier = String(opt.Supplier || opt.supplierName || opt.SupplierName || '').toLowerCase();
            const purchOrg = String(opt.PurchasingOrganization || opt.purchasing_organization || opt.purchasingOrg || '').toLowerCase();
            const purchOrgName = String(opt.PurchasingOrganizationName || opt.purchasingOrgName || '').toLowerCase();
            const purchGroup = String(opt.PurchasingGroup || opt.purchasing_group || '').toLowerCase();
            const purchGroupName = String(opt.PurchasingGroupName || opt.description || '').toLowerCase();
            const plants = Array.isArray(opt.plants) ? opt.plants.join(' ').toLowerCase() : '';
            const proc = String(opt.InventoryValuationProcedure || opt.priceControl || '').toLowerCase();
            const currency = String(opt.Currency || opt.currency || '').toLowerCase();
            const infoRecord = String(opt.PurchasingInfoRecord || '').toLowerCase();
            const infoSupplier = String(opt.Supplier || opt.supplier || '').toLowerCase();
            const infoSupplierName = String(opt.SupplierName || '').toLowerCase();
            const infoMat = String(opt.Material || '').toLowerCase();
            const taxCode = String(opt.TaxCode || opt.code || '').toLowerCase();
            const taxCodeName = String(opt.TaxCodeName || opt.name || '').toLowerCase();
            const vatCondType = String(opt.VATConditionType || '').toLowerCase();
            const taxCalcProc = String(opt.TaxCalculationProcedure || '').toLowerCase();
            const country = String(opt.Country || '').toLowerCase();
            const rate = (opt.ConditionRateRatio !== undefined && opt.ConditionRateRatio !== null ? String(opt.ConditionRateRatio) : '').toLowerCase();
            const contractType = String(opt.PurchaseContractType || opt.PurchasingDocumentType || '').toLowerCase();
            const contractTypeName = String(opt.PurchasingDocumentTypeName || '').toLowerCase();
            const contractCat = String(opt.PurchasingDocumentCategory || '').toLowerCase();
            const costCenterName = String(opt.CostCenterName || '').toLowerCase();
            const costCenterDesc = String(opt.CostCenterDescription || opt.description || '').toLowerCase();

            // Combined searchable text for comprehensive and multi-word token matching
            const combinedText = `${product} ${productName} ${productDesc} ${costCenterName} ${costCenterDesc} ${storLoc} ${storLocName} ${companyCode} ${controllingArea} ${profitCenter} ${longName} ${plant} ${supplier} ${purchOrg} ${purchOrgName} ${purchGroup} ${purchGroupName} ${plants} ${extra} ${uom} ${uomCommercial} ${uomLong} ${group} ${type} ${proc} ${currency} ${extId} ${infoRecord} ${infoSupplier} ${infoSupplierName} ${infoMat} ${taxCode} ${taxCodeName} ${vatCondType} ${taxCalcProc} ${country} ${rate} ${contractType} ${contractTypeName} ${contractCat}`;

            // 1. Check if every search word is present in the combined text
            if (searchTerms.every((term) => combinedText.includes(term))) {
                return true;
            }

            // 2. Direct query check against individual fields
            return (
                product.includes(q) ||
                productName.includes(q) ||
                productDesc.includes(q) ||
                costCenterName.includes(q) ||
                costCenterDesc.includes(q) ||
                storLoc.includes(q) ||
                storLocName.includes(q) ||
                companyCode.includes(q) ||
                controllingArea.includes(q) ||
                profitCenter.includes(q) ||
                longName.includes(q) ||
                plant.includes(q) ||
                supplier.includes(q) ||
                purchOrg.includes(q) ||
                purchOrgName.includes(q) ||
                purchGroup.includes(q) ||
                purchGroupName.includes(q) ||
                plants.includes(q) ||
                extra.includes(q) ||
                uom.includes(q) ||
                uomCommercial.includes(q) ||
                uomLong.includes(q) ||
                group.includes(q) ||
                type.includes(q) ||
                proc.includes(q) ||
                currency.includes(q) ||
                extId.includes(q) ||
                infoRecord.includes(q) ||
                infoSupplier.includes(q) ||
                infoSupplierName.includes(q) ||
                infoMat.includes(q) ||
                taxCode.includes(q) ||
                taxCodeName.includes(q) ||
                vatCondType.includes(q) ||
                taxCalcProc.includes(q) ||
                country.includes(q) ||
                rate.includes(q) ||
                contractType.includes(q) ||
                contractTypeName.includes(q) ||
                contractCat.includes(q)
            );
        });
    }, [options, searchQuery, isStorageLocationSearch, selectedPlantFilter]);

    if (!isOpen) return null;



    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className={`relative w-full ${isMaterialSearch ? 'max-w-6xl' : (isMaterialGroupSearch || isGlAccountSearch || isCostCenterSearch || isTaxCodeSearch || isOutlineContractSearch || hasExtendedColumns) ? 'max-w-4xl' : 'max-w-xl'} rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]`}>
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-[#d9e2ec] px-5 py-3.5 bg-[#f8fafc]">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0070f2] text-white">
                            <Search className="h-4 w-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-[#1c2d42]">{title}</h3>
                            <p className="text-[11px] text-[#556b82]">{subtitle}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-3.5 border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#8c9ba5]" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleExecuteSearch();
                                    }
                                }}
                                placeholder={
                                    isMaterialSearch
                                        ? "Search by Material No (e.g. 1000000005, DINING) or Description (e.g. Decowoods, Chair, Grease)..."
                                        : isMaterialGroupSearch
                                        ? "Search by Material Group code (e.g. 100001, 110001) or description (e.g. Acids, Pipes)..."
                                        : isGlAccountSearch
                                        ? "Search by G/L Account # (e.g. 12545200), Company Code (e.g. 1000), or Account Name..."
                                        : isCostCenterSearch
                                        ? "Search by Cost Center (e.g. 10101PCC01), Profit Center (e.g. 1010PC0010), Area (e.g. A000)..."
                                        : isSupplierSearch
                                        ? "Search by Supplier Code (e.g. 1000011, V-10029) or Supplier Name (e.g. Aarbee Enterprises, Tata Chemicals)..."
                                        : isPurchasingGroupSearch
                                        ? "Search by Purchase Group Code (e.g. 103, 001) or description..."
                                        : isUnitOfMeasureSearch
                                        ? "Search by Unit (e.g. NO, EA), Commercial Name (e.g. NO, PC), or Long Name (e.g. Number, Piece)..."
                                        : isTaxCodeSearch
                                        ? "Search by Tax Code (e.g. J2, G3), Description, Rate, Condition Type (e.g. JICG), or Country..."
                                        : isOutlineContractSearch
                                        ? "Search by Contract Type (e.g. CMK, MK), Name (e.g. Quantity Contract), or Category (K)..."
                                        : isInfoRecordSearch
                                        ? "Search by Purchasing Info Record (e.g. 5300000000), Supplier (e.g. V1200, Namrup), or Material (e.g. 1000000005)..."
                                        : isStorageLocationSearch
                                        ? "Search by Storage Location (e.g. SL01, M100), Plant (e.g. 1200), or description..."
                                        : "Type to search code or description..."
                                }
                                autoFocus
                                className="h-9 w-full rounded-md border border-[#d9e2ec] pl-9 pr-8 text-xs text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setSearchQuery('');
                                    }}
                                    className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                                    title="Clear input"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Search Button */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleExecuteSearch();
                            }}
                            disabled={isLoading || isSearchingServer}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[#0070f2] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[#005ecb] active:bg-[#004fa8] transition-colors disabled:opacity-60 cursor-pointer shrink-0"
                            title="Execute Search"
                        >
                            {isLoading || isSearchingServer ? (
                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                                <Search className="h-3.5 w-3.5" />
                            )}
                            <span>Search</span>
                        </button>

                        {/* Reset / Show All Button */}
                        {(searchQuery.trim() || lastSearchedQuery) && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleClearSearch();
                                }}
                                disabled={isLoading || isSearchingServer}
                                className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors shrink-0 disabled:opacity-60 cursor-pointer"
                                title="Reset Search / Show All"
                            >
                                Reset
                            </button>
                        )}
                    </div>

                    {/* Plant filter pills for Storage Location search */}
                    {isStorageLocationSearch && availablePlants.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-semibold text-[#556b82] mr-1">Filter by Plant:</span>
                            <button
                                type="button"
                                onClick={() => setSelectedPlantFilter('ALL')}
                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                                    selectedPlantFilter === 'ALL'
                                        ? 'bg-[#0070f2] text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                All Plants ({options.length})
                            </button>
                            {availablePlants.map((plantCode) => {
                                const count = options.filter((o) => String(o.Plant || o.plant).trim() === plantCode).length;
                                const isCurrent = selectedPlantFilter === plantCode;
                                return (
                                    <button
                                        key={plantCode}
                                        type="button"
                                        onClick={() => setSelectedPlantFilter(plantCode)}
                                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                                            isCurrent
                                                ? 'bg-[#0070f2] text-white shadow-xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        Plant {plantCode} ({count})
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Active search banner — shown when a search was executed */}
                    {lastSearchedQuery && (
                        <div className="mt-2 flex items-center gap-2 rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs animate-in fade-in duration-150">
                            <Search className="h-3 w-3 text-blue-600 shrink-0" />
                            <span className="text-blue-700 font-medium">
                                Showing <span className="font-bold">{filteredOptions.length}</span> result{filteredOptions.length !== 1 ? 's' : ''} for &ldquo;<span className="italic">{lastSearchedQuery}</span>&rdquo;
                            </span>
                            <div className="ml-auto flex items-center gap-1.5 shrink-0">
                                {/* Clear Search — clears input text only */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleClearSearch();
                                    }}
                                    disabled={isSearchingServer}
                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold underline text-xs disabled:opacity-60 cursor-pointer"
                                >
                                    <X className="h-3 w-3" />
                                    Clear Search
                                </button>
                                <span className="text-blue-300 select-none">|</span>
                                {/* Reset — restores full list */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleClearSearch();
                                    }}
                                    disabled={isLoading || isSearchingServer}
                                    className="inline-flex h-6 items-center justify-center gap-1 rounded border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
                                    title="Reset Search — Show all materials"
                                >
                                    {isSearchingServer ? (
                                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                                    ) : null}
                                    Reset
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Options Table */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {isLoading ? (
                        <div className="py-16 text-center text-xs text-[#556b82]">
                            <div className="inline-flex h-8 w-8 animate-spin items-center justify-center rounded-full border-3 border-[#0070f2] border-t-transparent mb-3" />
                            <p className="font-bold text-slate-700">Connecting to SAP S/4HANA Cloud...</p>
                            <p className="text-[11px] text-slate-400 mt-1">{subtitle || 'Retrieving master data from SAP S/4HANA Cloud...'}</p>
                        </div>
                    ) : filteredOptions.length === 0 ? (
                        <div className="p-8 text-center text-xs text-[#556b82]">
                            <Database className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                            <p className="font-bold text-slate-700 text-sm">No Value Found</p>
                            <p className="text-[11px] text-slate-400 mt-1">
                                {searchQuery.trim()
                                    ? `No entries matching "${searchQuery}"`
                                    : 'No data found or accessible from SAP CDS View.'}
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-xs text-[#1c2d42]">
                            <thead className="bg-[#f8fafc] text-[11px] font-semibold text-[#556b82] sticky top-0 border-b border-slate-100">
                                <tr>
                                    {isMaterialSearch ? (
                                        <>
                                            <th className="py-2.5 px-3.5 w-36 font-mono">Material No</th>
                                            <th className="py-2.5 px-4 min-w-[220px]">Material Description</th>
                                            <th className="py-2.5 px-3 w-20 text-center">Plant</th>
                                            <th className="py-2.5 px-3 w-20 text-center">Type</th>
                                            <th className="py-2.5 px-3 w-20 text-center">Base Unit</th>
                                            <th className="py-2.5 px-3 w-28 text-center">Price Control</th>
                                            <th className="py-2.5 px-3 w-24 text-right">Standard Price</th>
                                            <th className="py-2.5 px-3 w-24 text-right">Moving Avg.</th>
                                            <th className="py-2.5 px-3.5 w-32 text-right">Valuation Price</th>
                                        </>
                                    ) : isMaterialGroupSearch ? (
                                        <>
                                            <th className="py-2.5 px-4 w-36 font-mono">Material Group</th>
                                            <th className="py-2.5 px-4">Group Name / Description</th>
                                            <th className="py-2.5 px-4 w-44">SAP Classification</th>
                                        </>
                                    ) : isGlAccountSearch ? (
                                        <>
                                            <th className="py-2.5 px-4 w-36 font-mono">G/L Account</th>
                                            <th className="py-2.5 px-3 w-28 text-center">Company Code</th>
                                            <th className="py-2.5 px-4">G/L Account Name</th>
                                            <th className="py-2.5 px-4">Long Description</th>
                                        </>
                                    ) : isCostCenterSearch ? (
                                        <>
                                            <th className="py-2.5 px-4 w-36 font-mono">Cost Center</th>
                                            <th className="py-2.5 px-3 w-28 text-center">Company Code</th>
                                            <th className="py-2.5 px-3 w-32 text-center">Controlling Area</th>
                                            <th className="py-2.5 px-3.5 w-32">Profit Center</th>
                                            <th className="py-2.5 px-4">Scope / Description</th>
                                        </>
                                    ) : isSupplierSearch ? (
                                        <>
                                            <th className="py-2.5 px-4 w-40 font-mono">Supplier Code</th>
                                            <th className="py-2.5 px-4">Supplier Name</th>
                                            <th className="py-2.5 px-4 w-64">Full Name / SAP Spec</th>
                                        </>
                                    ) : isPurchasingOrgSearch ? (
                                        <>
                                            <th className="py-2.5 px-4 w-36 font-mono">Purchasing Org</th>
                                            <th className="py-2.5 px-4">Organization Name</th>
                                            <th className="py-2.5 px-4 w-64">Mapped Operational Plants</th>
                                            <th className="py-2.5 px-3 w-28 text-center">Company Code</th>
                                        </>
                                    ) : isPurchasingGroupSearch ? (
                                        <>
                                            <th className="py-2.5 px-4 w-36 font-mono">Purchase Group Code</th>
                                            <th className="py-2.5 px-4">Description</th>
                                        </>
                                    ) : isStorageLocationSearch ? (
                                        <>
                                            <th className="py-2.5 px-4 w-36 font-mono">Storage Location</th>
                                            <th className="py-2.5 px-3 w-28 text-center">Plant</th>
                                            <th className="py-2.5 px-4">Location Name / Description</th>
                                            <th className="py-2.5 px-4 w-64">Details / SAP Spec</th>
                                        </>
                                    ) : isUnitOfMeasureSearch ? (
                                        <>
                                            <th className="py-2.5 px-4 w-32 font-mono">Unit (UnitOfMeasure)</th>
                                            <th className="py-2.5 px-3 w-32 font-mono text-center">Commercial</th>
                                            <th className="py-2.5 px-3 w-28 font-mono text-center">SAP Code</th>
                                            <th className="py-2.5 px-3 w-28 font-mono text-center">ISO Code</th>
                                            <th className="py-2.5 px-4">Description (UnitOfMeasureLongName)</th>
                                        </>
                                    ) : isTaxCodeSearch ? (
                                        <>
                                            <th className="py-2.5 px-4 w-28 font-mono">Tax Code</th>
                                            <th className="py-2.5 px-4">Tax Code Name / Description</th>
                                            <th className="py-2.5 px-3 w-32 text-center">Tax Rate / Ratio</th>
                                            <th className="py-2.5 px-3 w-28 text-center font-mono">Condition Type</th>
                                            <th className="py-2.5 px-3 w-28 text-center font-mono">Tax Procedure</th>
                                            <th className="py-2.5 px-3 w-24 text-center">Country</th>
                                        </>
                                    ) : isOutlineContractSearch ? (
                                        <>
                                            <th className="py-2.5 px-4 w-36 font-mono">Contract Type</th>
                                            <th className="py-2.5 px-4">Contract Type Name / Description</th>
                                            <th className="py-2.5 px-3 w-28 text-center font-mono">Category</th>
                                            <th className="py-2.5 px-3 w-32 text-center font-mono">Document Type</th>
                                        </>
                                    ) : isInfoRecordSearch ? (
                                        <>
                                            <th className="py-2.5 px-4 w-44 font-mono">Purchasing Info Record</th>
                                            <th className="py-2.5 px-4 w-52 font-mono">Supplier (Vendor)</th>
                                            <th className="py-2.5 px-4 font-mono">Material #</th>
                                            <th className="py-2.5 px-4">Description / SAP Spec</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="py-2.5 px-4 w-32">Code / ID</th>
                                            <th className="py-2.5 px-4">Description</th>
                                            {filteredOptions.some((o) => o.extra) && (
                                                 <th className="py-2.5 px-4">Details / SAP Spec</th>
                                            )}
                                        </>
                                    )}
                                    <th className="py-2.5 px-3 text-right w-16">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredOptions.map((opt, idx) => {
                                    const optCode = String(opt.PurchaseContractType ?? opt.TaxCode ?? opt.PurchasingInfoRecord ?? opt.UnitOfMeasure ?? opt.StorageLocation ?? opt.PurchasingOrganization ?? opt.PurchasingGroup ?? opt.Supplier ?? opt.MaterialGroup ?? opt.Product ?? opt.GLAccount ?? opt.CostCenter ?? opt.AccountAssignmentCategory ?? opt.code ?? '');
                                    const optName = String(opt.PurchasingDocumentTypeName ?? opt.TaxCodeName ?? opt.UnitOfMeasureLongName ?? opt.UnitOfMeasureCommercialName ?? opt.StorageLocationName ?? opt.PurchasingOrganizationName ?? opt.purchasingOrgName ?? opt.PurchasingGroupName ?? opt.description ?? opt.SupplierName ?? opt.supplierName ?? opt.MaterialGroupName ?? opt.ProductName ?? opt.GLAccountName ?? opt.AcctAssignmentCategoryName ?? opt.name ?? '');
                                    const isSelected = String(selectedCode) === optCode || (opt.PurchaseContractType && String(selectedCode) === String(opt.PurchaseContractType)) || (opt.TaxCode && String(selectedCode) === String(opt.TaxCode)) || (opt.PurchasingInfoRecord && String(selectedCode) === String(opt.PurchasingInfoRecord)) || (opt.UnitOfMeasure && String(selectedCode) === String(opt.UnitOfMeasure)) || (opt.UnitOfMeasureCommercialName && String(selectedCode) === String(opt.UnitOfMeasureCommercialName)) || String(selectedCode) === String(opt.code);



                                    return (
                                        <tr
                                            key={`${optCode}-${opt.VATConditionType || opt.Plant || idx}`}
                                            onClick={() => {
                                                onSelect(opt);
                                                onClose();
                                            }}
                                            className={`cursor-pointer transition-colors hover:bg-blue-50/60 ${
                                                isSelected ? 'bg-blue-50/80 font-medium' : ''
                                            }`}
                                        >
                                            {isMaterialSearch ? (
                                                <>
                                                    {/* Material No */}
                                                    <td className="py-2.5 px-3.5 font-mono font-bold text-[#0070f2]">
                                                        <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs text-[#1c2d42]">
                                                            {opt.Product || opt.code}
                                                        </span>
                                                    </td>
                                                    {/* Material Description */}
                                                    <td className="py-2.5 px-4 text-xs">
                                                        <div className="font-semibold text-slate-800">
                                                            {opt.ProductDescription || opt.description || opt.ProductName || opt.name || opt.poText || '-'}
                                                        </div>
                                                        {opt.poText && opt.poText !== opt.ProductDescription && opt.poText !== opt.ProductName && opt.poText !== opt.description && (
                                                            <div className="text-[11px] text-slate-500 mt-0.5">
                                                                {opt.poText}
                                                            </div>
                                                        )}
                                                    </td>
                                                    {/* Plant (now input from this API) */}
                                                    <td className="py-2.5 px-3 text-center font-mono">
                                                        <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                                                            {opt.Plant || opt.plant || opt.ValuationArea || '-'}
                                                        </span>
                                                    </td>
                                                    {/* Product Type */}
                                                    <td className="py-2.5 px-3 text-center">
                                                        <span className="inline-flex rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                                                            {opt.ProductType || opt.materialType || '-'}
                                                        </span>
                                                    </td>
                                                    {/* Base Unit */}
                                                    <td className="py-2.5 px-3 text-center font-mono text-[11px] font-semibold text-slate-700">
                                                        <span className="rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-[#0070f2]">
                                                            {opt.BaseUnit || opt.UnitOfMeasure || opt.uom || 'EA'}
                                                        </span>
                                                    </td>
                                                    {/* Price Control */}
                                                    <td className="py-2.5 px-3 text-center">
                                                        {(() => {
                                                            const raw = opt.raw_data || {};
                                                            const proc = String(opt.InventoryValuationProcedure || raw.InventoryValuationProcedure || opt.priceControl || '').toUpperCase().trim();
                                                            if (proc === 'V') {
                                                                return (
                                                                    <span className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                                                                        V (Moving Avg)
                                                                    </span>
                                                                );
                                                            }
                                                            if (proc === 'S') {
                                                                return (
                                                                    <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                                                        S (Standard)
                                                                    </span>
                                                                );
                                                            }
                                                            return <span className="text-[11px] text-slate-400">{proc || '-'}</span>;
                                                        })()}
                                                    </td>
                                                    {/* Standard Price */}
                                                    <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-700">
                                                        {Number(opt.StandardPrice ?? 0).toFixed(2)}
                                                    </td>
                                                    {/* Moving Average Price */}
                                                    <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-700">
                                                        {Number(opt.MovingAveragePrice ?? 0).toFixed(2)}
                                                    </td>
                                                    {/* Valuation Price (Calculated: V -> MovingAveragePrice, S -> StandardPrice) */}
                                                    <td className="py-2.5 px-3.5 text-right font-medium text-[#1c2d42]">
                                                        {(() => {
                                                            const raw = opt.raw_data || {};
                                                            const proc = String(opt.InventoryValuationProcedure || raw.InventoryValuationProcedure || opt.priceControl || '').toUpperCase().trim();
                                                            const map = parseFloat(String(opt.MovingAveragePrice ?? raw.MovingAveragePrice ?? 0)) || 0;
                                                            const std = parseFloat(String(opt.StandardPrice ?? raw.StandardPrice ?? 0)) || 0;
                                                            const fallback = parseFloat(String(opt.valuationPrice ?? opt.UnitPrice ?? opt.unitPrice ?? 0)) || 0;
                                                            const curr = opt.Currency || raw.Currency || 'INR';

                                                            let price = fallback;
                                                            let sourceTag = '';
                                                            if (proc === 'V') {
                                                                price = map;
                                                                sourceTag = 'Picked from MAP (V)';
                                                            } else if (proc === 'S') {
                                                                price = std;
                                                                sourceTag = 'Picked from Std (S)';
                                                            } else if (map > 0) {
                                                                price = map;
                                                            } else if (std > 0) {
                                                                price = std;
                                                            }

                                                            return (
                                                                <div className="flex flex-col items-end">
                                                                    <span className="font-mono text-xs font-bold text-[#0070f2]">
                                                                        {price.toFixed(2)} {curr}
                                                                    </span>
                                                                    {sourceTag && (
                                                                        <span className="text-[9px] font-semibold text-slate-500">
                                                                            {sourceTag}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                </>
                                             ) : isMaterialGroupSearch ? (
                                                <>
                                                    <td className="py-2.5 px-4 font-mono font-bold text-indigo-700">
                                                        <span className="rounded bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-mono">
                                                            {opt.MaterialGroup || opt.code}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-4 font-semibold text-[#1c2d42]">
                                                        {opt.MaterialGroupName || opt.name}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-[11px] text-[#556b82]">
                                                        <span className="inline-flex items-center gap-1 rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                                                            {opt.extra || 'SAP Material Group'}
                                                        </span>
                                                    </td>
                                                </>
                                            ) : isGlAccountSearch ? (
                                                <>
                                                    <td className="py-2.5 px-4 font-mono font-bold text-[#0070f2]">
                                                        <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-mono">
                                                            {opt.GLAccount || opt.code}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center">
                                                        <span className="inline-flex rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold text-[#0070f2]">
                                                            {opt.CompanyCode || opt.companyCode || '1000'}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-4 font-semibold text-[#1c2d42]">
                                                        {opt.GLAccountName || opt.name}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-[11px] text-[#556b82]">
                                                        {opt.GLAccountLongName || opt.extra || '-'}
                                                    </td>
                                                </>
                                            ) : isCostCenterSearch ? (
                                                <>
                                                    <td className="py-2.5 px-4 font-mono font-bold text-[#0070f2]">
                                                        <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-mono">
                                                            {opt.CostCenter || opt.code}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center">
                                                        <span className="inline-flex rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold text-[#0070f2]">
                                                            {opt.CompanyCode || opt.companyCode || '1000'}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center">
                                                        <span className="inline-flex rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                                                            {opt.ControllingArea || 'A000'}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3.5 font-mono text-xs">
                                                        {opt.ProfitCenter ? (
                                                            <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                                                                {opt.ProfitCenter}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-xs">
                                                        <div className="flex flex-col gap-0.5">
                                                            {opt.CostCenterName || (opt.name && opt.name !== opt.code) ? (
                                                                <span className="font-semibold text-[#1c2d42]">
                                                                    {opt.CostCenterName || opt.name}
                                                                </span>
                                                            ) : null}
                                                            {(opt.CostCenterDescription && opt.CostCenterDescription !== (opt.CostCenterName || opt.name)) ? (
                                                                <span className="text-[11px] text-[#556b82] leading-tight">
                                                                    {opt.CostCenterDescription}
                                                                </span>
                                                            ) : (opt.description && opt.description !== (opt.CostCenterName || opt.name)) ? (
                                                                <span className="text-[11px] text-[#556b82] leading-tight">
                                                                    {opt.description}
                                                                </span>
                                                            ) : !opt.CostCenterName && !opt.name ? (
                                                                <span className="text-slate-400">-</span>
                                                            ) : null}
                                                        </div>
                                                    </td>
                                                </>
                                            ) : isSupplierSearch ? (
                                                <>
                                                    <td className="py-2.5 px-4 font-mono font-bold text-[#0070f2]">
                                                        <span className="rounded bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-mono text-[#0070f2]">
                                                            {opt.Supplier || opt.code}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-4 font-semibold text-[#1c2d42]">
                                                        {opt.SupplierName || opt.supplierName || opt.name || opt.BPSupplierName}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-[11px] text-[#556b82]">
                                                        {opt.SupplierFullName || opt.extra || 'SAP S/4HANA Supplier (YY1_SUPPLIER_CDS)'}
                                                    </td>
                                                </>
                                            ) : isPurchasingOrgSearch ? (
                                                <>
                                                    <td className="py-2.5 px-4 font-mono font-bold text-emerald-900">
                                                        <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs">
                                                            {opt.PurchasingOrganization || opt.code}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-4 font-semibold text-[#1c2d42]">
                                                        {opt.PurchasingOrganizationName || opt.purchasingOrgName || opt.name}
                                                    </td>
                                                    <td className="py-2.5 px-4">
                                                        <div className="flex flex-wrap gap-1">
                                                            {(Array.isArray(opt.plants) ? opt.plants : []).map((p: string) => (
                                                                <span
                                                                    key={p}
                                                                    className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.2 font-mono text-[10px] text-slate-700"
                                                                >
                                                                    Plant {p}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center font-mono text-xs text-slate-600">
                                                        {opt.CompanyCode || opt.company_code || '1000'}
                                                    </td>
                                                </>
                                            ) : isPurchasingGroupSearch ? (
                                                <>
                                                    <td className="py-2.5 px-4 font-mono font-bold text-[#0070f2]">
                                                        <span className="rounded bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-xs font-mono font-bold text-teal-800">
                                                            {opt.PurchasingGroup || opt.code}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-4 font-semibold text-[#1c2d42]">
                                                        {opt.description || opt.PurchasingGroupName || opt.name}
                                                    </td>
                                                </>
                                            ) : isStorageLocationSearch ? (
                                                <>
                                                    <td className="py-2.5 px-4 font-mono font-bold text-[#0070f2]">
                                                        <span className="rounded bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-mono text-[#0070f2]">
                                                            {opt.StorageLocation || opt.code}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center">
                                                        <span className="inline-flex rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                                                            Plant {opt.Plant || opt.plant || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-4 font-semibold text-[#1c2d42]">
                                                        {opt.StorageLocationName || opt.name}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-[11px] text-[#556b82]">
                                                        {opt.extra || `Plant ${opt.Plant || opt.plant || ''} • Warehouse/Bin`}
                                                    </td>
                                                </>
                                            ) : isUnitOfMeasureSearch ? (
                                                <>
                                                    <td className="py-2.5 px-4 font-mono font-bold text-[#0070f2]">
                                                        <span className="rounded bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-mono font-bold text-[#1c2d42]">
                                                            {opt.UnitOfMeasure || opt.code}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center font-mono text-xs font-semibold text-slate-700">
                                                        <span className="rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-bold text-[#0070f2]">
                                                            {opt.UnitOfMeasureCommercialName || opt.UnitOfMeasure || opt.code}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center font-mono text-xs font-semibold text-slate-700">
                                                        <span className="rounded bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                                                            {opt.UnitOfMeasureSAPCode || opt.sapCode || opt.UnitOfMeasure || opt.code}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center font-mono text-xs font-semibold text-slate-700">
                                                        <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                                                            {opt.UnitOfMeasureISOCode || opt.isoCode || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-4 text-xs font-medium text-[#1c2d42]">
                                                        {opt.UnitOfMeasureLongName || opt.name || opt.extra || '-'}
                                                    </td>
                                                </>
                                             ) : isTaxCodeSearch ? (
                                                <>
                                                    <td className="py-2.5 px-4 font-mono font-bold text-[#0070f2]">
                                                        <span className="rounded bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-mono font-bold text-[#0070f2]">
                                                            {opt.TaxCode || opt.code}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-4 font-semibold text-[#1c2d42]">
                                                        <div>{opt.TaxCodeName || opt.name}</div>
                                                        {(opt.CndnRecordValidityStartDate || opt.CndnRecordValidityEndDate) && (
                                                            <div className="text-[10px] text-slate-400 mt-0.5 font-normal">
                                                                Valid: {opt.CndnRecordValidityStartDate || '1900-01-01'} to {opt.CndnRecordValidityEndDate || '9999-12-31'}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center">
                                                        {opt.ConditionRateRatio !== undefined && opt.ConditionRateRatio !== null && opt.ConditionRateRatio !== '' ? (
                                                            <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold ${
                                                                parseFloat(opt.ConditionRateRatio) < 0
                                                                    ? 'bg-rose-50 border border-rose-200 text-rose-700'
                                                                    : parseFloat(opt.ConditionRateRatio) > 0
                                                                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                                                                    : 'bg-slate-100 border border-slate-200 text-slate-700'
                                                            }`}>
                                                                {opt.ConditionRateRatio} {opt.ConditionRateRatioUnit || '%'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 text-[11px]">-</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center font-mono">
                                                        {opt.VATConditionType ? (
                                                            <span className="inline-flex rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-mono text-slate-700">
                                                                {opt.VATConditionType}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 text-[11px]">-</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center font-mono text-xs text-slate-600">
                                                        {opt.TaxCalculationProcedure || '0TXIN'}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center font-mono text-xs text-slate-600">
                                                        {opt.Country ? (
                                                            <span className="inline-flex rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                                                {opt.Country}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 text-[11px]">-</span>
                                                        )}
                                                    </td>
                                                </>
                                             ) : isInfoRecordSearch ? (
                                                <>
                                                    <td className="py-2.5 px-4 font-mono font-bold text-[#0070f2]">
                                                        <span className="rounded bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-mono font-bold text-indigo-800">
                                                            {opt.PurchasingInfoRecord || opt.code}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-4 font-mono text-xs font-semibold text-slate-700">
                                                        {(opt.Supplier || opt.raw_data?.Supplier || opt.supplier) ? (
                                                            <div className="flex flex-col">
                                                                <span className="rounded w-fit bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-mono text-slate-700">
                                                                    {opt.Supplier || opt.raw_data?.Supplier || opt.supplier}
                                                                </span>
                                                                {(opt.SupplierName || opt.raw_data?.SupplierName || opt.supplierName) && (
                                                                    <span className="text-[11px] font-normal text-slate-600 truncate max-w-[200px] mt-0.5">
                                                                        {opt.SupplierName || opt.raw_data?.SupplierName || opt.supplierName}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 italic text-[11px]">-</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-4 font-mono text-xs font-medium text-[#1c2d42]">
                                                        {(opt.Material || opt.raw_data?.Material || opt.material) ? (
                                                            <span className="rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-mono text-[#0070f2]">
                                                                {opt.Material || opt.raw_data?.Material || opt.material}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 italic text-[11px]">-</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-xs text-[#556b82]">
                                                        {opt.extra || opt.name || 'SAP Purchasing Info Record'}
                                                    </td>
                                                </>
                                            ) : isOutlineContractSearch ? (
                                                <>
                                                    <td className="py-2.5 px-4 font-mono font-bold text-[#0070f2]">
                                                        <span className="rounded bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-mono font-bold text-indigo-800">
                                                            {opt.PurchaseContractType || opt.code}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-4 font-medium text-[#1c2d42]">
                                                        {opt.PurchasingDocumentTypeName || opt.name}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center font-mono">
                                                        <span className="inline-flex rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                                                            {opt.PurchasingDocumentCategory || 'K'}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center font-mono text-xs text-slate-600">
                                                        <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-mono text-slate-700">
                                                            {opt.PurchasingDocumentType || opt.code}
                                                        </span>
                                                    </td>
                                                </>
                                            ) : (
                                                <>


                                                    <td className="py-2.5 px-4 font-mono font-bold text-[#0070f2]">
                                                        <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs">
                                                            {optCode !== '' ? optCode : <span className="text-slate-400 font-normal italic font-sans">[Blank]</span>}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-4 font-medium text-[#1c2d42]">
                                                        {optName}
                                                    </td>
                                                    {filteredOptions.some((o) => o.extra) && (
                                                        <td className="py-2.5 px-4 text-[11px] text-[#556b82]">
                                                            {opt.extra || '-'}
                                                        </td>
                                                    )}
                                                </>
                                            )}
                                            <td className="py-2.5 px-4 text-right">
                                                {isSelected ? (
                                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#0070f2] text-white">
                                                        <Check className="h-3 w-3" />
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] font-semibold text-[#0070f2] opacity-0 group-hover:opacity-100 hover:underline">
                                                        Select
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 bg-[#f8fafc] text-xs text-[#556b82]">
                    <span>{filteredOptions.length} entries available</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-[#d9e2ec] bg-white px-3 py-1.5 text-xs font-semibold text-[#1c2d42] hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
