from pydantic import BaseModel
from datetime import date
from enum import Enum
from typing import Optional

class TipoTransacao(str, Enum):
    receita = "receita"
    despesa = "despesa"
    investimento = "investimento"

class TransacaoBase(BaseModel):
    descricao: Optional[str] = None
    valor: float
    tipo: TipoTransacao
    subtipo: Optional[str] = None
    categoria: str
    data: date
    mes_referencia: Optional[str] = None
    meta_id: Optional[int] = None
    total_parcelas: Optional[int] = None
    parcela_atual: Optional[int] = None
    recorrente: Optional[bool] = False
    observacao: Optional[str] = None

class TransacaoCreate(TransacaoBase):
    pass

class TransacaoResponse(TransacaoBase):
    id: int

    class Config:
        from_attributes = True