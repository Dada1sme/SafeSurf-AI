# backend/Dockerfile

FROM python:3.10-slim

WORKDIR /app

# 필수 시스템 라이브러리 설치
RUN apt-get update && apt-get install -y \
    build-essential \
    libssl-dev \
    default-libmysqlclient-dev \
    curl \
    iputils-ping \
    dnsutils \
    whois \
    && rm -rf /var/lib/apt/lists/*

# 먼저 requirements.txt 복사 → 패키지 설치
COPY requirements.txt .

RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# 나머지 코드 복사
COPY . .
COPY ./assets ./assets/

# 앱 실행
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]