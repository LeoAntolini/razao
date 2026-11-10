import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import { useWindowSize } from '../useWindowSize'

const fmt = (v) => `R$ ${(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const tempo = (m) => {
  if (!isFinite(m)) return 'nunca (aporte insuficiente)'
  const meses = Math.ceil(m)
  const a = Math.floor(meses / 12)
  const r = meses % 12
  if (a === 0) return `${r} ${r === 1 ? 'mês' : 'meses'}`
  if (r === 0) return `${a} ${a === 1 ? 'ano' : 'anos'}`
  return `${a} ${a === 1 ? 'ano' : 'anos'} e ${r} ${r === 1 ? 'mês' : 'meses'}`
}

// Matemática financeira (aportes no fim do mês)
const fator = (i, n) => (i > 0 ? (Math.pow(1 + i, n) - 1) / i : n)
const saldoApos = (inicial, aporte, i, k) => inicial * Math.pow(1 + i, k) + aporte * fator(i, k)
const aporteNecessario = (meta, inicial, i, n) => Math.max((meta - inicial * Math.pow(1 + i, n)) / fator(i, n), 0)
const mesesParaMeta = (meta, inicial, aporte, i) => {
  if (inicial >= meta) return 0
  if (aporte <= 0) return i > 0 && inicial > 0 ? Math.log(meta / inicial) / Math.log(1 + i) : Infinity
  if (i === 0) return (meta - inicial) / aporte
  return Math.log((meta * i + aporte) / (inicial * i + aporte)) / Math.log(1 + i)
}

// Aceita vírgula ou ponto como separador decimal
const num = (v) => parseFloat(String(v).replace(',', '.')) || 0
// Mantém só dígitos, vírgula e ponto enquanto digita
const limpar = (v) => v.replace(/[^\d.,]/g, '')

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

// Fica FORA do componente Simulador de propósito: se fosse declarado dentro,
// o React recriaria o campo a cada tecla e o cursor sairia dele.
function CampoNum({ label, dica, valor, onChange, placeholder }) {
  return (
    <div>
      <label style={labelStyle}>{label}{dica && <InfoTooltip texto={dica} />}</label>
      <div style={{ marginTop: '6px' }}>
        <input
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={valor}
          onChange={e => onChange(limpar(e.target.value))}
          style={inputStyle}
        />
      </div>
    </div>
  )
}

function Simulador() {
  const { isMobile } = useWindowSize()
  const [criada, setCriada] = useState(false)
  const [criando, setCriando] = useState(false)
  const [f, setF] = useState({
    nome: '', meta: '', prazo: '', inicial: '', taxa: '0,8',
    renda: '', custo: '', mesesReserva: '6', reservaAtual: '', pctAplic: '20',
  })
  const set = (k, v) => { setF(prev => ({ ...prev, [k]: v })); setCriada(false) }

  // Preenche renda e custo fixo com os dados do mês atual
  useEffect(() => {
    const hoje = new Date()
    api.get(`/transacoes/resumo?mes=${hoje.getMonth() + 1}&ano=${hoje.getFullYear()}`).then(r => {
      setF(prev => ({
        ...prev,
        renda: prev.renda || (r.data.receitas > 0 ? String(r.data.receitas).replace('.', ',') : ''),
        custo: prev.custo || (r.data.despesas_fixas > 0 ? String(r.data.despesas_fixas).replace('.', ',') : ''),
      }))
    }).catch(() => {})
  }, [])

  const meta = num(f.meta)
  const n = Math.min(Math.round(num(f.prazo)), 600)
  const inicial = num(f.inicial)
  const i = num(f.taxa) / 100
  const renda = num(f.renda)
  const custo = num(f.custo)
  const pronto = meta > 0 && n > 0

  const aporte = pronto ? aporteNecessario(meta, inicial, i, n) : 0
  const totalAportado = inicial + aporte * n
  const rendimento = Math.max(meta - totalAportado, 0)
  const sobra = renda - custo
  const pctRenda = renda > 0 ? (aporte / renda) * 100 : null
  const cabe = renda > 0 ? aporte <= sobra : null
  const mesesComSobra = pronto && sobra > 0 ? mesesParaMeta(meta, inicial, sobra, i) : Infinity
  const aplicMensal = renda * (num(f.pctAplic) / 100)
  const mesesAplic = pronto && renda > 0 ? mesesParaMeta(meta, inicial, aplicMensal, i) : Infinity
  const reservaAlvo = custo * num(f.mesesReserva)
  const reservaFalta = Math.max(reservaAlvo - num(f.reservaAtual), 0)
  const mesesReserva = sobra > 0 ? reservaFalta / sobra : Infinity

  const dados = pronto
    ? Array.from({ length: n + 1 }, (_, k) => ({
        mes: k,
        comRendimento: Math.round(saldoApos(inicial, aporte, i, k) * 100) / 100,
        soAportes: Math.round((inicial + aporte * k) * 100) / 100,
      }))
    : []

  const criarMeta = async () => {
    setCriando(true)
    const hoje = new Date()
    const alvo = new Date(hoje.getFullYear(), hoje.getMonth() + n, Math.min(hoje.getDate(), 28))
    const prazo = `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, '0')}-${String(alvo.getDate()).padStart(2, '0')}`
    try {
      await api.post('/metas', {
        titulo: f.nome || 'Meta do simulador',
        valor_alvo: meta,
        valor_atual: inicial,
        prazo,
        descricao: `Aporte sugerido: ${fmt(aporte)}/mês`,
      })
      setCriada(true)
    } catch {
      alert('Não foi possível criar a meta agora.')
    }
    setCriando(false)
  }

  const padding = isMobile ? '16px' : '32px'
  const grid3 = isMobile ? '1fr' : 'repeat(3, 1fr)'

  return (
    <div style={{ padding, maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '700', color: '#E8E8F0', letterSpacing: '-0.5px' }}>Simulador de metas</h1>
        <p style={{ color: '#6B6B8A', fontSize: '13px', marginTop: '4px' }}>Descubra quanto guardar por mês para chegar no seu objetivo</p>
      </div>

      {/* Entradas */}
      <div style={cardStyle}>
        <div style={tituloCard}>Dados da simulação</div>
        <div style={{ display: 'grid', gridTemplateColumns: grid3, gap: '12px' }}>
          <div>
            <label style={labelStyle}>Nome da meta (opcional)</label>
            <div style={{ marginTop: '6px' }}>
              <input placeholder="Ex: Viagem, Carro" value={f.nome} onChange={e => set('nome', e.target.value)} style={inputStyle} />
            </div>
          </div>
          <CampoNum label="Valor da meta (R$)" dica="Quanto você quer ter no final." valor={f.meta} onChange={v => set('meta', v)} placeholder="Ex: 30000" />
          <CampoNum label="Prazo (meses)" dica="Em quantos meses você quer chegar lá. Máximo de 600." valor={f.prazo} onChange={v => set('prazo', v)} placeholder="Ex: 24" />
          <CampoNum label="Já tenho guardado (R$)" dica="Valor que você já separou para esta meta. Ele também rende no período." valor={f.inicial} onChange={v => set('inicial', v)} placeholder="Ex: 2000 (ou 0)" />
          <CampoNum label="Rentabilidade (% ao mês)" dica="Quanto o investimento rende por mês. Use um valor realista; 0,8% a.m. é um ponto de partida comum para renda fixa. Use 0 para ver o cenário sem rendimento." valor={f.taxa} onChange={v => set('taxa', v)} placeholder="Ex: 0,8" />
          <CampoNum label="Renda mensal (R$)" dica="Preenchido com as receitas deste mês. Pode ajustar." valor={f.renda} onChange={v => set('renda', v)} placeholder="Ex: 5000" />
          <CampoNum label="Custo fixo mensal (R$)" dica="Preenchido com suas despesas fixas deste mês. Pode ajustar." valor={f.custo} onChange={v => set('custo', v)} placeholder="Ex: 2500" />
          <CampoNum label="Meses de reserva" dica="Para quantos meses de custo fixo você quer ter de reserva de emergência. O comum é de 3 a 12 meses, conforme a estabilidade da sua renda." valor={f.mesesReserva} onChange={v => set('mesesReserva', v)} placeholder="6" />
          <CampoNum label="Reserva já formada (R$)" valor={f.reservaAtual} onChange={v => set('reservaAtual', v)} placeholder="Ex: 1000 (ou 0)" />
        </div>
      </div>

      {!pronto ? (
        <div style={{ ...cardStyle, textAlign: 'center', color: '#6B6B8A', fontSize: '14px' }}>
          Informe o valor da meta e o prazo para ver o resultado.
        </div>
      ) : (
        <>
          {/* Resultado principal */}
          <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Você precisa guardar por mês</div>
            <div style={{ fontSize: isMobile ? '30px' : '38px', fontWeight: '800', color: '#A78BFA', letterSpacing: '-1px' }}>{fmt(aporte)}</div>
            {pctRenda !== null && (
              <div style={{ fontSize: '13px', color: '#A0A0C0', marginTop: '4px' }}>
                Isso é <strong style={{ color: '#E8E8F0' }}>{pctRenda.toFixed(1)}%</strong> da sua renda mensal
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: grid3, gap: '12px', marginBottom: '16px' }}>
            {[
              { label: 'Total que você aporta', valor: totalAportado, cor: '#E8E8F0', dica: 'Valor inicial somado a todos os aportes mensais.' },
              { label: 'Rendimento estimado', valor: rendimento, cor: '#34D399', dica: 'Quanto da meta vem dos juros, e não do seu bolso.' },
              { label: 'Sobra mensal (renda − fixos)', valor: renda > 0 ? sobra : null, cor: sobra >= 0 ? '#FBBF24' : '#F87171', dica: 'O que sobra da renda depois das despesas fixas.' },
            ].map(c => (
              <div key={c.label} style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '14px', padding: '14px 16px' }}>
                <div style={{ fontSize: '11px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', display: 'flex', alignItems: 'center' }}>{c.label}<InfoTooltip texto={c.dica} /></div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: c.cor }}>{c.valor === null ? '—' : fmt(c.valor)}</div>
              </div>
            ))}
          </div>

          {/* Viabilidade */}
          {renda > 0 ? (
            cabe ? (
              <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', fontSize: '13px', color: '#34D399' }}>
                ✓ Cabe no orçamento. Depois do aporte ainda sobram <strong>{fmt(sobra - aporte)}</strong> por mês.
              </div>
            ) : (
              <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', fontSize: '13px', color: '#F87171', lineHeight: '1.6' }}>
                ⚠️ Este aporte é maior que a sua sobra mensal ({fmt(sobra)}).{' '}
                {sobra > 0
                  ? <>Guardando toda a sobra, você chegaria na meta em <strong>{tempo(mesesComSobra)}</strong>. Considere aumentar o prazo ou reduzir a meta.</>
                  : <>Seus custos fixos consomem toda a renda. Revise as despesas fixas antes de assumir uma meta.</>}
              </div>
            )
          ) : (
            <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', fontSize: '13px', color: '#6B6B8A' }}>
              Informe renda e custo fixo para ver se o aporte cabe no seu orçamento.
            </div>
          )}

          {/* E se eu aplicar X% da renda? */}
          {renda > 0 && (
            <div style={cardStyle}>
              <div style={tituloCard}>E se eu aplicar uma % da renda?</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <input
                  type="text"
                  inputMode="decimal"
                  value={f.pctAplic}
                  onChange={e => set('pctAplic', limpar(e.target.value))}
                  style={{ ...inputStyle, width: '90px', textAlign: 'center', fontWeight: '700' }}
                />
                <span style={{ color: '#A0A0C0', fontSize: '14px' }}>% da renda = <strong style={{ color: '#A78BFA' }}>{fmt(aplicMensal)}</strong> por mês</span>
              </div>
              <div style={{ fontSize: '14px', color: '#A0A0C0' }}>
                Com esse aporte você chega na meta em <strong style={{ color: '#E8E8F0' }}>{tempo(mesesAplic)}</strong>.
              </div>
            </div>
          )}

          {/* Gráfico */}
          <div style={cardStyle}>
            <div style={tituloCard}>Evolução até a meta</div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={dados} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2E" vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: '#6B6B8A', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={30} tickFormatter={v => `${v}m`} />
                <YAxis tick={{ fill: '#6B6B8A', fontSize: 10 }} axisLine={false} tickLine={false} width={40} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip contentStyle={{ background: '#1A1A24', border: '1px solid #2D2D42', borderRadius: '8px', color: '#E8E8F0', fontSize: '12px' }}
                  formatter={(v, name) => [fmt(v), name]} labelFormatter={l => `Mês ${l}`} />
                <Line type="monotone" dataKey="comRendimento" name="Com rendimento" stroke="#7C3AED" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="soAportes" name="Só aportes" stroke="#6B6B8A" strokeWidth={2} strokeDasharray="5 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '12px', color: '#6B6B8A' }}>
              <span><span style={{ color: '#7C3AED' }}>━</span> Com rendimento</span>
              <span><span style={{ color: '#6B6B8A' }}>╌</span> Só aportes (sem juros)</span>
            </div>
          </div>

          {/* Criar meta */}
          <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '13px', color: '#A0A0C0' }}>Gostou do plano? Crie a meta já com o valor inicial e o prazo.</div>
            {criada ? (
              <Link to="/metas" style={{ color: '#34D399', fontWeight: '600', fontSize: '14px', textDecoration: 'none' }}>✓ Meta criada — ver em Metas →</Link>
            ) : (
              <button onClick={criarMeta} disabled={criando} style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                {criando ? 'Criando...' : '+ Criar esta meta'}
              </button>
            )}
          </div>
        </>
      )}

      {/* Reserva de emergência */}
      {custo > 0 && (
        <div style={cardStyle}>
          <div style={tituloCard}>Reserva de emergência</div>
          <div style={{ display: 'grid', gridTemplateColumns: grid3, gap: '12px', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#6B6B8A', marginBottom: '4px' }}>Reserva ideal ({f.mesesReserva || 0} meses de custo fixo)</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#FBBF24' }}>{fmt(reservaAlvo)}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#6B6B8A', marginBottom: '4px' }}>Falta formar</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: reservaFalta > 0 ? '#F87171' : '#34D399' }}>{reservaFalta > 0 ? fmt(reservaFalta) : 'Completa ✓'}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#6B6B8A', marginBottom: '4px' }}>Guardando a sobra mensal</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#E8E8F0' }}>{reservaFalta <= 0 ? '—' : sobra > 0 ? tempo(mesesReserva) : 'sem sobra'}</div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#6B6B8A', lineHeight: '1.6' }}>
            A reserva de emergência é proteção, não investimento para sonhos. O ideal é formá-la antes de focar em outras metas.
          </div>
        </div>
      )}

      {/* Como é calculado */}
      <div style={{ ...cardStyle, background: 'rgba(167,139,250,0.05)' }}>
        <div style={tituloCard}>Como é calculado</div>
        <div style={{ fontSize: '13px', color: '#A0A0C0', lineHeight: '1.9', fontFamily: 'monospace' }}>
          <div>Aporte = (Meta − Inicial × (1+i)ⁿ) × i ÷ ((1+i)ⁿ − 1)</div>
          <div>Reserva = Custo fixo × Meses de reserva</div>
          <div>Aplicação = % × Renda</div>
        </div>
        <div style={{ fontSize: '12px', color: '#6B6B8A', marginTop: '10px', lineHeight: '1.6' }}>
          i = rentabilidade ao mês (em decimal) e n = prazo em meses. Os aportes são considerados no fim de cada mês. É uma estimativa: imposto de renda, taxas e variação de rentabilidade não entram na conta.
        </div>
      </div>
    </div>
  )
}

const labelStyle = { fontSize: '12px', color: '#6B6B8A', letterSpacing: '0.5px', display: 'flex', alignItems: 'center' }
const inputStyle = { padding: '11px 14px', borderRadius: '10px', border: '1px solid #2D2D42', fontSize: '14px', width: '100%', boxSizing: 'border-box', background: '#0F0F14', color: '#E8E8F0' }
const cardStyle = { background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '20px', marginBottom: '16px' }
const tituloCard = { fontSize: '13px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }

export default Simulador