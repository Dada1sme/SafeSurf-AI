import os
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from database import get_db
import models, schemas
from auth import get_current_user, get_current_user_optional, authenticate_user, create_access_token
from auth import router as auth_router
from ai_model.extractor import FeatureExtractor
import joblib
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from urllib.parse import urlparse, urlunparse
import pandas as pd
from bs4 import BeautifulSoup
from fastapi.responses import JSONResponse

db = next(get_db())
models.Base.metadata.create_all(bind=db.bind)

app = FastAPI()

# CORS configuration for secure cookie/token usage
default_allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost",
    "http://127.0.0.1",
    "http://safesurf.local",
    "https://safesurf.local",
]
extra_origins = os.getenv("ALLOW_ORIGINS", "")
if extra_origins:
    default_allowed_origins.extend(
        origin.strip()
        for origin in extra_origins.split(",")
        if origin.strip()
    )
allowed_origins = list(dict.fromkeys(default_allowed_origins))

ENV = os.getenv("ENV", "development")
cookie_secure = os.getenv("COOKIE_SECURE", "False").lower() == "true" or ENV == "production"
cookie_samesite = "none" if cookie_secure else "lax"

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers should be included after middleware
app.include_router(auth_router)

# Root endpoint to verify connection
@app.get("/")
def root():
    return {"message": "SafeSurf AI backend running"}

model = joblib.load("assets/rf_model_optimized.pkl")

@app.post("/signup")
def signup(request: schemas.SignupRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter((models.User.email == request.email) |
                                    (models.User.username == request.username)).first():
        raise HTTPException(status_code=409, detail="이미 존재하는 사용자")

    try:
        hashed_pw = models.pwd_context.hash(request.password)
    except ValueError as exc:
        # bcrypt backend rejects secrets longer than 72 bytes
        raise HTTPException(status_code=400, detail="비밀번호는 72자 이하로 입력해주세요.") from exc
    user = models.User(email=request.email, username=request.username, password_hash=hashed_pw)
    db.add(user)
    db.commit()
    db.refresh(user)
    access_token = create_access_token(data={"sub": str(user.id)})
    response = JSONResponse(
        content={
            "message": "회원가입 성공",
            "user_id": str(user.id),
            "access_token": access_token,
            "token_type": "bearer"
        }
    )
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite=cookie_samesite,
        secure=cookie_secure,
        max_age=60 * 60,
        path="/"
    )
    return response

@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = (
        db.query(models.User)
        .filter(
            (models.User.username == form_data.username)
            | (models.User.email == form_data.username)
        )
        .first()
    )

    if not user or not models.pwd_context.verify(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 잘못되었습니다.")

    token = create_access_token(data={"sub": str(user.id)})

    response = JSONResponse(content={"access_token": token, "token_type": "bearer"})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite=cookie_samesite,
        secure=cookie_secure,
        max_age=60 * 60,  # 1 hour
        path="/"
    )
    return response

@app.post("/api/analyze")
def analyze_url(request: schemas.URLAnalyzeRequest, db: Session = Depends(get_db), user: Optional[models.User] = Depends(get_current_user_optional)):
    extractor = FeatureExtractor()
    features = extractor.run(request.url)
    if not features or any(f is None or f != f for f in features):
        response_data = {
            "url": request.url,
            "result": "unanalyzable",
            "prediction": None,
            "probability": None,
            "features": features
        }
        print("🚨 Response: Unanalyzable", response_data)
        return response_data

    feature_names = [
        "IP_Address", "URL_Length", "Shortening_Service", "At_Symbol_Count", "Double_Slash_Count",
        "Hyphen_Count", "Subdomain_Level", "SSL_Certificate", "External_Favicon", "Non_Standard_Port",
        "HTTPS_Token", "Domain_Age", "Request_URL_Ratio", "Blacklist", "Redirects"
    ]
    feature_vector = [[
        features[0],  # IP_Address
        features[1],  # URL_Length
        features[2],  # Shortening_Service
        features[3],  # At_Symbol_Count
        features[4],  # Double_Slash_Count
        features[5],  # Hyphen_Count
        features[6],  # Subdomain_Level
        features[7],  # SSL_Certificate
        features[8],  # External_Favicon
        features[9],  # Non_Standard_Port
        features[10], # HTTPS_Token
        features[11], # Domain_Age
        features[12], # Request_URL_Ratio
        features[13], # Blacklist
        features[14]  # Redirects
    ]]  # 리스트로 감싸서 2D로 변환

    df = pd.DataFrame(feature_vector, columns=feature_names)
    prediction = model.predict(df)[0]
    proba = model.predict_proba(df)[0]
    class_index = list(model.classes_).index(prediction)
    prob = proba[class_index]

    result_map = {-1: "phishing", 0: "suspicious", 1: "legitimate"}
    result = result_map.get(prediction, "unanalyzable")

    from datetime import datetime, timezone, timedelta

    if user:
        log = models.SearchLog(
            user_id=user.id,
            query_url=request.url,
            result=result,
            searched_at=(datetime.utcnow().replace(tzinfo=timezone.utc) + timedelta(hours=9)).strftime("%Y-%m-%d %H:%M:%S KST")
        )
        db.add(log)
        db.commit()

    print(f"✅ Prediction: {prediction}, Probability: {round(prob, 4)}, Result: {result}")

    return {
        "url": request.url,
        "result": result,
        "prediction": int(prediction),
        "probability": round(prob, 4),
        "features": features
    }

