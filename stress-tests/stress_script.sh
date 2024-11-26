eye -i 0.0001 -e http://localhost:8001 python sleep_script.py
curl localhost:8001/print -d "no workload with metrics"

eye -i 0.0001 -e http://localhost:8001 python print_script.py
curl localhost:8001/print -d "no workload with metrics and logs"

eye -i 0.0001 -e http://localhost:8001 -d . python sleep_script.py
curl localhost:8001/print -d "no workload with metrics and current dir monitor"

eye -i 0.0001 -e http://localhost:8001 -j -d . python sleep_script.py
curl localhost:8001/print -d "no workload without metrics and with current dir monitor"

eye -i 0.0001 -e http://localhost:8001 -d . python print_script.py
curl localhost:8001/print -d "no workload with metrics and current dir monitor and logs"

eye -i 0.0001 -e http://localhost:8001 -j python sleep_script.py
curl localhost:8001/print -d "no workload without metrics or disk"

eye -i 0.0001 -e http://localhost:8001 -j python print_script.py
curl localhost:8001/print -d "no workload without metrics but with logs"

eye -i 0.0001 -e http://localhost:8001 -j -c python print_script.py
curl localhost:8001/print -d "no workload without metrics, workload prints logs but does not send"


eye -i 0.0001 -e http://localhost:8001 python cpu_script.py
curl localhost:8001/print -d "high workload with metrics"

eye -i 0.0001 -e http://localhost:8001 -d . python cpu_script.py
curl localhost:8001/print -d "high workload with metrics and current dir monitor"

eye -i 0.0001 -e http://localhost:8001 -j python sleep_script.py
curl localhost:8001/print -d "high workload without metrics or disk"

