import { type ReactNode } from 'react'

// Markdown leve mas completo o suficiente pra chat:
// inline: **bold**, *italic*, `code`, ~~strike~~, [link](url), https://urls, @mention
// block:  # H1 / ## H2 / ### H3, - lista, 1. lista numerada, > quote, --- hr

interface InlineToken {
  type: 'text' | 'bold' | 'italic' | 'strike' | 'code' | 'link' | 'mention' | 'url'
  value: string
  href?: string
}

const INLINE_RULES: Array<{ re: RegExp; type: InlineToken['type']; build?: (m: RegExpExecArray) => Partial<InlineToken> }> = [
  { re: /`([^`\n]+?)`/, type: 'code' },
  { re: /\*\*([^*\n]+?)\*\*/, type: 'bold' },
  { re: /~~([^~\n]+?)~~/, type: 'strike' },
  { re: /\*([^*\n]+?)\*/, type: 'italic' },
  { re: /\[([^\]]+?)\]\((https?:\/\/[^\s)]+)\)/, type: 'link', build: m => ({ value: m[1], href: m[2] }) },
  { re: /(https?:\/\/[^\s<]+[^\s.,;:!?)\]<])/, type: 'url', build: m => ({ value: m[1], href: m[1] }) },
  { re: /@(\w+)/, type: 'mention' },
]

function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = []
  let remaining = text

  while (remaining.length > 0) {
    let earliest: { idx: number; len: number; token: InlineToken } | null = null

    for (const rule of INLINE_RULES) {
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

function renderInline(text: string, myUsername: string | undefined, keyPrefix: string): ReactNode[] {
  return tokenizeInline(text).map((t, i) => {
    const key = `${keyPrefix}-${i}`
    switch (t.type) {
      case 'bold':
        return <strong key={key} style={{ color: 'var(--text-bright)' }}>{t.value}</strong>
      case 'italic':
        return <em key={key} style={{ color: 'var(--text-primary)' }}>{t.value}</em>
      case 'strike':
        return <s key={key} style={{ color: 'var(--text-secondary)' }}>{t.value}</s>
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
  })
}

// Detecta block-level e renderiza em elementos apropriados
type Block =
  | { type: 'p'; text: string }
  | { type: 'h'; level: 1 | 2 | 3; text: string }
  | { type: 'quote'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'hr' }

function parseBlocks(content: string): Block[] {
  const lines = content.split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // hr
    if (/^---+\s*$/.test(line)) {
      blocks.push({ type: 'hr' })
      i++
      continue
    }

    // headings
    const h = /^(#{1,3})\s+(.+)$/.exec(line)
    if (h) {
      blocks.push({ type: 'h', level: h[1].length as 1 | 2 | 3, text: h[2] })
      i++
      continue
    }

    // blockquote (uma ou várias linhas consecutivas)
    if (/^>\s?/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        items.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      blocks.push({ type: 'quote', text: items.join('\n') })
      continue
    }

    // unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''))
        i++
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    // ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''))
        i++
      }
      blocks.push({ type: 'ol', items })
      continue
    }

    // parágrafo: junta linhas até achar uma vazia ou um bloco especial
    const paragraph: string[] = [line]
    i++
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,3}\s|>|[-*]\s+|\d+\.\s+|---+\s*$)/.test(lines[i])
    ) {
      paragraph.push(lines[i])
      i++
    }
    blocks.push({ type: 'p', text: paragraph.join('\n') })

    // Pula linhas vazias entre blocos
    while (i < lines.length && lines[i].trim() === '') i++
  }

  return blocks
}

export function renderMarkdown(content: string, myUsername?: string): ReactNode {
  const blocks = parseBlocks(content)

  return blocks.map((b, idx) => {
    const k = `b-${idx}`
    switch (b.type) {
      case 'hr':
        return <hr key={k} className="my-2" style={{ border: 0, borderTop: '1px solid var(--border)' }} />

      case 'h': {
        const sizes = { 1: 'text-lg', 2: 'text-base', 3: 'text-sm' }[b.level]
        const Tag = `h${b.level}` as 'h1' | 'h2' | 'h3'
        return (
          <Tag key={k} className={`font-bold mt-1 mb-1 ${sizes}`} style={{ color: 'var(--text-bright)' }}>
            {renderInline(b.text, myUsername, k)}
          </Tag>
        )
      }

      case 'quote':
        return (
          <blockquote
            key={k}
            className="my-1 pl-3 py-0.5 whitespace-pre-wrap"
            style={{ borderLeft: '3px solid var(--accent)', color: 'var(--text-secondary)', fontStyle: 'italic' }}
          >
            {b.text.split('\n').map((ln, li) => (
              <span key={li}>
                {renderInline(ln, myUsername, `${k}-${li}`)}
                {li < b.text.split('\n').length - 1 && <br />}
              </span>
            ))}
          </blockquote>
        )

      case 'ul':
        return (
          <ul key={k} className="list-disc list-inside my-1 space-y-0.5">
            {b.items.map((it, ii) => (
              <li key={ii}>{renderInline(it, myUsername, `${k}-${ii}`)}</li>
            ))}
          </ul>
        )

      case 'ol':
        return (
          <ol key={k} className="list-decimal list-inside my-1 space-y-0.5">
            {b.items.map((it, ii) => (
              <li key={ii}>{renderInline(it, myUsername, `${k}-${ii}`)}</li>
            ))}
          </ol>
        )

      case 'p':
      default: {
        const lines = b.text.split('\n')
        return (
          <p key={k} className="leading-relaxed whitespace-pre-wrap break-words">
            {lines.map((ln, li) => (
              <span key={li}>
                {renderInline(ln, myUsername, `${k}-${li}`)}
                {li < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        )
      }
    }
  })
}

export function hasMention(content: string, username: string): boolean {
  const re = new RegExp(`@${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
  return re.test(content)
}

export function extractMentions(content: string): string[] {
  const matches = content.match(/@(\w+)/g) || []
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))]
}

export const escapeHtml = (s: string) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
