export interface User {
  _id: string
  username: string
  email: string
  avatar: string
  bio: string
  githubUrl: string
  role: 'dev' | 'senior' | 'admin'
  status: 'online' | 'away' | 'offline'
  groups: string[]
}

export interface Group {
  _id: string
  name: string
  description: string
  inviteCode: string
  owner: string
  admins: string[]
  members: User[]
  channels: Channel[]
  repos: Repo[]
}

export interface Channel {
  _id: string
  name: string
  group: string
  type: 'text' | 'code-review' | 'repos' | 'announcements'
  private: boolean
  topic: string
}

export interface Message {
  _id: string
  author: User
  channel?: string | { _id: string; name: string }
  dm?: string
  content: string
  type: 'text' | 'code' | 'repo' | 'image' | 'system'
  repoData?: Repo
  reactions: Reaction[]
  edited: boolean
  createdAt: string
  updatedAt: string
}

export interface Reaction {
  emoji: string
  users: string[]
}

export interface Repo {
  _id?: string
  name: string
  url: string
  description: string
  language: string
  stars: number
  forks: number
  openIssues?: number
  addedBy?: { _id: string; username: string; avatar?: string } | string
}

export interface ParsedContent {
  type: 'text' | 'code'
  text?: string
  lang?: string
  code?: string
}

export interface Notification {
  id: string
  type: 'message' | 'dm' | 'mention' | 'system'
  title: string
  body: string
  read: boolean
  createdAt: string
  meta?: Record<string, unknown>
}
