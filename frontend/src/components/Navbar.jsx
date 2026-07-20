import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getUsuario, logout } from '../services/auth'

function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const usuario = getUsuario()

  const links = [
    { path: '/', label: 'Dashboard' },
    { path: '/transacoes', label: 'Transações' },
    { path: '/metas', label: 'Metas' },
  ]

  const sair = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav style={{
      background: '#13131A', borderBottom: '1px solid #1E1E2E',
      padding: '0 32px', display: 'flex', alignItems: 'center',
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

      <div style={{ display: 'flex', gap: '8px' }}>
        {links.map(link => {
          const active = location.pathname === link.path
          return (
            <Link key={link.path} to={link.path} style={{
              color: active ? '#A78BFA' : '#6B6B8A',
              textDecoration: 'none', fontWeight: active ? '600' : '400',
              fontSize: '14px', padding: '8px 16px', borderRadius: '8px',
              background: active ? 'rgba(167,139,250,0.1)' : 'transparent',
              transition: 'all 0.2s',
            }}>
              {link.label}
            </Link>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {usuario && (
          <div style={{ fontSize: '14px', color: '#A0A0C0' }}>
            Olá, <span style={{ color: '#E8E8F0', fontWeight: '600' }}>{usuario.nome.split(' ')[0]}</span>
          </div>
        )}
        <button onClick={sair} style={{
          background: 'none', border: '1px solid #2D2D42', color: '#6B6B8A',
          cursor: 'pointer', fontSize: '13px', padding: '7px 14px', borderRadius: '8px',
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.target.style.borderColor = '#F87171'; e.target.style.color = '#F87171' }}
          onMouseLeave={e => { e.target.style.borderColor = '#2D2D42'; e.target.style.color = '#6B6B8A' }}
        >
          Sair
        </button>
      </div>
    </nav>
  )
}

export default Navbar