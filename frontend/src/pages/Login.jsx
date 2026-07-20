import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { salvarSessao } from '../services/auth'

function Login() {
  const [form, setForm] = useState({ email: '', senha: '' })
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const entrar = async () => {
    if (!form.email || !form.senha) {
      setErro('Preencha email e senha')
      return
    }
    setLoading(true)
    setErro('')
    try {
      const res = await api.post('/auth/login', form)
      salvarSessao(res.data.token, res.data.usuario)
      navigate('/')
    } catch (e) {
      setErro(e.response?.data?.detail ?? 'Erro ao fazer login')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0F0F14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ background: 'linear-gradient(135deg, #A78BFA, #7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '800', fontSize: '42px', letterSpacing: '-1px', marginBottom: '8px' }}>
            Razão
          </div>
          <div style={{ color: '#6B6B8A', fontSize: '15px' }}>Seu controle financeiro pessoal</div>
        </div>

        {/* Card */}
        <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '20px', padding: '32px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#E8E8F0', marginBottom: '8px' }}>Entrar na conta</h2>
          <p style={{ fontSize: '14px', color: '#6B6B8A', marginBottom: '28px' }}>Bem-vindo de volta!</p>

          {erro && (
            <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px', color: '#F87171' }}>
              {erro}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && entrar()}
                style={{ ...inputStyle, marginTop: '6px' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.senha}
                onChange={e => setForm({ ...form, senha: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && entrar()}
                style={{ ...inputStyle, marginTop: '6px' }}
              />
            </div>
          </div>

          <button onClick={entrar} disabled={loading} style={btnStyle}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#6B6B8A' }}>
            Não tem conta?{' '}
            <Link to="/cadastro" style={{ color: '#A78BFA', textDecoration: 'none', fontWeight: '600' }}>
              Criar conta grátis
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

const labelStyle = { fontSize: '12px', color: '#6B6B8A', letterSpacing: '0.5px', display: 'block' }
const inputStyle = { padding: '12px 14px', borderRadius: '10px', border: '1px solid #2D2D42', fontSize: '14px', width: '100%', boxSizing: 'border-box', background: '#0F0F14', color: '#E8E8F0' }
const btnStyle = { width: '100%', background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.3px' }

export default Login