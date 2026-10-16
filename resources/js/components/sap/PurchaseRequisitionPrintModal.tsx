import React, { useRef, useState } from 'react';
import {
    Printer,
    Download,
    X,
    Loader2,
} from 'lucide-react';
import { formatCurrencyAmount } from '@/lib/utils';

export interface PrintItem {
    id?: number;
    item_number?: string;
    material_code?: string;
    description: string;
    material_group?: string;
    quantity: number | string;
    unit_of_measure: string;
    unit_price?: number | string;
    total_price?: number | string;
    currency?: string;
    plant?: string;
    cost_center?: string;
    gl_account?: string;
    delivery_date?: string;
    item_note?: string;
    previous_po?: string;
    avg_monthly_consumption?: string;
    indentor_stock?: string;
    stores_stock?: string;
}

export interface PrintPurchaseRequisition {
    id: number;
    pr_number: string;
    sap_pr_number?: string | null;
    description: string;
    header_note?: string | null;
    pr_type?: string;
    plant?: string;
    company_code?: string;
    total_amount?: number | string;
    currency?: string;
    requisitioner?: string | null;
    approval_status?: string;
    is_draft?: boolean | number;
    created_at: string;
    user?: {
        id?: number;
        name?: string;
        employee_id?: string;
        designation?: string;
        department?: {
            id?: number;
            name?: string;
            code?: string;
        };
    };
    contract_requisition?: {
        cr_no?: string;
        requisitioner_name?: string;
        req_designation?: string;
        req_department?: string;
        contract_title?: string;
        total_pr_value?: number | string;
        total_pr_value_in_word?: string;
    };
    contract_requisition_local?: {
        cr_no?: string;
        requisitioner_name?: string;
        req_designation?: string;
        req_department?: string;
        contract_title?: string;
        total_pr_value?: number | string;
        total_pr_value_in_word?: string;
    };
    header_option?: {
        name?: string;
        code?: string;
    };
    items?: PrintItem[];
}

interface PurchaseRequisitionPrintModalProps {
    pr: PrintPurchaseRequisition | null;
    isOpen: boolean;
    onClose: () => void;
}

function numberToWordCount(count: number): string {
    const map: Record<number, string> = {
        1: 'one',
        2: 'two',
        3: 'three',
        4: 'four',
        5: 'five',
        6: 'six',
        7: 'seven',
        8: 'eight',
        9: 'nine',
        10: 'ten',
    };
    if (count === 1) return 'Item one only';
    if (count in map) return `Item one to ${map[count]} only`;
    return `Item 1 to ${count} only`;
}

function formatDate(dateStr?: string | null): string {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return dateStr || '';
    }
}

