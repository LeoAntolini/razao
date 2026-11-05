from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import extract
from app.database import get_db
from app.models.transacao import Transacao, TipoTransacao
from app.models.meta import Meta
from app.schemas.transacao import TransacaoCreate, TransacaoResponse
from app.auth import get_usuario_atual
from typing import List, Optional
from datetime import date, timedelta
import calendar

router = APIRouter()

def definir_status(data_transacao: date) -> str:
    return "agendado" if data_transacao > date.today() else "confirmado"

def gerar_transacoes_recorrentes(db: Session, transacao: Transacao, meses: int = 12):
    data_base = transacao.data
    for i in range(1, meses + 1):
        mes = (data_base.month + i - 1) % 12 + 1
        ano = data_base.year + (data_base.month + i - 1) // 12
        ultimo_dia = calendar.monthrange(ano, mes)[1]
        dia = min(data_base.day, ultimo_dia)
        nova_data = date(ano, mes, dia)
        mes_ref = f"{ano}-{str(mes).zfill(2)}"

        existe = db.query(Transacao).filter(
            Transacao.recorrente == True,
            Transacao.descricao == transacao.descricao,
            Transacao.mes_referencia == mes_ref,
            Transacao.categoria == transacao.categoria,
            Transacao.usuario_id == transacao.usuario_id,
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
            usuario_id=transacao.usuario_id,
            status=definir_status(nova_data),
        )
        db.add(nova)

def atualizar_status_agendados(db: Session, usuario_id: int):
    hoje = date.today()
    db.query(Transacao).filter(
        Transacao.usuario_id == usuario_id,
        Transacao.status == "agendado",
        Transacao.data <= hoje,
    ).update({"status": "confirmado"})
    db.commit()

# ─── ROTAS GET ESPECÍFICAS (devem vir ANTES de /{id}) ───

@router.get("/")
def listar_transacoes(
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    db: Session = Depends(get_db),
    usuario=Depends(get_usuario_atual)
):
    atualizar_status_agendados(db, usuario.id)
    query = db.query(Transacao).filter(Transacao.usuario_id == usuario.id)
    if mes and ano:
        mes_ref = f"{ano}-{str(mes).zfill(2)}"
        query = query.filter(Transacao.mes_referencia == mes_ref)
    elif mes:
        query = query.filter(extract('month', Transacao.data) == mes)
    elif ano:
        query = query.filter(extract('year', Transacao.data) == ano)
    return query.order_by(Transacao.data.desc()).all()

@router.get("/agendados")
def listar_agendados(db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    atualizar_status_agendados(db, usuario.id)
    return db.query(Transacao).filter(
        Transacao.usuario_id == usuario.id,
        Transacao.status == "agendado",
    ).order_by(Transacao.data.asc()).all()

@router.get("/resumo")
def resumo_mes(
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    incluir_agendados: bool = False,
    db: Session = Depends(get_db),
    usuario=Depends(get_usuario_atual)
):
    atualizar_status_agendados(db, usuario.id)
    query = db.query(Transacao).filter(
        Transacao.usuario_id == usuario.id,
    )
    if not incluir_agendados:
        query = query.filter(Transacao.status == "confirmado")
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

    if receitas > 0 and investimentos / receitas >= 0.20 and comprometimento < 50:
        saude = "excelente"
    elif receitas > 0 and investimentos / receitas >= 0.10:
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
        "sugestao_base": receitas,
        "sugestao": {
            "investimento": 0,
            "lazer": 0,
            "gastos_pessoais": 0,
        }
    }

