import * as React from 'react';
import { SidebarInset } from '@/components/ui/sidebar';
import type { AppVariant } from '@/types';

type Props = React.ComponentProps<'main'> & {
    variant?: AppVariant;
};

export function AppContent({ variant = 'sidebar', children, ...props }: Props) {
    if (variant === 'sidebar') {
        return <SidebarInset {...props}>{children}</SidebarInset>;
    }

    return (
        <main
            className="flex h-full w-full flex-1 flex-col gap-4 px-4 sm:px-6 lg:px-8 py-6 rounded-xl"
            {...props}
        >
            {children}
        </main>
    );
}
