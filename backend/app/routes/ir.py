from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_usuario_atual
from app.models.acao import Acao
from app.models.renda_fixa import RendaFixa
from app.models.transacao import Transacao, TipoTransacao
from app.custodiantes import get_custodiante
from datetime import date

router = APIRouter()

# Grupos e códigos da declaração da Receita Federal
CODIGOS_ACOES = {
    "acao": {"grupo": "03", "codigo": "01", "descricao": "Ações (inclusive as listadas em bolsa)"},
    "fii": {"grupo": "07", "codigo": "03", "descricao": "Fundos de Investimento Imobiliário (FII)"},
    "etf": {"grupo": "07", "codigo": "06", "descricao": "ETF - Fundo de Índice de Ações"},
    "bdr": {"grupo": "03", "codigo": "04", "descricao": "BDR - Brazilian Depositary Receipt"},
}

CODIGOS_RENDA_FIXA = {
    "cdb": {"grupo": "04", "codigo": "01", "descricao": "Depósito em conta poupança e aplicações"},
    "tesouro": {"grupo": "04", "codigo": "02", "descricao": "Títulos públicos (Tesouro Direto)"},
    "lci": {"grupo": "04", "codigo": "03", "descricao": "LCI - Letra de Crédito Imobiliário"},
    "lca": {"grupo": "04", "codigo": "04", "descricao": "LCA - Letra de Crédito do Agronegócio"},
    "debenture": {"grupo": "04", "codigo": "05", "descricao": "Debêntures"},
    "cri": {"grupo": "04", "codigo": "06", "descricao": "CRI - Certificado de Recebíveis Imobiliários"},
    "cra": {"grupo": "04", "codigo": "07", "descricao": "CRA - Certificado de Recebíveis do Agronegócio"},
    "outro": {"grupo": "04", "codigo": "99", "descricao": "Outras aplicações"},
}

LIMITE_RENDA_TRIBUTAVEL = 35584.00
LIMITE_OPERACOES_BOLSA = 40000.00
LIMITE_RENDIMENTOS_ISENTOS = 200000.00
ISENCAO_MENSAL_ACOES = 20000.00

