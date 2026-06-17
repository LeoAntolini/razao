import { useEffect, useState } from 'react'
import api from '../services/api'

function Metas() {
  const [metas, setMetas] = useState([])
  const [form, setForm] = useState({ titulo: '', valor_alvo: '', valor_atual: '', prazo: '', descricao: '' })
  const [loading, setLoading] = useState(false)

  const carregar = () => api.get('/metas').then(r => setMetas(r.data))

  useEffect(() => { carregar() }, [])

  const salvar = async () => {
    if (!form.titulo || !form.valor_alvo) {
      alert('Preencha título e valor alvo')
      return
    }
    setLoading(true)
    await api.post('/metas', {
      ...form,
      valor_alvo: parseFloat(form.valor_alvo),
      valor_atual: parseFloat(form.valor_atual || 0),
      prazo: form.prazo || null
    })
    setForm({ titulo: '', valor_alvo: '', valor_atual: '', prazo: '', descricao: '' })
    carregar()
    setLoading(false)
  }

  const deletar = async (id) => {
    if (!window.confirm('Deletar esta meta?')) return
    await api.delete(`/metas/${id}`)
    carregar()
  }

  const fmt = (v) => `R$ ${(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  return (
    <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#E8E8F0', letterSpacing: '-0.5px' }}>
          Objetivos
        </h1>
        <p style={{ color: '#6B6B8A', fontSize: '14px', marginTop: '4px' }}>
          Defina e acompanhe suas metas financeiras
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
          Nova meta
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <input placeholder="Título da meta" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} style={inputStyle} />
          <input placeholder="Valor alvo (ex: 10000)" type="number" value={form.valor_alvo} onChange={e => setForm({ ...form, valor_alvo: e.target.value })} style={inputStyle} />
          <input placeholder="Valor atual (ex: 2000)" type="number" value={form.valor_atual} onChange={e => setForm({ ...form, valor_atual: e.target.value })} style={inputStyle} />
          <input type="date" value={form.prazo} onChange={e => setForm({ ...form, prazo: e.target.value })} style={inputStyle} />
          <input placeholder="Descrição (opcional)" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} style={{ ...inputStyle, gridColumn: 'span 2' }} />
        </div>
        <button onClick={salvar} disabled={loading} style={btnStyle}>
          {loading ? 'Salvando...' : '+ Criar meta'}
        </button>
      </div>

      {/* Grid de metas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {metas.length === 0 && (
          <div style={{ gridColumn: 'span 3', textAlign: 'center', color: '#6B6B8A', padding: '48px', fontSize: '14px' }}>
            Nenhuma meta criada ainda — defina seu primeiro objetivo acima
          </div>
        )}
        {metas.map(meta => {
          const pct = Math.min((meta.valor_atual / meta.valor_alvo) * 100, 100)
          return (
            <div key={meta.id} style={{
              background: '#13131A',
              border: `1px solid ${meta.concluida ? 'rgba(251,191,36,0.3)' : '#1E1E2E'}`,
              borderRadius: '16px',
              padding: '24px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Glow de fundo se concluída */}
              {meta.concluida && (
                <div style={{
                  position: 'absolute', top: 0, right: 0,
                  width: '120px', height: '120px',
                  background: 'radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 70%)',
                  pointerEvents: 'none'
                }} />
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{ fontWeight: '700', color: '#E8E8F0', fontSize: '16px' }}>{meta.titulo}</span>
                {meta.concluida && (
                  <span style={{
                    background: 'rgba(251,191,36,0.15)',
                    color: '#FBBF24',
                    fontSize: '10px',
                    fontWeight: '700',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    letterSpacing: '0.5px'
                  }}>
                    ✓ CONCLUÍDA
                  </span>
                )}
              </div>

              {meta.descricao && (
                <div style={{ fontSize: '13px', color: '#6B6B8A', marginBottom: '16px' }}>{meta.descricao}</div>
              )}

              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#A0A0C0' }}>{fmt(meta.valor_atual)}</span>
                  <span style={{ fontSize: '13px', color: '#6B6B8A' }}>{fmt(meta.valor_alvo)}</span>
                </div>
                <div style={{ background: '#1E1E2E', borderRadius: '6px', height: '8px' }}>
                  <div style={{
                    width: `${pct}%`,
                    background: meta.concluida
                      ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                      : 'linear-gradient(90deg, #7C3AED, #A78BFA)',
                    height: '8px',
                    borderRadius: '6px',
                    transition: 'width 0.6s ease'
                  }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <span style={{
                  fontSize: '22px',
                  fontWeight: '800',
                  color: meta.concluida ? '#FBBF24' : '#A78BFA',
                  letterSpacing: '-1px'
                }}>
                  {pct.toFixed(0)}%
                </span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {meta.prazo && (
                    <span style={{ fontSize: '12px', color: '#6B6B8A' }}>
                      {new Date(meta.prazo + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  )}
                  <button
                    onClick={() => deletar(meta.id)}
                    style={{
                      background: 'none',
                      border: '1px solid #2D2D42',
                      color: '#6B6B8A',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                    }}
                    onMouseEnter={e => { e.target.style.borderColor = '#F87171'; e.target.style.color = '#F87171' }}
                    onMouseLeave={e => { e.target.style.borderColor = '#2D2D42'; e.target.style.color = '#6B6B8A' }}
                  >
                    Deletar
                  </button>
                </div>
              </div>
            </div>
          )
        })}
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

export default Metas