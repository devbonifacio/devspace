import type { ParsedContent } from '../types'

export function parseMessage(content: string): ParsedContent {
  const codeRegex = /^```(\w+)?\n([\s\S]+?)```$/
  const match = content.match(codeRegex)
  if (match) {
    return { type: 'code', lang: match[1] || 'javascript', code: match[2].trim() }
  }
  return { type: 'text', text: content }
}
