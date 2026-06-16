from sqlalchemy import Column, Integer, String, Float, Date, Boolean
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