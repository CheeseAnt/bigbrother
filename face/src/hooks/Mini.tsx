import { getStatus, getMetrics, getEyeballsByBody, getEyeballsByIp } from '../api.ts';
import { useGenericFetch } from './Index.tsx';
import { useCallback } from 'react';

export const useMiniEyeball = (eyeball: string, refreshSpeed: number = 5000) => {
    const getStatusAndMetrics = async () => {
        const [status, metrics] = await Promise.all([getStatus(eyeball), getMetrics(eyeball)]);
        return { status, metrics };
    };
    const fetchData = useCallback(getStatusAndMetrics, [eyeball]);
    return useGenericFetch(fetchData, refreshSpeed);
};

export const useMiniBody = (body: string, refreshSpeed: number = 5000, inactive: boolean) => {
    const fetchData = useCallback(() => getEyeballsByBody(body, inactive), [body, inactive]);
    return useGenericFetch(fetchData, refreshSpeed);
};

export const useMiniIp = (ip: string, refreshSpeed: number = 5000, inactive: boolean) => {
    const fetchData = useCallback(() => getEyeballsByIp(ip, inactive), [ip, inactive]);
    return useGenericFetch(fetchData, refreshSpeed);
};
