export interface MessageResponse {
    timestamp: number;
    message: string;
    error: boolean;
}

export interface MetricsResponse {
    cpu: number;
    memory: number;
    disk: number;
    time: number;
}

export interface IntroductionResponse {
    uuid: string;
    host: string;
    ip: string;
    pid: number;
    parent_pid: number;
    user: string;
    name: string;
    args: string;
    created_time: number;
}

export interface StatusResponse {
    exited: boolean;
}

export interface ExitResponse {
    exit_code: number;
    time: number;
    messages: MessageResponse[];
}
