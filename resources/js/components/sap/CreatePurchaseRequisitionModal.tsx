import React from 'react';
import { router } from '@inertiajs/react';
import { X, ExternalLink, Package } from 'lucide-react';
import { HeaderOption, PrDocumentType } from '@/types';
import PurchaseRequisitionForm from './PurchaseRequisitionForm';

interface CreatePurchaseRequisitionModalProps {
    isOpen: boolean;
    onClose: () => void;
    headerOptions?: HeaderOption[];
    prDocumentTypes?: PrDocumentType[];
}

export default function CreatePurchaseRequisitionModal({
    isOpen,
    onClose,
    headerOptions = [],
    prDocumentTypes = [],
}: CreatePurchaseRequisitionModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="relative w-full max-w-5xl rounded-xl border border-slate-200 bg-[#f5f6f8] shadow-2xl my-8 max-h-[92vh] flex flex-col overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-[#d9e2ec] px-6 py-4 bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0070f2] text-white">
                            <Package className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-[#1c2d42]">
                                Create Purchase Requisition (SAP S/4HANA Cloud)
                            </h2>
                            <p className="text-xs text-[#556b82]">
                                Complete all fields according to SAP Public Cloud specifications
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                router.visit('/purchase-requisitions/create');
                            }}
                            className="flex items-center gap-1.5 rounded-md border border-[#d9e2ec] bg-white px-3 py-1.5 text-xs font-semibold text-[#0070f2] hover:bg-blue-50 transition-colors"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Open Dedicated Page</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Modal Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    <PurchaseRequisitionForm
                        isModal
                        onCloseModal={onClose}
                        headerOptions={headerOptions}
                        prDocumentTypes={prDocumentTypes}
                    />
                </div>
            </div>
        </div>
    );
}
