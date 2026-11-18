import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, Filter, Layers, Tag, Box, Check, Database, Zap } from 'lucide-react';

export interface MaterialItem {
    id: string;
    Material: string;
    MaterialDescription: string;
    MaterialGroup?: string;
    MaterialType?: string;
    BaseUnit?: string;
    Plant?: string;
    MovingAveragePrice?: number;
    StandardPrice?: number;
    InventoryValuationProcedure?: string;
    valuationPrice?: number;
    Currency?: string;
    poText?: string;
    raw_data?: any;
    _formatted?: {
        Material?: string;
        MaterialDescription?: string;
    };
    [key: string]: any;
}

interface MaterialSearchInputProps {
    onSelect: (material: MaterialItem) => void;
    placeholder?: string;
    initialValue?: string;
    plant?: string;
    className?: string;
    autoFocus?: boolean;
    showFilters?: boolean;
    onClose?: () => void;
}

export const MaterialSearchInput: React.FC<MaterialSearchInputProps> = ({
    onSelect,
    placeholder = 'Search by Material # (SKU) or Description (e.g. 1000000005, Chair, Valve, Pipe)...',
    initialValue = '',
    plant = '',
    className = '',
    autoFocus = true,
    showFilters = true,
    onClose,
}) => {
    const [query, setQuery] = useState(initialValue);
    const [results, setResults] = useState<MaterialItem[]>([]);
    const [totalHits, setTotalHits] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [source, setSource] = useState<string>('');

    // Facet filters
    const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
    const [selectedType, setSelectedType] = useState<string>('ALL');
    const [facets, setFacets] = useState<{
        MaterialGroup?: Record<string, number>;
        MaterialType?: Record<string, number>;
        Plant?: Record<string, number>;
    }>({});

    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Fetch search results from API endpoint (/api/materials/search)
    const performSearch = useCallback(
        async (searchQuery: string, groupFilter: string, typeFilter: string) => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            const controller = new AbortController();
            abortControllerRef.current = controller;
            setIsLoading(true);

            try {
                const params = new URLSearchParams();
                if (searchQuery.trim()) params.set('q', searchQuery.trim());
                if (groupFilter !== 'ALL') params.set('group', groupFilter);
                if (typeFilter !== 'ALL') params.set('type', typeFilter);
                if (plant) params.set('plant', plant);
                params.set('limit', '30');

                const res = await fetch(`/api/materials/search?${params.toString()}`, {
                    signal: controller.signal,
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });

                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const data = await res.json();
                setResults(data.hits || []);
                setTotalHits(data.totalHits ?? (data.hits?.length || 0));
                setSource(data.source || 'cache');
                if (data.facets) {
                    setFacets(data.facets);
                }
                setIsOpen(true);
                setSelectedIndex(-1);
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error('Material search error:', err);
                    setResults([]);
                    setTotalHits(0);
                }
            } finally {
                if (abortControllerRef.current === controller) {
                    setIsLoading(false);
                }
            }
        },
        [plant]
    );

    // 250ms–300ms Debounce effect
    useEffect(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            performSearch(query, selectedGroup, selectedType);
        }, 280);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [query, selectedGroup, selectedType, performSearch]);

    // Initial search on mount
    useEffect(() => {
        performSearch(initialValue, 'ALL', 'ALL');
    }, [initialValue, performSearch]);

    // Scroll selected item into view
    useEffect(() => {
        if (selectedIndex >= 0 && listRef.current) {
            const selectedElem = listRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElem) {
                selectedElem.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    // Keyboard navigation handler
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setIsOpen(true);
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && results[selectedIndex]) {
                    handleSelectItem(results[selectedIndex]);
                } else if (results.length > 0) {
                    handleSelectItem(results[0]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                if (query) {
                    setQuery('');
                } else {
                    setIsOpen(false);
                    onClose?.();
                }
                break;
            default:
                break;
        }
    };

    const handleSelectItem = (item: MaterialItem) => {
        onSelect(item);
        setIsOpen(false);
    };

    const handleClear = () => {
        setQuery('');
        setSelectedIndex(-1);
        inputRef.current?.focus();
    };

    const topGroups = Object.keys(facets.MaterialGroup || {}).slice(0, 5);
    const topTypes = Object.keys(facets.MaterialType || {}).slice(0, 4);

    return (
        <div className={`relative w-full ${className}`}>
            {/* Search Input Bar */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    {/* Left Icon (Search / Spinner) */}
                    <div className="absolute top-1/2 left-3 -translate-y-1/2 pointer-events-none text-slate-400">
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-[#0070f2]" />
                        ) : (
                            <Search className="h-4 w-4 text-[#8c9ba5]" />
                        )}
                    </div>

                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsOpen(true)}
                        placeholder={placeholder}
                        autoFocus={autoFocus}
                        className="h-10 w-full rounded-lg border border-[#d9e2ec] pl-9.5 pr-10 text-xs text-[#1c2d42] placeholder-[#8c9ba5] focus:border-[#0070f2] focus:ring-2 focus:ring-[#0070f2]/20 focus:outline-none transition-all shadow-xs"
                    />

                    {/* Clear Button */}
                    {query && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute top-1/2 right-3 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-800 transition-colors cursor-pointer"
                            title="Clear query (Esc)"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>

                {/* Engine Source Badge */}
                <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] text-slate-600 font-medium shrink-0">
                    {source === 'meilisearch' ? (
                        <>
                            <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                            <span>Meilisearch</span>
                        </>
                    ) : (
                        <>
                            <Database className="h-3.5 w-3.5 text-blue-500" />
                            <span>Fast Cache</span>
                        </>
                    )}
                    <span className="text-slate-400">|</span>
                    <span className="font-semibold text-slate-700">{totalHits} hits</span>
                </div>
            </div>

            {/* Facet Filter Pills */}
            {showFilters && (topGroups.length > 0 || topTypes.length > 0) && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="flex items-center gap-1 text-slate-500 font-medium mr-1">
                        <Filter className="h-3 w-3" /> Filters:
                    </span>

                    {/* Groups Filter */}
                    {topGroups.length > 0 && (
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setSelectedGroup('ALL')}
                                className={`rounded-full px-2 py-0.5 font-medium transition-colors cursor-pointer ${
                                    selectedGroup === 'ALL'
                                        ? 'bg-[#0070f2] text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                All Groups
                            </button>
                            {topGroups.map((grp) => (
                                <button
                                    key={grp}
                                    type="button"
                                    onClick={() => setSelectedGroup(grp === selectedGroup ? 'ALL' : grp)}
                                    className={`rounded-full px-2 py-0.5 font-medium transition-colors cursor-pointer ${
                                        selectedGroup === grp
                                            ? 'bg-[#0070f2] text-white shadow-xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {grp} ({facets.MaterialGroup?.[grp]})
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Dropdown Results List */}
            {isOpen && (
                <div className="absolute left-0 right-0 z-50 mt-1.5 max-h-[360px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl divide-y divide-slate-100">
                    {/* Header bar inside dropdown */}
                    <div className="sticky top-0 z-10 flex items-center justify-between bg-slate-50 px-3.5 py-1.5 text-[11px] font-semibold text-slate-600 border-b border-slate-100">
                        <span>
                            {totalHits} materials found {query ? `for "${query}"` : ''}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                            ↑↓ Navigate • Enter to select • Esc to close
                        </span>
                    </div>

                    {results.length === 0 && !isLoading ? (
                        <div className="p-6 text-center text-xs text-slate-500">
                            <Box className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                            <p className="font-semibold text-slate-700">No matching materials found</p>
                            <p className="text-[11px] text-slate-400 mt-1">
                                Try searching with different keywords, SKU code, or clearing filters.
                            </p>
                        </div>
                    ) : (
                        <div ref={listRef} className="divide-y divide-slate-100">
                            {results.map((item, idx) => {
                                const isSelected = idx === selectedIndex;
                                const rawMat = item._formatted?.Material || item.Material;
                                const rawDesc = item._formatted?.MaterialDescription || item.MaterialDescription;

                                return (
                                    <div
                                        key={item.id || `${item.Material}-${item.Plant}-${idx}`}
                                        onClick={() => handleSelectItem(item)}
                                        className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer transition-colors ${
                                            isSelected ? 'bg-blue-50/90' : 'hover:bg-slate-50/80'
                                        }`}
                                    >
                                        <div className="flex-1 min-w-0 pr-3">
                                            {/* Top Line: SKU & Description */}
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span
                                                    className="font-mono text-xs font-bold text-[#0070f2] bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5"
                                                    dangerouslySetInnerHTML={{ __html: rawMat }}
                                                />
                                                <span
                                                    className="text-xs font-semibold text-[#1c2d42] truncate"
                                                    dangerouslySetInnerHTML={{ __html: rawDesc }}
                                                />
                                            </div>

                                            {/* Bottom Line: Plant, Type, Group, UoM */}
                                            <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                                {item.Plant && (
                                                    <span className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                                                        Plant {item.Plant}
                                                    </span>
                                                )}
                                                {item.BaseUnit && (
                                                    <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-700">
                                                        UoM: {item.BaseUnit}
                                                    </span>
                                                )}
                                                {item.MaterialGroup && (
                                                    <span className="text-slate-400 text-[10px]">
                                                        Group: {item.MaterialGroup}
                                                    </span>
                                                )}
                                                {item.MaterialType && (
                                                    <span className="text-slate-400 text-[10px]">
                                                        Type: {item.MaterialType}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Price / Selection indicator */}
                                        <div className="text-right shrink-0 flex items-center gap-2">
                                            {item.valuationPrice !== undefined && item.valuationPrice > 0 && (
                                                <div className="text-right">
                                                    <div className="text-xs font-mono font-bold text-slate-800">
                                                        {Number(item.valuationPrice).toFixed(2)}{' '}
                                                        <span className="text-[10px] text-slate-500 font-normal">
                                                            {item.Currency || 'INR'}
                                                        </span>
                                                    </div>
                                                    <div className="text-[9px] text-slate-400 uppercase">
                                                        {item.InventoryValuationProcedure === 'V'
                                                            ? 'Moving Avg'
                                                            : item.InventoryValuationProcedure === 'S'
                                                            ? 'Standard'
                                                            : 'Price'}
                                                    </div>
                                                </div>
                                            )}

                                            {isSelected && (
                                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0070f2] text-white">
                                                    <Check className="h-3 w-3" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MaterialSearchInput;
