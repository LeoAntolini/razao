from pydantic import BaseModel
from datetime import date
from enum import Enum

class TipoTransacao(str, Enum):
    receita = "receita"
    despesa = "despesa"

class TransacaoBase(BaseModel):
    descricao: str
    valor: float
    tipo: TipoTransacao
    categoria: str
    data: date
    observacao: str | None = None

class TransacaoCreate(TransacaoBase):
    pass

class TransacaoResponse(TransacaoBase):
    id: int

    class Config:
        from_attributes = True