import { useEffect, useState } from 'react'
import api from '../services/api'

const TOOLTIPS = {
  titulo: 'Nome da sua meta. Ex: Reserva de emergência, Viagem Europa, Carro novo.',
  valor_alvo: 'Quanto você quer acumular no total para essa meta.',
  valor_inicial: 'Caso já tenha algum valor guardado antes de criar a meta. Deixe em 0 se ainda não começou.',
  prazo: 'Data limite para atingir a meta. Opcional — mas ajuda a manter o foco.',
  descricao: 'Uma descrição livre sobre essa meta. Ex: reserva para 6 meses de gastos fixos.',
  progresso: 'Percentual do valor alvo já acumulado via aportes de investimento.',
  estimativa: 'Calculada com base no ritmo atual de aportes. Pode variar conforme você aporta mais ou menos.',
  pausada: 'Meta temporariamente pausada. O valor permanece no patrimônio mas ela não aparece para novos aportes.',
  patrimonio: 'Soma de tudo que você tem investido nas suas metas ativas, pausadas e concluídas.',
}

function Tooltip({ texto }) {
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

function ModalResgatar({ meta, metas, onClose, onConfirm }) {
  const [acao, setAcao] = useState('')
  const [metaDestino, setMetaDestino] = useState('')
  const fmt = (v) => `R$ ${(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const metasDisponiveis = metas.filter(m => m.id !== meta.id && m.status === 'ativa')

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '20px', padding: '32px', maxWidth: '480px', width: '90%' }}>
        <div style={{ fontSize: '20px', fontWeight: '700', color: '#E8E8F0', marginBottom: '8px' }}>
          {meta.concluida ? '🏆 Meta concluída!' : '⚠️ Encerrar meta'}
        </div>
        <div style={{ fontSize: '14px', color: '#6B6B8A', marginBottom: '24px' }}>
          {meta.titulo} — <span style={{ color: '#A78BFA', fontWeight: '600' }}>{fmt(meta.valor_atual)}</span> acumulados
        </div>

        <div style={{ fontSize: '13px', color: '#6B6B8A', marginBottom: '12px' }}>
          O que deseja fazer com o valor acumulado?
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {[
            { value: 'resgatar', label: '💰 Resgatar como saldo livre', desc: 'O valor entra como receita e fica disponível no seu saldo.' },
            { value: 'transferir', label: '🔄 Transferir para outra meta', desc: 'O valor vai direto para outra meta ativa.' },
            { value: 'descartar', label: '🗑️ Descartar', desc: 'O dinheiro já foi usado fora do sistema. Remove sem registrar.' },
            ...(meta.concluida ? [{ value: 'manter', label: '🔒 Manter investido', desc: 'Deixa o valor no patrimônio sem resgatar.' }] : []),
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
            Cancelar
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

function Metas() {
  const [metas, setMetas] = useState([])
  const [patrimonio, setPatrimonio] = useState(null)
  const [form, setForm] = useState({ titulo: '', valor_alvo: '', valor_atual: '', prazo: '', descricao: '' })
  const [loading, setLoading] = useState(false)
  const [aba, setAba] = useState('ativas')
  const [modalMeta, setModalMeta] = useState(null)

  const carregar = () => {
    api.get('/metas').then(r => setMetas(r.data))
    api.get('/metas/patrimonio').then(r => setPatrimonio(r.data))
  }

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

  const pausar = async (id) => {
    await api.put(`/metas/${id}/pausar`)
    carregar()
  }

  const confirmarResgate = async (acao, metaDestinoId) => {
    if (!acao) return
    await api.post('/metas/resgatar', {
      meta_id: modalMeta.id,
      acao,
      meta_destino_id: metaDestinoId || null,
    })
    setModalMeta(null)
    carregar()
  }

  const fmt = (v) => `R$ ${(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  const marco = (pct) => {
    if (pct >= 100) return { msg: '🏆 Meta concluída!', cor: '#FBBF24' }
    if (pct >= 75) return { msg: '🔥 Quase lá! 75% concluído', cor: '#A78BFA' }
    if (pct >= 50) return { msg: '⚡ Você chegou na metade!', cor: '#34D399' }
    return null
  }

  const metasAtivas = metas.filter(m => m.status === 'ativa' || m.status === 'pausada')
  const metasConcluidas = metas.filter(m => m.status === 'concluida')
  const metasEncerradas = metas.filter(m => m.status === 'encerrada' || m.status === 'resgatada')

  const statusLabel = { ativa: 'Ativa', pausada: 'Pausada', concluida: 'Concluída', resgatada: 'Resgatada', encerrada: 'Encerrada' }
  const statusCor = { ativa: '#34D399', pausada: '#FBBF24', concluida: '#FBBF24', resgatada: '#A78BFA', encerrada: '#F87171' }

  return (
    <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Modal */}
      {modalMeta && (
        <ModalResgatar
          meta={modalMeta}
          metas={metas}
          onClose={() => setModalMeta(null)}
          onConfirm={confirmarResgate}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#E8E8F0', letterSpacing: '-0.5px' }}>Objetivos</h1>
          <p style={{ color: '#6B6B8A', fontSize: '14px', marginTop: '4px' }}>
            Crie metas e acompanhe seu progresso
          </p>
        </div>
        {patrimonio && (
          <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '16px', padding: '16px 24px', textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
              Patrimônio investido <Tooltip texto={TOOLTIPS.patrimonio} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#A78BFA', letterSpacing: '-0.5px' }}>
              {fmt(patrimonio.patrimonio_total)}
            </div>
            <div style={{ fontSize: '12px', color: '#6B6B8A', marginTop: '2px' }}>{patrimonio.metas} meta(s) ativa(s)</div>
          </div>
        )}
      </div>

      {/* Formulário */}
      <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>
          Nova meta
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Título <Tooltip texto={TOOLTIPS.titulo} /></label>
            <input placeholder="Ex: Reserva de emergência" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }} />
          </div>
          <div>
            <label style={labelStyle}>Valor alvo <Tooltip texto={TOOLTIPS.valor_alvo} /></label>
            <input placeholder="Ex: 10000" type="number" value={form.valor_alvo} onChange={e => setForm({ ...form, valor_alvo: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }} />
          </div>
          <div>
            <label style={labelStyle}>Valor inicial <Tooltip texto={TOOLTIPS.valor_inicial} /></label>
            <input placeholder="Ex: 2000 (ou deixe 0)" type="number" value={form.valor_atual} onChange={e => setForm({ ...form, valor_atual: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }} />
          </div>
          <div>
            <label style={labelStyle}>Prazo <Tooltip texto={TOOLTIPS.prazo} /></label>
            <input type="date" value={form.prazo} onChange={e => setForm({ ...form, prazo: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Descrição <Tooltip texto={TOOLTIPS.descricao} /></label>
            <input placeholder="Ex: 6 meses de despesas fixas guardados" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} style={{ ...inputStyle, marginTop: '6px' }} />
          </div>
        </div>
        <button onClick={salvar} disabled={loading} style={btnStyle}>
          {loading ? 'Salvando...' : '+ Criar meta'}
        </button>
      </div>

      {/* Aviso aportes */}
      <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '12px', padding: '14px 20px', marginBottom: '24px', fontSize: '13px', color: '#A78BFA' }}>
        💜 Para adicionar valor a uma meta, vá em <strong>Transações</strong>, selecione <strong>Investimento</strong> e escolha a meta vinculada.
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { key: 'ativas', label: `Ativas (${metasAtivas.length})` },
          { key: 'concluidas', label: `Concluídas (${metasConcluidas.length})` },
          { key: 'historico', label: `Histórico (${metasEncerradas.length})` },
        ].map(a => (
          <button key={a.key} onClick={() => setAba(a.key)} style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: aba === a.key ? '600' : '400',
            background: aba === a.key ? 'rgba(167,139,250,0.15)' : '#1E1E2E',
            color: aba === a.key ? '#A78BFA' : '#6B6B8A',
          }}>{a.label}</button>
        ))}
      </div>

      {/* Metas ativas */}
      {aba === 'ativas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {metasAtivas.length === 0 && (
            <div style={{ gridColumn: 'span 3', textAlign: 'center', color: '#6B6B8A', padding: '48px', fontSize: '14px' }}>
              Nenhuma meta ativa — crie sua primeira meta acima!
            </div>
          )}
          {metasAtivas.map(meta => {
            const pct = Math.min((meta.valor_atual / meta.valor_alvo) * 100, 100)
            const m = marco(pct)
            return (
              <div key={meta.id} style={{
                background: '#13131A',
                border: `1px solid ${meta.status === 'pausada' ? 'rgba(251,191,36,0.3)' : pct >= 100 ? 'rgba(251,191,36,0.4)' : '#1E1E2E'}`,
                borderRadius: '16px', padding: '24px', position: 'relative', overflow: 'hidden'
              }}>
                {pct >= 100 && <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '700', color: '#E8E8F0', fontSize: '16px', flex: 1, marginRight: '8px' }}>{meta.titulo}</span>
                  <span style={{ background: `rgba(${statusCor[meta.status] === '#34D399' ? '52,211,153' : statusCor[meta.status] === '#FBBF24' ? '251,191,36' : '167,139,250'},0.15)`, color: statusCor[meta.status], fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                    {statusLabel[meta.status]}
                  </span>
                </div>

                {meta.descricao && <div style={{ fontSize: '13px', color: '#6B6B8A', marginBottom: '12px' }}>{meta.descricao}</div>}
                {m && <div style={{ fontSize: '12px', color: m.cor, marginBottom: '12px', fontWeight: '500' }}>{m.msg}</div>}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#A0A0C0' }}>{fmt(meta.valor_atual)}</span>
                  <span style={{ fontSize: '13px', color: '#6B6B8A' }}>{fmt(meta.valor_alvo)}</span>
                </div>

                <div style={{ background: '#1E1E2E', borderRadius: '6px', height: '8px', marginBottom: '12px' }}>
                  <div style={{ width: `${pct}%`, background: pct >= 100 ? 'linear-gradient(90deg, #F59E0B, #FBBF24)' : 'linear-gradient(90deg, #7C3AED, #A78BFA)', height: '8px', borderRadius: '6px', transition: 'width 0.6s ease' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px', fontWeight: '800', color: pct >= 100 ? '#FBBF24' : '#A78BFA', letterSpacing: '-1px' }}>
                    {pct.toFixed(0)}%
                    <Tooltip texto={TOOLTIPS.progresso} />
                  </span>
                  {meta.prazo && (
                    <span style={{ fontSize: '12px', color: '#6B6B8A' }}>
                      Prazo: {new Date(meta.prazo + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => pausar(meta.id)} style={{ flex: 1, background: 'none', border: '1px solid #2D2D42', color: '#6B6B8A', cursor: 'pointer', fontSize: '12px', padding: '8px', borderRadius: '8px' }}
                    onMouseEnter={e => { e.target.style.borderColor = '#FBBF24'; e.target.style.color = '#FBBF24' }}
                    onMouseLeave={e => { e.target.style.borderColor = '#2D2D42'; e.target.style.color = '#6B6B8A' }}>
                    {meta.status === 'pausada' ? '▶ Retomar' : '⏸ Pausar'}
                  </button>
                  <button onClick={() => setModalMeta(meta)} style={{ flex: 1, background: 'none', border: '1px solid #2D2D42', color: '#6B6B8A', cursor: 'pointer', fontSize: '12px', padding: '8px', borderRadius: '8px' }}
                    onMouseEnter={e => { e.target.style.borderColor = '#F87171'; e.target.style.color = '#F87171' }}
                    onMouseLeave={e => { e.target.style.borderColor = '#2D2D42'; e.target.style.color = '#6B6B8A' }}>
                    {pct >= 100 ? '🏆 Resgatar' : '✕ Encerrar'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Metas concluídas */}
      {aba === 'concluidas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {metasConcluidas.length === 0 && (
            <div style={{ gridColumn: 'span 3', textAlign: 'center', color: '#6B6B8A', padding: '48px', fontSize: '14px' }}>
              Nenhuma meta concluída ainda. Continue aportando!
            </div>
          )}
          {metasConcluidas.map(meta => (
            <div key={meta.id} style={{ background: '#13131A', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '16px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏆</div>
              <div style={{ fontWeight: '700', color: '#E8E8F0', fontSize: '16px', marginBottom: '4px' }}>{meta.titulo}</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#FBBF24', letterSpacing: '-0.5px', marginBottom: '8px' }}>{fmt(meta.valor_atual)}</div>
              {meta.data_conclusao && (
                <div style={{ fontSize: '12px', color: '#6B6B8A', marginBottom: '16px' }}>
                  Concluída em {new Date(meta.data_conclusao + 'T00:00:00').toLocaleDateString('pt-BR')}
                </div>
              )}
              <button onClick={() => setModalMeta({ ...meta, concluida: true })} style={{ width: '100%', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#FBBF24', cursor: 'pointer', fontSize: '13px', padding: '10px', borderRadius: '8px', fontWeight: '600' }}>
                💰 Resgatar valor
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Histórico */}
      {aba === 'historico' && (
        <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '16px', overflow: 'hidden' }}>
          {metasEncerradas.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6B6B8A', padding: '48px', fontSize: '14px' }}>
              Nenhuma meta encerrada ou resgatada ainda
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E1E2E' }}>
                  {['Meta', 'Valor acumulado', 'Status', 'Data encerramento', 'Motivo'].map(h => (
                    <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '11px', color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metasEncerradas.map((meta, i) => (
                  <tr key={meta.id} style={{ borderTop: i === 0 ? 'none' : '1px solid #1E1E2E' }}>
                    <td style={tdStyle}><span style={{ fontWeight: '600', color: '#E8E8F0' }}>{meta.titulo}</span></td>
                    <td style={{ ...tdStyle, color: '#A78BFA', fontWeight: '600' }}>{fmt(meta.valor_atual)}</td>
                    <td style={tdStyle}>
                      <span style={{ background: meta.status === 'resgatada' ? 'rgba(167,139,250,0.1)' : 'rgba(248,113,113,0.1)', color: meta.status === 'resgatada' ? '#A78BFA' : '#F87171', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>
                        {statusLabel[meta.status]}
                      </span>
                    </td>
                    <td style={tdStyle}>{meta.data_encerramento ? new Date(meta.data_encerramento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td style={{ ...tdStyle, color: '#6B6B8A' }}>{meta.motivo_encerramento ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

const labelStyle = { fontSize: '12px', color: '#6B6B8A', letterSpacing: '0.5px', display: 'flex', alignItems: 'center' }
const inputStyle = { padding: '11px 14px', borderRadius: '10px', border: '1px solid #2D2D42', fontSize: '14px', width: '100%', boxSizing: 'border-box', background: '#0F0F14', color: '#E8E8F0' }
const btnStyle = { marginTop: '16px', background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 28px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }
const tdStyle = { padding: '14px 20px', fontSize: '14px', color: '#A0A0C0' }

export default Metas