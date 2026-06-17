import { useEffect, useState } from 'react'
import api from '../services/api'

const CATEGORIAS = ['Salário', 'Freelance', 'Investimento', 'Alimentação', 'Moradia', 'Saúde', 'Lazer', 'Transporte', 'Educação', 'Outros']

function Transacoes() {
  const [transacoes, setTransacoes] = useState([])
  const [form, setForm] = useState({
    descricao: '', valor: '', tipo: 'receita',
    categoria: 'Salário', data: '', observacao: ''
  })
  const [loading, setLoading] = useState(false)

  const carregar = () => api.get('/transacoes').then(r => setTransacoes(r.data))

  useEffect(() => { carregar() }, [])

  const salvar = async () => {
    if (!form.descricao || !form.valor || !form.data) {
      alert('Preencha descrição, valor e data')
      return
    }
    setLoading(true)
    await api.post('/transacoes', { ...form, valor: parseFloat(form.valor) })
    setForm({ descricao: '', valor: '', tipo: 'receita', categoria: 'Salário', data: '', observacao: '' })
    carregar()
    setLoading(false)
  }

  const deletar = async (id) => {
    if (!window.confirm('Deletar esta transação?')) return
    await api.delete(`/transacoes/${id}`)
    carregar()
  }

  const fmt = (v) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  return (
    <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#E8E8F0', letterSpacing: '-0.5px' }}>
          Transações
        </h1>
        <p style={{ color: '#6B6B8A', fontSize: '14px', marginTop: '4px' }}>
          Registre suas receitas e despesas
        </p>
      </div>

      {/* Formulário */}
      <div style={{
        background: '#13131A',
        border: '1px solid #1E1E2E',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ fontSize: '13px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>
          Novo lançamento
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <input
            placeholder="Descrição"
            value={form.descricao}
            onChange={e => setForm({ ...form, descricao: e.target.value })}
            style={inputStyle}
          />
          <input
            placeholder="Valor (ex: 1500)"
            type="number"
            value={form.valor}
            onChange={e => setForm({ ...form, valor: e.target.value })}
            style={inputStyle}
          />
          <input
            type="date"
            value={form.data}
            onChange={e => setForm({ ...form, data: e.target.value })}
            style={inputStyle}
          />
          <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} style={inputStyle}>
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>
          <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} style={inputStyle}>
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
          <input
            placeholder="Observação (opcional)"
            value={form.observacao}
            onChange={e => setForm({ ...form, observacao: e.target.value })}
            style={inputStyle}
          />
        </div>

        <button onClick={salvar} disabled={loading} style={btnStyle}>
          {loading ? 'Salvando...' : '+ Salvar lançamento'}
        </button>
      </div>

      {/* Tabela */}
      <div style={{
        background: '#13131A',
        border: '1px solid #1E1E2E',
        borderRadius: '16px',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1E1E2E' }}>
              {['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', ''].map(h => (
                <th key={h} style={{
                  padding: '14px 20px',
                  textAlign: 'left',
                  fontSize: '11px',
                  color: '#6B6B8A',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontWeight: '600'
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transacoes.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#6B6B8A', fontSize: '14px' }}>
                  Nenhum lançamento ainda — adicione sua primeira transação acima
                </td>
              </tr>
            )}
            {transacoes.map((t, i) => (
              <tr key={t.id} style={{
                borderTop: i === 0 ? 'none' : '1px solid #1E1E2E',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#16161F'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={tdStyle}>{new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td style={{ ...tdStyle, fontWeight: '500', color: '#E8E8F0' }}>{t.descricao}</td>
                <td style={tdStyle}>
                  <span style={{
                    background: '#1E1E2E',
                    color: '#A0A0C0',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}>{t.categoria}</span>
                </td>
                <td style={tdStyle}>
                  <span style={{
                    background: t.tipo === 'receita' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                    color: t.tipo === 'receita' ? '#34D399' : '#F87171',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {t.tipo === 'receita' ? 'Receita' : 'Despesa'}
                  </span>
                </td>
                <td style={{
                  ...tdStyle,
                  fontWeight: '700',
                  color: t.tipo === 'receita' ? '#34D399' : '#F87171',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  {t.tipo === 'receita' ? '+' : '-'} {fmt(t.valor)}
                </td>
                <td style={tdStyle}>
                  <button
                    onClick={() => deletar(t.id)}
                    style={{
                      background: 'none',
                      border: '1px solid #2D2D42',
                      color: '#6B6B8A',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { e.target.style.borderColor = '#F87171'; e.target.style.color = '#F87171' }}
                    onMouseLeave={e => { e.target.style.borderColor = '#2D2D42'; e.target.style.color = '#6B6B8A' }}
                  >
                    Deletar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const inputStyle = {
  padding: '11px 14px',
  borderRadius: '10px',
  border: '1px solid #2D2D42',
  fontSize: '14px',
  width: '100%',
  boxSizing: 'border-box',
  background: '#0F0F14',
  color: '#E8E8F0',
  transition: 'border 0.2s',
}

const btnStyle = {
  marginTop: '16px',
  background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  padding: '12px 28px',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  letterSpacing: '0.3px'
}

const tdStyle = {
  padding: '14px 20px',
  fontSize: '14px',
  color: '#A0A0C0'
}

export default Transacoes