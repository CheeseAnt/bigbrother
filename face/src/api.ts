import { StatusResponse, ExitResponse, MessageResponse, MetricsResponse, IntroductionResponse } from './types.tsx';

const API_BASE = process.env.API_BASE;

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

export const getMessages = async (uuid: string): Promise<MessageResponse[]> => {
    const response = await fetch(`${API_BASE}/messages/${uuid}`);
    return response.json();
};

export const getMetrics = async (uuid: string): Promise<MetricsResponse[]> => {
    const response = await fetch(`${API_BASE}/metrics/${uuid}`);
    return response.json();
};

export const performAction = async (uuid: string, action: string): Promise<void> => {
    await fetch(`${API_BASE}/action/${uuid}/${action}`, {
        method: 'PUT'
    });
};
