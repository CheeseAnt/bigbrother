import { StatusResponse, ExitResponse, MessageResponse, MetricsResponse, IntroductionResponse } from './types.tsx';

const API_BASE = process.env.API_BASE;

export const setAuth = (username: string, password: string) => {
    const userAuth = btoa(`${username}:${password}`);
    window.localStorage.setItem("auth", userAuth);
}

export const getAuth = () => {
    return window.localStorage.getItem("auth");
}

const fetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const response = await window.fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Basic ${getAuth()}`
        }
    });

    if (response.status === 401) {
        window.localStorage.removeItem("auth");
    }

    return response;
}

export const isBadAuth = async () => {
    try {
        await getBodies();
        return false;
    } catch (e) {
        return true;
    }
}


const handleTimes = (url: string, start_time?: number, end_time?: number): string => {
    const params = new URLSearchParams();
    if (start_time) params.append('start', start_time.toString());
    if (end_time) params.append('end', end_time.toString());
    if (params.toString()) url += `?${params.toString()}`;

    return url;
}

export const getEyeballs = async (includeInactive = false): Promise<string[]> => {
    const response = await fetch(`${API_BASE}/eyeballs?inactive=${includeInactive}`);
    return response.json();
};

export const getEyeballsByBody = async (body: string, includeInactive = false): Promise<string[]> => {
    const response = await fetch(`${API_BASE}/eyeballs/${body}?inactive=${includeInactive}`);
    return response.json();
};

export const getEyeballsByIp = async (ip: string, includeInactive = false): Promise<string[]> => {
    const response = await fetch(`${API_BASE}/eyeballs/ip/${ip}?inactive=${includeInactive}`);
    return response.json();
};

export const getBodies = async (includeInactive = false): Promise<string[]> => {
    const response = await fetch(`${API_BASE}/bodies?inactive=${includeInactive}`);
    return response.json();
};

export const getIps = async (includeInactive = false): Promise<string[]> => {
    const response = await fetch(`${API_BASE}/ips?inactive=${includeInactive}`);
    return response.json();
};

export const getIntroduction = async (uuid: string): Promise<IntroductionResponse> => {
    const response = await fetch(`${API_BASE}/introduction/${uuid}`);
    return response.json();
};

export const getStatus = async (uuid: string): Promise<StatusResponse> => {
    const response = await fetch(`${API_BASE}/status/${uuid}`);
    return response.json();
};

export const getExit = async (uuid: string): Promise<ExitResponse> => {
    const response = await fetch(`${API_BASE}/exit/${uuid}`);
    return response.json();
};

export const deleteEyeball = async (uuid: string): Promise<void> => {
    await fetch(`${API_BASE}/delete/${uuid}`, {
        method: 'DELETE'
    });
};

export const getMessages = async (uuid: string, start_time?: number, end_time?: number): Promise<MessageResponse[]> => {
    let url = `${API_BASE}/messages/${uuid}`;
    url = handleTimes(url, start_time, end_time);

    const response = await fetch(url);
    return response.json();
};

export const getMetrics = async (uuid: string, start_time?: number, end_time?: number): Promise<MetricsResponse[]> => {
    let url = `${API_BASE}/metrics/${uuid}`;
    url = handleTimes(url, start_time, end_time);

    const response = await fetch(url);
    return response.json();
};

export const performAction = async (uuid: string, action: string): Promise<void> => {
    await fetch(`${API_BASE}/action/${uuid}/${action}`, {
        method: 'PUT'
    });
};
