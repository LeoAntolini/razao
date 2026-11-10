from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.acao import Acao
from app.models.meta import Meta
from app.auth import get_usuario_atual
from app.custodiantes import get_custodiante
from pydantic import BaseModel
from datetime import date
from typing import Optional
import calendar

router = APIRouter()

class AcaoCreate(BaseModel):
    ticker: str
    tipo: str = "acao"
    quantidade: float
    preco_pago: float
    data_compra: date
    corretora: Optional[str] = None
    observacao: Optional[str] = None
    meta_id: Optional[int] = None

class AcaoResponse(AcaoCreate):
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

@router.post("/", response_model=AcaoResponse)
def criar_compra(acao: AcaoCreate, db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    db_acao = Acao(**acao.model_dump(), usuario_id=usuario.id)
    db_acao.ticker = db_acao.ticker.upper().strip()
    db.add(db_acao)
    ajustar_meta(db, usuario.id, acao.meta_id, acao.quantidade * acao.preco_pago)
    db.commit()
    db.refresh(db_acao)
    return db_acao

@router.get("/")
def listar_compras(db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    return db.query(Acao).filter(Acao.usuario_id == usuario.id).order_by(Acao.data_compra.desc()).all()

@router.get("/carteira")
def carteira_consolidada(db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    compras = db.query(Acao).filter(Acao.usuario_id == usuario.id).all()

    carteira = {}
    for c in compras:
        ticker = c.ticker.upper()
        if ticker not in carteira:
            carteira[ticker] = {
                "ticker": ticker,
                "tipo": c.tipo,
                "quantidade": 0,
                "total_investido": 0,
                "compras": [],
                "meta_id": c.meta_id,
            }
        carteira[ticker]["quantidade"] += c.quantidade
        carteira[ticker]["total_investido"] += c.quantidade * c.preco_pago
        carteira[ticker]["compras"].append({
            "id": c.id,
            "ticker": ticker,
            "tipo": c.tipo,
            "quantidade": c.quantidade,
            "preco_pago": c.preco_pago,
            "data_compra": c.data_compra.isoformat(),
            "corretora": c.corretora,
            "observacao": c.observacao,
            "meta_id": c.meta_id,
        })

    resultado = []
    total_carteira = 0
    for ticker, dados in carteira.items():
        preco_medio = dados["total_investido"] / dados["quantidade"] if dados["quantidade"] > 0 else 0
        custodiante = get_custodiante(ticker)
        total_carteira += dados["total_investido"]
        resultado.append({
            **dados,
            "preco_medio": round(preco_medio, 4),
            "total_investido": round(dados["total_investido"], 2),
            "custodiante_nome": custodiante["nome"],
            "custodiante_cnpj": custodiante["cnpj"],
            "custodiante_encontrado": custodiante["encontrado"],
        })

    resultado.sort(key=lambda x: x["total_investido"], reverse=True)
    return {"ativos": resultado, "total_carteira": round(total_carteira, 2)}

@router.get("/resumo-mes")
def resumo_mes_acoes(mes: int, ano: int, db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    inicio = date(ano, mes, 1)
    fim = date(ano, mes, calendar.monthrange(ano, mes)[1])
    compras = db.query(Acao).filter(
        Acao.usuario_id == usuario.id,
        Acao.data_compra >= inicio,
        Acao.data_compra <= fim,
    ).all()
    total = sum(c.quantidade * c.preco_pago for c in compras)
    return {"total_investido_mes": round(total, 2), "quantidade_compras": len(compras)}

@router.get("/evolucao")
def evolucao_acoes(db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    compras = db.query(Acao).filter(Acao.usuario_id == usuario.id).order_by(Acao.data_compra).all()
    meses = {}
    for c in compras:
        chave = c.data_compra.strftime("%Y-%m")
        meses[chave] = meses.get(chave, 0) + c.quantidade * c.preco_pago

    resultado = []
    acumulado = 0
    for chave in sorted(meses.keys()):
        acumulado += meses[chave]
        resultado.append({"mes": chave, "total": round(acumulado, 2)})
    return resultado

@router.get("/custodiante/{ticker}")
def buscar_custodiante(ticker: str):
    return get_custodiante(ticker)

@router.put("/{id}", response_model=AcaoResponse)
def atualizar_compra(id: int, dados: AcaoCreate, db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    acao = db.query(Acao).filter(Acao.id == id, Acao.usuario_id == usuario.id).first()
    if not acao:
        raise HTTPException(status_code=404, detail="Compra nao encontrada")
    if dados.quantidade <= 0 or dados.preco_pago <= 0:
        raise HTTPException(status_code=400, detail="Quantidade e preco devem ser maiores que zero")

    # Desfaz o efeito antigo na meta, aplica os novos dados e soma o novo valor
    ajustar_meta(db, usuario.id, acao.meta_id, -(acao.quantidade * acao.preco_pago))
    for campo, valor in dados.model_dump().items():
        setattr(acao, campo, valor)
    acao.ticker = acao.ticker.upper().strip()
    ajustar_meta(db, usuario.id, acao.meta_id, acao.quantidade * acao.preco_pago)

    db.commit()
    db.refresh(acao)
    return acao

@router.delete("/{id}")
def deletar_compra(id: int, db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    acao = db.query(Acao).filter(Acao.id == id, Acao.usuario_id == usuario.id).first()
    if not acao:
        raise HTTPException(status_code=404, detail="Compra nao encontrada")

    ajustar_meta(db, usuario.id, acao.meta_id, -(acao.quantidade * acao.preco_pago))
    db.delete(acao)
    db.commit()
    return {"mensagem": "Compra deletada com sucesso"}