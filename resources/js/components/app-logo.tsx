import React from 'react';

export default function AppLogo() {
    return (
        <div className="flex items-center gap-2.5">
            <img
                src="/images/APL_Logo.jpg"
                alt="Assam Petro-Chemicals Ltd."
                className="h-8 w-auto rounded object-contain bg-white"
            />
            <div className="hidden h-5 w-[1px] bg-slate-200 sm:block" />
            <img
                src="/images/SAP Logo.png"
                alt="SAP"
                className="hidden h-5 w-auto object-contain sm:block"
            />
            <div className="flex flex-col text-left leading-tight overflow-hidden">
                <span className="truncate text-xs font-bold text-[#1c2d42]">
                    Assam Petro-Chemicals Ltd.
                </span>
                <span className="truncate text-[10px] text-[#556b82]">
                    Purchase Requisition Portal
                </span>
            </div>
        </div>
    );
}
