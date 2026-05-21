// Utilitários de banimento — usados pelo middleware de auth, rotas e socket.

// Data-sentinela: qualquer ban com `until` >= ano 9999 é considerado permanente.
export const PERMANENT_DATE = new Date('9999-12-31T23:59:59.999Z')

// Um usuário está banido se tem `ban.until` no futuro.
export const isBanned = (user) =>
  !!(user?.ban?.until && new Date(user.ban.until).getTime() > Date.now())

export const isPermanent = (until) =>
  !!until && new Date(until).getUTCFullYear() >= 9999

// Mensagem legível pro client exibir ao usuário banido.
export const banMessage = (ban) => {
  if (!ban) return 'Sua conta está bloqueada.'
  const reason = ban.reason ? ` Motivo: ${ban.reason}` : ''
  if (isPermanent(ban.until)) {
    return `Sua conta foi banida permanentemente.${reason}`
  }
  const until = new Date(ban.until).toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
  return `Sua conta foi suspensa até ${until}.${reason}`
}
