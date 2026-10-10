import { Link, usePage, Head } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import SapAppLayout from '@/layouts/sap-app-layout';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { edit as editProfile } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import {
    User,
    ShieldCheck,
    SlidersHorizontal,
    Building2,
    Shield,
    CheckCircle2,
    ChevronRight,
    UserCircle,
} from 'lucide-react';
import type { User as UserType } from '@/types';

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const { auth } = usePage().props as { auth?: { user?: UserType } };
    const user = auth?.user;

    const isSuperAdmin = user?.is_superadmin || user?.role?.name === 'superadmin';
    const isEmployee = user?.is_employee || user?.role?.name === 'employee';
    const roleDisplayName =
        user?.role?.display_name ||
        (isSuperAdmin ? 'Superadmin' : isEmployee ? 'Employee' : 'Administrator');

    const initials = user?.name
        ? user.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase()
        : 'AP';

    // Active Tab state (Profile vs Security)
    const isSecurityActive = isCurrentOrParentUrl(editSecurity());
    const isProfileActive = isCurrentOrParentUrl(editProfile()) || !isSecurityActive;

    // Navigation items (Appearance is completely removed!)
    const navItems = [
        {
            title: 'Profile Information',
            description: 'Name, email address & identity',
            href: editProfile(),
            icon: User,
            isActive: isProfileActive,
            badge: 'General',
        },
        {
            title: 'Security & Credentials',
            description: 'Password & biometric passkeys',
            href: editSecurity(),
            icon: ShieldCheck,
            isActive: isSecurityActive,
            badge: 'Credentials',
        },
    ];

    return (
        <SapAppLayout
            title="Account Settings - Assam Petro-Chemicals Ltd."
            activeTab="settings"
        >
            <Head
                title={`${isSecurityActive ? 'Security Settings' : 'Profile Settings'} - Assam Petro-Chemicals Ltd.`}
            />

            <div className="space-y-6">
                {/* SAP Page Header Banner */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-xl border border-[#d9e2ec] bg-white p-5 sm:p-6 shadow-xs">
                    <div className="flex items-center gap-3.5">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 border border-blue-200 text-[#0070f2] shadow-2xs">
                            <SlidersHorizontal className="h-6 w-6 text-[#0070f2]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-[#1c2d42]">
                                    Account Settings
                                </h1>
                                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#0070f2]">
                                    <UserCircle className="h-3 w-3" />
                                    <span>Personal Preferences</span>
                                </span>
                            </div>
                            <p className="text-xs text-[#556b82] mt-0.5">
                                Manage your personal identity, credentials, biometric passkeys, and security preferences.
                            </p>
                        </div>
                    </div>

                    {/* Role & Org Context Badge */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-2xs ${
                                isSuperAdmin
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : isEmployee
                                    ? 'bg-teal-100 text-teal-800 border border-teal-200'
                                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                        >
                            <Shield className="h-3.5 w-3.5" />
                            <span>Role: {roleDisplayName}</span>
                        </span>

                        {user?.department && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#d9e2ec] bg-[#f8fafc] px-3 py-1.5 text-xs font-semibold text-[#556b82]">
                                <Building2 className="h-3.5 w-3.5 text-slate-500" />
                                <span className="truncate max-w-[160px]">{user.department.name}</span>
                            </span>
                        )}

                        {user?.employee_id && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#d9e2ec] bg-[#f8fafc] px-3 py-1.5 text-xs font-mono font-semibold text-[#1c2d42]">
                                <span>ID: {user.employee_id}</span>
                            </span>
                        )}
                    </div>
                </div>

                {/* 2-Column Responsive Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: User Profile Summary & Navigation */}
                    <aside className="lg:col-span-4 space-y-5">
                        {/* User Identity Card */}
                        <div className="rounded-xl border border-[#d9e2ec] bg-white p-5 shadow-xs">
                            <div className="flex items-center gap-3.5">
                                <div
                                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-2xs ${
                                        isSuperAdmin
                                            ? 'bg-purple-600'
                                            : isEmployee
                                            ? 'bg-teal-600'
                                            : 'bg-[#0070f2]'
                                    }`}
                                >
                                    {initials}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-bold text-[#1c2d42]">
                                        {user?.name || 'Authorized User'}
                                    </div>
                                    <div className="truncate text-xs text-[#556b82]">
                                        {user?.email || ''}
                                    </div>
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                                            <CheckCircle2 className="h-3 w-3" />
                                            <span>Active Account</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* User Plant / Designation Details */}
                            <div className="mt-4 pt-4 border-t border-[#d9e2ec] space-y-2 text-xs">
                                <div className="flex items-center justify-between text-[#556b82]">
                                    <span>Plant / Location:</span>
                                    <span className="font-semibold text-[#1c2d42]">
                                        {user?.plant || 'Namrup, Assam (Plant 1000)'}
                                    </span>
                                </div>
                                {user?.designation && (
                                    <div className="flex items-center justify-between text-[#556b82]">
                                        <span>Designation:</span>
                                        <span className="font-semibold text-[#1c2d42] truncate max-w-[150px]">
                                            {user.designation}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Navigation Menu Card */}
                        <div className="rounded-xl border border-[#d9e2ec] bg-white overflow-hidden shadow-xs">
                            <div className="border-b border-[#d9e2ec] bg-[#f8fafc] px-4 py-3">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-[#556b82]">
                                    Settings Menu
                                </h2>
                            </div>
                            <nav className="p-2 space-y-1" aria-label="Settings Navigation">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.title}
                                            href={item.href}
                                            className={`group flex items-start gap-3 rounded-lg p-3 transition-colors ${
                                                item.isActive
                                                    ? 'bg-[#0070f2] text-white shadow-xs'
                                                    : 'text-[#1c2d42] hover:bg-slate-50'
                                            }`}
                                        >
                                            <div
                                                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                                                    item.isActive
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-[#0070f2]'
                                                }`}
                                            >
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span
                                                        className={`text-xs font-bold ${
                                                            item.isActive
                                                                ? 'text-white'
                                                                : 'text-[#1c2d42]'
                                                        }`}
                                                    >
                                                        {item.title}
                                                    </span>
                                                    <span
                                                        className={`rounded px-1.5 py-0.5 text-[9px] font-semibold border ${
                                                            item.isActive
                                                                ? 'bg-white/20 text-white border-white/30'
                                                                : 'bg-slate-100 text-slate-600 border-slate-200'
                                                        }`}
                                                    >
                                                        {item.badge}
                                                    </span>
                                                </div>
                                                <p
                                                    className={`text-[11px] line-clamp-1 mt-0.5 ${
                                                        item.isActive
                                                            ? 'text-white/80'
                                                            : 'text-[#556b82]'
                                                    }`}
                                                >
                                                    {item.description}
                                                </p>
                                            </div>
                                            <ChevronRight
                                                className={`h-4 w-4 shrink-0 mt-1 transition-transform ${
                                                    item.isActive
                                                        ? 'text-white translate-x-0.5'
                                                        : 'text-slate-400 group-hover:text-[#1c2d42]'
                                                }`}
                                            />
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Enterprise SAP Integration Notice */}
                        <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-xs text-[#556b82] space-y-2">
                            <div className="flex items-center gap-2 font-bold text-[#0057c2]">
                                <Building2 className="h-4 w-4 text-[#0070f2]" />
                                <span>Assam Petro-Chemicals Ltd.</span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-slate-600">
                                Role permissions and department assignments are centrally administered by the Superadmin. Contact System Administration for role modifications.
                            </p>
                        </div>
                    </aside>

                    {/* Right Column: Active Settings Content */}
                    <div className="lg:col-span-8">
                        <div className="rounded-xl border border-[#d9e2ec] bg-white p-6 sm:p-8 shadow-xs">
                            {/* Active Tab Header Title */}
                            <div className="border-b border-[#d9e2ec] pb-5 mb-6">
                                <div className="flex items-center gap-2">
                                    {isSecurityActive ? (
                                        <ShieldCheck className="h-5 w-5 text-[#0070f2]" />
                                    ) : (
                                        <User className="h-5 w-5 text-[#0070f2]" />
                                    )}
                                    <h2 className="text-base font-bold text-[#1c2d42]">
                                        {isSecurityActive
                                            ? 'Security & Authentication Settings'
                                            : 'Personal Profile Settings'}
                                    </h2>
                                </div>
                                <p className="text-xs text-[#556b82] mt-1">
                                    {isSecurityActive
                                        ? 'Update your account password and manage biometric passkeys.'
                                        : 'Update your official name and primary email address registered for the SAP PR portal.'}
                                </p>
                            </div>

                            {/* Injected Content (Profile or Security) */}
                            <div className="space-y-8">
                                {children}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SapAppLayout>
    );
}
