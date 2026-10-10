import { Form, Head, usePage } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit } from '@/routes/profile';
import type { Auth } from '@/types';
import { send } from '@/routes/verification';

type PageProps = {
    auth: Auth;
};

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<PageProps>().props;

    return (
        <>
            <Head title="Profile settings" />

            <h1 className="sr-only">Profile settings</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Profile"
                    description="Update your name and email address"
                />

                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="text-xs font-semibold text-[#1c2d42]">Full Name</Label>

                                <Input
                                    id="name"
                                    className="mt-1 block w-full rounded-lg border border-[#d9e2ec] bg-white px-3 py-2 text-xs text-[#1c2d42] shadow-2xs hover:border-[#0070f2] focus:border-[#0070f2] focus:ring-2 focus:ring-[#0070f2]/20 focus:outline-none"
                                    defaultValue={auth.user.name}
                                    name="name"
                                    required
                                    autoComplete="name"
                                    placeholder="Enter your full name"
                                />

                                <InputError
                                    className="mt-1 text-xs"
                                    message={errors.name}
                                />
                            </div>

                            <div className="grid gap-1.5">
                                <Label htmlFor="email" className="text-xs font-semibold text-[#1c2d42]">Email Address</Label>

                                <Input
                                    id="email"
                                    type="email"
                                    className="mt-1 block w-full rounded-lg border border-[#d9e2ec] bg-white px-3 py-2 text-xs text-[#1c2d42] shadow-2xs hover:border-[#0070f2] focus:border-[#0070f2] focus:ring-2 focus:ring-[#0070f2]/20 focus:outline-none"
                                    defaultValue={auth.user.email}
                                    name="email"
                                    required
                                    autoComplete="username"
                                    placeholder="Enter your official email address"
                                />

                                <InputError
                                    className="mt-1 text-xs"
                                    message={errors.email}
                                />
                            </div>

                            {mustVerifyEmail &&
                                auth.user.email_verified_at === null && (
                                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                        <p>
                                            Your email address is unverified.{' '}
                                            <Link
                                                href={send()}
                                                as="button"
                                                className="font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950"
                                            >
                                                Click here to re-send the verification email.
                                            </Link>
                                        </p>

                                        {status ===
                                            'verification-link-sent' && (
                                            <div className="mt-2 font-medium text-emerald-700">
                                                A new verification link has been sent to your email address.
                                            </div>
                                        )}
                                    </div>
                                )}

                            <div className="flex items-center gap-3 pt-2">
                                <Button
                                    disabled={processing}
                                    data-test="update-profile-button"
                                    className="bg-[#0070f2] hover:bg-[#0057c2] text-white font-semibold text-xs px-5 py-2 rounded-lg shadow-xs transition-colors"
                                >
                                    {processing ? 'Saving Changes...' : 'Save Profile Changes'}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}
