from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import extract
from app.database import get_db
from app.models.transacao import Transacao, TipoTransacao
from app.models.meta import Meta
from app.schemas.transacao import TransacaoCreate, TransacaoResponse
from typing import List, Optional
from datetime import date, timedelta
import calendar

router = APIRouter()

def gerar_transacoes_recorrentes(db: Session, transacao: Transacao, meses: int = 12):
    """Gera cópias de uma transação fixa para os próximos meses"""
    data_base = transacao.data
    for i in range(1, meses + 1):
        mes = (data_base.month + i - 1) % 12 + 1
        ano = data_base.year + (data_base.month + i - 1) // 12
        ultimo_dia = calendar.monthrange(ano, mes)[1]
        dia = min(data_base.day, ultimo_dia)
        nova_data = date(ano, mes, dia)
        mes_ref = f"{ano}-{str(mes).zfill(2)}"

        # Verifica se já existe para esse mês
        existe = db.query(Transacao).filter(
            Transacao.recorrente == True,
            Transacao.descricao == transacao.descricao,
            Transacao.mes_referencia == mes_ref,
            Transacao.categoria == transacao.categoria,
        ).first()
        if existe:
            continue

        nova = Transacao(
            descricao=transacao.descricao,
            valor=transacao.valor,
            tipo=transacao.tipo,
            subtipo=transacao.subtipo,
            categoria=transacao.categoria,
            data=nova_data,
            mes_referencia=mes_ref,
            recorrente=True,
            observacao=transacao.observacao,
        )
        db.add(nova)

@router.post("/", response_model=TransacaoResponse)
def criar_transacao(transacao: TransacaoCreate, db: Session = Depends(get_db)):
    mes_ref = transacao.data.strftime("%Y-%m")
    
    dados = transacao.model_dump()
    dados['mes_referencia'] = mes_ref

    db_transacao = Transacao(**dados)
    db.add(db_transacao)

    # Sincroniza com meta se for investimento
    if transacao.tipo == TipoTransacao.investimento and transacao.meta_id:
        meta = db.query(Meta).filter(Meta.id == transacao.meta_id).first()
        if meta:
            meta.valor_atual += transacao.valor
            if meta.valor_atual >= meta.valor_alvo:
                meta.concluida = True

    db.commit()
    db.refresh(db_transacao)

    # Gera recorrências para despesas fixas sem prazo
    if transacao.tipo == TipoTransacao.despesa and transacao.subtipo == "fixa":
        gerar_transacoes_recorrentes(db, db_transacao, meses=12)
        db.commit()

    # Gera parcelas para despesas parceladas
    if transacao.tipo == TipoTransacao.despesa and transacao.subtipo == "fixa_parcelada" and transacao.total_parcelas:
        data_base = transacao.data
        for i in range(1, transacao.total_parcelas):
            mes = (data_base.month + i - 1) % 12 + 1
            ano = data_base.year + (data_base.month + i - 1) // 12
            ultimo_dia = calendar.monthrange(ano, mes)[1]
            dia = min(data_base.day, ultimo_dia)
            nova_data = date(ano, mes, dia)
            mes_ref_parcela = f"{ano}-{str(mes).zfill(2)}"

            parcela = Transacao(
                descricao=transacao.descricao,
                valor=transacao.valor,
                tipo=transacao.tipo,
                subtipo=transacao.subtipo,
                categoria=transacao.categoria,
                data=nova_data,
                mes_referencia=mes_ref_parcela,
                total_parcelas=transacao.total_parcelas,
                parcela_atual=i + 1,
                recorrente=True,
                observacao=transacao.observacao,
            )
            db.add(parcela)
        db.commit()

    return db_transacao

@router.get("/", response_model=List[TransacaoResponse])
def listar_transacoes(
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Transacao)
    if mes and ano:
        mes_ref = f"{ano}-{str(mes).zfill(2)}"
        query = query.filter(Transacao.mes_referencia == mes_ref)
    elif mes:
        query = query.filter(extract('month', Transacao.data) == mes)
    elif ano:
        query = query.filter(extract('year', Transacao.data) == ano)
    return query.order_by(Transacao.data.desc()).all()

