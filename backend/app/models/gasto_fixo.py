from sqlalchemy import Column, Integer, String, Float, Date, Boolean, Enum
from app.database import Base
import enum

class TipoGastoFixo(str, enum.Enum):
    sem_prazo = "sem_prazo"
    parcelado = "parcelado"
    com_prazo = "com_prazo"

class GastoFixo(Base):
    __tablename__ = "gastos_fixos"

    id = Column(Integer, primary_key=True, index=True)
    descricao = Column(String, nullable=False)
    valor = Column(Float, nullable=False)
    categoria = Column(String, nullable=False)
    tipo = Column(Enum(TipoGastoFixo), nullable=False)
    total_parcelas = Column(Integer, nullable=True)
    parcelas_pagas = Column(Integer, default=0, nullable=True)
    data_termino = Column(Date, nullable=True)
    mes_inicio = Column(String, nullable=False)
    ativo = Column(Boolean, default=True)