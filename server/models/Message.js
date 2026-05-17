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
  reactions: [{
    emoji: String,
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }],
  edited:   { type: Boolean, default: false }
}, { timestamps: true })

export default mongoose.model('Message', messageSchema)