import { useAppStore } from '../../store/useAppStore'

export default function TitleBar() {
  const { activeGroup, activeChannel } = useAppStore()

  const title = activeChannel
    ? `${activeGroup?.name} › #${activeChannel.name}`
    : activeGroup
    ? activeGroup.name
    : null

  return (
    <div
      className="h-8 flex items-center px-3 gap-3 flex-shrink-0 select-none"
      style={{ background: 'var(--titlebar)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2 font-mono text-[13px] font-bold tracking-tight">
        <span style={{ color: 'var(--green)' }}>&gt;</span>
        <span style={{ color: 'var(--text-primary)' }}>Dev</span>
        <span style={{ color: 'var(--accent)' }}>Space</span>
        <span className="ds-cursor" style={{ color: 'var(--green)', marginLeft: -6 }}>_</span>
      </div>

      <span className="flex-1 text-center text-[11px]" style={{ color: 'var(--text-secondary)' }}>
        {title}
      </span>

      <div className="flex items-center gap-2">
        <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>v1.0.0</span>
        <div className="flex gap-1.5 ml-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
        </div>
      </div>
    </div>
  )
}
