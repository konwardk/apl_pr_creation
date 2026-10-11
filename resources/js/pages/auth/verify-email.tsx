// Email verification is temporarily disabled; users can log in directly without verification.
// Will integrate email verification later.
// Components
import { Head } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import { dashboard, logout } from '@/routes';
// import { Form } from '@inertiajs/react';
// import { Button } from '@/components/ui/button';
// import { Spinner } from '@/components/ui/spinner';
// import { send } from '@/routes/verification';

export default function VerifyEmail({ status }: { status?: string }) {
    return (
        <>
            <Head title="Email verification" />

            <div className="space-y-4 text-center">
                <p className="text-sm text-slate-600">
                    Email verification is currently not required. You can access the system directly.
                </p>

                <div className="flex flex-col gap-2 pt-2">
                    <TextLink
                        href={dashboard()}
                        className="mx-auto block text-sm font-semibold text-[#0070f2] hover:underline"
                    >
                        Proceed to Dashboard
                    </TextLink>
                    <TextLink
                        href={logout()}
                        className="mx-auto block text-sm text-slate-500 hover:text-slate-700"
                    >
                        Log out
                    </TextLink>
                </div>
            </div>

            {/* Email verification resend form disabled for now; will integrate later
            {status === 'verification-link-sent' && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    A new verification link has been sent to the email address
                    you provided during registration.
                </div>
            )}

            <Form {...send.form()} className="space-y-6 text-center">
                {({ processing }) => (
                    <>
                        <Button disabled={processing} variant="secondary">
                            {processing && <Spinner />}
                            Resend verification email
                        </Button>

                        <TextLink
                            href={logout()}
                            className="mx-auto block text-sm"
                        >
                            Log out
                        </TextLink>
                    </>
                )}
            </Form>
            */}
        </>
    );
}

VerifyEmail.layout = {
    title: 'Email verification',
    description:
        'Email verification is currently disabled. You may proceed directly to the portal.',
};
