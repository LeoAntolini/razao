from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from app.database import Base

class ResetSenha(Base):
    __tablename__ = "reset_senha"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    token_hash = Column(String, nullable=False, index=True)
    expira_em = Column(DateTime, nullable=False)
    usado = Column(Boolean, default=False)