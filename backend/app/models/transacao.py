from sqlalchemy import Column, Integer, String, Float, Date, Enum, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class TipoTransacao(str, enum.Enum):
    receita = "receita"
    despesa = "despesa"
    investimento = "investimento"

class SubtipoTransacao(str, enum.Enum):
    # Subtipos de despesa
    fixa = "fixa"
    fixa_parcelada = "fixa_parcelada"
    fixa_com_prazo = "fixa_com_prazo"
    variavel = "variavel"
    sazonal = "sazonal"
    # Subtipos de receita
    salario = "salario"
    freelance = "freelance"
    dividendos = "dividendos"
    outros = "outros"

class Transacao(Base):
    __tablename__ = "transacoes"

    id = Column(Integer, primary_key=True, index=True)
    descricao = Column(String, nullable=True)
    valor = Column(Float, nullable=False)
    tipo = Column(Enum(TipoTransacao), nullable=False)
    subtipo = Column(String, nullable=True)
    categoria = Column(String, nullable=False)
    data = Column(Date, nullable=False)
    mes_referencia = Column(String, nullable=True)
    meta_id = Column(Integer, ForeignKey("metas.id"), nullable=True)
    total_parcelas = Column(Integer, nullable=True)
    parcela_atual = Column(Integer, nullable=True)
    recorrente = Column(Boolean, default=False)
    observacao = Column(String, nullable=True)

    meta = relationship("Meta", back_populates="aportes")