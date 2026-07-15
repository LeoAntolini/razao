from pydantic import BaseModel
from datetime import date
from typing import Optional

class MetaBase(BaseModel):
    titulo: str
    valor_alvo: float
    valor_atual: float = 0.0
    prazo: Optional[date] = None
    descricao: Optional[str] = None

class MetaCreate(MetaBase):
    pass

class MetaResponse(MetaBase):
    id: int
    concluida: bool
    status: str
    data_conclusao: Optional[date] = None
    data_encerramento: Optional[date] = None
    motivo_encerramento: Optional[str] = None

    class Config:
        from_attributes = True