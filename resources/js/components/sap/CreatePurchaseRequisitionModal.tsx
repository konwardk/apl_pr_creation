import React from 'react';
import { router } from '@inertiajs/react';
import { X, ExternalLink, Package, Edit3 } from 'lucide-react';
import { HeaderOption, PrDocumentType, ItemCategory } from '@/types';
import PurchaseRequisitionForm from './PurchaseRequisitionForm';

interface CreatePurchaseRequisitionModalProps {
    isOpen: boolean;
    onClose: () => void;
    purchaseRequisition?: any | null;
    headerOptions?: HeaderOption[];
    prDocumentTypes?: PrDocumentType[];
    itemCategories?: ItemCategory[];
}

export default function CreatePurchaseRequisitionModal({
    isOpen,
    onClose,
    purchaseRequisition = null,
    headerOptions = [],
    prDocumentTypes = [],
    itemCategories = [],
}: CreatePurchaseRequisitionModalProps) {
    if (!isOpen) return null;

    const isEdit = Boolean(purchaseRequisition && purchaseRequisition.id);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="relative w-full max-w-6xl xl:max-w-7xl rounded-xl border border-slate-200 bg-[#f5f6f8] shadow-2xl my-8 max-h-[92vh] flex flex-col overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-[#d9e2ec] px-6 py-4 bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isEdit ? 'bg-amber-600' : 'bg-[#0070f2]'} text-white`}>
                            {isEdit ? <Edit3 className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-[#1c2d42]">
                                    {isEdit
                                        ? `Edit Purchase Requisition (${purchaseRequisition.pr_number})`
                                        : 'Create Purchase Requisition (SAP S/4HANA Cloud)'}
                                </h2>
                                {isEdit && (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-300">
                                        Draft
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-[#556b82]">
                                {isEdit
                                    ? 'Update draft details and items or finalize and sync to SAP Public Cloud'
                                    : 'Complete all fields according to SAP Public Cloud specifications'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                router.visit(isEdit ? `/purchase-requisitions/${purchaseRequisition.id}/edit` : '/purchase-requisitions/create');
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
                        initialData={purchaseRequisition}
                        headerOptions={headerOptions}
                        prDocumentTypes={prDocumentTypes}
                        itemCategories={itemCategories}
                    />
                </div>
            </div>
        </div>
    );
}