@app.get("/history")
def get_history(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    logs = (
        db.query(models.SearchLog)
        .filter(models.SearchLog.user_id == user.id)
        .order_by(models.SearchLog.searched_at.desc())
        .all()
    )

    formatted_logs = []
    for log in logs:
        # Determine site status
        status = "Online"
        try:
            import requests
            res = requests.head(log.query_url, timeout=2)
            if res.status_code >= 400:
                status = "Offline"
        except Exception:
            status = "Offline"

        # Attempt to fetch actual page title
        title = log.query_url.split("/")[2] if "//" in log.query_url else log.query_url
        try:
            res = requests.get(log.query_url, timeout=3)
            if res.status_code == 200:
                soup = BeautifulSoup(res.text, "html.parser")
                site_title = soup.title.string.strip() if soup.title else title
                title = site_title
        except Exception:
            pass

        # Tag mapping
        tag_map = {
            "legitimate": "Safe",
            "suspicious": "Suspicious",
            "phishing": "Dangerous",
            "unanalyzable": "Unanalyzable"
        }
        tag = tag_map.get(log.result, "Unanalyzable")

        # Color mapping
        status_color = "green" if status == "Online" else "red"
        tag_color = (
            "green" if tag == "Safe"
            else "yellow" if tag == "Suspicious"
            else "red" if tag == "Dangerous"
            else "gray"
        )

        formatted_logs.append({
            "id": log.id,
            "url": log.query_url,
            "title": title,
            "searched_at": log.searched_at.strftime("%Y-%m-%d %H:%M:%S") if log.searched_at else "N/A",
            "status": status,
            "status_color": status_color,
            "tag": tag,
            "tag_color": tag_color,
        })

    return formatted_logs

@app.delete("/history/{log_id}")
def delete_history(log_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    log = db.query(models.SearchLog).filter(
        models.SearchLog.id == log_id,
        models.SearchLog.user_id == user.id
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    db.delete(log)
    db.commit()
    return {"message": "Log deleted successfully"}


@app.get("/auth/me")
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email
    }

# --- Helper function to generate AI reasoning ---
def generate_reason(prediction: str, features: dict) -> str:
    """Return human-friendly explanation aligned with the final prediction."""
    risk_reasons = []
    safe_reasons = []
    localized_prediction = {
        "legitimate": "안전",
        "suspicious": "의심",
        "phishing": "위험",
    }.get(prediction, prediction)

    url_length = features.get("URL_Length")
    if isinstance(url_length, (int, float)):
        if url_length > 75:
            risk_reasons.append("URL이 비정상적으로 길고")
        elif url_length <= 54:
            safe_reasons.append("URL 길이가 정상 범위이며")

    subdomains = features.get("Subdomain_Level")
    if isinstance(subdomains, (int, float)):
        if subdomains > 3:
            risk_reasons.append("서브도메인 수가 과도하며")
        elif subdomains <= 1:
            safe_reasons.append("서브도메인 구조가 단순하고")

    ssl_ok = features.get("SSL_Certificate", True)
    if not ssl_ok:
        risk_reasons.append("SSL 인증서가 유효하지 않습니다.")
    elif ssl_ok:
        safe_reasons.append("SSL 인증서가 신뢰할 수 있습니다.")

    if features.get("Blacklist"):
        risk_reasons.append("블랙리스트에 포함되어 있습니다.")

    request_ratio = features.get("Request_URL_Ratio")
    if isinstance(request_ratio, (int, float)):
        if request_ratio > 0.8:
            risk_reasons.append("외부 리소스 요청이 과도합니다.")
        elif request_ratio >= 0 and request_ratio < 0.6:
            safe_reasons.append("외부 리소스 요청 비율이 낮고")

    domain_age = features.get("Domain_Age")
    if isinstance(domain_age, (int, float)):
        if domain_age < 6:
            risk_reasons.append("도메인 등록 기간이 짧습니다.")
        elif domain_age >= 12:
            safe_reasons.append("도메인 등록 기간이 충분합니다.")

    if prediction == "legitimate":
        reasons = safe_reasons or ["주요 URL 특성이 안전 범위 내에 있습니다."]
    else:
        reasons = risk_reasons or ["여러 URL 지표가 위험 패턴과 유사합니다."]

    return f"{' '.join(reasons)} 따라서 AI는 이 URL을 {localized_prediction}으로 분류했습니다."

# --- New /inspect endpoint ---
def _normalize_cert_names(name_entries):
    """Convert OpenSSL name entries to dict with both long and short attribute keys."""
    short_map = {
        "countryName": "C",
        "stateOrProvinceName": "ST",
        "localityName": "L",
        "organizationName": "O",
        "organizationalUnitName": "OU",
        "commonName": "CN",
    }
    normalized = {}
    for rdn in name_entries or []:
        for key, value in rdn:
            normalized[key] = value
            short_key = short_map.get(key)
            if short_key:
                normalized[short_key] = value
    return normalized


def _canonicalize_url(raw_url: str):
    """Return a tuple of (normalized_url, ParseResult) with inferred scheme."""
    trimmed = raw_url.strip()
    initial = urlparse(trimmed)
    candidates = [trimmed] if initial.scheme else [f"https://{trimmed}", f"http://{trimmed}"]

    for candidate in candidates:
        parsed = urlparse(candidate)
        if parsed.hostname:
            return candidate, parsed
    raise ValueError("Invalid URL")


def _switch_to_http(parsed):
    """Force scheme to http while preserving other components."""
    http_parsed = parsed._replace(scheme="http")
    return urlunparse(http_parsed), http_parsed


@app.get("/inspect")
def inspect_url(url: str):
    import ssl, socket, requests, json

    result = {"ssl": {}, "headers": {}, "geo": {}, "jarm": "N/A"}
    try:
        normalized_url, parsed = _canonicalize_url(url)
        hostname = parsed.hostname
        if not hostname:
            raise ValueError("Invalid URL")
        scheme = parsed.scheme or "https"
        port = parsed.port or (443 if scheme == "https" else 80)
        target_url = normalized_url

        # SSL Info
        http_fallback_requested = False
        try:
            if scheme == "https" or port == 443:
                ctx = ssl.create_default_context()
                conn = ctx.wrap_socket(socket.socket(), server_hostname=hostname)
                conn.settimeout(3)
                conn.connect((hostname, port))
                cert = conn.getpeercert()
                result["ssl"] = {
                    "issuer": _normalize_cert_names(cert.get("issuer")),
                    "subject": _normalize_cert_names(cert.get("subject")),
                    "notBefore": cert.get("notBefore"),
                    "notAfter": cert.get("notAfter"),
                }
                conn.close()
            else:
                result["ssl"] = {"info": "HTTPS를 사용하지 않는 URL입니다."}
        except Exception as e:
            result["ssl"] = {"error": str(e)}
            if scheme == "https":
                http_fallback_requested = True

        def maybe_switch_to_http():
            nonlocal parsed, target_url, scheme, port, http_fallback_requested
            if scheme != "https":
                return
            target_url, parsed = _switch_to_http(parsed)
            scheme = "http"
            port = parsed.port or 80
            http_fallback_requested = False

        if http_fallback_requested:
            maybe_switch_to_http()

        # HTTP Headers
        try:
            res = requests.head(target_url, timeout=5, allow_redirects=True)
            result["headers"] = dict(res.headers)
        except Exception as e:
            if scheme == "https":
                maybe_switch_to_http()
                try:
                    res = requests.head(target_url, timeout=5, allow_redirects=True)
                    result["headers"] = dict(res.headers)
                except Exception as inner_e:
                    result["headers"] = {"error": str(inner_e)}
            else:
                result["headers"] = {"error": str(e)}

        # Geo info
        try:
            ip = socket.gethostbyname(hostname)
            geo_res = requests.get(f"http://ip-api.com/json/{ip}", timeout=5)
            result["geo"] = geo_res.json()
        except Exception as e:
            result["geo"] = {"error": str(e)}

        # Extract features and predict for AI reasoning
        extractor = FeatureExtractor()
        features_list = extractor.run(url)
        feature_names = [
            "IP_Address", "URL_Length", "Shortening_Service", "At_Symbol_Count", "Double_Slash_Count",
            "Hyphen_Count", "Subdomain_Level", "SSL_Certificate", "External_Favicon", "Non_Standard_Port",
            "HTTPS_Token", "Domain_Age", "Request_URL_Ratio", "Blacklist", "Redirects"
        ]
        if features_list and len(features_list) == len(feature_names):
            features_dict = dict(zip(feature_names, features_list))
            # Predict using the model
            import pandas as pd
            df = pd.DataFrame([features_list], columns=feature_names)
            prediction = model.predict(df)[0]
            result_map = {-1: "phishing", 0: "suspicious", 1: "legitimate"}
            result_prediction = result_map.get(prediction, "unanalyzable")
            ai_reason = generate_reason(result_prediction, features_dict)
        else:
            ai_reason = "AI 분석에 필요한 URL 특성 정보를 추출할 수 없습니다."

    except Exception as e:
        return {"error": str(e)}

    result["ai_reason"] = ai_reason
    return result
