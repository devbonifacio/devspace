import mongoose from 'mongoose'

const bookmarkSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true, index: true },
  note:    { type: String, default: '', maxLength: 200 },
}, { timestamps: true })

// Um user não pode bookmarkar a mesma msg duas vezes
bookmarkSchema.index({ user: 1, message: 1 }, { unique: true })

export default mongoose.model('Bookmark', bookmarkSchema)
