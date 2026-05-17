import { getAvatarColor, getInitials } from '../../utils/colors'

interface AvatarProps {
  username: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { sm: 'w-6 h-6 text-[9px]', md: 'w-8 h-8 text-[11px]', lg: 'w-10 h-10 text-sm' }

export default function Avatar({ username, size = 'md', className = '' }: AvatarProps) {
  const { bg, text } = getAvatarColor(username)
  return (
    <div
      className={`rounded flex items-center justify-center font-mono font-medium flex-shrink-0 ${sizes[size]} ${className}`}
      style={{ background: bg, color: text }}
    >
      {getInitials(username)}
    </div>
  )
}
