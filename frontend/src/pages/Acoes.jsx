import { useEffect, useState } from 'react'
import api from '../services/api'
import { useWindowSize } from '../useWindowSize'

const TIPOS = ['acao', 'fii', 'etf', 'bdr']
const TIPO_LABEL = { acao: 'Ação', fii: 'FII', etf: 'ETF', bdr: 'BDR' }
const TIPO_COR = { acao: '#A78BFA', fii: '#34D399', etf: '#FBBF24', bdr: '#F87171' }
const TIPO_BG = { acao: 'rgba(167,139,250,0.1)', fii: 'rgba(52,211,153,0.1)', etf: 'rgba(251,191,36,0.1)', bdr: 'rgba(248,113,113,0.1)' }

const TOOLTIPS = {
  ticker: 'Código do ativo na B3. Ex: PETR4, HGLG11, BOVA11, AAPL34.',
  tipo: 'Ação: empresas da bolsa. FII: fundos imobiliários. ETF: fundos de índice. BDR: ações estrangeiras negociadas no Brasil.',
  quantidade: 'Quantidade de ações/cotas compradas nessa operação.',
  preco_pago: 'Valor pago por unidade nessa compra. O sistema calcula o preço médio automaticamente.',
  preco_medio: 'Média ponderada de todos os preços pagos por esse ativo. É o valor usado na declaração do IR.',
  custodiante: 'Banco responsável pela custódia das suas ações. Necessário para declarar no Imposto de Renda.',
}

