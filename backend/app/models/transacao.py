from sqlalchemy import Column, Integer, String, Float, Date, Enum
from sqlalchemy.sql import func
from app.database import Base
import enum

class TipoTransacao(str, enum.Enum):
    receita = "receita"
    despesa = "despesa"

class Transacao(Base):
    __tablename__ = "transacoes"

    id = Column(Integer, primary_key=True, index=True)
    descricao = Column(String, nullable=False)
    valor = Column(Float, nullable=False)
    tipo = Column(Enum(TipoTransacao), nullable=False)
    categoria = Column(String, nullable=False)
    data = Column(Date, nullable=False)
    observacao = Column(String, nullable=True)