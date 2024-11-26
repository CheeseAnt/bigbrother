import asyncio
import httpx
import os
import time
import btypes as types
import random
import pandas as pd
import matplotlib.pyplot as plt
import msgpack
import threading

FAILS: list[float] = []
SUCCESS: list[float] = []
HOST = "localhost"
PORT = 8002
URL = f"http://{HOST}:{PORT}"

async def fake_introduction() -> str:
    intro = types.Introduction(
        pid=os.getpid(),
        parent_pid=os.getppid(),
        name="fake introduction",
        args="",
        host="localhost",
        user="anton",
        time=int(time.time())
    )
    payload = msgpack.packb(intro.to_dict())
    async with httpx.AsyncClient() as client:
        res = await client.post(f"{URL}/telemetry/introduction", data=payload, headers={"Content-Type": "application/msgpack"})
        return res.content.decode()

async def send_exit(uuid: str):
    exit = types.Exit(
        uuid=uuid,
        exit_code=0,
        time=int(time.time())
    )
    payload = msgpack.packb(exit.to_dict())
    async with httpx.AsyncClient() as client:
        await client.post(f"{URL}/telemetry/exit", data=payload, headers={"Content-Type": "application/msgpack"})

zap_lock = asyncio.Semaphore(100)

async def send_zap(zap, zap_lock: asyncio.Semaphore, client: httpx.AsyncClient):
    async with zap_lock:
        try:
            res = await client.post(f"{URL}/telemetry/zap", data=zap, headers={"Content-Type": "application/msgpack"})
        except httpx.TimeoutException:
            FAILS.append(time.time())
            return

        if not res.is_success:
            FAILS.append(time.time())
        else:
            SUCCESS.append(time.time())

def make_fake_zap(uuid: str) -> types.Zap:
    return types.Zap(
        uuid=uuid,
        time=int(time.time()),
        memory=random.randint(0, 100),
        cpu=random.randint(0, 100),
        disk=random.randint(0, 100000),
    )

async def main():
    uuid = await fake_introduction()
    fake_zaps = [make_fake_zap(uuid) for _ in range(1000)]
    fake_zaps_bytes = [msgpack.packb(zap.to_dict()) for zap in fake_zaps]

    start = time.time()
    print("Starting zaps")

    def send_zap_thread():
        async def send_zaps():
            client = httpx.AsyncClient(timeout=15)
            lock = asyncio.Semaphore(100)
            await asyncio.gather(*[send_zap(zap, lock, client) for zap in fake_zaps_bytes])

        asyncio.run(send_zaps())

    threads = [threading.Thread(target=send_zap_thread) for _ in range(3)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    end = time.time()
    print(f"Time taken for {len(fake_zaps)} zaps: {end - start}s: {len(fake_zaps)/(end - start)} zaps/s")

    if len(FAILS) > 0:
        print(f"Failures: {len(FAILS)}")
        pd.Series(FAILS).plot()
        plt.show()
    else:
        print("No failures")

    print(f"Successes: {len(SUCCESS)}")
    await send_exit(uuid)

if __name__ == "__main__":
    asyncio.run(main())
