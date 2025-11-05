import os
from dotenv import load_dotenv
load_dotenv()

from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import HTTPException, Depends, Request
from fastapi.security import OAuth2PasswordBearer
from models import User, pwd_context
from database import SessionLocal

from fastapi import APIRouter
from fastapi.responses import RedirectResponse
import requests
from urllib.parse import urlencode
import logging
import secrets

SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
ENV = os.getenv("ENV", "development")
COOKIE_SECURE_FLAG = os.getenv("COOKIE_SECURE", "False").lower() == "true"
COOKIE_SECURE = COOKIE_SECURE_FLAG or ENV == "production"
COOKIE_SAMESITE = "none" if COOKIE_SECURE else "lax"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")

def create_access_token(data: dict, expires_delta=None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def get_user(db, username):
    return db.query(User).filter(User.username == username).first()

def authenticate_user(db, username, password):
    user = get_user(db, username)
    if not user or not verify_password(password, user.password_hash):
        return None
    return user

def get_current_user(request: Request, db=Depends(lambda: SessionLocal())):
    # Try cookie first
    token = request.cookies.get("access_token")
    if token:
        logging.debug("Token retrieved from cookie")
    else:
        # Fallback to Authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[len("Bearer "):]
            logging.debug("Token retrieved from Authorization header")
        else:
            logging.debug("No token found in cookie or Authorization header")
            raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        exp = payload.get("exp")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        # optional: check expiry explicitly
        if exp is not None and datetime.utcfromtimestamp(exp) < datetime.utcnow():
            raise HTTPException(status_code=401, detail="Token has expired")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalid or expired")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def get_current_user_optional(request: Request, db=Depends(lambda: SessionLocal())):
    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[len("Bearer "):]
    else:
        token = request.cookies.get("access_token")
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
        return db.query(User).filter(User.id == user_id).first()
    except JWTError:
        return None

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = "http://localhost:8000/auth/google/callback"

NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")
NAVER_REDIRECT_URI = os.getenv("NAVER_REDIRECT_URI", "http://localhost:8000/auth/naver/callback")
NAVER_STATE_COOKIE = "naver_oauth_state"
KAKAO_CLIENT_ID = os.getenv("KAKAO_CLIENT_ID")
KAKAO_CLIENT_SECRET = os.getenv("KAKAO_CLIENT_SECRET")
KAKAO_REDIRECT_URI = os.getenv("KAKAO_REDIRECT_URI", "http://localhost:8000/auth/kakao/callback")
KAKAO_SCOPE = os.getenv("KAKAO_SCOPE", "profile_nickname")
KAKAO_STATE_COOKIE = "kakao_oauth_state"

@router.get("/google/login")
def google_login():
    auth_endpoint = "https://accounts.google.com/o/oauth2/v2/auth"
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent"
    }
    url = f"{auth_endpoint}?{urlencode(params)}"
    return RedirectResponse(url)

@router.get("/google/callback")
def google_callback(code: str, db=Depends(lambda: SessionLocal())):
    token_endpoint = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code"
    }

    token_res = requests.post(token_endpoint, data=data)
    token_res.raise_for_status()
    token_json = token_res.json()

    google_access = token_json.get("access_token")
    if not google_access:
        raise HTTPException(status_code=400, detail="Failed to retrieve Google access token")

    user_info = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {google_access}"}
    ).json()

    email = user_info.get("email")
    username = user_info.get("name") or email.split("@")[0]

    user = db.query(User).filter(User.email == email).first()
    if not user:
        # create with required fields; placeholder password hash
        user = User(email=email, username=username, password_hash="google-oauth")
        db.add(user)
        db.commit()
        db.refresh(user)

    # create JWT with explicit expiry
    expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    jwt_token = create_access_token({"sub": str(user.id)}, expires_delta=expires)

    from fastapi.responses import HTMLResponse

    html_content = f"""
    <html>
      <body>
        <script>
          if (window.opener && !window.opener.closed) {{
            window.opener.postMessage({{ type: 'OAUTH_SUCCESS' }}, '*');
            window.close();
          }} else {{
            window.location.href = 'http://localhost:3000/';
          }}
        </script>
        <p>로그인 완료! 창을 닫아주세요.</p>
      </body>
    </html>
    """

    response = HTMLResponse(content=html_content)
    response.set_cookie(
        key="access_token",
        value=jwt_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=int(expires.total_seconds()),
        path="/"
    )
    return response


@router.get("/naver/login")
def naver_login():
    if not NAVER_CLIENT_ID or not NAVER_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Naver OAuth is not configured.")

    state = secrets.token_urlsafe(16)
    params = {
        "response_type": "code",
        "client_id": NAVER_CLIENT_ID,
        "redirect_uri": NAVER_REDIRECT_URI,
        "state": state,
    }
    auth_url = f"https://nid.naver.com/oauth2.0/authorize?{urlencode(params)}"

    response = RedirectResponse(auth_url)
    response.set_cookie(
        key=NAVER_STATE_COOKIE,
        value=state,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=300,
        path="/",
    )
    return response


