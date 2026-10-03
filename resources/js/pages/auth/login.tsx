import React, { useState } from 'react';
import { Form, Head } from '@inertiajs/react';
import { Mail, Lock, Sparkles, Server, CheckCircle2 } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';
import PasskeyVerify from '@/components/passkey-verify';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    const [demoEmail, setDemoEmail] = useState('');
    const [demoPassword, setDemoPassword] = useState('');

    const handleFillDemo = () => {
        setDemoEmail('test@example.com');
        setDemoPassword('password');
        const emailInput = document.getElementById('email') as HTMLInputElement | null;
        const passInput = document.getElementById('password') as HTMLInputElement | null;
        if (emailInput) {
            emailInput.value = 'test@example.com';
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (passInput) {
            passInput.value = 'password';
            passInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    };

    return (
        <>
            <Head title="SAP Cloud Login - Purchase Requisition Portal" />

            <PasskeyVerify />

            {/* Quick Demo Credentials Bar */}
            <div className="mb-5 rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-left">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0057c2]">
                        <Sparkles className="h-3.5 w-3.5 text-[#0070f2]" />
                        <span>Pre-seeded SAP Test Account:</span>
                    </div>
                    <button
                        type="button"
                        onClick={handleFillDemo}
                        className="rounded bg-[#0070f2] px-2 py-0.5 text-[11px] font-medium text-white shadow-xs transition-colors hover:bg-[#0057c2] active:bg-[#003884]"
                    >
                        Auto-fill
                    </button>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-[#556b82]">
                    <span>Email: <strong className="text-[#1c2d42]">test@example.com</strong></span>
                    <span>Password: <strong className="text-[#1c2d42]">password</strong></span>
                </div>
            </div>

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-4"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-4">
                            <div className="grid gap-1.5 text-left">
                                <Label htmlFor="email" className="text-xs font-semibold text-[#1c2d42]">
                                    SAP User ID / Email
                                </Label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#556b82]" />
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        defaultValue={demoEmail}
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="email"
                                        placeholder="user@example.com"
                                        className="h-10 rounded-md border-[#d9e2ec] pl-9 text-sm text-[#1c2d42] transition-colors focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]"
                                    />
                                </div>
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-1.5 text-left">
                                <div className="flex items-center">
                                    <Label htmlFor="password" className="text-xs font-semibold text-[#1c2d42]">
                                        Password
                                    </Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="ml-auto text-xs text-[#0070f2] hover:underline"
                                            tabIndex={5}
                                        >
                                            Forgot password?
                                        </TextLink>
                                    )}
                                </div>
                                <div className="relative">
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        defaultValue={demoPassword}
                                        required
                                        tabIndex={2}
                                        autoComplete="current-password"
                                        placeholder="Enter password"
                                        className="h-10 rounded-md border-[#d9e2ec] text-sm text-[#1c2d42] focus:border-[#0070f2] focus:ring-1 focus:ring-[#0070f2]"
                                    />
                                </div>
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-2 text-left">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                    className="data-[state=checked]:bg-[#0070f2] data-[state=checked]:border-[#0070f2]"
                                />
                                <Label htmlFor="remember" className="text-xs font-normal text-[#556b82] cursor-pointer">
                                    Remember my user ID on this browser
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-2 h-10 w-full rounded-md bg-[#0070f2] text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#0057c2] active:bg-[#003884]"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing ? (
                                    <div className="flex items-center gap-2">
                                        <Spinner />
                                        <span>Authenticating with SAP Portal...</span>
                                    </div>
                                ) : (
                                    'Log In to SAP Portal'
                                )}
                            </Button>
                        </div>

                        <div className="mt-1 text-center text-xs text-[#556b82]">
                            Need a new SAP requester profile?{' '}
                            <TextLink href={register()} tabIndex={5} className="font-semibold text-[#0070f2] hover:underline">
                                Request Access
                            </TextLink>
                        </div>

                        {/* SAP Public Cloud Connection Status */}
                        <div className="mt-2 border-t border-slate-100 pt-3 text-left">
                            <div className="flex items-center gap-2 text-[11px] text-[#556b82]">
                                <Server className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Connected Target: <strong className="text-[#1c2d42]">SAP S/4HANA Cloud (Public)</strong></span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#556b82]">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Local Database: <strong className="text-[#1c2d42]">MySQL apl_pr_db</strong></span>
                            </div>
                        </div>
                    </>
                )}
            </Form>

            {status && (
                <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-2.5 text-center text-xs font-medium text-emerald-700">
                    {status}
                </div>
            )}
        </>
    );
}

Login.layout = {
    title: 'SAP S/4HANA Cloud',
    description: 'Purchase Requisition Portal • Public Cloud Edition',
};
