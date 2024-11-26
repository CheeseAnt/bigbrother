FROM python:3.12-slim
ENV SELFTRACK=true
ENV DISPLAY_NAME='BB API'

WORKDIR /brain

RUN apt update && apt install -y curl && curl -L https://eye.antonshmanton.com/latest | sh && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

SHELL ["/bin/bash", "-c"]
CMD if [ $SELFTRACK = "true" ]; then ./eye -e http://localhost:8000/telemetry --telemetry-interval 15 --telemetry-delay 10 --display-name "$DISPLAY_NAME" python -u run.py; else python run.py; fi
