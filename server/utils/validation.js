// Regra única — front (UX) e back (segurança) usam a mesma
export const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
}

export function validatePassword(pwd) {
  if (typeof pwd !== 'string') return 'Senha inválida'
  if (pwd.length < PASSWORD_RULES.minLength) {
    return `Senha precisa ter pelo menos ${PASSWORD_RULES.minLength} caracteres`
  }
  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(pwd)) {
    return 'Senha precisa ter pelo menos 1 letra maiúscula'
  }
  if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(pwd)) {
    return 'Senha precisa ter pelo menos 1 letra minúscula'
  }
  if (PASSWORD_RULES.requireNumber && !/\d/.test(pwd)) {
    return 'Senha precisa ter pelo menos 1 número'
  }
  return null
}

export function validateUsername(name) {
  if (typeof name !== 'string') return 'Username inválido'
  const trimmed = name.trim()
  if (trimmed.length < 3 || trimmed.length > 20) {
    return 'Username deve ter entre 3 e 20 caracteres'
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return 'Username só pode ter letras, números e _'
  }
  return null
}

export function validateEmail(email) {
  if (typeof email !== 'string') return 'Email inválido'
  // Regex simples — não tenta validar tudo, só formato geral
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email inválido'
  if (email.length > 254) return 'Email muito longo'
  return null
}
