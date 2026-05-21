// Envio de emails via Resend (https://resend.com) — usa fetch nativo, sem SDK.

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

// Envia um email. Lança erro se a API falhar; avisa (sem lançar) se não configurado.
export const sendEmail = async ({ to, subject, html, text }) => {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('⚠️  RESEND_API_KEY ausente — email não enviado para', to)
    return false
  }
  const from = process.env.EMAIL_FROM || 'DevSpace <onboarding@resend.dev>'

  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Resend ${res.status}: ${detail}`)
  }
  return true
}

// Email de redefinição de senha — tema dark/terminal pra combinar com o DevSpace.
export const sendResetEmail = (to, username, link) => {
  const html = `
<div style="background:#1e1e1e;padding:40px 16px;font-family:'Courier New',Consolas,monospace;">
  <div style="max-width:480px;margin:0 auto;background:#252526;border:1px solid #3c3c3c;border-radius:10px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#0e639c,#1177bb);padding:26px;text-align:center;">
      <div style="font-size:24px;font-weight:bold;color:#ffffff;letter-spacing:0.5px;">
        <span style="color:#9affc4;">&gt;</span> Dev<span style="color:#cce8ff;">Space</span><span style="color:#9affc4;">_</span>
      </div>
    </div>
    <div style="padding:30px 30px 34px;">
      <p style="color:#9cdcfe;font-size:13px;margin:0 0 6px;">// e aí, ${username} 👋</p>
      <h1 style="color:#e4e4e4;font-size:19px;margin:0 0 14px;font-weight:bold;">Redefinição de senha</h1>
      <p style="color:#a8a8a8;font-size:13px;line-height:1.7;margin:0 0 26px;">
        Alguém (esperamos que tu) pediu pra redefinir a senha desta conta.
        Clica no botão abaixo pra criar uma nova. O link <strong style="color:#dcdcaa;">expira em 1 hora</strong>.
      </p>
      <a href="${link}" style="display:block;background:#0e639c;color:#ffffff;text-decoration:none;text-align:center;padding:13px;border-radius:7px;font-size:14px;font-weight:bold;">
        redefinir minha senha &rarr;
      </a>
      <p style="color:#6a9955;font-size:12px;line-height:1.7;margin:26px 0 0;">
        // não foste tu? ignora este email — tua senha continua a mesma e segura.
      </p>
    </div>
    <div style="background:#1e1e1e;border-top:1px solid #3c3c3c;padding:16px;text-align:center;">
      <p style="color:#5a5a5a;font-size:11px;margin:0;">DevSpace · workspace para developers</p>
    </div>
  </div>
</div>`.trim()

  const text =
    `DevSpace — Redefinição de senha\n\n` +
    `E aí, ${username}.\n` +
    `Pediram pra redefinir a senha desta conta. Abre este link pra criar uma nova (expira em 1 hora):\n\n` +
    `${link}\n\n` +
    `Se não foste tu, ignora este email.`

  return sendEmail({ to, subject: '🔑 Redefinir tua senha — DevSpace', html, text })
}
