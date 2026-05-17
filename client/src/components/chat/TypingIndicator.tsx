import { useAppStore } from '../../store/useAppStore'

export default function TypingIndicator() {
  const { activeChannel, typingUsers } = useAppStore()
  if (!activeChannel) return null

  const typing = typingUsers.get(activeChannel._id) || []
  if (typing.length === 0) return null

  const text = typing.length === 1
    ? `${typing[0]} está digitando...`
    : `${typing.slice(0, -1).join(', ')} e ${typing.at(-1)} estão digitando...`

  return (
    <div className="px-4 py-1 flex items-center gap-2">
      <div className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1 h-1 rounded-full animate-bounce"
            style={{ background: 'var(--text-secondary)', animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="text-[11px] font-mono" style={{ color: 'var(--text-secondary)' }}>{text}</span>
    </div>
  )
}
