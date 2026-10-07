import React from 'react';
import { Link } from '@inertiajs/react';
import SapLogo from '@/components/sap/SapLogo';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="relative flex min-h-screen flex-col justify-between bg-gradient-to-b from-[#0a1829] via-[#0f233d] to-[#071322] text-[#1c2d42]">
            {/* Ambient SAP Horizon Glow */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="absolute top-1/3 right-10 h-[350px] w-[350px] rounded-full bg-sky-500/10 blur-2xl" />
            </div>

            {/* Top SAP Corporate Bar */}
            <header className="relative z-10 flex h-14 items-center justify-between border-b border-white/10 px-6 backdrop-blur-xs">
                <Link
                    href={home()}
                    className="flex items-center gap-3 transition-opacity hover:opacity-90"
                >
                    <SapLogo variant="white" showText={true} subtext="Public Cloud Edition" />
                </Link>

                <div className="flex items-center gap-2">
                    <span className="hidden items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-950/60 px-3 py-1 text-[11px] font-medium text-blue-200 sm:inline-flex">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        SAP Cloud Identity Services • Active
                    </span>
                </div>
            </header>

            {/* Center Content / Login Card */}
            <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
                <div className="w-full max-w-[440px]">
                    <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xl">
                        {/* SAP Blue Accent Bar */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-[#0070f2] via-[#008fd3] to-[#0057c2]" />

                        <div className="p-8">
                            {/* Card Header with Logo & System Context */}
                            <div className="mb-6 flex flex-col items-center text-center">
                                <div className="mb-3 flex items-center justify-center">
                                    <SapLogo showText={false} className="h-9" />
                                </div>
                                <h1 className="text-xl font-bold tracking-tight text-[#1c2d42]">
                                    {title || 'Purchase Requisition Portal'}
                                </h1>
                                <p className="mt-1 text-xs text-[#556b82]">
                                    {description || 'Sign in to access Purchase Requisitions for SAP Public Cloud'}
                                </p>
                            </div>

                            {/* Form Children */}
                            {children}
                        </div>
                    </div>
                </div>
            </main>

            {/* Enterprise SAP Footer */}
            <footer className="relative z-10 border-t border-white/10 px-6 py-4 text-center text-xs text-slate-400 backdrop-blur-xs">
                <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 sm:flex-row">
                    <p className="text-[11px] text-slate-400">
                        APL Purchase Requisitions • Connected to SAP S/4HANA Cloud (Public Edition)
                    </p>
                    <div className="flex items-center gap-4 text-[11px] text-slate-400">
                        <span className="hover:text-white cursor-pointer transition-colors">Privacy Statement</span>
                        <span>•</span>
                        <span className="hover:text-white cursor-pointer transition-colors">Terms of Use</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
