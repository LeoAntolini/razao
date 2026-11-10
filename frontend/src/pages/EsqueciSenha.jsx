import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const enviar = async () => {
    if (!email.trim()) { setErro('Informe seu e-mail'); return }
    setLoading(true)
    setErro('')
    try {
      await api.post('/auth/esqueci-senha', { email: email.trim() })
      setEnviado(true)
    } catch {
      setErro('Não foi possível enviar agora. Tente novamente em instantes.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0F0F14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ background: 'linear-gradient(135deg, #A78BFA, #7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '800', fontSize: '42px', letterSpacing: '-1px' }}>Razão</div>
        </div>

        <div style={{ background: '#13131A', border: '1px solid #1E1E2E', borderRadius: '20px', padding: '32px' }}>
          {enviado ? (
            <>
              <div style={{ fontSize: '40px', textAlign: 'center', marginBottom: '12px' }}>📬</div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#E8E8F0', textAlign: 'center', marginBottom: '10px' }}>Verifique seu e-mail</h2>
              <p style={{ fontSize: '14px', color: '#A0A0C0', textAlign: 'center', lineHeight: '1.6', marginBottom: '24px' }}>
                Se <strong style={{ color: '#E8E8F0' }}>{email}</strong> estiver cadastrado, você vai receber um link para redefinir a senha. Ele vale por 1 hora. Confira também o spam.
              </p>
              <Link to="/login" style={{ display: 'block', textAlign: 'center', color: '#A78BFA', fontWeight: '600', textDecoration: 'none', fontSize: '14px' }}>Voltar para o login</Link>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#E8E8F0', marginBottom: '8px' }}>Esqueceu a senha?</h2>
              <p style={{ fontSize: '14px', color: '#6B6B8A', marginBottom: '24px' }}>Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>

              {erro && (
                <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px', color: '#F87171' }}>{erro}</div>
              )}

              <label style={{ fontSize: '12px', color: '#6B6B8A', display: 'block' }}>Email</label>
              <input type="email" placeholder="seu@email.com" value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && enviar()}
                style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid #2D2D42', fontSize: '14px', width: '100%', boxSizing: 'border-box', background: '#0F0F14', color: '#E8E8F0', marginTop: '6px', marginBottom: '20px' }} />

              <button onClick={enviar} disabled={loading} style={{ width: '100%', background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
                {loading ? 'Enviando... (pode levar alguns segundos)' : 'Enviar link'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <Link to="/login" style={{ color: '#6B6B8A', textDecoration: 'none', fontSize: '14px' }}>← Voltar para o login</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default EsqueciSenha