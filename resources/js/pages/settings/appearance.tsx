import { useEffect } from 'react';
import { router } from '@inertiajs/react';

export default function Appearance() {
    useEffect(() => {
        router.visit('/settings/profile', { replace: true });
    }, []);

    return null;
}

