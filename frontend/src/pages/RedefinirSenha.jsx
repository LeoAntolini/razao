import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../services/api'

function RedefinirSenha() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [ver, setVer] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [loading, setLoading] = useState(false)

  const redefinir = async () => {
    if (senha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres'); return }
    if (senha !== confirmar) { setErro('As senhas não coincidem'); return }
    setLoading(true)
    setErro('')
    try {
      await api.post('/auth/redefinir-senha', { token, nova_senha: senha })
      setSucesso(true)
    } catch (e) {
      setErro(e.response?.data?.detail ?? 'Não foi possível redefinir a senha')
    }
    setLoading(false)
  }

  const inputStyle = { padding: '12px 48px 12px 14px', borderRadius: '10px', border: '1px solid #2D2D42', fontSize: '14px', width: '100%', boxSizing: 'border-box', background: '#0F0F14', color: '#E8E8F0' }
  const olho = { position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: 0 }

  return (
    <div style={{ minHeight: '100vh', background: '#0F0F14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ background: 'linear-gradient(135deg, #A78BFA, #7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '800', fontSize: '42px', letterSpacing: '-1px' }}>Razão</div>
        </div>

        <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '20px', padding: '32px' }}>
          {!token ? (
            <>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#F87171', marginBottom: '10px' }}>Link inválido</h2>
              <p style={{ fontSize: '14px', color: '#A0A0C0', marginBottom: '20px' }}>Este link está incompleto. Solicite um novo.</p>
              <Link to="/esqueci-senha" style={{ color: '#A78BFA', fontWeight: '600', textDecoration: 'none' }}>Solicitar novo link</Link>
            </>
          ) : sucesso ? (
            <>
              <div style={{ fontSize: '40px', textAlign: 'center', marginBottom: '12px' }}>✅</div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#E8E8F0', textAlign: 'center', marginBottom: '10px' }}>Senha alterada!</h2>
              <p style={{ fontSize: '14px', color: '#A0A0C0', textAlign: 'center', marginBottom: '24px' }}>Agora você já pode entrar com a nova senha.</p>
              <Link to="/login" style={{ display: 'block', textAlign: 'center', background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', color: '#fff', borderRadius: '10px', padding: '14px', fontWeight: '700', textDecoration: 'none' }}>Ir para o login</Link>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#E8E8F0', marginBottom: '8px' }}>Criar nova senha</h2>
              <p style={{ fontSize: '14px', color: '#6B6B8A', marginBottom: '24px' }}>Escolha uma senha com pelo menos 6 caracteres.</p>

              {erro && (
                <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px', color: '#F87171' }}>
                  {erro} {erro.includes('expirado') && <Link to="/esqueci-senha" style={{ color: '#A78BFA' }}>Solicitar novo link</Link>}
                </div>
              )}

              <label style={{ fontSize: '12px', color: '#6B6B8A', display: 'block' }}>Nova senha</label>
              <div style={{ position: 'relative', marginTop: '6px', marginBottom: '16px' }}>
                <input type={ver ? 'text' : 'password'} placeholder="••••••••" value={senha} onChange={e => setSenha(e.target.value)} style={inputStyle} />
                <button onClick={() => setVer(!ver)} style={olho}>{ver ? '🙈' : '👁️'}</button>
              </div>

              <label style={{ fontSize: '12px', color: '#6B6B8A', display: 'block' }}>Confirmar nova senha</label>
              <div style={{ position: 'relative', marginTop: '6px', marginBottom: '24px' }}>
                <input type={ver ? 'text' : 'password'} placeholder="••••••••" value={confirmar}
                  onChange={e => setConfirmar(e.target.value)} onKeyDown={e => e.key === 'Enter' && redefinir()} style={inputStyle} />
              </div>

              <button onClick={redefinir} disabled={loading} style={{ width: '100%', background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default RedefinirSenha