from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.renda_fixa import RendaFixa
from app.models.meta import Meta
from app.auth import get_usuario_atual
from pydantic import BaseModel
from datetime import date
from typing import Optional

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

@router.post("/", response_model=RendaFixaResponse)
def criar_renda_fixa(rf: RendaFixaCreate, db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    db_rf = RendaFixa(**rf.model_dump(), usuario_id=usuario.id)
    db.add(db_rf)

    # Atualiza meta vinculada se houver
    if rf.meta_id:
        meta = db.query(Meta).filter(Meta.id == rf.meta_id, Meta.usuario_id == usuario.id).first()
        if meta:
            meta.valor_atual += rf.valor_investido
            if meta.valor_atual >= meta.valor_alvo:
                meta.concluida = True
                meta.status = "concluida"

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
    import calendar
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
        if chave not in meses:
            meses[chave] = 0
        meses[chave] += i.valor_investido

    resultado = []
    acumulado = 0
    for chave in sorted(meses.keys()):
        acumulado += meses[chave]
        resultado.append({"mes": chave, "total": round(acumulado, 2)})
    return resultado

@router.delete("/{id}")
def deletar_renda_fixa(id: int, db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    rf = db.query(RendaFixa).filter(RendaFixa.id == id, RendaFixa.usuario_id == usuario.id).first()
    if not rf:
        raise HTTPException(status_code=404, detail="Registro nao encontrado")

    # Reverte valor na meta se houver
    if rf.meta_id:
        meta = db.query(Meta).filter(Meta.id == rf.meta_id, Meta.usuario_id == usuario.id).first()
        if meta:
            meta.valor_atual = max(0, meta.valor_atual - rf.valor_investido)
            meta.concluida = meta.valor_atual >= meta.valor_alvo
            if meta.status == "concluida" and meta.valor_atual < meta.valor_alvo:
                meta.status = "ativa"

    db.delete(rf)
    db.commit()
    return {"mensagem": "Registro deletado com sucesso"}