import { useNavigate, useParams } from 'react-router-dom';
import { useMiniEyeball, useMessages } from '../hooks/Mini';
import { MetricsChart } from './Charts';
import { FloatingLoadingIndicator, RunningIndicator, ExitedIndicator } from './Indicators';
import { StatusResponse, IntroductionResponse, MetricsResponse, MessageResponse } from '../types';
import styles from '../styles/Index.module.css';
import { Button } from './Button';
import { ArrowLeftCircle } from 'react-bootstrap-icons';
import { useEffect } from 'react';
import { useRef } from 'react';

const FullStatusContainer = ({ 
    status,
    introduction,
    loading,
    last_updated
}: {
    status: StatusResponse,
    introduction: IntroductionResponse,
    loading: boolean,
    last_updated: number
}) => {
    const navigate = useNavigate();

    return <div className='card m-2 gy-2' data-bs-theme='dark'>
        <div className='card-body'>
            <div className='row' style={{ fontSize: '0.8rem' }}>
                <div className='col-2 text-start d-flex align-items-center pe-0 ps-0'>
                    <Button className='w-75 pt-2 pb-2' onClick={() => navigate('/')}><ArrowLeftCircle/></Button>
                    <div className='w-25' style={{ placeItems: 'center' }}>
                        {status.exited ? <ExitedIndicator loading={loading} /> : <RunningIndicator loading={loading} />}
                    </div>
                </div>
                <div className='col-10 align-content-center'>
                    <div className='row'>
                        <div className="col-4 text-start d-flex flex-row gap-2 align-items-center">
                            <span>{introduction.host}</span>
                            <span>{introduction.ip}</span>
                        </div>
                        <div className="col-4 text-start">
                            <span>{introduction.name} {introduction.args}</span>
                        </div>
                        <div className="col-4 text-end">
                            Created: {new Date(introduction.created_time).toLocaleString()}
                        </div>
                    </div>
                    <div className='row'>
                        <div className='col-4 text-start'>
                            <span>{introduction.uuid}</span>
                        </div>
                        <div className='col-2 text-start'>
                            <span>PID: {introduction.parent_pid}:{introduction.pid}</span>
                        </div>
                        <div className='col-6 text-end'>
                            <span>Last Updated: ({Math.round((Date.now() - last_updated) / 1000)} seconds ago) {new Date(last_updated).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
}

const FullMetricsContainer = ({ metrics }: { metrics: MetricsResponse[] }) => {
    const time_data = metrics.map((m) => m.time);
    const cpu_data = metrics.map((m) => m.cpu);
    const memory_data = metrics.map((m) => m.memory/1e6);
    const disk_data = metrics.map((m) => m.disk/1e6);
    const has_cpu = cpu_data.length > 0 && cpu_data.some((c) => c > 0);
    const has_memory = memory_data.length > 0 && memory_data.some((m) => m > 0);
    const has_disk = disk_data.length > 0 && disk_data.some((d) => d > 0);
    const has_any = has_cpu || has_memory || has_disk;

    if (!has_any) return <div>No metrics</div>;

    return <div className='card m-2 gy-2' data-bs-theme='dark'>
        <div className='card-body'>
            {has_cpu && <MetricsChart metric={cpu_data} time={time_data} title='CPU' unit='%' color='#02d5d1' height='40vh' />}
            {has_memory && <MetricsChart metric={memory_data} time={time_data} title='Memory' unit=' MB' color='#00CC02' height='40vh' />}
            {has_disk && <MetricsChart metric={disk_data} time={time_data} title='Disk' unit=' MB' color='#006BD6' height='40vh' />}
        </div>
    </div>
}

const Message = ({ message }: { message: MessageResponse }) => {
    return <div className='text-start'>
        <span style={{ color: message.error ? '#FF3333' : '#868686' }}>{new Date(message.timestamp).toLocaleString()}: {message.message}</span>
    </div>
}

const FullMessagesContainer = ({ messages }: { messages: MessageResponse[] }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Check if user is near bottom (within 100px)
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        
        if (isNearBottom) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    useEffect(() => {
        if (messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages.length === 0]);

    return <div className='card m-2 gy-2' data-bs-theme='dark'>
        <div ref={containerRef} className='card-body text-start' style={{ height: '75vh', overflowY: 'auto' }}>
            {messages.map((m, i) => <Message key={i} message={m} />)}
            <div ref={messagesEndRef} />
        </div>
    </div>
}

const Eyeball = () => {
    const { uuid } = useParams();

    if (!uuid) return <div>Invalid UUID</div>;

    const { status, metrics, loadingStatus, errorStatus, introduction, lastUpdated } = useMiniEyeball(uuid, 5000);
    const halfAnHourAgo = Date.now() - 30 * 60 * 1000;
    const { messages, loadingMessages, errorMessages } = useMessages(uuid, 5000, halfAnHourAgo);

    if (!status || !introduction) return <FloatingLoadingIndicator />;

    return <div>
        <div className='card m-2 gy-2'>
            <FullStatusContainer introduction={introduction} status={status} loading={loadingStatus} last_updated={lastUpdated} />
            <FullMetricsContainer metrics={metrics} />
            <FullMessagesContainer messages={messages} />
        </div>
    </div>
}

export default Eyeball
