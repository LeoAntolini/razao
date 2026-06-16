from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import extract
from app.database import get_db
from app.models.transacao import Transacao
from app.schemas.transacao import TransacaoCreate, TransacaoResponse
from typing import List
from datetime import date

router = APIRouter()

@router.post("/", response_model=TransacaoResponse)
def criar_transacao(transacao: TransacaoCreate, db: Session = Depends(get_db)):
    db_transacao = Transacao(**transacao.model_dump())
    db.add(db_transacao)
    db.commit()
    db.refresh(db_transacao)
    return db_transacao

@router.get("/", response_model=List[TransacaoResponse])
def listar_transacoes(mes: int = None, ano: int = None, db: Session = Depends(get_db)):
    query = db.query(Transacao)
    if mes:
        query = query.filter(extract('month', Transacao.data) == mes)
    if ano:
        query = query.filter(extract('year', Transacao.data) == ano)
    return query.order_by(Transacao.data.desc()).all()

@router.get("/resumo")
def resumo_mes(mes: int = None, ano: int = None, db: Session = Depends(get_db)):
    query = db.query(Transacao)
    if mes:
        query = query.filter(extract('month', Transacao.data) == mes)
    if ano:
        query = query.filter(extract('year', Transacao.data) == ano)
    
    transacoes = query.all()
    
    receitas = sum(t.valor for t in transacoes if t.tipo == "receita")
    despesas = sum(t.valor for t in transacoes if t.tipo == "despesa")
    saldo = receitas - despesas

    return {
        "receitas": receitas,
        "despesas": despesas,
        "saldo": saldo,
        "sugestao": {
            "investimento": round(saldo * 0.60, 2),
            "lazer": round(saldo * 0.25, 2),
            "gastos_pessoais": round(saldo * 0.15, 2),
        }
    }

@router.delete("/{id}")
def deletar_transacao(id: int, db: Session = Depends(get_db)):
    transacao = db.query(Transacao).filter(Transacao.id == id).first()
    if not transacao:
        raise HTTPException(status_code=404, detail="Transacao nao encontrada")
    db.delete(transacao)
    db.commit()
    return {"mensagem": "Transacao deletada com sucesso"}