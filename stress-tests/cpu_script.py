import time
from multiprocessing import Process
import os

def target():
	import numpy as np
	while True:
		res = np.random.random((1000, 1000))*np.random.random((1000,1000))

if __name__ == '__main__':
	for _ in range(os.cpu_count()):
		Process(target=target, daemon=True).start()

	time.sleep(5)
	exit()

