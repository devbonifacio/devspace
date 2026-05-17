import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'
import type { User, Group, Channel, Message, Notification } from '../types'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001'
const NOTIF_LIMIT = 50

interface AppStore {
  user: User | null
  token: string | null

  groups: Group[]
  activeGroup: Group | null
  activeChannel: Channel | null
  activeDmUser: User | null

  messages: Message[]
  hasMoreMessages: boolean

  onlineUsers: Set<string>
  typingUsers: Map<string, string[]>

  notifications: Notification[]

  socket: Socket | null
  socketConnected: boolean

  setAuth: (user: User, token: string) => void
  updateUser: (user: User) => void
  logout: () => void

  setGroups: (groups: Group[]) => void
  addGroup: (group: Group) => void
  updateGroup: (group: Group) => void
  removeGroup: (groupId: string) => void
  setActiveGroup: (group: Group | null) => void
  setActiveChannel: (channel: Channel | null) => void
  setActiveDmUser: (user: User | null) => void

  setMessages: (messages: Message[], hasMore?: boolean) => void
  prependMessages: (messages: Message[], hasMore: boolean) => void
  addMessage: (msg: Message) => void
  updateMessage: (msg: Message) => void
  removeMessage: (msgId: string) => void
  updateMessageReaction: (msg: Message) => void

  setOnlineUsers: (users: string[]) => void
  setUserStatus: (userId: string, status: string) => void
  setTyping: (channelId: string, username: string) => void
  clearTyping: (channelId: string, username: string) => void

  pushNotification: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void
  markAllNotificationsRead: () => void
  clearNotifications: () => void

  initSocket: () => void
  disconnectSocket: () => void
}

