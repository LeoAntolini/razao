import { useEffect, useState } from 'react'
import api from '../services/api'
import { useWindowSize } from '../useWindowSize'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const ANO_ATUAL = new Date().getFullYear()
const ANOS = [ANO_ATUAL - 1, ANO_ATUAL - 2, ANO_ATUAL - 3]

const TOOLTIPS = {
  bens_direitos: 'Na declaração do IR, você deve informar todos os bens e investimentos pelo custo de aquisição histórico — nunca pelo valor de mercado atual.',
  preco_medio: 'O preço médio ponderado de todas as suas compras. É exatamente este valor que você deve informar na ficha de Bens e Direitos da declaração.',
  custodiante: 'Banco responsável pela custódia das suas ações. Obrigatório informar na declaração junto com o CNPJ.',
  grupo_codigo: 'Grupo e código usados para preencher a ficha de Bens e Direitos no programa da Receita Federal (IRPF).',
  isencao: 'Vendas de ações abaixo de R$ 20.000/mês em operações comuns são isentas de IR sobre o ganho de capital.',
  lci_lca: 'LCI e LCA são isentos de IR para pessoa física. Devem ser informados em Bens e Direitos mas não geram imposto a pagar.',
}

function InfoTooltip({ texto }) {
  const [hover, setHover] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-block', marginLeft: '6px' }}>
      <span onClick={() => setHover(!hover)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{ cursor: 'help', color: '#6B6B8A', fontSize: '11px', border: '1px solid #2D2D42', borderRadius: '50%', width: '15px', height: '15px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle' }}>?</span>
      {hover && (
        <span style={{ position: 'absolute', bottom: '22px', left: '0', background: '#1E1E2E', border: '1px solid #2D2D42', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#A0A0C0', width: '220px', zIndex: 100, lineHeight: '1.6' }}>
          {texto}
        </span>
      )}
    </span>
  )
}

function ImpostoRenda() {
  const [ano, setAno] = useState(ANO_ATUAL - 1)
  const [bens, setBens] = useState(null)
  const [resumo, setResumo] = useState(null)
  const [aba, setAba] = useState('resumo')
  const [loading, setLoading] = useState(false)
  const { isMobile } = useWindowSize()

  const carregar = async () => {
    setLoading(true)
    try {
      const [b, r] = await Promise.all([
        api.get(`/ir/bens-direitos/${ano}`),
        api.get(`/ir/resumo-anual/${ano}`),
      ])
      setBens(b.data)
      setResumo(r.data)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => { carregar() }, [ano])

  const fmt = (v) => `R$ ${(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const padding = isMobile ? '16px' : '32px'

  const gerarPDF = () => {
    if (!bens || !resumo) return
    const doc = new jsPDF()

    // Cabeçalho
    doc.setFontSize(20)
    doc.setTextColor(124, 58, 237)
    doc.text('Razão — Relatório de IR', 14, 20)
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`Ano-base: ${ano} | Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28)

    let y = 38

    // Resumo anual
    doc.setFontSize(13)
    doc.setTextColor(30)
    doc.text('1. Resumo Anual', 14, y)
    y += 8

    autoTable(doc, {
      startY: y,
      head: [['Item', 'Valor']],
      body: [
        ['Total de Receitas', fmt(resumo.receitas_total)],
        ['Total de Despesas', fmt(resumo.despesas_total)],
        ['Total Investido', fmt(resumo.investimentos_total)],
        ['Operações na Bolsa', fmt(resumo.total_operacoes_bolsa)],
        ['Patrimônio estimado', fmt(resumo.total_patrimonio_estimado)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [124, 58, 237] },
    })

    y = doc.lastAutoTable.finalY + 10

    // Obrigatoriedade
    doc.setFontSize(13)
    doc.setTextColor(30)
    doc.text('2. Obrigatoriedade de Declaração', 14, y)
    y += 8

    doc.setFontSize(11)
    doc.setTextColor(resumo.obrigatorio_declarar ? [220, 38, 38] : [34, 197, 94])
    doc.text(resumo.obrigatorio_declarar ? '⚠ Obrigado a declarar' : '✓ Não obrigado (verifique outros critérios)', 14, y)
    y += 8

    if (resumo.motivos_obrigatoriedade.length > 0) {
      doc.setTextColor(100)
      doc.setFontSize(10)
      resumo.motivos_obrigatoriedade.forEach(m => {
        doc.text(`• ${m}`, 18, y)
        y += 6
      })
    }
    y += 4

    // Ações
    if (bens.acoes.length > 0) {
      doc.setFontSize(13)
      doc.setTextColor(30)
      doc.text('3. Bens e Direitos — Ações / FIIs / ETFs', 14, y)
      y += 8

      autoTable(doc, {
        startY: y,
        head: [['Ticker', 'Tipo', 'Qtd.', 'Preço Médio', 'Valor a Declarar', 'Grupo/Cód.', 'Custodiante']],
        body: bens.acoes.map(a => [
          a.ticker,
          a.tipo_ativo,
          a.quantidade,
          fmt(a.preco_medio),
          fmt(a.valor_declarar),
          `${a.grupo_ir}/${a.codigo_ir}`,
          `${a.custodiante_nome}\n${a.custodiante_cnpj}`,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [124, 58, 237] },
        styles: { fontSize: 8 },
        columnStyles: { 6: { cellWidth: 45 } },
      })

      y = doc.lastAutoTable.finalY + 6
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Total Ações/FIIs/ETFs: ${fmt(bens.total_acoes)}`, 14, y)
      y += 10
    }

    // Renda fixa
    if (bens.renda_fixa.length > 0) {
      doc.setFontSize(13)
      doc.setTextColor(30)
      doc.text('4. Bens e Direitos — Renda Fixa', 14, y)
      y += 8

      autoTable(doc, {
        startY: y,
        head: [['Instituição', 'Tipo', 'Valor', 'Taxa', 'Grupo/Cód.', 'Obs.']],
        body: bens.renda_fixa.map(r => [
          r.instituicao,
          r.tipo_ativo,
          fmt(r.valor_declarar),
          r.taxa || '—',
          `${r.grupo_ir}/${r.codigo_ir}`,
          r.tipo_ativo === 'LCI' || r.tipo_ativo === 'LCA' ? 'ISENTO de IR' : 'IR retido na fonte',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [52, 211, 153], textColor: [0, 0, 0] },
        styles: { fontSize: 9 },
      })

      y = doc.lastAutoTable.finalY + 6
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Total Renda Fixa: ${fmt(bens.total_renda_fixa)}`, 14, y)
      y += 6
      doc.text(`Total Geral a Declarar: ${fmt(bens.total_geral)}`, 14, y)
      y += 10
    }

    // Dicas
    if (resumo.dicas?.length > 0) {
      if (y > 240) { doc.addPage(); y = 20 }
      doc.setFontSize(13)
      doc.setTextColor(30)
      doc.text('5. Dicas importantes', 14, y)
      y += 8
      doc.setFontSize(9)
      doc.setTextColor(100)
      resumo.dicas.forEach(d => {
        const lines = doc.splitTextToSize(`• ${d}`, 180)
        doc.text(lines, 14, y)
        y += lines.length * 5 + 2
      })
    }

    doc.save(`Razao-IR-${ano}.pdf`)
  }

  return (
    <div style={{ padding, maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '700', color: '#E8E8F0', letterSpacing: '-0.5px' }}>
            Imposto de Renda
          </h1>
          <p style={{ color: '#6B6B8A', fontSize: '13px', marginTop: '4px' }}>
            Relatório para auxiliar na sua declaração anual
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={ano} onChange={e => setAno(parseInt(e.target.value))} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #2D2D42', background: '#0F0F14', color: '#E8E8F0', fontSize: '14px', cursor: 'pointer' }}>
            {ANOS.map(a => <option key={a} value={a}>Ano-base {a}</option>)}
          </select>
          <button onClick={gerarPDF} disabled={!bens || !resumo} style={{
            background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', color: '#fff',
            border: 'none', borderRadius: '10px', padding: '9px 18px',
            fontSize: '13px', fontWeight: '600', cursor: 'pointer',
            opacity: !bens || !resumo ? 0.5 : 1,
          }}>
            📄 Exportar PDF
          </button>
        </div>
      </div>

      {/* Aviso */}
      <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px', fontSize: '13px', color: '#FBBF24', display: 'flex', gap: '8px' }}>
        <span>⚠️</span>
        <span>
          Este relatório é um <strong>auxílio</strong> para sua declaração. Sempre confira os valores com os informes de rendimentos enviados pelas instituições financeiras e, se necessário, consulte um contador.
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6B6B8A' }}>Carregando dados do ano-base {ano}...</div>
      ) : (
        <>
          {/* Obrigatoriedade */}
          {resumo && (
            <div style={{
              background: resumo.obrigatorio_declarar ? 'rgba(248,113,113,0.08)' : 'rgba(52,211,153,0.08)',
              border: `1px solid ${resumo.obrigatorio_declarar ? 'rgba(248,113,113,0.3)' : 'rgba(52,211,153,0.3)'}`,
              borderRadius: '16px', padding: '16px 20px', marginBottom: '20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: resumo.obrigatorio_declarar ? '#F87171' : '#34D399', marginBottom: '4px' }}>
                  {resumo.obrigatorio_declarar ? '⚠️ Você pode ser obrigado a declarar o IR' : '✓ Pelos dados registrados, você pode não ser obrigado a declarar'}
                </div>
                {resumo.motivos_obrigatoriedade.length > 0 && (
                  <div style={{ fontSize: '12px', color: '#A0A0C0' }}>
                    {resumo.motivos_obrigatoriedade.map((m, i) => <div key={i}>• {m}</div>)}
                  </div>
                )}
                {!resumo.obrigatorio_declarar && (
                  <div style={{ fontSize: '12px', color: '#6B6B8A', marginTop: '4px' }}>
                    Verifique também outros critérios: rendimentos isentos acima de R$ 200 mil, ganho de capital, bens acima de R$ 800 mil.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Abas */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {[
              { key: 'resumo', label: '📊 Resumo do ano' },
              { key: 'acoes', label: `📈 Ações/FIIs/ETFs (${bens?.acoes?.length ?? 0})` },
              { key: 'renda_fixa', label: `💰 Renda Fixa (${bens?.renda_fixa?.length ?? 0})` },
              { key: 'dicas', label: '💡 Dicas' },
            ].map(a => (
              <button key={a.key} onClick={() => setAba(a.key)} style={{
                padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: aba === a.key ? '600' : '400',
                background: aba === a.key ? 'rgba(167,139,250,0.15)' : '#1E1E2E',
                color: aba === a.key ? '#A78BFA' : '#6B6B8A',
                flex: isMobile ? '1' : 'none',
              }}>{a.label}</button>
            ))}
          </div>

          {/* Aba Resumo */}
          {aba === 'resumo' && resumo && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { label: 'Receitas no ano', valor: resumo.receitas_total, cor: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.15)', tooltip: 'Total de receitas registradas no sistema durante o ano.' },
                  { label: 'Despesas no ano', valor: resumo.despesas_total, cor: '#F87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.15)', tooltip: 'Total de despesas registradas.' },
                  { label: 'Investido no ano', valor: resumo.investimentos_total, cor: '#A78BFA', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.15)', tooltip: 'Total aportado em metas durante o ano.' },
                  { label: 'Operações na Bolsa', valor: resumo.total_operacoes_bolsa, cor: '#FBBF24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.15)', tooltip: 'Total de compras de ações/FIIs/ETFs no ano. Acima de R$ 40 mil obriga declaração.' },
                  { label: 'Patrimônio estimado', valor: resumo.total_patrimonio_estimado, cor: '#A78BFA', bg: 'rgba(167,139,250,0.06)', border: 'rgba(167,139,250,0.1)', tooltip: 'Estimativa do patrimônio total em ações e renda fixa.' },
                ].map(card => (
                  <div key={card.label} style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: '14px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '11px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', display: 'flex', alignItems: 'center' }}>
                      {card.label} <InfoTooltip texto={card.tooltip} />
                    </div>
                    <div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '700', color: card.cor }}>{fmt(card.valor)}</div>
                  </div>
                ))}
              </div>

              {/* Limites legais */}
              <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '20px' }}>
                <div style={{ fontSize: '13px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
                  Limites legais {ano}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: 'Renda tributável para obrigar declaração', limite: resumo.limites.renda_tributavel, atual: resumo.receitas_total, tooltip: 'Se suas receitas tributáveis superarem esse valor, você é obrigado a declarar.' },
                    { label: 'Operações na Bolsa para obrigar declaração', limite: resumo.limites.operacoes_bolsa, atual: resumo.total_operacoes_bolsa, tooltip: 'Se comprou/vendeu mais que isso na Bolsa durante o ano, deve declarar.' },
                    { label: 'Isenção mensal em venda de ações', limite: resumo.limites.isencao_mensal_acoes, atual: null, tooltip: 'Vendas de ações abaixo desse valor por mês são isentas de IR sobre o ganho.' },
                  ].map(item => {
                    const pct = item.atual !== null ? Math.min((item.atual / item.limite) * 100, 100) : null
                    const atingiu = item.atual !== null && item.atual >= item.limite
                    return (
                      <div key={item.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
                          <span style={{ fontSize: '13px', color: '#A0A0C0', display: 'flex', alignItems: 'center' }}>
                            {item.label} <InfoTooltip texto={item.tooltip} />
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: atingiu ? '#F87171' : '#34D399' }}>
                            {item.atual !== null ? `${fmt(item.atual)} / ${fmt(item.limite)}` : fmt(item.limite)}
                          </span>
                        </div>
                        {pct !== null && (
                          <div style={{ background: '#1E1E2E', borderRadius: '4px', height: '6px' }}>
                            <div style={{ width: `${pct}%`, background: atingiu ? '#F87171' : '#34D399', height: '6px', borderRadius: '4px' }} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Aba Ações */}
          {aba === 'acoes' && bens && (
            <div>
              <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#A78BFA', display: 'flex', gap: '8px' }}>
                <span>💡</span>
                <span>
                  Informe estes valores na ficha <strong>Bens e Direitos</strong> da declaração. Use sempre o custo de aquisição histórico — nunca o valor de mercado atual.
                  <InfoTooltip texto={TOOLTIPS.bens_direitos} />
                </span>
              </div>

              {bens.acoes.length === 0 ? (
                <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '48px', textAlign: 'center', color: '#6B6B8A', fontSize: '14px' }}>
                  Nenhuma ação registrada até 31/12/{ano}
                </div>
              ) : (
                <div>
                  {isMobile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {bens.acoes.map(a => (
                        <div key={a.ticker} style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ fontWeight: '800', color: '#E8E8F0', fontSize: '16px' }}>{a.ticker}</span>
                            <span style={{ fontSize: '15px', fontWeight: '700', color: '#A78BFA' }}>{fmt(a.valor_declarar)}</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                            <div><span style={{ color: '#6B6B8A' }}>Quantidade: </span><span style={{ color: '#E8E8F0' }}>{a.quantidade}</span></div>
                            <div><span style={{ color: '#6B6B8A' }}>Preço médio: </span><span style={{ color: '#E8E8F0' }}>{fmt(a.preco_medio)}</span></div>
                            <div><span style={{ color: '#6B6B8A' }}>Grupo/Cód: </span><span style={{ color: '#FBBF24' }}>{a.grupo_ir}/{a.codigo_ir}</span></div>
                            <div><span style={{ color: '#6B6B8A' }}>Tipo: </span><span style={{ color: '#E8E8F0' }}>{a.tipo_ativo}</span></div>
                          </div>
                          <div style={{ marginTop: '10px', fontSize: '12px', color: '#6B6B8A', background: '#0F0F14', borderRadius: '8px', padding: '8px' }}>
                            <strong style={{ color: '#A0A0C0' }}>Discriminação:</strong>
                            <div style={{ marginTop: '4px', lineHeight: '1.5' }}>{a.discriminacao}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #1E1E2E' }}>
                            {['Ticker', 'Tipo', 'Qtd.', 'Preço médio', 'Valor a declarar', 'Grupo/Cód.', 'Custodiante'].map(h => (
                              <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {bens.acoes.map((a, i) => (
                            <tr key={a.ticker} style={{ borderTop: i === 0 ? 'none' : '1px solid #1E1E2E' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#16161F'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <td style={{ padding: '14px 16px', fontWeight: '800', color: '#E8E8F0', fontSize: '14px', letterSpacing: '1px' }}>{a.ticker}</td>
                              <td style={tdStyle}>{a.tipo_ativo}</td>
                              <td style={tdStyle}>{a.quantidade}</td>
                              <td style={{ ...tdStyle, fontWeight: '600', color: '#E8E8F0' }}>
                                {fmt(a.preco_medio)} <InfoTooltip texto={TOOLTIPS.preco_medio} />
                              </td>
                              <td style={{ ...tdStyle, fontWeight: '700', color: '#A78BFA' }}>{fmt(a.valor_declarar)}</td>
                              <td style={{ ...tdStyle, color: '#FBBF24', fontWeight: '600' }}>
                                {a.grupo_ir}/{a.codigo_ir} <InfoTooltip texto={TOOLTIPS.grupo_codigo} />
                              </td>
                              <td style={{ padding: '14px 16px', fontSize: '12px', color: '#A0A0C0' }}>
                                {a.custodiante_nome} <InfoTooltip texto={TOOLTIPS.custodiante} />
                                <div style={{ fontSize: '11px', color: '#6B6B8A', fontFamily: 'monospace' }}>{a.custodiante_cnpj}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: '2px solid #2D2D42', background: '#0F0F14' }}>
                            <td colSpan={4} style={{ padding: '14px 16px', fontSize: '13px', color: '#6B6B8A', fontWeight: '600' }}>Total Ações/FIIs/ETFs</td>
                            <td style={{ padding: '14px 16px', fontSize: '16px', fontWeight: '800', color: '#A78BFA' }}>{fmt(bens.total_acoes)}</td>
                            <td colSpan={2} />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* Discriminação para copiar */}
                  <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '20px', marginTop: '16px' }}>
                    <div style={{ fontSize: '13px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>
                      Texto para copiar na ficha de Bens e Direitos
                    </div>
                    {bens.acoes.map(a => (
                      <div key={a.ticker} style={{ marginBottom: '12px', background: '#0F0F14', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ fontSize: '12px', color: '#FBBF24', fontWeight: '600', marginBottom: '4px' }}>
                          {a.ticker} — Grupo {a.grupo_ir}, Código {a.codigo_ir}
                        </div>
                        <div style={{ fontSize: '12px', color: '#A0A0C0', lineHeight: '1.6' }}>{a.discriminacao}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Aba Renda Fixa */}
          {aba === 'renda_fixa' && bens && (
            <div>
              <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#34D399', display: 'flex', gap: '8px' }}>
                <span>💡</span>
                <span>
                  LCI e LCA são <strong>isentos de IR</strong> para pessoa física — informe em Bens e Direitos mas não há imposto a pagar.
                  <InfoTooltip texto={TOOLTIPS.lci_lca} />
                  CDB e Tesouro têm IR retido automaticamente na fonte com alíquota regressiva (22,5% a 15%).
                </span>
              </div>

              {bens.renda_fixa.length === 0 ? (
                <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '48px', textAlign: 'center', color: '#6B6B8A', fontSize: '14px' }}>
                  Nenhuma aplicação de renda fixa registrada até 31/12/{ano}
                </div>
              ) : (
                <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1E1E2E' }}>
                        {['Instituição', 'Tipo', 'Valor', 'Taxa', 'Grupo/Cód.', 'IR'].map(h => (
                          <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bens.renda_fixa.map((r, i) => {
                        const isento = r.tipo_ativo === 'LCI' || r.tipo_ativo === 'LCA'
                        return (
                          <tr key={i} style={{ borderTop: i === 0 ? 'none' : '1px solid #1E1E2E' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#16161F'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ ...tdStyle, fontWeight: '600', color: '#E8E8F0' }}>{r.instituicao}</td>
                            <td style={tdStyle}>{r.tipo_ativo}</td>
                            <td style={{ ...tdStyle, fontWeight: '700', color: '#34D399' }}>{fmt(r.valor_declarar)}</td>
                            <td style={{ ...tdStyle, color: '#FBBF24' }}>{r.taxa || '—'}</td>
                            <td style={{ ...tdStyle, color: '#FBBF24', fontWeight: '600' }}>{r.grupo_ir}/{r.codigo_ir}</td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ background: isento ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)', color: isento ? '#34D399' : '#FBBF24', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px' }}>
                                {isento ? 'ISENTO' : 'Retido na fonte'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid #2D2D42', background: '#0F0F14' }}>
                        <td colSpan={2} style={{ padding: '14px 16px', fontSize: '13px', color: '#6B6B8A', fontWeight: '600' }}>Total Renda Fixa</td>
                        <td style={{ padding: '14px 16px', fontSize: '16px', fontWeight: '800', color: '#34D399' }}>{fmt(bens.total_renda_fixa)}</td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Aba Dicas */}
          {aba === 'dicas' && resumo && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '20px' }}>
                <div style={{ fontSize: '13px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
                  Dicas para sua declaração
                </div>
                {resumo.dicas.map((d, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', padding: '12px 0', borderBottom: i < resumo.dicas.length - 1 ? '1px solid #1E1E2E' : 'none' }}>
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>💡</span>
                    <span style={{ fontSize: '14px', color: '#A0A0C0', lineHeight: '1.6' }}>{d}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '16px', padding: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#A78BFA', marginBottom: '8px' }}>📋 Checklist antes de declarar</div>
                {[
                  'Baixar o programa IRPF da Receita Federal (disponível em março/abril)',
                  'Reunir todos os informes de rendimentos (bancos, corretoras, empregador)',
                  'Conferir o preço médio das ações com os dados deste relatório',
                  'Verificar os informes de rendimentos de renda fixa para o IR retido na fonte',
                  'Usar a declaração pré-preenchida do Gov.br para importar dados automaticamente',
                  'Revisar e confrontar os valores antes de transmitir',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: i < 5 ? '1px solid #1E1E2E' : 'none', alignItems: 'flex-start' }}>
                    <span style={{ color: '#A78BFA', fontWeight: '700', flexShrink: 0 }}>{i + 1}.</span>
                    <span style={{ fontSize: '13px', color: '#A0A0C0' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const tdStyle = { padding: '14px 16px', fontSize: '14px', color: '#A0A0C0' }

export default ImpostoRenda