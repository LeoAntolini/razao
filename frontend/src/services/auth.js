const TOKEN_KEY = 'razao_token'
const USUARIO_KEY = 'razao_usuario'

export const salvarSessao = (token, usuario) => {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario))
}

export const getToken = () => localStorage.getItem(TOKEN_KEY)

export const getUsuario = () => {
  const u = localStorage.getItem(USUARIO_KEY)
  return u ? JSON.parse(u) : null
}

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USUARIO_KEY)
}

export const estaLogado = () => !!getToken()