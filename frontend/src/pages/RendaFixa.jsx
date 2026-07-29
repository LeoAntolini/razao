import { useEffect, useState } from 'react'
import api from '../services/api'
import { useWindowSize } from '../useWindowSize'

const TIPOS_RF = ['cdb', 'tesouro', 'lci', 'lca', 'debenture', 'cri', 'cra', 'outro']
const TIPO_LABEL = { cdb: 'CDB', tesouro: 'Tesouro Direto', lci: 'LCI', lca: 'LCA', debenture: 'Debênture', cri: 'CRI', cra: 'CRA', outro: 'Outro' }
const TIPO_RENDIMENTO = ['prefixado', 'cdi', 'ipca', 'selic']
const TIPO_REND_LABEL = { prefixado: 'Prefixado', cdi: 'CDI', ipca: 'IPCA+', selic: 'Selic' }

const TOOLTIPS = {
  tipo: 'CDB: emitido por bancos. Tesouro: emitido pelo governo. LCI/LCA: isentos de IR para pessoa física. Debênture: emitido por empresas.',
  taxa: 'Taxa de rendimento do ativo. Ex: "CDI+2%", "IPCA+5%", "12% a.a."',
  tipo_rendimento: 'Como o rendimento é calculado. Prefixado: taxa fixa. CDI/Selic: varia com a taxa básica. IPCA: varia com a inflação.',
  vencimento: 'Data em que o dinheiro investido volta para você com os rendimentos. LCI/LCA geralmente têm carência mínima.',
  ir: 'CDB, Tesouro e Debêntures têm IR regressivo (22,5% a 15%). LCI/LCA são isentos de IR para pessoas físicas.',
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

function RendaFixa() {
  const [itens, setItens] = useState([])
  const [resumo, setResumo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState('lista')
  const [form, setForm] = useState({
    instituicao: '', tipo: 'cdb', valor_investido: '', taxa: '',
    tipo_rendimento: 'cdi', data_aplicacao: '', data_vencimento: '', observacao: ''
  })
  const { isMobile } = useWindowSize()

  const carregar = () => {
    api.get('/renda-fixa').then(r => setItens(r.data))
    api.get('/renda-fixa/resumo').then(r => setResumo(r.data))
  }

  useEffect(() => { carregar() }, [])

  const salvar = async () => {
    if (!form.instituicao || !form.valor_investido || !form.data_aplicacao) {
      alert('Preencha instituição, valor e data de aplicação')
      return
    }
    setLoading(true)
    await api.post('/renda-fixa', {
      ...form,
      valor_investido: parseFloat(form.valor_investido),
      data_vencimento: form.data_vencimento || null,
    })
    setForm({ instituicao: '', tipo: 'cdb', valor_investido: '', taxa: '', tipo_rendimento: 'cdi', data_aplicacao: '', data_vencimento: '', observacao: '' })
    carregar()
    setLoading(false)
  }

  const deletar = async (id) => {
    if (!window.confirm('Deletar este investimento?')) return
    await api.delete(`/renda-fixa/${id}`)
    carregar()
  }

  const fmt = (v) => `R$ ${(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const padding = isMobile ? '16px' : '32px'
  const gridForm = isMobile ? '1fr' : 'repeat(3, 1fr)'

  const diasParaVencer = (data) => {
    if (!data) return null
    const hoje = new Date()
    const venc = new Date(data + 'T00:00:00')
    const diff = Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24))
    return diff
  }

  const corVencimento = (dias) => {
    if (dias === null) return '#6B6B8A'
    if (dias < 0) return '#F87171'
    if (dias < 30) return '#FBBF24'
    if (dias < 90) return '#FB923C'
    return '#34D399'
  }

  return (
    <div style={{ padding, maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '700', color: '#E8E8F0', letterSpacing: '-0.5px' }}>Renda Fixa</h1>
        <p style={{ color: '#6B6B8A', fontSize: '13px', marginTop: '4px' }}>CDBs, Tesouro Direto, LCI, LCA e outros</p>
      </div>

      {/* Aviso IR */}
      <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#FBBF24', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <span>💡</span>
        <span>
          <strong>Sobre o IR em renda fixa:</strong> CDB, Tesouro e Debêntures têm IR regressivo retido na fonte (22,5% até 15% dependendo do prazo). LCI e LCA são <strong>isentos</strong> de IR para pessoa física.
          <InfoTooltip texto={TOOLTIPS.ir} />
        </span>
      </div>

      {/* Cards resumo */}
      {resumo && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: '16px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Total investido</div>
            <div style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: '700', color: '#34D399' }}>{fmt(resumo.total)}</div>
          </div>
          <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: '16px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Qtd. de aplicações</div>
            <div style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: '700', color: '#A78BFA' }}>{resumo.quantidade}</div>
          </div>
          {Object.entries(resumo.por_tipo || {}).slice(0, 2).map(([tipo, valor]) => (
            <div key={tipo} style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{TIPO_LABEL[tipo] || tipo}</div>
              <div style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: '700', color: '#E8E8F0' }}>{fmt(valor)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Abas */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['lista', 'nova-aplicacao'].map(a => (
          <button key={a} onClick={() => setAbaAtiva(a)} style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: abaAtiva === a ? '600' : '400',
            background: abaAtiva === a ? 'rgba(52,211,153,0.15)' : '#1E1E2E',
            color: abaAtiva === a ? '#34D399' : '#6B6B8A',
            flex: isMobile ? '1' : 'none',
          }}>
            {a === 'lista' ? '📋 Aplicações' : '+ Nova aplicação'}
          </button>
        ))}
      </div>

      {/* Nova aplicação */}
      {abaAtiva === 'nova-aplicacao' && (
        <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: isMobile ? '16px' : '24px', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>
            Registrar aplicação
          </div>

          {/* Tipo */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Tipo de ativo <InfoTooltip texto={TOOLTIPS.tipo} /></label>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
              {TIPOS_RF.map(t => (
                <button key={t} onClick={() => setForm({ ...form, tipo: t })} style={{
                  padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px',
                  background: form.tipo === t ? 'rgba(52,211,153,0.15)' : '#1E1E2E',
                  color: form.tipo === t ? '#34D399' : '#6B6B8A',
                  outline: form.tipo === t ? '1px solid #34D399' : 'none',
                  fontWeight: form.tipo === t ? '600' : '400',
                }}>
                  {TIPO_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: gridForm, gap: '12px' }}>
            <div>
              <label style={labelStyle}>Instituição</label>
              <input placeholder="Ex: Nubank, BTG, Tesouro" value={form.instituicao} onChange={e => setForm({ ...form, instituicao: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }} />
            </div>
            <div>
              <label style={labelStyle}>Valor investido (R$)</label>
              <input placeholder="Ex: 5000" type="number" value={form.valor_investido} onChange={e => setForm({ ...form, valor_investido: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }} />
            </div>
            <div>
              <label style={labelStyle}>Taxa <InfoTooltip texto={TOOLTIPS.taxa} /></label>
              <input placeholder='Ex: "CDI+2%" ou "12% a.a."' value={form.taxa} onChange={e => setForm({ ...form, taxa: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }} />
            </div>
            <div>
              <label style={labelStyle}>Tipo de rendimento <InfoTooltip texto={TOOLTIPS.tipo_rendimento} /></label>
              <select value={form.tipo_rendimento} onChange={e => setForm({ ...form, tipo_rendimento: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }}>
                {TIPO_RENDIMENTO.map(t => <option key={t} value={t}>{TIPO_REND_LABEL[t]}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Data de aplicação</label>
              <input type="date" value={form.data_aplicacao} onChange={e => setForm({ ...form, data_aplicacao: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }} />
            </div>
            <div>
              <label style={labelStyle}>Data de vencimento <InfoTooltip texto={TOOLTIPS.vencimento} /></label>
              <input type="date" value={form.data_vencimento} onChange={e => setForm({ ...form, data_vencimento: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }} />
            </div>
            <div style={{ gridColumn: isMobile ? '1' : 'span 3' }}>
              <label style={labelStyle}>Observação (opcional)</label>
              <input placeholder="Alguma anotação" value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }} />
            </div>
          </div>

          <button onClick={salvar} disabled={loading} style={{ ...btnStyle, width: isMobile ? '100%' : 'auto', marginTop: '16px' }}>
            {loading ? 'Salvando...' : '+ Registrar aplicação'}
          </button>
        </div>
      )}

      {/* Lista */}
      {abaAtiva === 'lista' && (
        <div>
          {itens.length === 0 ? (
            <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '48px', textAlign: 'center', color: '#6B6B8A', fontSize: '14px' }}>
              Nenhuma aplicação registrada ainda
            </div>
          ) : isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {itens.map(item => {
                const dias = diasParaVencer(item.data_vencimento)
                return (
                  <div key={item.id} style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontWeight: '700', color: '#E8E8F0', fontSize: '15px', marginBottom: '4px' }}>{item.instituicao}</div>
                        <span style={{ background: 'rgba(52,211,153,0.1)', color: '#34D399', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>
                          {TIPO_LABEL[item.tipo] || item.tipo}
                        </span>
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#34D399' }}>{fmt(item.valor_investido)}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                      {item.taxa && (
                        <div>
                          <div style={{ fontSize: '11px', color: '#6B6B8A', marginBottom: '2px' }}>Taxa</div>
                          <div style={{ fontSize: '13px', color: '#FBBF24', fontWeight: '600' }}>{item.taxa}</div>
                        </div>
                      )}
                      {item.data_vencimento && (
                        <div>
                          <div style={{ fontSize: '11px', color: '#6B6B8A', marginBottom: '2px' }}>Vencimento</div>
                          <div style={{ fontSize: '13px', color: corVencimento(dias), fontWeight: '600' }}>
                            {new Date(item.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                            {dias !== null && <span style={{ fontSize: '11px', marginLeft: '4px' }}>({dias < 0 ? 'vencido' : `${dias}d`})</span>}
                          </div>
                        </div>
                      )}
                    </div>
                    <button onClick={() => deletar(item.id)} style={{ width: '100%', background: 'none', border: '1px solid #2D2D42', color: '#6B6B8A', cursor: 'pointer', fontSize: '12px', padding: '7px', borderRadius: '8px' }}>
                      Deletar
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1E1E2E' }}>
                    {['Instituição', 'Tipo', 'Valor', 'Taxa', 'Rendimento', 'Aplicação', 'Vencimento', ''].map(h => (
                      <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item, i) => {
                    const dias = diasParaVencer(item.data_vencimento)
                    return (
                      <tr key={item.id} style={{ borderTop: i === 0 ? 'none' : '1px solid #1E1E2E' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#16161F'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ ...tdStyle, fontWeight: '600', color: '#E8E8F0' }}>{item.instituicao}</td>
                        <td style={tdStyle}>
                          <span style={{ background: 'rgba(52,211,153,0.1)', color: '#34D399', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px' }}>
                            {TIPO_LABEL[item.tipo] || item.tipo}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontWeight: '700', color: '#34D399' }}>{fmt(item.valor_investido)}</td>
                        <td style={{ ...tdStyle, color: '#FBBF24', fontWeight: '600' }}>{item.taxa || '—'}</td>
                        <td style={tdStyle}>{TIPO_REND_LABEL[item.tipo_rendimento] || item.tipo_rendimento || '—'}</td>
                        <td style={tdStyle}>{new Date(item.data_aplicacao + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                        <td style={{ ...tdStyle, color: corVencimento(dias), fontWeight: dias !== null && dias < 30 ? '700' : '400' }}>
                          {item.data_vencimento ? (
                            <>
                              {new Date(item.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                              {dias !== null && <div style={{ fontSize: '11px' }}>{dias < 0 ? 'Vencido' : `${dias} dias`}</div>}
                            </>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <button onClick={() => deletar(item.id)} style={{ background: 'none', border: '1px solid #2D2D42', color: '#6B6B8A', cursor: 'pointer', fontSize: '12px', padding: '4px 10px', borderRadius: '6px' }}
                            onMouseEnter={e => { e.target.style.borderColor = '#F87171'; e.target.style.color = '#F87171' }}
                            onMouseLeave={e => { e.target.style.borderColor = '#2D2D42'; e.target.style.color = '#6B6B8A' }}>
                            Deletar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #2D2D42', background: '#0F0F14' }}>
                    <td colSpan={2} style={{ padding: '14px 16px', fontSize: '13px', color: '#6B6B8A', fontWeight: '600' }}>Total</td>
                    <td style={{ padding: '14px 16px', fontSize: '16px', fontWeight: '800', color: '#34D399' }}>
                      {fmt(resumo?.total ?? 0)}
                    </td>
                    <td colSpan={5} />
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
const btnStyle = { background: 'linear-gradient(135deg, #3E6B52, #34D399)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }
const tdStyle = { padding: '14px 16px', fontSize: '14px', color: '#A0A0C0' }

export default RendaFixa