import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Transacoes from './pages/Transacoes'
import Metas from './pages/Metas'
import Navbar from './components/Navbar'

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transacoes" element={<Transacoes />} />
          <Route path="/metas" element={<Metas />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App