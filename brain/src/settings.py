import os

MONGO_URI = os.getenv("MONGO_URI")
LARGEST_METRICS_RESPONSE = int(os.getenv("LARGEST_METRICS_RESPONSE", 1000))
USER_NAME = os.getenv("BB_USER_NAME", "default")
PASSWORD = os.getenv("BB_PASSWORD", "default")