@router.get("/resumo")
def resumo_mes(
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Transacao)
    if mes and ano:
        mes_ref = f"{ano}-{str(mes).zfill(2)}"
        query = query.filter(Transacao.mes_referencia == mes_ref)

    transacoes = query.all()

    receitas = sum(t.valor for t in transacoes if t.tipo == TipoTransacao.receita)
    despesas_variaveis = sum(t.valor for t in transacoes if t.tipo == TipoTransacao.despesa and t.subtipo == "variavel")
    despesas_fixas = sum(t.valor for t in transacoes if t.tipo == TipoTransacao.despesa and t.subtipo in ["fixa", "fixa_parcelada", "fixa_com_prazo", "sazonal"])
    investimentos = sum(t.valor for t in transacoes if t.tipo == TipoTransacao.investimento)
    total_despesas = despesas_variaveis + despesas_fixas
    saldo_livre = receitas - total_despesas - investimentos

    comprometimento = round((despesas_fixas / receitas * 100), 1) if receitas > 0 else 0

    saude = "excelente"
    if investimentos / receitas >= 0.20 and comprometimento < 50:
        saude = "excelente"
    elif investimentos / receitas >= 0.10:
        saude = "bom"
    elif comprometimento > 70:
        saude = "atencao"
    elif total_despesas > receitas:
        saude = "critico"
    else:
        saude = "bom"

    return {
        "receitas": receitas,
        "despesas_variaveis": despesas_variaveis,
        "despesas_fixas": despesas_fixas,
        "total_despesas": total_despesas,
        "investimentos": investimentos,
        "saldo_livre": saldo_livre,
        "comprometimento_fixos": comprometimento,
        "saude_financeira": saude,
        "sugestao": {
            "investimento": round(saldo_livre * 0.60, 2) if saldo_livre > 0 else 0,
            "lazer": round(saldo_livre * 0.25, 2) if saldo_livre > 0 else 0,
            "gastos_pessoais": round(saldo_livre * 0.15, 2) if saldo_livre > 0 else 0,
        }
    }

@router.get("/grafico-pizza")
def grafico_pizza(
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Transacao)
    if mes and ano:
        mes_ref = f"{ano}-{str(mes).zfill(2)}"
        query = query.filter(Transacao.mes_referencia == mes_ref)

    transacoes = query.all()
    receitas = sum(t.valor for t in transacoes if t.tipo == TipoTransacao.receita)
    despesas_variaveis = sum(t.valor for t in transacoes if t.tipo == TipoTransacao.despesa and t.subtipo == "variavel")
    despesas_fixas = sum(t.valor for t in transacoes if t.tipo == TipoTransacao.despesa and t.subtipo in ["fixa", "fixa_parcelada", "fixa_com_prazo", "sazonal"])
    investimentos = sum(t.valor for t in transacoes if t.tipo == TipoTransacao.investimento)
    dinheiro_livre = max(receitas - despesas_variaveis - despesas_fixas - investimentos, 0)

    return {
        "despesas_variaveis": despesas_variaveis,
        "despesas_fixas": despesas_fixas,
        "investimentos": investimentos,
        "dinheiro_livre": dinheiro_livre,
    }

@router.get("/patrimonio")
def evolucao_patrimonio(db: Session = Depends(get_db)):
    transacoes = db.query(Transacao).order_by(Transacao.data).all()

    meses = {}
    for t in transacoes:
        chave = t.mes_referencia or t.data.strftime("%Y-%m")
        if chave not in meses:
            meses[chave] = {"receitas": 0, "despesas": 0, "investimentos": 0}
        if t.tipo == TipoTransacao.receita:
            meses[chave]["receitas"] += t.valor
        elif t.tipo == TipoTransacao.despesa:
            meses[chave]["despesas"] += t.valor
        elif t.tipo == TipoTransacao.investimento:
            meses[chave]["investimentos"] += t.valor

    resultado = []
    patrimonio_acumulado = 0.0
    for chave in sorted(meses.keys()):
        m = meses[chave]
        patrimonio_acumulado += m["investimentos"]
        resultado.append({
            "mes": chave,
            "patrimonio": round(patrimonio_acumulado, 2),
            "investido": round(m["investimentos"], 2),
            "saldo_livre": round(m["receitas"] - m["despesas"] - m["investimentos"], 2),
        })

    return resultado

@router.delete("/{id}")
def deletar_transacao(id: int, db: Session = Depends(get_db)):
    transacao = db.query(Transacao).filter(Transacao.id == id).first()
    if not transacao:
        raise HTTPException(status_code=404, detail="Transacao nao encontrada")

    if transacao.tipo == TipoTransacao.investimento and transacao.meta_id:
        meta = db.query(Meta).filter(Meta.id == transacao.meta_id).first()
        if meta:
            meta.valor_atual = max(0, meta.valor_atual - transacao.valor)
            meta.concluida = meta.valor_atual >= meta.valor_alvo

    db.delete(transacao)
    db.commit()
    return {"mensagem": "Transacao deletada com sucesso"}