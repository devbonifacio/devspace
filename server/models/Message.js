import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  author:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  channel:  { type: mongoose.Schema.Types.ObjectId, ref: 'Channel' },
  dm:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // pra DM
  content:  { type: String, required: true, maxLength: 4000 },
  type:     { type: String, enum: ['text', 'code', 'repo', 'image', 'system'], default: 'text' },
  // metadata pro repo card
  repoData: {
    name: String, url: String, description: String,
    language: String, stars: Number, forks: Number
  },
  // metadata pra imagem (upload)
  imageData: {
    url: String,
    width: Number,
    height: Number,
    bytes: Number,
  },
  reactions: [{
    emoji: String,
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }],
  // Thread: aponta pra mensagem pai. Quem é pai não tem replyTo.
  replyTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null, index: true },
  // Cache do número de respostas pra não precisar count() em cada listagem
  replyCount: { type: Number, default: 0 },
  pinned:   { type: Boolean, default: false, index: true },
  pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  pinnedAt: { type: Date, default: null },
  edited:   { type: Boolean, default: false }
}, { timestamps: true })

export default mongoose.model('Message', messageSchema)