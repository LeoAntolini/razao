import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getUsuario, logout } from '../services/auth'
import { useWindowSize } from '../useWindowSize'

function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const usuario = getUsuario()
  const { isMobile } = useWindowSize()
  const [menuAberto, setMenuAberto] = useState(false)

  const links = [
    { path: '/', label: 'Dashboard' },
    { path: '/transacoes', label: 'Transações' },
    { path: '/metas', label: 'Metas' },
    { path: '/acoes', label: 'Carteira' },
    { path: '/renda-fixa', label: 'Renda Fixa' },
    { path: '/ir', label: 'IR' },
    { path: '/simulador', label: 'Simulador' },
  ]

  const sair = () => {
    logout()
    navigate('/login')
    setMenuAberto(false)
  }

  return (
    <>
      <nav style={{
        background: '#13131A', borderBottom: '1px solid #1E1E2E',
        padding: '0 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: '64px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <span style={{
          background: 'linear-gradient(135deg, #A78BFA, #7C3AED)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          fontWeight: '800', fontSize: '22px', letterSpacing: '-0.5px'
        }}>
          Razão
        </span>

        {!isMobile && (
          <div style={{ display: 'flex', gap: '4px' }}>
            {links.map(link => {
              const active = location.pathname === link.path
              return (
                <Link key={link.path} to={link.path} style={{
                  color: active ? '#A78BFA' : '#6B6B8A',
                  textDecoration: 'none', fontWeight: active ? '600' : '400',
                  fontSize: '13px', padding: '7px 12px', borderRadius: '8px',
                  background: active ? 'rgba(167,139,250,0.1)' : 'transparent',
                }}>
                  {link.label}
                </Link>
              )
            })}
          </div>
        )}

        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {usuario && (
              <div style={{ fontSize: '13px', color: '#A0A0C0' }}>
                Olá, <span style={{ color: '#E8E8F0', fontWeight: '600' }}>{usuario.nome.split(' ')[0]}</span>
              </div>
            )}
            <button onClick={sair} style={{
              background: 'none', border: '1px solid #2D2D42', color: '#6B6B8A',
              cursor: 'pointer', fontSize: '13px', padding: '7px 14px', borderRadius: '8px',
            }}
              onMouseEnter={e => { e.target.style.borderColor = '#F87171'; e.target.style.color = '#F87171' }}
              onMouseLeave={e => { e.target.style.borderColor = '#2D2D42'; e.target.style.color = '#6B6B8A' }}>
              Sair
            </button>
          </div>
        )}

        {isMobile && (
          <button onClick={() => setMenuAberto(!menuAberto)} style={{
            background: 'none', border: 'none', color: '#A78BFA',
            cursor: 'pointer', fontSize: '24px', padding: '4px',
          }}>
            {menuAberto ? '✕' : '☰'}
          </button>
        )}
      </nav>

      {isMobile && menuAberto && (
        <div style={{
          position: 'fixed', top: '64px', left: 0, right: 0, bottom: 0,
          background: '#13131A', zIndex: 99, padding: '24px',
          borderTop: '1px solid #1E1E2E', display: 'flex', flexDirection: 'column',
          gap: '8px', overflowY: 'auto'
        }}>
          {usuario && (
            <div style={{ fontSize: '14px', color: '#A0A0C0', padding: '12px 0', borderBottom: '1px solid #1E1E2E', marginBottom: '8px' }}>
              Olá, <span style={{ color: '#E8E8F0', fontWeight: '600' }}>{usuario.nome.split(' ')[0]}</span>
            </div>
          )}
          {links.map(link => {
            const active = location.pathname === link.path
            return (
              <Link key={link.path} to={link.path} onClick={() => setMenuAberto(false)} style={{
                color: active ? '#A78BFA' : '#E8E8F0',
                textDecoration: 'none', fontWeight: active ? '700' : '400',
                fontSize: '18px', padding: '14px 16px', borderRadius: '12px',
                background: active ? 'rgba(167,139,250,0.1)' : 'transparent',
                display: 'block',
              }}>
                {link.label}
              </Link>
            )
          })}
          <button onClick={sair} style={{
            marginTop: 'auto', background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.3)', color: '#F87171',
            cursor: 'pointer', fontSize: '15px', padding: '14px',
            borderRadius: '12px', fontWeight: '600',
          }}>
            Sair da conta
          </button>
        </div>
      )}
    </>
  )
}

export default Navbar