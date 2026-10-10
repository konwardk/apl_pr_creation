import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    Search,
    Bell,
    SlidersHorizontal,
    LogOut,
    ChevronDown,
    Building2,
    Users,
    Shield,
    BadgeCheck,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logout } from '@/routes';
import { edit } from '@/routes/profile';
import type { User } from '@/types';

interface SapShellBarProps {
    onSearch?: (term: string) => void;
    onOpenCreatePr?: () => void;
    onOpenSapConfig?: () => void;
}

export default function SapShellBar({
    onSearch,
    onOpenCreatePr,
    onOpenSapConfig,
}: SapShellBarProps) {
    const { auth } = usePage().props as { auth: { user: User } };
    const user = auth?.user;
    const [searchValue, setSearchValue] = useState('');

    const isSuperAdmin = user?.is_superadmin || user?.role?.name === 'superadmin';
    const isEmployee = user?.is_employee || user?.role?.name === 'employee';
    const roleDisplayName = user?.role?.display_name || (isSuperAdmin ? 'Super Administrator' : isEmployee ? 'Employee / Requester' : 'Administrator');

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(e.target.value);
        if (onSearch) {
            onSearch(e.target.value);
        }
    };

    // Extract initials
    const initials = user?.name
        ? user.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
        : 'AP';

    return (
        <header className="sticky top-0 z-40 w-full border-b border-[#d9e2ec] bg-[#ffffff] shadow-xs">
            <div className="flex h-13 items-center justify-between px-4 sm:px-6">
                {/* Left: Company Brand & Product Title */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 transition-opacity hover:opacity-90"
                    >
                        <img
                            src="/images/APL_Logo.jpg"
                            alt="Assam Petro-Chemicals Ltd."
                            className="h-9 w-auto rounded object-contain bg-white shadow-2xs"
                        />
                        <div className="flex flex-col leading-tight">
                            <span className="text-[14px] font-bold tracking-tight text-[#1c2d42]">
                                Assam Petro-Chemicals Ltd.
                            </span>
                            <span className="text-[11px] font-medium text-[#556b82]">
                                Purchase Requisition Portal
                            </span>
                        </div>
                    </Link>

                    <div className="hidden h-5 w-[1px] bg-[#d9e2ec] md:block" />

                    {/* System / Environment Badge */}
                    <button
                        type="button"
                        onClick={isSuperAdmin ? onOpenSapConfig : undefined}
                        className={`hidden items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/70 px-2.5 py-0.5 text-[11px] font-medium text-[#0057c2] transition-colors lg:flex ${isSuperAdmin ? 'hover:bg-blue-100/70 cursor-pointer' : 'cursor-default'}`}
                        title={isSuperAdmin ? 'Click to view SAP Public Cloud Integration details' : 'Connected to SAP Cloud'}
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        <span>SAP S/4HANA Cloud Connected</span>
                    </button>
                </div>

                {/* Center: SAP Global Search Bar */}
                {/* <div className="mx-4 hidden max-w-md flex-1 md:flex">
                    <div className="relative w-full">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#556b82]" />
                        <input
                            type="text"
                            value={searchValue}
                            onChange={handleSearchChange}
                            placeholder="Search PR No, Material, Cost Center, Plant..."
                            className="h-9 w-full rounded-md border border-[#d9e2ec] bg-[#f8fafc] pr-10 pl-9 text-[13px] text-[#1c2d42] transition-all placeholder:text-[#8c9ba5] focus:border-[#0070f2] focus:bg-[#ffffff] focus:ring-1 focus:ring-[#0070f2] focus:outline-none"
                        />
                        <kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-[#d9e2ec] bg-[#ffffff] px-1.5 text-[10px] font-medium text-[#556b82]">
                            /
                        </kbd>
                    </div>
                </div> */}

                {/* Right: Actions, System tools, User Profile */}
                <div className="flex items-center gap-2">
                    {/* Superadmin User Management shortcut */}
                    {isSuperAdmin && (
                        <Link
                            href="/users"
                            className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-purple-200 bg-purple-50 px-3 py-1.5 text-[12px] font-semibold text-purple-700 shadow-2xs transition-colors hover:bg-purple-100 active:bg-purple-200"
                            title="Superadmin User Management"
                        >
                            <Users className="h-3.5 w-3.5 text-purple-600" />
                            <span>User Management</span>
                        </Link>
                    )}

                    {/* Create PR Button (Quick SAP Fiori Emphasized Action) */}
                    {onOpenCreatePr && (
                        <button
                            type="button"
                            onClick={onOpenCreatePr}
                            className="inline-flex items-center gap-1.5 rounded-md bg-[#0070f2] px-3 py-1.5 text-[12px] font-semibold text-white shadow-xs transition-colors hover:bg-[#0057c2] active:bg-[#003884]"
                        >
                            <span>+ Create PR</span>
                        </button>
                    )}

                    {/* SAP Cloud Settings / Config (Visible only to Superadmin) */}
                    {isSuperAdmin && onOpenSapConfig && (
                        <button
                            type="button"
                            onClick={onOpenSapConfig}
                            className="flex h-9 w-9 items-center justify-center rounded-md text-[#556b82] transition-colors hover:bg-[#f1f5f9] hover:text-[#1c2d42]"
                            title="SAP S/4HANA Cloud Settings"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                        </button>
                    )}

                    {/* Notification Icon (Hidden for now - reserved for future use) */}
                    {/* <div className="relative">
                        <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-md text-[#556b82] transition-colors hover:bg-[#f1f5f9] hover:text-[#1c2d42]"
                            title="Notifications"
                        >
                            <Bell className="h-4 w-4" />
                            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0070f2]" />
                            </span>
                        </button>
                    </div> */}

                    {/* User Profile Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="flex items-center gap-2 rounded-full p-0.5 transition-all hover:ring-2 hover:ring-[#0070f2]/30 focus:outline-none"
                            >
                                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold text-white shadow-xs ${
                                    isSuperAdmin
                                        ? 'bg-gradient-to-br from-purple-600 to-indigo-800'
                                        : isEmployee
                                        ? 'bg-gradient-to-br from-teal-600 to-emerald-800'
                                        : 'bg-gradient-to-br from-[#0070f2] to-[#003884]'
                                }`}>
                                    {initials}
                                </div>
                                <span className="hidden text-left text-[12px] font-medium text-[#1c2d42] xl:block">
                                    <span className="block leading-tight">{user?.name || 'User'}</span>
                                    <span className="block text-[10px] text-[#556b82]">{roleDisplayName}</span>
                                </span>
                                <ChevronDown className="hidden h-3.5 w-3.5 text-[#556b82] xl:block" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-72 rounded-lg p-1.5 shadow-lg border-[#d9e2ec]">
                            <DropdownMenuLabel className="p-2">
                                <div className="flex items-center gap-3">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${
                                        isSuperAdmin
                                            ? 'bg-purple-600'
                                            : isEmployee
                                            ? 'bg-teal-600'
                                            : 'bg-[#0070f2]'
                                    }`}>
                                        {initials}
                                    </div>
                                    <div className="flex flex-col overflow-hidden text-left">
                                        <span className="truncate text-sm font-semibold text-[#1c2d42]">
                                            {user?.name || 'User'}
                                        </span>
                                        <span className="truncate text-xs text-[#556b82]">
                                            {user?.email || ''}
                                        </span>
                                    </div>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="my-1 bg-[#e2e8f0]" />

                            {/* User Role & Department Badge */}
                            <div className="px-3 py-2 text-xs bg-[#f8fafc] rounded-md space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-[#556b82]">Role:</span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                        isSuperAdmin
                                            ? 'bg-purple-100 text-purple-800'
                                            : isEmployee
                                            ? 'bg-teal-100 text-teal-800'
                                            : 'bg-blue-100 text-blue-800'
                                    }`}>
                                        {roleDisplayName}
                                    </span>
                                </div>
                                {user?.department && (
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-[#556b82]">Department:</span>
                                        <span className="font-medium text-[#1c2d42] truncate max-w-[150px]">{user.department.name}</span>
                                    </div>
                                )}
                                {user?.employee_id && (
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-[#556b82]">Employee ID:</span>
                                        <span className="font-mono text-[#1c2d42]">{user.employee_id}</span>
                                    </div>
                                )}
                            </div>

                            <DropdownMenuSeparator className="my-1 bg-[#e2e8f0]" />

                            {/* Superadmin User Management Menu */}
                            {isSuperAdmin && (
                                <DropdownMenuItem asChild>
                                    <Link
                                        href="/users"
                                        className="flex w-full cursor-pointer items-center px-2 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 rounded"
                                    >
                                        <Users className="mr-2 h-3.5 w-3.5 text-purple-600" />
                                        User Management
                                    </Link>
                                </DropdownMenuItem>
                            )}

                            <DropdownMenuItem asChild>
                                <Link
                                    href={edit()}
                                    className="flex w-full cursor-pointer items-center px-2 py-2 text-xs font-medium text-[#1c2d42] hover:bg-slate-100 rounded"
                                >
                                    <SlidersHorizontal className="mr-2 h-3.5 w-3.5 text-[#556b82]" />
                                    Account Settings
                                </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild>
                                <Link
                                    href={logout()}
                                    as="button"
                                    className="flex w-full cursor-pointer items-center px-2 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded"
                                >
                                    <LogOut className="mr-2 h-3.5 w-3.5 text-rose-600" />
                                    Sign out
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