@router.get("/grafico-pizza")
def grafico_pizza(
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    db: Session = Depends(get_db),
    usuario=Depends(get_usuario_atual)
):
    query = db.query(Transacao).filter(
        Transacao.usuario_id == usuario.id,
        Transacao.status == "confirmado",
    )
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
def evolucao_patrimonio(db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    transacoes = db.query(Transacao).filter(
        Transacao.usuario_id == usuario.id,
        Transacao.status == "confirmado",
    ).order_by(Transacao.data).all()

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

@router.get("/patrimonio-completo")
def patrimonio_completo(db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    from app.models.acao import Acao
    from app.models.renda_fixa import RendaFixa
    from app.models.meta import Meta

    metas = db.query(Meta).filter(
        Meta.usuario_id == usuario.id,
        Meta.status.in_(["ativa", "pausada", "concluida"])
    ).all()
    total_metas = sum(m.valor_atual for m in metas)

    acoes = db.query(Acao).filter(Acao.usuario_id == usuario.id).all()
    total_acoes = sum(a.quantidade * a.preco_pago for a in acoes)

    renda_fixa = db.query(RendaFixa).filter(RendaFixa.usuario_id == usuario.id).all()
    total_rf = sum(r.valor_investido for r in renda_fixa)

    total_geral = total_metas + total_acoes + total_rf

    return {
        "total_geral": round(total_geral, 2),
        "metas": round(total_metas, 2),
        "acoes": round(total_acoes, 2),
        "renda_fixa": round(total_rf, 2),
    }

@router.get("/patrimonio-grafico")
def patrimonio_grafico(db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    from app.models.acao import Acao
    from app.models.renda_fixa import RendaFixa

    meses = {}

    # Aportes em metas via transações
    transacoes = db.query(Transacao).filter(
        Transacao.usuario_id == usuario.id,
        Transacao.status == "confirmado",
        Transacao.tipo == TipoTransacao.investimento,
    ).all()
    for t in transacoes:
        chave = t.mes_referencia or t.data.strftime("%Y-%m")
        if chave not in meses:
            meses[chave] = {"metas": 0, "acoes": 0, "renda_fixa": 0}
        meses[chave]["metas"] += t.valor

    # Ações
    acoes = db.query(Acao).filter(Acao.usuario_id == usuario.id).all()
    for a in acoes:
        chave = a.data_compra.strftime("%Y-%m")
        if chave not in meses:
            meses[chave] = {"metas": 0, "acoes": 0, "renda_fixa": 0}
        meses[chave]["acoes"] += a.quantidade * a.preco_pago

    # Renda fixa
    rf = db.query(RendaFixa).filter(RendaFixa.usuario_id == usuario.id).all()
    for r in rf:
        chave = r.data_aplicacao.strftime("%Y-%m")
        if chave not in meses:
            meses[chave] = {"metas": 0, "acoes": 0, "renda_fixa": 0}
        meses[chave]["renda_fixa"] += r.valor_investido

    resultado = []
    acum_metas = acum_acoes = acum_rf = 0.0
    for chave in sorted(meses.keys()):
        m = meses[chave]
        acum_metas += m["metas"]
        acum_acoes += m["acoes"]
        acum_rf += m["renda_fixa"]
        total = acum_metas + acum_acoes + acum_rf
        resultado.append({
            "mes": chave,
            "patrimonio": round(total, 2),
            "metas": round(acum_metas, 2),
            "acoes": round(acum_acoes, 2),
            "renda_fixa": round(acum_rf, 2),
        })
    return resultado

@router.get("/investido-mes")
def investido_mes(
    mes: int,
    ano: int,
    db: Session = Depends(get_db),
    usuario=Depends(get_usuario_atual)
):
    from app.models.acao import Acao
    from app.models.renda_fixa import RendaFixa

    inicio = date(ano, mes, 1)
    fim = date(ano, mes, calendar.monthrange(ano, mes)[1])

    # Aportes em metas via transações
    transacoes = db.query(Transacao).filter(
        Transacao.usuario_id == usuario.id,
        Transacao.status == "confirmado",
        Transacao.tipo == TipoTransacao.investimento,
        Transacao.data >= inicio,
        Transacao.data <= fim,
    ).all()
    total_metas = sum(t.valor for t in transacoes)

    # Compras de ações no mês
    acoes = db.query(Acao).filter(
        Acao.usuario_id == usuario.id,
        Acao.data_compra >= inicio,
        Acao.data_compra <= fim,
    ).all()
    total_acoes = sum(a.quantidade * a.preco_pago for a in acoes)

    # Renda fixa aplicada no mês
    rf = db.query(RendaFixa).filter(
        RendaFixa.usuario_id == usuario.id,
        RendaFixa.data_aplicacao >= inicio,
        RendaFixa.data_aplicacao <= fim,
    ).all()
    total_rf = sum(r.valor_investido for r in rf)

    total = total_metas + total_acoes + total_rf
    return {
        "total": round(total, 2),
        "metas": round(total_metas, 2),
        "acoes": round(total_acoes, 2),
        "renda_fixa": round(total_rf, 2),
    }

# ─── POST ───

@router.post("/", response_model=TransacaoResponse)
def criar_transacao(
    transacao: TransacaoCreate,
    db: Session = Depends(get_db),
    usuario=Depends(get_usuario_atual)
):
    mes_ref = transacao.data.strftime("%Y-%m")
    dados = transacao.model_dump()
    dados['mes_referencia'] = mes_ref
    dados['usuario_id'] = usuario.id
    dados['status'] = definir_status(transacao.data)

    db_transacao = Transacao(**dados)
    db.add(db_transacao)

    if transacao.tipo == TipoTransacao.investimento and transacao.meta_id and dados['status'] == 'confirmado':
        meta = db.query(Meta).filter(Meta.id == transacao.meta_id, Meta.usuario_id == usuario.id).first()
        if meta:
            meta.valor_atual += transacao.valor
            if meta.valor_atual >= meta.valor_alvo:
                meta.concluida = True
                meta.status = "concluida"

    db.commit()
    db.refresh(db_transacao)

    if transacao.tipo == TipoTransacao.despesa and transacao.subtipo == "fixa" and dados['status'] == 'confirmado':
        gerar_transacoes_recorrentes(db, db_transacao, meses=12)
        db.commit()

    if transacao.tipo == TipoTransacao.despesa and transacao.subtipo == "fixa_parcelada" and transacao.total_parcelas and dados['status'] == 'confirmado':
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
                usuario_id=usuario.id,
                status=definir_status(nova_data),
            )
            db.add(parcela)
        db.commit()

    return db_transacao

# ─── PUT e DELETE (/{id} deve vir por ÚLTIMO) ───

@router.put("/{id}", response_model=TransacaoResponse)
def atualizar_transacao(
    id: int,
    transacao: TransacaoCreate,
    db: Session = Depends(get_db),
    usuario=Depends(get_usuario_atual)
):
    db_transacao = db.query(Transacao).filter(Transacao.id == id, Transacao.usuario_id == usuario.id).first()
    if not db_transacao:
        raise HTTPException(status_code=404, detail="Transacao nao encontrada")

    if db_transacao.tipo == TipoTransacao.investimento and db_transacao.meta_id and db_transacao.status == 'confirmado':
        meta = db.query(Meta).filter(Meta.id == db_transacao.meta_id).first()
        if meta:
            meta.valor_atual = max(0, meta.valor_atual - db_transacao.valor)
            meta.concluida = meta.valor_atual >= meta.valor_alvo

    for key, value in transacao.model_dump().items():
        setattr(db_transacao, key, value)
    db_transacao.mes_referencia = transacao.data.strftime("%Y-%m")
    db_transacao.usuario_id = usuario.id
    db_transacao.status = definir_status(transacao.data)

    if transacao.tipo == TipoTransacao.investimento and transacao.meta_id and db_transacao.status == 'confirmado':
        meta = db.query(Meta).filter(Meta.id == transacao.meta_id).first()
        if meta:
            meta.valor_atual += transacao.valor
            if meta.valor_atual >= meta.valor_alvo:
                meta.concluida = True
                meta.status = "concluida"

    db.commit()
    db.refresh(db_transacao)
    return db_transacao

@router.delete("/{id}")
def deletar_transacao(
    id: int,
    db: Session = Depends(get_db),
    usuario=Depends(get_usuario_atual)
):
    transacao = db.query(Transacao).filter(Transacao.id == id, Transacao.usuario_id == usuario.id).first()
    if not transacao:
        raise HTTPException(status_code=404, detail="Transacao nao encontrada")

    if transacao.tipo == TipoTransacao.investimento and transacao.meta_id and transacao.status == 'confirmado':
        meta = db.query(Meta).filter(Meta.id == transacao.meta_id, Meta.usuario_id == usuario.id).first()
        if meta:
            meta.valor_atual = max(0, meta.valor_atual - transacao.valor)
            meta.concluida = meta.valor_atual >= meta.valor_alvo

    db.delete(transacao)
    db.commit()
    return {"mensagem": "Transacao deletada com sucesso"}