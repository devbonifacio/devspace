import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  username:   { type: String, required: true, unique: true },
  email:      { type: String, required: true, unique: true },
  password:   { type: String, required: true },
  avatar:     { type: String, default: '' },
  banner:     { type: String, default: '' },
  bio:        { type: String, default: '' },
  githubUrl:  { type: String, default: '' },
  role:       { type: String, default: 'dev' }, // dev, senior, admin
  groups:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  status:     { type: String, enum: ['online', 'away', 'offline'], default: 'offline' },
  customStatus: {
    emoji: { type: String, default: '' },
    text:  { type: String, default: '', maxLength: 60 },
    clearAt: { type: Date, default: null }, // auto-clear futuro (não implementado, mas reservado)
  },
  // Banimento / suspensão (gerido pelo painel de moderação)
  ban: {
    until:  { type: Date, default: null },   // null = não banido; data futura = banido até
    reason: { type: String, default: '' },
    by:     { type: String, default: '' },   // username de quem aplicou
    at:     { type: Date, default: null },   // quando foi aplicado
  }
}, { timestamps: true })

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 10)
})

userSchema.methods.comparePassword = function(pass) {
  return bcrypt.compare(pass, this.password)
}

export default mongoose.model('User', userSchema)