function InfoTooltip({ texto }) {
  const [hover, setHover] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-block', marginLeft: '6px' }}>
      <span onClick={() => setHover(!hover)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{ cursor: 'help', color: '#6B6B8A', fontSize: '11px', border: '1px solid #2D2D42', borderRadius: '50%', width: '15px', height: '15px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle' }}>?</span>
      {hover && (
        <span style={{ position: 'absolute', bottom: '22px', left: '0', background: '#1E1E2E', border: '1px solid #2D2D42', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#A0A0C0', width: '210px', zIndex: 100, lineHeight: '1.6' }}>
          {texto}
        </span>
      )}
    </span>
  )
}

function ModalHistorico({ ticker, compras, onClose, onDeletar }) {
  const fmt = (v) => `R$ ${(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '20px', padding: '24px', maxWidth: '520px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#E8E8F0' }}>📋 Histórico — {ticker}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6B6B8A', cursor: 'pointer', fontSize: '20px' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {compras.map((c, i) => (
            <div key={c.id} style={{ padding: '12px 0', borderBottom: i < compras.length - 1 ? '1px solid #1E1E2E' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#E8E8F0', marginBottom: '4px' }}>
                  {c.quantidade} cotas × {fmt(c.preco_pago)}
                </div>
                <div style={{ fontSize: '12px', color: '#6B6B8A' }}>
                  {new Date(c.data_compra + 'T00:00:00').toLocaleDateString('pt-BR')}
                  {c.corretora && ` · ${c.corretora}`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#A78BFA' }}>{fmt(c.quantidade * c.preco_pago)}</div>
                </div>
                <button onClick={() => onDeletar(c.id)} style={{ background: 'none', border: '1px solid #2D2D42', color: '#6B6B8A', cursor: 'pointer', fontSize: '11px', padding: '4px 8px', borderRadius: '6px' }}
                  onMouseEnter={e => { e.target.style.borderColor = '#F87171'; e.target.style.color = '#F87171' }}
                  onMouseLeave={e => { e.target.style.borderColor = '#2D2D42'; e.target.style.color = '#6B6B8A' }}>
                  Deletar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Acoes() {
  const [carteira, setCarteira] = useState(null)
  const [tickerInfo, setTickerInfo] = useState(null)
  const [modalHistorico, setModalHistorico] = useState(null)
  const [loading, setLoading] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState('carteira')
  const [form, setForm] = useState({
  ticker: '', tipo: 'acao', quantidade: '', preco_pago: '',
  data_compra: '', corretora: '', observacao: '', meta_id: ''
})
  const [metas, setMetas] = useState([])
  const { isMobile } = useWindowSize()

  const carregar = () => {
  api.get('/acoes/carteira').then(r => setCarteira(r.data))
  api.get('/metas').then(r => setMetas(r.data.filter(m => m.status === 'ativa')))
}

  useEffect(() => { carregar() }, [])

  const buscarCustodiante = async (ticker) => {
    if (ticker.length >= 4) {
      const res = await api.get(`/acoes/custodiante/${ticker.toUpperCase()}`)
      setTickerInfo(res.data)
    } else {
      setTickerInfo(null)
    }
  }

  const salvar = async () => {
    if (!form.ticker || !form.quantidade || !form.preco_pago || !form.data_compra) {
      alert('Preencha ticker, quantidade, preço e data')
      return
    }
    setLoading(true)
    await api.post('/acoes', {
      ...form,
      ticker: form.ticker.toUpperCase().trim(),
      quantidade: parseFloat(form.quantidade),
      preco_pago: parseFloat(form.preco_pago),
      meta_id: form.meta_id ? parseInt(form.meta_id) : null,
    })
    setForm({ ticker: '', tipo: 'acao', quantidade: '', preco_pago: '', data_compra: '', corretora: '', observacao: '' })
    setTickerInfo(null)
    carregar()
    setLoading(false)
  }

  const deletarCompra = async (id) => {
    if (!window.confirm('Deletar esta compra?')) return
    await api.delete(`/acoes/${id}`)
    carregar()
    setModalHistorico(null)
  }

  const fmt = (v) => `R$ ${(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const fmtQtd = (v) => v % 1 === 0 ? v.toFixed(0) : v.toFixed(4)
  const padding = isMobile ? '16px' : '32px'
  const gridForm = isMobile ? '1fr' : 'repeat(3, 1fr)'

  return (
    <div style={{ padding, maxWidth: '1100px', margin: '0 auto' }}>

      {modalHistorico && (
        <ModalHistorico
          ticker={modalHistorico.ticker}
          compras={modalHistorico.compras}
          onClose={() => setModalHistorico(null)}
          onDeletar={(id) => { deletarCompra(id); setModalHistorico(null) }}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '700', color: '#E8E8F0', letterSpacing: '-0.5px' }}>Carteira de Investimentos</h1>
        <p style={{ color: '#6B6B8A', fontSize: '13px', marginTop: '4px' }}>Acompanhe suas ações, FIIs e ETFs com preço médio automático</p>
      </div>

      {/* Card total da carteira */}
      {carteira && (
        <div style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: '16px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
              Total investido em renda variável
            </div>
            <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: '800', color: '#A78BFA', letterSpacing: '-1px' }}>
              {fmt(carteira.total_carteira)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', color: '#6B6B8A' }}>{carteira.ativos?.length ?? 0} ativo(s) na carteira</div>
          </div>
        </div>
      )}

      {/* Abas */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['carteira', 'nova-compra'].map(a => (
          <button key={a} onClick={() => setAbaAtiva(a)} style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: abaAtiva === a ? '600' : '400',
            background: abaAtiva === a ? 'rgba(167,139,250,0.15)' : '#1E1E2E',
            color: abaAtiva === a ? '#A78BFA' : '#6B6B8A',
            flex: isMobile ? '1' : 'none',
          }}>
            {a === 'carteira' ? '📊 Carteira' : '+ Nova compra'}
          </button>
        ))}
      </div>

      {/* Aba nova compra */}
      {abaAtiva === 'nova-compra' && (
        <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: isMobile ? '16px' : '24px', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>
            Registrar compra
          </div>

          {/* Tipo */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Tipo de ativo <InfoTooltip texto={TOOLTIPS.tipo} /></label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
              {TIPOS.map(t => (
                <button key={t} onClick={() => setForm({ ...form, tipo: t })} style={{
                  padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontWeight: '600', fontSize: '13px', flex: isMobile ? '1' : 'none',
                  background: form.tipo === t ? TIPO_BG[t] : '#1E1E2E',
                  color: form.tipo === t ? TIPO_COR[t] : '#6B6B8A',
                  outline: form.tipo === t ? `1px solid ${TIPO_COR[t]}` : 'none',
                }}>
                  {TIPO_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: gridForm, gap: '12px' }}>
            <div>
              <label style={labelStyle}>Ticker <InfoTooltip texto={TOOLTIPS.ticker} /></label>
              <input
                placeholder="Ex: PETR4"
                value={form.ticker}
                onChange={e => {
                  const v = e.target.value.toUpperCase()
                  setForm({ ...form, ticker: v })
                  buscarCustodiante(v)
                }}
                style={{ ...inputStyle, marginTop: '6px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '1px' }}
              />
              {tickerInfo && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: tickerInfo.encontrado ? '#34D399' : '#6B6B8A' }}>
                  {tickerInfo.encontrado ? `✓ Custodiante: ${tickerInfo.nome}` : '⚠️ Ticker não encontrado na base — custodiante será preenchido manualmente'}
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Quantidade <InfoTooltip texto={TOOLTIPS.quantidade} /></label>
              <input placeholder="Ex: 100" type="number" value={form.quantidade} onChange={e => setForm({ ...form, quantidade: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }} />
            </div>
            <div>
              <label style={labelStyle}>Preço pago por unidade <InfoTooltip texto={TOOLTIPS.preco_pago} /></label>
              <input placeholder="Ex: 34.50" type="number" step="0.01" value={form.preco_pago} onChange={e => setForm({ ...form, preco_pago: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }} />
            </div>
            <div>
              <label style={labelStyle}>Data da compra</label>
              <input type="date" value={form.data_compra} onChange={e => setForm({ ...form, data_compra: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }} />
            </div>
            <div>
              <label style={labelStyle}>Corretora (opcional)</label>
              <input placeholder="Ex: XP, Rico, Clear" value={form.corretora} onChange={e => setForm({ ...form, corretora: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }} />
            </div>
            <div>
              <label style={labelStyle}>Observação (opcional)</label>
              <input placeholder="Alguma anotação" value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }} />
            </div>
            <div style={{ gridColumn: isMobile ? '1' : 'span 3' }}>
              <label style={labelStyle}>Vincular a uma meta (opcional)</label>
              <select value={form.meta_id} onChange={e => setForm({ ...form, meta_id: e.target.value })}
                style={{ ...inputStyle, marginTop: '6px', color: form.meta_id ? '#E8E8F0' : '#6B6B8A' }}>
                <option value="">Nenhuma — só conta no patrimônio</option>
                {metas.map(m => (
                  <option key={m.id} value={m.id}>{m.titulo} — {fmt(m.valor_atual)} / {fmt(m.valor_alvo)}</option>
                ))}
              </select>
              {form.meta_id && (
                <div style={{ fontSize: '12px', color: '#34D399', marginTop: '6px' }}>
                  ✓ O valor desta compra será somado ao progresso da meta selecionada
                </div>
              )}
            </div>
          </div>

          {/* Preview do total */}
          {form.quantidade && form.preco_pago && (
            <div style={{ marginTop: '16px', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#A0A0C0' }}>Total desta compra</span>
              <span style={{ fontSize: '16px', fontWeight: '700', color: '#A78BFA' }}>
                {fmt(parseFloat(form.quantidade || 0) * parseFloat(form.preco_pago || 0))}
              </span>
            </div>
          )}

          <button onClick={salvar} disabled={loading} style={{ ...btnStyle, width: isMobile ? '100%' : 'auto', marginTop: '16px' }}>
            {loading ? 'Salvando...' : '+ Registrar compra'}
          </button>
        </div>
      )}

      {/* Aba carteira */}
      {abaAtiva === 'carteira' && (
        <div>
          {!carteira || carteira.ativos?.length === 0 ? (
            <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '48px', textAlign: 'center', color: '#6B6B8A', fontSize: '14px' }}>
              Nenhum ativo na carteira ainda — registre sua primeira compra!
            </div>
          ) : isMobile ? (
            /* Mobile: cards */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {carteira.ativos.map(ativo => (
                <div key={ativo.ticker} style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '800', color: '#E8E8F0', fontSize: '18px', letterSpacing: '1px' }}>{ativo.ticker}</span>
                        <span style={{ background: TIPO_BG[ativo.tipo], color: TIPO_COR[ativo.tipo], fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>
                          {TIPO_LABEL[ativo.tipo]}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B6B8A' }}>{fmtQtd(ativo.quantidade)} unidades</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#A78BFA' }}>{fmt(ativo.total_investido)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ background: '#0F0F14', borderRadius: '8px', padding: '8px 12px' }}>
                      <div style={{ fontSize: '11px', color: '#6B6B8A', marginBottom: '2px', display: 'flex', alignItems: 'center' }}>
                        Preço médio <InfoTooltip texto={TOOLTIPS.preco_medio} />
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#E8E8F0' }}>{fmt(ativo.preco_medio)}</div>
                    </div>
                    <div style={{ background: '#0F0F14', borderRadius: '8px', padding: '8px 12px' }}>
                      <div style={{ fontSize: '11px', color: '#6B6B8A', marginBottom: '2px', display: 'flex', alignItems: 'center' }}>
                        Custodiante <InfoTooltip texto={TOOLTIPS.custodiante} />
                      </div>
                      <div style={{ fontSize: '12px', color: ativo.custodiante_encontrado ? '#E8E8F0' : '#6B6B8A' }}>
                        {ativo.custodiante_encontrado ? ativo.custodiante_nome.split(' ').slice(0, 2).join(' ') : 'Não encontrado'}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setModalHistorico({ ticker: ativo.ticker, compras: ativo.compras })}
                    style={{ width: '100%', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', color: '#A78BFA', cursor: 'pointer', fontSize: '12px', padding: '8px', borderRadius: '8px', fontWeight: '600' }}>
                    Ver histórico de compras ({ativo.compras.length})
                  </button>
                </div>
              ))}
            </div>
          ) : (
            /* Desktop: tabela */
            <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1E1E2E' }}>
                    {['Ticker', 'Tipo', 'Qtd.', 'Preço médio', 'Total investido', 'Custodiante', 'CNPJ', ''].map(h => (
                      <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {carteira.ativos.map((ativo, i) => (
                    <tr key={ativo.ticker} style={{ borderTop: i === 0 ? 'none' : '1px solid #1E1E2E' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#16161F'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: '800', color: '#E8E8F0', fontSize: '15px', letterSpacing: '1px' }}>{ativo.ticker}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: TIPO_BG[ativo.tipo], color: TIPO_COR[ativo.tipo], fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px' }}>
                          {TIPO_LABEL[ativo.tipo]}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: '600' }}>{fmtQtd(ativo.quantidade)}</td>
                      <td style={{ ...tdStyle, fontWeight: '700', color: '#E8E8F0' }}>
                        {fmt(ativo.preco_medio)}
                        <InfoTooltip texto={TOOLTIPS.preco_medio} />
                      </td>
                      <td style={{ ...tdStyle, fontWeight: '700', color: '#A78BFA' }}>{fmt(ativo.total_investido)}</td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: ativo.custodiante_encontrado ? '#A0A0C0' : '#6B6B8A' }}>
                        {ativo.custodiante_nome}
                        <InfoTooltip texto={TOOLTIPS.custodiante} />
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: '#6B6B8A', fontFamily: 'monospace' }}>
                        {ativo.custodiante_cnpj || '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <button onClick={() => setModalHistorico({ ticker: ativo.ticker, compras: ativo.compras })}
                          style={{ background: 'none', border: '1px solid #2D2D42', color: '#A78BFA', cursor: 'pointer', fontSize: '12px', padding: '4px 10px', borderRadius: '6px', whiteSpace: 'nowrap' }}
                          onMouseEnter={e => { e.target.style.background = 'rgba(167,139,250,0.1)' }}
                          onMouseLeave={e => { e.target.style.background = 'none' }}>
                          Histórico ({ativo.compras.length})
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #2D2D42', background: '#0F0F14' }}>
                    <td colSpan={4} style={{ padding: '14px 16px', fontSize: '13px', color: '#6B6B8A', fontWeight: '600' }}>
                      Total da carteira
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '16px', fontWeight: '800', color: '#A78BFA' }}>
                      {fmt(carteira.total_carteira)}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const labelStyle = { fontSize: '12px', color: '#6B6B8A', letterSpacing: '0.5px', display: 'flex', alignItems: 'center' }
const inputStyle = { padding: '11px 14px', borderRadius: '10px', border: '1px solid #2D2D42', fontSize: '14px', width: '100%', boxSizing: 'border-box', background: '#0F0F14', color: '#E8E8F0' }
const btnStyle = { background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }
const tdStyle = { padding: '14px 16px', fontSize: '14px', color: '#A0A0C0' }

export default Acoes