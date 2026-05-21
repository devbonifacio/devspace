// Conta-bot oficial do DevSpace — usada para mensagens automáticas de boas-vindas.
import User from '../models/User.js'

export const BOT_EMAIL = 'bot@devspace.system'
export const BOT_USERNAME = 'DevSpaceBot'

// Cache do _id do bot — usado pra marcá-lo sempre online sem bater no banco.
let cachedBotId = null
export const getBotId = () => cachedBotId

// Garante que a conta-bot existe no banco. Idempotente — pode chamar à vontade.
export const getBotUser = async () => {
  let bot = await User.findOne({ email: BOT_EMAIL })
  if (!bot) {
    bot = await User.create({
      username: BOT_USERNAME,
      email: BOT_EMAIL,
      // Senha aleatória — ninguém faz login com a conta-bot.
      password: 'bot_' + Math.random().toString(36).slice(2) + Date.now(),
      role: 'bot',
      status: 'online',
      bio: 'Bot oficial do DevSpace. Tô aqui pra dar as boas-vindas! 🤖',
    })
  }
  cachedBotId = bot._id.toString()
  return bot
}

// Texto da DM de boas-vindas (enviada quando o usuário se registra).
export const welcomeDM = (username) =>
  `Salve, @${username}! 👋\n\n` +
  `Seja muito bem-vindo(a) ao **DevSpace** — teu workspace de developer. 🚀\n\n` +
  `Algumas dicas pra começar:\n` +
  `- Cria ou entra num grupo na barra de cima\n` +
  `- Manda mensagens, \`código\`, imagens e até chamadas de voz\n` +
  `- Aperta \`Ctrl+K\` pra abrir a paleta de comandos\n\n` +
  `Bom código! 💻`

// Texto da mensagem postada no grupo quando alguém entra.
export const welcomeGroup = (username) =>
  `Seja bem-vindo(a) ao grupo, @${username}! 🎉 ` +
  `Capricha nas mensagens e bom trabalho com a equipa. 💪`
