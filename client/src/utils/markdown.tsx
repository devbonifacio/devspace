import { type ReactNode } from 'react'

// Parser leve: **bold**, *italic*, `inline`, [text](url), https://urls, @mention
// Não suporta nested complexo — propósito é chat, não documentos.

interface Token {
  type: 'text' | 'bold' | 'italic' | 'code' | 'link' | 'mention' | 'url'
  value: string
  href?: string
}

const escapeHtml = (s: string) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

// Ordem importa: code antes de bold (pra não destruir backticks dentro)
const RULES: Array<{ re: RegExp; type: Token['type']; build?: (m: RegExpExecArray) => Partial<Token> }> = [
  { re: /`([^`\n]+?)`/, type: 'code' },
  { re: /\*\*([^*\n]+?)\*\*/, type: 'bold' },
  { re: /\*([^*\n]+?)\*/, type: 'italic' },
  { re: /\[([^\]]+?)\]\((https?:\/\/[^\s)]+)\)/, type: 'link', build: m => ({ value: m[1], href: m[2] }) },
  { re: /(https?:\/\/[^\s<]+[^\s.,;:!?)\]<])/, type: 'url', build: m => ({ value: m[1], href: m[1] }) },
  { re: /@(\w+)/, type: 'mention' },
]

function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  let remaining = text

  while (remaining.length > 0) {
    let earliest: { idx: number; len: number; token: Token } | null = null

    for (const rule of RULES) {
      const m = rule.re.exec(remaining)
      if (m && (earliest === null || m.index < earliest.idx)) {
        const partial = rule.build ? rule.build(m) : { value: m[1] }
        earliest = {
          idx: m.index,
          len: m[0].length,
          token: { type: rule.type, value: partial.value || '', href: partial.href }
        }
      }
    }

    if (!earliest) {
      tokens.push({ type: 'text', value: remaining })
      break
    }

    if (earliest.idx > 0) tokens.push({ type: 'text', value: remaining.slice(0, earliest.idx) })
    tokens.push(earliest.token)
    remaining = remaining.slice(earliest.idx + earliest.len)
  }

  return tokens
}

export function renderMarkdown(content: string, myUsername?: string): ReactNode {
  const lines = content.split('\n')

  return lines.map((line, lineIdx) => {
    const tokens = tokenize(line)
    return (
      <span key={lineIdx}>
        {tokens.map((t, i) => {
          const key = `${lineIdx}-${i}`
          switch (t.type) {
            case 'bold':
              return <strong key={key} style={{ color: 'var(--text-bright)' }}>{t.value}</strong>
            case 'italic':
              return <em key={key} style={{ color: 'var(--text-primary)' }}>{t.value}</em>
            case 'code':
              return (
                <code key={key} className="px-1 py-px rounded text-[12px]"
                  style={{ background: 'var(--bg-input)', color: 'var(--blue)', border: '1px solid var(--border)' }}>
                  {t.value}
                </code>
              )
            case 'link':
            case 'url':
              return (
                <a key={key} href={t.href} target="_blank" rel="noreferrer"
                  style={{ color: 'var(--blue)', textDecoration: 'underline' }}>
                  {t.value}
                </a>
              )
            case 'mention': {
              const isMe = myUsername?.toLowerCase() === t.value.toLowerCase()
              return (
                <span key={key} className="px-1 rounded font-medium"
                  style={{
                    background: isMe ? 'var(--accent)' : 'var(--accent-bg)',
                    color: isMe ? '#fff' : 'var(--blue)'
                  }}>
                  @{t.value}
                </span>
              )
            }
            default:
              return <span key={key}>{t.value}</span>
          }
        })}
        {lineIdx < lines.length - 1 && <br />}
      </span>
    )
  })
}

export function hasMention(content: string, username: string): boolean {
  const re = new RegExp(`@${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
  return re.test(content)
}

// Mantido para evitar quebrar import existente
export { escapeHtml }
