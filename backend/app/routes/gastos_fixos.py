from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.gasto_fixo import GastoFixo, TipoGastoFixo
from typing import List
from pydantic import BaseModel
from datetime import date
from typing import Optional

router = APIRouter()

class GastoFixoCreate(BaseModel):
    descricao: str
    valor: float
    categoria: str
    tipo: TipoGastoFixo
    total_parcelas: Optional[int] = None
    parcelas_pagas: Optional[int] = 0
    data_termino: Optional[date] = None
    mes_inicio: str

class GastoFixoResponse(GastoFixoCreate):
    id: int
    ativo: bool

    class Config:
        from_attributes = True

@router.post("/", response_model=GastoFixoResponse)
def criar_gasto_fixo(gasto: GastoFixoCreate, db: Session = Depends(get_db)):
    db_gasto = GastoFixo(**gasto.model_dump())
    db.add(db_gasto)
    db.commit()
    db.refresh(db_gasto)
    return db_gasto

@router.get("/", response_model=List[GastoFixoResponse])
def listar_gastos_fixos(apenas_ativos: bool = True, db: Session = Depends(get_db)):
    query = db.query(GastoFixo)
    if apenas_ativos:
        query = query.filter(GastoFixo.ativo == True)
    return query.all()

@router.get("/mes/{ano}/{mes}")
def gastos_do_mes(ano: int, mes: int, db: Session = Depends(get_db)):
    mes_ref = f"{ano}-{str(mes).zfill(2)}"
    gastos = db.query(GastoFixo).filter(GastoFixo.ativo == True).all()
    resultado = []
    total = 0.0

    for g in gastos:
        if g.mes_inicio > mes_ref:
            continue
        if g.tipo == TipoGastoFixo.com_prazo and g.data_termino:
            termino = g.data_termino.strftime("%Y-%m")
            if mes_ref > termino:
                continue
        ultima_parcela = False
        if g.tipo == TipoGastoFixo.parcelado and g.total_parcelas:
            meses_passados = (ano - int(g.mes_inicio[:4])) * 12 + (mes - int(g.mes_inicio[5:7]))
            parcela_atual = meses_passados + 1
            if parcela_atual > g.total_parcelas:
                continue
            ultima_parcela = parcela_atual == g.total_parcelas

        resultado.append({
            "id": g.id,
            "descricao": g.descricao,
            "valor": g.valor,
            "categoria": g.categoria,
            "tipo": g.tipo,
            "ultima_parcela": ultima_parcela,
        })
        total += g.valor

    return {"gastos": resultado, "total": total}

@router.put("/{id}")
def atualizar_gasto_fixo(id: int, gasto: GastoFixoCreate, db: Session = Depends(get_db)):
    db_gasto = db.query(GastoFixo).filter(GastoFixo.id == id).first()
    if not db_gasto:
        raise HTTPException(status_code=404, detail="Gasto fixo nao encontrado")
    for key, value in gasto.model_dump().items():
        setattr(db_gasto, key, value)
    db.commit()
    db.refresh(db_gasto)
    return db_gasto

@router.delete("/{id}")
def desativar_gasto_fixo(id: int, db: Session = Depends(get_db)):
    db_gasto = db.query(GastoFixo).filter(GastoFixo.id == id).first()
    if not db_gasto:
        raise HTTPException(status_code=404, detail="Gasto fixo nao encontrado")
    db_gasto.ativo = False
    db.commit()
    return {"mensagem": "Gasto fixo desativado com sucesso"}