import { LineChart, axisClasses } from '@mui/x-charts';

export const MetricsChart = ({
    metric,
    time,
    title,
    unit,
    color,
    height = '20vh'
}: {
    metric: number[],
    time: number[],
    title: string,
    unit: string,
    color: string,
    height?: string
}) => {
    return <div className="w-100" style={{ height }}>
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