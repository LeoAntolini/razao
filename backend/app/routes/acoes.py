from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.acao import Acao
from app.models.meta import Meta
from app.auth import get_usuario_atual
from app.custodiantes import get_custodiante
from pydantic import BaseModel
from datetime import date
from typing import Optional, List

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

@router.post("/", response_model=AcaoResponse)
def criar_compra(acao: AcaoCreate, db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    db_acao = Acao(**acao.model_dump(), usuario_id=usuario.id)
    db_acao.ticker = db_acao.ticker.upper().strip()
    db.add(db_acao)

    # Atualiza meta vinculada se houver
    if acao.meta_id:
        meta = db.query(Meta).filter(Meta.id == acao.meta_id, Meta.usuario_id == usuario.id).first()
        if meta:
            valor_compra = acao.quantidade * acao.preco_pago
            meta.valor_atual += valor_compra
            if meta.valor_atual >= meta.valor_alvo:
                meta.concluida = True
                meta.status = "concluida"

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
            "quantidade": c.quantidade,
            "preco_pago": c.preco_pago,
            "data_compra": c.data_compra.isoformat(),
            "corretora": c.corretora,
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
    from datetime import date
    inicio = date(ano, mes, 1)
    import calendar
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
        if chave not in meses:
            meses[chave] = 0
        meses[chave] += c.quantidade * c.preco_pago

    resultado = []
    acumulado = 0
    for chave in sorted(meses.keys()):
        acumulado += meses[chave]
        resultado.append({"mes": chave, "total": round(acumulado, 2)})
    return resultado

@router.get("/custodiante/{ticker}")
def buscar_custodiante(ticker: str):
    return get_custodiante(ticker)

@router.delete("/{id}")
def deletar_compra(id: int, db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    acao = db.query(Acao).filter(Acao.id == id, Acao.usuario_id == usuario.id).first()
    if not acao:
        raise HTTPException(status_code=404, detail="Compra nao encontrada")

    # Reverte valor na meta se houver
    if acao.meta_id:
        meta = db.query(Meta).filter(Meta.id == acao.meta_id, Meta.usuario_id == usuario.id).first()
        if meta:
            valor = acao.quantidade * acao.preco_pago
            meta.valor_atual = max(0, meta.valor_atual - valor)
            meta.concluida = meta.valor_atual >= meta.valor_alvo
            if meta.status == "concluida" and meta.valor_atual < meta.valor_alvo:
                meta.status = "ativa"

    db.delete(acao)
    db.commit()
    return {"mensagem": "Compra deletada com sucesso"}