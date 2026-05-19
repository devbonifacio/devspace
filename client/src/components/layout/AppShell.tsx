import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TitleBar from './TitleBar'
import StatusBar from './StatusBar'
import ActivityBar, { type View } from './ActivityBar'
import Sidebar from './Sidebar'
import ChatArea from '../chat/ChatArea'
import SearchView from '../views/SearchView'
import ReposView from '../views/ReposView'
import NotificationsView from '../views/NotificationsView'
import BookmarksView from '../views/BookmarksView'
import { useAppStore } from '../../store/useAppStore'
import { useSettingsStore, playNotificationSound } from '../../store/useSettingsStore'
import { authService } from '../../services/auth.service'
import { groupService } from '../../services/group.service'
import { userService } from '../../services/user.service'
import CreateGroupModal from '../modals/CreateGroupModal'
import JoinGroupModal from '../modals/JoinGroupModal'
import CommandPalette from '../modals/CommandPalette'
import IncomingCallToast from '../call/IncomingCallToast'
import CallWindow from '../call/CallWindow'
import { Hash, Plus, LogIn, Loader2 } from 'lucide-react'

export default function AppShell() {
  const [activeView, setActiveView] = useState<View>('groups')
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showJoinGroup, setShowJoinGroup] = useState(false)
  const [showPalette, setShowPalette] = useState(false)
  const [bootLoading, setBootLoading] = useState(false)
  const navigate = useNavigate()

  const {
    user, token, groups, activeGroup, notifications,
    threadParentId, openThread, replyingTo, setReplyingTo,
    setAuth, setGroups, setActiveGroup, initSocket, updateUser
  } = useAppStore()
  const settings = useSettingsStore()

  // Atalhos globais
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+K / Cmd+K abre command palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowPalette(true)
        return
      }
      // Esc fecha o que estiver aberto (ordem de prioridade)
      if (e.key === 'Escape') {
        if (showPalette) { setShowPalette(false); return }
        if (showCreateGroup) { setShowCreateGroup(false); return }
        if (showJoinGroup) { setShowJoinGroup(false); return }
        if (replyingTo) { setReplyingTo(null); return }
        if (threadParentId) { openThread(null); return }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showPalette, showCreateGroup, showJoinGroup, replyingTo, threadParentId, setReplyingTo, openThread])

  // Boot: se tem token mas não tem user (ex.: F5), reidrata via /api/auth/me
  useEffect(() => {
    if (user || !token) return
    setBootLoading(true)
    authService.me()
      .then(({ user: u }) => setAuth(u, token))
      .catch(() => {
        // Token inválido/expirado → logout
        localStorage.removeItem('ds_token')
        navigate('/auth', { replace: true })
      })
      .finally(() => setBootLoading(false))
  }, [user, token, setAuth, navigate])

  // Quando temos user, conecta socket e carrega grupos
  useEffect(() => {
    if (!user) return
    initSocket()
    loadGroups()
    syncStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id])

  // Som + notificação de desktop ao receber notif nova
  const [lastNotifId, setLastNotifId] = useState<string | null>(null)
  useEffect(() => {
    if (notifications.length === 0) return
    const latest = notifications[0]
    if (latest.id === lastNotifId || latest.read) return
    setLastNotifId(latest.id)

    if (settings.notifSound) playNotificationSound()

    if (settings.notifDesktop && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
      try {
        new Notification(latest.title, { body: latest.body, silent: settings.notifSound })
      } catch {}
    }
  }, [notifications, settings.notifSound, settings.notifDesktop, lastNotifId])

  const loadGroups = async () => {
    try {
      const data = await groupService.getMyGroups()
      setGroups(data)
    } catch (err) { console.error(err) }
  }

  const syncStatus = async () => {
    try {
      if (settings.statusPref !== 'online') {
        const updated = await userService.setStatus(settings.statusPref)
        if (user) updateUser({ ...user, status: updated.status })
      }
    } catch (err) { console.error(err) }
  }

  const renderSecondaryView = () => {
    if (activeView === 'search') return <SearchView />
    if (activeView === 'repos') return <ReposView />
    if (activeView === 'notifications') return <NotificationsView />
    if (activeView === 'bookmarks') return <BookmarksView />
    return <Sidebar />
  }

  // Tela de boot enquanto reidrata sessão
  if (bootLoading || (token && !user)) {
    return (
      <div className="h-screen flex items-center justify-center font-mono"
        style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
        <Loader2 size={18} className="animate-spin mr-2" />
        <span className="text-sm">carregando sessão...</span>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <TitleBar />

      <div className="flex items-center flex-shrink-0 overflow-x-auto" style={{ background: '#252526', borderBottom: '1px solid var(--border)' }}>
        {groups.map(group => (
          <button
            key={group._id}
            onClick={() => { setActiveGroup(group); setActiveView('groups') }}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-mono whitespace-nowrap transition-colors ${
              activeGroup?._id === group._id
                ? 'text-[var(--text-primary)] bg-[var(--bg-primary)]'
                : 'text-[var(--text-secondary)] bg-[#2d2d2d] hover:text-[var(--text-primary)]'
            }`}
            style={activeGroup?._id === group._id
              ? { borderRight: '1px solid var(--border)', borderTop: '1px solid var(--accent)' }
              : { borderRight: '1px solid var(--border)', borderTop: '1px solid transparent' }}
          >
            <Hash size={11} />
            {group.name}
          </button>
        ))}
        <button
          onClick={() => setShowCreateGroup(true)}
          title="Criar grupo"
          className="px-3 py-1.5 text-xs font-mono flex items-center gap-1 transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <Plus size={12} />
        </button>
        <button
          onClick={() => setShowJoinGroup(true)}
          title="Entrar em grupo com código"
          className="px-3 py-1.5 text-xs font-mono flex items-center gap-1 transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <LogIn size={12} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <ActivityBar activeView={activeView} onViewChange={setActiveView} />

        {!activeGroup && activeView === 'groups' ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 font-mono" style={{ color: 'var(--text-secondary)' }}>
            <div className="text-5xl" style={{ color: 'var(--accent)' }}>{'<'}/{'>'}</div>
            <p className="text-sm">bem-vindo ao DevSpace, {user?.username}</p>
            <p className="text-xs" style={{ color: 'var(--comment)' }}>// selecione um grupo acima ou crie um novo</p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowCreateGroup(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded font-mono"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                <Plus size={14} /> criar grupo
              </button>
              <button
                onClick={() => setShowJoinGroup(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded font-mono"
                style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                <LogIn size={14} /> entrar com código
              </button>
            </div>
          </div>
        ) : (
          <>
            {renderSecondaryView()}
            <div className="flex-1 flex overflow-hidden relative">
              <ChatArea />
            </div>
          </>
        )}
      </div>

      <StatusBar />

      {showCreateGroup && <CreateGroupModal onClose={() => { setShowCreateGroup(false); loadGroups() }} />}
      {showJoinGroup && <JoinGroupModal onClose={() => { setShowJoinGroup(false); loadGroups() }} />}
      {showPalette && <CommandPalette onClose={() => setShowPalette(false)} />}

      {/* Voice call UI — sempre montado, eles se auto-renderizam só quando ativos */}
      <IncomingCallToast />
      <CallWindow />
    </div>
  )
}
