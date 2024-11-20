import { useState, useEffect } from 'react';
import { getEyeballs } from '../api.ts';

export const useEyeballs = (includeInactive: boolean = false) => {
    const [eyeballs, setEyeballs] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchEyeballs = async () => {
            try {
                setLoading(true);
                const data = await getEyeballs(includeInactive);
                setEyeballs(data);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to fetch eyeballs'));
            } finally {
                setLoading(false);
            }
        };

        fetchEyeballs();
    }, [includeInactive]);

    return { eyeballs, loading, error };
};
