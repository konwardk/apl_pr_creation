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
            {/* SAP Official Trapezoid Emblem */}
            <div className="relative flex items-center justify-center">
                <svg
                    viewBox="0 0 100 48"
                    className="h-7 w-auto drop-shadow-sm"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <linearGradient id="sapBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#008FD3" />
                            <stop offset="45%" stopColor="#0070F2" />
                            <stop offset="100%" stopColor="#003884" />
                        </linearGradient>
                    </defs>
                    {/* SAP Trapezoid Base */}
                    <path
                        d="M0 0 H100 L76 48 H0 Z"
                        fill="url(#sapBlueGrad)"
                    />
                    {/* White "SAP" letters */}
                    <text
                        x="36"
                        y="34"
                        fill="#FFFFFF"
                        fontFamily="Arial, Helvetica, sans-serif"
                        fontSize="32"
                        fontWeight="900"
                        letterSpacing="1"
                        textAnchor="middle"
                    >
                        SAP
                    </text>
                </svg>
            </div>

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
