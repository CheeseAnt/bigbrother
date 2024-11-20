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

export interface StatusResponse {
    uuid: string;
    host: string;
    ip: string;
    pid: number;
    parent_pid: number;
    name: string;
    args: string;
    created_time: number;
    exited: boolean;
}

export interface ExitResponse {
    exit_code: number;
    time: number;
    messages: MessageResponse[];
}
