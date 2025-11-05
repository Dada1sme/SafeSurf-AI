# SafeSurf AI

SafeSurf AI는 피싱 웹사이트를 탐지하고 안전한 웹 서핑을 돕는 Full-stack 애플리케이션입니다.  
FastAPI 백엔드와 React 프런트엔드, PostgreSQL, Nginx 리버스 프록시, Docker Compose로 구성되어 있습니다.

---

## 주요 기능

- **URL 분석**: 사전에 학습된 랜덤 포레스트 모델(`assets/rf_model_optimized.pkl`)로 피싱 확률을 예측합니다.
- **로그인/회원가입**: 이메일 계정 로그인 및 Google, Naver, Kakao OAuth 연동.
- **검색 기록 관리**: 사용자별 URL 분석 이력 조회/삭제.
- **리버스 프록시**: Nginx를 통해 프런트와 백엔드를 통합 제공.

---

## 폴더 구조

```
SafeSurf_AI/
├── backend/          # FastAPI 백엔드
├── frontend/         # React 프런트엔드
├── nginx/            # Nginx 리버스 프록시 s설정
├── assets/           # ML 모델 등 공용 자산
├── docker-compose.yaml
├── .env.example
└── README.md
```

---

## 사전 준비

- Docker & Docker Compose
- Python 3.12+ (로컬 개발용 가상환경 선택 사항)
- Node.js 18+ (프런트 로컬 개발 중 선택 사항)

---

## 환경 변수 설정

1. 템플릿을 복사해 `.env` 파일을 만듭니다.
   ```bash
   cp .env.example .env
   ```
2. 다음 값을 채워넣습니다.
   - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
   - `SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`
   - OAuth 정보: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`
   - 필요 시 리디렉션 URI(`NAVER_REDIRECT_URI`, `KAKAO_REDIRECT_URI`)와 `COOKIE_SECURE` 등을 조정할 수 있습니다.


---

### 백엔드
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 프런트엔드
```bash
cd frontend
npm install
npm start
```

환경변수는 `.env`에서 관리하거나 `.env.local` 등을 활용하세요.

---

## 추가 참고

- 아이콘: `frontend/public/favicon.ico`, `frontend/public/safesurf-icon.svg`
- 로고: `frontend/src/assets/`



