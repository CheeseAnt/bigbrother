import { LineChart } from '@mui/x-charts/LineChart';
import { useEyeballs } from '../hooks/Index.tsx';
import { useMiniEyeball } from '../hooks/MiniEyeball.tsx';
import styles from '../styles/Index.module.css';
import { MetricsResponse, StatusResponse } from '../types.tsx';
import { RunningIndicator, ExitedIndicator } from './Indicators.tsx';

const StatusContainer = ({ status, last_updated }: { status: StatusResponse, last_updated: number }) => {
    return <div className='card m-2 gy-2' data-bs-theme='dark'>
        <div className='card-body'>
            <div className={`row ${styles.status_row}`}>
                <div className="col-1">
                    {status.exited ? <ExitedIndicator /> : <RunningIndicator />}
                </div>
                <div className="col-3">
                    <span>{status.host}</span>
                </div>
                <div className="col-2">
                    <span>{status.ip}</span>
                </div>
                <div className="col-3">
                    <span>Created: {new Date(status.created_time).toLocaleString()}</span>
                </div>
            </div>
            <div className={`row ${styles.status_row}`}>
                <div className="col-2">
                    <span>{status.parent_pid}:{status.pid}</span>
                </div>
                <div className="col-4">
                    <span>{status.name} {status.args}</span>
                </div>
                <div className="col-3">
                    <span>Updated: {new Date(last_updated).toLocaleString()}</span>
                </div>
            </div>
        </div>
    </div>
}

const MetricsChart = ({ metric, time, title, unit }: { metric: number[], time: number[], title: string, unit: string }) => {
    return <div>
        <span className='text-center text-muted'>{title}</span>
        <LineChart
            height={150}
            width={300}
            sx={{
                '& .MuiChartsAxis-tickLabel': {
                    fill: 'grey'
                }
            }}
            xAxis={[{ scaleType: 'time', data: time.map((t) => new Date(t)), max: time[time.length - 1], min: time[0] }]}
            yAxis={[{ max: Math.max(...metric), min: Math.min(...metric) }]}
            series={[{ data: metric, area: true, showMark: false, valueFormatter: (v) => v ? `${v.toFixed(2)}${unit}` : null }]}
        />
    </div>
}

const MetricsContainer = ({ metrics }: { metrics: MetricsResponse[] }) => {
    const time_data = metrics.map((m) => m.time);
    const cpu_data = metrics.map((m) => m.cpu);
    const memory_data = metrics.map((m) => m.memory/1e6);
    const disk_data = metrics.map((m) => m.disk/1e6);
    const has_cpu = cpu_data.length > 0 && cpu_data.some((c) => c > 0);
    const has_memory = memory_data.length > 0 && memory_data.some((m) => m > 0);
    const has_disk = disk_data.length > 0 && disk_data.some((d) => d > 0);

    return <div className='card m-2 gy-2' data-bs-theme='dark'>
        <div className='card-body d-flex flex-row gap-2'>
            {has_cpu && <MetricsChart metric={cpu_data} time={time_data} title='CPU' unit='%' />}
            {has_memory && <MetricsChart metric={memory_data} time={time_data} title='Memory' unit=' MB' />}
            {has_disk && <MetricsChart metric={disk_data} time={time_data} title='Disk' unit=' MB' />}
        </div>
    </div>
}

const MiniEyeball = ({ eyeball }: { eyeball: string }) => {
    const { status, metrics, loading, error } = useMiniEyeball(eyeball);
    return <div className='card m-2 gy-2' data-bs-theme='dark'>
        {loading && <div>Loading...</div>}
        {error && <div>Error: {error.message}</div>}
        {status && metrics && <StatusContainer status={status} last_updated={metrics[metrics.length - 1].time} />}
        {metrics && <MetricsContainer metrics={metrics} />}
    </div>
}

const Index = () => {
    const { eyeballs, loading, error } = useEyeballs(true);

    return <div className={`${styles.container} container-fluid`} data-bs-theme='dark'>
        {loading && <div>Loading...</div>}
        {error && <div>Error: {error.message}</div>}
        {eyeballs.slice(2, 5    ).map((eyeball) => <MiniEyeball key={eyeball} eyeball={eyeball} />)}
    </div>
}

export default Index
