import { LineChart } from '@mui/x-charts/LineChart';
import { axisClasses } from '@mui/x-charts/ChartsAxis';
import { useBodies, useIPs } from '../hooks/Index.tsx';
import { useMiniBody, useMiniEyeball, useMiniIp } from '../hooks/Mini.tsx';
import styles from '../styles/Index.module.css';
import { MetricsResponse, StatusResponse, IntroductionResponse } from '../types.tsx';
import { RunningIndicator, ExitedIndicator, FloatingLoadingIndicator } from './Indicators.tsx';
import Actions from './Actions.tsx';
import useUpdateOptions from './UpdateOptions.tsx';

const StatusContainer = ({ status, introduction, loading, last_updated }: { status: StatusResponse, introduction: IntroductionResponse, loading: boolean, last_updated: number }) => {
    return <div className='card m-2 gy-2' data-bs-theme='dark'>
        <div className='card-body'>
            <div className={`row ${styles.status_row}`}>
                <div className="col-4 text-start d-flex flex-row gap-2 align-items-center">
                    {status.exited ? <ExitedIndicator loading={loading} /> : <RunningIndicator loading={loading} />}
                    <span>{introduction.host}</span>
                    <span>{introduction.ip}</span>
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

const MetricsChart = ({ metric, time, title, unit, color }: { metric: number[], time: number[], title: string, unit: string, color: string }) => {
    return <div className="w-100" style={{ height: '20vh' }}>
        <LineChart
            sx={{
                padding: '8px',
                [`.${axisClasses.root}`]: {
                    [`.${axisClasses.tick}, .${axisClasses.line}`]: {
                        stroke: '#808080',
                        strokeWidth: 1,
                    },
                    [`.${axisClasses.tickLabel}`]: {
                        fill: '#808080',
                    },
                    [`.${axisClasses.label}`]: {
                        fill: '#808080',
                    },
                },
            }}
            xAxis={[{ scaleType: 'time', data: time.map((t) => new Date(t)), max: time[time.length - 1], min: time[0] }]}
            yAxis={[{ max: Math.max(...metric), min: Math.min(...metric), valueFormatter: (v) => `${v.toFixed(2)}${unit}` }]}
            slotProps={{ legend: { position: { vertical: 'top', horizontal: 'left' }, labelStyle: { fill: '#808080' } } }}
            series={[{
                data: metric,
                area: true,
                showMark: false,
                label: title,
                valueFormatter: (v) => v ? `${v.toFixed(2)}${unit}` : null,
                color: color
            }]}
        />
    </div>
}

const MetricsContainer = ({ metrics, uuid, onAction }: { metrics: MetricsResponse[], uuid: string, onAction: () => void }) => {
    const time_data = metrics.map((m) => m.time);
    const cpu_data = metrics.map((m) => m.cpu);
    const memory_data = metrics.map((m) => m.memory/1e6);
    const disk_data = metrics.map((m) => m.disk/1e6);
    const has_cpu = cpu_data.length > 0 && cpu_data.some((c) => c > 0);
    const has_memory = memory_data.length > 0 && memory_data.some((m) => m > 0);
    const has_disk = disk_data.length > 0 && disk_data.some((d) => d > 0);
    const has_any = has_cpu || has_memory || has_disk;

    if (!has_any) {
        return <Actions direction='row' uuid={uuid} onAction={onAction} />;
    }

    return <div className='card m-2 gy-2' data-bs-theme='dark'>
        <div className='card-body d-flex flex-row gap-2'>
            <div className='col-11 d-flex flex-row gap-2'>
                {has_cpu && <MetricsChart metric={cpu_data} time={time_data} title='CPU' unit='%' color='#02d5d1' />}
                {has_memory && <MetricsChart metric={memory_data} time={time_data} title='Memory' unit=' MB' color='#00CC02' />}
                {has_disk && <MetricsChart metric={disk_data} time={time_data} title='Disk' unit=' MB' color='#006BD6' />}
            </div>
            <div className='col-1 text-center'>
                <Actions direction='column' uuid={uuid} onAction={onAction} />
            </div>
        </div>
    </div>
}

const MiniEyeball = ({ eyeball, onAction, refreshSpeed }: { eyeball: string, onAction: () => void, refreshSpeed: number }) => {
    const { statusAndMetrics: { status, metrics }, loadingStatus, errorStatus, introduction } = useMiniEyeball(eyeball, refreshSpeed);

    return <div className='card m-2 gy-2' data-bs-theme='dark'>
        {errorStatus && <div>Error: {errorStatus.message}</div>}
        {status && metrics && <StatusContainer introduction={introduction} status={status} loading={loadingStatus} last_updated={metrics[metrics.length - 1]?.time} />}
        {metrics && <MetricsContainer metrics={metrics} uuid={eyeball} onAction={onAction} />}
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

    return <div className={`${styles.container} container-fluid`} data-bs-theme='dark'>
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
