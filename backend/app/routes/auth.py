from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.usuario import Usuario
from app.auth import hash_senha, verificar_senha, criar_token, get_usuario_atual
from pydantic import BaseModel, EmailStr

router = APIRouter()

class CadastroRequest(BaseModel):
    nome: str
    email: str
    senha: str

class LoginRequest(BaseModel):
    email: str
    senha: str

class UsuarioResponse(BaseModel):
    id: int
    nome: str
    email: str

    class Config:
        from_attributes = True

@router.post("/register", response_model=dict)
def cadastrar(dados: CadastroRequest, db: Session = Depends(get_db)):
    # Verifica se email já existe
    existente = db.query(Usuario).filter(Usuario.email == dados.email).first()
    if existente:
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    if len(dados.senha) < 6:
        raise HTTPException(status_code=400, detail="A senha deve ter pelo menos 6 caracteres")

    usuario = Usuario(
        nome=dados.nome,
        email=dados.email,
        senha_hash=hash_senha(dados.senha)
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    token = criar_token({"sub": str(usuario.id)})
    return {
        "token": token,
        "usuario": {"id": usuario.id, "nome": usuario.nome, "email": usuario.email}
    }

@router.post("/login", response_model=dict)
def login(dados: LoginRequest, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == dados.email).first()
    if not usuario or not verificar_senha(dados.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")

    token = criar_token({"sub": str(usuario.id)})
    return {
        "token": token,
        "usuario": {"id": usuario.id, "nome": usuario.nome, "email": usuario.email}
    }

@router.get("/me", response_model=UsuarioResponse)
def perfil(usuario=Depends(get_usuario_atual)):
    return usuario