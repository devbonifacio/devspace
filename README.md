# DevSpace

> Workspace de chat para developers — grupos, canais, threads, code review, chamadas de voz, share de repositórios GitHub, DMs e presença em tempo real.

```
devspace/
├── client/   → React 19 + Vite 6 + TS + Tailwind 4 + Zustand + socket.io-client
├── server/   → Node 20+ + Express 4 + Socket.io + Mongoose 8 + JWT
└── README.md
```

🔗 **Live:** [devspace-beige.vercel.app](https://devspace-beige.vercel.app)

---

## ⚡ Stack

**Frontend**
- React 19 + Vite 6 + TypeScript 5.7
- Tailwind CSS 4
- Zustand (state)
- Socket.io client
- WebRTC (chamadas de voz P2P)
- react-syntax-highlighter (Prism)

**Backend**
- Express 4 (REST)
- Socket.io (WebSocket: chat, typing, presence, signaling de voz)
- MongoDB Atlas (Mongoose 8)
- JWT auth + bcrypt
- helmet + express-rate-limit (segurança)
- Cloudinary (upload de imagens/avatares)
- nanoid (invite codes)

---

## 🚀 Rodar local

### Pré-requisitos
- Node 20+
- Conta no MongoDB Atlas (free tier) ou Mongo local
- Conta no Cloudinary (free tier) — opcional, só pra uploads

### 1) Backend

```bash
cd server
cp .env.example .env
# edite .env: MONGO_URI, JWT_SECRET (openssl rand -hex 64), credenciais Cloudinary
npm install
npm run dev
# rodando em http://localhost:3001
```

### 2) Frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev
# rodando em http://localhost:5173
```

Abra http://localhost:5173 → cadastra um usuário → cria um grupo → bora.

---

## ✨ Funcionalidades

**Chat & realtime**
- Mensagens em tempo real via Socket.io
- Indicador "digitando..." sincronizado (com stop-typing real)
- Reações com emoji (toggle)
- Editar e apagar mensagens (autor; admin pode apagar)
- **Threads** — responder mensagens, painel lateral de thread
- **Pin** de mensagens importantes + painel de fixadas
- **Bookmarks** — salvar mensagens num painel pessoal
- Paginação por scroll-up (carregar histórico antigo)
- Markdown completo: headings, listas, citações, `---`, `**bold**`, `*italic*`, `~~strike~~`, `` `code` ``, `[link](url)`, `@mention`
- Blocos de código com syntax highlight (Prism, atalho Ctrl+Shift+C)
- **Upload de imagens** no chat (botão, drag&drop, paste do clipboard)
- Highlight especial quando você é mencionado (@seu_user)
- DMs entre membros do grupo

**🎤 Chamadas de voz (WebRTC P2P)**
- Chamada 1-on-1 direto na DM (áudio peer-to-peer, server só faz signaling)
- Modal de chamada recebida com ringtone + aceitar/recusar
- Janela full: avatar, timer, mute, desligar
- **Mini janela arrastável** — funciona enquanto a aba estiver aberta
- Título da aba pisca "🟢 em chamada" quando em background
- Proteção de "ocupado" (não recebe call durante outra)

**Grupos & canais**
- Criar grupo (vira owner automaticamente)
- Convidar por código de invite (nanoid)
- Entrar/sair de grupo (owner precisa transferir ou apagar)
- Promover/rebaixar admins · **kick** de membros
- **Permissões granulares** — quem pode criar canais, fixar, adicionar repos, convidar (todos / só admins)
- Apagar grupo (cascata canais + mensagens)
- Mensagens de sistema ("@user entrou/saiu")
- Canais por tipo: text · code-review · announcements

**Repositórios GitHub**
- Preview de repo pela URL (stars, forks, linguagem)
- Compartilhar no canal (card visual)
- Adicionar repo ao "catálogo" do grupo (view dedicada)

**Notificações**
- Painel in-app com contador e filtros (tudo / @menções / DMs / canais)
- Desktop notification quando aba em background (opt-in)
- Som configurável

**Perfil & configurações persistentes**
- Upload de avatar (Cloudinary)
- Status custom (emoji + texto) com presets
- Tema (dark / darker), cor de destaque (6 paletas), tamanho de fonte
- Modo compacto · status manual (online / ausente / invisível)
- Toggles de som / desktop / mentions-only

**Busca**
- **Command palette** (Ctrl+K) — busca global de grupos, canais, usuários e mensagens
- Busca de mensagens dentro do grupo
- Busca de usuários por username/email

---

## 🌐 Deploy (100% grátis)

Setup: **Vercel** (front) + **Render** (back) + **MongoDB Atlas** (DB) + **Cloudinary** (mídia).

### Por que esse stack
| Camada | Serviço | Custo | Notas |
|---|---|---|---|
| Front (estático) | Vercel | grátis | CDN global, deploy por push |
| Back (Node + WS) | Render Web Service free | grátis | suporta WebSocket; **dorme após 15 min sem tráfego** |
| Banco | MongoDB Atlas M0 | grátis | 512 MB |
| Mídia | Cloudinary | grátis | 25 GB, CDN + transforms |

> O *cold start* do Render free é ~30s no primeiro acesso depois de dormir. Pra portfólio dá; se incomodar, upgrade pra $7/mês.

---

### 1) MongoDB Atlas
1. https://cloud.mongodb.com → cria cluster M0 (free)
2. **Database Access**: cria usuário com senha forte
3. **Network Access**: permite acesso de qualquer IP (`0.0.0.0/0`) — Render usa IPs dinâmicos
4. **Connect** → "Drivers" → copia a string `mongodb+srv://...`

### 2) Cloudinary
1. https://cloudinary.com → cria conta free
2. No dashboard, copia: Cloud name, API Key, API Secret

### 3) Backend no Render
1. https://render.com → conecta seu GitHub
2. **New + → Web Service** → seleciona o repo
3. Settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free · **Region**: Frankfurt (EU)
4. **Environment** → adiciona:
   - `MONGO_URI` → string do Atlas
   - `JWT_SECRET` → marca "Generate" (Render gera 256-bit)
   - `CLIENT_URL` → URL do Vercel (coloca depois)
   - `GITHUB_TOKEN` → opcional, aumenta rate limit GitHub API
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
5. **Health Check Path**: `/api/health`
6. Deploy → anota a URL (`https://devspace-xxxx.onrender.com`)

> 💡 Alternativa: usar o `server/render.yaml` (já no repo) via **"Blueprint"** no Render.

### 4) Frontend no Vercel
1. https://vercel.com → conecta GitHub → **Import Project**
2. **Root Directory**: `client` · Framework: Vite (auto)
3. **Environment Variables**:
   - `VITE_API_URL` → URL do Render
   - `VITE_SOCKET_URL` → mesma URL (opcional)
4. Deploy → anota a URL

### 5) Cola tudo
Render → **Environment** → `CLIENT_URL` = URL do Vercel (CSV se múltiplos domínios). Render reinicia → app no ar. 🎉

---

## 🛠️ Scripts

### `client/`
- `npm run dev` — Vite dev server (porta 5173)
- `npm run build` — `tsc -b && vite build`
- `npm run preview` — preview do build
- `npm run lint` — ESLint
- `npm run type-check` — só TS sem emit

### `server/`
- `npm run dev` — nodemon
- `npm start` — node prod

---

## 📡 API

| Método | Path | Descrição |
|---|---|---|
| GET | `/api/health` | uptime + estado do DB |
| POST | `/api/auth/register` | cadastro |
| POST | `/api/auth/login` | login |
| GET | `/api/auth/me` | rehydrate da sessão pelo token |
| GET | `/api/groups` | meus grupos |
| POST | `/api/groups` | cria grupo |
| POST | `/api/groups/join` | entra por invite code |
| GET | `/api/groups/:id` | detalhe |
| DELETE | `/api/groups/:id` | apaga (cascata) |
| POST | `/api/groups/:id/leave` | sair |
| POST | `/api/groups/:id/admins` | promove admin |
| DELETE | `/api/groups/:id/admins/:userId` | rebaixa admin |
| DELETE | `/api/groups/:id/members/:userId` | kick de membro |
| PATCH | `/api/groups/:id/permissions` | flags de permissão |
| GET | `/api/channels/:groupId` | lista canais |
| POST | `/api/channels` | cria canal |
| GET | `/api/messages/:channelId?before=` | mensagens (paginado) |
| GET | `/api/messages/dm/:userId?before=` | DMs (paginado) |
| GET | `/api/messages/thread/:parentId` | respostas de uma thread |
| GET | `/api/messages/pinned/:channelId` | mensagens fixadas |
| PATCH | `/api/messages/:id` | editar |
| PATCH | `/api/messages/:id/pin` | fixar/desfixar |
| DELETE | `/api/messages/:id` | apagar |
| GET | `/api/messages/search/:groupId?q=` | busca |
| GET | `/api/repos/preview?url=` | preview GitHub |
| GET | `/api/repos/group/:groupId` | lista repos do grupo |
| POST | `/api/repos/group/:groupId` | adiciona repo |
| DELETE | `/api/repos/group/:groupId/:repoId` | remove repo |
| GET | `/api/users/online` | usuários online |
| GET | `/api/users/search?q=` | busca usuários |
| GET | `/api/users/:id` | perfil público |
| PATCH | `/api/users/profile` | atualiza bio/github/avatar |
| PATCH | `/api/users/status` | status manual |
| PATCH | `/api/users/custom-status` | status custom (emoji + texto) |
| GET | `/api/bookmarks` | meus bookmarks |
| POST | `/api/bookmarks/:messageId` | toggle bookmark |
| DELETE | `/api/bookmarks/:messageId` | remove bookmark |
| GET | `/api/uploads/signature` | assinatura curta pra upload Cloudinary |

### Socket.io — chat & presença
`join-group · leave-group · join-channel · leave-channel · send-message · send-dm · typing · stop-typing · react-message`
→ `new-message · new-dm · message-edited · message-updated · message-deleted · message-reacted · user-typing · user-stop-typing · user-status · user-custom-status · group-updated · group-kicked · you-were-mentioned`

### Socket.io — chamadas de voz (signaling)
`call-user · call-answer · call-ice-candidate · call-hangup · call-decline · call-busy`
→ `call-incoming · call-accepted · call-ice-candidate · call-hangup · call-declined · call-busy`

---

## ⌨️ Atalhos

| Ação | Atalho |
|---|---|
| Busca global (command palette) | `Ctrl/Cmd + K` |
| Fechar modal / cancelar / fechar thread | `Esc` |
| Enviar mensagem | `Enter` |
| Nova linha | `Shift + Enter` |
| Alternar modo código | `Ctrl + Shift + C` |
| Salvar edição | `Enter` (no modo edit) |
| Cancelar edição | `Esc` |

---

## 🔐 Segurança

- ✅ JWT com secret de 64 bytes
- ✅ Senhas com bcrypt + validação forte (8+ chars, maiúscula, minúscula, número)
- ✅ `helmet` (headers de segurança HTTP)
- ✅ `express-rate-limit` (120 req/min geral · 10/15min em `/auth`)
- ✅ CORS com allowlist
- ✅ Anti-timing-attack no login
- ✅ Regex escapado nas buscas (sem injection)
- ✅ Upload via assinatura curta (client nunca vê o secret do Cloudinary)
- ✅ Permissões verificadas server-side em todas as rotas sensíveis

---

Construido Por Bonifácio Silva :) ❤️👨🏽‍💻