export const useAppStore = create<AppStore>((set, get) => ({
  user: null,
  token: localStorage.getItem('ds_token'),
  groups: [],
  activeGroup: null,
  activeChannel: null,
  activeDmUser: null,
  messages: [],
  hasMoreMessages: false,
  onlineUsers: new Set(),
  typingUsers: new Map(),
  notifications: [],
  socket: null,
  socketConnected: false,

  setAuth: (user, token) => {
    localStorage.setItem('ds_token', token)
    set({ user, token })
  },

  updateUser: (user) => set({ user }),

  logout: () => {
    localStorage.removeItem('ds_token')
    get().socket?.disconnect()
    set({
      user: null, token: null, socket: null, socketConnected: false,
      groups: [], activeGroup: null, activeChannel: null, activeDmUser: null,
      messages: [], notifications: [], onlineUsers: new Set(), typingUsers: new Map()
    })
  },

  setGroups: (groups) => set({ groups }),

  addGroup: (group) => set(s => ({
    groups: s.groups.some(g => g._id === group._id) ? s.groups : [...s.groups, group]
  })),

  updateGroup: (group) => set(s => ({
    groups: s.groups.map(g => g._id === group._id ? group : g),
    activeGroup: s.activeGroup?._id === group._id ? group : s.activeGroup
  })),

  removeGroup: (groupId) => set(s => ({
    groups: s.groups.filter(g => g._id !== groupId),
    activeGroup: s.activeGroup?._id === groupId ? null : s.activeGroup,
    activeChannel: s.activeGroup?._id === groupId ? null : s.activeChannel,
    activeDmUser: s.activeGroup?._id === groupId ? null : s.activeDmUser,
    messages: s.activeGroup?._id === groupId ? [] : s.messages
  })),

  setActiveGroup: (group) => {
    const { socket, activeGroup } = get()
    if (socket && activeGroup) socket.emit('leave-group', activeGroup._id)
    if (socket && group) socket.emit('join-group', group._id)
    set({ activeGroup: group, activeChannel: null, activeDmUser: null, messages: [], hasMoreMessages: false })
  },

  setActiveChannel: (channel) => {
    const { socket, activeChannel } = get()
    if (socket && activeChannel) socket.emit('leave-channel', activeChannel._id)
    if (socket && channel) socket.emit('join-channel', channel._id)
    set({ activeChannel: channel, activeDmUser: null, messages: [], hasMoreMessages: false })
  },

  setActiveDmUser: (user) => {
    const { socket, activeChannel } = get()
    if (socket && activeChannel) socket.emit('leave-channel', activeChannel._id)
    set({ activeDmUser: user, activeChannel: null, messages: [], hasMoreMessages: false })
  },

  setMessages: (messages, hasMore = false) => set({ messages, hasMoreMessages: hasMore }),

  prependMessages: (messages, hasMore) => set(s => ({
    messages: [...messages, ...s.messages],
    hasMoreMessages: hasMore
  })),

  addMessage: (msg) => set(s => {
    // Evita duplicar (rede instável pode re-emitir)
    if (s.messages.some(m => m._id === msg._id)) return s
    return { messages: [...s.messages, msg] }
  }),

  updateMessage: (msg) => set(s => ({
    messages: s.messages.map(m => m._id === msg._id ? msg : m)
  })),

  removeMessage: (msgId) => set(s => ({
    messages: s.messages.filter(m => m._id !== msgId)
  })),

  updateMessageReaction: (msg) => set(s => ({
    messages: s.messages.map(m => m._id === msg._id ? { ...m, reactions: msg.reactions } : m)
  })),

  setOnlineUsers: (users) => set({ onlineUsers: new Set(users) }),

  setUserStatus: (userId, status) => set(s => {
    const next = new Set(s.onlineUsers)
    if (status === 'online' || status === 'away') next.add(userId)
    else next.delete(userId)
    return { onlineUsers: next }
  }),

  setTyping: (channelId, username) => set(s => {
    const map = new Map(s.typingUsers)
    const list = map.get(channelId) || []
    if (!list.includes(username)) map.set(channelId, [...list, username])
    return { typingUsers: map }
  }),

  clearTyping: (channelId, username) => set(s => {
    const map = new Map(s.typingUsers)
    const list = (map.get(channelId) || []).filter(u => u !== username)
    map.set(channelId, list)
    return { typingUsers: map }
  }),

  pushNotification: (n) => set(s => {
    const notif: Notification = {
      ...n,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      read: false,
      createdAt: new Date().toISOString()
    }
    return { notifications: [notif, ...s.notifications].slice(0, NOTIF_LIMIT) }
  }),

  markAllNotificationsRead: () => set(s => ({
    notifications: s.notifications.map(n => ({ ...n, read: true }))
  })),

  clearNotifications: () => set({ notifications: [] }),

  initSocket: () => {
    const { user, socket: existing } = get()
    if (!user || existing) return

    const socket = io(SOCKET_URL, {
      auth: { userId: user._id },
      transports: ['websocket', 'polling']
    })

    socket.on('connect', () => set({ socketConnected: true }))
    socket.on('disconnect', () => set({ socketConnected: false }))

    socket.on('new-message', (msg: Message) => {
      const { activeChannel, activeDmUser, user } = get()
      const isActive = activeChannel?._id === msg.channel
      if (isActive) get().addMessage(msg)

      if (!isActive && msg.author._id !== user?._id) {
        get().pushNotification({
          type: 'message',
          title: `#${(msg.channel as any)?.name || 'canal'} · ${msg.author.username}`,
          body: msg.content.slice(0, 100),
          meta: { channelId: msg.channel }
        })
      }
      void activeDmUser
    })

    socket.on('new-dm', (msg: Message) => {
      const { activeDmUser, user } = get()
      const otherId = msg.author._id === user?._id ? msg.dm : msg.author._id
      const isActiveDm = activeDmUser?._id === otherId
      if (isActiveDm) get().addMessage(msg)

      if (!isActiveDm && msg.author._id !== user?._id) {
        get().pushNotification({
          type: 'dm',
          title: `DM · ${msg.author.username}`,
          body: msg.content.slice(0, 100),
          meta: { userId: msg.author._id }
        })
      }
    })

    socket.on('message-edited', (msg: Message) => get().updateMessage(msg))
    socket.on('message-deleted', (data: { _id: string }) => get().removeMessage(data._id))
    socket.on('user-status', ({ userId, status }) => get().setUserStatus(userId, status))
    socket.on('message-reacted', (msg: Message) => get().updateMessageReaction(msg))

    socket.on('user-typing', ({ username, channelId }) => {
      get().setTyping(channelId, username)
    })
    socket.on('user-stop-typing', ({ username, channelId }) => {
      get().clearTyping(channelId, username)
    })

    set({ socket })
  },

  disconnectSocket: () => {
    get().socket?.disconnect()
    set({ socket: null, socketConnected: false })
  }
}))
