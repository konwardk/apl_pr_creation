import React from 'react';

interface SapLogoProps {
    className?: string;
    variant?: 'default' | 'white' | 'badge';
    showText?: boolean;
    subtext?: string;
}

export default function SapLogo({
    className = 'h-7',
    variant = 'default',
    showText = false,
    subtext,
}: SapLogoProps) {
    const isWhite = variant === 'white';

    return (
        <div className={`flex items-center gap-2.5 select-none ${className}`}>
            {/* Official SAP Logo Image */}
            <img
                src="/images/SAP Logo.png"
                alt="SAP"
                className="h-full w-auto object-contain drop-shadow-xs"
            />

            {showText && (
                <div className="flex flex-col leading-tight">
                    <span className={`text-[15px] font-bold tracking-tight ${isWhite ? 'text-white' : 'text-[#1c2d42]'}`}>
                        S/4HANA Cloud
                    </span>
                    <span className={`text-[11px] font-medium tracking-wide ${isWhite ? 'text-blue-100' : 'text-[#556b82]'}`}>
                        {subtext || 'Public Cloud Edition'}
                    </span>
                </div>
            )}
        </div>
    );
}
