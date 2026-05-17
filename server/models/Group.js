import mongoose from 'mongoose'
import { nanoid } from 'nanoid'

const groupSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  inviteCode:  { type: String, default: () => nanoid(8).toUpperCase() },
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  admins:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  members:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  channels:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Channel' }],
  repos:       [{ // repositórios associados ao grupo
    name: String, url: String, description: String,
    language: String, stars: Number, forks: Number,
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }]
}, { timestamps: true })

export default mongoose.model('Group', groupSchema)