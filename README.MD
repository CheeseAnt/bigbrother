# BigBrother

A distributed process monitoring system that allows you to track and manage processes across multiple machines.

## Overview

BigBrother consists of three main components:

1. **Eye** - A Rust-based process wrapper that monitors and reports telemetry
2. **Brain** - A Python backend server that collects and stores telemetry data
3. **Face** - A React+TypeScript frontend for visualizing and managing monitored processes

## Quick Start

Install the Eye process monitor:

```
curl https://raw.githubusercontent.com/CheeseAnt/bigbrother/refs/heads/master/eye/get_latest_release.sh | sh
```

## Throughput Testing
Results from the eye monitor:

| Workload | Base (no features) | Metrics | Disk Monitor | Logs | Metrics + Disk | Metrics + Logs | Metrics + Disk + Logs |
|----------|-------------------|---------|--------------|------|----------------|----------------|---------------------|
| Low      | 162 Hz      | 162 Hz | 160 Hz | 136 Hz | 160 Hz | 141 Hz | 138 Hz |
| High     | 162 Hz      | 40 Hz  | N/A         | N/A        | 40 Hz   | N/A          | N/A               |

Results from the brain server:


## Components

### Eye

The Eye component is a Rust binary that wraps any process and monitors its:

- CPU usage
- Memory usage
- Disk usage (optional)
- stdout/stderr output
- Process lifecycle events

Key features:
- Automatic process restarts on failure
- Configurable metrics collection interval
- Local log file output
- Remote telemetry reporting

Example usage:

```
bb_eye -e http://localhost:8000/telemetry -i 5 python script.py
```

### Brain

The Brain is a Sanic-based Python server that:

- Collects telemetry from Eye instances
- Stores data in MongoDB
- Provides REST API for the Face UI

Key endpoints:

Telemetry:
- `POST /telemetry/zap` - Record telemetry data from Eye instances
- `POST /telemetry/introduction` - Record process introduction
- `POST /telemetry/exit` - Record process exit

UI Listings:
- `GET /ui/eyeballs` - List all eyeballs (processes)
- `GET /ui/eyeballs/{body}` - List eyeballs by executable name
- `GET /ui/eyeballs/ip/{ip}` - List eyeballs by IP address
- `GET /ui/bodies` - List all executable names
- `GET /ui/ips` - List all IP addresses

UI Process Details:
- `GET /ui/introduction/{uuid}` - Get process introduction details
- `GET /ui/status/{uuid}` - Get process status
- `GET /ui/exit/{uuid}` - Get process exit details
- `GET /ui/messages/{uuid}` - Get process messages/logs
- `GET /ui/metrics/{uuid}` - Get process metrics history
- `PUT /ui/action/{uuid}/{action}` - Perform action on process
- `DELETE /ui/delete/{uuid}` - Delete process


```
Process -> Eye -> Brain -> Face
```

### Configuration

Eye supports various command line arguments for customization:

```
Usage: bb_eye-aarch64-apple-darwin [OPTIONS] <COMMAND>...

Arguments:
  <COMMAND>...  Command to run

Options:
  -r, --restart
          Restart the command if it exits
  -m, --max-restarts <MAX_RESTARTS>
          Maximum number of restarts [default: 5]
  -n, --no-output
          Do not print output
  -j, --no-metrics
          Do not track metrics
  -c, --no-remote-logs
          Do not send logs to remote server
  -d, --data-folder <DATA_FOLDER>
          Track data folder size
  -e, --telemetry-endpoint <TELEMETRY_ENDPOINT>
          Telemetry endpoint
  -i, --telemetry-interval <TELEMETRY_INTERVAL>
          Telemetry Interval [default: 1]
  -b, --log-buffer-size <LOG_BUFFER_SIZE>
          Telemetry log buffer size [default: 50]
  -z, --error-log-buffer-size <ERROR_LOG_BUFFER_SIZE>
          Telemetry error log buffer size [default: 25]
  -v, --verbose
          Verbose output
  -x, --prevent-telemetry
          Prevent telemetry
  -l, --log-to-file <LOG_TO_FILE>
          Log to file
  -t, --telemetry-delay <TELEMETRY_DELAY>
          Delay telemetry signals for x seconds [default: 0]
  -h, --help
          Print help
  -V, --version
          Print version
```

### Face

The Face component is a React+TypeScript web UI that provides:

- Real-time process metrics visualization
- Process logs viewing
- Process management controls (restart/stop)
- Filtering and grouping of processes

## Development

### Prerequisites

- Rust toolchain
- Python 3.10+
- Node.js 20+
- MongoDB

### Building

Eye:
```
cd eye
cargo build --release
```

Brain:
```
cd brain
pip install -r requirements.txt
python run.py
```

Face:
```
cd face
npm install
npm run dev
```

### Architecture

The system uses a distributed architecture where:

1. Eye instances run on target machines, wrapping and monitoring processes
2. Each Eye reports telemetry to a central Brain server
3. The Brain stores telemetry data and provides an API
4. The Face UI consumes the Brain API to visualize data

Data flow:

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License

## Support

For issues and questions, please open a GitHub issue.
