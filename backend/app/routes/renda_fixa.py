from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.renda_fixa import RendaFixa
from app.auth import get_usuario_atual
from pydantic import BaseModel
from datetime import date
from typing import Optional, List

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

class RendaFixaResponse(RendaFixaCreate):
    id: int
    usuario_id: int

    class Config:
        from_attributes = True

@router.post("/", response_model=RendaFixaResponse)
def criar_renda_fixa(rf: RendaFixaCreate, db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    db_rf = RendaFixa(**rf.model_dump(), usuario_id=usuario.id)
    db.add(db_rf)
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
        if i.tipo not in por_tipo:
            por_tipo[i.tipo] = 0
        por_tipo[i.tipo] += i.valor_investido

    # Ticket médio
    ticket_medio = round(total / len(itens), 2) if itens else 0

    # Distribuição por tipo de rendimento
    por_rendimento = {}
    for i in itens:
        r = i.tipo_rendimento or "nao_informado"
        if r not in por_rendimento:
            por_rendimento[r] = {"total": 0, "quantidade": 0}
        por_rendimento[r]["total"] += i.valor_investido
        por_rendimento[r]["quantidade"] += 1

    # Isentos vs tributáveis
    isentos = sum(i.valor_investido for i in itens if i.tipo in ["lci", "lca", "cri", "cra"])
    tributaveis = total - isentos

    return {
        "total": round(total, 2),
        "quantidade": len(itens),
        "ticket_medio": ticket_medio,
        "isentos_ir": round(isentos, 2),
        "tributaveis_ir": round(tributaveis, 2),
        "por_tipo": por_tipo,
        "por_rendimento": por_rendimento,
    }

@router.delete("/{id}")
def deletar_renda_fixa(id: int, db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    rf = db.query(RendaFixa).filter(RendaFixa.id == id, RendaFixa.usuario_id == usuario.id).first()
    if not rf:
        raise HTTPException(status_code=404, detail="Registro nao encontrado")
    db.delete(rf)
    db.commit()
    return {"mensagem": "Registro deletado com sucesso"}