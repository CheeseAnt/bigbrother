import { XCircle, Circle, CircleFill } from 'react-bootstrap-icons';

const RunningIndicator = ({ loading }: { loading: boolean }) => {
    return (
        <div style={{ width: '1rem', height: '1rem' }}>
            {loading && <LoadingIndicator className='indicator-loading' />}
            <Circle className="indicator" />
            <CircleFill
                className="indicator"
                style={{
                    animation: 'pulse 2s ease-in-out infinite'
                }}
            />
        </div>
    );
};

const ExitedIndicator = ({ loading }: { loading: boolean }) => {
    return <div style={{ width: '1rem', height: '1rem' }}>
        {loading && <LoadingIndicator className='indicator-loading' />}
        <XCircle className='indicator' style={{ color: '#ff0000' }} />
    </div>
};

const LoadingIndicator = ({ className }: { className?: string }) => {
    return <div className={`spinner-border ${className}`} style={{ zIndex: 1000 }} role='status'>
    </div>
}

const FloatingLoadingIndicator = ({ classes }: { classes?: string }) => {
    const classNames = classes ? classes : 'm-3';
    return <div className={`position-absolute top-0 end-0 ${classNames}`}>
        <LoadingIndicator />
    </div>
}

export { RunningIndicator, ExitedIndicator, FloatingLoadingIndicator };
