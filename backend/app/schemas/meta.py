from pydantic import BaseModel
from datetime import date

class MetaBase(BaseModel):
    titulo: str
    valor_alvo: float
    valor_atual: float = 0.0
    prazo: date | None = None
    descricao: str | None = None

class MetaCreate(MetaBase):
    pass

class MetaResponse(MetaBase):
    id: int
    concluida: bool

    class Config:
        from_attributes = True