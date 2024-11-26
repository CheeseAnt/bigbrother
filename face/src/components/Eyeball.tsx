import { useNavigate, useParams } from 'react-router-dom';
import { useMiniEyeball, useMessages, useExit } from '../hooks/Mini';
import { MetricsChart } from './Charts';
import { FloatingLoadingIndicator, RunningIndicator, ExitedIndicator } from './Indicators';
import { StatusResponse, IntroductionResponse, MetricsResponse, MessageResponse } from '../types';
import { Button } from './Button';
import { ArrowLeftCircle } from 'react-bootstrap-icons';
import { useEffect, useState } from 'react';
import { useRef } from 'react';
import Actions from './Actions';
import { DropDown, ToggleButtonStyled, useRefreshOptions } from './UpdateOptions';
import { ToggleButtonGroup } from '@mui/material';

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
    const { data: exit } = useExit(introduction.uuid, status.exited);

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
                    {introduction.display_name && <div className='row'>
                        <div className='col-12 text-center'>
                            {introduction.display_name}
                        </div>
                    </div>}
                    <div className='row'>
                        <div className="col-4 text-start d-flex flex-row gap-2 align-items-center">
                            <span>{introduction.user} @ {introduction.host} {introduction.ip}</span>
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
                    {exit && <div className='row'>
                        <div className='col-12 text-start'>
                            <span>Exited with code {exit.exit_code} at {new Date(exit.time).toLocaleString()}</span>
                        </div>
                    </div>}
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

const FullMessagesContainer = ({ messages, loading, showErrors, scootToBottom }: { messages: MessageResponse[], loading: boolean, showErrors: boolean, scootToBottom: boolean }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Check if user is near bottom (within 400px)
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 400;

        if (isNearBottom) {
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);

    useEffect(() => {
        if (messages.length > 0) {
            containerRef.current?.scrollTo({ top: containerRef.current?.scrollHeight, behavior: 'smooth' });
        }
    }, [messages.length === 0, scootToBottom]);

    return <div className='card m-2 gy-2' data-bs-theme='dark'>
        <div ref={containerRef} className='card-body text-start' style={{ height: '75vh', overflowY: 'auto' }}>
            {loading && <FloatingLoadingIndicator classes='start-50 top-50'/>}
            {messages.filter(m => showErrors ? m.error : true).map((m, i) => <Message key={i} message={m} />)}
        </div>
    </div>
}

const useUpdateOptions = (messageGetter: () => MessageResponse[]) => {
    const { option: refreshRate, setOption: setRefreshRate, element: refreshElement } = useRefreshOptions();
    const [ showErrors, setShowErrors ] = useState(false);
    const [ scootToBottom, setScootToBottom ] = useState(false);

    const messagesFromOptions = [
        { label: 'All', value: 0 },
        { label: '1 day', value: Date.now() - 24 * 60 * 60 * 1000 },
        { label: '1 hour', value: Date.now() - 1 * 60 * 60 * 1000 },
        { label: '30 minutes', value: Date.now() - 30 * 60 * 1000 },
        { label: '15 minutes', value: Date.now() - 15 * 60 * 1000 },
        { label: '5 minutes', value: Date.now() - 5 * 60 * 1000 },
    ]
    const [ messagesFromInternal, setMessagesFrom ] = useState<{ label: string, value: number }>(messagesFromOptions[3]);
    const messagesFrom = messagesFromInternal.value;

    const messagesFromElement = <div className='d-flex flex-row gap-2'>
        <DropDown options={messagesFromOptions} defaultValue={messagesFromOptions[3]} setOption={(value) => setMessagesFrom(value)} value={messagesFromInternal} title='See messages from' />
        <ToggleButtonGroup
            exclusive
            value={showErrors}>
            <ToggleButtonStyled label='Only show errors' value={true} onChange={() => setShowErrors(showErrors => !showErrors)} />
        </ToggleButtonGroup>
        <Button onClick={() => setScootToBottom(scootToBottom => !scootToBottom)}>Scoot to bottom</Button>
        <Button onClick={() => {
            const content = messageGetter().map(m => `${new Date(m.timestamp).toISOString()}: ${m.message}`).join('\n');
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `messages-${new Date().toISOString()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }}>Download logs</Button>
    </div>
    
    return { refreshRate, messagesFrom, setRefreshRate, setMessagesFrom, refreshElement, messagesFromElement, showErrors, scootToBottom };
}

const Eyeball = () => {
    const { uuid } = useParams();

    if (!uuid) return <div>Invalid UUID</div>;

    const { refreshRate, messagesFrom, refreshElement, messagesFromElement, showErrors, scootToBottom, setRefreshRate } = useUpdateOptions(() => messages);
    const { status, metrics, loadingStatus, errorStatus, introduction, lastUpdated } = useMiniEyeball(uuid, refreshRate);
    const { messages, loadingMessages, errorMessages } = useMessages(uuid, refreshRate, messagesFrom);
    const navigate = useNavigate();

    const goHome = () => { navigate('/'); }

    useEffect(() => {
        if (status?.exited) {
            setRefreshRate({ label: 'Off', value: 0 });
        }
    }, [status?.exited]);

    if (errorStatus || errorMessages) {
        setTimeout(goHome, 3000);
        return <div>
            <br></br>
            <span>Error loading eyeball - has it been deleted?</span>
            <br></br>
            <span className='text-end'>Redirecting to home...</span>
            <br></br>
            <FloatingLoadingIndicator classes='start-0'/>
        </div>;
    }

    if (!status || !introduction) return <FloatingLoadingIndicator classes='start-0 top-50'/>;

    return <div>
        <div className='card m-2 gy-2'>
            <FullStatusContainer introduction={introduction} status={status} loading={loadingStatus} last_updated={lastUpdated} />
            <Actions uuid={uuid} direction='row' exited={status.exited} onAction={(deleted) => { deleted && goHome() }} />
            <div className='d-flex flex-row w-100 justify-content-end'>
                {refreshElement}
            </div>
            <FullMetricsContainer metrics={metrics} />
            <div className='d-flex flex-row w-100 justify-content-end'>
                {messagesFromElement}
            </div>
            <FullMessagesContainer messages={messages} loading={loadingMessages} showErrors={showErrors} scootToBottom={scootToBottom} />
        </div>
    </div>
}

export default Eyeball
