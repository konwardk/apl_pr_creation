import { useEffect } from 'react';
import { router } from '@inertiajs/react';

export default function Appearance() {
    useEffect(() => {
        router.replace('/settings/profile');
    }, []);

    return null;
}

