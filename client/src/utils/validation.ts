// Espelha server/utils/validation.js — front valida pra dar feedback rápido,
// mas o back é quem decide.
export const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
}

export interface PasswordCheck {
  ok: boolean
  hasLength: boolean
  hasUpper: boolean
  hasLower: boolean
  hasNumber: boolean
}

export function checkPassword(pwd: string): PasswordCheck {
  return {
    hasLength: pwd.length >= PASSWORD_RULES.minLength,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /\d/.test(pwd),
    get ok() {
      return this.hasLength && this.hasUpper && this.hasLower && this.hasNumber
    }
  } as PasswordCheck
}

export function validateUsername(name: string): string | null {
  const t = name.trim()
  if (t.length < 3 || t.length > 20) return 'Username deve ter entre 3 e 20 caracteres'
  if (!/^[a-zA-Z0-9_]+$/.test(t)) return 'Username só pode ter letras, números e _'
  return null
}

export function validateEmail(email: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email inválido'
  return null
}
