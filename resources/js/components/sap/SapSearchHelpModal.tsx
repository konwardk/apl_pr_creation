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
}

export default function SapSearchHelpModal({
    isOpen,
    onClose,
    title,
    subtitle = 'Select an entry from the SAP Master Data Catalog',
    options = [],
    selectedCode = '',
    onSelect,
}: SapSearchHelpModalProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredOptions = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return options;
        return options.filter(
            (opt) =>
                opt.code.toLowerCase().includes(q) ||
                opt.name.toLowerCase().includes(q) ||
                (opt.extra && opt.extra.toLowerCase().includes(q))
        );
    }, [options, searchQuery]);

    if (!isOpen) return null;

    const hasExtendedColumns = filteredOptions.some((o) => o.materialType);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className={`relative w-full ${hasExtendedColumns ? 'max-w-3xl' : 'max-w-xl'} rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]`}>
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
                            placeholder="Type to search code or description..."
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
                    {filteredOptions.length === 0 ? (
                        <div className="p-8 text-center text-xs text-[#556b82]">
                            <Database className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                            <p className="font-semibold text-slate-600">No matching entries found</p>
                            <p className="text-[11px] text-slate-400 mt-1">Try another search term or enter value manually.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-xs text-[#1c2d42]">
                            <thead className="bg-[#f8fafc] text-[11px] font-semibold text-[#556b82] sticky top-0 border-b border-slate-100">
                                <tr>
                                    <th className="py-2.5 px-4 w-32">Code / ID</th>
                                    <th className="py-2.5 px-4">Description</th>
                                    {filteredOptions.some((o) => o.materialType) ? (
                                        <>
                                            <th className="py-2.5 px-3 w-32">Material Type</th>
                                            <th className="py-2.5 px-3 w-28">Group</th>
                                            <th className="py-2.5 px-3 w-20">UoM</th>
                                            <th className="py-2.5 px-3 w-28 text-right">Unit Price</th>
                                        </>
                                    ) : filteredOptions.some((o) => o.extra) ? (
                                        <th className="py-2.5 px-4">Details / SAP Spec</th>
                                    ) : null}
                                    <th className="py-2.5 px-4 text-right w-16">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredOptions.map((opt) => {
                                    const isSelected = selectedCode === opt.code;
                                    const isMat = Boolean(opt.materialType);

                                    return (
                                        <tr
                                            key={opt.code}
                                            onClick={() => {
                                                onSelect(opt);
                                                onClose();
                                            }}
                                            className={`cursor-pointer transition-colors hover:bg-blue-50/60 ${
                                                isSelected ? 'bg-blue-50/80 font-medium' : ''
                                            }`}
                                        >
                                            <td className="py-2.5 px-4 font-mono font-bold text-[#0070f2]">
                                                {opt.code}
                                            </td>
                                            <td className="py-2.5 px-4 font-medium text-[#1c2d42]">
                                                {opt.name}
                                            </td>
                                            {isMat ? (
                                                <>
                                                    <td className="py-2.5 px-3">
                                                        <span className="inline-flex rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-[#0057c2]">
                                                            {opt.materialType}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                                                        {opt.materialGroup || '-'}
                                                    </td>
                                                    <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-slate-700">
                                                        {opt.uom || '-'}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-medium text-[#1c2d42]">
                                                        {opt.unitPrice !== undefined ? `${Number(opt.unitPrice).toFixed(2)} ${opt.currency || 'INR'}` : '-'}
                                                    </td>
                                                </>
                                            ) : filteredOptions.some((o) => o.extra) ? (
                                                <td className="py-2.5 px-4 text-[11px] text-[#556b82]">
                                                    {opt.extra || '-'}
                                                </td>
                                            ) : null}
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
