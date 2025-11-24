from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import HTTPException, status
import bcrypt

from app.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    # Генерируем соль и хешируем пароль
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # JWT exp должен быть в формате timestamp (число секунд с 1970-01-01)
    # jose автоматически конвертирует datetime в timestamp, но лучше быть явным
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> dict:
    try:
        # jose автоматически проверяет exp (expiration) при decode
        # options={"verify_exp": True} - по умолчанию включено
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM],
            options={"verify_exp": True}  # Явно включаем проверку expiration
        )
        return payload
    except JWTError as e:
        # Более детальная обработка ошибок для отладки
        error_detail = "Could not validate credentials"
        if "expired" in str(e).lower() or "exp" in str(e).lower():
            error_detail = "Token has expired. Please login again."
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_detail,
        )

