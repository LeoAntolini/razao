from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.renda_fixa import RendaFixa
from app.models.meta import Meta
from app.auth import get_usuario_atual
from pydantic import BaseModel
from datetime import date
from typing import Optional
import calendar

router = APIRouter()

class RendaFixaCreate(BaseModel):
    instituicao: str
    tipo: str
    valor_investido: float
    taxa: Optional[str] = None
    tipo_rendimento: Optional[str] = None
    data_aplicacao: date
    data_vencimento: Optional[date] = None
    observacao: Optional[str] = None
    meta_id: Optional[int] = None

class RendaFixaResponse(RendaFixaCreate):
    id: int
    usuario_id: int

    class Config:
        from_attributes = True

def ajustar_meta(db: Session, usuario_id: int, meta_id: Optional[int], delta: float):
    """Soma (ou subtrai, se negativo) um valor no progresso da meta vinculada."""
    if not meta_id:
        return
    meta = db.query(Meta).filter(Meta.id == meta_id, Meta.usuario_id == usuario_id).first()
    if not meta or meta.status in ("encerrada", "resgatada"):
        return
    meta.valor_atual = max(0, meta.valor_atual + delta)
    if meta.valor_atual >= meta.valor_alvo:
        meta.concluida = True
        meta.status = "concluida"
    elif meta.status == "concluida":
        meta.concluida = False
        meta.status = "ativa"

@router.post("/", response_model=RendaFixaResponse)
def criar_renda_fixa(rf: RendaFixaCreate, db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    db_rf = RendaFixa(**rf.model_dump(), usuario_id=usuario.id)
    db.add(db_rf)
    ajustar_meta(db, usuario.id, rf.meta_id, rf.valor_investido)
    db.commit()
    db.refresh(db_rf)
    return db_rf

@router.get("/")
def listar_renda_fixa(db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    return db.query(RendaFixa).filter(RendaFixa.usuario_id == usuario.id).order_by(RendaFixa.data_aplicacao.desc()).all()

@router.get("/resumo")
def resumo_renda_fixa(db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    itens = db.query(RendaFixa).filter(RendaFixa.usuario_id == usuario.id).all()
    total = sum(i.valor_investido for i in itens)
    por_tipo = {}
    for i in itens:
        por_tipo[i.tipo] = por_tipo.get(i.tipo, 0) + i.valor_investido

    ticket_medio = round(total / len(itens), 2) if itens else 0
    isentos = sum(i.valor_investido for i in itens if i.tipo in ["lci", "lca", "cri", "cra"])
    tributaveis = total - isentos
    por_rendimento = {}
    for i in itens:
        r = i.tipo_rendimento or "nao_informado"
        if r not in por_rendimento:
            por_rendimento[r] = {"total": 0, "quantidade": 0}
        por_rendimento[r]["total"] += i.valor_investido
        por_rendimento[r]["quantidade"] += 1

    return {
        "total": round(total, 2),
        "quantidade": len(itens),
        "ticket_medio": ticket_medio,
        "isentos_ir": round(isentos, 2),
        "tributaveis_ir": round(tributaveis, 2),
        "por_tipo": por_tipo,
        "por_rendimento": por_rendimento,
    }

@router.get("/resumo-mes")
def resumo_mes_rf(mes: int, ano: int, db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    inicio = date(ano, mes, 1)
    fim = date(ano, mes, calendar.monthrange(ano, mes)[1])
    itens = db.query(RendaFixa).filter(
        RendaFixa.usuario_id == usuario.id,
        RendaFixa.data_aplicacao >= inicio,
        RendaFixa.data_aplicacao <= fim,
    ).all()
    total = sum(i.valor_investido for i in itens)
    return {"total_investido_mes": round(total, 2), "quantidade": len(itens)}

@router.get("/evolucao")
def evolucao_rf(db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    itens = db.query(RendaFixa).filter(RendaFixa.usuario_id == usuario.id).order_by(RendaFixa.data_aplicacao).all()
    meses = {}
    for i in itens:
        chave = i.data_aplicacao.strftime("%Y-%m")
        meses[chave] = meses.get(chave, 0) + i.valor_investido

    resultado = []
    acumulado = 0
    for chave in sorted(meses.keys()):
        acumulado += meses[chave]
        resultado.append({"mes": chave, "total": round(acumulado, 2)})
    return resultado

@router.put("/{id}", response_model=RendaFixaResponse)
def atualizar_renda_fixa(id: int, dados: RendaFixaCreate, db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    rf = db.query(RendaFixa).filter(RendaFixa.id == id, RendaFixa.usuario_id == usuario.id).first()
    if not rf:
        raise HTTPException(status_code=404, detail="Registro nao encontrado")
    if dados.valor_investido <= 0:
        raise HTTPException(status_code=400, detail="O valor investido deve ser maior que zero")

    # Desfaz o efeito antigo na meta, aplica os novos dados e soma o novo valor
    ajustar_meta(db, usuario.id, rf.meta_id, -rf.valor_investido)
    for campo, valor in dados.model_dump().items():
        setattr(rf, campo, valor)
    ajustar_meta(db, usuario.id, rf.meta_id, rf.valor_investido)

    db.commit()
    db.refresh(rf)
    return rf

@router.delete("/{id}")
def deletar_renda_fixa(id: int, db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    rf = db.query(RendaFixa).filter(RendaFixa.id == id, RendaFixa.usuario_id == usuario.id).first()
    if not rf:
        raise HTTPException(status_code=404, detail="Registro nao encontrado")

    ajustar_meta(db, usuario.id, rf.meta_id, -rf.valor_investido)
    db.delete(rf)
    db.commit()
    return {"mensagem": "Registro deletado com sucesso"}