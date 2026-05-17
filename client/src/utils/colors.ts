const COLORS = [
  { bg: '#1b3a5c', text: '#9cdcfe' },
  { bg: '#1b4721', text: '#4ec994' },
  { bg: '#3b1f6b', text: '#c586c0' },
  { bg: '#0e3d2e', text: '#4ec994' },
  { bg: '#5c1b1b', text: '#f48771' },
  { bg: '#3d3b0e', text: '#dcdcaa' },
  { bg: '#1b2e5c', text: '#569cd6' },
]

export function getAvatarColor(username: string) {
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}

export function getInitials(username: string) {
  return username.slice(0, 2).toUpperCase()
}
