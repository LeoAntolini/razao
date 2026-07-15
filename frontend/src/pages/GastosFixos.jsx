import { useEffect, useState } from 'react'
import api from '../services/api'

const CATEGORIAS = ['Moradia', 'Educação', 'Saúde', 'Assinatura', 'Transporte', 'Alimentação', 'Outros']

function GastosFixos() {
  const [gastos, setGastos] = useState([])
  const [gastosMes, setGastosMes] = useState(null)
  const [form, setForm] = useState({
    descricao: '', valor: '', categoria: 'Moradia',
    tipo: 'sem_prazo', total_parcelas: '', data_termino: '',
    mes_inicio: new Date().toISOString().slice(0, 7)
  })
  const [loading, setLoading] = useState(false)

  const mes = new Date().getMonth() + 1
  const ano = new Date().getFullYear()

  const carregar = () => {
    api.get('/gastos-fixos').then(r => setGastos(r.data))
    api.get(`/gastos-fixos/mes/${ano}/${mes}`).then(r => setGastosMes(r.data))
  }

  useEffect(() => { carregar() }, [])

  const salvar = async () => {
    if (!form.descricao || !form.valor) {
      alert('Preencha descrição e valor')
      return
    }
    if (form.tipo === 'parcelado' && !form.total_parcelas) {
      alert('Informe o número de parcelas')
      return
    }
    if (form.tipo === 'com_prazo' && !form.data_termino) {
      alert('Informe a data de término')
      return
    }
    setLoading(true)
    await api.post('/gastos-fixos', {
      ...form,
      valor: parseFloat(form.valor),
      total_parcelas: form.total_parcelas ? parseInt(form.total_parcelas) : null,
      data_termino: form.data_termino || null,
    })
    setForm({ descricao: '', valor: '', categoria: 'Moradia', tipo: 'sem_prazo', total_parcelas: '', data_termino: '', mes_inicio: new Date().toISOString().slice(0, 7) })
    carregar()
    setLoading(false)
  }

  const desativar = async (id) => {
    if (!window.confirm('Encerrar este gasto fixo?')) return
    await api.delete(`/gastos-fixos/${id}`)
    carregar()
  }

  const fmt = (v) => `R$ ${(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  const labelTipo = { sem_prazo: 'Fixo', parcelado: 'Parcelado', com_prazo: 'Com prazo' }
  const corTipo = { sem_prazo: '#FBBF24', parcelado: '#F87171', com_prazo: '#A78BFA' }
  const bgTipo = { sem_prazo: 'rgba(251,191,36,0.1)', parcelado: 'rgba(248,113,113,0.1)', com_prazo: 'rgba(167,139,250,0.1)' }

  return (
    <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#E8E8F0', letterSpacing: '-0.5px' }}>Gastos Fixos</h1>
        <p style={{ color: '#6B6B8A', fontSize: '14px', marginTop: '4px' }}>Cadastre compromissos financeiros recorrentes ou parcelados</p>
      </div>

      {/* Card resumo do mês */}
      {gastosMes && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '16px', padding: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
              Total comprometido este mês
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#F87171', letterSpacing: '-1px' }}>
              {fmt(gastosMes.total)}
            </div>
          </div>
          <div style={{ fontSize: '13px', color: '#6B6B8A', textAlign: 'right' }}>
            {gastosMes.gastos?.length ?? 0} compromisso(s) ativo(s) este mês
          </div>
        </div>
      )}

      {/* Formulário */}
      <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>
          Novo gasto fixo
        </div>

        {/* Tipo */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {['sem_prazo', 'parcelado', 'com_prazo'].map(t => (
            <button key={t} onClick={() => setForm({ ...form, tipo: t })} style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontWeight: '600', fontSize: '13px', transition: 'all 0.2s',
              background: form.tipo === t ? bgTipo[t] : '#1E1E2E',
              color: form.tipo === t ? corTipo[t] : '#6B6B8A',
              outline: form.tipo === t ? `1px solid ${corTipo[t]}` : 'none',
            }}>
              {labelTipo[t]}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <input placeholder="Descrição (ex: Aluguel)" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} style={inputStyle} />
          <input placeholder="Valor mensal" type="number" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} style={inputStyle} />
          <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} style={inputStyle}>
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: '#6B6B8A', letterSpacing: '0.5px' }}>Mês de início</label>
            <input type="month" value={form.mes_inicio} onChange={e => setForm({ ...form, mes_inicio: e.target.value })} style={inputStyle} />
          </div>
          {form.tipo === 'parcelado' && (
            <input placeholder="Número de parcelas (ex: 12)" type="number" value={form.total_parcelas} onChange={e => setForm({ ...form, total_parcelas: e.target.value })} style={inputStyle} />
          )}
          {form.tipo === 'com_prazo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: '#6B6B8A', letterSpacing: '0.5px' }}>Data de término</label>
              <input type="date" value={form.data_termino} onChange={e => setForm({ ...form, data_termino: e.target.value })} style={inputStyle} />
            </div>
          )}
        </div>

        <button onClick={salvar} disabled={loading} style={btnStyle}>
          {loading ? 'Salvando...' : '+ Adicionar gasto fixo'}
        </button>
      </div>

      {/* Lista */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {gastos.length === 0 && (
          <div style={{ gridColumn: 'span 3', textAlign: 'center', color: '#6B6B8A', padding: '48px', fontSize: '14px' }}>
            Nenhum gasto fixo cadastrado ainda
          </div>
        )}
        {gastos.map(g => {
          const ultimaParcela = gastosMes?.gastos?.find(gm => gm.id === g.id)?.ultima_parcela
          return (
            <div key={g.id} style={{
              background: '#13131A', border: `1px solid ${ultimaParcela ? 'rgba(251,191,36,0.4)' : '#1E1E2E'}`,
              borderRadius: '16px', padding: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{ fontWeight: '700', color: '#E8E8F0', fontSize: '15px' }}>{g.descricao}</span>
                <span style={{ background: bgTipo[g.tipo], color: corTipo[g.tipo], fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px' }}>
                  {labelTipo[g.tipo]}
                </span>
              </div>

              {ultimaParcela && (
                <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px', fontSize: '12px', color: '#FBBF24', fontWeight: '600' }}>
                  ⚠️ Última parcela!
                </div>
              )}

              <div style={{ fontSize: '24px', fontWeight: '800', color: '#F87171', letterSpacing: '-1px', marginBottom: '8px' }}>
                {fmt(g.valor)}<span style={{ fontSize: '13px', fontWeight: '400', color: '#6B6B8A' }}>/mês</span>
              </div>

              <div style={{ fontSize: '12px', color: '#6B6B8A', marginBottom: '12px' }}>
                <span style={{ background: '#1E1E2E', padding: '2px 8px', borderRadius: '4px', marginRight: '8px' }}>{g.categoria}</span>
                {g.tipo === 'parcelado' && g.total_parcelas && (
                  <span>{g.parcelas_pagas ?? 0}/{g.total_parcelas} parcelas</span>
                )}
                {g.tipo === 'com_prazo' && g.data_termino && (
                  <span>Até {new Date(g.data_termino + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                )}
              </div>

              <button onClick={() => desativar(g.id)} style={{ background: 'none', border: '1px solid #2D2D42', color: '#6B6B8A', cursor: 'pointer', fontSize: '12px', padding: '6px 12px', borderRadius: '8px', width: '100%' }}
                onMouseEnter={e => { e.target.style.borderColor = '#F87171'; e.target.style.color = '#F87171' }}
                onMouseLeave={e => { e.target.style.borderColor = '#2D2D42'; e.target.style.color = '#6B6B8A' }}>
                Encerrar gasto
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const inputStyle = {
  padding: '11px 14px', borderRadius: '10px', border: '1px solid #2D2D42',
  fontSize: '14px', width: '100%', boxSizing: 'border-box',
  background: '#0F0F14', color: '#E8E8F0',
}

const btnStyle = {
  marginTop: '16px', background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
  color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 28px',
  fontSize: '14px', fontWeight: '600', cursor: 'pointer',
}

export default GastosFixos