export default function PurchaseRequisitionPrintModal({
    pr,
    isOpen,
    onClose,
}: PurchaseRequisitionPrintModalProps) {
    const printContentRef = useRef<HTMLDivElement>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

    if (!isOpen || !pr) return null;

    const cr = pr.contract_requisition || pr.contract_requisition_local;
    const items = pr.items && pr.items.length > 0 ? pr.items : [];
    const departmentName =
        pr.user?.department?.name ||
        cr?.req_department ||
        'Assam Petro-Chemicals Ltd.';
    const indentorName =
        pr.user?.name ||
        cr?.requisitioner_name ||
        pr.requisitioner ||
        'Indentor';
    const indentorDesignation =
        pr.user?.designation ||
        cr?.req_designation ||
        'Officer / In-charge';
    const prDate = formatDate(pr.created_at);

    // Primary GL Account / Cost Center for Main Head
    const mainHead =
        items.find((i) => i.gl_account)?.gl_account ||
        items.find((i) => i.cost_center)?.cost_center ||
        'Operational Budget (General)';

    // Delivery dates
    const deliveryDates = items
        .map((i) => i.delivery_date)
        .filter(Boolean) as string[];
    const firstDeliveryDate =
        deliveryDates.length > 0 ? formatDate(deliveryDates[0]) : '';
    const totalItemQty = items.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0),
        0
    );

    /**
     * Isolated printing via hidden iframe using the exact same inline CSS styles
     * so that the printed paper matches the on-screen preview 100% identically.
     */
    const handlePrint = () => {
        const content = printContentRef.current;
        if (!content) return;

        // Clean up any old iframe
        const existingIframe = document.getElementById('apl-pr-print-iframe');
        if (existingIframe) {
            existingIframe.remove();
        }

        const iframe = document.createElement('iframe');
        iframe.id = 'apl-pr-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.top = '-9999px';
        iframe.style.left = '-9999px';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';

        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) return;

        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="utf-8" />
                    <title>APL Materials Indent Form - ${pr.pr_number}</title>
                    <style>
                        @page {
                            size: A4 portrait;
                            margin: 6mm 8mm;
                        }
                        * {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            box-sizing: border-box !important;
                        }
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                            width: 100% !important;
                            background: #ffffff !important;
                            color: #000000 !important;
                            font-family: "Times New Roman", Times, Georgia, serif !important;
                        }
                        .apl-a4-sheet {
                            width: 100% !important;
                            max-width: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            border: none !important;
                            box-shadow: none !important;
                            background: #ffffff !important;
                        }
                    </style>
                </head>
                <body>
                    <div class="apl-a4-sheet" style="font-family: 'Times New Roman', Times, Georgia, serif; color: #000000; background: #ffffff;">
                        ${content.innerHTML}
                    </div>
                </body>
            </html>
        `);
        doc.close();

        // Wait for images to load before printing
        const images = Array.from(doc.images);
        let loaded = 0;
        let printTriggered = false;

        const executePrint = () => {
            if (printTriggered) return;
            printTriggered = true;
            setTimeout(() => {
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                } catch (e) {
                    console.error('Print iframe error:', e);
                } finally {
                    setTimeout(() => {
                        iframe.remove();
                    }, 1500);
                }
            }, 200);
        };

        if (images.length === 0) {
            executePrint();
        } else {
            images.forEach((img) => {
                if (img.complete) {
                    loaded++;
                    if (loaded >= images.length) executePrint();
                } else {
                    img.onload = img.onerror = () => {
                        loaded++;
                        if (loaded >= images.length) executePrint();
                    };
                }
            });
            setTimeout(executePrint, 600);
        }
    };

    /**
     * Direct Save as PDF using html2pdf with explicit A4 window dimensions
     * ensuring identical rendering to screen and print.
     */
    const handleSavePdf = async () => {
        const element = printContentRef.current;
        if (!element) return;

        try {
            setIsGeneratingPdf(true);
            const html2pdfModule = await import('html2pdf.js');
            const html2pdf = (html2pdfModule as any).default || html2pdfModule;

            const opt = {
                margin: [6, 8, 6, 8],
                filename: `APL_Indent_Form_${pr.pr_number || 'PR'}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    letterRendering: true,
                    windowWidth: 794,
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            };

            await html2pdf().set(opt).from(element).save();
        } catch (error) {
            console.error('Failed to generate PDF directly:', error);
            handlePrint();
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    return (
        <div
            className="apl-modal-backdrop fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xs"
            onClick={onClose}
        >
            {/* Modal Dialog Container */}
            <div
                className="apl-modal-card relative flex w-full max-w-5xl flex-col rounded-xl bg-white shadow-2xl ring-1 ring-slate-900/10 max-h-[96vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* MODAL HEADER - Hidden during actual print */}
                <div className="no-print flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-[#0070f2]">
                            <Printer className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-800">
                                    APL Materials Indent Form (F-2) Print Preview
                                </h3>
                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-mono font-semibold text-[#0070f2] border border-blue-200">
                                    {pr.pr_number}
                                </span>
                                {pr.sap_pr_number && (
                                    <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-mono font-semibold text-emerald-700 border border-emerald-200">
                                        SAP #{pr.sap_pr_number}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500">
                                True-to-print official physical indent voucher for Assam Petro-Chemicals Limited
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Save as PDF Button */}
                        <button
                            type="button"
                            onClick={handleSavePdf}
                            disabled={isGeneratingPdf}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 shadow-xs hover:bg-emerald-100 active:bg-emerald-200 disabled:opacity-60 transition-colors"
                            title="Save as PDF file"
                        >
                            {isGeneratingPdf ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                                    <span>Generating PDF...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="h-4 w-4 text-emerald-600" />
                                    <span>Save as PDF</span>
                                </>
                            )}
                        </button>

                        {/* Print Document Button */}
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0070f2] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2] active:bg-[#004085] transition-colors"
                            title="Print Document"
                        >
                            <Printer className="h-4 w-4" />
                            <span>Print Document</span>
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                            title="Close Preview"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* MODAL BODY: Displays the exact A4 sheet with realistic paper aesthetics */}
                <div className="overflow-y-auto p-4 sm:p-6 bg-slate-200/80 flex justify-center">
                    {/* Fallback CSS for browser Ctrl+P */}
                    <style>{`
                        @media print {
                            html, body {
                                visibility: visible !important;
                                overflow: visible !important;
                                height: auto !important;
                                background: #ffffff !important;
                            }
                            body > #app {
                                visibility: hidden !important;
                            }
                            .apl-modal-backdrop {
                                position: static !important;
                                background: transparent !important;
                                padding: 0 !important;
                                margin: 0 !important;
                                overflow: visible !important;
                            }
                            .apl-modal-card {
                                box-shadow: none !important;
                                border: none !important;
                                max-height: none !important;
                                overflow: visible !important;
                                width: 100% !important;
                                max-width: 100% !important;
                            }
                            .no-print {
                                display: none !important;
                            }
                            #apl-pr-print-document {
                                visibility: visible !important;
                                display: block !important;
                                position: static !important;
                                width: 100% !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                border: none !important;
                                box-shadow: none !important;
                                background: #ffffff !important;
                            }
                            #apl-pr-print-document * {
                                visibility: visible !important;
                            }
                            @page {
                                size: A4 portrait;
                                margin: 6mm 8mm;
                            }
                        }
                    `}</style>

                    {/* THE EXACT A4 PHYSICAL INDENT FORM (F-2) - 100% IDENTICAL IN PREVIEW, PRINT & PDF */}
                    <div
                        id="apl-pr-print-document"
                        ref={printContentRef}
                        className="apl-a4-sheet"
                        style={{
                            width: '794px',
                            minWidth: '794px',
                            boxSizing: 'border-box',
                            backgroundColor: '#ffffff',
                            color: '#000000',
                            padding: '24px 30px',
                            fontFamily: '"Times New Roman", Times, Georgia, serif',
                            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                            border: '1px solid #d1d5db',
                            lineHeight: 1.3,
                        }}
                    >
                        {/* 1. TOP HEADER WITH APL LOGO ON TOP LEFT & CENTERED TITLE */}
                        <div style={{ position: 'relative', width: '100%', marginBottom: '10px' }}>
                            {/* APL Logo */}
                            <div style={{ position: 'absolute', left: '0', top: '0', display: 'flex', alignItems: 'center' }}>
                                <img
                                    src="/images/APL_Logo.jpg"
                                    alt="Assam Petro-Chemicals Limited"
                                    style={{ height: '54px', width: 'auto', objectFit: 'contain' }}
                                />
                            </div>

                            {/* Centered Document Title */}
                            <div style={{ textAlign: 'center', padding: '0 80px' }}>
                                <div style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    ASSAM PETRO-CHEMICALS LIMITED
                                </div>
                                <div style={{ fontSize: '12.5px', fontWeight: 'bold', textDecoration: 'underline', marginTop: '2px' }}>
                                    (MATERIALS INDENT FORM (NORMAL))
                                </div>
                                <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '2px' }}>
                                    (F-2)
                                </div>
                            </div>

                            {/* Right-side — PR — indicator matching original form */}
                            {/* <div style={{ position: 'absolute', right: '0', top: '4px', textAlign: 'right' }}>
                                
                            </div> */}
                        </div>

                        {/* 2. HEADER DETAILS BOX (2 COLUMNS USING FIXED TABLE TO PREVENT COLLAPSING) */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000000', fontSize: '11px', marginTop: '6px' }}>
                            <tbody>
                                <tr>
                                    {/* Left Column: Indentor Section */}
                                    <td style={{ width: '52%', verticalAlign: 'top', borderRight: '1px solid #000000', padding: '6px 8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <div>
                                                <span style={{ fontWeight: 600 }}>Indenting Deptt.: </span>
                                                <span style={{ fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>
                                                    {departmentName}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <div>
                                                <span style={{ fontWeight: 600 }}>Indentor's Ref.: </span>
                                                <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                                                    APL/{pr.pr_number}
                                                </span>
                                            </div>
                                            <div>
                                                <span style={{ fontWeight: 600 }}>Date : </span>
                                                <span style={{ textDecoration: 'underline' }}>{prDate}</span>
                                            </div>
                                        </div>

                                        <div style={{ marginTop: '4px' }}>
                                            <div style={{ fontWeight: 600 }}>Budget :-</div>
                                            <div style={{ paddingLeft: '14px', marginTop: '2px' }}>
                                                <div>a) Main Head : <span style={{ fontWeight: 500 }}>{mainHead}</span></div>
                                                <div>b) Sub Head : <span style={{ fontWeight: 500 }}>{pr.plant ? `Plant ${pr.plant}` : '................................'}</span></div>
                                                <div>c) Cost Head : <span style={{ fontWeight: 500 }}>Revenue</span></div>
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'center', fontStyle: 'italic', fontSize: '10px', marginTop: '14px', color: '#333333' }}>
                                            ( To be filled by the Indentor )
                                        </div>
                                    </td>

                                    {/* Right Column: Inventory Control Section */}
                                    <td style={{ width: '48%', verticalAlign: 'top', padding: '6px 8px' }}>
                                        <div style={{ marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 600 }}>Materials Indent No: </span>
                                            <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                                                APL/C&P/{pr.sap_pr_number || pr.pr_number}
                                            </span>
                                        </div>
                                        <div style={{ marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 600 }}>Date: </span>
                                            <span style={{ textDecoration: 'underline' }}>{prDate}</span>
                                        </div>
                                        {cr?.cr_no && (
                                            <div style={{ marginBottom: '4px' }}>
                                                <span style={{ fontWeight: 600 }}>Contract Ref: </span>
                                                <span style={{ fontFamily: 'monospace' }}>{cr.cr_no}</span>
                                            </div>
                                        )}

                                        <div style={{ height: '52px' }}></div>

                                        <div style={{ textAlign: 'center', fontStyle: 'italic', fontSize: '10px', marginTop: '8px', color: '#333333' }}>
                                            ( To be filled by inventory control )
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* 3. CONSUMPTION CLAUSE & DELIVERY SCHEDULE */}
                        <div style={{ fontSize: '11px', marginTop: '8px', lineHeight: 1.35 }}>
                            <div>
                                Please arrange to purchase the following items for Stock/Direct consumption. The materials will be consumed by us within 12 months, failing which Stores may issue the materials to others, under intimation to us:
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px', fontSize: '11px' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ width: '130px', fontWeight: 600 }}>Delivery Schedule</td>
                                        <td style={{ width: '90px' }}>: In one lot by</td>
                                        <td style={{ width: '140px', textDecoration: 'underline', fontWeight: 500 }}>
                                            {firstDeliveryDate || '........................'}
                                        </td>
                                        <td style={{ width: '60px' }}>Quantity</td>
                                        <td style={{ textDecoration: 'underline', fontWeight: 500 }}>
                                            {totalItemQty ? `${totalItemQty} ${items[0]?.unit_of_measure || ''}` : '........................'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: 600 }}>Phase Delivery</td>
                                        <td>: 1ˢᵗ Delivery by</td>
                                        <td>{deliveryDates[0] ? formatDate(deliveryDates[0]) : '........................'}</td>
                                        <td>Quantity</td>
                                        <td>{items[0]?.quantity ? `${items[0].quantity} ${items[0].unit_of_measure}` : '........................'}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>: 2ⁿᵈ Delivery by</td>
                                        <td>{deliveryDates[1] ? formatDate(deliveryDates[1]) : '........................'}</td>
                                        <td>Quantity</td>
                                        <td>{items[1]?.quantity ? `${items[1].quantity} ${items[1].unit_of_measure}` : '........................'}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>: 3ʳᵈ Delivery by</td>
                                        <td>{deliveryDates[2] ? formatDate(deliveryDates[2]) : '........................'}</td>
                                        <td>Quantity</td>
                                        <td>{items[2]?.quantity ? `${items[2].quantity} ${items[2].unit_of_measure}` : '........................'}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>: 4ᵗʰ Delivery by</td>
                                        <td>........................</td>
                                        <td>Quantity</td>
                                        <td>........................</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>: 5ᵗʰ Delivery by</td>
                                        <td>........................</td>
                                        <td>Quantity</td>
                                        <td>........................</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* 4. LINE ITEMS TABLE (10 COLUMNS WITH NUMBERED HEADER 1 TO 10) */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000000', marginTop: '8px', fontSize: '10.5px', tableLayout: 'fixed' }}>
                            <colgroup>
                                <col style={{ width: '5%' }} />
                                <col style={{ width: '9%' }} />
                                <col style={{ width: '34%' }} />
                                <col style={{ width: '6%' }} />
                                <col style={{ width: '7%' }} />
                                <col style={{ width: '11%' }} />
                                <col style={{ width: '8%' }} />
                                <col style={{ width: '8%' }} />
                                <col style={{ width: '6%' }} />
                                <col style={{ width: '6%' }} />
                            </colgroup>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #000000', textAlign: 'center', fontWeight: 'bold' }}>
                                    <th style={{ borderRight: '1px solid #000000', padding: '4px 2px', verticalAlign: 'top' }}>Sl.<br />No.</th>
                                    <th style={{ borderRight: '1px solid #000000', padding: '4px 2px', verticalAlign: 'top' }}>Code No.</th>
                                    <th style={{ borderRight: '1px solid #000000', padding: '4px 4px', verticalAlign: 'top', textAlign: 'left' }}>Description of Material</th>
                                    <th style={{ borderRight: '1px solid #000000', padding: '4px 2px', verticalAlign: 'top' }}>Unit</th>
                                    <th style={{ borderRight: '1px solid #000000', padding: '4px 2px', verticalAlign: 'top' }}>Qty.<br />Required</th>
                                    <th style={{ borderRight: '1px solid #000000', padding: '4px 2px', verticalAlign: 'top' }}>App.<br />Cost.(Rs.)</th>
                                    <th style={{ borderRight: '1px solid #000000', padding: '4px 2px', verticalAlign: 'top' }}>Previous<br />P.O.</th>
                                    <th style={{ borderRight: '1px solid #000000', padding: '4px 2px', verticalAlign: 'top' }}>Average<br />Monthly<br />Consumption</th>
                                    <th colSpan={2} style={{ padding: '0', verticalAlign: 'top' }}>
                                        <div style={{ padding: '3px 0' }}>Present stock</div>
                                        <div style={{ display: 'flex', borderTop: '1px solid #000000', fontWeight: 'normal', fontSize: '9.5px' }}>
                                            <div style={{ flex: 1, borderRight: '1px solid #000000', padding: '2px 0' }}>Indentor</div>
                                            <div style={{ flex: 1, padding: '2px 0' }}>Stores</div>
                                        </div>
                                    </th>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #000000', textAlign: 'center', fontSize: '9.5px', fontWeight: 'bold', backgroundColor: '#fafafa' }}>
                                    <th style={{ borderRight: '1px solid #000000', padding: '1px 0' }}>1</th>
                                    <th style={{ borderRight: '1px solid #000000', padding: '1px 0' }}>2</th>
                                    <th style={{ borderRight: '1px solid #000000', padding: '1px 0' }}>3</th>
                                    <th style={{ borderRight: '1px solid #000000', padding: '1px 0' }}>4</th>
                                    <th style={{ borderRight: '1px solid #000000', padding: '1px 0' }}>5</th>
                                    <th style={{ borderRight: '1px solid #000000', padding: '1px 0' }}>6</th>
                                    <th style={{ borderRight: '1px solid #000000', padding: '1px 0' }}>7</th>
                                    <th style={{ borderRight: '1px solid #000000', padding: '1px 0' }}>8</th>
                                    <th style={{ borderRight: '1px solid #000000', padding: '1px 0' }}>9</th>
                                    <th style={{ padding: '1px 0' }}>10</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length > 0 ? (
                                    items.map((item, index) => {
                                        const itemCost =
                                            item.total_price ||
                                            (Number(item.unit_price) && Number(item.quantity)
                                                ? Number(item.unit_price) * Number(item.quantity)
                                                : item.unit_price) ||
                                            0;
                                        return (
                                            <tr key={item.id || index} style={{ borderBottom: '1px solid #000000', verticalAlign: 'top' }}>
                                                <td style={{ borderRight: '1px solid #000000', padding: '4px', textAlign: 'center' }}>
                                                    {index + 1}.
                                                </td>
                                                <td style={{ borderRight: '1px solid #000000', padding: '4px', textAlign: 'center', fontFamily: 'monospace' }}>
                                                    {item.material_code || '0'}
                                                </td>
                                                <td style={{ borderRight: '1px solid #000000', padding: '4px' }}>
                                                    <div style={{ fontWeight: 'bold' }}>{item.description}</div>
                                                    {item.item_note && (
                                                        <div style={{ fontSize: '9.5px', fontStyle: 'italic', color: '#333333', marginTop: '2px' }}>
                                                            Note: {item.item_note}
                                                        </div>
                                                    )}
                                                    {item.cost_center && (
                                                        <div style={{ fontSize: '9px', color: '#444444', marginTop: '2px' }}>
                                                            CC: {item.cost_center} {item.gl_account ? `| GL: ${item.gl_account}` : ''}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ borderRight: '1px solid #000000', padding: '4px', textAlign: 'center' }}>
                                                    {item.unit_of_measure || 'No.'}
                                                </td>
                                                <td style={{ borderRight: '1px solid #000000', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>
                                                    {item.quantity}
                                                </td>
                                                <td style={{ borderRight: '1px solid #000000', padding: '4px', textAlign: 'right' }}>
                                                    {formatCurrencyAmount(itemCost)}
                                                </td>
                                                <td style={{ borderRight: '1px solid #000000', padding: '4px', textAlign: 'center' }}>
                                                    {item.previous_po || '—'}
                                                </td>
                                                <td style={{ borderRight: '1px solid #000000', padding: '4px', textAlign: 'center' }}>
                                                    {item.avg_monthly_consumption || 'NA'}
                                                </td>
                                                <td style={{ borderRight: '1px solid #000000', padding: '4px', textAlign: 'center' }}>
                                                    {item.indentor_stock || 'Nil'}
                                                </td>
                                                <td style={{ padding: '4px', textAlign: 'center' }}>
                                                    {item.stores_stock || 'Nil'}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr style={{ borderBottom: '1px solid #000000', verticalAlign: 'top' }}>
                                        <td style={{ borderRight: '1px solid #000000', padding: '4px', textAlign: 'center' }}>1.</td>
                                        <td style={{ borderRight: '1px solid #000000', padding: '4px', textAlign: 'center' }}>0</td>
                                        <td style={{ borderRight: '1px solid #000000', padding: '4px', fontStyle: 'italic' }}>{pr.description}</td>
                                        <td style={{ borderRight: '1px solid #000000', padding: '4px', textAlign: 'center' }}>No.</td>
                                        <td style={{ borderRight: '1px solid #000000', padding: '4px', textAlign: 'center' }}>1</td>
                                        <td style={{ borderRight: '1px solid #000000', padding: '4px', textAlign: 'right' }}>00.00</td>
                                        <td style={{ borderRight: '1px solid #000000', padding: '4px', textAlign: 'center' }}>—</td>
                                        <td style={{ borderRight: '1px solid #000000', padding: '4px', textAlign: 'center' }}>NA</td>
                                        <td style={{ borderRight: '1px solid #000000', padding: '4px', textAlign: 'center' }}>Nil</td>
                                        <td style={{ padding: '4px', textAlign: 'center' }}>Nil</td>
                                    </tr>
                                )}

                                {/* Spacer row with continuous vertical lines and '(Item one only)' centered in Column 3 */}
                                <tr style={{ height: '140px', verticalAlign: 'top' }}>
                                    <td style={{ borderRight: '1px solid #000000' }}></td>
                                    <td style={{ borderRight: '1px solid #000000' }}></td>
                                    <td style={{ borderRight: '1px solid #000000', padding: '24px 8px', textAlign: 'center', verticalAlign: 'middle', fontStyle: 'italic', fontWeight: 500, fontSize: '11.5px' }}>
                                        ({numberToWordCount(items.length || 1)})
                                    </td>
                                    <td style={{ borderRight: '1px solid #000000' }}></td>
                                    <td style={{ borderRight: '1px solid #000000' }}></td>
                                    <td style={{ borderRight: '1px solid #000000' }}></td>
                                    <td style={{ borderRight: '1px solid #000000' }}></td>
                                    <td style={{ borderRight: '1px solid #000000' }}></td>
                                    <td style={{ borderRight: '1px solid #000000' }}></td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>

                        {/* 5. ITEM IS URGENTLY REQUIRED TO */}
                        <div style={{ marginTop: '6px', paddingBottom: '3px', fontSize: '11px', borderBottom: '1px solid #000000' }}>
                            <span style={{ fontWeight: 'bold' }}>Item is urgently required to.</span>
                            <span style={{ marginLeft: '8px', textDecoration: 'underline', fontWeight: 500 }}>
                                {pr.header_note || pr.description || 'Smooth operational and plant maintenance requirements.'}
                            </span>
                        </div>

                        {/* 6. BOTTOM 3-COLUMN FOOTER BOX USING FIXED TABLE */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000000', marginTop: '6px', fontSize: '10px', lineHeight: 1.35 }}>
                            <tbody>
                                <tr>
                                    {/* Column 1: Inventory Control verification */}
                                    <td style={{ width: '31%', verticalAlign: 'top', borderRight: '1px solid #000000', padding: '6px 8px' }}>
                                        <div>Quantities shown in Col. 10 are in stock</div>
                                        <div style={{ marginTop: '3px' }}>Quantities shown on Col. 5 may be procured to replenish the Stock direct consumption</div>
                                        <div style={{ marginTop: '48px', borderBottom: '1px dotted #000000', width: '150px' }}></div>
                                        <div style={{ fontWeight: 'bold', marginTop: '2px' }}>Inventory Control cell</div>
                                    </td>

                                    {/* Column 2: Verbatim Introductions 1 to 4 */}
                                    <td style={{ width: '38%', verticalAlign: 'top', borderRight: '1px solid #000000', padding: '6px 8px' }}>
                                        <div style={{ textAlign: 'center', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '5px', fontSize: '10.5px' }}>
                                            INTRODUCTIONS
                                        </div>
                                        <div style={{ marginBottom: '3px' }}><strong>1)</strong> Only one category of materials may be indented in each indent</div>
                                        <div style={{ marginBottom: '3px' }}><strong>2)</strong> All the information must be furnished in the appropriate columns.</div>
                                        <div style={{ marginBottom: '3px' }}><strong>3)</strong> Code/Folio Nos. should invariably be mentioned</div>
                                        <div><strong>4)</strong> Average monthly consumption be calculated based on last 6 months consumption</div>
                                    </td>

                                    {/* Column 3: Indenting Officer declaration & signature block */}
                                    <td style={{ width: '31%', verticalAlign: 'top', padding: '6px 8px' }}>
                                        <div>Quantity shown in Column 9 are available with us and will be sufficient for ............. Days/month consumption only.</div>
                                        <div style={{ fontWeight: 'bold', marginTop: '3px' }}>Signature of the Indenting Officer</div>
                                        <div style={{ marginTop: '36px' }}>
                                            <div><strong>Indenting Officer: ( <span style={{ textDecoration: 'underline' }}>{indentorName}</span> )</strong></div>
                                            <div style={{ marginTop: '1px' }}>Designation: <span style={{ textDecoration: 'underline' }}>{indentorDesignation}</span></div>
                                            <div style={{ marginTop: '1px' }}>Department: <span style={{ textDecoration: 'underline' }}>{departmentName}</span></div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Audit Verification Strip */}
                        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', color: '#555555', borderTop: '1px solid #e5e7eb', paddingTop: '3px' }}>
                            <div>APL PR Creation Portal • Ref: {pr.pr_number} • Date: {prDate}</div>
                            <div>Page 1 of 1 • Assam Petro-Chemicals Ltd. (A Govt. of Assam Undertaking)</div>
                        </div>
                    </div>
                </div>

                {/* MODAL BOTTOM BAR - Hidden during actual print */}
                <div className="no-print flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3">
                    <span className="text-xs text-slate-500">
                        Tip: Click <strong>Save as PDF</strong> for a direct PDF file, or <strong>Print Document</strong> to print.
                    </span>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            Close
                        </button>

                        {/* Save as PDF */}
                        <button
                            type="button"
                            onClick={handleSavePdf}
                            disabled={isGeneratingPdf}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-xs hover:bg-emerald-100 active:bg-emerald-200 disabled:opacity-60 transition-colors"
                        >
                            {isGeneratingPdf ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                                    <span>Generating PDF...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="h-4 w-4 text-emerald-600" />
                                    <span>Save as PDF</span>
                                </>
                            )}
                        </button>

                        {/* Print Document */}
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0070f2] px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#0057c2] transition-colors"
                        >
                            <Printer className="h-4 w-4" />
                            <span>Print Document</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
