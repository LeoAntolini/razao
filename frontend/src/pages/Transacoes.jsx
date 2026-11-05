import { useEffect, useState } from 'react'
import api from '../services/api'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useWindowSize } from '../useWindowSize'

const TOOLTIPS = {
  fixa: 'Gasto que se repete todo mês com valor fixo. Ex: aluguel, academia, streaming.',
  fixa_parcelada: 'Compra dividida em parcelas mensais. Ex: eletrodoméstico 12x, roupa 3x.',
  fixa_com_prazo: 'Gasto fixo que termina em uma data definida. Ex: faculdade até dez/2027.',
  variavel: 'Gasto que muda todo mês conforme o consumo. Ex: mercado, gasolina, restaurante.',
  sazonal: 'Gasto que aparece uma vez por ano. Ex: IPTU, seguro do carro, presente de natal.',
  agendado: 'Lançamento com data futura. Aparece no histórico mas só é contabilizado quando confirmado.',
}

const CATEGORIAS = {
  receita: ['Salário', 'Freelance / Serviço', 'Dividendos', 'Aluguel recebido', 'Venda de bem', 'Outros'],
  despesa: ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Assinatura', 'Vestuário', 'Outros'],
  investimento: ['Aporte em meta'],
}

const SUBTIPOS_DESPESA = [
  { value: 'variavel', label: 'Variável' },
  { value: 'fixa', label: 'Fixa' },
  { value: 'fixa_parcelada', label: 'Parcelada' },
  { value: 'fixa_com_prazo', label: 'Com prazo' },
  { value: 'sazonal', label: 'Sazonal' },
]

const CORES_PIZZA = ['#F87171', '#FB923C', '#A78BFA', '#34D399']

