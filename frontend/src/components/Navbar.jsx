import { Link, useLocation } from 'react-router-dom'

function Navbar() {
  const location = useLocation()

  const links = [
    { path: '/', label: 'Dashboard' },
    { path: '/transacoes', label: 'Transações' },
    { path: '/metas', label: 'Metas' },
  ]

  return (
    <nav style={{
      background: '#13131A',
      borderBottom: '1px solid #1E1E2E',
      padding: '0 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '64px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(10px)',
    }}>
      <span style={{
        background: 'linear-gradient(135deg, #A78BFA, #7C3AED)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        fontWeight: '800',
        fontSize: '22px',
        letterSpacing: '-0.5px'
      }}>
        Razão
      </span>

      <div style={{ display: 'flex', gap: '8px' }}>
        {links.map(link => {
          const active = location.pathname === link.path
          return (
            <Link key={link.path} to={link.path} style={{
              color: active ? '#A78BFA' : '#6B6B8A',
              textDecoration: 'none',
              fontWeight: active ? '600' : '400',
              fontSize: '14px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: active ? 'rgba(167,139,250,0.1)' : 'transparent',
              transition: 'all 0.2s',
            }}>
              {link.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default Navbar