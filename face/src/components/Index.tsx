import { useBodies, useIPs } from '../hooks/Index.tsx';
import { useMiniBody, useMiniEyeball, useMiniIp } from '../hooks/Mini.tsx';
import styles from '../styles/Index.module.css';
import { MetricsResponse, StatusResponse, IntroductionResponse } from '../types.tsx';
import { RunningIndicator, ExitedIndicator, FloatingLoadingIndicator } from './Indicators.tsx';
import Actions from './Actions.tsx';
import useUpdateOptions from './UpdateOptions.tsx';
import { useNavigate } from 'react-router-dom';
import { MetricsChart } from './Charts.tsx';

const StatusContainer = ({
    status, introduction, loading, last_updated }: { status: StatusResponse, introduction: IntroductionResponse, loading: boolean, last_updated: number }) => {
    const navigate = useNavigate();

    return <div className='card m-2 gy-2 btn btn-outline-secondary' data-bs-theme='dark' onClick={() => navigate(`/eyeball/${introduction.uuid}`)} style={{cursor: 'pointer'}}>
        <div className='card-body'>
            <div className={`row ${styles.status_row}`}>
                <div className="col-4 text-start d-flex flex-row gap-2 align-items-center">
                    {status.exited ? <ExitedIndicator loading={loading} /> : <RunningIndicator loading={loading} />}
                    <span>{introduction.user} @ {introduction.host} {introduction.ip}</span>
                </div>
                <div className="col-4 text-start">
                    <span>{introduction.name} {introduction.args}</span>
                </div>
                <div className="col-4 text-end">
                    {new Date(last_updated).toLocaleString()}
                </div>
            </div>
        </div>
    </div>
}

const MetricsContainer = ({ metrics, uuid, onAction, exited }: { metrics: MetricsResponse[], uuid: string, onAction: () => void, exited: boolean }) => {
    const time_data = metrics.map((m) => m.time);
    const cpu_data = metrics.map((m) => m.cpu);
    const memory_data = metrics.map((m) => m.memory/1e6);
    const disk_data = metrics.map((m) => m.disk/1e6);
    const has_cpu = cpu_data.length > 0 && cpu_data.some((c) => c > 0);
    const has_memory = memory_data.length > 0 && memory_data.some((m) => m > 0);
    const has_disk = disk_data.length > 0 && disk_data.some((d) => d > 0);
    const has_any = has_cpu || has_memory || has_disk;

    if (!has_any) {
        return <Actions direction='row' uuid={uuid} exited={exited} onAction={onAction} />;
    }

    return <div className='card m-2 gy-2' data-bs-theme='dark'>
        <div className='card-body d-flex flex-row gap-2'>
            <div className='col-11 d-flex flex-row gap-2'>
                {has_cpu && <MetricsChart metric={cpu_data} time={time_data} title='CPU' unit='%' color='#02d5d1' />}
                {has_memory && <MetricsChart metric={memory_data} time={time_data} title='Memory' unit=' MB' color='#00CC02' />}
                {has_disk && <MetricsChart metric={disk_data} time={time_data} title='Disk' unit=' MB' color='#006BD6' />}
            </div>
            <div className='col-1 text-center'>
                <Actions direction='column' uuid={uuid} exited={exited} onAction={onAction} />
            </div>
        </div>
    </div>
}

const MiniEyeball = ({ eyeball, onAction, refreshSpeed }: { eyeball: string, onAction: () => void, refreshSpeed: number }) => {
    const { status, metrics, loadingStatus, errorStatus, introduction, lastUpdated } = useMiniEyeball(eyeball, refreshSpeed);

    return <div className='card m-2 gy-2' data-bs-theme='dark'>
        {errorStatus && <div>Error: {errorStatus.message}</div>}
        {status && metrics && <StatusContainer introduction={introduction} status={status} loading={loadingStatus} last_updated={lastUpdated} />}
        {metrics && <MetricsContainer metrics={metrics} uuid={eyeball} onAction={onAction} exited={status?.exited} />}
    </div>
}

const MiniContainer = (
    { container, hook, refreshSpeed, inactive }:
    { container: string,
        hook: (container: string, refreshSpeed: number, inactive: boolean) => { data: any, loading: boolean, error: Error | null, reload: () => void },
        refreshSpeed: number,
        inactive: boolean
    }) => {
    const { data: eyeballs, reload, loading, error } = hook(container, refreshSpeed, inactive);

    return <div className='card m-2 gy-2' data-bs-theme='dark'>
        <div className='card-body'>
            <span className='text-center'>{container}</span>
            {loading && <FloatingLoadingIndicator classes='m-2' />}
            {error && <div>Error: {error.message}</div>}
            {eyeballs && eyeballs.map((eyeball: string) => <MiniEyeball key={eyeball} eyeball={eyeball} onAction={reload} refreshSpeed={refreshSpeed} />)}
        </div>
    </div>
}

const Index = () => {
    const { containerType, refreshSpeed, updateOptions, inactive } = useUpdateOptions();

    const hook = containerType === 'body' ? useBodies : useIPs;
 
    return <IndexInner key={containerType} hook={hook} refreshSpeed={refreshSpeed} inactive={inactive} updateOptions={updateOptions} containerType={containerType} />
}

const IndexInner = ({
    hook,
    refreshSpeed,
    inactive,
    updateOptions,
    containerType
}: {
    hook: (includeInactive?: boolean, refreshSpeed?: number) => { data: any; loading: boolean; error: Error | null; reload: () => void; },
    refreshSpeed: number,
    inactive: boolean,
    updateOptions: any,
    containerType: string
}) => {
    const { data: containers, loading, error } = hook(inactive, refreshSpeed);

    const containerHook = containerType === 'body' ? useMiniBody : useMiniIp;

    return <div>
        {updateOptions}
        {loading && <FloatingLoadingIndicator />}
        {error && <div>Error: {error.message}</div>}
        {containers.map((container: string) =>
            <MiniContainer
                key={container}
                container={container}
                hook={containerHook}
                refreshSpeed={refreshSpeed}
                inactive={inactive}
            />
        )}
    </div>
}

export default Index
