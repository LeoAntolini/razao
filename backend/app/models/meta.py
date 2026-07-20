from sqlalchemy import Column, Integer, String, Float, Date, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Meta(Base):
    __tablename__ = "metas"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)
    valor_alvo = Column(Float, nullable=False)
    valor_atual = Column(Float, default=0.0)
    prazo = Column(Date, nullable=True)
    concluida = Column(Boolean, default=False)
    descricao = Column(String, nullable=True)
    status = Column(String, default="ativa")
    data_conclusao = Column(Date, nullable=True)
    data_encerramento = Column(Date, nullable=True)
    motivo_encerramento = Column(String, nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    aportes = relationship("Transacao", back_populates="meta")