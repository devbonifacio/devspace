import { useAppStore } from '../../store/useAppStore'

export default function TitleBar() {
  const { activeGroup, activeChannel } = useAppStore()

  const title = activeChannel
    ? `DevSpace — ${activeGroup?.name} › #${activeChannel.name}`
    : activeGroup
    ? `DevSpace — ${activeGroup.name}`
    : 'DevSpace'

  return (
    <div
      className="h-8 flex items-center px-3 gap-2 flex-shrink-0 select-none"
      style={{ background: 'var(--titlebar)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
        <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
      </div>
      <span className="flex-1 text-center text-[11px] text-[var(--text-secondary)] tracking-wide">
        {title}
      </span>
      <span className="text-[10px] text-[var(--text-secondary)]">v1.0.0</span>
    </div>
  )
}
