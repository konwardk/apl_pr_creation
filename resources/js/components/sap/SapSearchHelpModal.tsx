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
}: SapSearchHelpModalProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredOptions = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return options;
        return options.filter((opt) => {
            const product = (opt.Product || opt.MaterialGroup || opt.GLAccount || opt.CostCenter || opt.code || '').toLowerCase();
            const productName = (opt.ProductName || opt.MaterialGroupName || opt.PlantName || opt.AcctAssignmentCategoryName || opt.GLAccountName || opt.name || '').toLowerCase();
            const companyCode = (opt.CompanyCode || opt.companyCode || '').toLowerCase();
            const controllingArea = (opt.ControllingArea || opt.controllingArea || '').toLowerCase();
            const profitCenter = (opt.ProfitCenter || opt.profitCenter || '').toLowerCase();
            const longName = (opt.GLAccountLongName || '').toLowerCase();
            const plant = (opt.Plant || opt.plant || opt.ValuationArea || '').toLowerCase();
            const extra = (opt.extra || '').toLowerCase();
            const uom = (opt.BaseUnit || opt.UnitOfMeasure || opt.uom || '').toLowerCase();
            const group = (opt.ProductGroup || opt.materialGroup || opt.MaterialGroup || '').toLowerCase();
            const extId = (opt.ProductExternalID || '').toLowerCase();
            const type = (opt.ProductType || opt.materialType || '').toLowerCase();
            const supplier = (opt.Supplier || opt.supplierName || opt.SupplierName || '').toLowerCase();
            const proc = (opt.InventoryValuationProcedure || opt.priceControl || '').toLowerCase();
            const currency = (opt.Currency || opt.currency || '').toLowerCase();

            return (
                product.includes(q) ||
                productName.includes(q) ||
                companyCode.includes(q) ||
                controllingArea.includes(q) ||
                profitCenter.includes(q) ||
                longName.includes(q) ||
                plant.includes(q) ||
                supplier.includes(q) ||
                extra.includes(q) ||
                uom.includes(q) ||
                group.includes(q) ||
                type.includes(q) ||
                proc.includes(q) ||
                currency.includes(q) ||
                extId.includes(q)
            );
        });
    }, [options, searchQuery]);

    if (!isOpen) return null;

    const isMaterialSearch = filteredOptions.some((o) => (o.Product && !o.MaterialGroup) || o.materialType || o.BaseUnit || o.StandardPrice !== undefined || o.MovingAveragePrice !== undefined);
    const isMaterialGroupSearch = !isMaterialSearch && (
        filteredOptions.some((o) => o.MaterialGroup || o.MaterialGroupName) ||
        title.toLowerCase().includes('material group')
    );
    const isGlAccountSearch = !isMaterialSearch && !isMaterialGroupSearch && (
        filteredOptions.some((o) => o.GLAccount || o.GLAccountName) ||
        title.toLowerCase().includes('g/l account') ||
        title.toLowerCase().includes('gl account')
    );
    const isCostCenterSearch = !isMaterialSearch && !isMaterialGroupSearch && !isGlAccountSearch && (
        filteredOptions.some((o) => o.CostCenter || o.ControllingArea) ||
        title.toLowerCase().includes('cost center')
    );
    const hasExtendedColumns = isMaterialSearch || isMaterialGroupSearch || isGlAccountSearch || isCostCenterSearch || filteredOptions.some((o) => o.materialType);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className={`relative w-full ${isMaterialSearch ? 'max-w-5xl' : (isMaterialGroupSearch || isGlAccountSearch || isCostCenterSearch || hasExtendedColumns) ? 'max-w-4xl' : 'max-w-xl'} rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]`}>
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
                    <div className="relative">
                        <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#8c9ba5]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={
                                isMaterialSearch
                                    ? "Search by Product (Material #), Plant, ProductType, UoM, or Price Control..."
                                    : isMaterialGroupSearch
                                    ? "Search by Material Group code (e.g. 100001, 110001) or description (e.g. Acids, Pipes)..."
                                    : isGlAccountSearch
                                    ? "Search by G/L Account # (e.g. 12545200), Company Code (e.g. 1000), or Account Name..."
                                    : isCostCenterSearch
                                    ? "Search by Cost Center (e.g. 10101PCC01), Profit Center (e.g. 1010PC0010), Area (e.g. A000)..."
                                    : "Type to search code or description..."
                            }
                            autoFocus
                            className="h-8.5 w-full rounded-md border border-[#d9e2ec] pl-9 pr-3 text-xs text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                            >
                                Clear
                            </button>
                        )}
                    </div>
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
                            <p className="font-semibold text-slate-600">No matching entries found</p>
                            <p className="text-[11px] text-slate-400 mt-1">Try another search term or enter value manually.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-xs text-[#1c2d42]">
                            <thead className="bg-[#f8fafc] text-[11px] font-semibold text-[#556b82] sticky top-0 border-b border-slate-100">
                                <tr>
                                    {isMaterialSearch ? (
                                        <>
                                            <th className="py-2.5 px-3.5 w-40 font-mono">Product (Material)</th>
                                            <th className="py-2.5 px-3 w-20">Plant</th>
                                            <th className="py-2.5 px-3 w-20">Type</th>
                                            <th className="py-2.5 px-3 w-20">Base Unit</th>
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
                                    const optCode = opt.MaterialGroup ?? opt.Product ?? opt.GLAccount ?? opt.CostCenter ?? opt.AccountAssignmentCategory ?? opt.code ?? '';
                                    const optName = opt.MaterialGroupName ?? opt.ProductName ?? opt.GLAccountName ?? opt.AcctAssignmentCategoryName ?? opt.name ?? '';
                                    const isSelected = selectedCode === optCode;

                                    return (
                                        <tr
                                            key={`${optCode}-${opt.Plant || idx}`}
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
                                                    {/* Product */}
                                                    <td className="py-2.5 px-3.5 font-mono font-bold text-[#0070f2]">
                                                        <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs text-[#1c2d42]">
                                                            {opt.Product || opt.code}
                                                        </span>
                                                        {opt.ProductName && opt.ProductName !== opt.Product && (
                                                            <div className="text-[11px] font-normal text-slate-600 truncate max-w-[150px]">
                                                                {opt.ProductName}
                                                            </div>
                                                        )}
                                                    </td>
                                                    {/* Plant (now input from this API) */}
                                                    <td className="py-2.5 px-3 font-mono">
                                                        <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                                                            {opt.Plant || opt.plant || opt.ValuationArea || '-'}
                                                        </span>
                                                    </td>
                                                    {/* Product Type */}
                                                    <td className="py-2.5 px-3">
                                                        <span className="inline-flex rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                                                            {opt.ProductType || opt.materialType || '-'}
                                                        </span>
                                                    </td>
                                                    {/* Base Unit */}
                                                    <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-slate-700">
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
                                                    <td className="py-2.5 px-4 text-[11px] text-[#556b82]">
                                                        {opt.Plant ? `Plant ${opt.Plant} • ` : ''}{opt.extra || 'Cost Center'}
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