@router.get("/bens-direitos/{ano}")
def relatorio_bens_direitos(ano: int, db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    # Data de referência: 31/12 do ano informado
    data_ref = date(ano, 12, 31)

    # Ações — consolida carteira até 31/12 do ano
    acoes = db.query(Acao).filter(
        Acao.usuario_id == usuario.id,
        Acao.data_compra <= data_ref
    ).all()

    carteira = {}
    for a in acoes:
        t = a.ticker.upper()
        if t not in carteira:
            carteira[t] = {"quantidade": 0, "total_investido": 0, "tipo": a.tipo}
        carteira[t]["quantidade"] += a.quantidade
        carteira[t]["total_investido"] += a.quantidade * a.preco_pago

    bens_acoes = []
    for ticker, dados in carteira.items():
        if dados["quantidade"] <= 0:
            continue
        preco_medio = dados["total_investido"] / dados["quantidade"]
        valor_declarar = round(preco_medio * dados["quantidade"], 2)
        custodiante = get_custodiante(ticker)
        codigo_ir = CODIGOS_ACOES.get(dados["tipo"], CODIGOS_ACOES["acao"])

        bens_acoes.append({
            "tipo": "acao",
            "ticker": ticker,
            "tipo_ativo": dados["tipo"].upper(),
            "quantidade": dados["quantidade"],
            "preco_medio": round(preco_medio, 4),
            "valor_declarar": valor_declarar,
            "custodiante_nome": custodiante["nome"],
            "custodiante_cnpj": custodiante["cnpj"],
            "grupo_ir": codigo_ir["grupo"],
            "codigo_ir": codigo_ir["codigo"],
            "descricao_ir": codigo_ir["descricao"],
            "discriminacao": f"{dados['quantidade']} {dados['tipo'].upper()}(S) de {ticker} - Custo médio: R$ {preco_medio:.4f} - Custodiante: {custodiante['nome']} - CNPJ: {custodiante['cnpj']}",
        })

    # Renda fixa até 31/12 do ano
    renda_fixa = db.query(RendaFixa).filter(
        RendaFixa.usuario_id == usuario.id,
        RendaFixa.data_aplicacao <= data_ref
    ).all()

    bens_rf = []
    for rf in renda_fixa:
        # Verifica se venceu antes de 31/12
        if rf.data_vencimento and rf.data_vencimento < data_ref:
            continue
        codigo_ir = CODIGOS_RENDA_FIXA.get(rf.tipo, CODIGOS_RENDA_FIXA["outro"])
        bens_rf.append({
            "tipo": "renda_fixa",
            "instituicao": rf.instituicao,
            "tipo_ativo": rf.tipo.upper(),
            "valor_declarar": rf.valor_investido,
            "taxa": rf.taxa,
            "grupo_ir": codigo_ir["grupo"],
            "codigo_ir": codigo_ir["codigo"],
            "descricao_ir": codigo_ir["descricao"],
            "discriminacao": f"{codigo_ir['descricao']} - {rf.instituicao} - Taxa: {rf.taxa or 'não informada'} - Aplicado em: {rf.data_aplicacao.strftime('%d/%m/%Y')}",
        })

    total_acoes = sum(b["valor_declarar"] for b in bens_acoes)
    total_rf = sum(b["valor_declarar"] for b in bens_rf)

    return {
        "ano": ano,
        "data_referencia": data_ref.isoformat(),
        "acoes": bens_acoes,
        "renda_fixa": bens_rf,
        "total_acoes": round(total_acoes, 2),
        "total_renda_fixa": round(total_rf, 2),
        "total_geral": round(total_acoes + total_rf, 2),
    }

@router.get("/resumo-anual/{ano}")
def resumo_anual(ano: int, db: Session = Depends(get_db), usuario=Depends(get_usuario_atual)):
    inicio = date(ano, 1, 1)
    fim = date(ano, 12, 31)

    transacoes = db.query(Transacao).filter(
        Transacao.usuario_id == usuario.id,
        Transacao.data >= inicio,
        Transacao.data <= fim,
    ).all()

    receitas = sum(t.valor for t in transacoes if t.tipo == TipoTransacao.receita)
    despesas = sum(t.valor for t in transacoes if t.tipo == TipoTransacao.despesa)
    investimentos = sum(t.valor for t in transacoes if t.tipo == TipoTransacao.investimento)

    # Receitas por categoria
    receitas_por_categoria = {}
    for t in transacoes:
        if t.tipo == TipoTransacao.receita:
            cat = t.categoria or "Outros"
            receitas_por_categoria[cat] = receitas_por_categoria.get(cat, 0) + t.valor

    # Verifica obrigatoriedade
    obrigatorio = False
    motivos = []

    if receitas >= LIMITE_RENDA_TRIBUTAVEL:
        obrigatorio = True
        motivos.append(f"Rendimentos tributáveis acima de R$ {LIMITE_RENDA_TRIBUTAVEL:,.2f}")

    # Verifica operações na bolsa
    acoes_ano = db.query(Acao).filter(
        Acao.usuario_id == usuario.id,
        Acao.data_compra >= inicio,
        Acao.data_compra <= fim,
    ).all()
    total_bolsa = sum(a.quantidade * a.preco_pago for a in acoes_ano)
    if total_bolsa >= LIMITE_OPERACOES_BOLSA:
        obrigatorio = True
        motivos.append(f"Operações na Bolsa acima de R$ {LIMITE_OPERACOES_BOLSA:,.2f}")

    # Verifica bens e direitos
    todas_acoes = db.query(Acao).filter(Acao.usuario_id == usuario.id).all()
    total_patrimonio = sum(a.quantidade * a.preco_pago for a in todas_acoes)
    rf = db.query(RendaFixa).filter(RendaFixa.usuario_id == usuario.id).all()
    total_patrimonio += sum(r.valor_investido for r in rf)

    dicas = [
        "Guarde todos os informes de rendimentos enviados por bancos e corretoras em março/abril.",
        "Use a declaração pré-preenchida da Receita Federal para importar dados automaticamente.",
        "Revise o preço médio das suas ações — o sistema calcula automaticamente com base nas suas compras.",
        "LCI e LCA são isentos de IR — informe-os em Bens e Direitos mas não pague imposto sobre eles.",
        f"Vendas de ações abaixo de R$ {ISENCAO_MENSAL_ACOES:,.0f}/mês são isentas de IR (operações comuns).",
    ]

    return {
        "ano": ano,
        "receitas_total": round(receitas, 2),
        "despesas_total": round(despesas, 2),
        "investimentos_total": round(investimentos, 2),
        "receitas_por_categoria": receitas_por_categoria,
        "total_operacoes_bolsa": round(total_bolsa, 2),
        "total_patrimonio_estimado": round(total_patrimonio, 2),
        "obrigatorio_declarar": obrigatorio,
        "motivos_obrigatoriedade": motivos,
        "limites": {
            "renda_tributavel": LIMITE_RENDA_TRIBUTAVEL,
            "operacoes_bolsa": LIMITE_OPERACOES_BOLSA,
            "rendimentos_isentos": LIMITE_RENDIMENTOS_ISENTOS,
            "isencao_mensal_acoes": ISENCAO_MENSAL_ACOES,
        },
        "dicas": dicas,
    }