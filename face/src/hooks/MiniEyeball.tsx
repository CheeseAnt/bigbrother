import { useState, useEffect } from 'react';
import { getStatus, getMetrics } from '../api.ts';
import { StatusResponse, MetricsResponse } from '../types.tsx';

export const useMiniEyeball = (eyeball: string) => {
    const [status, setStatus] = useState<StatusResponse | null>(null);
    const [metrics, setMetrics] = useState<MetricsResponse[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchStatusAndMetrics = async () => {
            try {
                setLoading(true);
                const status = await getStatus(eyeball);
                const metrics = await getMetrics(eyeball);
                setStatus(status);
                setMetrics(metrics);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to fetch status and metrics'));
            } finally {
                setLoading(false);
            }
        };

        fetchStatusAndMetrics();
    }, [eyeball]);

    return { status, metrics, loading, error };
};
