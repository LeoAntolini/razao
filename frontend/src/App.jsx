import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Transacoes from './pages/Transacoes'
import Metas from './pages/Metas'
import GastosFixos from './pages/GastosFixos'
import Navbar from './components/Navbar'

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div style={{ padding: '0' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transacoes" element={<Transacoes />} />
          <Route path="/metas" element={<Metas />} />
          <Route path="/gastos-fixos" element={<GastosFixos />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App