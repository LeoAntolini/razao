from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.meta import Meta
from app.schemas.meta import MetaCreate, MetaResponse
from typing import List

router = APIRouter()

@router.post("/", response_model=MetaResponse)
def criar_meta(meta: MetaCreate, db: Session = Depends(get_db)):
    db_meta = Meta(**meta.model_dump())
    db.add(db_meta)
    db.commit()
    db.refresh(db_meta)
    return db_meta

@router.get("/", response_model=List[MetaResponse])
def listar_metas(db: Session = Depends(get_db)):
    return db.query(Meta).all()

@router.put("/{id}/atualizar-valor")
def atualizar_valor_meta(id: int, valor: float, db: Session = Depends(get_db)):
    meta = db.query(Meta).filter(Meta.id == id).first()
    if not meta:
        raise HTTPException(status_code=404, detail="Meta nao encontrada")
    
    meta.valor_atual = valor
    if valor >= meta.valor_alvo:
        meta.concluida = True
    
    db.commit()
    db.refresh(meta)
    return meta

@router.delete("/{id}")
def deletar_meta(id: int, db: Session = Depends(get_db)):
    meta = db.query(Meta).filter(Meta.id == id).first()
    if not meta:
        raise HTTPException(status_code=404, detail="Meta nao encontrada")
    db.delete(meta)
    db.commit()
    return {"mensagem": "Meta deletada com sucesso"}