import { getStatus, getMetrics, getEyeballsByBody, getEyeballsByIp, getIntroduction, getMessages, getExit } from '../api.ts';
import { MessageResponse, MetricsResponse } from '../types.tsx';
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
        const latestTime = metricsInternal[metricsInternal.length - 1]?.time + 1;
        if (latestTime) latestTimeRef.current = latestTime;
    }, [metricsInternal]);

    return {
        introduction, status, metrics, loadingIntro, loadingStatus, errorIntro, errorStatus, lastUpdated: latestTimeRef.current ?? 0
    }
};

export const useMessages = (eyeball: string, refreshSpeed: number = 5000, start: number = 0) => {
    const [ messages, setMessages ] = useState<MessageResponse[]>([]);
    const latestTimeRef = useRef<number>(start);
    
    useEffect(() => {
        latestTimeRef.current = start;
        setMessages([]);
    }, [eyeball, start]);

    const fetchData = useCallback(() => getMessages(eyeball, latestTimeRef.current), [eyeball, start]);
    const { data: messagesInternal, loading: loadingMessages, error: errorMessages } = useGenericFetch(fetchData, refreshSpeed);

    useEffect(() => {
        if (!messagesInternal) return;
        if (messagesInternal.length === 0) return;
        setMessages(messagesPrevious => [...messagesPrevious, ...messagesInternal]);
        const latestTime = messagesInternal[messagesInternal.length - 1]?.timestamp + 1;
        if (latestTime) latestTimeRef.current = latestTime;
    }, [messagesInternal]);

    return { messages, loadingMessages, errorMessages };
};

export const useMiniBody = (body: string, refreshSpeed: number = 5000, inactive: boolean) => {
    const fetchData = useCallback(() => getEyeballsByBody(body, inactive), [body, inactive]);
    return useGenericFetch(fetchData, refreshSpeed);
};

export const useMiniIp = (ip: string, refreshSpeed: number = 5000, inactive: boolean) => {
    const fetchData = useCallback(() => getEyeballsByIp(ip, inactive), [ip, inactive]);
    return useGenericFetch(fetchData, refreshSpeed);
};

export const useExit = (eyeball: string, exited: boolean) => {
    const fetchData = useCallback(() => exited ? getExit(eyeball) : Promise.resolve(null), [eyeball, exited]);
    return useGenericFetch(fetchData, 0);
};
