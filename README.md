# DevSpace

> Workspace de chat para developers — grupos, canais, code review, share de repositórios GitHub, DMs, presença em tempo real.

```
devspace/
├── client/   → React 19 + Vite 6 + TS + Tailwind 4 + Zustand + socket.io-client
├── server/   → Node 20+ + Express 4 + Socket.io + Mongoose 8 + JWT
└── README.md
```

---

## ⚡ Stack

**Frontend**
- React 19 + Vite 6 + TypeScript 5.7
- Tailwind CSS 4
- Zustand (state)
- Socket.io client
- react-syntax-highlighter (Prism)

**Backend**
- Express 4 (REST)
- Socket.io (WebSocket: chat, typing, presence)
- MongoDB Atlas (Mongoose 8)
- JWT auth + bcrypt
- nanoid (invite codes)

---

## 🚀 Rodar local

### Pré-requisitos
- Node 20+
- Conta no MongoDB Atlas (free tier) ou Mongo local

### 1) Backend

```bash
cd server
cp .env.example .env
# edite .env: cole sua MONGO_URI e gere JWT_SECRET (openssl rand -hex 64)
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
- Indicador "digitando..." sincronizado
- Reações com emoji (toggle)
- Editar e apagar mensagens (autor; admin pode apagar)
- Paginação por scroll-up (carregar histórico antigo)
- Markdown leve no chat: `**bold** *italic* \`code\` [link](url) @mention`
- Blocos de código com syntax highlight (Prism, atalho Ctrl+Shift+C)
- Highlight especial quando você é mencionado (@seu_user)
- DMs entre membros do grupo

**Grupos & canais**
- Criar grupo (vira owner automaticamente)
- Convidar por código de invite (nanoid)
- Sair de grupo (owner precisa transferir ou apagar)
- Promover/rebaixar admins
- Apagar grupo (cascata canais + mensagens)
- Canais por tipo: text · code-review · announcements

**Repositórios GitHub**
- Preview de repo pela URL (stars, forks, linguagem)
- Compartilhar no canal (card visual)
- Adicionar repo ao "catálogo" do grupo (view dedicada)

**Notificações**
- Painel de notificações in-app com contador
- Desktop notification quando aba em background (opt-in)
- Som configurável

**Configurações persistentes**
- Tema (dark / darker)
- Cor de destaque (6 paletas)
- Tamanho de fonte (small/medium/large)
- Modo compacto
- Status manual (online / ausente / invisível)
- Toggles de som / desktop / mentions-only

**Busca**
- Buscar mensagens dentro do grupo
- Buscar usuários por username/email

---

## 🌐 Deploy (100% grátis)

Setup: **Vercel** (front) + **Render** (back) + **MongoDB Atlas** (DB).

### Por que esse stack
| Camada | Serviço | Custo | Notas |
|---|---|---|---|
| Front (estático) | Vercel | grátis | CDN global, deploy por push |
| Back (Node + WS) | Render Web Service free | grátis | suporta WebSocket; **dorme após 15 min sem tráfego** |
| Banco | MongoDB Atlas M0 | grátis | 512 MB, suficiente pra começar |

> O *cold start* do Render free é ~30s no primeiro acesso depois de dormir. Pra portfólio dá; se incomodar, upgrade pra $7/mês.

---

### 1) MongoDB Atlas
1. https://cloud.mongodb.com → cria cluster M0 (free)
2. **Database Access**: cria usuário com senha forte (não use "devspace321")
3. **Network Access**: permite acesso de qualquer IP (`0.0.0.0/0`) — Render usa IPs dinâmicos
4. **Connect** → "Drivers" → copia a string `mongodb+srv://...`

