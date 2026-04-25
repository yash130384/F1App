'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useExperimental() {
    const { data: session } = useSession();
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        const check = () => {
            const isTRunKX = session?.user?.name === 'TRunKX';
            if (!isTRunKX) {
                setEnabled(false);
                return;
            }
            const saved = localStorage.getItem('f1_experimental_enabled') === 'true';
            setEnabled(saved);
        };

        check();
        window.addEventListener('storage', check);
        return () => window.removeEventListener('storage', check);
    }, [session]);

    return enabled;
}