function TooltipInfo({ texto }) {
  const [hover, setHover] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-block', marginLeft: '6px' }}>
      <span onClick={() => setHover(!hover)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{ cursor: 'help', color: '#6B6B8A', fontSize: '11px', border: '1px solid #2D2D42', borderRadius: '50%', width: '15px', height: '15px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle' }}>?</span>
      {hover && (
        <span style={{ position: 'absolute', bottom: '22px', left: '0', background: '#1E1E2E', border: '1px solid #2D2D42', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#A0A0C0', width: '200px', zIndex: 100, lineHeight: '1.6' }}>
          {texto}
        </span>
      )}
    </span>
  )
}

function ModalEditar({ transacao, metas, onClose, onSalvar }) {
  const [form, setForm] = useState({
    valor: transacao.valor,
    tipo: transacao.tipo,
    subtipo: transacao.subtipo || 'variavel',
    categoria: transacao.categoria,
    data: transacao.data,
    meta_id: transacao.meta_id || '',
    total_parcelas: transacao.total_parcelas || '',
    observacao: transacao.observacao || '',
  })
  const [loading, setLoading] = useState(false)
  const corTipo = { receita: '#34D399', despesa: '#F87171', investimento: '#A78BFA' }
  const bgTipo = { receita: 'rgba(52,211,153,0.1)', despesa: 'rgba(248,113,113,0.1)', investimento: 'rgba(167,139,250,0.1)' }

  const mudarTipo = (tipo) => setForm({ ...form, tipo, subtipo: tipo === 'despesa' ? 'variavel' : '', categoria: CATEGORIAS[tipo][0], meta_id: '' })

  const salvar = async () => {
    setLoading(true)
    const descricao = form.tipo === 'receita' ? form.categoria
      : form.tipo === 'investimento' ? `Aporte — ${metas.find(m => m.id == form.meta_id)?.titulo ?? 'Meta'}`
      : `${form.categoria} (${SUBTIPOS_DESPESA.find(s => s.value === form.subtipo)?.label ?? ''})`
    await api.put(`/transacoes/${transacao.id}`, {
      descricao, valor: parseFloat(form.valor), tipo: form.tipo,
      subtipo: form.subtipo || null, categoria: form.categoria, data: form.data,
      meta_id: form.meta_id ? parseInt(form.meta_id) : null,
      total_parcelas: form.total_parcelas ? parseInt(form.total_parcelas) : null,
      parcela_atual: transacao.parcela_atual || 1,
      observacao: form.observacao || null,
    })
    setLoading(false)
    onSalvar()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '20px', padding: '24px', maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontSize: '18px', fontWeight: '700', color: '#E8E8F0', marginBottom: '20px' }}>✏️ Editar lançamento</div>
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Tipo</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
            {['receita', 'despesa', 'investimento'].map(t => (
              <button key={t} onClick={() => mudarTipo(t)} style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px', flex: '1', background: form.tipo === t ? bgTipo[t] : '#1E1E2E', color: form.tipo === t ? corTipo[t] : '#6B6B8A', outline: form.tipo === t ? `1px solid ${corTipo[t]}` : 'none' }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {form.tipo === 'despesa' && (
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Tipo de despesa</label>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
              {SUBTIPOS_DESPESA.map(s => (
                <button key={s.value} onClick={() => setForm({ ...form, subtipo: s.value })} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', background: form.subtipo === s.value ? 'rgba(248,113,113,0.15)' : '#1E1E2E', color: form.subtipo === s.value ? '#F87171' : '#6B6B8A', outline: form.subtipo === s.value ? '1px solid #F87171' : 'none', fontWeight: form.subtipo === s.value ? '600' : '400' }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div><label style={labelStyle}>Valor (R$)</label><input type="number" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }} /></div>
          <div><label style={labelStyle}>Data</label><input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }} /></div>
          <div><label style={labelStyle}>Categoria</label><select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }}>{CATEGORIAS[form.tipo].map(c => <option key={c}>{c}</option>)}</select></div>
          {form.tipo === 'investimento' && <div><label style={labelStyle}>Meta</label><select value={form.meta_id} onChange={e => setForm({ ...form, meta_id: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }}><option value="">Selecione</option>{metas.map(m => <option key={m.id} value={m.id}>{m.titulo}</option>)}</select></div>}
          <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Observação</label><input placeholder="Opcional" value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }} /></div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #2D2D42', background: 'none', color: '#6B6B8A', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={salvar} disabled={loading} style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', color: '#fff', fontWeight: '600', cursor: 'pointer' }}>
            {loading ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Transacoes() {
  const [transacoes, setTransacoes] = useState([])
  const [metas, setMetas] = useState([])
  const [pizza, setPizza] = useState(null)
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [aba, setAba] = useState('lancamentos')
  const [loading, setLoading] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({
    valor: '', tipo: 'receita', subtipo: 'variavel',
    categoria: 'Salário', data: '', meta_id: '',
    total_parcelas: '', observacao: '', data_fim: ''
  })
  const { isMobile } = useWindowSize()

  const carregar = () => {
    api.get(`/transacoes?mes=${mes}&ano=${ano}`).then(r => setTransacoes(r.data))
    api.get(`/transacoes/grafico-pizza?mes=${mes}&ano=${ano}`).then(r => setPizza(r.data))
    api.get('/metas').then(r => setMetas(r.data.filter(m => m.status === 'ativa')))
  }

  useEffect(() => { carregar() }, [mes, ano])

  const mudarTipo = (tipo) => setForm({
    ...form, tipo, subtipo: tipo === 'despesa' ? 'variavel' : '',
    categoria: CATEGORIAS[tipo][0], meta_id: '', total_parcelas: '', data_fim: ''
  })

  const salvar = async () => {
    if (!form.valor || !form.data) { alert('Preencha valor e data'); return }
    if (form.tipo === 'investimento' && !form.meta_id) { alert('Selecione a meta vinculada'); return }
    if (form.subtipo === 'fixa_parcelada' && !form.total_parcelas) { alert('Informe o número de parcelas'); return }
    if (form.subtipo === 'fixa_com_prazo' && !form.data_fim) { alert('Informe a data de término'); return }
    setLoading(true)

    const descricao = form.tipo === 'receita' ? form.categoria
      : form.tipo === 'investimento' ? `Aporte — ${metas.find(m => m.id == form.meta_id)?.titulo ?? 'Meta'}`
      : `${form.categoria} (${SUBTIPOS_DESPESA.find(s => s.value === form.subtipo)?.label ?? ''})`

    // Para fixa_com_prazo, guarda a data fim na observação
    const observacaoFinal = form.subtipo === 'fixa_com_prazo' && form.data_fim
      ? `${form.data_fim}${form.observacao ? '|' + form.observacao : ''}`
      : form.observacao || null

    await api.post('/transacoes', {
      descricao,
      valor: parseFloat(form.valor),
      tipo: form.tipo,
      subtipo: form.subtipo || null,
      categoria: form.categoria,
      data: form.data,
      meta_id: form.meta_id ? parseInt(form.meta_id) : null,
      total_parcelas: form.total_parcelas ? parseInt(form.total_parcelas) : null,
      parcela_atual: 1,
      observacao: observacaoFinal,
    })
    setForm({
      valor: '', tipo: 'receita', subtipo: 'variavel',
      categoria: 'Salário', data: '', meta_id: '',
      total_parcelas: '', observacao: '', data_fim: ''
    })
    carregar()
    setLoading(false)
  }

  const deletar = async (id) => {
    if (!window.confirm('Deletar esta transação?')) return
    await api.delete(`/transacoes/${id}`)
    carregar()
  }

  const navegarMes = (dir) => {
    let novoMes = mes + dir
    let novoAno = ano
    if (novoMes > 12) { novoMes = 1; novoAno++ }
    if (novoMes < 1) { novoMes = 12; novoAno-- }
    setMes(novoMes)
    setAno(novoAno)
  }

  const fmt = (v) => `R$ ${(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const nomeMes = new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
  const corTipo = { receita: '#34D399', despesa: '#F87171', investimento: '#A78BFA' }
  const bgTipo = { receita: 'rgba(52,211,153,0.1)', despesa: 'rgba(248,113,113,0.1)', investimento: 'rgba(167,139,250,0.1)' }
  const labelSubtipo = { fixa: 'Fixa', fixa_parcelada: 'Parcelada', fixa_com_prazo: 'Com prazo', variavel: 'Variável', sazonal: 'Sazonal' }

  const confirmados = transacoes.filter(t => t.status === 'confirmado')
  const agendados = transacoes.filter(t => t.status === 'agendado')

  const dadosPizza = pizza ? [
    { name: 'Desp. variáveis', value: pizza.despesas_variaveis },
    { name: 'Desp. fixas', value: pizza.despesas_fixas },
    { name: 'Investimentos', value: pizza.investimentos },
    { name: 'Dinheiro livre', value: pizza.dinheiro_livre },
  ].filter(d => d.value > 0) : []

  const padding = isMobile ? '16px' : '32px'
  const gridForm = isMobile ? '1fr' : 'repeat(3, 1fr)'

  // Extrai data_fim da observação para exibir no histórico
  const extrairDataFim = (obs) => {
    if (!obs) return null
    const partes = obs.split('|')
    if (partes[0] && partes[0].match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(partes[0] + 'T00:00:00').toLocaleDateString('pt-BR')
    }
    return null
  }

  const extrairObs = (obs, subtipo) => {
    if (!obs) return null
    if (subtipo === 'fixa_com_prazo') {
      const partes = obs.split('|')
      return partes[1] || null
    }
    return obs
  }

  const renderLinhaDesktop = (t, i) => (
    <tr key={t.id} style={{ borderTop: i === 0 ? 'none' : '1px solid #1E1E2E', opacity: t.status === 'agendado' ? 0.65 : 1 }}
      onMouseEnter={e => e.currentTarget.style.background = '#16161F'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6B6B8A', whiteSpace: 'nowrap' }}>
        {new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR')}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: '500', color: t.status === 'agendado' ? '#6B6B8A' : '#E8E8F0', fontSize: '14px' }}>{t.descricao}</span>
          {t.status === 'agendado' && (
            <span style={{ fontSize: '10px', background: 'rgba(167,139,250,0.15)', color: '#A78BFA', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>⏰ Agendado</span>
          )}
        </div>
        {t.subtipo === 'fixa_com_prazo' && extrairDataFim(t.observacao) && (
          <div style={{ fontSize: '11px', color: '#6B6B8A', marginTop: '2px' }}>
            📅 Até: {extrairDataFim(t.observacao)}
          </div>
        )}
        {extrairObs(t.observacao, t.subtipo) && (
          <div style={{ fontSize: '11px', color: '#6B6B8A', marginTop: '2px', fontStyle: 'italic' }}>
            📝 {extrairObs(t.observacao, t.subtipo)}
          </div>
        )}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <span style={{ background: bgTipo[t.tipo], color: corTipo[t.tipo], padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>
          {t.tipo.charAt(0).toUpperCase() + t.tipo.slice(1)}
        </span>
      </td>
      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#A0A0C0' }}>
        {t.subtipo && (
          <span style={{ background: '#1E1E2E', color: '#A0A0C0', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', whiteSpace: 'nowrap' }}>
            {labelSubtipo[t.subtipo]}
            {t.total_parcelas && t.parcela_atual ? ` ${t.parcela_atual}/${t.total_parcelas}` : ''}
          </span>
        )}
      </td>
      <td style={{ padding: '12px 16px', fontWeight: '700', color: t.status === 'agendado' ? '#6B6B8A' : corTipo[t.tipo], fontSize: '14px', whiteSpace: 'nowrap' }}>
        {t.tipo === 'receita' ? '+' : '-'} {fmt(t.valor)}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => setEditando(t)} style={{ background: 'none', border: '1px solid #2D2D42', color: '#A78BFA', cursor: 'pointer', fontSize: '12px', padding: '4px 10px', borderRadius: '6px' }}
            onMouseEnter={e => e.target.style.background = 'rgba(167,139,250,0.1)'}
            onMouseLeave={e => e.target.style.background = 'none'}>Editar</button>
          <button onClick={() => deletar(t.id)} style={{ background: 'none', border: '1px solid #2D2D42', color: '#6B6B8A', cursor: 'pointer', fontSize: '12px', padding: '4px 10px', borderRadius: '6px' }}
            onMouseEnter={e => { e.target.style.borderColor = '#F87171'; e.target.style.color = '#F87171' }}
            onMouseLeave={e => { e.target.style.borderColor = '#2D2D42'; e.target.style.color = '#6B6B8A' }}>Deletar</button>
        </div>
      </td>
    </tr>
  )

  const renderLinhaMobile = (t, i) => (
    <div key={t.id} style={{ padding: '12px 14px', borderTop: i === 0 ? 'none' : '1px solid #1E1E2E', opacity: t.status === 'agendado' ? 0.65 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '2px' }}>
            <span style={{ fontWeight: '600', color: t.status === 'agendado' ? '#6B6B8A' : '#E8E8F0', fontSize: '14px' }}>{t.descricao}</span>
            {t.status === 'agendado' && <span style={{ fontSize: '10px', background: 'rgba(167,139,250,0.15)', color: '#A78BFA', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>⏰</span>}
          </div>
          <div style={{ fontSize: '12px', color: '#6B6B8A' }}>{new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
          {t.subtipo === 'fixa_com_prazo' && extrairDataFim(t.observacao) && (
            <div style={{ fontSize: '11px', color: '#6B6B8A', marginTop: '2px' }}>📅 Até: {extrairDataFim(t.observacao)}</div>
          )}
          {extrairObs(t.observacao, t.subtipo) && (
            <div style={{ fontSize: '11px', color: '#6B6B8A', marginTop: '2px', fontStyle: 'italic' }}>📝 {extrairObs(t.observacao, t.subtipo)}</div>
          )}
        </div>
        <div style={{ fontWeight: '700', color: t.status === 'agendado' ? '#6B6B8A' : corTipo[t.tipo], fontSize: '14px', marginLeft: '8px', whiteSpace: 'nowrap' }}>
          {t.tipo === 'receita' ? '+' : '-'} {fmt(t.valor)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ background: bgTipo[t.tipo], color: corTipo[t.tipo], padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600' }}>
          {t.tipo.charAt(0).toUpperCase() + t.tipo.slice(1)}
        </span>
        {t.subtipo && (
          <span style={{ background: '#1E1E2E', color: '#A0A0C0', padding: '2px 8px', borderRadius: '6px', fontSize: '11px' }}>
            {labelSubtipo[t.subtipo]}
            {t.total_parcelas && t.parcela_atual ? ` ${t.parcela_atual}/${t.total_parcelas}` : ''}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          <button onClick={() => setEditando(t)} style={{ background: 'none', border: '1px solid #2D2D42', color: '#A78BFA', cursor: 'pointer', fontSize: '11px', padding: '3px 8px', borderRadius: '6px' }}>Editar</button>
          <button onClick={() => deletar(t.id)} style={{ background: 'none', border: '1px solid #2D2D42', color: '#6B6B8A', cursor: 'pointer', fontSize: '11px', padding: '3px 8px', borderRadius: '6px' }}>Deletar</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ padding, maxWidth: '1100px', margin: '0 auto' }}>

      {editando && (
        <ModalEditar transacao={editando} metas={metas} onClose={() => setEditando(null)} onSalvar={() => { setEditando(null); carregar() }} />
      )}

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '700', color: '#E8E8F0', letterSpacing: '-0.5px' }}>Transações</h1>
        <p style={{ color: '#6B6B8A', fontSize: '13px', marginTop: '4px' }}>Registre suas receitas, despesas e investimentos</p>
      </div>

      {/* Formulário */}
      <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: isMobile ? '16px' : '24px', marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Novo lançamento</div>

        {/* Tipo */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Tipo de lançamento</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
            {['receita', 'despesa', 'investimento'].map(t => (
              <button key={t} onClick={() => mudarTipo(t)} style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontWeight: '600', fontSize: '13px',
                background: form.tipo === t ? bgTipo[t] : '#1E1E2E',
                color: form.tipo === t ? corTipo[t] : '#6B6B8A',
                outline: form.tipo === t ? `1px solid ${corTipo[t]}` : 'none',
                flex: isMobile ? '1' : 'none',
              }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Subtipo despesa */}
        {form.tipo === 'despesa' && (
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>
              Tipo de despesa
              {form.subtipo && TOOLTIPS[form.subtipo] && <TooltipInfo texto={TOOLTIPS[form.subtipo]} />}
            </label>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
              {SUBTIPOS_DESPESA.map(s => (
                <button key={s.value} onClick={() => setForm({ ...form, subtipo: s.value })} style={{
                  padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px',
                  background: form.subtipo === s.value ? 'rgba(248,113,113,0.15)' : '#1E1E2E',
                  color: form.subtipo === s.value ? '#F87171' : '#6B6B8A',
                  outline: form.subtipo === s.value ? '1px solid #F87171' : 'none',
                  fontWeight: form.subtipo === s.value ? '600' : '400',
                }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Info investimento */}
        {form.tipo === 'investimento' && (
          <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#A78BFA' }}>
            💜 Investimentos são vinculados a uma meta e somam ao seu patrimônio.
          </div>
        )}

        {/* Info fixa */}
        {form.subtipo === 'fixa' && (
          <div style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#F87171' }}>
            🔄 Despesas fixas serão lançadas automaticamente nos próximos 24 meses.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: gridForm, gap: '10px' }}>
          <div>
            <label style={labelStyle}>Valor (R$)</label>
            <input placeholder="Ex: 1500" type="number" value={form.valor}
              onChange={e => setForm({ ...form, valor: e.target.value })}
              style={{ ...inputStyle, marginTop: '6px' }} />
          </div>
          <div>
            <label style={labelStyle}>
              Data
              {form.data && new Date(form.data + 'T00:00:00') > new Date() && (
                <span style={{ color: '#A78BFA', fontSize: '11px', marginLeft: '6px' }}>⏰ Será agendado</span>
              )}
            </label>
            <input type="date" value={form.data}
              onChange={e => setForm({ ...form, data: e.target.value })}
              style={{ ...inputStyle, marginTop: '6px' }} />
          </div>
          <div>
            <label style={labelStyle}>Categoria</label>
            <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }}>
              {CATEGORIAS[form.tipo].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Meta vinculada */}
          {form.tipo === 'investimento' && (
            <div style={{ gridColumn: isMobile ? '1' : 'span 2' }}>
              <label style={labelStyle}>Meta vinculada</label>
              <select value={form.meta_id} onChange={e => setForm({ ...form, meta_id: e.target.value })}
                style={{ ...inputStyle, marginTop: '6px', color: form.meta_id ? '#E8E8F0' : '#6B6B8A' }}>
                <option value="">Selecione a meta</option>
                {metas.map(m => <option key={m.id} value={m.id}>{m.titulo}</option>)}
              </select>
            </div>
          )}

          {/* Nº parcelas */}
          {form.subtipo === 'fixa_parcelada' && (
            <div>
              <label style={labelStyle}>Nº de parcelas</label>
              <input placeholder="Ex: 12" type="number" value={form.total_parcelas}
                onChange={e => setForm({ ...form, total_parcelas: e.target.value })}
                style={{ ...inputStyle, marginTop: '6px' }} />
            </div>
          )}

          {/* Data fim para fixa_com_prazo */}
          {form.subtipo === 'fixa_com_prazo' && (
            <div>
              <label style={labelStyle}>Data de término <span style={{ color: '#F87171' }}>*</span></label>
              <input type="date" value={form.data_fim}
                onChange={e => setForm({ ...form, data_fim: e.target.value })}
                style={{ ...inputStyle, marginTop: '6px' }} />
              <div style={{ fontSize: '11px', color: '#6B6B8A', marginTop: '4px' }}>
                O sistema lança automaticamente até esta data
              </div>
            </div>
          )}

          {/* Observação */}
          <div style={{ gridColumn: isMobile ? '1' : 'span 3' }}>
            <label style={labelStyle}>Observação (opcional)</label>
            <input placeholder="Alguma anotação" value={form.observacao}
              onChange={e => setForm({ ...form, observacao: e.target.value })}
              style={{ ...inputStyle, marginTop: '6px' }} />
          </div>
        </div>

        <button onClick={salvar} disabled={loading} style={{ ...btnStyle, width: isMobile ? '100%' : 'auto' }}>
          {loading ? 'Salvando...' : '+ Salvar lançamento'}
        </button>
      </div>

      {/* Navegação de mês */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navegarMes(-1)} style={navBtn}>‹</button>
          <span style={{ fontSize: '15px', fontWeight: '600', color: '#E8E8F0', textTransform: 'capitalize' }}>{nomeMes}</span>
          <button onClick={() => navegarMes(1)} style={navBtn}>›</button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['lancamentos', 'distribuicao'].map(a => (
            <button key={a} onClick={() => setAba(a)} style={{
              padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px',
              background: aba === a ? 'rgba(167,139,250,0.15)' : '#1E1E2E',
              color: aba === a ? '#A78BFA' : '#6B6B8A',
              fontWeight: aba === a ? '600' : '400',
            }}>
              {a === 'lancamentos' ? 'Lançamentos' : 'Distribuição'}
            </button>
          ))}
        </div>
      </div>

      {/* Aba lançamentos */}
      {aba === 'lancamentos' && (
        <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', overflow: 'hidden' }}>
          {transacoes.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6B6B8A', fontSize: '14px' }}>
              Nenhum lançamento em {nomeMes}
            </div>
          ) : isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {agendados.length > 0 && (
                <div style={{ padding: '8px 14px', background: 'rgba(167,139,250,0.05)', borderBottom: '1px solid #1E1E2E', fontSize: '12px', color: '#A78BFA' }}>
                  ⏰ {agendados.length} agendado(s) — não contabilizados ainda
                </div>
              )}
              {[...agendados, ...confirmados].map((t, i) => renderLinhaMobile(t, i))}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E1E2E' }}>
                  {['Data', 'Descrição', 'Tipo', 'Subtipo', 'Valor', 'Ações'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agendados.length > 0 && (
                  <tr style={{ background: 'rgba(167,139,250,0.03)' }}>
                    <td colSpan={6} style={{ padding: '6px 16px', fontSize: '11px', color: '#A78BFA', fontWeight: '600' }}>
                      ⏰ AGENDADOS — não contabilizados nos totais
                    </td>
                  </tr>
                )}
                {agendados.map((t, i) => renderLinhaDesktop(t, i))}
                {agendados.length > 0 && confirmados.length > 0 && (
                  <tr style={{ background: 'rgba(52,211,153,0.03)' }}>
                    <td colSpan={6} style={{ padding: '6px 16px', fontSize: '11px', color: '#34D399', fontWeight: '600' }}>
                      ✓ CONFIRMADOS
                    </td>
                  </tr>
                )}
                {confirmados.map((t, i) => renderLinhaDesktop(t, i))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Aba distribuição */}
      {aba === 'distribuicao' && (
        <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '20px' }}>
          <div style={{ fontSize: '13px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>
            Distribuição — {nomeMes}
          </div>
          {dadosPizza.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6B6B8A', padding: '40px' }}>Nenhum dado para exibir</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={dadosPizza} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                    {dadosPizza.map((_, i) => <Cell key={i} fill={CORES_PIZZA[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#1A1A24', border: '1px solid #2D2D42', borderRadius: '8px', color: '#E8E8F0' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {dadosPizza.map((d, i) => (
                  <div key={d.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#A0A0C0' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: CORES_PIZZA[i], display: 'inline-block' }} />
                        {d.name}
                      </span>
                      <span style={{ fontWeight: '600', color: CORES_PIZZA[i], fontSize: '13px' }}>{fmt(d.value)}</span>
                    </div>
                    <div style={{ background: '#1E1E2E', borderRadius: '4px', height: '6px' }}>
                      <div style={{ width: `${(d.value / dadosPizza.reduce((a, b) => a + b.value, 0)) * 100}%`, background: CORES_PIZZA[i], height: '6px', borderRadius: '4px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const labelStyle = { fontSize: '12px', color: '#6B6B8A', letterSpacing: '0.5px', display: 'flex', alignItems: 'center' }
const inputStyle = { padding: '11px 14px', borderRadius: '10px', border: '1px solid #2D2D42', fontSize: '14px', width: '100%', boxSizing: 'border-box', background: '#0F0F14', color: '#E8E8F0' }
const btnStyle = { marginTop: '16px', background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }
const navBtn = { background: '#1E1E2E', border: 'none', color: '#A78BFA', cursor: 'pointer', fontSize: '20px', width: '36px', height: '36px', borderRadius: '8px' }

export default Transacoes