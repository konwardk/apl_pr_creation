import React, { useState } from 'react';
import { CheckCircle2, Clock, XCircle, RotateCcw, AlertTriangle, Layers, FileText } from 'lucide-react';
import { router } from '@inertiajs/react';

export interface SapStatusInfo {
    label: string;
    code: string;
    badgeText: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    dotColor: string;
    icon: 'check' | 'clock' | 'rejected' | 'default';
}

export function getSapReleaseStatusInfo(code?: string | null, text?: string | null): SapStatusInfo | null {
    if (!code || !code.trim()) {
        return null;
    }
    const clean = code.trim();

    switch (clean) {
        case '05': // Approved / Release Completed
            return {
                label: text || 'Approved / Release Completed',
                code: '05',
                badgeText: 'Approved (05)',
                bgColor: 'bg-emerald-50',
                textColor: 'text-emerald-700',
                borderColor: 'border-emerald-200',
                dotColor: 'bg-emerald-500',
                icon: 'check',
            };
        case '03': // In Release / Pending Approval
            return {
                label: text || 'In Approval (Pending)',
                code: '03',
                badgeText: 'In Approval (03)',
                bgColor: 'bg-amber-50',
                textColor: 'text-amber-800',
                borderColor: 'border-amber-200',
                dotColor: 'bg-amber-500',
                icon: 'clock',
            };
        case '08': // Release Refused / Rejected
            return {
                label: text || 'Rejected / Refused',
                code: '08',
                badgeText: 'Rejected (08)',
                bgColor: 'bg-rose-50',
                textColor: 'text-rose-700',
                borderColor: 'border-rose-200',
                dotColor: 'bg-rose-500',
                icon: 'rejected',
            };
        case '02': // Active / Pre-release
            return {
                label: text || 'Active (Pre-Release)',
                code: '02',
                badgeText: 'Active (02)',
                bgColor: 'bg-teal-50',
                textColor: 'text-teal-700',
                borderColor: 'border-teal-200',
                dotColor: 'bg-teal-500',
                icon: 'check',
            };
        case '01': // Version in Process / Draft
            return {
                label: text || 'Draft / In Process',
                code: '01',
                badgeText: 'Draft (01)',
                bgColor: 'bg-slate-100',
                textColor: 'text-slate-700',
                borderColor: 'border-slate-300',
                dotColor: 'bg-slate-500',
                icon: 'clock',
            };
        case '04': // Overall Release
            return {
                label: text || 'For Overall Release',
                code: '04',
                badgeText: 'Overall Rel. (04)',
                bgColor: 'bg-blue-50',
                textColor: 'text-[#0070f2]',
                borderColor: 'border-blue-200',
                dotColor: 'bg-blue-500',
                icon: 'clock',
            };
        default:
            return {
                label: text || `Release Status ${clean}`,
                code: clean,
                badgeText: `Status (${clean})`,
                bgColor: 'bg-slate-100',
                textColor: 'text-slate-700',
                borderColor: 'border-slate-300',
                dotColor: 'bg-slate-400',
                icon: 'default',
            };
    }
}

export function getSapProcessingStatusInfo(code?: string | null, text?: string | null): {
    label: string;
    code: string;
    badgeText: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
} | null {
    if (!code || !code.trim()) {
        return null;
    }
    const clean = code.trim().toUpperCase();

    switch (clean) {
        case 'A':
            return {
                label: text || 'Request for Quotation (RFQ) Created',
                code: 'A',
                badgeText: 'RFQ Created (A)',
                bgColor: 'bg-purple-50',
                textColor: 'text-purple-700',
                borderColor: 'border-purple-200',
            };
        case 'B':
            return {
                label: text || 'Purchase Order (PO) Created',
                code: 'B',
                badgeText: 'PO Created (B)',
                bgColor: 'bg-blue-50',
                textColor: 'text-blue-800',
                borderColor: 'border-blue-200',
            };
        case 'K':
            return {
                label: text || 'Contract Created',
                code: 'K',
                badgeText: 'Contract Created (K)',
                bgColor: 'bg-indigo-50',
                textColor: 'text-indigo-800',
                borderColor: 'border-indigo-200',
            };
        case 'L':
            return {
                label: text || 'Scheduling Agreement Created',
                code: 'L',
                badgeText: 'Sched. Agmt (L)',
                bgColor: 'bg-cyan-50',
                textColor: 'text-cyan-800',
                borderColor: 'border-cyan-200',
            };
        case 'S':
            return {
                label: text || 'Service Entry Sheet Created',
                code: 'S',
                badgeText: 'SES Created (S)',
                bgColor: 'bg-teal-50',
                textColor: 'text-teal-800',
                borderColor: 'border-teal-200',
            };
        case 'E':
            return {
                label: text || 'RFQ Sent to External System',
                code: 'E',
                badgeText: 'Ext. RFQ (E)',
                bgColor: 'bg-violet-50',
                textColor: 'text-violet-800',
                borderColor: 'border-violet-200',
            };
        case 'N':
            return {
                label: text || 'Not Processed (Open)',
                code: 'N',
                badgeText: 'Open / Unprocessed (N)',
                bgColor: 'bg-slate-50',
                textColor: 'text-slate-600',
                borderColor: 'border-slate-200',
            };
        default:
            return {
                label: text || `Processing Stage ${clean}`,
                code: clean,
                badgeText: `Stage (${clean})`,
                bgColor: 'bg-slate-50',
                textColor: 'text-slate-600',
                borderColor: 'border-slate-200',
            };
    }
}

interface SapPrStatusBadgeProps {
    releaseStatus?: string | null;
    releaseStatusText?: string | null;
    processingStatus?: string | null;
    processingStatusText?: string | null;
    size?: 'sm' | 'md' | 'lg';
    showProcessing?: boolean;
    className?: string;
}

export function SapPrStatusBadge({
    releaseStatus,
    releaseStatusText,
    processingStatus,
    processingStatusText,
    size = 'md',
    showProcessing = true,
    className = '',
}: SapPrStatusBadgeProps) {
    const relInfo = getSapReleaseStatusInfo(releaseStatus, releaseStatusText);
    const procInfo = showProcessing ? getSapProcessingStatusInfo(processingStatus, processingStatusText) : null;

    if (!relInfo && !procInfo) {
        return null;
    }

    const sizeClasses = {
        sm: 'text-[10px] px-2 py-0.5',
        md: 'text-xs px-2.5 py-1',
        lg: 'text-sm px-3 py-1.5',
    }[size];

    return (
        <div className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
            {relInfo && (
                <span
                    className={`inline-flex items-center gap-1.5 rounded-full font-semibold border transition-all ${relInfo.bgColor} ${relInfo.textColor} ${relInfo.borderColor} ${sizeClasses}`}
                    title={`SAP Approval / Release Status: ${relInfo.label} (Code: ${relInfo.code})`}
                >
                    {relInfo.icon === 'check' ? (
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                    ) : relInfo.icon === 'rejected' ? (
                        <XCircle className="h-3 w-3 shrink-0" />
                    ) : (
                        <Clock className="h-3 w-3 shrink-0" />
                    )}
                    <span>{relInfo.badgeText}</span>
                </span>
            )}

            {procInfo && (
                <span
                    className={`inline-flex items-center gap-1 rounded-full font-semibold border transition-all ${procInfo.bgColor} ${procInfo.textColor} ${procInfo.borderColor} ${sizeClasses}`}
                    title={`SAP Follow-on Processing Status: ${procInfo.label} (Code: ${procInfo.code})`}
                >
                    <Layers className="h-3 w-3 shrink-0 opacity-70" />
                    <span>{procInfo.badgeText}</span>
                </span>
            )}
        </div>
    );
}

interface SapPrRefreshButtonProps {
    prId: number | string;
    sapPrNumber?: string | null;
    lastCheckedAt?: string | null;
    onStatusRefreshed?: (data: any) => void;
    size?: 'sm' | 'md';
    variant?: 'button' | 'icon';
    className?: string;
}

export function SapPrRefreshButton({
    prId,
    sapPrNumber,
    lastCheckedAt,
    onStatusRefreshed,
    size = 'md',
    variant = 'button',
    className = '',
}: SapPrRefreshButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);

    const handleRefresh = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!sapPrNumber) {
            alert('Cannot refresh: Purchase Requisition has not been assigned an SAP PR Number yet.');
            return;
        }

        setIsLoading(true);
        setFeedback(null);

        try {
            // First fetch via CSRF-protected JSON endpoint to update live state immediately
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch(`/purchase-requisitions/${prId}/refresh-sap-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setFeedback(data.message || 'Status updated from SAP!');
                if (onStatusRefreshed) {
                    onStatusRefreshed(data);
                } else {
                    // Trigger Inertia reload to sync all server props
                    router.reload({ only: ['purchaseRequisition', 'purchaseRequisitions'] });
                }
            } else {
                setFeedback(data.message || 'Failed to refresh SAP status');
            }
        } catch (err: any) {
            setFeedback(err.message || 'Error communicating with SAP server');
        } finally {
            setIsLoading(false);
            setTimeout(() => setFeedback(null), 6000);
        }
    };

    if (!sapPrNumber) {
        return null;
    }

    if (variant === 'icon') {
        return (
            <button
                type="button"
                onClick={handleRefresh}
                disabled={isLoading}
                className={`relative inline-flex items-center justify-center rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#0070f2] active:bg-slate-200 transition-colors disabled:opacity-50 ${className}`}
                title={`Check SAP Status for PR #${sapPrNumber}${lastCheckedAt ? ` • Last checked: ${new Date(lastCheckedAt).toLocaleTimeString()}` : ''}`}
            >
                <RotateCcw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-[#0070f2]' : ''}`} />
            </button>
        );
    }

    const btnClasses = size === 'sm'
        ? 'px-2.5 py-1 text-xs gap-1.5'
        : 'px-3 py-1.5 text-xs gap-2';

    return (
        <div className="inline-flex items-center gap-2">
            <button
                type="button"
                onClick={handleRefresh}
                disabled={isLoading}
                className={`inline-flex items-center font-semibold rounded-md border border-[#d9e2ec] bg-white text-[#1c2d42] shadow-2xs hover:border-blue-300 hover:bg-blue-50 hover:text-[#0070f2] active:bg-blue-100 disabled:opacity-50 transition-colors ${btnClasses} ${className}`}
                title={`Fetch real-time approval and follow-on status from SAP S/4HANA Cloud (PurReqnReleaseStatus & ProcessingStatus)`}
            >
                <RotateCcw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-[#0070f2]' : 'text-slate-600'}`} />
                <span>{isLoading ? 'Checking SAP...' : 'Check SAP Status'}</span>
            </button>

            {feedback && (
                <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 animate-in fade-in">
                    {feedback}
                </span>
            )}
        </div>
    );
}

export default SapPrStatusBadge;
