from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.auth import UserCreate, UserLogin, UserOut, AccessTokenResponse
from app.services import auth_service
from app.api.deps import get_current_user
from app.models.user import User
from app.core.config import settings
router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/api/v1/auth"


def _set_refresh_cookie(response: Response, raw_refresh: str, expires_at) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=raw_refresh,
        httponly=True,
        secure=settings.ENVIRONMENT != "development",
        samesite="lax",
        path=REFRESH_COOKIE_PATH,
        expires=int(expires_at.timestamp()),
    )


@router.post("/register", response_model=AccessTokenResponse, status_code=201)
def register(payload: UserCreate, response: Response, db: Session = Depends(get_db)):
    try:
        user = auth_service.register_user(db, payload.email, payload.password, payload.full_name)
        access_token, raw_refresh, expires_at = auth_service.issue_tokens(db, user)
    except auth_service.AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

    _set_refresh_cookie(response, raw_refresh, expires_at)
    return AccessTokenResponse(access_token=access_token, user=UserOut.model_validate(user))


@router.post("/login", response_model=AccessTokenResponse)
def login(payload: UserLogin, response: Response, db: Session = Depends(get_db)):
    try:
        user = auth_service.authenticate_user(db, payload.email, payload.password)
        access_token, raw_refresh, expires_at = auth_service.issue_tokens(db, user)
    except auth_service.AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

    _set_refresh_cookie(response, raw_refresh, expires_at)
    return AccessTokenResponse(access_token=access_token, user=UserOut.model_validate(user))


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    raw_refresh = request.cookies.get(REFRESH_COOKIE_NAME)
    if not raw_refresh:
        raise HTTPException(status_code=401, detail="No active session")

    try:
        user, access_token, new_raw_refresh, expires_at = auth_service.rotate_refresh_token(db, raw_refresh)
    except auth_service.AuthError as e:
        response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)
        raise HTTPException(status_code=e.status_code, detail=e.message)

    _set_refresh_cookie(response, new_raw_refresh, expires_at)
    return AccessTokenResponse(access_token=access_token, user=UserOut.model_validate(user))


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    raw_refresh = request.cookies.get(REFRESH_COOKIE_NAME)
    if raw_refresh:
        auth_service.revoke_refresh_token(db, raw_refresh)
    response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user