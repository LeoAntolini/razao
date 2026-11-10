import os
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.database import get_db
from app.models.usuario import Usuario
from app.models.reset_senha import ResetSenha
from app.email_service import enviar_email

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

class EsqueciSenha(BaseModel):
    email: str

class RedefinirSenha(BaseModel):
    token: str
    nova_senha: str

def agora():
    return datetime.now(timezone.utc).replace(tzinfo=None)

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

@router.post("/esqueci-senha")
def esqueci_senha(dados: EsqueciSenha, db: Session = Depends(get_db)):
    # Resposta igual exista o e-mail ou não (não revela quem tem conta)
    resposta = {"mensagem": "Se este e-mail estiver cadastrado, enviaremos um link para redefinir a senha."}

    usuario = db.query(Usuario).filter(func.lower(Usuario.email) == dados.email.strip().lower()).first()
    if not usuario:
        return resposta

    # Invalida links anteriores ainda não usados
    db.query(ResetSenha).filter(
        ResetSenha.usuario_id == usuario.id, ResetSenha.usado == False
    ).update({"usado": True})

    token = secrets.token_urlsafe(32)
    db.add(ResetSenha(
        usuario_id=usuario.id,
        token_hash=hash_token(token),
        expira_em=agora() + timedelta(hours=1),
    ))
    db.commit()

    link = f"{FRONTEND_URL}/redefinir-senha?token={token}"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#7C3AED;">Razão</h2>
      <p>Olá, {usuario.nome.split(' ')[0]}!</p>
      <p>Recebemos um pedido para redefinir sua senha. O link vale por <strong>1 hora</strong>.</p>
      <p><a href="{link}" style="display:inline-block;background:#7C3AED;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Redefinir minha senha</a></p>
      <p style="color:#666;font-size:13px;">Se você não pediu isso, ignore este e-mail. Sua senha continua a mesma.</p>
    </div>
    """
    enviar_email(usuario.email, "Redefinir sua senha — Razão", html)
    return resposta

@router.post("/redefinir-senha")
def redefinir_senha(dados: RedefinirSenha, db: Session = Depends(get_db)):
    if len(dados.nova_senha) < 6:
        raise HTTPException(status_code=400, detail="A senha deve ter pelo menos 6 caracteres")

    registro = db.query(ResetSenha).filter(
        ResetSenha.token_hash == hash_token(dados.token),
        ResetSenha.usado == False,
    ).first()
    if not registro or registro.expira_em < agora():
        raise HTTPException(status_code=400, detail="Link inválido ou expirado. Solicite um novo.")

    usuario = db.query(Usuario).filter(Usuario.id == registro.usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=400, detail="Link inválido ou expirado. Solicite um novo.")

    usuario.senha_hash = pwd_context.hash(dados.nova_senha)
    registro.usado = True
    db.commit()
    return {"mensagem": "Senha alterada com sucesso"}