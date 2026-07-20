from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db

SECRET_KEY = "razao_secret_key_2026_financeiro"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def verificar_senha(senha_plana: str, senha_hash: str) -> bool:
    return pwd_context.verify(senha_plana, senha_hash)

def hash_senha(senha: str) -> str:
    return pwd_context.hash(senha)

def criar_token(dados: dict, expira_em: Optional[timedelta] = None) -> str:
    dados_copy = dados.copy()
    expira = datetime.utcnow() + (expira_em or timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS))
    dados_copy.update({"exp": expira})
    return jwt.encode(dados_copy, SECRET_KEY, algorithm=ALGORITHM)

def verificar_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def get_usuario_atual(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    from app.models.usuario import Usuario
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido ou expirado. Faça login novamente.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = verificar_token(token)
    if not payload:
        raise credentials_exception
    usuario_id = payload.get("sub")
    if not usuario_id:
        raise credentials_exception
    usuario = db.query(Usuario).filter(Usuario.id == int(usuario_id)).first()
    if not usuario:
        raise credentials_exception
    return usuario