@router.get("/naver/callback")
def naver_callback(code: str, state: str, request: Request, db=Depends(lambda: SessionLocal())):
    if not NAVER_CLIENT_ID or not NAVER_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Naver OAuth is not configured.")

    stored_state = request.cookies.get(NAVER_STATE_COOKIE)
    if not stored_state or stored_state != state:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    token_endpoint = "https://nid.naver.com/oauth2.0/token"
    token_payload = {
        "grant_type": "authorization_code",
        "client_id": NAVER_CLIENT_ID,
        "client_secret": NAVER_CLIENT_SECRET,
        "code": code,
        "state": state,
    }

    token_res = requests.post(token_endpoint, data=token_payload)
    token_res.raise_for_status()
    token_json = token_res.json()
    access_token = token_json.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="Failed to retrieve Naver access token")

    profile_res = requests.get(
        "https://openapi.naver.com/v1/nid/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    profile_res.raise_for_status()
    profile_json = profile_res.json()
    profile = profile_json.get("response", {})

    naver_id = profile.get("id")
    email = profile.get("email")
    nickname = profile.get("nickname") or profile.get("name")

    if not email:
        if not naver_id:
            raise HTTPException(status_code=400, detail="Naver profile is missing email and id")
        email = f"{naver_id}@naver.com"
    username = nickname or email.split("@")[0]

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, username=username, password_hash="naver-oauth")
        db.add(user)
        db.commit()
        db.refresh(user)

    expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    jwt_token = create_access_token({"sub": str(user.id)}, expires_delta=expires)

    from fastapi.responses import HTMLResponse

    html_content = """
    <html>
      <body>
        <script>
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type: 'OAUTH_SUCCESS' }, '*');
            window.close();
          } else {
            window.location.href = 'http://localhost:3000/';
          }
        </script>
        <p>로그인 완료! 창을 닫아주세요.</p>
      </body>
    </html>
    """

    response = HTMLResponse(content=html_content)
    response.set_cookie(
        key="access_token",
        value=jwt_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=int(expires.total_seconds()),
        path="/"
    )
    response.delete_cookie(
        key=NAVER_STATE_COOKIE,
        path="/",
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
    )
    return response


@router.get("/kakao/login")
def kakao_login():
    if not KAKAO_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Kakao OAuth is not configured.")

    state = secrets.token_urlsafe(16)
    scope_param = " ".join(part.strip() for part in KAKAO_SCOPE.split(",") if part.strip())
    params = {
        "response_type": "code",
        "client_id": KAKAO_CLIENT_ID,
        "redirect_uri": KAKAO_REDIRECT_URI,
        "state": state,
    }
    if scope_param:
        params["scope"] = scope_param

    auth_url = f"https://kauth.kakao.com/oauth/authorize?{urlencode(params)}"
    response = RedirectResponse(auth_url)
    response.set_cookie(
        key=KAKAO_STATE_COOKIE,
        value=state,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=300,
        path="/",
    )
    return response


@router.get("/kakao/callback")
def kakao_callback(code: str, state: str, request: Request, db=Depends(lambda: SessionLocal())):
    if not KAKAO_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Kakao OAuth is not configured.")

    stored_state = request.cookies.get(KAKAO_STATE_COOKIE)
    if not stored_state or stored_state != state:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    token_endpoint = "https://kauth.kakao.com/oauth/token"
    token_payload = {
        "grant_type": "authorization_code",
        "client_id": KAKAO_CLIENT_ID,
        "redirect_uri": KAKAO_REDIRECT_URI,
        "code": code,
    }
    if KAKAO_CLIENT_SECRET:
        token_payload["client_secret"] = KAKAO_CLIENT_SECRET

    token_res = requests.post(token_endpoint, data=token_payload)
    token_res.raise_for_status()
    token_json = token_res.json()
    access_token = token_json.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="Failed to retrieve Kakao access token")

    profile_res = requests.get(
        "https://kapi.kakao.com/v2/user/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    profile_res.raise_for_status()
    profile_json = profile_res.json()

    kakao_id = profile_json.get("id")
    account = profile_json.get("kakao_account", {}) or {}
    profile = account.get("profile", {}) or {}
    email = account.get("email")
    nickname = profile.get("nickname") or account.get("name")

    if not email:
        if kakao_id is None:
            raise HTTPException(status_code=400, detail="Kakao profile is missing email and id")
        email = f"{kakao_id}@kakao.com"
    username = nickname or email.split("@")[0]

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, username=username, password_hash="kakao-oauth")
        db.add(user)
        db.commit()
        db.refresh(user)

    expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    jwt_token = create_access_token({"sub": str(user.id)}, expires_delta=expires)

    from fastapi.responses import HTMLResponse

    html_content = """
    <html>
      <body>
        <script>
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type: 'OAUTH_SUCCESS' }, '*');
            window.close();
          } else {
            window.location.href = 'http://localhost:3000/';
          }
        </script>
        <p>로그인 완료! 창을 닫아주세요.</p>
      </body>
    </html>
    """

    response = HTMLResponse(content=html_content)
    response.set_cookie(
        key="access_token",
        value=jwt_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=int(expires.total_seconds()),
        path="/"
    )
    response.delete_cookie(
        key=KAKAO_STATE_COOKIE,
        path="/",
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
    )
    return response

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"username": current_user.username, "email": current_user.email}

from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Response
from fastapi.responses import JSONResponse

@router.post("/token")
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(lambda: SessionLocal())
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )

    response = JSONResponse(content={"message": "Login successful"})
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
        max_age=int(access_token_expires.total_seconds()),
        path="/"
    )
    return response

@router.post("/logout")
def logout(response: Response):
    """
    로그아웃 엔드포인트
    - 쿠키에 저장된 access_token 삭제
    """
    response.delete_cookie(
        "access_token",
        path="/",
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
    )
    return {"message": "Logged out successfully"}
