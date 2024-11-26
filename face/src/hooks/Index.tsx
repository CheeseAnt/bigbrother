import { useState, useEffect, useCallback } from 'react';
import { getBodies, getIps } from '../api.ts';

export const genericFetch = async (
    fetchFunction: () => Promise<any>,
    setData: (data: any) => void,
    setLoading: (loading: boolean) => void,
    setError: (error: Error | null) => void
) => {
    try {
        setLoading(true);
        const data = await fetchFunction();
        setData(data);
        setError(null);
    } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    } finally {
        setLoading(false);
    }
};

export const useTabVisibility = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible');
    };

    // Listen for visibility change events
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
};

export const useGenericFetch = (fetchFunction: () => Promise<any>, refreshSpeed: number = 0) => {
    const [data, setData] = useState<any>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const isVisible = useTabVisibility();

    const fetchData = useCallback(
        () => {
            if (isVisible) {
                genericFetch(fetchFunction, setData, setLoading, setError)
            }
        },
        [fetchFunction, isVisible]
    );

    useEffect(() => {
        // Initial fetch
        fetchData();

        let interval: NodeJS.Timeout | undefined;
        // Set up interval only if refreshSpeed > 0
        if (refreshSpeed > 0) {
            interval = setInterval(fetchData, refreshSpeed);
        }

        // Cleanup function will be called on unmount and when dependencies change
        return () => {
            if (interval) {
                clearInterval(interval);
                interval = undefined;
            }
        };
    }, [fetchData, refreshSpeed]);

    return { 
        data, 
        loading, 
        error, 
        reload: fetchData
    };
};

export const useIPs = (includeInactive: boolean = false, refreshSpeed: number = 5000) => {
    const fetchData = useCallback(() => getIps(includeInactive), [includeInactive]);
    return useGenericFetch(fetchData, refreshSpeed);
};

export const useBodies = (includeInactive: boolean = false, refreshSpeed: number = 5000) => {
    const fetchData = useCallback(() => getBodies(includeInactive), [includeInactive]);
    return useGenericFetch(fetchData, refreshSpeed);
};
