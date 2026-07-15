import { useEffect, useState } from 'react'
import api from '../services/api'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const TOOLTIPS = {
  fixa: 'Gasto que se repete todo mês com valor fixo. Ex: aluguel, academia, streaming.',
  fixa_parcelada: 'Compra dividida em parcelas mensais. Ex: eletrodoméstico 12x, roupa 3x.',
  fixa_com_prazo: 'Gasto fixo que termina em uma data definida. Ex: faculdade até dez/2027.',
  variavel: 'Gasto que muda todo mês conforme o consumo. Ex: mercado, gasolina, restaurante.',
  sazonal: 'Gasto que aparece uma vez por ano. Ex: IPTU, seguro do carro, presente de natal.',
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
  { value: 'fixa_com_prazo', label: 'Fixa com prazo' },
  { value: 'sazonal', label: 'Sazonal' },
]

const CORES_PIZZA = ['#F87171', '#FB923C', '#A78BFA', '#34D399']

function Tooltip_info({ texto }) {
  const [hover, setHover] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-block', marginLeft: '6px' }}>
      <span
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ cursor: 'help', color: '#6B6B8A', fontSize: '12px', border: '1px solid #2D2D42', borderRadius: '50%', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      >?</span>
      {hover && (
        <span style={{ position: 'absolute', bottom: '24px', left: '0', background: '#1E1E2E', border: '1px solid #2D2D42', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#A0A0C0', width: '220px', zIndex: 100, lineHeight: '1.5' }}>
          {texto}
        </span>
      )}
    </span>
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
  const [form, setForm] = useState({
    valor: '', tipo: 'receita', subtipo: 'variavel',
    categoria: 'Salário', data: '', meta_id: '',
    total_parcelas: '', data_termino: '', observacao: ''
  })

  const carregar = () => {
    api.get(`/transacoes?mes=${mes}&ano=${ano}`).then(r => setTransacoes(r.data))
    api.get(`/transacoes/grafico-pizza?mes=${mes}&ano=${ano}`).then(r => setPizza(r.data))
    api.get('/metas').then(r => setMetas(r.data.filter(m => !m.concluida)))
  }

  useEffect(() => { carregar() }, [mes, ano])

  const mudarTipo = (tipo) => {
    setForm({
      ...form, tipo,
      subtipo: tipo === 'despesa' ? 'variavel' : '',
      categoria: CATEGORIAS[tipo][0],
      meta_id: '', total_parcelas: '',
    })
  }

  const salvar = async () => {
    if (!form.valor || !form.data) {
      alert('Preencha valor e data')
      return
    }
    if (form.tipo === 'investimento' && !form.meta_id) {
      alert('Selecione a meta vinculada')
      return
    }
    if (form.subtipo === 'fixa_parcelada' && !form.total_parcelas) {
      alert('Informe o número de parcelas')
      return
    }
    setLoading(true)

    const descricao = form.tipo === 'receita'
      ? form.categoria
      : form.tipo === 'investimento'
        ? `Aporte — ${metas.find(m => m.id == form.meta_id)?.titulo ?? 'Meta'}`
        : `${form.categoria} (${SUBTIPOS_DESPESA.find(s => s.value === form.subtipo)?.label ?? ''})`

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
      observacao: form.observacao || null,
    })

    setForm({ valor: '', tipo: 'receita', subtipo: 'variavel', categoria: 'Salário', data: '', meta_id: '', total_parcelas: '', observacao: '' })
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

  const dadosPizza = pizza ? [
    { name: 'Despesas variáveis', value: pizza.despesas_variaveis },
    { name: 'Despesas fixas', value: pizza.despesas_fixas },
    { name: 'Investimentos', value: pizza.investimentos },
    { name: 'Dinheiro livre', value: pizza.dinheiro_livre },
  ].filter(d => d.value > 0) : []

  const corTipo = { receita: '#34D399', despesa: '#F87171', investimento: '#A78BFA' }
  const bgTipo = { receita: 'rgba(52,211,153,0.1)', despesa: 'rgba(248,113,113,0.1)', investimento: 'rgba(167,139,250,0.1)' }

  const labelSubtipo = { fixa: 'Fixa', fixa_parcelada: 'Parcelada', fixa_com_prazo: 'Com prazo', variavel: 'Variável', sazonal: 'Sazonal' }

  return (
    <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>

      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#E8E8F0', letterSpacing: '-0.5px' }}>Transações</h1>
        <p style={{ color: '#6B6B8A', fontSize: '14px', marginTop: '4px' }}>Registre suas receitas, despesas e investimentos</p>
      </div>

      {/* Formulário */}
      <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>
          Novo lançamento
        </div>

        {/* Tipo */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Tipo de lançamento</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            {['receita', 'despesa', 'investimento'].map(t => (
              <button key={t} onClick={() => mudarTipo(t)} style={{
                padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontWeight: '600', fontSize: '13px', transition: 'all 0.2s',
                background: form.tipo === t ? bgTipo[t] : '#1E1E2E',
                color: form.tipo === t ? corTipo[t] : '#6B6B8A',
                outline: form.tipo === t ? `1px solid ${corTipo[t]}` : 'none',
              }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Subtipo de despesa */}
        {form.tipo === 'despesa' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              Tipo de despesa
              {form.subtipo && TOOLTIPS[form.subtipo] && <Tooltip_info texto={TOOLTIPS[form.subtipo]} />}
            </label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
              {SUBTIPOS_DESPESA.map(s => (
                <button key={s.value} onClick={() => setForm({ ...form, subtipo: s.value })} style={{
                  padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontSize: '13px', transition: 'all 0.2s',
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

        {/* Investimento informativo */}
        {form.tipo === 'investimento' && (
          <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#A78BFA' }}>
            💜 Investimentos são vinculados a uma meta e somam ao seu patrimônio — não contam como despesa.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Valor (R$)</label>
            <input placeholder="Ex: 1500" type="number" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }} />
          </div>
          <div>
            <label style={labelStyle}>Data</label>
            <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }} />
          </div>
          <div>
            <label style={labelStyle}>Categoria</label>
            <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }}>
              {CATEGORIAS[form.tipo].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {form.tipo === 'investimento' && (
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Meta vinculada</label>
              <select value={form.meta_id} onChange={e => setForm({ ...form, meta_id: e.target.value })} style={{ ...inputStyle, marginTop: '6px', color: form.meta_id ? '#E8E8F0' : '#6B6B8A' }}>
                <option value="">Selecione a meta</option>
                {metas.map(m => <option key={m.id} value={m.id}>{m.titulo} — {fmt(m.valor_atual)} / {fmt(m.valor_alvo)}</option>)}
              </select>
            </div>
          )}

          {form.subtipo === 'fixa_parcelada' && (
            <div>
              <label style={labelStyle}>Número de parcelas</label>
              <input placeholder="Ex: 12" type="number" value={form.total_parcelas} onChange={e => setForm({ ...form, total_parcelas: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }} />
            </div>
          )}

          <div style={{ gridColumn: form.tipo === 'investimento' ? 'span 1' : 'span 3' }}>
            <label style={labelStyle}>Observação (opcional)</label>
            <input placeholder="Alguma anotação sobre este lançamento" value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }} />
          </div>
        </div>

        <button onClick={salvar} disabled={loading} style={btnStyle}>
          {loading ? 'Salvando...' : '+ Salvar lançamento'}
        </button>
      </div>

      {/* Navegação de mês */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navegarMes(-1)} style={navBtn}>‹</button>
          <span style={{ fontSize: '16px', fontWeight: '600', color: '#E8E8F0', minWidth: '160px', textAlign: 'center', textTransform: 'capitalize' }}>
            {nomeMes}
          </span>
          <button onClick={() => navegarMes(1)} style={navBtn}>›</button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['lancamentos', 'distribuicao'].map(a => (
            <button key={a} onClick={() => setAba(a)} style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: '500',
              background: aba === a ? 'rgba(167,139,250,0.15)' : '#1E1E2E',
              color: aba === a ? '#A78BFA' : '#6B6B8A',
            }}>
              {a === 'lancamentos' ? 'Lançamentos' : 'Distribuição'}
            </button>
          ))}
        </div>
      </div>

      {/* Aba Lançamentos */}
      {aba === 'lancamentos' && (
        <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1E1E2E' }}>
                {['Data', 'Descrição', 'Tipo', 'Subtipo', 'Valor', ''].map(h => (
                  <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '11px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transacoes.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#6B6B8A', fontSize: '14px' }}>
                  Nenhum lançamento em {nomeMes}
                </td></tr>
              )}
              {transacoes.map((t, i) => (
                <tr key={t.id} style={{ borderTop: i === 0 ? 'none' : '1px solid #1E1E2E' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#16161F'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={tdStyle}>{new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td style={{ ...tdStyle, fontWeight: '500', color: '#E8E8F0' }}>{t.descricao}</td>
                  <td style={tdStyle}>
                    <span style={{ background: bgTipo[t.tipo], color: corTipo[t.tipo], padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>
                      {t.tipo.charAt(0).toUpperCase() + t.tipo.slice(1)}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {t.subtipo && (
                      <span style={{ background: '#1E1E2E', color: '#A0A0C0', padding: '3px 10px', borderRadius: '6px', fontSize: '12px' }}>
                        {labelSubtipo[t.subtipo] ?? t.subtipo}
                        {t.total_parcelas && t.parcela_atual ? ` ${t.parcela_atual}/${t.total_parcelas}` : ''}
                        {t.parcela_atual === t.total_parcelas && (
                          <span style={{ color: '#FBBF24', marginLeft: '4px' }}>⚠️</span>
                        )}
                      </span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: '700', color: corTipo[t.tipo] }}>
                    {t.tipo === 'receita' ? '+' : '-'} {fmt(t.valor)}
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => deletar(t.id)} style={{ background: 'none', border: '1px solid #2D2D42', color: '#6B6B8A', cursor: 'pointer', fontSize: '12px', padding: '4px 10px', borderRadius: '6px' }}
                      onMouseEnter={e => { e.target.style.borderColor = '#F87171'; e.target.style.color = '#F87171' }}
                      onMouseLeave={e => { e.target.style.borderColor = '#2D2D42'; e.target.style.color = '#6B6B8A' }}>
                      Deletar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Aba Distribuição */}
      {aba === 'distribuicao' && (
        <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '24px' }}>
            Distribuição do mês — {nomeMes}
          </div>
          {dadosPizza.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6B6B8A', padding: '40px' }}>Nenhum dado para exibir neste mês</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={dadosPizza} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3} dataKey="value">
                    {dadosPizza.map((_, i) => <Cell key={i} fill={CORES_PIZZA[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#1A1A24', border: '1px solid #2D2D42', borderRadius: '8px', color: '#E8E8F0' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {dadosPizza.map((d, i) => (
                  <div key={d.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#A0A0C0' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: CORES_PIZZA[i], display: 'inline-block' }} />
                        {d.name}
                      </span>
                      <span style={{ fontWeight: '600', color: CORES_PIZZA[i] }}>{fmt(d.value)}</span>
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

const labelStyle = { fontSize: '12px', color: '#6B6B8A', letterSpacing: '0.5px', display: 'block' }
const inputStyle = { padding: '11px 14px', borderRadius: '10px', border: '1px solid #2D2D42', fontSize: '14px', width: '100%', boxSizing: 'border-box', background: '#0F0F14', color: '#E8E8F0' }
const btnStyle = { marginTop: '16px', background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 28px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }
const navBtn = { background: '#1E1E2E', border: 'none', color: '#A78BFA', cursor: 'pointer', fontSize: '20px', width: '36px', height: '36px', borderRadius: '8px' }
const tdStyle = { padding: '14px 20px', fontSize: '14px', color: '#A0A0C0' }

export default Transacoes