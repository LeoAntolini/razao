import { useEffect, useState } from 'react'
import api from '../services/api'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const dadosGrafico = [
  { mes: 'Jan', patrimonio: 52000 },
  { mes: 'Fev', patrimonio: 58000 },
  { mes: 'Mar', patrimonio: 61000 },
  { mes: 'Abr', patrimonio: 67000 },
  { mes: 'Mai', patrimonio: 71000 },
  { mes: 'Jun', patrimonio: 78000 },
]

function Dashboard() {
  const [resumo, setResumo] = useState(null)
  const [metas, setMetas] = useState([])

  const mes = new Date().getMonth() + 1
  const ano = new Date().getFullYear()

  useEffect(() => {
    api.get(`/transacoes/resumo?mes=${mes}&ano=${ano}`).then(r => setResumo(r.data))
    api.get('/metas').then(r => setMetas(r.data))
  }, [])

  const fmt = (v) => `R$ ${(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  return (
    <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#E8E8F0', letterSpacing: '-0.5px' }}>
          Visão geral
        </h1>
        <p style={{ color: '#6B6B8A', fontSize: '14px', marginTop: '4px' }}>
          {new Date().toLocaleString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Receitas do mês', valor: resumo?.receitas, cor: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.15)' },
          { label: 'Despesas do mês', valor: resumo?.despesas, cor: '#F87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.15)' },
          { label: 'Saldo disponível', valor: resumo?.saldo, cor: '#A78BFA', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.15)' },
        ].map(card => (
          <div key={card.label} style={{
            background: card.bg,
            border: `1px solid ${card.border}`,
            borderRadius: '16px',
            padding: '24px',
          }}>
            <div style={{ fontSize: '12px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
              {card.label}
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: card.cor, letterSpacing: '-1px' }}>
              {fmt(card.valor)}
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico + Alocação */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>

        {/* Gráfico */}
        <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>
            Evolução do patrimônio
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={dadosGrafico}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="mes" tick={{ fill: '#6B6B8A', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B6B8A', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}k`} />
              <Tooltip
                contentStyle={{ background: '#1A1A24', border: '1px solid #2D2D42', borderRadius: '8px', color: '#E8E8F0' }}
                formatter={v => [`R$ ${v.toLocaleString('pt-BR')}`, 'Patrimônio']}
              />
              <Area type="monotone" dataKey="patrimonio" stroke="#7C3AED" strokeWidth={2.5} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Alocação sugerida */}
        <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>
            Sugestão de alocação
          </div>
          {resumo?.saldo > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { label: 'Investimento', pct: '60%', valor: resumo?.sugestao?.investimento, cor: '#34D399' },
                { label: 'Lazer', pct: '25%', valor: resumo?.sugestao?.lazer, cor: '#FBBF24' },
                { label: 'Gastos pessoais', pct: '15%', valor: resumo?.sugestao?.gastos_pessoais, cor: '#F87171' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', color: '#A0A0C0' }}>{item.label} <span style={{ color: '#6B6B8A' }}>({item.pct})</span></span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: item.cor }}>{fmt(item.valor)}</span>
                  </div>
                  <div style={{ background: '#1E1E2E', borderRadius: '4px', height: '6px' }}>
                    <div style={{ width: item.pct, background: item.cor, height: '6px', borderRadius: '4px' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#6B6B8A', fontSize: '14px' }}>Lance receitas para ver a sugestão</div>
          )}
        </div>
      </div>

      {/* Metas */}
      {metas.length > 0 && (
        <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>
            Objetivos
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {metas.map(meta => {
              const pct = Math.min((meta.valor_atual / meta.valor_alvo) * 100, 100)
              return (
                <div key={meta.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#E8E8F0' }}>{meta.titulo}</span>
                    <span style={{ fontSize: '13px', color: meta.concluida ? '#FBBF24' : '#A78BFA', fontWeight: '600' }}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ background: '#1E1E2E', borderRadius: '4px', height: '6px' }}>
                    <div style={{
                      width: `${pct}%`,
                      background: meta.concluida ? 'linear-gradient(90deg, #FBBF24, #F59E0B)' : 'linear-gradient(90deg, #7C3AED, #A78BFA)',
                      height: '6px', borderRadius: '4px',
                      transition: 'width 0.5s ease'
                    }} />
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