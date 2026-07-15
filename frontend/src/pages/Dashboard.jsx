import { useEffect, useState } from 'react'
import api from '../services/api'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

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
      <span
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ cursor: 'help', color: '#6B6B8A', fontSize: '11px', border: '1px solid #2D2D42', borderRadius: '50%', width: '15px', height: '15px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle' }}
      >?</span>
      {hover && (
        <span style={{ position: 'absolute', bottom: '22px', left: '0', background: '#1E1E2E', border: '1px solid #2D2D42', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#A0A0C0', width: '220px', zIndex: 100, lineHeight: '1.6' }}>
          {texto}
        </span>
      )}
    </span>
  )
}

function BannerMetaConcluida({ metas, onResgatar }) {
  const metasConcluidas = metas.filter(m => m.status === 'concluida' && m.valor_atual > 0)
  if (metasConcluidas.length === 0) return null

  return (
    <div style={{ marginBottom: '24px' }}>
      {metasConcluidas.map(meta => (
        <div key={meta.id} style={{
          background: 'linear-gradient(135deg, rgba(251,191,36,0.1), rgba(245,158,11,0.05))',
          border: '1px solid rgba(251,191,36,0.4)',
          borderRadius: '16px', padding: '20px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '32px' }}>🏆</span>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#FBBF24', marginBottom: '4px' }}>
                Meta concluída: {meta.titulo}
              </div>
              <div style={{ fontSize: '13px', color: '#A0A0C0' }}>
                Parabéns! Você acumulou <strong style={{ color: '#FBBF24' }}>R$ {meta.valor_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>. O que deseja fazer com esse valor?
              </div>
            </div>
          </div>
          <button onClick={() => onResgatar(meta)} style={{
            background: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
            color: '#000', border: 'none', borderRadius: '10px',
            padding: '10px 20px', fontSize: '13px', fontWeight: '700',
            cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: '16px'
          }}>
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '20px', padding: '32px', maxWidth: '480px', width: '90%' }}>
        <div style={{ fontSize: '20px', fontWeight: '700', color: '#E8E8F0', marginBottom: '8px' }}>
          🏆 Meta concluída!
        </div>
        <div style={{ fontSize: '14px', color: '#6B6B8A', marginBottom: '24px' }}>
          {meta.titulo} — <span style={{ color: '#FBBF24', fontWeight: '600' }}>{fmt(meta.valor_atual)}</span> acumulados
        </div>

        <div style={{ fontSize: '13px', color: '#6B6B8A', marginBottom: '12px' }}>
          O que deseja fazer com o valor acumulado?
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {[
            { value: 'resgatar', label: '💰 Resgatar como saldo livre', desc: 'O valor entra como receita e fica disponível no seu saldo do mês.' },
            { value: 'transferir', label: '🔄 Transferir para outra meta', desc: 'O valor vai direto para outra meta ativa.' },
            { value: 'manter', label: '🔒 Manter investido', desc: 'Deixa o valor no patrimônio sem resgatar. A meta fica no histórico.' },
          ].map(op => (
            <div key={op.value} onClick={() => setAcao(op.value)} style={{
              background: acao === op.value ? 'rgba(167,139,250,0.1)' : '#0F0F14',
              border: `1px solid ${acao === op.value ? '#A78BFA' : '#2D2D42'}`,
              borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#E8E8F0', marginBottom: '4px' }}>{op.label}</div>
              <div style={{ fontSize: '12px', color: '#6B6B8A' }}>{op.desc}</div>
            </div>
          ))}
        </div>

        {acao === 'transferir' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', color: '#6B6B8A', display: 'block', marginBottom: '6px' }}>Selecione a meta destino</label>
            <select value={metaDestino} onChange={e => setMetaDestino(e.target.value)} style={{ padding: '11px 14px', borderRadius: '10px', border: '1px solid #2D2D42', fontSize: '14px', width: '100%', background: '#0F0F14', color: '#E8E8F0' }}>
              <option value="">Selecione...</option>
              {metasDisponiveis.map(m => <option key={m.id} value={m.id}>{m.titulo} — {fmt(m.valor_atual)} / {fmt(m.valor_alvo)}</option>)}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #2D2D42', background: 'none', color: '#6B6B8A', cursor: 'pointer', fontSize: '14px' }}>
            Decidir depois
          </button>
          <button
            onClick={() => onConfirm(acao, metaDestino ? parseInt(metaDestino) : null)}
            disabled={!acao || (acao === 'transferir' && !metaDestino)}
            style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: acao ? 'linear-gradient(135deg, #7C3AED, #A78BFA)' : '#1E1E2E', color: acao ? '#fff' : '#6B6B8A', cursor: acao ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: '600' }}
          >
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
  const [periodo, setPeriodo] = useState('6')
  const [modalMeta, setModalMeta] = useState(null)

  const mes = new Date().getMonth() + 1
  const ano = new Date().getFullYear()

  const carregar = () => {
    api.get(`/transacoes/resumo?mes=${mes}&ano=${ano}`).then(r => setResumo(r.data))
    api.get('/metas').then(r => setMetas(r.data))
    api.get('/transacoes/patrimonio').then(r => setPatrimonio(r.data))
    api.get('/metas/patrimonio').then(r => setPatrimonioTotal(r.data))
  }

  useEffect(() => { carregar() }, [])

  const fmt = (v) => `R$ ${(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const dadosGrafico = patrimonio.slice(-parseInt(periodo))
  const saude = resumo?.saude_financeira ? SAUDE_INFO[resumo.saude_financeira] : null
  const metasAtivas = metas.filter(m => ['ativa', 'pausada'].includes(m.status))

  const confirmarResgate = async (acao, metaDestinoId) => {
    await api.post('/metas/resgatar', {
      meta_id: modalMeta.id,
      acao,
      meta_destino_id: metaDestinoId || null,
    })
    setModalMeta(null)
    carregar()
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>

      {modalMeta && (
        <ModalResgatar
          meta={modalMeta}
          metas={metas}
          onClose={() => setModalMeta(null)}
          onConfirm={confirmarResgate}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#E8E8F0', letterSpacing: '-0.5px' }}>Visão geral</h1>
        <p style={{ color: '#6B6B8A', fontSize: '14px', marginTop: '4px' }}>
          {new Date().toLocaleString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Banner de metas concluídas */}
      <BannerMetaConcluida metas={metas} onResgatar={setModalMeta} />

      {/* Cards principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Receitas do mês', valor: resumo?.receitas, cor: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.15)', tooltip: 'Tudo que entrou de dinheiro este mês: salário, freelance, dividendos, resgates de meta, etc.' },
          { label: 'Despesas do mês', valor: resumo?.total_despesas, cor: '#F87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.15)', tooltip: 'Soma de todas as despesas fixas e variáveis do mês. Investimentos não entram aqui.' },
          { label: 'Investido no mês', valor: resumo?.investimentos, cor: '#A78BFA', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.15)', tooltip: 'Valor aportado nas suas metas este mês. Vai para o patrimônio — não é gasto.' },
          { label: 'Saldo livre', valor: resumo?.saldo_livre, cor: '#FBBF24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.15)', tooltip: 'O que sobrou após todas as despesas e investimentos. É o dinheiro disponível para usar livremente.' },
        ].map(card => (
          <div key={card.label} style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: '16px', padding: '20px' }}>
            <div style={{ fontSize: '11px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
              {card.label} <InfoTooltip texto={card.tooltip} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: card.cor, letterSpacing: '-0.5px' }}>
              {fmt(card.valor)}
            </div>
          </div>
        ))}
      </div>

      {/* Card patrimônio total */}
      {patrimonioTotal && (
        <div style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Patrimônio total investido <InfoTooltip texto="Soma de tudo que você tem acumulado nas suas metas ativas, pausadas e concluídas." />
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#A78BFA', letterSpacing: '-1px' }}>
              {fmt(patrimonioTotal.patrimonio_total)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#6B6B8A', marginBottom: '4px' }}>{patrimonioTotal.metas} meta(s) ativa(s)</div>
            {resumo?.investimentos > 0 && (
              <div style={{ fontSize: '13px', color: '#34D399', fontWeight: '600' }}>
                + {fmt(resumo.investimentos)} este mês
              </div>
            )}
          </div>
        </div>
      )}

      {/* Saúde financeira */}
      {saude && (
        <div style={{ background: saude.bg, border: `1px solid ${saude.border}`, borderRadius: '16px', padding: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', display: 'flex', alignItems: 'center' }}>
              Saúde financeira do mês <InfoTooltip texto="Classificação baseada no percentual de investimentos e no quanto seus gastos fixos comprometem a renda." />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>{saude.emoji}</span>
              <span style={{ fontSize: '20px', fontWeight: '700', color: saude.cor }}>{saude.label}</span>
            </div>
            <div style={{ fontSize: '13px', color: '#A0A0C0', marginTop: '6px' }}>{saude.msg}</div>
          </div>
          {resumo?.comprometimento_fixos > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#6B6B8A', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                Fixos comprometem <InfoTooltip texto="Percentual da sua renda mensal comprometido com gastos fixos. Acima de 50% é sinal de alerta." />
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: resumo.comprometimento_fixos > 70 ? '#F87171' : resumo.comprometimento_fixos > 50 ? '#FBBF24' : '#34D399', letterSpacing: '-1px' }}>
                {resumo.comprometimento_fixos}%
              </div>
              <div style={{ fontSize: '11px', color: '#6B6B8A' }}>da renda mensal</div>
            </div>
          )}
        </div>
      )}

      {/* Gráfico + Sugestão */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center' }}>
              Evolução do patrimônio <InfoTooltip texto="Soma acumulada de todos os seus aportes em metas ao longo do tempo." />
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['3', '6', '12'].map(p => (
                <button key={p} onClick={() => setPeriodo(p)} style={{
                  padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  fontSize: '12px', fontWeight: periodo === p ? '600' : '400',
                  background: periodo === p ? 'rgba(167,139,250,0.15)' : '#1E1E2E',
                  color: periodo === p ? '#A78BFA' : '#6B6B8A',
                }}>{p}m</button>
              ))}
            </div>
          </div>
          {dadosGrafico.length === 0 ? (
            <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B6B8A', fontSize: '14px' }}>
              Nenhum investimento registrado ainda
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={dadosGrafico}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="mes" tick={{ fill: '#6B6B8A', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B6B8A', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: '#1A1A24', border: '1px solid #2D2D42', borderRadius: '8px', color: '#E8E8F0' }} formatter={v => [fmt(v), 'Patrimônio']} />
                <Area type="monotone" dataKey="patrimonio" stroke="#7C3AED" strokeWidth={2.5} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
            Sugestão de alocação <InfoTooltip texto="Baseado no seu saldo livre após todas as despesas e investimentos já realizados este mês." />
          </div>
          {!resumo || resumo.saldo_livre <= 0 ? (
            <div style={{ color: '#6B6B8A', fontSize: '13px', lineHeight: '1.6' }}>
              {!resumo ? 'Carregando...' : 'Sem saldo livre este mês. Lance suas receitas para ver a sugestão.'}
            </div>
          ) : (
            <>
              <div style={{ fontSize: '12px', color: '#6B6B8A', marginBottom: '16px' }}>
                Saldo livre: <span style={{ color: '#FBBF24', fontWeight: '600' }}>{fmt(resumo.saldo_livre)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { label: 'Investir', pct: '60%', valor: resumo.sugestao?.investimento, cor: '#34D399', tooltip: 'Especialistas recomendam investir ao menos 20% da renda. 60% do saldo livre é o ideal para crescer patrimônio.' },
                  { label: 'Lazer', pct: '25%', valor: resumo.sugestao?.lazer, cor: '#FBBF24', tooltip: 'Reservar parte para lazer é essencial. Cortar tudo dificulta manter a disciplina financeira no longo prazo.' },
                  { label: 'Gastos pessoais', pct: '15%', valor: resumo.sugestao?.gastos_pessoais, cor: '#F87171', tooltip: 'Margem para gastos variáveis inesperados, compras pessoais ou qualquer imprevisto do mês.' },
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
        <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>
            Objetivos ativos
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {metasAtivas.map(meta => {
              const pct = Math.min((meta.valor_atual / meta.valor_alvo) * 100, 100)
              return (
                <div key={meta.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#E8E8F0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {meta.titulo}
                      {meta.status === 'pausada' && <span style={{ fontSize: '10px', background: 'rgba(251,191,36,0.1)', color: '#FBBF24', padding: '2px 6px', borderRadius: '4px' }}>Pausada</span>}
                    </span>
                    <span style={{ fontSize: '13px', color: '#A78BFA', fontWeight: '600' }}>{pct.toFixed(0)}%</span>
                  </div>
                  <div style={{ background: '#1E1E2E', borderRadius: '4px', height: '6px' }}>
                    <div style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #7C3AED, #A78BFA)', height: '6px', borderRadius: '4px', transition: 'width 0.5s ease' }} />
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