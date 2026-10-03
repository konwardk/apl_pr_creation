import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    X,
    Plus,
    Trash2,
    Building2,
    DollarSign,
    Package,
    Layers,
    Calendar,
    AlertCircle,
    CheckCircle2,
    Loader2,
} from 'lucide-react';

interface PrItemInput {
    id: string;
    item_number: string;
    material_code: string;
    description: string;
    material_group: string;
    quantity: number;
    unit_of_measure: string;
    unit_price: number;
    plant: string;
    cost_center: string;
    gl_account: string;
}

interface CreatePurchaseRequisitionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CreatePurchaseRequisitionModal({
    isOpen,
    onClose,
}: CreatePurchaseRequisitionModalProps) {
    const [description, setDescription] = useState('');
    const [prType, setPrType] = useState('NB'); // Standard PR
    const [companyCode, setCompanyCode] = useState('1010');
    const [plant, setPlant] = useState('1010');
    const [currency, setCurrency] = useState('USD');
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [items, setItems] = useState<PrItemInput[]>([
        {
            id: '1',
            item_number: '00010',
            material_code: 'TG11',
            description: 'High Pressure Hydraulic Seal 120mm',
            material_group: 'L001',
            quantity: 5,
            unit_of_measure: 'PC',
            unit_price: 320.00,
            plant: '1010',
            cost_center: '10101101',
            gl_account: '51000000',
        },
    ]);

    if (!isOpen) return null;

    const addItem = () => {
        const nextNum = (items.length + 1) * 10;
        const itemNumberStr = String(nextNum).padStart(5, '0');
        setItems([
            ...items,
            {
                id: String(Date.now()),
                item_number: itemNumberStr,
                material_code: '',
                description: '',
                material_group: 'L001',
                quantity: 1,
                unit_of_measure: 'EA',
                unit_price: 0,
                plant: plant,
                cost_center: '10101101',
                gl_account: '51000000',
            },
        ]);
    };

    const removeItem = (id: string) => {
        if (items.length <= 1) return;
        setItems(items.filter((item) => item.id !== id));
    };

    const updateItem = (id: string, field: keyof PrItemInput, value: any) => {
        setItems(
            items.map((item) => {
                if (item.id === id) {
                    return { ...item, [field]: value };
                }
                return item;
            })
        );
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        if (!description.trim()) {
            setErrorMessage('Please provide a Header Description for the Purchase Requisition.');
            return;
        }

        for (const item of items) {
            if (!item.description.trim()) {
                setErrorMessage(`Item ${item.item_number}: Description is required.`);
                return;
            }
            if (item.quantity <= 0) {
                setErrorMessage(`Item ${item.item_number}: Quantity must be greater than 0.`);
                return;
            }
        }

        setSubmitting(true);

        router.post(
            '/purchase-requisitions',
            {
                description,
                pr_type: prType,
                company_code: companyCode,
                plant,
                currency,
                items: items.map((item) => ({
                    description: item.description,
                    material_code: item.material_code,
                    material_group: item.material_group,
                    quantity: item.quantity,
                    unit_of_measure: item.unit_of_measure,
                    unit_price: item.unit_price,
                    plant: item.plant,
                    cost_center: item.cost_center,
                    gl_account: item.gl_account,
                })),
            },
            {
                onSuccess: () => {
                    setSubmitting(false);
                    onClose();
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="relative w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-2xl my-8">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-[#d9e2ec] px-6 py-4 bg-[#f8fafc] rounded-t-xl">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0070f2] text-white">
                            <Package className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-[#1c2d42]">
                                Create Purchase Requisition (SAP S/4HANA Cloud)
                            </h2>
                            <p className="text-xs text-[#556b82]">
                                Saves to local MySQL database and prepares OData V4 payload for SAP Public Cloud
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

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {errorMessage && (
                        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {/* PR Header Attributes */}
                    <div className="rounded-lg border border-[#d9e2ec] bg-white p-4">
                        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#556b82]">
                            Requisition Header Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                    Header Description / Subject <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g. Spare Parts for Machine Line 4"
                                    required
                                    className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                    PR Document Type
                                </label>
                                <select
                                    value={prType}
                                    onChange={(e) => setPrType(e.target.value)}
                                    className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none bg-white"
                                >
                                    <option value="NB">NB - Standard Purchase Requisition</option>
                                    <option value="ZNB">ZNB - Custom Direct Procurement</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                    Plant
                                </label>
                                <select
                                    value={plant}
                                    onChange={(e) => setPlant(e.target.value)}
                                    className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none bg-white"
                                >
                                    <option value="1010">1010 - Plant Walldorf / US</option>
                                    <option value="1020">1020 - Plant Texas Tech Center</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                    Company Code
                                </label>
                                <input
                                    type="text"
                                    value={companyCode}
                                    onChange={(e) => setCompanyCode(e.target.value)}
                                    className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#1c2d42] mb-1">
                                    Currency
                                </label>
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className="h-9 w-full rounded-md border border-[#d9e2ec] px-3 text-xs text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2] focus:outline-none bg-white"
                                >
                                    <option value="USD">USD - US Dollar</option>
                                    <option value="EUR">EUR - Euro</option>
                                    <option value="INR">INR - Indian Rupee</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Line Items Section */}
                    <div className="rounded-lg border border-[#d9e2ec] bg-white p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#556b82]">
                                Requisition Line Items ({items.length})
                            </h3>
                            <button
                                type="button"
                                onClick={addItem}
                                className="flex items-center gap-1 rounded bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#0070f2] hover:bg-blue-100 transition-colors"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Add Item Line</span>
                            </button>
                        </div>

                        {/* Items Table */}
                        <div className="overflow-x-auto rounded border border-slate-200">
                            <table className="w-full text-left text-xs text-[#1c2d42]">
                                <thead className="bg-[#f8fafc] text-[11px] font-semibold text-[#556b82] border-b border-slate-200">
                                    <tr>
                                        <th className="py-2.5 px-2 w-14">Item</th>
                                        <th className="py-2.5 px-2 w-28">Material</th>
                                        <th className="py-2.5 px-2">Description *</th>
                                        <th className="py-2.5 px-2 w-20">Qty *</th>
                                        <th className="py-2.5 px-2 w-16">UoM</th>
                                        <th className="py-2.5 px-2 w-24">Price ({currency})</th>
                                        <th className="py-2.5 px-2 w-28">Cost Center</th>
                                        <th className="py-2.5 px-2 w-24">Subtotal</th>
                                        <th className="py-2.5 px-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50">
                                            <td className="py-2 px-2 font-mono text-[11px] text-slate-500">
                                                {item.item_number}
                                            </td>
                                            <td className="py-2 px-2">
                                                <input
                                                    type="text"
                                                    value={item.material_code}
                                                    onChange={(e) => updateItem(item.id, 'material_code', e.target.value)}
                                                    placeholder="TG11"
                                                    className="h-8 w-full rounded border border-slate-200 px-2 text-xs focus:border-[#0070f2] focus:outline-none"
                                                />
                                            </td>
                                            <td className="py-2 px-2">
                                                <input
                                                    type="text"
                                                    value={item.description}
                                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                                    placeholder="Item short text"
                                                    required
                                                    className="h-8 w-full rounded border border-slate-200 px-2 text-xs focus:border-[#0070f2] focus:outline-none"
                                                />
                                            </td>
                                            <td className="py-2 px-2">
                                                <input
                                                    type="number"
                                                    step="0.001"
                                                    min="0.001"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                    className="h-8 w-full rounded border border-slate-200 px-2 text-xs text-right focus:border-[#0070f2] focus:outline-none"
                                                />
                                            </td>
                                            <td className="py-2 px-2">
                                                <select
                                                    value={item.unit_of_measure}
                                                    onChange={(e) => updateItem(item.id, 'unit_of_measure', e.target.value)}
                                                    className="h-8 w-full rounded border border-slate-200 px-1 text-xs focus:border-[#0070f2] focus:outline-none bg-white"
                                                >
                                                    <option value="PC">PC</option>
                                                    <option value="EA">EA</option>
                                                    <option value="KG">KG</option>
                                                    <option value="M">M</option>
                                                    <option value="SET">SET</option>
                                                </select>
                                            </td>
                                            <td className="py-2 px-2">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={item.unit_price}
                                                    onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                                    className="h-8 w-full rounded border border-slate-200 px-2 text-xs text-right focus:border-[#0070f2] focus:outline-none"
                                                />
                                            </td>
                                            <td className="py-2 px-2">
                                                <input
                                                    type="text"
                                                    value={item.cost_center}
                                                    onChange={(e) => updateItem(item.id, 'cost_center', e.target.value)}
                                                    className="h-8 w-full rounded border border-slate-200 px-2 text-xs font-mono text-[11px] focus:border-[#0070f2] focus:outline-none"
                                                />
                                            </td>
                                            <td className="py-2 px-2 font-semibold text-right text-xs">
                                                ${((item.quantity || 0) * (item.unit_price || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-2 px-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(item.id)}
                                                    disabled={items.length <= 1}
                                                    className="rounded p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Total Footer */}
                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                            <span className="text-xs text-[#556b82]">
                                Pricing based on SAP Public Cloud Purchasing Org standards
                            </span>
                            <div className="text-right">
                                <span className="text-xs text-[#556b82] mr-2">Calculated Total Amount:</span>
                                <span className="text-base font-bold text-[#1c2d42]">
                                    {currency} ${calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                        <div className="text-[11px] text-[#556b82] flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span>Payload will be stored in <strong className="text-[#1c2d42]">apl_pr_db</strong> and formatted for SAP OData V4</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={submitting}
                                className="rounded-md border border-[#d9e2ec] px-4 py-2 text-xs font-medium text-[#1c2d42] hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex items-center gap-2 rounded-md bg-[#0070f2] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2] active:bg-[#003884] disabled:opacity-70 transition-colors"
                            >
                                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                <span>Save & Prepare SAP OData V4</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
