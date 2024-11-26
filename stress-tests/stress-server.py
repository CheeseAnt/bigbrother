import sanic
import sanic.response
import uvicorn
import time
import sys

app = sanic.Sanic("StressServer")

class StressRecords:
    def __init__(self):
        self.records = {}

    def add(self, name: str, value: int):
        if name not in self.records:
            self.records[name] = []
        self.records[name].append(value)

    def calculate_average(self, name: str) -> float:
        records = self.records[name]
        diffs = [records[i] - records[i - 1] for i in range(1, len(records))]

        if len(diffs) == 0:
            return 0

        return sum(diffs) / len(diffs)

    def print_all(self):
        for name in ['zap']:
            avg_interval = self.calculate_average(name)
            print(f"Average reporting interval for {name}: {avg_interval}s", file=sys.stderr)
            print(f"Theoretical max throughput for {name}: {1 / avg_interval} requests/s", file=sys.stderr)
        self.records.clear()

stress_records = StressRecords()

@app.route("/<name>", methods=["POST", "GET", "PUT"])
async def anything(request: sanic.Request, name: str):
    stress_records.add(name, int(time.time()))

    if "print" in name:
        print(f"Results for {request.body.decode()}", file=sys.stderr)
        stress_records.print_all()

    return sanic.response.HTTPResponse(status=204)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="error")
