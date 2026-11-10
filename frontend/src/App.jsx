import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { estaLogado } from './services/auth'
import Dashboard from './pages/Dashboard'
import Transacoes from './pages/Transacoes'
import Metas from './pages/Metas'
import Acoes from './pages/Acoes'
import RendaFixa from './pages/RendaFixa'
import ImpostoRenda from './pages/ImpostoRenda'
import Simulador from './pages/Simulador'
import Login from './pages/Login'
import Cadastro from './pages/Cadastro'
import EsqueciSenha from './pages/EsqueciSenha'
import RedefinirSenha from './pages/RedefinirSenha'
import Navbar from './components/Navbar'

function RotaProtegida({ children }) {
  return estaLogado() ? children : <Navigate to="/login" replace />
}

function RotaPublica({ children }) {
  return !estaLogado() ? children : <Navigate to="/" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<RotaPublica><Login /></RotaPublica>} />
        <Route path="/cadastro" element={<RotaPublica><Cadastro /></RotaPublica>} />
        <Route path="/esqueci-senha" element={<RotaPublica><EsqueciSenha /></RotaPublica>} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
        <Route path="/*" element={
          <RotaProtegida>
            <Navbar />
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/transacoes" element={<Transacoes />} />
              <Route path="/metas" element={<Metas />} />
              <Route path="/simulador" element={<Simulador />} />
              <Route path="/acoes" element={<Acoes />} />
              <Route path="/renda-fixa" element={<RendaFixa />} />
              <Route path="/ir" element={<ImpostoRenda />} />
            </Routes>
          </RotaProtegida>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App