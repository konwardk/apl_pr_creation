import { Form, Head } from '@inertiajs/react';
import { Mail } from 'lucide-react';
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

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    return (
        <>
            <Head title="Sign In - Purchase Requisition Portal" />

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
                                    Email or User ID
                                </Label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#556b82]" />
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
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
                                    {/* {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="ml-auto text-xs text-[#0070f2] hover:underline"
                                            tabIndex={5}
                                        >
                                            Forgot password?
                                        </TextLink>
                                    )} */}
                                </div>
                                <div className="relative">
                                    <PasswordInput
                                        id="password"
                                        name="password"
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
                                    Remember me
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
                                        <span>Signing in...</span>
                                    </div>
                                ) : (
                                    'Sign In'
                                )}
                            </Button>
                        </div>

                        {/* <div className="mt-2 text-center text-xs text-[#556b82]">
                            Don't have an account?{' '}
                            <TextLink href={register()} tabIndex={5} className="font-semibold text-[#0070f2] hover:underline">
                                Create an account
                            </TextLink>
                        </div> */}
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
    title: 'Purchase Requisition Portal',
    description: 'Sign in to access your account',
};