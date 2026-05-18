import { getAvatarColor, getInitials } from '../../utils/colors'

interface AvatarProps {
  username: string
  avatar?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  sm: 'w-6 h-6 text-[9px]',
  md: 'w-8 h-8 text-[11px]',
  lg: 'w-10 h-10 text-sm',
  xl: 'w-20 h-20 text-xl',
}

export default function Avatar({ username, avatar, size = 'md', className = '' }: AvatarProps) {
  const { bg, text } = getAvatarColor(username)

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={username}
        className={`rounded object-cover flex-shrink-0 ${sizes[size]} ${className}`}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
      />
    )
  }

  return (
    <div
      className={`rounded flex items-center justify-center font-mono font-medium flex-shrink-0 ${sizes[size]} ${className}`}
      style={{ background: bg, color: text }}
    >
      {getInitials(username)}
    </div>
  )
}
