import { getStatus, getMetrics, getEyeballsByBody, getEyeballsByIp, getIntroduction } from '../api.ts';
import { useGenericFetch } from './Index.tsx';
import { useCallback } from 'react';

export const useMiniEyeball = (eyeball: string, refreshSpeed: number = 5000) => {
    const fetchIntroduction = useCallback(() => {
        return getIntroduction(eyeball);
    }, [eyeball])

    const { data: introduction, loading: loadingIntro, error: errorIntro } = useGenericFetch(fetchIntroduction, 0);

    const getStatusAndMetrics = async () => {
        const [status, metrics] = await Promise.all([getStatus(eyeball), getMetrics(eyeball)]);
        return { status, metrics };
    };
    const fetchData = useCallback(getStatusAndMetrics, [eyeball]);
    const { data: statusAndMetrics, loading: loadingStatus, error: errorStatus } = useGenericFetch(fetchData, refreshSpeed);

    return {
        introduction, statusAndMetrics, loadingIntro, loadingStatus, errorIntro, errorStatus
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
