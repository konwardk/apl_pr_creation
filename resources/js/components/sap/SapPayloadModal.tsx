import React, { useState } from 'react';
import {
    X,
    Copy,
    Check,
    FileCode,
    ListFilter,
    Server,
    ExternalLink,
    CheckCircle2,
    Clock,
    AlertTriangle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';


interface PrItem {
    id: number;
    item_number: string;
    material_code?: string;
    description: string;
    material_group: string;
    quantity: number | string;
    unit_of_measure: string;
    unit_price: number | string;
    total_price: number | string;
    currency: string;
    plant: string;
    cost_center?: string;
    gl_account?: string;
    delivery_date?: string;
}

interface PurchaseRequisition {
    id: number;
    pr_number: string;
    sap_pr_number?: string | null;
    description: string;
    pr_type: string;
    company_code: string;
    plant: string;
    total_amount: number | string;
    currency: string;
    approval_status: string;
    sap_sync_status: string;
    sap_sync_message?: string | null;
    sap_synced_at?: string | null;
    sap_payload?: any;
    sap_response?: any;
    created_at: string;
    items?: PrItem[];
}

interface SapPayloadModalProps {
    pr: PurchaseRequisition | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function SapPayloadModal({
    pr,
    isOpen,
    onClose,
}: SapPayloadModalProps) {
    const [activeTab, setActiveTab] = useState<'payload' | 'items' | 'response'>('payload');
    const [copied, setCopied] = useState(false);

    if (!isOpen || !pr) return null;

    // Construct or fallback to realistic SAP OData V4 payload
    const odataPayload = pr.sap_payload || {
        PurchaseRequisitionType: pr.pr_type || 'NB',
        PurReqnDescription: pr.description,
        _PurchaseRequisitionItem: (pr.items || []).map((item) => ({
            PurchaseRequisitionItem: item.item_number,
            Material: item.material_code || '',
            PurchaseRequisitionItemText: item.description,
            MaterialGroup: item.material_group || 'L001',
            RequestedQuantity: Number(item.quantity),
            BaseUnit: item.unit_of_measure || 'PC',
            PurchaseRequisitionPrice: Number(item.unit_price),
            PurReqnPriceQuantity: 1,
            Plant: item.plant || pr.plant || '1010',
            StorageLocation: '101A',
            AccountAssignmentCategory: 'K',
            _PurchaseReqnAcctAssgmt: [
                {
                    CostCenter: item.cost_center || '10101101',
                    GLAccount: item.gl_account || '51000000',
                    CompanyCode: pr.company_code || '1010',
                },
            ],
        })),
    };

    const payloadString = JSON.stringify(odataPayload, null, 2);

    const handleCopy = () => {
        navigator.clipboard.writeText(payloadString);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="relative w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-2xl my-8">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#d9e2ec] px-6 py-4 bg-[#f8fafc] rounded-t-xl">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0070f2] text-white">
                            <FileCode className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-[#1c2d42]">
                                    {pr.pr_number}
                                </h2>
                                {pr.sap_pr_number ? (
                                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                                        SAP S/4HANA PR #{pr.sap_pr_number}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                        Pending SAP Sync
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-[#556b82] truncate max-w-lg">
                                {pr.description}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Subheader / Tabs */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 bg-white">
                    <div className="flex space-x-4">
                        <button
                            type="button"
                            onClick={() => setActiveTab('payload')}
                            className={`flex items-center gap-1.5 border-b-2 py-3 text-xs font-semibold transition-all ${
                                activeTab === 'payload'
                                    ? 'border-[#0070f2] text-[#0070f2]'
                                    : 'border-transparent text-[#556b82] hover:text-[#1c2d42]'
                            }`}
                        >
                            <FileCode className="h-3.5 w-3.5" />
                            <span>SAP OData V4 JSON Payload</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('items')}
                            className={`flex items-center gap-1.5 border-b-2 py-3 text-xs font-semibold transition-all ${
                                activeTab === 'items'
                                    ? 'border-[#0070f2] text-[#0070f2]'
                                    : 'border-transparent text-[#556b82] hover:text-[#1c2d42]'
                            }`}
                        >
                            <ListFilter className="h-3.5 w-3.5" />
                            <span>Line Items Breakdown ({pr.items?.length || 0})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('response')}
                            className={`flex items-center gap-1.5 border-b-2 py-3 text-xs font-semibold transition-all ${
                                activeTab === 'response'
                                    ? 'border-[#0070f2] text-[#0070f2]'
                                    : 'border-transparent text-[#556b82] hover:text-[#1c2d42]'
                            }`}
                        >
                            <Server className="h-3.5 w-3.5" />
                            <span>SAP Sync Status & Logs</span>
                        </button>
                    </div>

                    {activeTab === 'payload' && (
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="flex items-center gap-1 rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                        >
                            {copied ? (
                                <>
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                    <span className="text-emerald-700">Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="h-3.5 w-3.5" />
                                    <span>Copy JSON</span>
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6">
                    {activeTab === 'payload' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-[11px] text-[#556b82]">
                                <span>Target Entity: <code className="font-mono text-[#0070f2]">/PurchaseRequisition</code></span>
                                <span>Method: <strong className="text-emerald-600">POST</strong> • Format: JSON</span>
                            </div>
                            <div className="relative rounded-lg bg-[#0d1522] p-4 text-[#e2e8f0] font-mono text-xs overflow-x-auto max-h-[420px] leading-relaxed border border-slate-800">
                                <pre>{payloadString}</pre>
                            </div>
                            <p className="text-[11px] text-[#556b82]">
                                Standard schema conformant with SAP S/4HANA Cloud OData V4 service <code>API_PURCHASEREQUISITION_PROCESS_SRV</code>.
                            </p>
                        </div>
                    )}

                    {activeTab === 'items' && (
                        <div className="space-y-4">
                            <div className="overflow-x-auto rounded border border-slate-200">
                                <table className="w-full text-left text-xs text-[#1c2d42]">
                                    <thead className="bg-[#f8fafc] text-[11px] font-semibold text-[#556b82] border-b border-slate-200">
                                        <tr>
                                            <th className="py-2.5 px-3">Item</th>
                                            <th className="py-2.5 px-3">Material</th>
                                            <th className="py-2.5 px-3">Description</th>
                                            <th className="py-2.5 px-3">Quantity</th>
                                            <th className="py-2.5 px-3">Unit Price</th>
                                            <th className="py-2.5 px-3">Total</th>
                                            <th className="py-2.5 px-3">Plant</th>
                                            <th className="py-2.5 px-3">Cost Center</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(pr.items || []).map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50">
                                                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                                                    {item.item_number}
                                                </td>
                                                <td className="py-2.5 px-3 font-mono font-medium text-[#0070f2]">
                                                    {item.material_code || '-'}
                                                </td>
                                                <td className="py-2.5 px-3 font-medium text-[#1c2d42]">
                                                    {item.description}
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    {Number(item.quantity)} {item.unit_of_measure}
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    {formatCurrency(item.unit_price, item.currency || pr.currency)}
                                                </td>
                                                <td className="py-2.5 px-3 font-semibold">
                                                    {formatCurrency(item.total_price, item.currency || pr.currency)}
                                                </td>
                                                <td className="py-2.5 px-3 font-mono text-[11px]">
                                                    {item.plant}
                                                </td>
                                                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                                                    {item.cost_center || '10101101'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-between items-center rounded-lg bg-slate-50 p-3 text-xs border border-slate-200">
                                <span className="text-[#556b82]">Requisition Currency: <strong>{pr.currency}</strong></span>
                                <span className="font-bold text-sm text-[#1c2d42]">
                                    Header Total: {formatCurrency(pr.total_amount, pr.currency)} ({pr.currency})
                                </span>
                            </div>
                        </div>
                    )}

                    {activeTab === 'response' && (
                        <div className="space-y-4 text-xs">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-[#1c2d42]">SAP Sync Status:</span>
                                    {pr.sap_sync_status === 'synced' ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            HTTP 201 Created (Synced)
                                        </span>
                                    ) : pr.sap_sync_status === 'failed' ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
                                            <AlertTriangle className="h-3.5 w-3.5" />
                                            Sync Failed
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                                            <Clock className="h-3.5 w-3.5" />
                                            Pending Sync
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <span className="text-[#556b82] block mb-1">Status Message:</span>
                                    <div className="rounded border border-slate-200 bg-white p-2.5 font-mono text-[11px] text-[#1c2d42]">
                                        {pr.sap_sync_message || 'Awaiting transmission to SAP Public Cloud endpoint.'}
                                    </div>
                                </div>

                                {pr.sap_synced_at && (
                                    <div className="flex items-center justify-between text-[#556b82]">
                                        <span>Timestamp:</span>
                                        <span className="font-mono">{new Date(pr.sap_synced_at).toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            {pr.sap_response && (
                                <div>
                                    <span className="text-[11px] font-semibold text-[#556b82] block mb-1">
                                        Raw SAP S/4HANA Cloud Response:
                                    </span>
                                    <div className="rounded-lg bg-[#0d1522] p-4 text-[#e2e8f0] font-mono text-[11px] max-h-48 overflow-y-auto">
                                        <pre>{JSON.stringify(pr.sap_response, null, 2)}</pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end border-t border-slate-100 px-6 py-3 bg-[#f8fafc] rounded-b-xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md bg-[#0070f2] px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2]"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
