from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_usuario_atual
from app.models.preferencias import Preferencias
from pydantic import BaseModel

router = APIRouter()

class PreferenciasUpdate(BaseModel):
    pct_investimento: float
    pct_lazer: float
    pct_gastos: float

@router.get("/")
def get_preferencias(db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    pref = db.query(Preferencias).filter(Preferencias.usuario_id == usuario.id).first()
    if not pref:
        return {"pct_investimento": 60.0, "pct_lazer": 25.0, "pct_gastos": 15.0}
    return {"pct_investimento": pref.pct_investimento, "pct_lazer": pref.pct_lazer, "pct_gastos": pref.pct_gastos}

@router.put("/")
def salvar_preferencias(dados: PreferenciasUpdate, db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    total = dados.pct_investimento + dados.pct_lazer + dados.pct_gastos
    if round(total) != 100:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Os percentuais devem somar 100%")

    pref = db.query(Preferencias).filter(Preferencias.usuario_id == usuario.id).first()
    if pref:
        pref.pct_investimento = dados.pct_investimento
        pref.pct_lazer = dados.pct_lazer
        pref.pct_gastos = dados.pct_gastos
    else:
        pref = Preferencias(usuario_id=usuario.id, **dados.model_dump())
        db.add(pref)
    db.commit()
    return {"mensagem": "Preferencias salvas", "pct_investimento": pref.pct_investimento, "pct_lazer": pref.pct_lazer, "pct_gastos": pref.pct_gastos}