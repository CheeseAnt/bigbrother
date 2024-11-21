import { getStatus, getMetrics, getEyeballsByBody, getEyeballsByIp, getIntroduction } from '../api.ts';
import { MetricsResponse } from '../types.tsx';
import { useGenericFetch } from './Index.tsx';
import { useCallback, useEffect, useRef, useState } from 'react';

export const useMiniEyeball = (eyeball: string, refreshSpeed: number = 5000) => {
    const [ metrics, setMetrics ] = useState<MetricsResponse[]>([]);
    const latestTimeRef = useRef<number | undefined>(undefined);

    const fetchIntroduction = useCallback(() => {
        return getIntroduction(eyeball);
    }, [eyeball])

    const { data: introduction, loading: loadingIntro, error: errorIntro } = useGenericFetch(fetchIntroduction, 0);

    const getStatusAndMetrics = async () => {
        console.log(latestTimeRef.current);
        const [status, metrics] = await Promise.all([getStatus(eyeball), getMetrics(eyeball, latestTimeRef.current)]);
        return { status, metrics };
    };
    const fetchData = useCallback(getStatusAndMetrics, [eyeball]);
    const { data: { status, metrics: metricsInternal }, loading: loadingStatus, error: errorStatus } = useGenericFetch(fetchData, refreshSpeed);

    useEffect(() => {
        latestTimeRef.current = undefined;
        setMetrics([]);
    }, [eyeball]);

    useEffect(() => {
        if (!metricsInternal) return;
        if (metricsInternal.length === 0) return;
        setMetrics(metricsPrevious => [...metricsPrevious, ...metricsInternal]);
        latestTimeRef.current = metricsInternal[metricsInternal.length - 1]?.time;
    }, [metricsInternal]);

    return {
        introduction, status, metrics, loadingIntro, loadingStatus, errorIntro, errorStatus
    }
};

export const useMiniBody = (body: string, refreshSpeed: number = 5000, inactive: boolean) => {
    const fetchData = useCallback(() => getEyeballsByBody(body, inactive), [body, inactive]);
    return useGenericFetch(fetchData, refreshSpeed);
};

export const useMiniIp = (ip: string, refreshSpeed: number = 5000, inactive: boolean) => {
    const fetchData = useCallback(() => getEyeballsByIp(ip, inactive), [ip, inactive]);
    return useGenericFetch(fetchData, refreshSpeed);
};