### 2) Backend no Render
1. https://render.com → conecta seu GitHub
2. **New + → Web Service** → seleciona o repo
3. Settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. **Environment** → adiciona:
   - `MONGO_URI` → string do Atlas
   - `JWT_SECRET` → marca "Generate" (Render gera 256-bit)
   - `CLIENT_URL` → coloca depois (URL do Vercel)
   - `GITHUB_TOKEN` → opcional, aumenta rate limit GitHub API
5. **Health Check Path**: `/api/health`
6. Deploy → anota a URL (`https://devspace-api-xxxx.onrender.com`)

> 💡 Alternativa: commitar `server/render.yaml` (já está no repo) e usar **"Blueprint"** no Render — sobe tudo de uma vez.

### 3) Frontend no Vercel
1. https://vercel.com → conecta GitHub
2. **Import Project** → seleciona o repo
3. Settings:
   - **Root Directory**: `client`
   - Framework: detecta Vite automaticamente
4. **Environment Variables**:
   - `VITE_API_URL` → URL do Render (do passo 2)
   - `VITE_SOCKET_URL` → mesma URL (opcional, default = VITE_API_URL)
5. Deploy → anota a URL (`https://devspace.vercel.app`)

### 4) Cola tudo
Volta no Render → **Environment** do backend → seta:
```
CLIENT_URL=https://devspace.vercel.app
```
(múltiplos domínios separe por vírgula, ex: produção + previews)

Render reinicia → app pronto. 🎉

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
| GET | `/api/groups` | meus grupos |
| POST | `/api/groups` | cria grupo |
| POST | `/api/groups/join` | entra por invite code |
| GET | `/api/groups/:id` | detalhe |
| DELETE | `/api/groups/:id` | apaga (cascata) |
| POST | `/api/groups/:id/leave` | sair |
| POST | `/api/groups/:id/admins` | promove admin |
| DELETE | `/api/groups/:id/admins/:userId` | rebaixa admin |
| GET | `/api/channels/:groupId` | lista canais |
| POST | `/api/channels` | cria canal |
| GET | `/api/messages/:channelId?before=` | mensagens (paginado) |
| GET | `/api/messages/dm/:userId?before=` | DMs (paginado) |
| PATCH | `/api/messages/:id` | editar |
| DELETE | `/api/messages/:id` | apagar |
| GET | `/api/messages/search/:groupId?q=` | busca |
| GET | `/api/repos/preview?url=` | preview GitHub |
| GET | `/api/repos/group/:groupId` | lista repos do grupo |
| POST | `/api/repos/group/:groupId` | adiciona repo |
| DELETE | `/api/repos/group/:groupId/:repoId` | remove |
| GET | `/api/users/online` | online |
| GET | `/api/users/search?q=` | busca usuários |
| GET | `/api/users/:id` | perfil público |
| PATCH | `/api/users/profile` | atualiza bio/github/avatar |
| PATCH | `/api/users/status` | status manual |

### Socket.io events (client → server)
`join-group · leave-group · join-channel · leave-channel · send-message · send-dm · typing · stop-typing · react-message`

### Socket.io events (server → client)
`new-message · new-dm · message-edited · message-deleted · message-reacted · user-typing · user-stop-typing · user-status`

---

## ⌨️ Atalhos

| Ação | Atalho |
|---|---|
| Enviar mensagem | `Enter` |
| Nova linha | `Shift+Enter` |
| Alternar modo código | `Ctrl+Shift+C` |
| Salvar edição | `Enter` (no modo edit) |
| Cancelar edição | `Esc` |

---

## 🔐 Segurança em produção — checklist

- [ ] `JWT_SECRET` gerado com 64+ chars aleatórios (use `openssl rand -hex 64`)
- [ ] Senha do MongoDB Atlas trocada (não usar a default)
- [ ] `.env` está no `.gitignore` (✅ já está)
- [ ] `CLIENT_URL` no Render aponta só pros domínios autorizados
- [ ] Considerar `helmet`, `express-rate-limit` se for público em larga escala

---

Construido Por Bonifácio Silva :) ❤️👨🏽‍💻
