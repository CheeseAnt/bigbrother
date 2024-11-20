import { XCircle, Circle, CircleFill } from 'react-bootstrap-icons';

const RunningIndicator = () => {
    return (
        <div>
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

const ExitedIndicator = () => {
    return <XCircle style={{ width: '1rem', height: '1rem', color: '#ff0000' }} />
};

export { RunningIndicator, ExitedIndicator };
