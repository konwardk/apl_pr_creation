import { Form, Head } from '@inertiajs/react';
import { useRef } from 'react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { edit } from '@/routes/security';
import type { Props as ManagePasskeysProps } from '@/components/manage-passkeys';
import ManagePasskeys from '@/components/manage-passkeys';

type Props = {
    passwordRules: string;
} & ManagePasskeysProps;

export default function Security(props: Props) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <>
            <Head title="Security settings" />

            <h1 className="sr-only">Security settings</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Update password"
                    description="Ensure your account is using a long, random password to stay secure"
                />

                <Form
                    {...SecurityController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    resetOnError={[
                        'password',
                        'password_confirmation',
                        'current_password',
                    ]}
                    resetOnSuccess
                    onError={(errors) => {
                        if (errors.password) {
                            passwordInput.current?.focus();
                        }

                        if (errors.current_password) {
                            currentPasswordInput.current?.focus();
                        }
                    }}
                    className="space-y-6"
                >
                    {({ errors, processing }) => (
                        <>
                            <div className="grid gap-1.5">
                                <Label htmlFor="current_password" className="text-xs font-semibold text-[#1c2d42]">
                                    Current Password
                                </Label>

                                <PasswordInput
                                    id="current_password"
                                    ref={currentPasswordInput}
                                    name="current_password"
                                    className="mt-1 block w-full rounded-lg border border-[#d9e2ec] bg-white px-3 py-2 text-xs text-[#1c2d42] shadow-2xs hover:border-[#0070f2] focus:border-[#0070f2] focus:ring-2 focus:ring-[#0070f2]/20 focus:outline-none"
                                    autoComplete="current-password"
                                    placeholder="Enter your current password"
                                />

                                <InputError className="mt-1 text-xs" message={errors.current_password} />
                            </div>

                            <div className="grid gap-1.5">
                                <Label htmlFor="password" className="text-xs font-semibold text-[#1c2d42]">New Password</Label>

                                <PasswordInput
                                    id="password"
                                    ref={passwordInput}
                                    name="password"
                                    className="mt-1 block w-full rounded-lg border border-[#d9e2ec] bg-white px-3 py-2 text-xs text-[#1c2d42] shadow-2xs hover:border-[#0070f2] focus:border-[#0070f2] focus:ring-2 focus:ring-[#0070f2]/20 focus:outline-none"
                                    autoComplete="new-password"
                                    placeholder="Enter your new password"
                                    passwordrules={props.passwordRules}
                                />

                                <InputError className="mt-1 text-xs" message={errors.password} />
                            </div>

                            <div className="grid gap-1.5">
                                <Label htmlFor="password_confirmation" className="text-xs font-semibold text-[#1c2d42]">
                                    Confirm New Password
                                </Label>

                                <PasswordInput
                                    id="password_confirmation"
                                    name="password_confirmation"
                                    className="mt-1 block w-full rounded-lg border border-[#d9e2ec] bg-white px-3 py-2 text-xs text-[#1c2d42] shadow-2xs hover:border-[#0070f2] focus:border-[#0070f2] focus:ring-2 focus:ring-[#0070f2]/20 focus:outline-none"
                                    autoComplete="new-password"
                                    placeholder="Re-enter your new password"
                                    passwordrules={props.passwordRules}
                                />

                                <InputError
                                    className="mt-1 text-xs"
                                    message={errors.password_confirmation}
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <Button
                                    disabled={processing}
                                    data-test="update-password-button"
                                    className="bg-[#0070f2] hover:bg-[#0057c2] text-white font-semibold text-xs px-5 py-2 rounded-lg shadow-xs transition-colors"
                                >
                                    {processing ? 'Updating Password...' : 'Update Password'}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>

            <div className="border-t border-[#d9e2ec] pt-6">
                <ManagePasskeys
                    canManagePasskeys={props.canManagePasskeys}
                    passkeys={props.passkeys}
                />
            </div>
        </>
    );
}
