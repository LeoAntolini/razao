import { useEffect, useState } from 'react'
import api from '../services/api'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useWindowSize } from '../useWindowSize'

const SAUDE_INFO = {
  excelente: { label: 'Excelente', cor: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)', emoji: '🏆', msg: 'Você está investindo bem e seus gastos fixos estão sob controle. Continue assim!' },
  bom: { label: 'Bom', cor: '#A78BFA', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', emoji: '👍', msg: 'Suas finanças estão equilibradas. Tente aumentar um pouco o percentual de investimentos.' },
  atencao: { label: 'Atenção', cor: '#FBBF24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)', emoji: '⚠️', msg: 'Seus gastos fixos estão comprometendo mais de 70% da renda. Tente reduzir despesas fixas.' },
  critico: { label: 'Crítico', cor: '#F87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', emoji: '🚨', msg: 'Suas despesas superaram suas receitas este mês. Revise seus gastos com urgência.' },
}

function InfoTooltip({ texto }) {
  const [hover, setHover] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-block', marginLeft: '6px' }}>
      <span onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={() => setHover(!hover)}
        style={{ cursor: 'help', color: '#6B6B8A', fontSize: '11px', border: '1px solid #2D2D42', borderRadius: '50%', width: '15px', height: '15px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle' }}>?</span>
      {hover && (
        <span style={{ position: 'absolute', bottom: '22px', left: '0', background: '#1E1E2E', border: '1px solid #2D2D42', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#A0A0C0', width: '200px', zIndex: 100, lineHeight: '1.6' }}>
          {texto}
        </span>
      )}
    </span>
  )
}

function ModalDetalhes({ titulo, transacoes, onClose }) {
  const fmt = (v) => `R$ ${(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const corTipo = { receita: '#34D399', despesa: '#F87171', investimento: '#A78BFA' }
  const bgTipo = { receita: 'rgba(52,211,153,0.1)', despesa: 'rgba(248,113,113,0.1)', investimento: 'rgba(167,139,250,0.1)' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '20px', padding: '24px', maxWidth: '560px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#E8E8F0' }}>{titulo}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6B6B8A', cursor: 'pointer', fontSize: '20px' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {transacoes.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6B6B8A', padding: '32px' }}>Nenhum lançamento encontrado</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {transacoes.map((t, i) => (
                <div key={t.id} style={{ padding: '12px 0', borderBottom: i < transacoes.length - 1 ? '1px solid #1E1E2E' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#E8E8F0', marginBottom: '4px' }}>{t.descricao}</div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: '#6B6B8A' }}>{new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      <span style={{ background: bgTipo[t.tipo], color: corTipo[t.tipo], padding: '1px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                        {t.tipo.charAt(0).toUpperCase() + t.tipo.slice(1)}
                      </span>
                      {t.categoria && <span style={{ fontSize: '11px', color: '#6B6B8A', background: '#1E1E2E', padding: '1px 8px', borderRadius: '4px' }}>{t.categoria}</span>}
                    </div>
                  </div>
                  <div style={{ fontWeight: '700', color: corTipo[t.tipo], fontSize: '15px', whiteSpace: 'nowrap' }}>
                    {t.tipo === 'receita' ? '+' : '-'} {fmt(t.valor)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #1E1E2E', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#6B6B8A' }}>{transacoes.length} lançamento(s)</span>
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#E8E8F0' }}>
            {fmt(transacoes.reduce((acc, t) => acc + t.valor, 0))}
          </span>
        </div>
      </div>
    </div>
  )
}

function ModalAlocacao({ pct, onClose, onSalvar }) {
  const [form, setForm] = useState({ ...pct })
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  const total = parseFloat(form.pct_investimento || 0) + parseFloat(form.pct_lazer || 0) + parseFloat(form.pct_gastos || 0)

  const salvar = async () => {
    if (Math.round(total) !== 100) { setErro('Os percentuais devem somar exatamente 100%'); return }
    setLoading(true)
    await api.put('/preferencias', {
      pct_investimento: parseFloat(form.pct_investimento),
      pct_lazer: parseFloat(form.pct_lazer),
      pct_gastos: parseFloat(form.pct_gastos),
    })
    setLoading(false)
    onSalvar()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '20px', padding: '24px', maxWidth: '420px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#E8E8F0' }}>⚙️ Personalizar alocação</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6B6B8A', cursor: 'pointer', fontSize: '20px' }}>✕</button>
        </div>
        <p style={{ fontSize: '13px', color: '#6B6B8A', marginBottom: '24px' }}>
          Defina como deseja dividir o saldo livre do mês. Os percentuais devem somar 100%.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
          {[
            { key: 'pct_investimento', label: '💰 Investimento', cor: '#34D399', tooltip: 'Percentual do saldo livre destinado a investimentos.' },
            { key: 'pct_lazer', label: '🎉 Lazer', cor: '#FBBF24', tooltip: 'Percentual para gastos com lazer e bem-estar.' },
            { key: 'pct_gastos', label: '🛒 Gastos pessoais', cor: '#F87171', tooltip: 'Percentual para compras e gastos variáveis pessoais.' },
          ].map(item => (
            <div key={item.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '14px', color: '#E8E8F0', fontWeight: '500' }}>{item.label}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number" min="0" max="100"
                    value={form[item.key]}
                    onChange={e => setForm({ ...form, [item.key]: e.target.value })}
                    style={{ width: '70px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #2D2D42', background: '#0F0F14', color: item.cor, fontWeight: '700', fontSize: '16px', textAlign: 'center' }}
                  />
                  <span style={{ color: item.cor, fontWeight: '700' }}>%</span>
                </div>
              </div>
              <div style={{ background: '#1E1E2E', borderRadius: '4px', height: '6px' }}>
                <div style={{ width: `${Math.min(parseFloat(form[item.key]) || 0, 100)}%`, background: item.cor, height: '6px', borderRadius: '4px', transition: 'width 0.3s' }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: Math.round(total) === 100 ? '#34D399' : '#F87171' }}>
            Total: {total.toFixed(0)}% {Math.round(total) === 100 ? '✓' : `(faltam ${(100 - total).toFixed(0)}%)`}
          </span>
        </div>

        {erro && <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px', padding: '10px', marginBottom: '16px', fontSize: '13px', color: '#F87171', textAlign: 'center' }}>{erro}</div>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #2D2D42', background: 'none', color: '#6B6B8A', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={salvar} disabled={loading || Math.round(total) !== 100} style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: Math.round(total) === 100 ? 'linear-gradient(135deg, #7C3AED, #A78BFA)' : '#1E1E2E', color: Math.round(total) === 100 ? '#fff' : '#6B6B8A', fontWeight: '600', cursor: Math.round(total) === 100 ? 'pointer' : 'not-allowed' }}>
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function BannerMetaConcluida({ metas, onResgatar }) {
  const metasConcluidas = metas.filter(m => m.status === 'concluida' && m.valor_atual > 0)
  if (metasConcluidas.length === 0) return null
  const fmt = (v) => `R$ ${(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  return (
    <div style={{ marginBottom: '20px' }}>
      {metasConcluidas.map(meta => (
        <div key={meta.id} style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.1), rgba(245,158,11,0.05))', border: '1px solid rgba(251,191,36,0.4)', borderRadius: '16px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>🏆</span>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#FBBF24', marginBottom: '2px' }}>Meta concluída: {meta.titulo}</div>
              <div style={{ fontSize: '13px', color: '#A0A0C0' }}>Você acumulou <strong style={{ color: '#FBBF24' }}>{fmt(meta.valor_atual)}</strong></div>
            </div>
          </div>
          <button onClick={() => onResgatar(meta)} style={{ background: 'linear-gradient(135deg, #F59E0B, #FBBF24)', color: '#000', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Resgatar / Manter
          </button>
        </div>
      ))}
    </div>
  )
}

function ModalResgatar({ meta, metas, onClose, onConfirm }) {
  const [acao, setAcao] = useState('')
  const [metaDestino, setMetaDestino] = useState('')
  const fmt = (v) => `R$ ${(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const metasDisponiveis = metas.filter(m => m.id !== meta.id && m.status === 'ativa')
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '20px', padding: '24px', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontSize: '20px', fontWeight: '700', color: '#E8E8F0', marginBottom: '8px' }}>🏆 Meta concluída!</div>
        <div style={{ fontSize: '14px', color: '#6B6B8A', marginBottom: '20px' }}>{meta.titulo} — <span style={{ color: '#FBBF24', fontWeight: '600' }}>{fmt(meta.valor_atual)}</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {[
            { value: 'resgatar', label: '💰 Resgatar como saldo livre', desc: 'O valor entra como receita disponível.' },
            { value: 'transferir', label: '🔄 Transferir para outra meta', desc: 'O valor vai para outra meta ativa.' },
            { value: 'manter', label: '🔒 Manter investido', desc: 'Mantém no patrimônio sem resgatar.' },
          ].map(op => (
            <div key={op.value} onClick={() => setAcao(op.value)} style={{ background: acao === op.value ? 'rgba(167,139,250,0.1)' : '#0F0F14', border: `1px solid ${acao === op.value ? '#A78BFA' : '#2D2D42'}`, borderRadius: '12px', padding: '14px 16px', cursor: 'pointer' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#E8E8F0', marginBottom: '4px' }}>{op.label}</div>
              <div style={{ fontSize: '12px', color: '#6B6B8A' }}>{op.desc}</div>
            </div>
          ))}
        </div>
        {acao === 'transferir' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', color: '#6B6B8A', display: 'block', marginBottom: '6px' }}>Meta destino</label>
            <select value={metaDestino} onChange={e => setMetaDestino(e.target.value)} style={{ padding: '11px 14px', borderRadius: '10px', border: '1px solid #2D2D42', fontSize: '14px', width: '100%', background: '#0F0F14', color: '#E8E8F0' }}>
              <option value="">Selecione...</option>
              {metasDisponiveis.map(m => <option key={m.id} value={m.id}>{m.titulo}</option>)}
            </select>
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #2D2D42', background: 'none', color: '#6B6B8A', cursor: 'pointer' }}>Depois</button>
          <button onClick={() => onConfirm(acao, metaDestino ? parseInt(metaDestino) : null)} disabled={!acao || (acao === 'transferir' && !metaDestino)}
            style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: acao ? 'linear-gradient(135deg, #7C3AED, #A78BFA)' : '#1E1E2E', color: acao ? '#fff' : '#6B6B8A', fontWeight: '600', cursor: acao ? 'pointer' : 'not-allowed' }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

function Dashboard() {
  const [resumo, setResumo] = useState(null)
  const [metas, setMetas] = useState([])
  const [patrimonio, setPatrimonio] = useState([])
  const [patrimonioTotal, setPatrimonioTotal] = useState(null)
  const [todasTransacoes, setTodasTransacoes] = useState([])
  const [periodo, setPeriodo] = useState('6')
  const [modalMeta, setModalMeta] = useState(null)
  const [modalDetalhes, setModalDetalhes] = useState(null)
  const [modalAlocacao, setModalAlocacao] = useState(false)
  const [pct, setPct] = useState({ pct_investimento: 60, pct_lazer: 25, pct_gastos: 15 })
  const { isMobile, isTablet } = useWindowSize()

  const mes = new Date().getMonth() + 1
  const ano = new Date().getFullYear()

  const carregar = () => {
    api.get(`/transacoes/resumo?mes=${mes}&ano=${ano}`).then(r => setResumo(r.data))
    api.get('/metas').then(r => setMetas(r.data))
    api.get('/transacoes/patrimonio').then(r => setPatrimonio(r.data))
    api.get('/metas/patrimonio').then(r => setPatrimonioTotal(r.data))
    api.get(`/transacoes?mes=${mes}&ano=${ano}`).then(r => setTodasTransacoes(r.data))
    api.get('/preferencias').then(r => setPct(r.data))
  }

  useEffect(() => { carregar() }, [])

  const fmt = (v) => `R$ ${(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const dadosGrafico = patrimonio.slice(-parseInt(periodo))
  const saude = resumo?.saude_financeira ? SAUDE_INFO[resumo.saude_financeira] : null
  const metasAtivas = metas.filter(m => ['ativa', 'pausada'].includes(m.status))

  const confirmarResgate = async (acao, metaDestinoId) => {
    await api.post('/metas/resgatar', { meta_id: modalMeta.id, acao, meta_destino_id: metaDestinoId || null })
    setModalMeta(null)
    carregar()
  }

  const abrirDetalhes = (tipo, titulo) => {
    const filtradas = todasTransacoes.filter(t => t.tipo === tipo)
    setModalDetalhes({ titulo, transacoes: filtradas })
  }

  const abrirDetalhesSaldo = () => {
    setModalDetalhes({ titulo: 'Saldo livre — detalhamento', transacoes: todasTransacoes })
  }

  const saldoLivre = resumo?.saldo_livre ?? 0
  const sugestao = {
    investimento: Math.round(saldoLivre * (pct.pct_investimento / 100) * 100) / 100,
    lazer: Math.round(saldoLivre * (pct.pct_lazer / 100) * 100) / 100,
    gastos_pessoais: Math.round(saldoLivre * (pct.pct_gastos / 100) * 100) / 100,
  }

  const colsCards = isMobile ? '1fr 1fr' : isTablet ? '1fr 1fr' : 'repeat(4, 1fr)'
  const colsGrafico = isMobile || isTablet ? '1fr' : '2fr 1fr'
  const padding = isMobile ? '16px' : '32px'

  return (
    <div style={{ padding, maxWidth: '1100px', margin: '0 auto' }}>

      {modalMeta && <ModalResgatar meta={modalMeta} metas={metas} onClose={() => setModalMeta(null)} onConfirm={confirmarResgate} />}
      {modalDetalhes && <ModalDetalhes titulo={modalDetalhes.titulo} transacoes={modalDetalhes.transacoes} onClose={() => setModalDetalhes(null)} />}
      {modalAlocacao && <ModalAlocacao pct={pct} onClose={() => setModalAlocacao(false)} onSalvar={() => { setModalAlocacao(false); carregar() }} />}

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '700', color: '#E8E8F0', letterSpacing: '-0.5px' }}>Visão geral</h1>
        <p style={{ color: '#6B6B8A', fontSize: '13px', marginTop: '4px' }}>
          {new Date().toLocaleString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <BannerMetaConcluida metas={metas} onResgatar={setModalMeta} />

      {/* Cards clicáveis */}
      <div style={{ display: 'grid', gridTemplateColumns: colsCards, gap: '12px', marginBottom: '16px' }}>
        {[
          { label: 'Receitas do mês', valor: resumo?.receitas, cor: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.15)', tooltip: 'Tudo que entrou de dinheiro este mês.', onClick: () => abrirDetalhes('receita', 'Receitas do mês') },
          { label: 'Despesas do mês', valor: resumo?.total_despesas, cor: '#F87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.15)', tooltip: 'Soma de todas as despesas fixas e variáveis.', onClick: () => abrirDetalhes('despesa', 'Despesas do mês') },
          { label: 'Investido', valor: resumo?.investimentos, cor: '#A78BFA', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.15)', tooltip: 'Valor aportado nas metas este mês.', onClick: () => abrirDetalhes('investimento', 'Investimentos do mês') },
          { label: 'Saldo livre', valor: resumo?.saldo_livre, cor: '#FBBF24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.15)', tooltip: 'O que sobrou após despesas e investimentos.', onClick: abrirDetalhesSaldo },
        ].map(card => (
          <div key={card.label} onClick={card.onClick} style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: '16px', padding: '16px', cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            <div style={{ fontSize: '11px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
              {card.label} <InfoTooltip texto={card.tooltip} />
            </div>
            <div style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: '700', color: card.cor }}>
              {fmt(card.valor)}
            </div>
            <div style={{ fontSize: '11px', color: '#6B6B8A', marginTop: '6px' }}>Clique para detalhes →</div>
          </div>
        ))}
      </div>

      {/* Patrimônio total */}
      {patrimonioTotal && (
        <div style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: '16px', padding: '16px 20px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', display: 'flex', alignItems: 'center' }}>
              Patrimônio total <InfoTooltip texto="Soma de tudo acumulado nas metas ativas, pausadas e concluídas." />
            </div>
            <div style={{ fontSize: isMobile ? '24px' : '30px', fontWeight: '800', color: '#A78BFA', letterSpacing: '-1px' }}>
              {fmt(patrimonioTotal.patrimonio_total)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#6B6B8A' }}>{patrimonioTotal.metas} meta(s) ativa(s)</div>
            {resumo?.investimentos > 0 && <div style={{ fontSize: '13px', color: '#34D399', fontWeight: '600' }}>+ {fmt(resumo.investimentos)} este mês</div>}
          </div>
        </div>
      )}

      {/* Saúde financeira */}
      {saude && (
        <div style={{ background: saude.bg, border: `1px solid ${saude.border}`, borderRadius: '16px', padding: '16px 20px', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
            Saúde financeira <InfoTooltip texto="Baseada no percentual de investimentos e comprometimento de renda fixa." />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <span style={{ fontSize: '22px' }}>{saude.emoji}</span>
                <span style={{ fontSize: '18px', fontWeight: '700', color: saude.cor }}>{saude.label}</span>
              </div>
              <div style={{ fontSize: '13px', color: '#A0A0C0' }}>{saude.msg}</div>
            </div>
            {resumo?.comprometimento_fixos > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#6B6B8A', marginBottom: '2px' }}>Fixos comprometem</div>
                <div style={{ fontSize: '26px', fontWeight: '800', color: resumo.comprometimento_fixos > 70 ? '#F87171' : resumo.comprometimento_fixos > 50 ? '#FBBF24' : '#34D399', letterSpacing: '-1px' }}>
                  {resumo.comprometimento_fixos}%
                </div>
                <div style={{ fontSize: '11px', color: '#6B6B8A' }}>da renda</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gráfico + Sugestão */}
      <div style={{ display: 'grid', gridTemplateColumns: colsGrafico, gap: '16px', marginBottom: '16px' }}>
        <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '13px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center' }}>
              Patrimônio <InfoTooltip texto="Aportes acumulados ao longo do tempo." />
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['3', '6', '12'].map(p => (
                <button key={p} onClick={() => setPeriodo(p)} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: periodo === p ? '600' : '400', background: periodo === p ? 'rgba(167,139,250,0.15)' : '#1E1E2E', color: periodo === p ? '#A78BFA' : '#6B6B8A' }}>{p}m</button>
              ))}
            </div>
          </div>
          {dadosGrafico.length === 0 ? (
            <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B6B8A', fontSize: '13px' }}>
              Nenhum investimento registrado ainda
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={dadosGrafico}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="mes" tick={{ fill: '#6B6B8A', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B6B8A', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: '#1A1A24', border: '1px solid #2D2D42', borderRadius: '8px', color: '#E8E8F0', fontSize: '12px' }} formatter={v => [fmt(v), 'Patrimônio']} />
                <Area type="monotone" dataKey="patrimonio" stroke="#7C3AED" strokeWidth={2.5} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center' }}>
              Sugestão <InfoTooltip texto="Baseado no seu saldo livre e nos percentuais configurados." />
            </div>
            <button onClick={() => setModalAlocacao(true)} style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#A78BFA', cursor: 'pointer', fontSize: '11px', padding: '4px 10px', borderRadius: '6px', fontWeight: '600' }}>
              ⚙️ Personalizar
            </button>
          </div>

          {!resumo || resumo.saldo_livre <= 0 ? (
            <div style={{ color: '#6B6B8A', fontSize: '13px' }}>
              {!resumo ? 'Carregando...' : 'Sem saldo livre. Lance suas receitas para ver a sugestão.'}
            </div>
          ) : (
            <>
              <div style={{ fontSize: '12px', color: '#6B6B8A', marginBottom: '14px' }}>
                Saldo livre: <span style={{ color: '#FBBF24', fontWeight: '600' }}>{fmt(resumo.saldo_livre)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { label: 'Investir', pct: `${pct.pct_investimento}%`, valor: sugestao.investimento, cor: '#34D399', tooltip: 'Recomendado investir ao menos 20% da renda.' },
                  { label: 'Lazer', pct: `${pct.pct_lazer}%`, valor: sugestao.lazer, cor: '#FBBF24', tooltip: 'Reserve parte para seu bem-estar.' },
                  { label: 'Gastos pessoais', pct: `${pct.pct_gastos}%`, valor: sugestao.gastos_pessoais, cor: '#F87171', tooltip: 'Margem para imprevistos e compras pessoais.' },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#A0A0C0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {item.label} <span style={{ color: '#6B6B8A' }}>({item.pct})</span>
                        <InfoTooltip texto={item.tooltip} />
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: item.cor }}>{fmt(item.valor)}</span>
                    </div>
                    <div style={{ background: '#1E1E2E', borderRadius: '4px', height: '6px' }}>
                      <div style={{ width: item.pct, background: item.cor, height: '6px', borderRadius: '4px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Metas ativas */}
      {metasAtivas.length > 0 && (
        <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '20px' }}>
          <div style={{ fontSize: '13px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Objetivos ativos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {metasAtivas.map(meta => {
              const pct2 = Math.min((meta.valor_atual / meta.valor_alvo) * 100, 100)
              return (
                <div key={meta.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#E8E8F0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {meta.titulo}
                      {meta.status === 'pausada' && <span style={{ fontSize: '10px', background: 'rgba(251,191,36,0.1)', color: '#FBBF24', padding: '2px 6px', borderRadius: '4px' }}>Pausada</span>}
                    </span>
                    <span style={{ fontSize: '13px', color: '#A78BFA', fontWeight: '600' }}>{pct2.toFixed(0)}%</span>
                  </div>
                  <div style={{ background: '#1E1E2E', borderRadius: '4px', height: '6px' }}>
                    <div style={{ width: `${pct2}%`, background: 'linear-gradient(90deg, #7C3AED, #A78BFA)', height: '6px', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#6B6B8A' }}>{fmt(meta.valor_atual)}</span>
                    <span style={{ fontSize: '12px', color: '#6B6B8A' }}>{fmt(meta.valor_alvo)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard