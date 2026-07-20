from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.meta import Meta
from app.models.transacao import Transacao, TipoTransacao
from app.schemas.meta import MetaCreate, MetaResponse
from app.auth import get_usuario_atual
from typing import List, Optional
from datetime import date
from pydantic import BaseModel

router = APIRouter()

class ResgateRequest(BaseModel):
    meta_id: int
    acao: str
    meta_destino_id: Optional[int] = None

@router.post("/", response_model=MetaResponse)
def criar_meta(meta: MetaCreate, db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    db_meta = Meta(**meta.model_dump(), usuario_id=usuario.id)
    db.add(db_meta)
    db.commit()
    db.refresh(db_meta)
    return db_meta

@router.get("/", response_model=List[MetaResponse])
def listar_metas(status: Optional[str] = None, db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    query = db.query(Meta).filter(Meta.usuario_id == usuario.id)
    if status:
        query = query.filter(Meta.status == status)
    return query.all()

@router.get("/patrimonio")
def patrimonio_total(db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    metas = db.query(Meta).filter(Meta.usuario_id == usuario.id, Meta.status.in_(["ativa", "pausada", "concluida"])).all()
    total = sum(m.valor_atual for m in metas)
    return {"patrimonio_total": round(total, 2), "metas": len(metas)}

@router.put("/{id}/pausar")
def pausar_meta(id: int, db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    meta = db.query(Meta).filter(Meta.id == id, Meta.usuario_id == usuario.id).first()
    if not meta:
        raise HTTPException(status_code=404, detail="Meta nao encontrada")
    meta.status = "pausada" if meta.status == "ativa" else "ativa"
    db.commit()
    db.refresh(meta)
    return meta

@router.post("/resgatar")
def resgatar_meta(req: ResgateRequest, db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    meta = db.query(Meta).filter(Meta.id == req.meta_id, Meta.usuario_id == usuario.id).first()
    if not meta:
        raise HTTPException(status_code=404, detail="Meta nao encontrada")

    valor = meta.valor_atual

    if req.acao == "resgatar":
        receita = Transacao(
            descricao=f"Resgate de meta — {meta.titulo}",
            valor=valor,
            tipo=TipoTransacao.receita,
            categoria="Resgate de meta",
            data=date.today(),
            mes_referencia=date.today().strftime("%Y-%m"),
            recorrente=False,
            usuario_id=usuario.id,
        )
        db.add(receita)
        meta.status = "resgatada"
        meta.valor_atual = 0.0
        meta.data_encerramento = date.today()
        meta.motivo_encerramento = "resgatada"

    elif req.acao == "transferir" and req.meta_destino_id:
        meta_destino = db.query(Meta).filter(Meta.id == req.meta_destino_id, Meta.usuario_id == usuario.id).first()
        if not meta_destino:
            raise HTTPException(status_code=404, detail="Meta destino nao encontrada")
        meta_destino.valor_atual += valor
        if meta_destino.valor_atual >= meta_destino.valor_alvo:
            meta_destino.concluida = True
            meta_destino.status = "concluida"
            meta_destino.data_conclusao = date.today()
        meta.status = "encerrada"
        meta.valor_atual = 0.0
        meta.data_encerramento = date.today()
        meta.motivo_encerramento = f"transferida para meta {req.meta_destino_id}"

    elif req.acao == "descartar":
        meta.status = "encerrada"
        meta.valor_atual = 0.0
        meta.data_encerramento = date.today()
        meta.motivo_encerramento = "descartada"

    elif req.acao == "manter":
        meta.status = "concluida"
        meta.data_conclusao = date.today()

    db.commit()
    db.refresh(meta)
    return meta

@router.put("/{id}", response_model=MetaResponse)
def atualizar_meta(id: int, meta: MetaCreate, db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    db_meta = db.query(Meta).filter(Meta.id == id, Meta.usuario_id == usuario.id).first()
    if not db_meta:
        raise HTTPException(status_code=404, detail="Meta nao encontrada")
    for key, value in meta.model_dump().items():
        setattr(db_meta, key, value)
    db.commit()
    db.refresh(db_meta)
    return db_meta

@router.delete("/{id}")
def deletar_meta(id: int, db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    meta = db.query(Meta).filter(Meta.id == id, Meta.usuario_id == usuario.id).first()
    if not meta:
        raise HTTPException(status_code=404, detail="Meta nao encontrada")
    meta.status = "encerrada"
    meta.data_encerramento = date.today()
    meta.motivo_encerramento = "removida pelo usuario"
    meta.valor_atual = 0.0
    db.commit()
    return {"mensagem": "Meta encerrada com sucesso"}