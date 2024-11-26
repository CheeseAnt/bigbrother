import time
import threading

def target():
 while True:
  print(f"Some logs at {time.time()}")

if __name__ == '__main__':
 threading.Thread(target=target, daemon=True).start()

 time.sleep(5)
